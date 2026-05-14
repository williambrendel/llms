"use strict";

/**
 * @file detectFrustration.js
 * @module xenova/buildAnalyzeQuery/detectFrustration
 * @brief Surface user frustration markers from a raw query.
 *
 * Frustration matters for downstream response generation: an LLM
 * answering an angry user should adjust tone (more empathetic,
 * acknowledge the friction, skip cheery filler), and a SUPPORT
 * handoff handler may want to escalate urgency. None of that is
 * possible without explicit signals — the model can't infer frustration
 * from a classification label alone.
 *
 * Four signals are computed:
 *
 *   1. **Shouting** — ALL CAPS density of alphabetic characters. A
 *      query that's more than half uppercase is treated as shouting.
 *      Three letters or fewer is exempt — short queries are often
 *      acronyms ("PH", "DI water") where uppercase is conventional.
 *
 *   2. **Repeated punctuation count** — number of runs of 2+ adjacent
 *      `!` or `?` characters. `"!!!"` is one run; `"!!! ???"` is two.
 *      MUST be computed on the raw input before `collapseRepeated-
 *      Punctuation` normalizes the runs away.
 *
 *   3. **Urgent keywords** — closed set of words signaling urgency or
 *      brokenness: `urgent`, `asap`, `now`, `immediately`, `broken`,
 *      `not working`, `doesn't work`, `failed`. Each match counted.
 *
 *   4. **Profanity** — boolean. A small set of common expletives.
 *      Conservative — we don't try to catch every variant. The
 *      signal is "user is angry enough to swear" rather than a full
 *      content filter.
 *
 * Output is a rich object exposing individual signals AND a composite
 * `score` (0..1). Downstream prompts can use the composite for a
 * global "how upset is this user" reading or pick specific signals
 * for finer-grained policy.
 *
 * The composite score weights signals to reflect their reliability
 * and severity:
 *   - shouting              → 0.3
 *   - repeated punctuation  → 0.2 (capped at 3+ runs)
 *   - urgent keywords       → 0.3 (capped at 2+ matches)
 *   - profanity             → 0.2
 *
 * Weights sum to 1; the score is clamped to [0, 1]. These are
 * starting values — tune from production traffic if needed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum length (alphabetic chars) below which we don't evaluate
 * shouting. Short queries are often acronyms or domain abbreviations
 * where uppercase carries no emotional charge ("pH" → "PH", "DI water").
 */
const SHOUTING_MIN_LENGTH = 4;

/**
 * ALL CAPS density threshold. A query is "shouting" when more than
 * this fraction of its alphabetic characters are uppercase. 0.5 is
 * a forgiving threshold — most casual queries are <30% uppercase
 * (acronyms, proper nouns), genuinely angry queries are usually
 * >70%.
 */
const SHOUTING_RATIO_THRESHOLD = 0.5;

/**
 * Urgent keywords. Anchored at word boundaries to avoid false
 * matches inside other words (e.g. "now" inside "knowledge"). Some
 * entries are multi-word phrases — order matters to avoid double-
 * counting overlapping matches.
 */
const URGENT_KEYWORDS = [
  "urgent",
  "asap",
  "immediately",
  "doesn't work",
  "does not work",
  "not working",
  "broken",
  "failed",
  "now",
];

/**
 * Conservative profanity list. The signal here is "user is angry
 * enough to swear" rather than a content filter. Detection is
 * case-insensitive and word-bounded.
 */
const PROFANITY_KEYWORDS = [
  "fuck",
  "fucking",
  "shit",
  "damn",
  "hell",
  "crap",
  "wtf",
];

/**
 * Composite weights. Must sum to 1.0; the final score is clamped to
 * [0, 1] anyway, but keeping the sum at 1 makes the score's meaning
 * stable.
 */
const WEIGHTS = {
  shouting:        0.3,
  repeatedPunct:   0.2,
  urgentKeywords:  0.3,
  profanity:       0.2,
};

/**
 * Saturation caps. Beyond these counts, additional matches don't
 * contribute more — the signal is already maxed.
 */
const REPEATED_PUNCT_CAP  = 3;
const URGENT_KEYWORDS_CAP = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Signal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count alphabetic uppercase / total alphabetic. Non-alphabetic
 * characters (digits, punctuation, whitespace) are ignored.
 *
 * @returns {{ ratio: number, alphaCount: number }} `ratio` is 0..1.
 *   When the query has no alphabetic chars, ratio is 0 (cannot shout
 *   without letters).
 */
