"use strict";

const fs = require("fs");
const fsAsync = fs.promises;
const path = require("path");
const deriveDocumentId = require("../../utilities/deriveDocumentId");

/**
 * @file SectionResolver.js
 * @module actions/query/SectionResolver
 * @description Resolves `(documentId, range)` pairs from VectorStore
 * search hits back into the raw markdown text of the corresponding
 * section. The query pipeline calls this between search and prompt
 * serialization: each hit gets its `sectionText` populated before
 * being passed to the LLM serializer.
 *
 * ## Two construction paths
 *
 * Mirrors {@link Document} in `VectorStore/Document/` with a slight
 * variation: both the constructor and the static `create` accept the
 * same polymorphic input.
 *
 *   - **Constructor (`new SectionResolver(input)`):** synchronous I/O.
 *     Best for boot-time setup, tests, and CLI scripts where blocking
 *     the event loop briefly is harmless. Reads files with
 *     `fs.readFileSync` / `fs.readdirSync`.
 *
 *   - **Static `create(input)`:** asynchronous I/O. Best for callers
 *     already in an async context (request handlers at boot, or
 *     batch evaluators). Reads files with `fs.promises.*` and
 *     parallelizes file reads via `Promise.all`.
 *
 * Both paths accept the same input shapes:
 *
 *   - **`Map<documentId, content>`:** pre-built map, no I/O. Used by
 *     tests and by `create` after it has done its own async reads.
 *   - **Directory path (string):** recursively walks the directory,
 *     reads every `.md` file, derives a documentId per file.
 *   - **File path (string):** reads a single file regardless of
 *     extension (caller has named it explicitly). Builds a one-entry
 *     map.
 *
 * Behavior — outputs, errors, warnings — is identical across both
 * paths. The only difference is whether the I/O blocks the caller.
 *
 * ## Document IDs
 *
 * IDs come from {@link deriveDocumentId} applied to each file's path,
 * which produces `"theme|stem"` form. The theme prefix is the
 * immediate parent folder; this is the same scheme used everywhere
 * else in the pipeline (search hits, VectorStore documents) so the
 * IDs registered here line up exactly with what `resolve()` is
 * asked to find.
 *
 * Two files that sanitize to the same documentId is a setup bug:
 * the VectorStore can't distinguish them either. Construction
 * throws loudly in that case.
 *
 * ## Range semantics
 *
 * Ranges are half-open `[start, end)` byte offsets into the file's
 * content string — same convention as VectorStore document section
 * ranges. `content.slice(start, end)` produces the section text.
 *
 * Range checks:
 *   - `start < 0`, non-integers, or `end < start` → null + warning
 *   - `end > content.length` → null + warning (range overshoots)
 *
 * Overshoot signals that the source markdown has changed since the
 * VectorStore was built. The resolver returns null and logs; the
 * caller decides policy (skip the hit, surface the issue, crash).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module helpers — shared between sync and async paths
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the documentId → content map from parallel arrays of file
 * paths and their already-read contents.
 *
 * This is the post-read initialization step shared by both
 * construction paths. The sync and async readers (`readPathSync`,
 * `readPathAsync`) are the only diverging code — once a path has
 * been resolved into `{filePaths, contents}` arrays, the rest is
 * the same regardless of I/O style. Centralizing the derivation
 * here means collision detection has exactly one implementation.
 *
 * @param {string[]} filePaths - Absolute paths in deterministic order.
 * @param {string[]} contents  - Parallel array of file contents (same length, same order).
 * @returns {Map<string, string>} documentId → content
 * @throws {Error} On documentId collision — indicates a structurally
 *   ambiguous corpus that the VectorStore can't reliably distinguish.
 */
const buildMapFromFilePaths = (filePaths, contents) => {
  const map = new Map();
  for (let i = 0; i < filePaths.length; i++) {
    const id = deriveDocumentId(filePaths[i]);
    if (map.has(id)) {
      throw new Error(
        `SectionResolver: documentId "${id}" collision between ` +
        `"${filePaths[i]}" and previously-indexed file. This indicates ` +
        `the corpus has two files that sanitize to the same ID — fix ` +
        `the directory layout or rename one of the files.`
      );
    }
    map.set(id, contents[i]);
  }
  return map;
};

