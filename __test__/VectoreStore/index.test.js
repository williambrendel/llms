"use strict";

/**
 * @file index.test.js
 * @brief Tests for the VectorStore class.
 *
 * Covers:
 *   - Array inheritance: instanceof Array, length, indexing, iteration.
 *   - Symbol.species fallback: derived methods return plain Array.
 *   - vecDim getter: empty, consistent, mixed (throws).
 *   - clear(): empties the store, returns this.
 *   - score(): composes Document.score across documents.
 *   - search(): delegates to the external search function.
 *   - load() / create(): file and directory I/O via tmpdir.
 *   - Document.score / VectorStore.score as static forms.
 *
 * The pipeline behaviors (prune, rerank, safety rails) are covered in
 * search.test.js. This file focuses on the class shape and method wiring.
 */

const fs   = require("fs").promises;
const path = require("path");
const os   = require("os");

const VectorStore = require("../../src/VectorStore");
const Document    = require("../../src/VectorStore/Document");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const v = (...components) => new Float32Array(components);

const makeDoc = (documentId, sections, vecDim = 4) =>
  Document.fromSpec({ documentId, vecDim, sections });

let tmpRoot;
beforeAll(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vs-class-test-"));
});
afterAll(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { recursive: true, force: true });
});

const writeFixture = async (filepath, documentId) => {
  const doc = makeDoc(documentId, [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]);
  await doc.write(filepath);
};

