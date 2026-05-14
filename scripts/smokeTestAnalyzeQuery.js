"use strict";

/**
 * @file scripts/smokeTestAnalyzeQuery.js
 * @brief Comprehensive end-to-end check for the `analyzeQuery`
 * orchestrator against real BGE + NLI models. Standalone Node script,
 * not a Jest test.
 *
 * What's new vs the previous version:
 *
 *   - The orchestrator now returns a top-level `query` (cleaned),
 *     `greeting` flag, and `frustration` object alongside the
 *     existing `multiPart`, `splitOk`, `needsLLMSplit`, `segments`.
 *   - Sections 14 (greeting-only) and 15 (greeting + content) test
 *     the new greeting peel.
 *   - Section 16 tests the frustration detector with various
 *     emotional intensities.
 *   - Display format extended to show greeting and frustration score
 *     on every line.
 *
 * Sections:
 *
 *    1. Single-intent fast path
 *    2. Multi-part, consistent labels
 *    3. Multi-part, mixed labels
 *    4. Three-or-more part queries
 *    5. Splitter traps (must NOT split)
 *    6. Punctuation and casing chaos
 *    7. Whitespace abuse
 *    8. Adversarial classifier traps
 *    9. Negation and hostility
 *   10. Very long queries
 *   11. Edge inputs (structure only)
 *   12. Split-failure probes (observational)
 *   13. Real-user noise (observational)
 *   14. Greeting-only inputs (NEW)
 *   15. Greetings combined with content (NEW)
 *   16. Frustration signals (NEW)
 *
 * Usage:
 *
 *   node scripts/smokeTestAnalyzeQuery.js
 *
 * Exit codes: 0 on all-pass, 1 on any graded failure, 2 on crash.
 */

const buildAnalyzeQuery = require("../src/xenova/buildAnalyzeQuery");

// ─────────────────────────────────────────────────────────────────────────────
// Type aliases for cases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} StructureCase
 * @property {string}   query
 * @property {boolean}  expectedMultiPart
 * @property {boolean}  expectedSplitOk
 * @property {boolean}  expectedNeedsLLMSplit
 * @property {number}   expectedSegmentCount
 */

/**
 * @typedef {StructureCase} LabelsCase
 * @property {string[]} expectedLabels  Class labels in segment order.
 */

/**
 * Greeting/frustration-specific cases. Asserts the new top-level
 * fields without necessarily pinning segments or labels.
 *
 * @typedef {object} FlagsCase
 * @property {string}   query
 * @property {boolean}  [expectedGreeting]
 * @property {string}   [expectedCleanedQuery]
 * @property {number}   [minFrustrationScore]  Lower bound (inclusive).
 * @property {number}   [maxFrustrationScore]  Upper bound (inclusive).
 * @property {boolean}  [expectedShouting]
 * @property {number}   [expectedSegmentCount]
 */

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Single-intent (fast path)
// ─────────────────────────────────────────────────────────────────────────────

