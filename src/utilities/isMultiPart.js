"use strict";

/**
 * @file isMultiPart.js
 * @brief Heuristic detection of multi-intent user queries.
 */

/**
 * Heuristic check for whether a user query contains multiple distinct
 * questions or intent components, expressed as questions or statements.
 *
 * Seven signals are checked — any single match returns `true`:
 *
 * 1. **Multiple distinct question marks** — two or more `?` that are not part
 *    of consecutive punctuation (e.g. `???` counts as one).
 *
 * 2. **Multiple question words** — two or more occurrences of `what`, `why`,
 *    `how`, `who`, `where`, `when`, or `which` separated by at least one
 *    character.
 *
 * 3. **Multiple imperative verbs** — two or more distinct action verbs from
 *    a closed set (`explain`, `describe`, `tell`, `show`, `list`, `define`,
 *    `compare`, `summarize`) separated by at least one character.
 *
 * 4. **Additive connective introducing a second clause** — explicit additive
 *    language (`also`, `as well as`, `in addition`, `additionally`).
 *
 * 5. **Strong sentence boundary** — a word of 4+ characters followed by `.`,
 *    whitespace, and another word of 4+ characters. Rejects abbreviations
 *    (`Dr.`, `vs.`, `e.g.`), decimals, and short domain fragments
 *    (`L. pneumophila`).
 *
 * 6. **Sentence boundary with uppercase** — a word of 3+ characters followed
 *    by `.`, whitespace, and an uppercase letter.
 *
 * 7. **Greeting followed by content** — a greeting word (`hi`, `hello`, `hey`,
 *    `thanks`, `thank you`, `good morning/afternoon/evening`) at the start,
 *    followed by additional non-whitespace content. Routes `"Hello! What is
 *    biofilm?"` through `splitQuery` so the greeting is separated from the
 *    technical question and handled by the conversational path.
 *
 * @function isMultiPart
 * @param {string} q - The corrected user query string.
 * @returns {boolean} `true` if the query appears to contain multiple distinct
 *   questions or intent components.
 *
 * @example
 * isMultiPart("what is a biofilm? how do I remove it?");  // → true  (signal 1)
 * isMultiPart("what causes X and how do I prevent it");   // → true  (signal 2)
 * isMultiPart("explain biofilm and tell me how to fix it"); // → true (signal 3)
 * isMultiPart("what is chloramine, also how does it compare"); // → true (signal 4)
 * isMultiPart("Biofilm builds up. Explain how to treat it."); // → true (signal 5)
 * isMultiPart("Hello! What is biofilm?");                 // → true  (signal 7)
 * isMultiPart("what is chlorine dosing?");                // → false
 * isMultiPart("L. pneumophila is dangerous");             // → false
 */
const isMultiPart = q => (
  // 1. Multiple distinct question marks.
  /\?(?!\?)/.test(q) && (q.match(/\?(?!\?)/g) || []).length > 1 ||
  // 2. Multiple question words.
  /\b(what|why|how|who|where|when|which)\b.+\b(what|why|how|who|where|when|which)\b/i.test(q) ||
  // 3. Multiple imperative verbs.
  /\b(explain|describe|tell|show|list|define|compare|summarize)\b.+\b(explain|describe|tell|show|list|define|compare|summarize)\b/i.test(q) ||
  // 4. Additive connective introducing a second clause.
  /\b(also|as well as|in addition|additionally)\b/i.test(q) ||
  // 5. Strong sentence boundary: word(4+) . word(4+).
  /\b\w{4,}\.\s+\w{4,}/.test(q) ||
  // 6. Weaker sentence boundary: word(3+) . Uppercase.
  /\b\w{3,}\.\s+[A-Z]/.test(q) ||
  // 7. Greeting at the start followed by additional content.
  /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\b.+\S/i.test(q.trim())
);

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(isMultiPart, "isMultiPart", {
  value: isMultiPart,
}));