"use strict";

const parseResponseJson      = require("../../utilities/parseResponseJson");
const SectionResolver        = require("./SectionResolver");
const unionHits              = require("./unionHits");
const validateLLMResponse    = require("./validateLLMResponse");
const search                 = require("../../VectorStore/search");
const Stats                  = require("../../Stats");
const serializeQueryContext  = require("../../xenova/serializeQueryContext");
const { MAX_OUTPUT_ROWS }    = require("../../VectorStore/constants");

/**
 * @file index.js
 * @module actions/query
 * @description End-to-end query handler. Takes a raw user query plus its
 * dependencies (store, analyzer, resolver, LLM runner, prompt) and returns
 * a structured response with synthesized answer + citations + follow-ups.
 *
 * Dependencies are injected via the options object — no module-level imports
 * of the LLM runner. This keeps the orchestrator testable with a mock LLM
 * and lets the smoke test wire the real `runLLM` from `llms/claude` at the
 * smoke test's own discretion.
 *
 * ## Three execution paths
 *
 * After the analyzer runs, the orchestrator chooses one of three paths:
 *
 *   **Path 1 — Pure greeting fast path:** `segments.length === 0 && greeting`.
 *   The user said "hi" with no question attached. No LLM call. The
 *   orchestrator returns a templated greeting (picked from the internal
 *   `TEMPLATES` map based on the corrected query text, or from the
 *   caller-supplied `greetingTemplate` option if provided). Zero cost,
 *   sub-millisecond latency.
 *
 *   **Path 2 — Conversational LLM path:** `segments.length === 0 && !greeting`.
 *   The user said something off-topic without a greeting (e.g. "what's the
 *   weather"). Rare. The LLM is called with empty results; the answer
 *   prompt's conversational branch handles it.
 *
 *   **Path 3 — Synthesis LLM path:** `segments.length > 0`. The normal case.
 *   Each segment is searched against the store, hits are unioned, sections
 *   are resolved into text, the prompt context is serialized, and the LLM
 *   is called to synthesize an answer with citations.
 *
 * Paths 2 and 3 share the same LLM call code — the only difference is
 * whether `results` is empty. The merged answer prompt knows to handle
 * both cases.
 *
 * ## Retry on validator failure
 *
 * The LLM occasionally produces malformed JSON or wrong-shape output.
 * The orchestrator retries up to `maxRetries` times (default 2, so 3
 * total attempts). On final failure, the orchestrator throws by default —
 * surfaces problems loudly during development and smoke testing. Callers
 * who need graceful fallback can pass a `fallbackAnswer` string; on
 * exhaustion the orchestrator returns a response with that text instead.
 *
 * ## Greeting cross-verification
 *
 * Path 1 (templated greeting) does NOT cross-verify the GREETING flag
 * against the query text. The analyzer's greeting peel is conservative
 * enough that misfires are rare; if it fires AND segmentation produced
 * zero technical/support segments, we trust the combined signal. Path 3
 * does send the corrected query text to the LLM, where the prompt's
 * Step 1 cross-verification kicks in.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Greeting templates — internal defaults for Path 1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default greeting reply text, keyed by greeting type. Used by Path 1
 * (the pure-greeting fast path) when the caller does not supply a
 * `greetingTemplate` option.
 *
 * Adding more keys is safe — `TEMPLATE_RULES` is what maps query text
 * to a key; adding a key without a matching rule means it's unreachable
 * by default but available via `greetingTemplate` if someone wants to
 * pre-pick it for their deployment. Removing keys is breaking — any
 * existing rule pointing at a removed key would fall through to
 * `default`.
 *
 * @type {Record<string, string>}
 */
const TEMPLATES = Object.freeze({
  default:    "Hello! I'm here to help with water treatment questions — cooling towers, biocide programs, Legionella, system chemistry, and related topics. What's on your mind?",
  thanks:     "You're welcome! Let me know if you have other water treatment questions.",
  morning:    "Good morning! What can I help you with today?",
  afternoon:  "Good afternoon! What's on your mind?",
  evening:    "Good evening! How can I help?",
});

/**
 * Ordered list of regex → template-key rules. Walked top to bottom; first
 * match wins. The final entry catches everything else.
 *
 * Order matters: more specific patterns (e.g. "good morning") must come
 * before more generic ones (e.g. any "good" prefix).
 *
 * @type {Array<[RegExp, string]>}
 */
const TEMPLATE_RULES = Object.freeze([
  [/\b(thanks|thank\s+you|thx|ty)\b/i,                  "thanks"],
  [/\bgood\s+(morning|day)\b/i,                          "morning"],
  [/\bgood\s+afternoon\b/i,                              "afternoon"],
  [/\bgood\s+evening\b/i,                                "evening"],
  [/./,                                                  "default"],
]);

/**
 * Pick a templated greeting reply based on the query text. Walks
 * {@link TEMPLATE_RULES} in order and returns the matching template
 * from {@link TEMPLATES}, defaulting to `TEMPLATES.default`.
 *
 * @param {string} correctedQuery - The analyzer's `corrected` field
 *   (spell-fixed, greeting still attached) — same text the LLM would
 *   see on the synthesis path.
 * @returns {string}
 */