const SINGLE_INTENT_CASES = [
  { query: "hello",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 0,  // greeting-only → empty segments
    expectedLabels: undefined,
    expectedGreeting: true,
    expectedCleanedQuery: "" },
  { query: "what causes biofilm formation",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  { query: "I need to talk to a person",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
  { query: "what is the pH of chlorinated water",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Multi-part, consistent labels
// ─────────────────────────────────────────────────────────────────────────────

const SAME_LABEL_MULTIPART_CASES = [
  // Note: greeting is now peeled, so "hello! good morning!" becomes
  // an empty query with greeting flag — not 2 CONVERSATIONAL segments
  // anymore. Replace with a non-greeting case.
  { query: "is it a long process? does it require special tools?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2, expectedLabels: ["TECHNICAL", "TECHNICAL"] },
  { query: "what is pH? what is alkalinity?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2, expectedLabels: ["TECHNICAL", "TECHNICAL"] },
  { query: "can I talk to someone? can you call me back?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2, expectedLabels: ["SUPPORT", "SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Multi-part, mixed labels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "Mixed labels" used to mean CONVERSATIONAL + TECHNICAL or similar.
 * Now that greetings are peeled away (and CONVERSATIONAL segments are
 * usually greetings), the remaining mixed-label cases are
 * TECHNICAL + SUPPORT.
 */
const MIXED_LABEL_MULTIPART_CASES = [
  { query: "what's the pH? and can you call me back?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2, expectedLabels: ["TECHNICAL", "SUPPORT"] },
  { query: "how do I prevent scale? can someone call me?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2, expectedLabels: ["TECHNICAL", "SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Three-or-more part queries
// ─────────────────────────────────────────────────────────────────────────────

const THREE_OR_MORE_PART_CASES = [
  // Three technical questions chained.
  { query: "what is pH? what is alkalinity? what is chlorine?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 3,
    expectedLabels: ["TECHNICAL", "TECHNICAL", "TECHNICAL"] },
  // Greeting + 2 technical (greeting peeled, so 2 segments + greeting:true)
  { query: "hi! what is pH? what is alkalinity?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2,
    expectedLabels: ["TECHNICAL", "TECHNICAL"],
    expectedGreeting: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Splitter traps (must NOT split)
// ─────────────────────────────────────────────────────────────────────────────

const SPLITTER_TRAP_CASES = [
  { query: "tell me about L. pneumophila",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
  { query: "contact Dr. Smith for the pH report",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
  { query: "the pH is 7.2 and trending down",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
  { query: "keep pH between 7.2 and 7.8 for optimal sanitization",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
  { query: "use a sanitizer e.g. chlorine or bromine",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
  { query: "what does ppm mean for chlorine dosing",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Punctuation and casing chaos
// ─────────────────────────────────────────────────────────────────────────────

const CHAOS_CASES = [
  { query: "WHAT CAUSES BIOFILM",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  { query: "what causes biofilm",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  // After punctuation collapse: "what is pH?" (3 → 1 ?)
  { query: "what is pH???",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  // After collapse + greeting peel: "" with greeting:true
  { query: "thanks!!!",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 0,
    expectedGreeting: true,
    expectedCleanedQuery: "" },
  // ALL CAPS scream that isn't a peeled greeting
  { query: "HEY can someone HELP me",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Whitespace abuse
// ─────────────────────────────────────────────────────────────────────────────

const WHITESPACE_CASES = [
  // After greeting peel: "" with greeting:true
  { query: "    hello",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 0,
    expectedGreeting: true,
    expectedCleanedQuery: "" },
  { query: "what causes biofilm   ",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  { query: "what  causes  biofilm",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — Adversarial classifier traps
// ─────────────────────────────────────────────────────────────────────────────

const ADVERSARIAL_CASES = [
  // Praise containing technical vocab — single segment.
  // "thanks for explaining biofilm so clearly" has no peel (continuation).
  { query: "thanks for explaining biofilm so clearly",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["CONVERSATIONAL"] },
  // Praise + question — greeting peeled, 1 segment for the question.
  { query: "you're so helpful! anyway, what causes biofilm?",
    expectedMultiPart: true, expectedSplitOk: true, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 2,
    expectedLabels: ["CONVERSATIONAL", "TECHNICAL"] },
  // Contact-info request mentioning technical noun
  { query: "can someone in the pH testing lab call me",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
  // Operational SUPPORT query.
  { query: "where is the biofilm strategy meeting being held",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 9 — Negation and hostility
// ─────────────────────────────────────────────────────────────────────────────

const ATTITUDE_CASES = [
  { query: "this system is broken, I need help",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
  { query: "this damn system is not working can someone help",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
  { query: "I don't want to talk to a person",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 10 — Very long queries
// ─────────────────────────────────────────────────────────────────────────────

const LONG_QUERY_CASES = [
  { query: "I've been running my cooling tower for about three years now and recently I've noticed that the pH has been creeping up consistently every week despite my best efforts to keep it stable through regular dosing and I'm wondering whether this could be related to the biofilm I keep finding in the basin or whether there's a deeper chemistry issue at play that I should investigate",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["TECHNICAL"] },
  { query: "I have been trying to reach someone in your customer service department for the past week without any luck and I really need to speak with a person about my account because there is an urgent issue that requires human attention and I cannot resolve it through the automated system",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1, expectedLabels: ["SUPPORT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 11 — Edge inputs (structure only)
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_INPUT_CASES = [
  { query: "",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 0 },
  { query: "   ",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 0 },
  { query: "pH",
    expectedMultiPart: false, expectedSplitOk: false, expectedNeedsLLMSplit: false,
    expectedSegmentCount: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 12 — Split-failure probes (observational)
// ─────────────────────────────────────────────────────────────────────────────

const SPLIT_FAILURE_PROBES = [
  { query: "I have biofilm and corrosion" },
  { query: "the pH is high also the alkalinity needs work" },
  { query: "scale and biofilm prevention strategies" },
  { query: "fix my pH issues moreover the chlorine levels are off" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 13 — Real-user noise (observational)
// ─────────────────────────────────────────────────────────────────────────────

const REAL_USER_NOISE = [
  { query: "thx", why: "Abbreviation — likely CONVERSATIONAL." },
  { query: "pls help asap",                why: "Abbreviated SUPPORT request." },
  { query: "u guys open",                  why: "Informal SUPPORT inquiry." },
  { query: "what causes biofilim",         why: "Misspelled biofilm." },
  { query: "Legionela",                    why: "Misspelled Legionella." },
  { query: "?",                            why: "Pure punctuation." },
  { query: "ok",                           why: "Acknowledgement." },
  { query: "lol so what's the deal with biofilm", why: "Mixed register." },
  { query: "set pH=7.2 in config",         why: "Tech-string format." },
  { query: "is this thing on",             why: "Frustrated check." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 14 — Greeting-only inputs (NEW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs that are nothing but a greeting. Expected behavior:
 *   - `greeting: true`
 *   - `query: ""` (cleaned form)
 *   - `segments: []` (no content to classify)
 *
 * Dispatcher should detect this via `segments.length === 0 &&
 * greeting === true` and respond with a pure-greeting reply.
 *
 * @type {FlagsCase[]}
 */
const GREETING_ONLY_CASES = [
  { query: "hello",          expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "hi",             expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "hey",            expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "good morning",   expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "good afternoon", expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "thanks",         expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "thank you",      expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "hello!",         expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
  { query: "hello!!!",       expectedGreeting: true, expectedCleanedQuery: "", expectedSegmentCount: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 15 — Greetings combined with content (NEW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs where a greeting is combined with a real intent. After
 * the peel, the segments contain ONLY the cleaned content, and
 * `greeting: true` tells the dispatcher to also greet back.
 *
 * @type {FlagsCase[]}
 */
const GREETING_AND_CONTENT_CASES = [
  // Leading greeting + technical question.
  { query: "hello, what is pH?",
    expectedGreeting: true, expectedCleanedQuery: "what is pH?",
    expectedSegmentCount: 1 },
  // Leading greeting + SUPPORT question.
  { query: "hi, can someone call me back?",
    expectedGreeting: true, expectedCleanedQuery: "can someone call me back?",
    expectedSegmentCount: 1 },
  // Trailing greeting (politeness sign-off).
  { query: "what causes biofilm? thanks!",
    expectedGreeting: true, expectedCleanedQuery: "what causes biofilm?",
    expectedSegmentCount: 1 },
  // Both leading AND trailing greetings.
  { query: "hi! what causes biofilm? thanks!",
    expectedGreeting: true, expectedCleanedQuery: "what causes biofilm?",
    expectedSegmentCount: 1 },
  // Greeting + multi-part content (3 → 2 segments after peel).
  { query: "hello! what is pH? what is alkalinity?",
    expectedGreeting: true, expectedCleanedQuery: "what is pH? what is alkalinity?",
    expectedSegmentCount: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 16 — Frustration signals (NEW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs designed to exercise the frustration detector. Each case
 * specifies a range for the frustration score that the result should
 * fall within. Some also assert the shouting flag explicitly.
 *
 * @type {FlagsCase[]}
 */
const FRUSTRATION_CASES = [
  // Calm baseline — score should be near 0.
  { query: "what is pH?",
    minFrustrationScore: 0, maxFrustrationScore: 0.05,
    expectedShouting: false },
  // Mild shouting.
  { query: "HELLO WORLD",
    minFrustrationScore: 0.2, maxFrustrationScore: 0.4,
    expectedShouting: true },
  // Repeated punctuation only.
  { query: "really???",
    minFrustrationScore: 0.05, maxFrustrationScore: 0.15 },
  // Urgent keywords.
  { query: "I need help asap",
    minFrustrationScore: 0.1, maxFrustrationScore: 0.25 },
  // Profanity.
  { query: "what the fuck is going on",
    minFrustrationScore: 0.15, maxFrustrationScore: 0.4 },
  // Heavy compound frustration.
  { query: "THIS DAMN SYSTEM IS BROKEN!!!",
    minFrustrationScore: 0.6, maxFrustrationScore: 1.0,
    expectedShouting: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

const isTTY  = process.stdout.isTTY;
const GREEN  = isTTY ? "\x1b[32m" : "";
const RED    = isTTY ? "\x1b[31m" : "";
const YELLOW = isTTY ? "\x1b[33m" : "";
const DIM    = isTTY ? "\x1b[2m"  : "";
const RESET  = isTTY ? "\x1b[0m"  : "";

const fmtFlags = ({ multiPart, splitOk, needsLLMSplit, greeting, frustration }) => (
  `mp=${multiPart ? "T" : "F"} ok=${splitOk ? "T" : "F"} llm=${needsLLMSplit ? "T" : "F"} ` +
  `g=${greeting ? "T" : "F"} f=${frustration.score.toFixed(2)}`
);

const fmtLabels = (segments) => (
  segments.length === 0
    ? "[]"
    : "[" + segments.map(s => s.classification.label).join(", ") + "]"
);

const truncate = (s, n = 50) => {
  s = (s.length === 0 ? "(empty)" : s).replace(/\n/g, "\\n");
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
};

/**
 * Run a list of graded cases through the analyzer. Each case may
 * assert any combination of: multiPart, splitOk, needsLLMSplit,
 * segmentCount, labels, greeting, cleanedQuery. Missing fields
 * are not asserted (allowing partial checks on focused cases).
 */
const runGradedCases = async (heading, analyze, cases) => {
  console.log(`\n── ${heading} ──`);
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const t0 = Date.now();
    const result = await analyze(c.query);
    const elapsed = Date.now() - t0;
    const failures = [];

    if ("expectedMultiPart"     in c && result.multiPart     !== c.expectedMultiPart)
      failures.push(`multiPart=${result.multiPart} (expected ${c.expectedMultiPart})`);
    if ("expectedSplitOk"       in c && result.splitOk       !== c.expectedSplitOk)
      failures.push(`splitOk=${result.splitOk} (expected ${c.expectedSplitOk})`);
    if ("expectedNeedsLLMSplit" in c && result.needsLLMSplit !== c.expectedNeedsLLMSplit)
      failures.push(`needsLLMSplit=${result.needsLLMSplit} (expected ${c.expectedNeedsLLMSplit})`);
    if ("expectedSegmentCount"  in c && result.segments.length !== c.expectedSegmentCount)
      failures.push(`segments=${result.segments.length} (expected ${c.expectedSegmentCount})`);
    if ("expectedGreeting"      in c && result.greeting      !== c.expectedGreeting)
      failures.push(`greeting=${result.greeting} (expected ${c.expectedGreeting})`);
    if ("expectedCleanedQuery"  in c && result.query         !== c.expectedCleanedQuery)
      failures.push(`query=${JSON.stringify(result.query)} (expected ${JSON.stringify(c.expectedCleanedQuery)})`);
    if (c.expectedLabels) {
      const actualLabels = result.segments.map(s => s.classification.label);
      if (actualLabels.length !== c.expectedLabels.length ||
          actualLabels.some((l, i) => l !== c.expectedLabels[i])) {
        failures.push(`labels=${JSON.stringify(actualLabels)} (expected ${JSON.stringify(c.expectedLabels)})`);
      }
    }
    if ("minFrustrationScore" in c && result.frustration.score < c.minFrustrationScore)
      failures.push(`frustration.score=${result.frustration.score.toFixed(2)} (expected ≥ ${c.minFrustrationScore})`);
    if ("maxFrustrationScore" in c && result.frustration.score > c.maxFrustrationScore)
      failures.push(`frustration.score=${result.frustration.score.toFixed(2)} (expected ≤ ${c.maxFrustrationScore})`);
    if ("expectedShouting" in c && result.frustration.shouting !== c.expectedShouting)
      failures.push(`shouting=${result.frustration.shouting} (expected ${c.expectedShouting})`);

    const ok = failures.length === 0;
    if (ok) ++passed; else ++failed;

    const mark = ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(
      `  ${mark}  ${truncate(c.query)} ${fmtFlags(result)} ` +
      `${fmtLabels(result.segments)} ${DIM}${elapsed}ms${RESET}`
    );
    if (!ok) {
      for (const f of failures) console.log(`        ${RED}- ${f}${RESET}`);
    }
  }

  console.log(`  ${DIM}${passed}/${cases.length} passed${RESET}`);
  return { passed, failed, total: cases.length };
};

const runProbes = async (heading, analyze, cases) => {
  console.log(`\n── ${heading} ── ${DIM}(observational; not graded)${RESET}`);
  let llmSplitHit = 0;
  for (const c of cases) {
    const t0 = Date.now();
    const result = await analyze(c.query);
    const elapsed = Date.now() - t0;
    if (result.needsLLMSplit) ++llmSplitHit;
    console.log(
      `  ${YELLOW}OBSV${RESET}  ${truncate(c.query)} ${fmtFlags(result)} ` +
      `${fmtLabels(result.segments)} ${DIM}${elapsed}ms${RESET}`
    );
  }
  console.log(
    `  ${DIM}${llmSplitHit}/${cases.length} probe(s) hit needsLLMSplit=true${RESET}`
  );
};

const runNoise = async (heading, analyze, cases) => {
  console.log(`\n── ${heading} ── ${DIM}(observational; not graded)${RESET}`);
  for (const c of cases) {
    const t0 = Date.now();
    const result = await analyze(c.query);
    const elapsed = Date.now() - t0;
    console.log(
      `  ${YELLOW}OBSV${RESET}  ${truncate(c.query)} ${fmtFlags(result)} ` +
      `${fmtLabels(result.segments)} ${DIM}${elapsed}ms${RESET}`
    );
    console.log(`        ${DIM}${c.why}${RESET}`);
  }
};

const main = async () => {
  console.log("Smoke test: analyzeQuery orchestrator against real models (comprehensive)");
  console.log("(first run downloads ~25-80MB of quantized models; subsequent runs use the cache)");

  const t0 = Date.now();
  console.log("\nBuilding analyzer (Mode 2 / open-world classifier with defaults)...");
  const analyze = await buildAnalyzeQuery();
  console.log(`  built in ${Date.now() - t0}ms`);

  const results = [];

  results.push(await runGradedCases("Section 1 — Single-intent",                              analyze, SINGLE_INTENT_CASES));
  results.push(await runGradedCases("Section 2 — Multi-part, consistent labels",              analyze, SAME_LABEL_MULTIPART_CASES));
  results.push(await runGradedCases("Section 3 — Multi-part, mixed labels",                   analyze, MIXED_LABEL_MULTIPART_CASES));
  results.push(await runGradedCases("Section 4 — Three-or-more part queries",                 analyze, THREE_OR_MORE_PART_CASES));
  results.push(await runGradedCases("Section 5 — Splitter traps (must NOT split)",            analyze, SPLITTER_TRAP_CASES));
  results.push(await runGradedCases("Section 6 — Punctuation and casing chaos",               analyze, CHAOS_CASES));
  results.push(await runGradedCases("Section 7 — Whitespace abuse",                           analyze, WHITESPACE_CASES));
  results.push(await runGradedCases("Section 8 — Adversarial classifier traps",               analyze, ADVERSARIAL_CASES));
  results.push(await runGradedCases("Section 9 — Negation and hostility",                     analyze, ATTITUDE_CASES));
  results.push(await runGradedCases("Section 10 — Very long queries",                         analyze, LONG_QUERY_CASES));
  results.push(await runGradedCases("Section 11 — Edge inputs (structure only)",              analyze, EDGE_INPUT_CASES));
  results.push(await runGradedCases("Section 14 — Greeting-only inputs",                      analyze, GREETING_ONLY_CASES));
  results.push(await runGradedCases("Section 15 — Greetings combined with content",           analyze, GREETING_AND_CONTENT_CASES));
  results.push(await runGradedCases("Section 16 — Frustration signals",                       analyze, FRUSTRATION_CASES));

  await runProbes("Section 12 — Split-failure probes", analyze, SPLIT_FAILURE_PROBES);
  await runNoise( "Section 13 — Real-user noise",       analyze, REAL_USER_NOISE);

  const total  = results.reduce((s, r) => s + r.total,  0);
  const passed = results.reduce((s, r) => s + r.passed, 0);
  const failed = results.reduce((s, r) => s + r.failed, 0);

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`Total (graded):  ${passed}/${total} passed, ${failed} failed`);
  console.log(`Probes:          ${SPLIT_FAILURE_PROBES.length} observed (not graded)`);
  console.log(`Real-user noise: ${REAL_USER_NOISE.length} observed (not graded)`);
  console.log(`Wall time:       ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("══════════════════════════════════════════════════════════════");

  process.exit(failed > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("\nSmoke test crashed:", err);
  process.exit(2);
});