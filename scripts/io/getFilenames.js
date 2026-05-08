"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @function makeSet
 * @description Coerces a variety of input types into a `Set`.
 *
 * | Input type    | Result                           |
 * |---------------|----------------------------------|
 * | `Set`         | Returned as-is                   |
 * | falsy         | Empty `Set`                      |
 * | `Array`       | `new Set(input)`                 |
 * | `string`      | `new Set([input])`               |
 * | any iterable  | `new Set(Array.from(input))`     |
 *
 * @param {Set|Array|string|Iterable|*} input - Value to coerce.
 * @returns {Set} A `Set` representation of the input.
 */
const makeSet = input => {
  (input instanceof Set)
  || (!input && (input = new Set))
  || (Array.isArray(input) && (input = new Set(input)))
  || (
    (typeof input === "string" && (input = new Set([input])))
    || (input = new Set(Array.from(input) || []))
  );
  return input;
}

/**
 * @function isBlacklisted
 * @description Returns `true` if `fullPath` matches any blacklist entry.
 *
 * Each entry is tested in two complementary ways:
 *
 * 1. **Resolved prefix match** — the entry is resolved against `scanRoot`
 *    via `path.resolve(scanRoot, entry)`. This handles:
 *    - Absolute paths (`/app/utilities`) — `path.resolve` ignores `scanRoot`
 *      for absolute inputs, so they work unchanged.
 *    - Full relative paths from the scan root (`utilities/query`) — resolved
 *      to the correct absolute path and matched as an exact hit or directory
 *      prefix (`startsWith(abs + sep)`), covering all files in the subtree.
 *    - Bare names (`utilities`, `constants.js`) — resolved to
 *      `scanRoot/entry`; directory names match their entire subtree via
 *      the prefix check, file names match exactly.
 *
 * 2. **Relative suffix match** — every trailing suffix of
 *    `path.relative(scanRoot, fullPath)` split by `path.sep` is checked
 *    against the raw blacklist set. This handles partial subpaths that do
 *    not start from the scan root (e.g. `"query/constants.js"` matching
 *    `.../utilities/query/constants.js`) where the resolved approach would
 *    produce the wrong base directory.
 *
 * Both checks apply uniformly whether `fullPath` refers to a file or a
 * directory, and whether the blacklist entry refers to a file or a directory.
 *
 * @param {string} fullPath  - Absolute path being tested (file or directory).
 * @param {string} scanRoot  - Absolute path of the directory being scanned.
 * @param {Set}    blacklist - Normalized blacklist set.
 * @returns {boolean} `true` if any blacklist entry matches.
 */
