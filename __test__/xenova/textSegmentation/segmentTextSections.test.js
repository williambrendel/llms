"use strict";

/**
 * @file segmentTextSections.test.js
 * @brief Unit tests for segmentTextSections().
 *
 * segmentTextSections returns Section[] forming a hierarchical tree:
 * - Headers create sections; same-level headers are siblings, deeper headers
 *   nest as children, shallower headers pop back up.
 * - Body segments attach to the currently open header section, or accumulate
 *   into root-level body sections (split by blank lines) when no header is open.
 * - Use Section.flatten() for depth-first linear traversal of the tree.
 */

const segmentTextSections = require("../../../src/xenova/textSegmentation/segmentTextSections");
const segmentText        = require("../../../src/xenova/textSegmentation/segmentText");
const Segment            = require("../../../src/xenova/textSegmentation/Segment");
const Section            = require("../../../src/xenova/textSegmentation/Section");
const Header             = require("../../../src/xenova/textSegmentation/Header");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const toStrings = (text, segs) => segs.map((s) => text.slice(s[0], s[1]));

/** Collect all body segments (non-Section, non-Header) from a section subtree. */
const allBodySegments = (section) =>
  section.flatten().filter((x) => x instanceof Segment && !(x instanceof Header));

/** Collect all sections (including nested) from an array of top-level sections. */
const allSections = (sections) =>
  sections.flatMap((s) => s.flatten()).filter((x) => x instanceof Section);

// ─────────────────────────────────────────────────────────────────────────────
// Falsy input
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — falsy input", () => {
  test("null → []",            () => expect(segmentTextSections(null)).toEqual([]));
  test("undefined → []",       () => expect(segmentTextSections(undefined)).toEqual([]));
  test("empty string → []",    () => expect(segmentTextSections("")).toEqual([]));
  test("only delimiters → []", () => expect(segmentTextSections(".,!?")).toEqual([]));
  test("only whitespace → []", () => expect(segmentTextSections("  \n  ")).toEqual([]));
});

// ─────────────────────────────────────────────────────────────────────────────
// Returns Section instances
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — returns Section instances", () => {
  test("each top-level entry is a Section", () => {
    for (const section of segmentTextSections("Hello. World.\n\nHow are you?"))
      expect(section).toBeInstanceOf(Section);
  });

  test("constructor.name is Section", () => {
    const [section] = segmentTextSections("Hello. World.");
    expect(section.constructor.name).toBe("Section");
  });

  test("body elements are Segment instances", () => {
    for (const section of segmentTextSections("Hello. World.\n\nHow are you?")) {
      for (const child of section) {
        // Children may be Segment, Header, or Section. For header-less input,
        // expect only Segment.
        expect(child).toBeInstanceOf(Uint32Array);
      }
    }
  });

  test("section .start and .end are defined and numeric", () => {
    const [section] = segmentTextSections("Hello. World.");
    expect(typeof section.start).toBe("number");
    expect(typeof section.end).toBe("number");
  });

  test("section .extract() returns correct paragraph text", () => {
    const text = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSections(text);
    expect(sections[1].extract(text)).toBe("How are you");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Header-free input — flat top-level sections
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — header-free single section", () => {
  test("single word → one section with one segment", () => {
    const text     = "Hello";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(1);
    expect(sections[0][0].extract(text)).toBe("Hello");
  });

  test("multi-sentence, no blank line → one section", () => {
    const text = "Hello. World. How are you?";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(1);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "World", "How are you"]);
  });

  test("single \\n between words → merged → one section, one segment", () => {
    const sections = segmentTextSections("Hello\nWorld");
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(1);
  });

  test("CRLF single line ending → same section", () => {
    expect(segmentTextSections("Hello.\r\nWorld")).toHaveLength(1);
  });
});

