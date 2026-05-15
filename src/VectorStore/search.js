"use strict";

const adaptivePrune    = require("./adaptivePrune");
const rerank           = require("./rerank");
const applySafetyRails = require("./applySafetyRails");
const {
  ABSOLUTE_FLOOR,
  MIN_OUTPUT_ROWS,
  RERANK_ENABLED,
  RERANK_THRESHOLD,
  PIVOT_ENABLED,
  PIVOT_MIN_RESULTS,
  PIVOT_MIN_ANCHOR_SCORE,
  PIVOT_MAX_RESULTS,
  MAX_CUT_INDEX,
} = require("./constants");

/**
 * @file search.js
 * @module VectorStore/search
 * @description Standalone search function. Accepts either a single
 * {@link Document} or any array of documents (including a {@link VectorStore}
 * extending Array) and runs the full pipeline.
 *
 * Pipeline:
 *   1. Normalize target into an array of documents.
 *   2. Score every section across every document (calls `doc.score()`).
 *   3. Drop hits below {@link ABSOLUTE_FLOOR} (already done in `doc.score`).
 *   4. Sort descending; snapshot for safety-rail fallback.
 *   5. First-pass adaptive prune → candidate set.
 *   6. (Optional) Pivot expansion when the candidate set is sparse but the
 *      anchor is solid: re-search using the anchor's `bestVec`, discount
 *      pivot scores by the anchor's score, dedup-merge, re-sort the
 *      merged set.
 *   7. (Optional) Rerank the candidate set + score-anchored extension.
 *   8. Apply MIN/MAX safety rails.
 *   9. Cap at caller's `maxRows`.
 *  10. Strip internal `bestVec` from returned hits.
 *
 * Both {@link Document#search} and {@link VectorStore#search} delegate
 * here. Keeping the pipeline in a standalone file avoids the circular
 * dependency that would arise if it lived as a method on either class.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module-private helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip the internal `bestVec` field from each hit so returned objects
 * match the public hit shape. Mutates in place.
 */
