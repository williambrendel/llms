"use strict";

const load   = require("./load");
const search = require("./search");
const { ABSOLUTE_FLOOR } = require("./constants");
const Document = require("./Document");

/**
 * @file index.js
 * @module VectorStore
 * @description Collection of {@link Document} instances with a search
 * pipeline. Extends `Array` — `this[i]` is the i-th document; standard
 * array iteration and accessors work directly.
 *
 * Typical lifecycle:
 *   - Endpoint init: `await VectorStore.create("dataset/")`
 *   - Per query:     `store.search(queryVec, options)` (synchronous)
 *   - Hot reload:    `await store.load("dataset/")` (replaces contents)
 *
 * Most operations delegate to standalone functions in this folder. The
 * class itself is a thin facade.
 */

/**
 * @class VectorStore
 * @extends Array
 */
class VectorStore extends Array {
  /**
   * `Array` subclasses default to returning subclass instances from
   * `map`, `filter`, `slice`, etc. — which would mean `store.map(...)`
   * returns a `VectorStore`, even when the mapped values aren't Documents.
   * Falling back to `Array` for derived results avoids that confusion.
   */
  static get [Symbol.species]() { return Array; }

  /**
   * The embedding dimension shared by all loaded documents.
   *
   * Returns `null` for an empty store. Throws if loaded documents have
   * inconsistent dimensions (e.g. a model swap left the dataset half-built).
   *
   * @type {number|null}
   */
  get vecDim() {
    if (this.length === 0) return null;
    const dim = this[0].vecDim;
    for (let i = 1; i < this.length; i++) {
      if (this[i].vecDim !== dim) {
        throw new Error(
          `VectorStore: mixed vector dimensions ` +
          `(${dim} from "${this[0].documentId}" vs ${this[i].vecDim} from "${this[i].documentId}")`
        );
      }
    }
    return dim;
  }

  /**
   * Empty the store.
   *
   * @returns {VectorStore} `this` for chaining.
   */
  clear() {
    this.length = 0;
    return this;
  }

  /**
   * Load `.bin` files from a path (file or directory). Atomic — if any
   * file fails to parse, the store is left in its prior state.
   *
   * @async
   * @param {string}  inputPath
   * @param {object}  [options]
   * @param {boolean} [options.clear=true]
   * @returns {Promise<VectorStore>}
   */
  load(inputPath, options) {
    return load(this, inputPath, options);
  }

  /**
   * Ingest new documents into the existing store from one or more
   * paths, in place. Variadic: accepts any combination of strings
   * and (possibly nested) arrays of strings. Arguments are flattened
   * via `flat(Infinity)`, so:
   *
   *   await store.add("a.bin");
   *   await store.add("a.bin", "b.bin");
   *   await store.add(["a.bin", "b.bin"]);
   *   await store.add(["a.bin", ["b.bin", "c.bin"]], "d.bin");
   *
   * all work and resolve to the same in-place merge.
   *
   * Each path may be a file or a directory — same polymorphism as
   * `load()`. Paths are loaded sequentially (not in parallel) so a
   * failure midway leaves a deterministic prefix of paths loaded and
   * the rest untouched. Use `Promise.all` at the call site if you
   * want parallelism and don't care about ordering.
   *
   * Equivalent to `load(path, { clear: false })` per path. Use
   * `load()` directly when you want the default replace-everything
   * behavior (typically only at boot).
   *
   * Mirrors {@link SectionResolver#add}.
   *
   * @async
   * @param {...(string|string[])} inputPaths - Paths, or arrays of paths.
   * @returns {Promise<VectorStore>} `this`, for chaining.
   */
  async add(...inputPaths) {
    inputPaths = inputPaths.flat(Infinity);
    if (inputPaths.length === 0) return this;

    // Validate input types up front. Cheap and fails fast — no
    // point firing parallel loads if one arg is the wrong shape.
    for (const p of inputPaths) {
      if (typeof p !== "string" || p.length === 0) {
        throw new Error(`VectorStore.add: each path must be a non-empty string, got ${typeof p}`);
      }
    }

    // Parallel loads. allSettled so one bad file doesn't stop the
    // others from landing. load() itself is atomic per-path: a
    // failing parse leaves the store untouched for that path.
    const settled = await Promise.allSettled(
      inputPaths.map(p => load(this, p, { clear: false }))
    );

    // Surface per-path failures as a single AggregateError. The
    // store now holds every successfully loaded path; failures
    // didn't touch it. The caller (PendingQueue) sees the throw
    // and increments retries for whichever entries it submitted.
    const errors = settled
      .map((r, i) => r.status === "rejected"
        ? new Error(`VectorStore.add: failed loading "${inputPaths[i]}": ${r.reason.message}`)
        : null)
      .filter(Boolean);

    if (errors.length > 0) {
      throw new AggregateError(errors, `VectorStore.add: ${errors.length}/${inputPaths.length} paths failed`);
    }
    return this;
  }

  /**
   * Score every section across every document and return the raw hits
   * (no pruning, rerank, or safety rails). Composition over per-document
   * {@link Document#score} calls.
   *
   * Use {@link VectorStore#search} for the full pipeline.
   *
   * @param {Float32Array} queryVec
   * @param {number} [floor=ABSOLUTE_FLOOR]
   * @returns {Array} Hits in document order (NOT sorted by score).
   */
  static score(store, queryVec, floor = ABSOLUTE_FLOOR) {
    const out = [];
    for (let i = 0, l = store.length; i !== l; ++i) {
      out.push(...Document.score(store[i], queryVec, floor));
    }
    return out;
  }
  score(queryVec, floor = ABSOLUTE_FLOOR) {
    return VectorStore.score(this, queryVec, floor );
  }

  /**
   * Search the store with the full pipeline. See {@link module:VectorStore/search}
   * for options.
   *
   * @param {Float32Array} queryVec
   * @param {object} [options]
   * @returns {Array<{ score: number, documentId: string, range: [number, number] }>}
   */
  static search (store, queryVec, options) {
    return search(store, queryVec, options);
  }
  search(queryVec, options) {
    return VectorStore.search(this, queryVec, options);
  }

  /**
   * Construct a new store and load `inputPath` into it.
   *
   * @async
   * @param {string} inputPath
   * @returns {Promise<VectorStore>}
   */
  static async create(inputPath) {
    return new VectorStore().load(inputPath);
  }
}

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(VectorStore, "VectorStore", {
  value: VectorStore,
}));