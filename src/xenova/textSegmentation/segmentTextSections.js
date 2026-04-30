"use strict";

/**
 * @file segmentTextSections.js
 * @brief Hierarchical grouping of {@link Segment} instances into
 * {@link Section} trees, with header-level-driven nesting.
 *
 * Calls {@link segmentText} to produce sentence-level segments (some of
 * which may be {@link Header} instances), then groups them into a tree of
 * {@link Section} nodes. The tree mirrors the document's heading outline:
 *
 * - A {@link Header} of level `N` opens a new {@link Section}.
 * - Subsequent segments of any kind nest inside that section until a header
 *   of level `≤ N` closes it.
 * - A header of level `< N` walks back up the tree until it finds a parent
 *   whose level can contain it; same-level headers become siblings.
 *
 * Body segments (non-headers) attach to the current open header section as
 * direct children, alongside any nested child sections. Use
 * {@link Section#content} to filter out the header, or
 * `section.filter(x => typeof x[0] === "number")` to get only body segments.
 *
 * Body that appears before the first header is preserved as top-level
 * sections at the root, with paragraph breaks (`\n\n+`) splitting them.
 *
 * Use {@link Section#flatten} on the result if you need a flat depth-first
 * traversal — the tree is the canonical structure, flat is the projection.
 *
 * **Exported surface:**
 * - Default export: `segmentTextSections(text)` → `Section[]`
 * - `segmentTextSections.Segment` — re-exported {@link Segment} class.
 * - `segmentTextSections.Section` — re-exported {@link Section} class.
 * - `segmentTextSections.Header`  — re-exported {@link Header} class.
 * - `segmentTextSections.segmentText` — re-exported {@link segmentText} function.
 *
 * @see {@link segmentText} for sentence-level segmentation.
 * @see {@link Section} for paragraph geometry methods and `.flatten()`.
 * @see {@link Header} for heading metadata (level, title).
 */

const segmentText = require("./segmentText");
const Section     = require("./Section");
const Header      = require("./Header");

/**
 * @function segmentTextSections
 * @description Segments `text` via {@link segmentText} and assembles the
 * results into a hierarchical tree of {@link Section} nodes driven by
 * heading levels.
 *
 * Algorithm:
 * 1. A stack of `{ section, level }` frames is maintained, ordered
 *    shallowest → deepest. Each frame represents a currently-open header
 *    section that can still accept children.
 * 2. On encountering a {@link Header} at level `L`:
 *    - Pop all frames where `frame.level >= L` (they cannot contain a
 *      header of this level or shallower).
 *    - Create a new {@link Section}, push the header into it as
 *      `section[0]`, and attach it to the current parent (top of stack,
 *      or the root array if the stack is empty).
 *    - Push `{ section, level: L }` as the new top frame.
 * 3. On encountering a body segment:
 *    - If the stack is non-empty, append the segment to the top section.
 *    - Otherwise (no header has opened yet) handle as a root-level body:
 *      append to the most recent top-level body section if it exists and
 *      this segment has no blank-line break before it; otherwise start a
 *      fresh top-level body section.
 *
 * Headers always start their own section. Blank lines between body
 * segments inside a header section do **not** create a new section —
 * that would produce header-less nested sections, which complicates
 * `.header` / `.level` semantics. If you need finer-grained paragraph
 * structure inside a header, walk the body segments directly via
 * `section.filter(x => typeof x[0] === "number")`.
 *
 * @param {string|*} text - Input text. Forwarded to {@link segmentText}.
 *   Falsy values return `[]` immediately.
 *
 * @returns {Section[]} Top-level sections in document order. Each section
 *   may contain nested {@link Section} children plus body {@link Segment}
 *   entries as direct elements.
 *
 * @example
 * // Single header with body
 * segmentTextSections("# Title\n\nFirst sentence. Second sentence.");
 * // → [
 * //     Section [
 * //       Header(0, 7, level=1),
 * //       Segment(9, 23),   // "First sentence"
 * //       Segment(25, 40)   // "Second sentence"
 * //     ]
 * //   ]
 *
 * @example
 * // Nested headers
 * segmentTextSections("# Top\n\nIntro.\n\n## Sub\n\nBody.\n\n## Sub2\n\nBody2.");
 * // → [
 * //     Section [
 * //       Header(level=1, "Top"),
 * //       Segment("Intro"),
 * //       Section [
 * //         Header(level=2, "Sub"),
 * //         Segment("Body")
 * //       ],
 * //       Section [
 * //         Header(level=2, "Sub2"),
 * //         Segment("Body2")
 * //       ]
 * //     ]
 * //   ]
 *
 * @example
 * // Higher-level header pops back up
 * segmentTextSections("## A\n\n### B\n\n# C");
 * // → [
 * //     Section [ Header(level=2, "A"), Section [ Header(level=3, "B") ] ],
 * //     Section [ Header(level=1, "C") ]
 * //   ]
 *
 * @example
 * // Body before any header — preserved as top-level body sections
 * segmentTextSections("Intro paragraph.\n\n# Title\n\nBody.");
 * // → [
 * //     Section [ Segment("Intro paragraph") ],
 * //     Section [ Header(level=1, "Title"), Segment("Body") ]
 * //   ]
 *
 * @example
 * // Flatten the tree if you need a linear walk
 * const tree = segmentTextSections(text);
 * const flat = tree.flatMap(s => s.flatten());
 */
const segmentTextSections = text => {
  const segments = segmentText(text);
  if (!segments.length) return [];

  const root = [];
  const stack = []; // entries: { section, level }

  for (let i = 0, l = segments.length, segment; i !== l; ++i) {
    segment = segments[i];

    if (segment instanceof Header) {
      // Pop frames that cannot contain a header at this level.
      // A frame can contain `segment` only if its level is strictly less.
      const level = segment.level;
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      // Build the new section with the header as its first element.
      const section = new Section();
      section.push(segment);

      // Attach to current parent — top of stack, or root if empty.
      stack.length
        && stack[stack.length - 1].section.push(section)
        || root.push(section);

      stack.push({ section, level });
      continue;
    }

    // Body segment.
    if (stack.length) {
      // Inside an open header section — attach directly.
      stack[stack.length - 1].section.push(segment);
      continue;
    }

    // Root-level body (before any header). Paragraph breaks split into
    // separate top-level sections; consecutive body in the same paragraph
    // accumulates into the most recent root section.
    const lastRoot = root[root.length - 1];
    const lastIsRootBody =
      lastRoot instanceof Section && !(lastRoot[0] instanceof Header);

    if (lastIsRootBody && !segment.hasBlankLineBefore) {
      lastRoot.push(segment);
    } else {
      const section = new Section();
      section.push(segment);
      root.push(section);
    }
  }

  return root;
};

/**
 * @ignore
 */
segmentTextSections.Segment = segmentText.Segment;
segmentTextSections.Section = Section;
segmentTextSections.Header  = Header;
segmentTextSections.segmentText = segmentText;
module.exports = Object.freeze(Object.defineProperty(segmentTextSections, "segmentTextSections", {
  value: segmentTextSections
}));