// ─────────────────────────────────────────────────────────────────────────────
// Array inheritance
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — Array inheritance", () => {
  test("instanceof Array", () => {
    const store = new VectorStore();
    expect(store).toBeInstanceOf(Array);
    expect(store).toBeInstanceOf(VectorStore);
  });

  test("length and indexing work natively", () => {
    const store = new VectorStore();
    expect(store.length).toBe(0);

    const doc = makeDoc("x", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]);
    store.push(doc);

    expect(store.length).toBe(1);
    expect(store[0]).toBe(doc);
  });

  test("iteration works natively", () => {
    const store = new VectorStore();
    store.push(makeDoc("a", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));
    store.push(makeDoc("b", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));

    const ids = [];
    for (const doc of store) ids.push(doc.documentId);
    expect(ids).toEqual(["a", "b"]);
  });

  test("Symbol.species falls back to plain Array", () => {
    // store.map(...) should produce an Array, not a VectorStore — the
    // mapped values often aren't Documents, and treating them as a
    // VectorStore would be wrong.
    const store = new VectorStore();
    store.push(makeDoc("a", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));
    store.push(makeDoc("b", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));

    const ids = store.map(d => d.documentId);
    expect(ids).toBeInstanceOf(Array);
    expect(ids).not.toBeInstanceOf(VectorStore);
    expect(ids).toEqual(["a", "b"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// vecDim getter
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — vecDim getter", () => {
  test("returns null for an empty store", () => {
    expect(new VectorStore().vecDim).toBeNull();
  });

  test("returns the common dim when all documents agree", () => {
    const store = new VectorStore();
    store.push(makeDoc("a", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }], 4));
    store.push(makeDoc("b", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }], 4));
    expect(store.vecDim).toBe(4);
  });

  test("throws when documents have inconsistent dims", () => {
    const store = new VectorStore();
    store.push(makeDoc("a", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }], 4));
    store.push(Document.fromSpec({
      documentId: "b",
      vecDim: 8,
      sections: [{ range: [0, 10], vectors: [new Float32Array(8)] }],
    }));

    expect(() => store.vecDim).toThrow(/mixed vector dimensions/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clear()
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — clear", () => {
  test("empties the store", () => {
    const store = new VectorStore();
    store.push(makeDoc("a", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));
    store.push(makeDoc("b", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]));

    store.clear();
    expect(store.length).toBe(0);
  });

  test("returns this for chaining", () => {
    const store = new VectorStore();
    expect(store.clear()).toBe(store);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// score()
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — score", () => {
  test("composes Document.score across all documents", () => {
    const doc1 = makeDoc("doc|one", [
      { range: [0, 10],  vectors: [v(1, 0, 0, 0)] },
      { range: [10, 20], vectors: [v(0.9, 0.1, 0, 0)] },
    ]);
    const doc2 = makeDoc("doc|two", [
      { range: [0, 10], vectors: [v(0.8, 0.2, 0, 0)] },
    ]);

    const store = new VectorStore();
    store.push(doc1);
    store.push(doc2);

    const hits = store.score(v(1, 0, 0, 0));
    // 3 sections, all passing the default ABSOLUTE_FLOOR.
    expect(hits.length).toBe(3);
  });

  test("returns hits in document order (NOT sorted)", () => {
    // score() is the raw composition; sorting is search()'s job.
    const doc1 = makeDoc("doc|one", [
      { range: [0, 10], vectors: [v(0.5, 0.5, 0.5, 0.5)] }, // score 0.5
    ]);
    const doc2 = makeDoc("doc|two", [
      { range: [0, 10], vectors: [v(1, 0, 0, 0)] },          // score 1.0
    ]);

    const store = new VectorStore();
    store.push(doc1);
    store.push(doc2);

    const hits = store.score(v(1, 0, 0, 0));
    // doc1 comes first in the store, so its hit comes first — even
    // though its score is lower.
    expect(hits[0].documentId).toBe("doc|one");
    expect(hits[1].documentId).toBe("doc|two");
  });

  test("empty store returns an empty array", () => {
    const store = new VectorStore();
    expect(store.score(v(1, 0, 0, 0))).toEqual([]);
  });

  test("VectorStore.score(store, query) static form works equivalently", () => {
    const doc = makeDoc("x", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]);
    const store = new VectorStore();
    store.push(doc);

    const fromInstance = store.score(v(1, 0, 0, 0));
    const fromStatic   = VectorStore.score(store, v(1, 0, 0, 0));

    expect(fromStatic.length).toBe(fromInstance.length);
    expect(fromStatic[0].score).toBe(fromInstance[0].score);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// search()
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — search", () => {
  test("delegates to the search pipeline and returns hits", () => {
    const doc = makeDoc("x", [
      { range: [0, 10],  vectors: [v(1, 0, 0, 0)] },
      { range: [10, 20], vectors: [v(0.7, 0.3, 0, 0)] },
    ]);
    const store = new VectorStore();
    store.push(doc);

    const hits = store.search(v(1, 0, 0, 0));
    expect(Array.isArray(hits)).toBe(true);

    // Pipeline strips bestVec.
    for (const h of hits) expect(h.bestVec).toBeUndefined();
  });

  test("VectorStore.search(store, query) static form works equivalently", () => {
    const doc = makeDoc("x", [{ range: [0, 10], vectors: [v(1, 0, 0, 0)] }]);
    const store = new VectorStore();
    store.push(doc);

    const fromInstance = store.search(v(1, 0, 0, 0));
    const fromStatic   = VectorStore.search(store, v(1, 0, 0, 0));

    expect(fromStatic.length).toBe(fromInstance.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// load() and create()
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — load and create", () => {
  test("instance load() reads a file into the store", async () => {
    const filepath = path.join(tmpRoot, "instance-load.bin");
    await writeFixture(filepath, "x|instance");

    const store = new VectorStore();
    await store.load(filepath);

    expect(store.length).toBe(1);
    expect(store[0].documentId).toBe("x|instance");
  });

  test("instance load() returns this for chaining", async () => {
    const filepath = path.join(tmpRoot, "chain.bin");
    await writeFixture(filepath, "x|chain");

    const store = new VectorStore();
    const result = await store.load(filepath);
    expect(result).toBe(store);
  });

  test("static create() returns a fully-loaded store", async () => {
    const filepath = path.join(tmpRoot, "create.bin");
    await writeFixture(filepath, "x|create");

    const store = await VectorStore.create(filepath);
    expect(store).toBeInstanceOf(VectorStore);
    expect(store.length).toBe(1);
    expect(store[0].documentId).toBe("x|create");
  });

  test("create() with a directory loads multiple documents", async () => {
    const dir = await fs.mkdtemp(path.join(tmpRoot, "createDir-"));
    await writeFixture(path.join(dir, "a.bin"), "doc|a");
    await writeFixture(path.join(dir, "b.bin"), "doc|b");

    const store = await VectorStore.create(dir);
    expect(store.length).toBe(2);
    expect(store.map(d => d.documentId).sort()).toEqual(["doc|a", "doc|b"]);
  });

  test("load() with clear=false appends to existing contents", async () => {
    const filepathA = path.join(tmpRoot, "append-a.bin");
    const filepathB = path.join(tmpRoot, "append-b.bin");
    await writeFixture(filepathA, "set|a");
    await writeFixture(filepathB, "set|b");

    const store = new VectorStore();
    await store.load(filepathA);
    await store.load(filepathB, { clear: false });

    expect(store.length).toBe(2);
    expect(store.map(d => d.documentId).sort()).toEqual(["set|a", "set|b"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module export conventions
// ─────────────────────────────────────────────────────────────────────────────

describe("VectorStore — module export conventions", () => {
  test("the export is the class itself", () => {
    expect(typeof VectorStore).toBe("function");
    expect(VectorStore.prototype.constructor).toBe(VectorStore);
  });

  test("exposes a self-referential .VectorStore property", () => {
    expect(VectorStore.VectorStore).toBe(VectorStore);
  });

  test("the exported class is frozen", () => {
    expect(Object.isFrozen(VectorStore)).toBe(true);
  });
});