const pickGreetingTemplate = (correctedQuery) => {
  for (const [pattern, key] of TEMPLATE_RULES) {
    if (pattern.test(correctedQuery)) {
      return TEMPLATES[key] || TEMPLATES.default;
    }
  }
  return TEMPLATES.default;
};

// ─────────────────────────────────────────────────────────────────────────────
// Result enrichment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Take a flat union of hits and enrich each with `sectionText` resolved
 * via the section resolver. Hits whose section can't be resolved
 * (missing doc, range overshoot) are dropped — the resolver has
 * already logged a warning, so silent dropping is fine here.
 *
 * @param {Array<{score, documentId, range}>} hits
 * @param {SectionResolver} resolver
 * @returns {Array<{score, documentId, range, sectionText}>}
 */
const enrichWithSectionText = (hits, resolver) => {
  const enriched = [];
  for (const hit of hits) {
    const sectionText = resolver.resolve(hit.documentId, hit.range);
    if (sectionText === null) continue;
    enriched.push({ ...hit, sectionText });
  }
  return enriched;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default fallback response builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal response object using the analyzer's metadata and a
 * single text chunk. Used in two places:
 *   - Path 1 (templated greeting)
 *   - Final fallback when all LLM retries are exhausted AND a
 *     `fallbackAnswer` was provided by the caller
 *
 * @param {object} analysis - Analyzer output.
 * @param {string} rawQuery - Original user input (echoed in `query`).
 * @param {string} text - The single-chunk answer text.
 * @param {Stats} [stats] - Optional Stats accumulator; defaults to empty.
 * @returns {object} Response in the standard shape.
 */
const buildSimpleResponse = (analysis, rawQuery, text, stats) => ({
  query:             rawQuery,
  corrected:         analysis.corrected,
  greeting:          analysis.greeting,
  frustration:       analysis.frustration,
  user_intent:       serializeQueryContext.buildIntents(analysis),
  answer:            [{ text }],
  followUpQuestions: [],
  stats:             stats || new Stats(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Main: run
// ─────────────────────────────────────────────────────────────────────────────

/**
 * End-to-end query handler.
 *
 * @async
 * @function run
 * @param {object} options
 * @param {string}   options.rawQuery       - User input as typed.
 * @param {object}   options.store          - Loaded VectorStore.
 * @param {Function} options.analyzeQuery   - Configured analyzer
 *   (output of `buildAnalyzeQuery({...})`). Called as `await analyzeQuery(raw)`.
 * @param {SectionResolver} options.resolver - Section text resolver.
 * @param {Function} options.runLLM         - LLM call function with
 *   signature `(config, prompt) => Promise<response>` matching
 *   `src/claude/run.js`. The system prompt is merged into
 *   `config.system` by this action before calling runLLM.
 *   The orchestrator does NOT import an LLM module itself — callers wire
 *   the actual implementation (e.g. `require("../../llms/claude")`).
 * @param {object}   options.prompts        - Loaded prompt strings.
 * @param {string}   options.prompts.answer - The answer.ppl content.
 * @param {object}   options.llmConfig      - Config object passed to runLLM.
 *
 * @param {string} [options.greetingTemplate] - Optional override for the
 *   Path 1 templated greeting. When undefined, the orchestrator picks
 *   from {@link TEMPLATES} by matching the corrected query against
 *   {@link TEMPLATE_RULES}.
 * @param {number} [options.maxRetries=2]   - Retry budget on validator
 *   failure. The orchestrator tries 1 + maxRetries times (default: 3
 *   total LLM calls).
 * @param {number} [options.maxOutputRows]  - Cap on results passed to
 *   the LLM. Default: {@link MAX_OUTPUT_ROWS} from VectorStore constants.
 * @param {string} [options.fallbackAnswer] - If provided, returned as
 *   a single-chunk answer when LLM retries are exhausted. If absent,
 *   the orchestrator throws on retry exhaustion (default behavior —
 *   loud failures during development).
 *
 * @returns {Promise<{
 *   query: string,
 *   corrected: string,
 *   greeting: boolean,
 *   frustration: object,
 *   user_intent: string[],
 *   answer: Array<{text: string, source?: {documentId: string, range: [number, number]}}>,
 *   followUpQuestions: string[],
 * }>}
 */
const run = async ({
  rawQuery,
  store,
  analyzeQuery,
  resolver,
  runLLM,
  prompts,
  llmConfig,
  greetingTemplate,
  maxRetries = 2,
  maxOutputRows = MAX_OUTPUT_ROWS,
  fallbackAnswer,
}) => {
  // Run the analyzer. This handles: trim, frustration detection, spell
  // correction (if a SpellEngine was passed when building analyzeQuery),
  // greeting peel, segmentation, per-segment classification + embedding.
  const analysis = await analyzeQuery(rawQuery);

  // Per-call stats accumulator. Every LLM call below pushes its
  // Response.stats onto this collection. We attach it to every return
  // path so callers can persist cost/duration/tokens without wrapping
  // runLLM themselves.
  const stats = new Stats();

  // ── Path 1: Pure greeting fast path ──────────────────────────────────────
  //
  // No segments AND greeting was peeled. Nothing to search, nothing to
  // synthesize. Return a templated reply and skip the LLM entirely.
  //
  // We deliberately don't cross-verify the GREETING flag here against
  // the query text — the analyzer's greeting peel is conservative, and
  // the conjunction "segments.length === 0 && greeting" is strong
  // evidence the user just said hello.
  if (analysis.segments.length === 0 && analysis.greeting) {
    const text = greetingTemplate || pickGreetingTemplate(analysis.corrected || analysis.query || rawQuery);
    return buildSimpleResponse(analysis, rawQuery, text, stats);
  }

  // ── Search per segment, union results ────────────────────────────────────
  //
  // For Path 2 (segments.length === 0 && !greeting), there's nothing to
  // search — `unionedHits` will be empty. The LLM handles the empty case
  // via the answer prompt's conversational branch.
  //
  // For Path 3, each segment retrieves its own hits; we union them into
  // one ranked deduplicated list.
  const perSegmentHits = await Promise.all(
    analysis.segments.map(seg => search(store, seg.vec))
  );
  const unionedHits = unionHits(perSegmentHits);

  // Resolve section text and cap at maxOutputRows. The LLM's input is
  // bounded so context windows stay predictable across single-segment
  // and multi-segment queries.
  const enriched = enrichWithSectionText(unionedHits, resolver);
  const results = enriched.slice(0, maxOutputRows);

  // ── LLM call with retry loop ─────────────────────────────────────────────
  //
  // We serialize the prompt context once and reuse it across retries
  // (the input doesn't change between attempts). Each retry pays the
  // LLM cost again — no exponential backoff or anything fancy; retries
  // happen quickly.
  const context = serializeQueryContext(analysis, results);

  // System prompt → config.system. claude/run.js takes (config, prompt)
  // where prompt is the user message; the system prompt lives in config.
  const callConfig = { ...llmConfig, system: prompts.answer };

  let llmOutput = null;
  let validatorResult = { valid: false, errors: ["no attempt made"] };
  const totalAttempts = 1 + maxRetries;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    let raw;
    try {
      raw = await runLLM(callConfig, context);
    } catch (err) {
      // Network/transport failure. Retry with the same input.
      validatorResult = { valid: false, errors: [`runLLM threw: ${err.message}`] };
      continue;
    }

    // Capture per-call stats. Stats.normalize is tolerant of any shape:
    // string, Response envelope, pre-parsed object, or response without
    // stats — so this works regardless of what runLLM happened to return.
    raw?.stats && stats.push(...Stats.normalize(raw));

    // The LLM response envelope shape is caller-dependent. We expect
    // either a parsed JSON object directly or something with a `.content`
    // accessor — the smoke test will use whatever shape `runLLM` returns.
    // Here we accept the raw response and let the validator decide.
    llmOutput = parseResponseJson(raw);
    validatorResult = validateLLMResponse(llmOutput);
    if (validatorResult.valid) break;
  }

  // ── Validator failure exhausts ──────────────────────────────────────────
  //
  // If the LLM produced bad output on every attempt, either throw
  // (default) or return the fallback if one was provided.
  if (!validatorResult.valid) {
    if (typeof fallbackAnswer === "string" && fallbackAnswer.length > 0) {
      return buildSimpleResponse(analysis, rawQuery, fallbackAnswer, stats);
    }
    const err = new Error(
      `run: LLM output failed validation after ${totalAttempts} attempts: ${validatorResult.errors.join("; ")}`
    );
    err.attempts = totalAttempts;
    err.errors = validatorResult.errors;
    err.lastOutput = llmOutput;
    err.stats = stats;   // ← also attach to the thrown error so the caller can read partial stats
    throw err;
  }

  // ── Success: assemble the final response ─────────────────────────────────
  //
  // The LLM contributes `answer` and `followUpQuestions`. The orchestrator
  // contributes the analyzer metadata so the client sees a unified
  // response regardless of path.
  return {
    query:             rawQuery,
    corrected:         analysis.corrected,
    greeting:          analysis.greeting,
    frustration:       analysis.frustration,
    user_intent:       serializeQueryContext.buildIntents(analysis),
    answer:            llmOutput.answer,
    followUpQuestions: llmOutput.followUpQuestions,
    stats,
  };
};

// Helper exports for tests and adjacent code.
run.TEMPLATES               = TEMPLATES;
run.TEMPLATE_RULES          = TEMPLATE_RULES;
run.pickGreetingTemplate    = pickGreetingTemplate;
run.enrichWithSectionText   = enrichWithSectionText;
run.buildSimpleResponse     = buildSimpleResponse;

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(run, "run", {
  value: run,
}));