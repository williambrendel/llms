"use strict";

const embedQuery                  = require("../embedQuery");
const isMultiPart                 = require("./isMultiPart");
const greedySplit                 = require("./greedySplit");
const buildClassifier             = require("./buildClassifier");
const detectFrustration           = require("./detectFrustration");
const peelGreeting                = require("./peelGreeting");
const collapseRepeatedPunctuation = require("./collapseRepeatedPunctuation");

/**
 * @file index.js
 * @module xenova/buildAnalyzeQuery
 * @description Factory that builds a query analyzer composing
 * frustration detection, greeting peel, multi-part detection,
 * greedy splitting, and per-segment classification.
 *
 * The analyzer is the entry point a dispatcher uses to decide how a
 * query should be routed AND how to phrase the response. It produces:
 *
 *   - A cleaned query string (whatever remains after greeting peel
 *     and punctuation normalization). Downstream consumers can use
 *     this instead of reconstructing it from segments.
 *   - A frustration object describing emotional state markers in the
 *     raw input (ALL CAPS, repeated punctuation, urgency keywords,
 *     profanity). The LLM prompt can use this to adjust tone.
 *   - A boolean `greeting` flag, true when the input contained any
 *     standalone greeting clause. The LLM prompt uses this to greet
 *     back when appropriate.
 *   - Segment classifications for each piece of the cleaned query,
 *     or an empty `segments` array when the input was greeting-only.
 *
 * Pipeline order:
 *
 *   1. Trim raw input.
 *   2. `detectFrustration` on the raw (trimmed) input. MUST run
 *      before collapseRepeatedPunctuation, because the repeated-
 *      punctuation signal is destroyed by collapse.
 *   3. `collapseRepeatedPunctuation` — normalize "!!!" → "!" etc.
 *   4. `peelGreeting` — strip standalone greetings, return cleaned
 *      query and greeting flag.
 *   5. If cleaned query is empty (greeting-only input), return early
 *      with `segments: []`.
 *   6. `isMultiPart` on cleaned query.
 *   7. `greedySplit` if multi-part, else single-segment fast path.
 *   8. Classify each segment.
 *
 * Cost model:
 *   - Steps 1-5 are pure-regex, microsecond-fast.
 *   - Step 6 is pure-regex.
 *   - Step 7 is pure-regex.
 *   - Step 8 invokes the classifier per segment. Each BGE
 *     classification is ~5-30ms warm; NLI fallback adds ~100-300ms
 *     when triggered.
 *   - Greeting-only inputs cost essentially nothing past step 5.
 *
 * The factory is async (builds the classifier at boot, which embeds
 * anchors). The returned analyzer is async per call (may embed
 * segments or run NLI). Call the factory once at server boot and
 * cache the result.
 */

/**
 * Build a query analyzer.
 *
 * @async
 * @function buildAnalyzeQuery
 *
 * @param {object} [options]
 *   Pass-through configuration for the underlying classifier. See
 *   {@link buildClassifier} for the full schema. Common cases:
 *   - No args → no TECHNICAL anchors (Mode 2 / open-world classifier).
 *     The analyzer routes by absence: a query is TECHNICAL unless it
 *     clearly matches SUPPORT or CONVERSATIONAL.
 *   - `{ classes: { TECHNICAL: { anchors: [...] } } }` → Mode 1 with
 *     caller-supplied domain anchors. Sharper classification.
 *
 * @returns {Promise<(queryString: string, queryVec?: Float32Array) => Promise<{
 *   query:         string,
 *   greeting:      boolean,
 *   frustration:   {
 *     score:               number,
 *     shouting:            boolean,
 *     allCaps:             boolean,
 *     repeatedPunctCount:  number,
 *     urgentKeywords:      string[],
 *     profanity:           boolean
 *   },
 *   multiPart:     boolean,
 *   splitOk:       boolean,
 *   needsLLMSplit: boolean,
 *   segments: Array<{
 *     text:           string,
 *     vec:            Float32Array,
 *     classification: { label, confidence, scores, lowConfidence, usedNli }
 *   }>
 * }>>}
 *   Async analyzer closure. Inputs:
 *   - `queryString` — required. The spellchecked user query.
 *   - `queryVec` — optional. The query's embedding (caller's
 *     dispatcher pre-embeds it once for both classification and
 *     downstream retrieval). When omitted, the analyzer embeds the
 *     cleaned query itself. NOTE: queryVec is only reused when the
 *     cleaned query equals the raw query (no collapse, no greeting
 *     peel happened). Otherwise the analyzer freshly embeds the
 *     cleaned form, since the pre-computed embedding is for the
 *     wrong string.
 *
 *   Output:
 *   - `query` — the cleaned query (post-collapse, post-greeting-strip).
 *     Empty string when the input was greeting-only.
 *   - `greeting` — true when the input contained any standalone
 *     greeting clause that was peeled.
 *   - `frustration` — emotion-marker analysis on the raw input.
 *   - `multiPart` — true if {@link isMultiPart} fired on the cleaned
 *     query. False when the cleaned query is empty.
 *   - `splitOk` — true if {@link greedySplit} produced >1 segment.
 *   - `needsLLMSplit` — true when `multiPart && !splitOk`, signaling
 *     to the dispatcher that the greedy regex couldn't find
 *     boundaries the isMultiPart heuristic insists are there.
 *   - `segments` — Array of classified segments. EMPTY when the
 *     input was greeting-only (`greeting: true` and `query: ""`).
 *     The dispatcher uses `segments.length === 0` plus the flags to
 *     detect this case and respond with a pure-greeting reply.
 */
