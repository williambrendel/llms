"use strict";

/**
 * @file segmentText.js
 * @brief Sentence-level text segmentation returning {@link Segment} instances.
 *
 * Splits text on sentence-ending punctuation (`.` `!` `?` `;`) and control
 * characters, with a merge pass that collapses adjacent candidates separated
 * only by a single `\n` or plain whitespace into one segment, while preserving
 * splits across paragraph breaks (`\n\n+`) and sentence delimiters.
 *
 * **Exported surface:**
 * - Default export: `segmentText(text)` → `Segment[]`
 * - `segmentText.Segment` — the {@link Segment} class, re-exported for
 *   callers that want to type-check results without a separate import.
 *
 * **Segment mutability:** the merge step writes directly to `prev[1]` on an
 * existing `Segment` to extend its end. This is intentional — creating a new
 * `Segment` per merge would generate significant GC pressure on long texts.
 * Callers must not cache `segment[1]` values across calls to `segmentText`.
 *
 * @see {@link Segment}
 * @see {@link segmentTextSection} for paragraph-level grouping.
 */

const Segment = require("./Segment");
const Header = require("./Header");
const { protectDots, restore } = require("./protectDots");
const detectOrderedHeader = require("./detectOrderedHeader");

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

  // Convert text to protect dots.
  const { protectedText, dictionary } = protectDots(text);
  const origText = text;
  text = protectedText;

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

  for (let i = 0, j, k; i !== n; ++i) {
    // Trim whitespace from segment end (scan back from delimiter).
    j = (k = delimIndices[i]) - 1;
    while (j >= p && ((c = text.charCodeAt(j)) < 14 && c > 8 || c === 32)) --j;
    m = addSegment(segments, m, p, ++j, text);

    // Trim whitespace from segment start (scan forward past delimiter).
    p = k + 1;
    while (p !== e && ((c = text.charCodeAt(p)) < 14 && c > 8 || c === 32)) ++p;
  }

  // Capture final segment after last delimiter.
  m = addSegment(segments, m, p, e, text);

  // Update segment length.
  segments.length = m;

  // Remove delim segments.
  m = 0;
  for (let i = 0, l = segments.length, segment; i !== l; ++i) {
    (segment = segments[i]).isDelim || (segments[m++] = segment);
  }

  // Update segment length.
  segments.length = m;

  // Convert text back and remap start/end.
  for (let i = 0, l = segments.length, segment, offset = 0; i !== l; ++i) {
    segment = segments[i];

    // Restore.
    const protectedSlice = text.slice(segment.start, segment.end);
    const restored = restore(protectedSlice, dictionary);

    // Remap the start/end.
    segment[0] += offset;
    segment[1] += (offset += restored.length - protectedSlice.length);
  }
  text = origText;

  // Check for header.
  for (let i = 0, l = segments.length - 1, cur, next; i < l; ++i) {
    cur = segments[i];
    next = segments[i + 1];
    updateHeader(
      segments,
      i,
      text,
      {
        hasBlankLineBefore: cur.hasBlankLineBefore,
        hasDelimLineBefore: cur.hasDelimLineBefore,
        isFirstSegment: !i,
        isLastSegment: l > 1,
        hasBlankLineAfter: next.hasBlankLineBefore,
        hasDelimLineAfter: next.hasDelimLineBefore,
        hasNewline: cur.hasNewline
      }
    );
  }

  // Check for last header.
  const lastIndex = segments.length - 1, last =  segments[lastIndex];
  updateHeader(
    segments,
    lastIndex,
    text,
    {
      hasBlankLineBefore: last.hasBlankLineBefore,
      hasDelimLineBefore: last.hasDelimLineBefore,
      isFirstSegment: !lastIndex,
      isLastSegment: true,
      hasNewline: last.hasNewline
    }
  );

  // return segments.
  return segments;
};