const isBlacklisted = (fullPath, scanRoot, blacklist) => {
  // Pass 1: resolve each entry against the scan root and check for an exact
  // match or directory-prefix match. Covers absolute paths, full relative
  // paths, and bare names at the cost of O(blacklist.size) resolves.
  for (const entry of blacklist) {
    const abs = path.resolve(scanRoot, entry);
    if (fullPath === abs || fullPath.startsWith(abs + path.sep)) return true;
  }

  // Pass 2: check every trailing suffix of the relative path. Covers partial
  // subpaths like "query/constants.js" that don't start from the scan root
  // and would resolve to the wrong location in pass 1.
  const segments = path.relative(scanRoot, fullPath).split(path.sep);
  for (let i = 0; i < segments.length; i++) {
    if (blacklist.has(segments.slice(i).join(path.sep))) return true;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GetFilenamesOptions
 * @description Options object for {@link getFilenames}.
 *
 * @property {number}           [modifiedTime]                         - Maximum file age in
 *                                                                        milliseconds. Files whose
 *                                                                        `mtime` is older than
 *                                                                        `Date.now() - modifiedTime`
 *                                                                        are excluded.
 * @property {Set|Array|string} [blacklist=["node_modules","secrets"]] - Entries to exclude.
 *                                                                        Each entry is matched as
 *                                                                        an absolute path, a full
 *                                                                        or partial relative path
 *                                                                        from the scan root, or a
 *                                                                        bare file/directory name.
 *                                                                        A matching directory entry
 *                                                                        excludes its entire subtree.
 *                                                                        Works for both file and
 *                                                                        directory targets.
 * @property {Set|Array|string} [extensions=[".txt", ".md", ".docx"]] - Allowed file extensions
 *                                                                        (with or without leading
 *                                                                        `"."`). Matching is
 *                                                                        case-insensitive.
 * @property {boolean|string}   [relative]                            - If `true`, paths are made
 *                                                                        relative to `__dirname`.
 *                                                                        If a string, relative to
 *                                                                        that directory. Omit for
 *                                                                        absolute paths.
 * @property {boolean}          [recursive=true]                      - When `false`, only the
 *                                                                        top-level directory is
 *                                                                        scanned. Defaults to `true`.
 */

/**
 * @function getFilenames
 * @description
 * Collects file paths under a given file or directory path, applying optional
 * filters for extension, blacklist, and modification time.
 *
 * If `filepath` points to a **file**, it is returned directly (subject to
 * extension, blacklist, and `modifiedTime` filters). If it points to a
 * **directory**, its contents are scanned recursively and filtered
 * entry-by-entry.
 *
 * **Extension normalization:** each entry in `extensions` is lower-cased and
 * a `"."` prefix is added if absent, so `"js"`, `".js"`, and `".JS"` are
 * all equivalent.
 *
 * **Blacklist matching** is handled by {@link isBlacklisted} and supports:
 * - Absolute paths (`/app/utilities`)
 * - Full relative paths from the scan root (`utilities/query`)
 * - Partial subpaths at any depth (`query/constants.js`)
 * - Bare file or directory names (`constants.js`, `utilities`)
 *
 * A blacklisted directory excludes all files in its entire subtree.
 * The same logic applies whether `filepath` is a file or a directory.
 *
 * **Inclusion rules (all must pass):**
 * - Path does not match any blacklist entry.
 * - File extension (lower-cased) is in `extensions` (or `extensions` is empty).
 * - If `modifiedTime` is set, `Date.now() - mtime < modifiedTime`.
 *
 * @param {string} filepath
 *   Path to a file or directory to scan.
 * @param {GetFilenamesOptions} [options={}]
 *   Filtering and output options.
 *
 * @returns {string[]} Matched file paths. Absolute unless `options.relative` is
 *                     set, in which case paths are prefixed with `"./"` or `"../"`.
 *                     Returns an empty array if nothing matches.
 *
 * @throws {NodeJS.ErrnoException} If `fs.readdirSync` or `fs.lstatSync` fails
 *                                 (e.g. `ENOENT`, `EACCES`).
 * @throws {Error} If `filepath` is neither a file nor a directory.
 *
 * @example
 * // All .js files under a directory
 * const files = getFilenames("/app/routes");
 *
 * @example
 * // Single file input
 * const files = getFilenames("/app/routes/index.js");
 * // => ["/app/routes/index.js"]  (or [] if filtered out)
 *
 * @example
 * // .ts files modified in the last 60 s, relative paths, top-level only
 * const files = getFilenames("/app/src", {
 *   extensions: ".ts",
 *   modifiedTime: 60_000,
 *   relative: true,
 *   blacklist: ["node_modules", "__tests__"],
 *   recursive: false
 * });
 */
const getFilenames = (
  filepath,
  {
    modifiedTime,
    blacklist = ["node_modules", "secrets"],
    extensions = [".txt", ".md", ".docx"],
    relative,
    recursive = true
  } = {}
) => {
  relative === true && (relative = __dirname);

  // Normalize filters.
  blacklist  = makeSet(blacklist);
  extensions = makeSet(extensions);
  extensions.forEach(v => extensions.add(v.toLowerCase()));
  extensions.forEach(v => v.charAt(0) !== "." && extensions.add("." + v));

  // Resolve and stat the input path.
  const resolved = path.resolve(filepath);
  const stat     = fs.lstatSync(resolved);

  let files = [];

  if (stat.isFile()) {
    const ext   = path.extname(resolved).toLowerCase();
    const aged  = modifiedTime && (Date.now() - stat.mtimeMs >= modifiedTime);
    const extOk = !extensions.size || extensions.has(ext);
    const scanRoot = path.dirname(resolved);
    !aged && extOk && !isBlacklisted(resolved, scanRoot, blacklist) && files.push(resolved);

  } else if (stat.isDirectory()) {
    const entries = fs.readdirSync(resolved, { recursive, withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.size && !extensions.has(ext)) continue;

      const fullPath = path.resolve(entry.parentPath || entry.path, entry.name);

      if (isBlacklisted(fullPath, resolved, blacklist)) continue;

      if (modifiedTime) {
        const { mtimeMs } = fs.lstatSync(fullPath);
        if (Date.now() - mtimeMs >= modifiedTime) continue;
      }

      files.push(fullPath);
    }
  } else {
    throw new Error(`"${resolved}" is neither a file nor a directory.`);
  }

  if (relative) {
    files = files.map(file => {
      file = path.relative(relative, file);
      return file.startsWith("../") ? file : "./" + file;
    });
  }

  return files;
}

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(getFilenames, "getFilenames", {
  value: getFilenames
}));