const stripInternals = hits => {
  for (let i = 0, l = hits.length; i !== l; ++i) delete hits[i].bestVec;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search a Document or collection of Documents for sections similar to
 * `queryVec`.
 *
 * Targets are normalized: a Document is wrapped as `[doc]`, an array
 * (including a VectorStore) is used as-is. Each element is expected to
 * expose `score(queryVec, floor)` returning per-document hits.
 *
 * @function search
 * @param {Document|Array<Document>} target
 * @param {Float32Array} queryVec - L2-normalized query embedding.
 * @param {object}  [options]
 * @param {number}  [options.maxRows=Infinity]
 * @param {boolean} [options.rerank=RERANK_ENABLED]
 * @param {number}  [options.rerankThreshold=RERANK_THRESHOLD]
 * @param {boolean} [options.usePivot=PIVOT_ENABLED]
 *   When true, fire a pivot expansion pass after adaptive prune if (a) the
 *   candidate set is smaller than {@link PIVOT_MIN_RESULTS} AND (b) the best
 *   candidate's score is at least {@link PIVOT_MIN_ANCHOR_SCORE}. The pivot
 *   pass runs `search` recursively with the anchor's `bestVec` as the new
 *   query vector, discounts the pivot scores by the anchor's score, and
 *   merges the new candidates into the working set with dedup. The rerank
 *   pass that follows arbitrates the combined pool.
 * @param {number}  [options.pivotMinResults=PIVOT_MIN_RESULTS]
 * @param {number}  [options.pivotMinAnchorScore=PIVOT_MIN_ANCHOR_SCORE]
 * @param {number}  [options.pivotMaxResults=PIVOT_MAX_RESULTS]
 * @param {number}  [options.maxCutIndex=MAX_CUT_INDEX]
 *   Forwarded to {@link adaptivePrune}. Defensive upper bound on
 *   the post-prune candidate set size. Defaults to {@link MAX_CUT_INDEX}
 *   (30), tuned to keep downstream rerank, pivot, and LLM-context
 *   work bounded.
 *
 * @returns {Array<{ score: number, documentId: string, range: [number, number] }>}
 */
const search = (target, queryVec, {
  maxRows         = Infinity,
  rerank: rerankEnabled = RERANK_ENABLED,
  rerankThreshold = RERANK_THRESHOLD,
  usePivot              = PIVOT_ENABLED,
  pivotMinResults       = PIVOT_MIN_RESULTS,
  pivotMinAnchorScore   = PIVOT_MIN_ANCHOR_SCORE,
  pivotMaxResults       = PIVOT_MAX_RESULTS,
  maxCutIndex           = MAX_CUT_INDEX,
} = {}) => {
  if (!(queryVec instanceof Float32Array)) {
    throw new Error("search: queryVec must be a Float32Array");
  }

  // Normalize: wrap a single Document as [doc]; arrays pass through.
  const store = Array.isArray(target) ? target : [target];
  if (store.length === 0) return [];

  const dim = queryVec.length;

  // ── 1-3. Score every document; floor cut happens inside doc.score() ───
  const allHits = [];
  for (let i = 0, l = store.length; i !== l; ++i) {
    allHits.push(...store[i].score(queryVec, ABSOLUTE_FLOOR));
  }

  if (allHits.length === 0) return [];

  // ── 4. Sort descending; snapshot for empty-prune fallback ─────────────
  allHits.sort((a, b) => b.score - a.score);
  const savedCosine = allHits.slice();

  // ── 5. First-pass adaptive prune → candidate set ──────────────────────
  let candidateSet = allHits.slice();
  adaptivePrune(candidateSet, { maxCutIndex });

  if (candidateSet.length === 0) {
    // Adaptive prune emptied the set. Fall back to top MIN_OUTPUT_ROWS.
    const out = savedCosine.slice(0, MIN_OUTPUT_ROWS);
    stripInternals(out);
    return out.slice(0, maxRows);
  }

  // ── 6. Pivot expansion (optional) ─────────────────────────────────────
  // Fires only when (a) results are sparse AND (b) the anchor is solid.
  // A weak anchor would amplify off-topic content; pivoting on it adds
  // noise rather than coverage. The discount applied at merge keeps
  // pivot results conservative — even strong pivot matches enter the
  // candidate set ranked below an anchor of equal cosine.
  //
  // We call `Document.score` directly on each store member rather than
  // recursing through `search`. The pivot doesn't need adaptive prune,
  // rerank, safety rails, or strip — it just needs raw cosine hits
  // (with `bestVec` attached, so the outer rerank can compute a
  // centroid that includes pivot evidence). Calling score directly
  // also avoids potential infinite recursion.
  if (
    usePivot &&
    candidateSet.length <= pivotMinResults &&
    candidateSet[0].score >= pivotMinAnchorScore
  ) {
    const anchor      = candidateSet[0];
    const anchorScore = anchor.score;

    // Sweep the corpus with the anchor's bestVec. ABSOLUTE_FLOOR still
    // applies — we don't want pivot to surface noise. Use a per-doc
    // score sweep (not the full search pipeline) so bestVec stays
    // attached on every hit for the rerank centroid downstream.
    const rawPivot = [];
    for (let i = 0, l = store.length; i !== l; ++i) {
      rawPivot.push(...store[i].score(anchor.bestVec, ABSOLUTE_FLOOR));
    }
    rawPivot.sort((a, b) => b.score - a.score);

    // Bound the pivot pool.
    if (rawPivot.length > pivotMaxResults) rawPivot.length = pivotMaxResults;

    // Dedup-merge into the candidate set. Key is documentId + range —
    // different ranges from the same document represent distinct
    // sections and shouldn't collide.
    const seen = new Set(
      candidateSet.map(c => `${c.documentId}|${c.range[0]}|${c.range[1]}`),
    );
    for (const hit of rawPivot) {
      const key = `${hit.documentId}|${hit.range[0]}|${hit.range[1]}`;
      if (seen.has(key)) continue;
      // Discount: probability-chain semantics. The pivot sweep used
      // the anchor's bestVec, so a pivot's relevance to the user is
      // bounded above by (pivot ~ anchor) × (anchor ~ user).
      hit.score *= anchorScore;
      candidateSet.push(hit);
      seen.add(key);
    }

    // Re-sort the merged candidate set in place. Operates on the small
    // candidate array only — no corpus-wide re-search.
    candidateSet.sort((a, b) => b.score - a.score);
  }

  // ── 7. Rerank (optional) ──────────────────────────────────────────────
  let working = candidateSet;
  let savedForFinalPrune = candidateSet.slice();

  if (rerankEnabled) {
    const { reranked, skipped } = rerank(queryVec, candidateSet, allHits, dim, rerankThreshold);
    if (!skipped) {
      working = reranked;
      // Snapshot for safety-rail restoration. We use the cosine-scored
      // snapshot because the pre-second-prune reranked list isn't easily
      // recoverable without changes to `rerank` (which discards it after
      // its own adaptive prune). In the rare case both rerank's prune
      // AND the safety rail trigger, restored hits come from cosine
      // ordering rather than reranked ordering — still good hits.
      savedForFinalPrune = savedCosine;
    }
  }

  // ── 8. Safety rails ───────────────────────────────────────────────────
  applySafetyRails(working, savedForFinalPrune);

  // ── 9. User cap ───────────────────────────────────────────────────────
  if (working.length > maxRows) working.length = maxRows;

  // ── 10. Strip internal fields ─────────────────────────────────────────
  stripInternals(working);
  return working;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(search, "search", {
  value: search,
}));