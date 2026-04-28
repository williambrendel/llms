"use strict";

/**
 * @file segmentText.js
 * @brief Text segmentation utilities for sentence-level and paragraph-level
 * splitting, designed for embedding pipelines (e.g. Xenova/all-MiniLM-L6-v2).
 */

/**
 * @class Segment
 * @extends Uint32Array
 * @description A specialized 2-element array representing a text range [start, end].
 *
 * Uses a fixed-size `Uint32Array(2)` for high performance and low memory 
 * footprint during large-scale text processing. The constructor is polymorphic,
 * accepting either two numeric indices or a single array-like object.
 */
class Segment extends Uint32Array {
  /**
   * @constructor
   * @param {number|Array|Uint32Array|Uint16Array} start - The inclusive start index, 
   * or an array-like object containing [start, end].
   * @param {number} [end] - The exclusive end index. Ignored if the first 
   * argument is an array-like object.
   */
  constructor(start, end) {
    // 1. Explicitly allocate exactly 2 slots
    super(2); 
    
    // 2. Assign the values manually
    typeof start === "object" && (
      Array.isArray(start) || (start instanceof Uint32Array) || (start instanceof Uint16Array)
    ) && (
      end = start[1],
      start = start[0]
    );
    typeof start === "number" && (this[0] = Math.max(start, 0));
    typeof end === "number" && (this[1] = Math.max(end, 0));
  }

  /** @property {number} start - The inclusive start offset of the segment. */
  get start() { return this[0]; }
  /** @property {number} end - The exclusive end offset of the segment. */
  get end() { return this[1]; }

  /**
   * @method toJSON
   * @description Ensures the segment serializes as a standard Array [start, end].
   * This is required because Uint32Array serializes as an object by default.
   * @returns {number[]}
   */
  toJSON() {
    return Array.from(this); // Converts to [start, end] for JSON
  }
}

/**
 * @class Section
 * @extends Array
 * @description A collection of {@link Segment} instances representing a logical paragraph.
 *
 * Provides convenience getters to determine the total character span of 
 * the paragraph based on the first and last segments in the collection.
 */
class Section extends Array {
  constructor(...args) {
    super(...args);
  }

  /** @property {number|undefined} start - The start offset of the first segment. */
  get start() { return (this[0] || [])[0]; }
  /** @property {number|undefined} end - The end offset of the final segment. */
  get end() { return (this[this.length - 1] || [])[1]; }
}

/**
 * @function segmentText
 * @description Splits text into sentence-level `[start, end]` index pairs.
 * Delimiters are `.`, `!`, `?`, `;`, and whitespace control characters
 * (tab, newline, carriage return). Leading and trailing punctuation and
 * whitespace are trimmed from the input before processing.
 *
 * Adjacent segments separated by a single delimiter and no blank line are
 * merged into one segment. A new segment is started when the gap between
 * two candidates contains either:
 * - Two or more `\n` characters (paragraph break), or
 * - A non-whitespace character (`c > 32`) — i.e. a sentence-ending delimiter
 *   that was itself recorded as a split point.
 *
 * This design means single-newline line breaks within a paragraph do not
 * produce separate segments, while blank lines always do.
 *
 * Delimiter character codes used internally:
 * - 9:  `\t`  (tab)
 * - 10: `\n`  (newline)
 * - 13: `\r`  (carriage return)
 * - 32: space
 * - 33: `!`
 * - 44: `,`
 * - 46: `.`
 * - 58: `:`
 * - 59: `;`
 * - 63: `?`
 *
 * @param {string|*} text - Input text. Non-string values are coerced via
 *   template literal. Falsy values return `[]` immediately.
 *
 * @returns {Array<[number, number]>} Array of `[start, end]` pairs where
 *   `start` is inclusive and `end` is exclusive, suitable for
 *   `text.slice(start, end)`. Returns `[]` if the input is empty or contains
 *   only delimiters and whitespace.
 *
 * @example
 * // Basic sentence splitting
 * segmentText("Hello world. How are you?");
 * // → [ [0, 11], [13, 24] ]
 * // text.slice(0, 11) → "Hello world"
 * // text.slice(13, 24) → "How are you"
 *
 * @example
 * // Single newline — merged into one segment
 * segmentText("Hello world.\nHow are you?");
 * // → [ [0, 24] ]
 *
 * @example
 * // Double newline — paragraph break, two segments
 * segmentText("Hello world.\n\nHow are you?");
 * // → [ [0, 11], [14, 25] ]
 *
 * @example
 * // Leading and trailing punctuation trimmed
 * segmentText("...Hello world. How are you?!");
 * // → [ [3, 25] ]
 *
 * @example
 * // Reconstruct text from segments
 * const segments = segmentText(text);
 * const sentences = segments.map(([s, e]) => text.slice(s, e));
 */
