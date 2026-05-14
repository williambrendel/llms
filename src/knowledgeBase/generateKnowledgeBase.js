"use strict";

const segmentTextSections = require("../utilities/textSegmentation/segmentTextSections");
const vectorize = require("../xenova/vectorize");
const llm = require("../claude").sonnet45;
const {
  SHORT_THRESHOLD,
  LONG_THRESHOLD,
  GROUP_TARGET,
} = require("./constants");

/**
 * @file generateKnowledgeBase.js
 * @module knowledgeBase/generateKnowledgeBase
 * @description Builds section records from a raw text buffer: segments the
 * text, vectorizes the body content under a word-count bucket heuristic,
 * invokes the LLM to generate retrieval rows per section, and appends the
 * row-derived vectors (question / anchors / variants) to each section's
 * vector list.
 *
 * The output shape matches what {@link Document.fromSpec} expects:
 * `Array<{ range: [number, number], vectors: Float32Array[] }>`. Pass it
 * straight through to `Document.fromSpec({ documentId, vecDim, sections })`
 * to materialize a queryable Document.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module-private helpers
// ─────────────────────────────────────────────────────────────────────────────

const wordCount = str => (str.match(/\S+/g) || []).length;

/**
 * Decides which bucket a section falls into based on its body word count.
 *
 * @param {number} contentWords
 * @returns {"short"|"medium"|"long"}
 */
const bucketFor = contentWords =>
    contentWords < SHORT_THRESHOLD ? "short"
  : contentWords > LONG_THRESHOLD  ? "long"
  : "medium";

/**
 * Builds the body vector promises for a section according to the bucket
 * heuristic. Appends to `vecPromises` in place.
 *
 * @param {Array<Promise<Float32Array>>} vecPromises - Mutated in place.
 * @param {string} content - Full body text of the section.
 * @param {string[]} sentenceTexts - Pre-extracted sentence strings.
 * @param {"short"|"medium"|"long"} bucket
 */
const pushBodyVectors = (vecPromises, content, sentenceTexts, bucket) => {
  if (bucket === "short") {
    content && vecPromises.push(vectorize(content));
    return;
  }

  if (bucket === "long") {
    for (const text of sentenceTexts) {
      if (wordCount(text) > 0) vecPromises.push(vectorize(text));
    }
    return;
  }

  // Medium — group sentences targeting GROUP_TARGET words per group.
  let current = [], currentWords = 0;
  for (const text of sentenceTexts) {
    const w = wordCount(text);
    if (w === 0) continue;
    if (currentWords > 0 && currentWords + w > GROUP_TARGET) {
      vecPromises.push(vectorize(current.join(". ")));
      current = [];
      currentWords = 0;
    }
    current.push(text);
    currentWords += w;
  }
  if (current.length) vecPromises.push(vectorize(current.join(". ")));
};