/**
 * Synchronously walk a directory recursively, collecting `.md`
 * file paths. Iterative DFS so deeply nested corpora don't blow
 * the call stack. Symlinks are not followed.
 *
 * @param {string} dir - Starting directory.
 * @returns {string[]} Absolute paths of every .md file found.
 */
const walkMarkdownFilesSync = (dir) => {
  const collected = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      throw new Error(`SectionResolver: cannot read directory "${current}": ${err.message}`);
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        collected.push(fullPath);
      }
      // symlinks, sockets, etc.: silently skipped
    }
  }
  return collected;
};

/**
 * Async sibling of {@link walkMarkdownFilesSync}. Uses
 * `fs.promises.readdir`. Behavior is otherwise identical.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
const walkMarkdownFilesAsync = async (dir) => {
  const collected = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsAsync.readdir(current, { withFileTypes: true });
    } catch (err) {
      throw new Error(`SectionResolver: cannot read directory "${current}": ${err.message}`);
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        collected.push(fullPath);
      }
    }
  }
  return collected;
};

/**
 * Read a path string synchronously, returning the file paths and
 * contents needed by {@link buildMapFromFilePaths}.
 *
 * Dispatches on whether the input is a directory (recursive walk,
 * `.md` filter) or a single file (just that one file, any extension
 * — the caller named it explicitly, so we honor the request).
 *
 * @param {string} inputPath
 * @returns {{filePaths: string[], contents: string[]}}
 * @throws {Error} If the path doesn't exist, isn't readable, or is
 *   neither a file nor a directory (e.g. a pipe or socket).
 */
const readPathSync = (inputPath) => {
  let stat;
  try {
    stat = fs.statSync(inputPath);
  } catch (err) {
    throw new Error(`SectionResolver: cannot stat "${inputPath}": ${err.message}`);
  }

  if (stat.isDirectory()) {
    const filePaths = walkMarkdownFilesSync(inputPath);
    const contents = filePaths.map(p => fs.readFileSync(p, "utf8"));
    return { filePaths, contents };
  }
  if (stat.isFile()) {
    return {
      filePaths: [inputPath],
      contents:  [fs.readFileSync(inputPath, "utf8")],
    };
  }
  throw new Error(`SectionResolver: "${inputPath}" is neither a file nor a directory`);
};

/**
 * Async sibling of {@link readPathSync}. Uses `fs.promises.*` and
 * parallelizes file reads via `Promise.all`. For large corpora
 * this is meaningfully faster than the sync version because the
 * OS can pipeline disk reads.
 *
 * @param {string} inputPath
 * @returns {Promise<{filePaths: string[], contents: string[]}>}
 */