const segmentText = text => {
  if (!text) return [];
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
      (c < 14 && c > 9) || c === 33 ||
      c === 46 || c === 59 || c === 63
    ) && (delimIndices[n++] = i);
  }

  const segments = new Array(n + 2);
  p = s;

  for (let i = 0, j, k, dl, nl; i !== n; ++i) {
    // Trim whitespace from segment end (scan back from delimiter).
    j = (k = delimIndices[i]) - 1;
    while (j >= p && ((c = text.charCodeAt(j)) < 14 && c > 8 || c === 32)) --j;
    if (++j > p) {
      // Count new lines and special delimiters in gap to decide merge vs split.
      if (!m) (segments[m++] = new Segment(p, j));
      else {
        const prev = segments[m - 1];
        dl = nl = 0;
        for (let ii = prev[1]; ii !== p && nl < 2 && !dl; ++ii) {
          nl += (c = text.charCodeAt(ii)) === 10; // count newlines
          dl  += c > 32;                            // detect sentence delimiter in gap
        }
        (nl > 1 || dl) && (segments[m++] = new Segment(p, j)) || (prev[1] = j);
      }
    }

    // Trim whitespace from segment start (scan forward past delimiter).
    p = k + 1;
    while (p !== e && ((c = text.charCodeAt(p)) < 14 && c > 8 || c === 32)) ++p;
  }

  // Capture final segment after last delimiter.
  if (e > p) {
    if (!m) (segments[m++] = new Segment(p, e));
    else {
      const prev = segments[m - 1];
      let dl = nl = 0;
      for (let ii = prev[1]; ii !== p && nl < 2 && !dl; ++ii) {
        nl += (c = text.charCodeAt(ii)) === 10; // count newlines
        dl  += c > 32;                            // detect sentence delimiter in gap
      }
      (nl > 1 || dl) && (segments[m++] = new Segment(p, e)) || (prev[1] = e);
    }
  }

  segments.length = m;
  return segments;
};

/**
 * @function segmentTextSection
 * @description Segments `text` via {@link segmentText} and groups the resulting
 * `[start, end]` pairs into **sections** — one section per paragraph, where
 * paragraphs are delimited by blank lines.
 *
 * A blank line is defined as two or more `\n` characters in the gap between
 * the end of one segment and the start of the next (`text[prevEnd..nextStart]`).
 * This correctly handles Unix (`\n\n`), Windows (`\r\n\r\n`), and mixed line
 * endings. Single `\n` within a paragraph does not start a new section.
 *
 * @param {string|*} text - Input text. Forwarded to {@link segmentText}. Falsy
 *   values return `[]` immediately.
 *
 * @returns {Array<Array<[number, number]>>} Array of sections. Each section is a
 *   non-empty array of `[start, end]` pairs. Returns `[]` if the input produces
 *   no segments.
 *
 * @example
 * // Two paragraphs separated by a blank line
 * const text = "Hello world.\n\nHow are you?";
 * segmentTextSection(text);
 * // → [
 * //     [ [0, 11] ],    // "Hello world"  — paragraph 1
 * //     [ [14, 25] ]    // "How are you"  — paragraph 2
 * //   ]
 *
 * @example
 * // Single paragraph — all segments in one section
 * segmentTextSection("Hello world. How are you?");
 * // → [ [ [0, 11], [13, 24] ] ]
 *
 * @example
 * // Multi-sentence paragraph followed by single-sentence paragraph
 * segmentTextSection("First sentence. Second sentence.\n\nNew paragraph.");
 * // → [
 * //     [ [0, 14], [16, 31] ],  // paragraph 1
 * //     [ [34, 47] ]            // paragraph 2
 * //   ]
 *
 * @example
 * // Reconstruct paragraph strings from sections
 * const sections = segmentTextSection(text);
 * const paragraphs = sections.map(
 *   section => section.map(([s, e]) => text.slice(s, e)).join(" ")
 * );
 */
const segmentTextSection = text => {
  const segments = segmentText(text);
  if (!segments.length) return [];

  const sections = [];
  let current = new Section(segments[0]);

  for (let i = 1; i < segments.length; i++) {
    const prevEnd   = segments[i - 1][1];
    const nextStart = segments[i][0];

    // Count \n characters in the gap between consecutive segments.
    // Two or more \n means a blank line — start a new section.
    let newlines = 0;
    for (let j = prevEnd; j < nextStart && newlines < 2; j++)
      text.charCodeAt(j) === 10 && ++newlines;

    if (newlines >= 2) { sections.push(current); current = new Section(); }
    current.push(segments[i]);
  }

  sections.push(current);
  return sections;
};

/**
 * @ignore
 */
segmentText.segmentTextSection = segmentTextSection;
module.exports = Object.freeze(Object.defineProperty(segmentText, "segmentText", {
  value: segmentText
}));