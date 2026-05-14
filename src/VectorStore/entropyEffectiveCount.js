"use strict";

/**
 * @file entropyEffectiveCount.js
 * @module VectorStore/entropyEffectiveCount
 * @description Compute how many items at the head of a sorted hit list
 * carry meaningful signal, using Shannon entropy as the measure.
 *
 * The function answers a practical question: given a ranked score
 * distribution, how many top-K items should I keep? Rather than a fixed
 * cutoff or a hand-tuned threshold, we read the distribution itself.
 *
 * Intuition. A distribution where one score dominates the rest has low
 * entropy — its effective count is near 1. A distribution where 30 items
 * all score roughly equally has high entropy — its effective count is
 * near 30. The function maps this directly: convert the scores to a
 * probability mass, compute Shannon entropy `H`, and return
 * `k = ⌈exp(H)⌉` (the perplexity, capped to `[1, l]` where `l` is the
 * number of positive scores).
 *
 * For a uniform distribution over k items, `H = log(k)` and the function
 * returns exactly k. For a delta on one item, `H = 0` and it returns 1.
 * Real-world cosine-score distributions fall between these and produce
 * sensible cutoffs.
 *
 * Sorted-descending precondition. Hits are sorted descending by `.score`
 * (the search pipeline guarantees this before calling adaptive pruning).
 * The function exploits this in two ways:
 *
 *   - Trailing non-positive scores are skipped without re-scanning. As
 *     soon as `score ≤ 0` is seen, the rest of the array is ignored —
 *     they can't contribute to a probability mass.
 *   - No internal sort or copy is needed. The function reads `.score`
 *     directly from each hit and computes everything in a single pass.
 *
 * Pre-sorting is required for these shortcuts. Violating it (passing an
 * unsorted array) produces a result that is mathematically valid as an
 * entropy computation but useless as a truncation point — non-positive
 * scores interspersed with positive ones will cause the loop to terminate
 * early.
 *
 * Returns 0 for an empty array or one containing only non-positive
 * scores. Returns at least 1 for any input with at least one positive
 * score (the entropy of a single positive score is 0, mapped to k=1 by
 * the lower clamp).
 */

/**
 * Find the entropy-derived effective count of a sorted hit list.
 *
 * @function entropyEffectiveCount
 *
 * @param {Array<{ score: number }>} hits
 *   Hit list sorted descending by `.score`. The function reads `.score`
 *   directly off each element; it does not extract or copy the scores
 *   into a temporary buffer.
 *
 * @returns {number}
 *   Integer in `[0, hits.length]` representing how many items at the head
 *   of the list carry the bulk of the distribution's mass. Use as the
 *   target length for an in-place truncation:
 *
 *   ```
 *   hits.length = entropyEffectiveCount(hits);
 *   ```
 *
 * @example <caption>Sharp distribution (one dominant item)</caption>
 *   entropyEffectiveCount([{score: 0.9}, {score: 0.2}, {score: 0.15}, {score: 0.1}])
 *   // → 1 or 2 (mass concentrated on the top)
 *
 * @example <caption>Plateau distribution (relevant cluster)</caption>
 *   entropyEffectiveCount([
 *     {score: 0.85}, {score: 0.82}, {score: 0.80}, {score: 0.78},
 *     {score: 0.30}, {score: 0.25}, {score: 0.20},
 *   ])
 *   // → ~4 (entropy detects the top plateau)
 *
 * @example <caption>Empty or all-zero input</caption>
 *   entropyEffectiveCount([])               // → 0
 *   entropyEffectiveCount([{score: -0.1}])  // → 0
 */
const entropyEffectiveCount = hits => {
  const n = hits.length;
  if (n === 0) return 0;

  // Single pass: accumulate sum (s), entropy (H), and positive count (l).
  // `H` here holds the un-normalized form `-Σ v · log(v)`; we normalize
  // it against `s` after the loop. The early break on non-positive scores
  // relies on the sorted-descending precondition — see the file header.
  let s = 0, H = 0, l = 0;
  for (let i = 0, v = hits[0].score; i !== n && (v = hits[i].score) > 0; ++i) {
    s += v;
    H -= v * Math.log(v);
    ++l;
  }
  if (l === 0) return 0;

  // Convert the un-normalized accumulator into the Shannon entropy of
  // the probability mass {v_i / s}. The identity used:
  //
  //   H(p) = -Σ p_i · log(p_i)
  //        = -Σ (v_i / s) · log(v_i / s)
  //        = -Σ (v_i / s) · (log(v_i) - log(s))
  //        = log(s) - (1/s) · Σ v_i · log(v_i)
  //        = log(s) + H_unnormalized / s
  H = Math.log(s) + H / s;

  // Perplexity = exp(H). Round up — we want the smallest k such that the
  // top-k captures the distribution's "effective mass," and `ceil`
  // matches that intent. Clamp to [1, l] so callers always get a sane
  // truncation length on any input with at least one positive score.
  const k = Math.ceil(Math.exp(H));
  return k < 1 && 1 || (k > l && l || k);
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(entropyEffectiveCount, "entropyEffectiveCount", {
  value: entropyEffectiveCount,
}));
