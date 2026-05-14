"use strict";

/**
 * @file adaptivePrune.test.js
 * @brief Tests for the adaptive-truncation bridge.
 *
 * `adaptivePrune` is a one-line wrapper that mutates `hits.length` to
 * the value returned by `entropyEffectiveCount`. These tests verify the
 * mutation side effect, the return-the-input-for-chaining contract, and
 * a few end-to-end shape checks. The math primitive is tested separately
 * in `entropyEffectiveCount.test.js` and is not re-verified here.
 */

const adaptivePrune = require("../../src/VectorStore/adaptivePrune");

const hits = (...scores) => scores.map(score => ({ score }));

// ─────────────────────────────────────────────────────────────────────────────
// In-place mutation
// ─────────────────────────────────────────────────────────────────────────────

describe("adaptivePrune — in-place mutation", () => {
  test("truncates the array in place", () => {
    const arr = hits(0.9, 0.05, 0.05, 0.05);
    const originalRef = arr;
    adaptivePrune(arr);
    expect(arr).toBe(originalRef); // same reference, not a new array
    expect(arr.length).toBeLessThan(4);
  });

  test("keeps surviving hits in their original order", () => {
    // Distribution where the top 3 are clear winners.
    const arr = hits(0.95, 0.92, 0.90, 0.05, 0.04);
    adaptivePrune(arr);
    // The survivors should still be the top-N, in the order they came in.
    expect(arr[0].score).toBe(0.95);
    if (arr.length >= 2) expect(arr[1].score).toBe(0.92);
    if (arr.length >= 3) expect(arr[2].score).toBe(0.90);
  });

  test("does not modify the survivor objects themselves", () => {
    const survivor = { score: 0.95, documentId: "x", range: [0, 10] };
    const arr = [survivor, { score: 0.05 }];
    adaptivePrune(arr);
    expect(arr[0]).toBe(survivor); // identity preserved
    expect(arr[0].score).toBe(0.95);
    expect(arr[0].documentId).toBe("x");
    expect(arr[0].range).toEqual([0, 10]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Return value (chaining contract)
// ─────────────────────────────────────────────────────────────────────────────

describe("adaptivePrune — return value", () => {
  test("returns the same array that was passed in", () => {
    const arr = hits(0.9, 0.1, 0.05);
    expect(adaptivePrune(arr)).toBe(arr);
  });

  test("chaining works: result is iterable post-prune", () => {
    const result = adaptivePrune(hits(0.95, 0.92, 0.05));
    const scores = result.map(h => h.score);
    expect(scores.length).toBe(result.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end shape (smoke checks)
// ─────────────────────────────────────────────────────────────────────────────

describe("adaptivePrune — end-to-end shapes", () => {
  test("empty array stays empty", () => {
    const arr = [];
    adaptivePrune(arr);
    expect(arr.length).toBe(0);
  });

  test("all-zero array gets pruned to empty", () => {
    const arr = hits(0, 0, 0);
    adaptivePrune(arr);
    expect(arr.length).toBe(0);
  });

  test("uniform distribution keeps all items (entropy maximal)", () => {
    const arr = hits(0.5, 0.5, 0.5, 0.5);
    adaptivePrune(arr);
    expect(arr.length).toBe(4);
  });

  test("sharp distribution prunes to a small head", () => {
    const arr = hits(0.95, 0.02, 0.01, 0.01, 0.01);
    adaptivePrune(arr);
    expect(arr.length).toBeLessThanOrEqual(2);
  });

  test("single-item array survives", () => {
    const arr = hits(0.95);
    adaptivePrune(arr);
    expect(arr.length).toBe(1);
    expect(arr[0].score).toBe(0.95);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module export conventions
// ─────────────────────────────────────────────────────────────────────────────

describe("adaptivePrune — module export conventions", () => {
  test("the export is the function itself", () => {
    expect(typeof adaptivePrune).toBe("function");
  });

  test("exposes a self-referential .adaptivePrune property", () => {
    expect(adaptivePrune.adaptivePrune).toBe(adaptivePrune);
  });

  test("the exported function is frozen", () => {
    expect(Object.isFrozen(adaptivePrune)).toBe(true);
  });
});
