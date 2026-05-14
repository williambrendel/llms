"use strict";

const entropyEffectiveCount = require("./entropyEffectiveCount");

/**
 * @file adaptivePrune.js
 * @module VectorStore/adaptivePrune
 * @description In-place truncation of a sorted hit list at the entropy-
 * derived effective count.
 *
 * Defers the actual measurement to {@link entropyEffectiveCount}; this
 * file only handles the truncation — turning the count into a concrete
 * `hits.length` mutation. The split keeps the math primitive testable in
 * isolation, while leaving `adaptivePrune` as a one-line bridge between
 * the search pipeline and the entropy heuristic.
 *
 * Caller must pre-sort `hits` descending by score. The math primitive
 * relies on the same precondition.
 */

/**
 * Prune a sorted hit list in place.
 *
 * @function adaptivePrune
 * @param {Array<{ score: number }>} hits - Pre-sorted descending by score.
 * @returns {Array<{ score: number }>} the pruned input.
 */
const adaptivePrune = hits => {
  hits.length = entropyEffectiveCount(hits);
  return hits;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(adaptivePrune, "adaptivePrune", {
  value: adaptivePrune,
}));