// ─────────────────────────────────────────────────────────────────────────────
// Public function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates VECT-ready section records from a raw text buffer.
 *
 * The pipeline per section:
 *   1. Extract breadcrumbs (ancestors + own header) and vectorize.
 *   2. Vectorize the body using a word-count bucket strategy:
 *        short  → one vector for the full content
 *        long   → one vector per sentence
 *        medium → grouped-sentence vectors targeting GROUP_TARGET words each
 *   3. Issue one LLM call (gated by the caller's concurrency limiter) to
 *      generate retrieval rows (question / anchors / variants).
 *   4. After all LLM calls settle, append the row-derived vectors to each
 *      section's vector list.
 *
 * The function does not own logging. Pass an `onSection` callback to receive
 * per-section diagnostics; otherwise nothing is printed.
 *
 * @async
 * @function generateKnowledgeBase
 * @param {string} data    - Source text (typically the contents of a `.md` file).
 * @param {string} prompt  - Pre-loaded prompt string for the LLM call.
 * @param {object} options
 * @param {(fn: () => Promise<any>) => Promise<any>} options.limit
 *   Concurrency limiter from `makeLimit`. Used to gate every LLM call so
 *   that fan-out across files shares a single rate-limit pool.
 * @param {(i: number, info: {
 *   wordCount: number,
 *   bucket:    "short"|"medium"|"long",
 *   bodyVecs:  number,
 *   range:     [number, number]
 * }) => void} [options.onSection]
 *   Optional callback fired once per section with diagnostic info. Useful
 *   for build-time logging without coupling this module to a logger.
 * @param {(i: number, err: any) => void} [options.onSectionError]
 *   Optional callback fired when an LLM call for a section fails or its
 *   response cannot be parsed.
 *
 * @returns {Promise<Array<{ range: [number, number], vectors: Float32Array[] }>>}
 *   Resolved section records, with all body and row-derived vectors awaited
 *   and packed into the order expected by {@link Document.fromSpec}.
 */
const generateKnowledgeBase = async (data, prompt, { limit, onSection, onSectionError } = {}) => {
  if (!data) throw Error("generateKnowledgeBase: missing input data");
  if (!prompt) throw Error("generateKnowledgeBase: missing prompt");
  if (typeof limit !== "function") {
    throw Error("generateKnowledgeBase: a concurrency `limit` function is required");
  }

  const sections = segmentTextSections(data).contentSections();

  const output = [];
  const responsePromises = [];

  for (let i = 0, l = sections.length, section; i !== l; ++i) {
    section = sections[i];
    const range = [
      section.paragraph > 0 ? section.start : (section.header?.[0] ?? section.start),
      section.end,
    ];
    const ancestors = (section.ancestors || []).map(h => h.extractTitle(data));
    const header = (section.header && section.header.extractTitle(data)) || "";
    const sentences = section.content;
    const content = sentences.extract(data);

    const vecPromises = [];
    const breadcrumbs = [...ancestors, header].filter(Boolean);
    const h = breadcrumbs.join(", ");
    h && vecPromises.push(vectorize(h));

    // Body vectorization.
    const sentenceTexts = sentences.map(s => s.extract(data));
    const contentWords  = wordCount(content);
    const bucket        = bucketFor(contentWords);
    const vecsBefore    = vecPromises.length;

    pushBodyVectors(vecPromises, content, sentenceTexts, bucket);

    const bodyVecs = vecPromises.length - vecsBefore;
    onSection && onSection(i, { wordCount: contentWords, bucket, bodyVecs, range });

    // LLM row generation.
    const hh = breadcrumbs.join(" > ");
    const userMessage = `${hh && "section header breadcrumbs: " + hh + "\n\nsection content:\n" || ""}${content}`;
    responsePromises.push(limit(() => llm.run(prompt, userMessage)));

    output.push({ range, vectors: vecPromises });
  }

  // Wait for all LLM calls; tolerate per-section failures.
  const settled = await Promise.allSettled(responsePromises);

  for (let i = 0, l = settled.length, result; i !== l; ++i) {
    result = settled[i];

    if (result.status === "rejected") {
      onSectionError && onSectionError(i, result.reason);
      continue;
    }

    const response = result.value;
    try {
      const rows = response.output.json();
      if (!Array.isArray(rows)) {
        onSectionError && onSectionError(i, new Error("LLM response is not a JSON array"));
        continue;
      }

      for (let r = 0, m = rows.length; r !== m; ++r) {
        const row = rows[r];
        if (!row || typeof row.question !== "string" || !row.question) {
          // Per-row skip; not surfaced as a section-level error.
          continue;
        }
        const { question, anchors, variants } = row;
        output[i].vectors.push(vectorize(question));
        output[i].vectors.push(...(anchors  || []).map(x => vectorize(x)));
        output[i].vectors.push(...(variants || []).map(x => vectorize(x)));
      }
    } catch (err) {
      onSectionError && onSectionError(i, err);
    }
  }

  // Await all vector promises so the caller gets resolved Float32Array values.
  for (let i = 0, l = output.length; i !== l; ++i) {
    output[i].vectors = await Promise.all(output[i].vectors);
  }

  return output;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(generateKnowledgeBase, "generateKnowledgeBase", {
  value: generateKnowledgeBase,
}));