const readPathAsync = async (inputPath) => {
  let stat;
  try {
    stat = await fsAsync.stat(inputPath);
  } catch (err) {
    throw new Error(`SectionResolver: cannot stat "${inputPath}": ${err.message}`);
  }

  if (stat.isDirectory()) {
    const filePaths = await walkMarkdownFilesAsync(inputPath);
    const contents  = await Promise.all(filePaths.map(p => fsAsync.readFile(p, "utf8")));
    return { filePaths, contents };
  }
  if (stat.isFile()) {
    return {
      filePaths: [inputPath],
      contents:  [await fsAsync.readFile(inputPath, "utf8")],
    };
  }
  throw new Error(`SectionResolver: "${inputPath}" is neither a file nor a directory`);
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionResolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class SectionResolver
 *
 * In-memory map from documentId to source-file content, plus a
 * range-checking lookup method. The `#map` private field is the
 * only state; lookups are O(1) map access plus a string slice.
 */
class SectionResolver {
  /** @private The underlying documentId → content map. */
  #map;

  /**
   * Construct a SectionResolver synchronously.
   *
   * Accepts:
   *   - `Map<documentId, content>`: stored directly. No I/O.
   *   - Directory path (string): recursively walks the directory,
   *     reads `.md` files via `fs.readFileSync`, builds the map.
   *   - File path (string): reads that one file (any extension),
   *     builds a one-entry map.
   *
   * For the path inputs, this performs synchronous disk I/O. Use
   * {@link SectionResolver.create} for the non-blocking equivalent.
   *
   * @param {Map<string, string> | string} input
   * @throws {Error} On invalid input type, missing/unreadable path,
   *   path that's neither file nor directory, or documentId
   *   collision when walking a directory with two files that
   *   sanitize to the same ID.
   */
  constructor(input) {
    if (input instanceof Map) {
      this.#map = input;
      return;
    }
    if (typeof input === "string" && input.length > 0) {
      const { filePaths, contents } = readPathSync(input);
      this.#map = buildMapFromFilePaths(filePaths, contents);
      return;
    }
    throw new Error(
      "SectionResolver: input must be a Map<documentId, content> or a path string"
    );
  }

  /**
   * Construct a SectionResolver asynchronously.
   *
   * Accepts the same input shapes as the constructor. The path
   * inputs read files via `fs.promises.*` with parallel reads.
   * Map input routes through the constructor's fast path.
   *
   * @async
   * @param {Map<string, string> | string} input
   * @returns {Promise<SectionResolver>}
   * @throws {Error} Same conditions as the constructor.
   *
   * @example
   *   const resolver = await SectionResolver.create("scripts/data");
   *   const text = resolver.resolve(
   *     "biocides_and_chemical_treatment|water_chemistry",
   *     [3331, 3631]
   *   );
   */
  static async create(input) {
    if (input instanceof Map) {
      return new SectionResolver(input);
    }
    if (typeof input === "string" && input.length > 0) {
      const { filePaths, contents } = await readPathAsync(input);
      const map = buildMapFromFilePaths(filePaths, contents);
      return new SectionResolver(map);  // constructor takes the Map fast path
    }
    throw new Error(
      "SectionResolver: input must be a Map<documentId, content> or a path string"
    );
  }

  /**
   * Look up a single section. Returns the raw markdown text, or
   * `null` when the documentId is unknown or the range is invalid
   * or overshoots the content length.
   *
   * All `null` returns log a `console.warn`. The caller decides
   * whether to skip the hit, surface the error, or crash — the
   * resolver itself doesn't decide policy.
   *
   * @param {string} documentId
   * @param {[number, number]} range - Half-open [start, end).
   * @returns {string|null}
   */
  resolve(documentId, range) {
    const content = this.#map.get(documentId);
    if (content === undefined) {
      console.warn(`SectionResolver.resolve: unknown documentId "${documentId}"`);
      return null;
    }

    if (!Array.isArray(range) || range.length !== 2) {
      console.warn(`SectionResolver.resolve: invalid range shape for "${documentId}": ${JSON.stringify(range)}`);
      return null;
    }

    const [start, end] = range;

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
      console.warn(`SectionResolver.resolve: invalid range [${start}, ${end}] for "${documentId}"`);
      return null;
    }

    if (end > content.length) {
      console.warn(
        `SectionResolver.resolve: range [${start}, ${end}] overshoots content ` +
        `length ${content.length} for "${documentId}" — source markdown may ` +
        `have changed since the VectorStore was built`
      );
      return null;
    }

    return content.slice(start, end);
  }

  /**
   * List every documentId in the index. Useful for smoke tests
   * verifying corpus alignment with the VectorStore.
   *
   * @returns {string[]}
   */
  get documentIds() {
    return Array.from(this.#map.keys());
  }

  /**
   * Number of documents in the index.
   *
   * @returns {number}
   */
  get size() {
    return this.#map.size;
  }
}

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(SectionResolver, "SectionResolver", {
  value: SectionResolver,
}));