/**
 * @function addSegment
 * @private
 * @description
 * Appends a new segment to the segments array, or merges with the previous
 * segment when the gap between them is just a single newline (no blank line,
 * no intervening sentence delimiter).
 *
 * Behavior summary:
 * - Empty range (`start >= end`): no-op, returns `m` unchanged.
 * - Range matches a delimiter run (3+ consecutive `*`/`+`/`-`/`=`/`_`/`~`):
 *   pushed as a new segment with `isDelim = true`.
 * - First segment in the array: pushed as-is.
 * - Previous segment is a delimiter: pushed with `hasDelimLineBefore = true`.
 * - Gap to previous segment contains a blank line (≥2 newlines) or a
 *   sentence-ending delimiter character: pushed with `hasBlankLineBefore = true`.
 * - Otherwise: merged into the previous segment by extending its end via
 *   `prev[1] = end`, and setting `hasNewline = true` on the previous segment.
 *
 * Index access on `Segment` instances (`prev[1]`) is valid because `Segment`
 * extends `Array`, with index `0` holding the start and index `1` holding
 * the end. Mutating `prev[1]` directly avoids allocating a new Segment per
 * merge — a meaningful win on long texts where most candidates merge.
 *
 * @param {Segment[]} segments - Pre-allocated segments array being filled in.
 * @param {number} m - Current write index into `segments` (i.e. the count
 *   of segments already pushed).
 * @param {number} start - Inclusive start index of the candidate segment in `text`.
 * @param {number} end - Exclusive end index of the candidate segment in `text`.
 * @param {string} text - The (already-protected) text being segmented.
 *
 * @returns {number} The updated write index. Equals `m` if nothing was
 *   pushed (empty range or merge), or `m + 1` if a new segment was appended.
 */
const addSegment = (segments, m, start, end, text) => {
  if (start < end) {
    // Check if current segment is a delimiter.
    if (isDelimiterSegment(start, end, text)) {
      const segment = segments[m] = new Segment(start, end);
      segment.isDelim = true;
      return ++m;
    }
    
    // If first segment.
    if (!m) {
      segments[m] = new Segment(start, end);
      return ++m
    }
   
    const prev = segments[m - 1];

    // If previous segment is a delimiter segment.
    if (prev.isDelim) {
      (segments[m] = new Segment(start, end)).hasDelimLineBefore = true;
      return ++m
    }

    // Analyse gap between segments.
    let dl = 0, nl = 0;
    for (let i = Math.min(prev[1], start), c; i !== start; ++i) {
      nl += (c = text.charCodeAt(i)) === 10; // count newlines
      dl += c > 32;                          // count sentence delimiter in gap
    }

    // If blank line detected, or has been partinioned via a delimiter, it's a new segment.
    if (nl > 1 || dl) {
      const segment = segments[m] = new Segment(start, end);
      nl > 1 && (segment.hasBlankLineBefore = true);
      dl && (segment.hasDelimBefore = true);
      return ++m
    }

    // Just a newline --> merge it.
    prev[1] = end;
    prev.hasNewline = true;
  }
  return m;
}

/**
 * @function isDelimiterSegment
 * @private
 * @description
 * Tests whether a `[start, end)` range in `text` consists entirely of a
 * single repeated "rule" character — used to detect horizontal rules and
 * separator lines like `---`, `===`, `***`, `___`, `+++`, `~~~`.
 *
 * Requires at least 3 consecutive identical characters from the allowed set.
 * Allowed character codes:
 * - 42:  `*`
 * - 43:  `+`
 * - 45:  `-`
 * - 61:  `=`
 * - 95:  `_`
 * - 126: `~`
 *
 * @param {number} start - Inclusive start index of the range in `text`.
 * @param {number} end - Exclusive end index of the range in `text`.
 * @param {string} text - The text being scanned.
 *
 * @returns {boolean} `true` if the range is a homogeneous run of 3+ allowed
 *   delimiter characters; `false` otherwise.
 *
 * @example
 *   isDelimiterSegment(0, 5, "-----")  // → true
 *   isDelimiterSegment(0, 5, "===  ")  // → false (mixed)
 *   isDelimiterSegment(0, 2, "--")     // → false (too short)
 *   isDelimiterSegment(0, 5, "abcde")  // → false (not allowed chars)
 */
