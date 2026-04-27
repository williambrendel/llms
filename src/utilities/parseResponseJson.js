/**
 * @file parseResponseJson.js
 * @brief JSON extraction from raw LLM text output.
 */

/**
 * @function parseResponseJson
 * @description
 * Parses the first complete JSON value from a raw LLM text string, handling
 * two common model output quirks.
 *
 * **Model output quirks handled:**
 *
 * 1. **Markdown code fences** — the model sometimes wraps output in
 *    ` ```json ``` ` or ` ``` ``` `. Fences are stripped before extraction.
 *
 * 2. **Trailing text** — the model sometimes appends reasoning or commentary
 *    after the JSON (e.g. `[] **Reasoning:** the section has no facts`). Only
 *    the first complete JSON value is extracted; trailing content is discarded.
 *
 * @param {string} text - Raw text string from a Claude API response.
 * @returns {*} Parsed JSON value (object, array, etc.).
 * @throws {SyntaxError} If `JSON.parse` fails after extraction.
 *
 * @example <caption>Strips fences</caption>
 * parseResponseJson('```json\n[{"a":1}]\n```');
 * // → [{ a: 1 }]
 *
 * @example <caption>Discards trailing commentary</caption>
 * parseResponseJson('[{"a":1}]\n\n**Reasoning:** ...');
 * // → [{ a: 1 }]
 *
 * @example <caption>Plain object</caption>
 * parseResponseJson('{"key":"value"}');
 * // → { key: "value" }
 */
const parseResponseJson = text => {
  // Strip markdown code fences the model sometimes wraps around JSON output.
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trimStart();

  // Extract the first complete JSON value, discarding any trailing text the
  // model appends after the JSON (e.g. "[] **Reasoning:** ...").
  const opener = stripped[0];
  let clean = stripped;
  if (opener === "[" || opener === "{") {
    const closer = opener === "[" ? "]" : "}";
    let depth = 0, inString = false, escape = false;
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i];
      if (escape)        { escape = false; continue; }
      if (ch === "\\")   { escape = true;  continue; }
      if (ch === '"')    { inString = !inString; continue; }
      if (inString)      continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        if (--depth === 0) { clean = stripped.slice(0, i + 1); break; }
      }
    }
  }

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error(`🚨 Failed to parse JSON:\n${clean.slice(0, 500)}`);
    throw err;
  }
};

/**
 * @ignore
 */
module.exports = Object.freeze(Object.defineProperty(parseResponseJson, "parseResponseJson", {
  value: parseResponseJson,
}));