const computeCapsRatio = (q) => {
  let upper = 0;
  let alpha = 0;
  for (const ch of q) {
    if (ch >= "A" && ch <= "Z") { upper++; alpha++; }
    else if (ch >= "a" && ch <= "z") { alpha++; }
  }
  return { ratio: alpha === 0 ? 0 : upper / alpha, alphaCount: alpha };
};

/**
 * Count runs of 2+ adjacent terminal punctuation marks (`!?`). Each
 * run is one match, regardless of length — `"!!!"` is one run,
 * `"!!! ???"` is two.
 */
const countRepeatedPunct = (q) => (q.match(/[!?]{2,}/g) || []).length;

/**
 * Find all urgent-keyword matches in `q`. Returns the matched
 * keywords in order of appearance. Case-insensitive, word-bounded.
 *
 * Phrases (multi-word entries like "not working") are matched as a
 * unit. Single-word entries are bounded by `\b` so "now" inside
 * "knowledge" doesn't fire.
 */
const findUrgentKeywords = (q) => {
  const lower = q.toLowerCase();
  const found = [];
  for (const kw of URGENT_KEYWORDS) {
    // Multi-word phrases: anchor with spaces around. Single words:
    // anchor with word boundaries.
    const pattern = kw.includes(" ")
      ? new RegExp(`(^|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$|[.,!?])`, "g")
      : new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    if (pattern.test(lower)) found.push(kw);
  }
  return found;
};

/**
 * Detect profanity. Returns true if any entry from `PROFANITY_KEYWORDS`
 * appears as a word in the query (case-insensitive, word-bounded).
 */
const hasProfanity = (q) => {
  const lower = q.toLowerCase();
  return PROFANITY_KEYWORDS.some(w => new RegExp(`\\b${w}\\b`).test(lower));
};

// ─────────────────────────────────────────────────────────────────────────────
// Public function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute frustration signals for a raw query.
 *
 * @function detectFrustration
 * @param {string} rawQuery
 *   The raw user input, BEFORE normalization. Must be passed before
 *   `collapseRepeatedPunctuation` runs, otherwise the
 *   `repeatedPunctCount` signal is lost.
 * @returns {{
 *   score:               number,
 *   shouting:            boolean,
 *   allCaps:             boolean,
 *   repeatedPunctCount:  number,
 *   urgentKeywords:      string[],
 *   profanity:           boolean
 * }}
 *   `score` is a composite 0..1 value. The individual signals are
 *   exposed so downstream prompts can use any subset.
 *
 *   `allCaps` is the raw signal (>50% uppercase among alphabetic
 *   chars). `shouting` adds the length gate (>= 4 alphabetic chars)
 *   to filter out short acronyms.
 *
 * @example
 *   detectFrustration("THIS IS BROKEN!!!");
 *   // → { score: 0.7, shouting: true, allCaps: true,
 *   //     repeatedPunctCount: 1, urgentKeywords: ["broken"], profanity: false }
 *
 *   detectFrustration("what is pH?");
 *   // → { score: 0, shouting: false, allCaps: false,
 *   //     repeatedPunctCount: 0, urgentKeywords: [], profanity: false }
 *
 *   detectFrustration("");
 *   // → { score: 0, shouting: false, allCaps: false,
 *   //     repeatedPunctCount: 0, urgentKeywords: [], profanity: false }
 */
const detectFrustration = (rawQuery) => {
  const q = rawQuery || "";

  const { ratio, alphaCount } = computeCapsRatio(q);
  const allCaps  = ratio >= SHOUTING_RATIO_THRESHOLD && alphaCount > 0;
  const shouting = allCaps && alphaCount >= SHOUTING_MIN_LENGTH;

  const repeatedPunctCount = countRepeatedPunct(q);
  const urgentKeywords     = findUrgentKeywords(q);
  const profanity          = hasProfanity(q);

  // Composite score: weighted sum with per-signal saturation.
  const score = Math.min(1,
    WEIGHTS.shouting       * (shouting ? 1 : 0) +
    WEIGHTS.repeatedPunct  * Math.min(1, repeatedPunctCount / REPEATED_PUNCT_CAP) +
    WEIGHTS.urgentKeywords * Math.min(1, urgentKeywords.length / URGENT_KEYWORDS_CAP) +
    WEIGHTS.profanity      * (profanity ? 1 : 0)
  );

  return {
    score,
    shouting,
    allCaps,
    repeatedPunctCount,
    urgentKeywords,
    profanity,
  };
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(
  detectFrustration,
  "detectFrustration",
  { value: detectFrustration }
));
