"use strict";

/**
 * @file constants.js
 * @module knowledgeBase/constants
 * @description Build-time tuning constants for the dataset construction
 * pipeline.
 *
 * Format-spec constants (VECT magic, version, header size) belong with
 * the data structure they describe — see
 * `src/VectorStore/Document/constants.js`. This file holds only the
 * heuristic knobs that the build pipeline uses to decide *how* to break
 * sections down before vectorizing them.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Section-vectorization thresholds
//
// Drive the choice between embedding the whole content, grouped sentences,
// or per-sentence vectors. Tuned for 384-dim sentence encoders (BGE-small,
// MiniLM-L12) which compress meaningfully past ~300 words.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Below this word count, embed the section's content as a single vector.
 * The encoder is most discriminative on chunks in roughly the 50–200 word
 * range; very short sections don't benefit from further subdivision.
 *
 * @type {number}
 */
const SHORT_THRESHOLD = 150;

/**
 * Above this word count, embed each sentence individually. The content as
 * a whole is too compressed by the encoder for specific facts to surface
 * reliably.
 *
 * @type {number}
 */
const LONG_THRESHOLD = 400;

/**
 * For medium-bucket sections (between SHORT and LONG), the target word
 * count for each sentence group. Sentences are accumulated until adding
 * the next one would exceed this target, at which point the current group
 * is emitted as a single vector.
 *
 * @type {number}
 */
const GROUP_TARGET = 80;

module.exports = Object.freeze({
  SHORT_THRESHOLD,
  LONG_THRESHOLD,
  GROUP_TARGET,
});
