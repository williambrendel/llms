"use strict";

/**
 * @file constants.js
 * @module VectorStore/constants
 * @description Tuning constants for {@link VectorStore} pruning and rerank.
 *
 * Each constant has a distinct, encoder-independent role except
 * {@link ABSOLUTE_FLOOR}, which is the only place a cosine threshold lives.
 * All other thresholds are derived adaptively from the score distribution.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Defensive floor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hard lower bound on raw cosine similarity. Hits with a score strictly
 * below this are dropped before any adaptive pruning runs.
 *
 * Acts as a defensive sanity check: protects against encoder pathologies
 * or degenerate queries that produce uniformly mediocre scores. Adaptive
 * methods alone can't tell "everything scored 0.45 because everything is
 * actually marginally relevant" from "everything scored 0.45 because the
 * encoder is broken." This floor decides the latter case for us.
 *
 * Calibrated for normalized cosine in [-1, 1]; 0.3 corresponds to "weak
 * relatedness" — anything below is noise.
 *
 * @type {number}
 */
const ABSOLUTE_FLOOR = 0.3;

// ─────────────────────────────────────────────────────────────────────────────
// Output bounds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum number of hits the final output will contain when any hit clears
 * {@link ABSOLUTE_FLOOR}. If pruning would leave fewer than this count, the
 * top results from before pruning are restored up to this number.
 *
 * Acts as a recall floor — even on a weak query where adaptive prune cuts
 * aggressively, the LLM still gets at least this many candidates.
 *
 * @type {number}
 */
const MIN_OUTPUT_ROWS = 3;

/**
 * Maximum number of hits the final output will contain. Caps the API
 * payload regardless of how many candidates survive adaptive pruning.
 *
 * @type {number}
 */
const MAX_OUTPUT_ROWS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Rerank
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether rerank runs by default. Callers can override per-call with the
 * `rerank` option on {@link VectorStore#search}.
 *
 * @type {boolean}
 */
const RERANK_ENABLED = true;

/**
 * Maximum fraction of dimensions that can be "weak" (where the clamped
 * `query × candidateMean` weight is zero) before rerank is skipped.
 *
 * When this fraction is exceeded, the candidate-set mean disagrees with
 * the query on too many dimensions for the consensus signal to be useful —
 * the rerank weights would be dominated by zeros, suppressing too much of
 * the original score. In that case the raw cosine ranking is returned
 * instead.
 *
 * @type {number}
 */
const RERANK_THRESHOLD = 0.5;

/**
 * Score ratio defining the rerank extension floor.
 *
 * After the first-pass adaptive prune defines the candidate set, the
 * rerank input is extended downward to include hits whose score is at
 * least `lastCandidateScore × RERANK_EXTENSION_RATIO`. This gives hits
 * that were just below the adaptive cut a chance to be promoted by rerank.
 *
 * Anchoring to the *last* candidate score (rather than the best) keeps
 * the extension proportional to where the adaptive prune drew its line.
 *
 * @type {number}
 */
const RERANK_EXTENSION_RATIO = 0.7;

/**
 * Hard cap on the number of items added beyond the candidate set when
 * building the rerank input. Combined with {@link RERANK_EXTENSION_RATIO},
 * limits the worst-case cost of rerank.
 *
 * @type {number}
 */
const RERANK_EXTENSION_MAX = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Pivot expansion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether pivot expansion runs by default. Callers can override per-call with
 * the `usePivot` option on {@link search}.
 *
 * Pivot expansion is a last-resort retrieval supplement: when the primary
 * search returns a sparse-but-anchored candidate set, re-run the search
 * using the best hit's `bestVec` as the new query vector, discount the
 * resulting scores by the anchor's score (probability-chain semantics),
 * and merge the new candidates into the working set. The rerank pass that
 * follows then arbitrates the combined pool.
 *
 * Disabled by default because most queries surface enough candidates
 * through cosine + adaptive prune + rerank alone. Pivot is opt-in for
 * endpoints that want the safety net for sparse domains.
 *
 * @type {boolean}
 */
const PIVOT_ENABLED = false;

/**
 * Maximum size of the post-prune candidate set below which pivot expansion
 * is considered. Above this count, the working set is already broad enough
 * that pivot would only add dedup-noise.
 *
 * @type {number}
 */
const PIVOT_MIN_RESULTS = 5;

/**
 * Minimum anchor score required to fire pivot expansion. When the best
 * hit's score is below this, the user's query is poorly aligned with the
 * dataset; pivoting on a weak anchor amplifies off-topic content without
 * producing usable retrieval. The endpoint will typically route such
 * queries to a conversational reply downstream regardless.
 *
 * Matches the historical `CONVERSATIONAL_SCORE_THRESHOLD` used by older
 * query pipelines, so pivot fires under the same retrieval-quality bar
 * that determined "the dataset has something useful for this query."
 *
 * @type {number}
 */
const PIVOT_MIN_ANCHOR_SCORE = 0.7;

/**
 * Hard cap on the number of hits returned by the recursive pivot search.
 * Bounds the pivot pool size before dedup-merge, preventing pivot from
 * dominating the candidate set even on very broad anchor matches.
 *
 * @type {number}
 */
const PIVOT_MAX_RESULTS = 10;

module.exports = Object.freeze({
  ABSOLUTE_FLOOR,
  MIN_OUTPUT_ROWS,
  MAX_OUTPUT_ROWS,
  RERANK_ENABLED,
  RERANK_THRESHOLD,
  RERANK_EXTENSION_RATIO,
  RERANK_EXTENSION_MAX,
  PIVOT_ENABLED,
  PIVOT_MIN_RESULTS,
  PIVOT_MIN_ANCHOR_SCORE,
  PIVOT_MAX_RESULTS,
});