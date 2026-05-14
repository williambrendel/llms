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