const buildAnalyzeQuery = async (options) => {
  const classify = await buildClassifier(options);

  const analyzeQuery = async (queryString, queryVec) => {
    // ── Step 1: trim raw input ───────────────────────────────────────────
    const raw = (queryString || "").trim();

    // ── Step 2: detect frustration on RAW input ──────────────────────────
    // The repeated-punctuation signal depends on the original "!!!" /
    // "???" runs; collapsing first would destroy it. Other signals
    // (caps ratio, keyword presence) are unaffected by collapse, but
    // running everything on the same input keeps the analysis
    // coherent.
    const frustration = detectFrustration(raw);

    // ── Step 3: normalize repeated punctuation ───────────────────────────
    // "!!!" → "!", "???" → "?", "?!?!" → "?". Same-character and
    // cross-character terminal-punct runs both collapse. Non-terminal
    // punctuation (`,.;:`) only collapses adjacent same-char runs to
    // preserve structures like "e.g." and decimals.
    const collapsed = collapseRepeatedPunctuation(raw);

    // ── Step 4: peel greetings from anywhere in the query ────────────────
    // Returns the cleaned query AND a flag. "hello, what is pH?"
    // becomes "what is pH?" with greeting=true. "thanks for the
    // info" stays untouched (no peel — "thanks" is followed by
    // content, not standalone).
    const { greeting, query: cleaned } = peelGreeting(collapsed);

    // ── Step 5: greeting-only fast path ──────────────────────────────────
    // When the cleaned query is empty, there's no content to
    // classify. Return the flags and an empty segments array. The
    // dispatcher detects this case via `segments.length === 0 &&
    // greeting === true` and responds with a pure-greeting reply
    // (probably without any RAG retrieval).
    if (!cleaned) {
      return {
        query:         "",
        greeting,
        frustration,
        multiPart:     false,
        splitOk:       false,
        needsLLMSplit: false,
        segments:      [],
      };
    }

    // ── Step 6: single-intent fast path ──────────────────────────────────
    // No multi-part signal → classify the cleaned query as one
    // segment. Reuse the caller's queryVec if provided AND if the
    // cleaned query matches the raw query exactly (no collapse, no
    // greeting peel happened) — otherwise the pre-computed embedding
    // is for the wrong string.
    if (!isMultiPart(cleaned)) {
      const canReuse = queryVec && cleaned === raw;
      const vec = canReuse ? queryVec : await embedQuery(cleaned);
      const classification = await classify(vec, cleaned);
      return {
        query:         cleaned,
        greeting,
        frustration,
        multiPart:     false,
        splitOk:       false,
        needsLLMSplit: false,
        segments:      [{ text: cleaned, vec, classification }],
      };
    }

    // ── Step 7: multi-part path — try greedy split ───────────────────────
    const pieces = greedySplit(cleaned);

    // Greedy failed: isMultiPart said true but the regex couldn't
    // find boundaries. Classify the whole cleaned query as a single
    // segment and flag the caller to consider escalation. We still
    // classify so the dispatcher has a usable label even if it
    // doesn't escalate to an LLM splitter.
    if (pieces.length === 1) {
      const canReuse = queryVec && cleaned === raw;
      const vec = canReuse ? queryVec : await embedQuery(cleaned);
      const classification = await classify(vec, cleaned);
      return {
        query:         cleaned,
        greeting,
        frustration,
        multiPart:     true,
        splitOk:       false,
        needsLLMSplit: true,
        segments:      [{ text: cleaned, vec, classification }],
      };
    }

    // Greedy succeeded: embed and classify each piece independently.
    // Pieces are different strings, so each needs its own embedding —
    // the caller's queryVec is no longer relevant once we've split.
    // Run in parallel; the embed step queues internally in Xenova.
    const segments = await Promise.all(pieces.map(async (text) => {
      const vec = await embedQuery(text);
      const classification = await classify(vec, text);
      return { text, vec, classification };
    }));

    return {
      query:         cleaned,
      greeting,
      frustration,
      multiPart:     true,
      splitOk:       true,
      needsLLMSplit: false,
      segments,
    };
  };

  return analyzeQuery;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(buildAnalyzeQuery, "buildAnalyzeQuery", {
  value: buildAnalyzeQuery,
}));