describe("segmentTextSections — header-free multiple sections", () => {
  test("two paragraphs separated by \\n\\n", () => {
    const text     = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "World"]);
    expect(toStrings(text, sections[1])).toEqual(["How are you"]);
  });

  test("three paragraphs", () => {
    const text     = "First.\n\nSecond.\n\nThird";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(3);
    expect(toStrings(text, sections[0])).toEqual(["First"]);
    expect(toStrings(text, sections[1])).toEqual(["Second"]);
    expect(toStrings(text, sections[2])).toEqual(["Third"]);
  });

  test("Windows CRLF blank line (\\r\\n\\r\\n) → two sections", () => {
    expect(segmentTextSections("Hello.\r\n\r\nWorld")).toHaveLength(2);
  });

  test("three or more newlines → still one section break", () => {
    expect(segmentTextSections("Para one.\n\n\n\nPara two")).toHaveLength(2);
  });

  test("multiple segments per section", () => {
    const text     = "Hello. Nice day.\n\nHow are you? Fine.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "Nice day"]);
    expect(toStrings(text, sections[1])).toEqual(["How are you", "Fine"]);
  });

  test("each section is non-empty", () => {
    for (const section of segmentTextSections("A.\n\nB.\n\nC"))
      expect(section.length).toBeGreaterThan(0);
  });

  test("paragraph with internal single \\n → one merged segment in section", () => {
    const text     = "Line one\nLine two\n\nNew paragraph.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveLength(1);
    expect(toStrings(text, sections[1])).toEqual(["New paragraph"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section geometry
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — section geometry", () => {
  test(".start is start of first segment", () => {
    const text     = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSections(text);
    expect(sections[0].start).toBe(0);
    expect(sections[1].start).toBe(15);
  });

  test(".end is end of last segment", () => {
    const text     = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSections(text);
    expect(sections[0].end).toBe(12);
    expect(sections[1].end).toBe(26);
  });

  test(".span equals end - start", () => {
    const text     = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSections(text);
    expect(sections[0].span).toBe(sections[0].end - sections[0].start);
    expect(sections[1].span).toBe(sections[1].end - sections[1].start);
  });

  test(".extract() returns full paragraph including inter-segment gap", () => {
    const text = "Hello. World.\n\nHow are you?";
    expect(segmentTextSections(text)[0].extract(text)).toBe("Hello. World");
  });

  test(".intersectsWith, .isWithin, .contains are functions", () => {
    const [section] = segmentTextSections("Hello. World.");
    expect(typeof section.intersectsWith).toBe("function");
    expect(typeof section.isWithin).toBe("function");
    expect(typeof section.contains).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// protectDots integration
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — protectDots integration", () => {
  test("'Dr.' does not split a section", () => {
    const text = "Dr. Smith reported the result.\n\nThe team agreed";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0][0].extract(text)).toContain("Dr. Smith");
  });

  test("decimal number does not split a section's segments", () => {
    const text = "The value is 3.14 in the formula.\n\nNext paragraph";
    const sections = segmentTextSections(text);
    expect(sections[0]).toHaveLength(1);
    expect(sections[0][0].extract(text)).toContain("3.14");
  });

  test("URL inside paragraph does not split section", () => {
    const text = "Visit https://example.com today.\n\nNext paragraph";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0][0].extract(text)).toContain("https://example.com");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical headers — single header
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — single header", () => {
  test("header at document start creates one section containing it", () => {
    const text = "# Title\n\nBody paragraph.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].header).toBeInstanceOf(Header);
    expect(sections[0].header.level).toBe(1);
  });

  test("header section contains the body as direct child", () => {
    const text = "# Title\n\nBody paragraph.";
    const [section] = segmentTextSections(text);
    // section[0] is the Header; section[1] is the body Segment
    expect(section[0]).toBeInstanceOf(Header);
    expect(section[1]).toBeInstanceOf(Segment);
    expect(section[1]).not.toBeInstanceOf(Header);
  });

  test("header.extractTitle returns the title text", () => {
    const text = "## Methods\n\nWe used X.";
    const [section] = segmentTextSections(text);
    expect(section.header.extractTitle(text)).toBe("Methods");
  });

  test("section.level mirrors header.level", () => {
    const text = "### Deep\n\nbody.";
    const [section] = segmentTextSections(text);
    expect(section.level).toBe(3);
  });

  test("section.content excludes the header", () => {
    const text = "# Title\n\nFirst sentence. Second sentence.";
    const [section] = segmentTextSections(text);
    expect(section.content).toHaveLength(2);
    expect(section.content[0]).not.toBeInstanceOf(Header);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical headers — siblings (same level)
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — same-level headers as siblings", () => {
  test("two level-2 headers produce two top-level sections", () => {
    const text = "## A\n\nBody A.\n\n## B\n\nBody B.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header.level).toBe(2);
    expect(sections[1].header.level).toBe(2);
  });

  test("siblings do not nest", () => {
    const text = "# A\n\nbody.\n\n# B";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    // Neither section should contain a child Section
    for (const section of sections) {
      const childSections = section.filter((c) => c instanceof Section);
      expect(childSections).toHaveLength(0);
    }
  });

  test("each sibling section owns its body", () => {
    const text = "## A\n\nBody A.\n\n## B\n\nBody B.";
    const sections = segmentTextSections(text);
    expect(sections[0][1].extract(text)).toContain("Body A");
    expect(sections[1][1].extract(text)).toContain("Body B");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical headers — nesting
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — nested headers", () => {
  test("level-2 inside level-1 nests as child", () => {
    const text = "# Top\n\nIntro.\n\n## Sub\n\nSub body.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(1);
    const top = sections[0];
    expect(top.header.level).toBe(1);
    const child = top.find((c) => c instanceof Section);
    expect(child).toBeDefined();
    expect(child.header.level).toBe(2);
  });

  test("intro body lives in the parent, not in the child", () => {
    const text = "# Top\n\nIntro paragraph.\n\n## Sub\n\nSub body.";
    const [top] = segmentTextSections(text);
    // Top-level body segments (not Sections) before the child
    const topBody = top.filter(
      (c) => c instanceof Segment && !(c instanceof Header) && !(c instanceof Section)
    );
    expect(topBody).toHaveLength(1);
    expect(topBody[0].extract(text)).toContain("Intro paragraph");
  });

  test("multiple level-2 children of one level-1", () => {
    const text = "# Top\n\n## A\n\nbody a.\n\n## B\n\nbody b.";
    const [top] = segmentTextSections(text);
    const children = top.filter((c) => c instanceof Section);
    expect(children).toHaveLength(2);
    expect(children[0].header.level).toBe(2);
    expect(children[1].header.level).toBe(2);
  });

  test("three-level nesting — # → ## → ###", () => {
    const text = "# A\n\n## B\n\n### C\n\ndeep body.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(1);
    const a = sections[0];
    const b = a.find((c) => c instanceof Section);
    expect(b).toBeDefined();
    expect(b.header.level).toBe(2);
    const c = b.find((c) => c instanceof Section);
    expect(c).toBeDefined();
    expect(c.header.level).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical headers — popping back up
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — header level pop-back", () => {
  test("higher-level header (smaller number) closes deeper sections", () => {
    const text = "## A\n\n### B\n\n# C";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header.level).toBe(2);
    expect(sections[1].header.level).toBe(1);
  });

  test("level-1 after level-3 pops back to root", () => {
    const text = "# A\n\n### Deep\n\n# B";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header.level).toBe(1);
    expect(sections[1].header.level).toBe(1);
  });

  test("partial pop — ### then ## attaches as sibling of parent", () => {
    // # A contains ### B; then ## C should be a child of # A, not nested in B.
    const text = "# A\n\n### B\n\n## C";
    const [a] = segmentTextSections(text);
    const children = a.filter((c) => c instanceof Section);
    expect(children).toHaveLength(2);
    expect(children[0].header.level).toBe(3);
    expect(children[1].header.level).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Body before any header
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — body before first header", () => {
  test("preserved as top-level body sections", () => {
    const text = "Intro paragraph.\n\n# Title\n\nBody.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].header).toBeUndefined();
    expect(sections[1].header).toBeDefined();
    expect(sections[1].header.level).toBe(1);
  });

  test("multiple pre-header paragraphs split on blank lines", () => {
    const text = "First intro.\n\nSecond intro.\n\n# Title\n\nBody.";
    const sections = segmentTextSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0].header).toBeUndefined();
    expect(sections[1].header).toBeUndefined();
    expect(sections[2].header.level).toBe(1);
  });

  test("pre-header prose with multiple sentences in one paragraph", () => {
    const text = "Sentence one. Sentence two.\n\n# Title\n\nBody.";
    const sections = segmentTextSections(text);
    expect(sections[0]).toHaveLength(2); // two sentence segments, no header
    expect(sections[0].header).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// flatten() depth-first traversal
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — flatten() document order", () => {
  test("flatten visits header then body", () => {
    const text = "# Title\n\nBody.";
    const [section] = segmentTextSections(text);
    const flat = section.flatten();
    expect(flat[0]).toBe(section);
    expect(flat[1]).toBeInstanceOf(Header);
    expect(flat[2]).toBeInstanceOf(Segment);
    expect(flat[2]).not.toBeInstanceOf(Header);
  });

  test("flatten descends into nested sections", () => {
    const text = "# Top\n\nIntro.\n\n## Sub\n\nSub body.";
    const [top] = segmentTextSections(text);
    const flat = top.flatten();
    // Sequence: top, Header(Top), intro Segment, sub Section, Header(Sub), sub body Segment
    expect(flat[0]).toBe(top);
    expect(flat[1]).toBeInstanceOf(Header);
    expect(flat[1].level).toBe(1);
    // Last header in the flat list should be level 2
    const headers = flat.filter((x) => x instanceof Header);
    expect(headers).toHaveLength(2);
    expect(headers[1].level).toBe(2);
  });

  test("body segments from all levels recoverable via flatten", () => {
    const text = "# A\n\nA body.\n\n## B\n\nB body.";
    const [top] = segmentTextSections(text);
    const bodies = allBodySegments(top);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].extract(text)).toContain("A body");
    expect(bodies[1].extract(text)).toContain("B body");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consistency with segmentText
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — consistency with segmentText (deep)", () => {
  test("deeply flattened output matches segmentText (header-free input)", () => {
    const text = "Hello. World.\n\nHow are you?";
    const flat = segmentTextSections(text)
      .flatMap((s) => s.flatten())
      .filter((x) => x instanceof Segment);
    const segs = segmentText(text);
    expect(flat.length).toBe(segs.length);
    flat.forEach((seg, i) => {
      expect(seg[0]).toBe(segs[i][0]);
      expect(seg[1]).toBe(segs[i][1]);
    });
  });

  test("deeply flattened output matches segmentText (with headers)", () => {
    const text = "# Title\n\nBody one. Body two.\n\n## Sub\n\nSub body.";
    const flat = segmentTextSections(text)
      .flatMap((s) => s.flatten())
      .filter((x) => x instanceof Segment);
    const segs = segmentText(text);
    expect(flat.length).toBe(segs.length);
    flat.forEach((seg, i) => {
      expect(seg[0]).toBe(segs[i][0]);
      expect(seg[1]).toBe(segs[i][1]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module export
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSections — module export", () => {
  test("module is frozen", () => {
    expect(Object.isFrozen(segmentTextSections)).toBe(true);
  });

  test("self-reference", () => {
    expect(segmentTextSections.segmentTextSections).toBe(segmentTextSections);
  });

  test("Segment re-export", () => {
    expect(segmentTextSections.Segment).toBe(Segment);
  });

  test("Section re-export", () => {
    expect(segmentTextSections.Section).toBe(Section);
  });

  test("Header re-export", () => {
    expect(segmentTextSections.Header).toBe(Header);
  });

  test("segmentText re-export", () => {
    expect(segmentTextSections.segmentText).toBe(segmentText);
  });
});