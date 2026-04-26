"use strict";

/**
 * @file segmentText.js
 * @brief Text segmentation utilities. `segmentText` splits a string into
 * sentence-level or word-level index pairs. `segmentTextSection` groups those
 * pairs into paragraph-level sections separated by blank lines.
 */

/**
 * @function segmentText
 * @description Splits a text string into segments, returning the byte-range of
 * each segment as a `[start, end]` index pair suitable for `text.slice(s, e)`.
 *
 * Leading and trailing whitespace and punctuation are trimmed from the entire
 * input before segmentation. Empty or whitespace-only segments between
 * delimiters are silently discarded.
 *
 * **Behavior depends on `keepSentenceChunk`:**
 *
 * - `true` (default) — **sentence mode.** Only punctuation characters act as
 *   delimiters. Spaces and newlines are treated as part of the segment content,
 *   so `"Hello world"` produces a single segment. Use this when you want
 *   phrase- or clause-level chunks.
 *
 * - `false` — **word mode.** Whitespace (`\t` 9, `\n` 10, `\r` 13, ` ` 32) is
 *   added to the delimiter set, splitting on every word boundary in addition to
 *   punctuation.
 *
 * **Punctuation delimiters (both modes):**
 * `!` (33), `,` (44), `.` (46), `:` (58), `;` (59), `?` (63)
 *
 * **Additional whitespace delimiters (word mode only):**
 * `\t` (9), `\n` (10), `\r` (13), ` ` (32)
 *
 * Each returned pair `[s, e]` is a half-open range. Whitespace immediately
 * adjacent to a delimiter is excluded from the neighbouring segment's range —
 * every segment starts and ends on a non-whitespace character.
 *
 * @param {string|*} text - Input to segment. Non-string values are coerced via
 *   template literal. Falsy values return `[]` immediately.
 * @param {boolean} [keepSentenceChunk=true] - `true` for sentence/phrase mode
 *   (punctuation-only delimiters); `false` for word mode (whitespace also splits).
 *
 * @returns {Array<[number, number]>} Array of `[start, end]` index pairs, one
 *   per non-empty segment. Returns `[]` if `text` is falsy or contains only
 *   delimiters and whitespace.
 *
 * @example
 * // Sentence mode (default) — spaces preserved inside segments
 * segmentText("Hello, world. How are you?");
 * // → [ [0, 5], [7, 12], [14, 25] ]
 * // text.slice(14, 25) === "How are you"  (trailing '?' trimmed)
 *
 * @example
 * // Sentence mode — no punctuation → single segment
 * segmentText("One sentence only");
 * // → [ [0, 17] ]
 *
 * @example
 * // Word mode — splits on every whitespace and punctuation
 * segmentText("Hello, world", false);
 * // → [ [0, 5], [7, 12] ]
 *
 * @example
 * // Only whitespace/delimiters → empty result
 * segmentText("  \n  ");
 * // → []
 *
 * @example
 * // Reconstruct segment strings
 * const segs = segmentText(text);
 * const strings = segs.map(([s, e]) => text.slice(s, e));
 */