const isDelimiterSegment = (start, end, text) => {
  if (end - start < 3) return false; // Need at least 3 concecutive symbols.
  const ref = text.charCodeAt(start);
  if (ref !== 42 && ref !== 43 && ref !== 45 && ref !== 61 && ref !== 95 && ref !== 126) return false;
  let c;
  for (let i = start + 1; i !== end && (c = text.charCodeAt(i)) === ref; ++i);
  return c === ref;
}

/**
 * @function updateHeader
 * @private
 * @description
 * Inspects a segment and, if it qualifies as a header, replaces it in place
 * with a {@link Header} instance carrying level and title-offset metadata.
 *
 * A segment qualifies for header detection when:
 * - It has a "break" before it: blank line, delimiter line, or it's the
 *   first segment in the document, AND
 * - It is not a merged multi-line segment (`!hasNewline`), AND
 * - It has a "break" after it: blank line or delimiter line.
 *
 * When eligible, two header forms are detected:
 * 1. **Markdown ATX headers**: leading `#` characters (char code 35), with
 *    the count determining the level. The trailing `detectOrderedHeader`
 *    call additionally extracts an optional ordered-title offset (e.g.
 *    `## 1.2 Methods` → level 2, title offset past `1.2 `).
 * 2. **Plain ordered headers**: detected by {@link detectOrderedHeader}, which
 *    recognizes patterns like `1. Title`, `A. Title`, `IV. Title`, etc.,
 *    returning the implied level and the offset to the title text.
 *
 * If neither pattern matches, the segment is left unchanged.
 *
 * @param {Segment[]} segments - The segments array (will be mutated in place).
 * @param {number} m - Index of the segment to inspect.
 * @param {string} text - The text the segment indexes into.
 * @param {Object} [context={}] - Adjacency flags used to gate header detection.
 * @param {boolean} [context.hasBlankLineBefore] - The segment is preceded by a blank line.
 * @param {boolean} [context.hasDelimLineBefore] - The segment is preceded by a delimiter line (`---`, `===`, etc.).
 * @param {boolean} [context.hasNewline] - The segment was formed by merging across a single newline (disqualifies it from being a header).
 * @param {boolean} [context.isFirstSegment] - The segment is the first in the document.
 * @param {boolean} [context.hasBlankLineAfter] - The segment is followed by a blank line.
 * @param {boolean} [context.hasDelimLineAfter] - The segment is followed by a delimiter line.
 *
 * @returns {void} Mutates `segments[m]` in place when a header is detected.
 *
 * @see {@link Header}
 * @see {@link detectOrderedHeader}
 */
const updateHeader = (
  segments,
  m,
  text,
  {
    hasBlankLineBefore,
    hasDelimLineBefore,
    hasNewline,
    isFirstSegment,
    isLastSegment,
    hasBlankLineAfter,
    hasDelimLineAfter
  } = {}
) => {
  if (
    (hasBlankLineBefore || hasDelimLineBefore || isFirstSegment)
    && !hasNewline
    && (hasBlankLineAfter || hasDelimLineAfter || isLastSegment)
  ) {
    // Check markdown.
    const segment = segments[m];
    let i = segment.start, c;
    for (let e = segment.end; i !== e && (c = text.charCodeAt(i)) === 35; ++i);
    if (i > segment.start) {
      const level = i - segment.start;
      for (let e = segment.end; i !== e && (c = text.charCodeAt(i)) < 33; ++i);

      // Change segment to header.
      const {
        titleOffset = 0
      } = detectOrderedHeader(text.slice(i, segment.end)) || {};
      segments[m] = new Header(segment.start, segment.end, level, i - segment.start + titleOffset);
      return;
    }

    // Check title patterns.
    const res = detectOrderedHeader(text.slice(segment.start, segment.end));
    if (res) {
      const {
        level,
        titleOffset
      } = res;
      segments[m] = new Header(segment.start, segment.end, level, titleOffset);
    }
  }
}

/**
 * @ignore
 */
segmentText.Segment = Segment;
module.exports = Object.freeze(Object.defineProperty(segmentText, "segmentText", {
  value: segmentText
}));