const segmentText = (text, keepSentenceChunk = true) => {
  if (!text) return [];
  const segmentWords = !keepSentenceChunk;
  typeof text === "string" || (text = `${text}`);
  const len = text.length, delimIndices = new Uint32Array(len);
  let n = 0, m = 0, p = 0, s = 0, e = len - 1, c;

  // Trim leading delimiters and whitespace.
  // 9: \t, 10: \n, 13: \r, 32: space, 33: !, 44: ,, 46: ., 58: :, 59: ;, 63: ?
  while (s !== len && (c = text.charCodeAt(s)) < 64 && (
    c < 14 && c > 8 || c === 32
    || c === 33 || c === 44 || c === 46
    || c === 58 || c === 59 || c === 63
  )) ++s;

  // Trim trailing delimiters and whitespace.
  while (e > s && (c = text.charCodeAt(e)) < 64 && (
    c < 14 && c > 8 || c === 32
    || c === 33 || c === 44 || c === 46
    || c === 58 || c === 59 || c === 63
  )) --e;

  if (s === len) return [];
  ++e < s && (e = s);

  // Collect delimiter positions.
  for (let i = s; i !== e; ++i) {
    c = text.charCodeAt(i);
    c < 64 && (
      segmentWords && (c < 14 && c > 8 || c === 32) || c === 33 || c === 44 ||
      c === 46 || c === 58 || c === 59 || c === 63
    ) && (delimIndices[n++] = i);
  }

  const segments = new Array(n + 2);
  p = s;

  for (let i = 0, j, k; i !== n; ++i) {
    // Trim whitespace from segment end (scan back from delimiter).
    j = (k = delimIndices[i]) - 1;
    while (j >= p && ((c = text.charCodeAt(j)) < 14 && c > 8 || c === 32)) --j;
    (++j > p) && (segments[m++] = [p, j]);

    // Trim whitespace from segment start (scan forward past delimiter).
    p = k + 1;
    while (p !== e && ((c = text.charCodeAt(p)) < 14 && c > 8 || c === 32)) ++p;
  }

  // Capture final segment after last delimiter.
  p < e && (segments[m++] = [p, e]);

  segments.length = m;
  return segments;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function segmentTextSection
 * @description Segments `text` via {@link segmentText} (sentence mode) and then
 * groups the resulting `[start, end]` pairs into **sections** — one section per
 * paragraph, where paragraphs are delimited by blank lines.
 *
 * A blank line is defined as at least **two `\n` characters** appearing in the
 * gap between the end of one segment and the start of the next
 * (`text.slice(prevEnd, nextStart)`). This correctly handles Unix (`\n\n`),
 * Windows (`\r\n\r\n`), and mixed line endings.
 *
 * Segments within the same paragraph (gap contains fewer than two `\n`) are
 * collected into the same section array. A new section begins whenever a blank
 * line is detected between consecutive segments.
 *
 * @param {string|*} text - Input text. Forwarded to {@link segmentText}. Falsy
 *   values return `[]` immediately.
 * @param {boolean} [keepSentenceChunk=true] - Forwarded to {@link segmentText}.
 *   `true` for sentence/phrase mode; `false` for word mode.
 *
 * @returns {Array<Array<[number, number]>>} Array of sections. Each section is a
 *   non-empty array of `[start, end]` pairs from {@link segmentText}. Returns `[]`
 *   if the input produces no segments.
 *
 * @example
 * // Two paragraphs separated by a blank line
 * const text = "Hello, world.\n\nHow are you?";
 * segmentTextSection(text);
 * // → [
 * //     [ [0, 5], [7, 12] ],   // "Hello" and "world" — paragraph 1
 * //     [ [15, 25] ]           // "How are you"       — paragraph 2
 * //   ]
 *
 * @example
 * // Single paragraph — all segments in one section
 * segmentTextSection("Hello, world. How are you?");
 * // → [ [ [0, 5], [7, 12], [14, 25] ] ]
 *
 * @example
 * // Reconstruct paragraph strings
 * const sections = segmentTextSection(text);
 * const paragraphs = sections.map(
 *   section => section.map(([s, e]) => text.slice(s, e)).join(" ")
 * );
 */
const segmentTextSection = (text, keepSentenceChunk = true) => {
  const segments = segmentText(text, keepSentenceChunk);
  if (!segments.length) return [];

  const sections = [];
  let current = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prevEnd   = segments[i - 1][1];
    const nextStart = segments[i][0];

    // Count \n characters in the gap between consecutive segments.
    // Two or more \n means a blank line — start a new section.
    let newlines = 0;
    for (let j = prevEnd; j < nextStart; j++) {
      text.charCodeAt(j) === 10 && ++newlines;
    }

    if (newlines >= 2) {
      sections.push(current);
      current = [];
    }
    current.push(segments[i]);
  }

  sections.push(current);
  return sections;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @ignore
 */
segmentText.segmentTextSection = segmentTextSection;

module.exports = Object.freeze(Object.defineProperty(segmentText, "segmentText", {
  value: segmentText
}));