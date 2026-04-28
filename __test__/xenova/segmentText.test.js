"use strict";

/**
 * @file segmentText.test.js
 * @brief Unit tests for segmentText (sentence segmentation) and
 * segmentTextSection (paragraph grouping).
 *
 * Key implementation facts reflected in these tests:
 *
 * - segmentText takes ONE argument (text). There is no keepSentenceChunk param.
 * - Delimiters that SPLIT segments: . ! ? ; and control chars \n \r \t (10,13,9)
 * - Delimiters that only TRIM (leading/trailing): , : space and all of the above
 * - Comma (44) and colon (58) appear in the trim loops but NOT in the delimiter
 *   collector, so they trim edges but do not split mid-text.
 * - Adjacent segments are MERGED when the gap between them contains neither
 *   two or more \n (paragraph break) nor a non-whitespace char (c > 32,
 *   i.e. the delimiter that caused the split). Since every sentence-ending
 *   delimiter (. ! ? ;) satisfies c > 32, every sentence split is kept —
 *   the merge only fires when the gap is pure whitespace with a single \n.
 * - Single \n between two sentences → gap contains the \n (c === 10, not > 32)
 *   and nl === 1 (not > 1) → segments ARE merged into one.
 * - Double \n (\n\n) → nl === 2 → segments kept separate.
 * - segmentTextSection groups segments into paragraphs by scanning gaps for
 *   two or more \n characters between consecutive segments.
 */

const segmentText = require("../../src/xenova/segmentText");
const { segmentTextSection } = segmentText;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const toStrings = (text, segs) => segs.map(([s, e]) => text.slice(s, e));

// ─────────────────────────────────────────────────────────────────────────────
// Falsy input
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — falsy input", () => {
  test("null → []",         () => expect(segmentText(null)).toEqual([]));
  test("undefined → []",    () => expect(segmentText(undefined)).toEqual([]));
  test("empty string → []", () => expect(segmentText("")).toEqual([]));
  test("0 → []",            () => expect(segmentText(0)).toEqual([]));
  test("false → []",        () => expect(segmentText(false)).toEqual([]));
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-string coercion
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — non-string coercion", () => {
  test("number coerced to string", () => {
    expect(toStrings("42", segmentText(42))).toEqual(["42"]);
  });

  test("true coerced to 'true'", () => {
    expect(toStrings("true", segmentText(true))).toEqual(["true"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Splitting delimiters — . ! ? ;
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — splitting delimiters", () => {
  test("period splits two sentences", () => {
    const text = "Hello. World";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });

  test("exclamation mark splits", () => {
    const text = "Stop! Go";
    expect(toStrings(text, segmentText(text))).toEqual(["Stop", "Go"]);
  });

  test("question mark splits", () => {
    const text = "Yes? No";
    expect(toStrings(text, segmentText(text))).toEqual(["Yes", "No"]);
  });

  test("semicolon splits", () => {
    const text = "First; Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  test("all splitting delimiters in sequence", () => {
    const text = "a. b! c? d; e";
    expect(toStrings(text, segmentText(text))).toEqual(["a", "b", "c", "d", "e"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trim-only delimiters — , :
// Comma and colon appear in the leading/trailing trim loops but NOT in the
// delimiter collector, so they never split mid-text.
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — trim-only delimiters (, :)", () => {
  test("comma trims leading position", () => {
    const text = ",Hello";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("comma trims trailing position", () => {
    const text = "Hello,";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("colon trims leading position", () => {
    const text = ":Hello";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("colon trims trailing position", () => {
    const text = "Hello:";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("mid-text comma does NOT split — preserved inside segment", () => {
    const text = "Hello, world";
    // comma is trim-only; mid-text comma is not a delimiter
    // result depends on merge logic — gap has comma char (c > 32) → kept separate
    // Actually: comma IS recorded at leading trim only. Mid-text: not in collector.
    // So "Hello, world" → no split → one segment containing the comma.
    expect(toStrings(text, segmentText(text))).toEqual(["Hello, world"]);
  });

  test("mid-text colon does NOT split — preserved inside segment", () => {
    const text = "Key: value";
    expect(toStrings(text, segmentText(text))).toEqual(["Key: value"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Whitespace — space and single \n preserved inside segments
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — whitespace handling", () => {
  test("no punctuation → single segment preserving internal spaces", () => {
    const text = "One sentence only";
    expect(toStrings(text, segmentText(text))).toEqual(["One sentence only"]);
  });

  test("leading whitespace trimmed", () => {
    const text = "   hello";
    expect(toStrings(text, segmentText(text))).toEqual(["hello"]);
  });

  test("trailing whitespace trimmed", () => {
    const text = "hello   ";
    expect(toStrings(text, segmentText(text))).toEqual(["hello"]);
  });

  test("only whitespace → []", () => {
    expect(segmentText("  \n  \t  ")).toEqual([]);
  });

  test("only splitting punctuation → []", () => {
    expect(segmentText(".,;!?")).toEqual([]);
  });

  test("spaces around splitting delimiter excluded from segments", () => {
    const text = "Hello  .  World";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });

  // Single \n between two sentences → gap has \n (c === 10, not > 32) and
  // nl === 1 (not > 1) → the two segments ARE merged.
  test("single \\n between sentences → segments merged into one", () => {
    const text = "Hello\nWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello\nWorld"]);
  });

  // Double \n → nl === 2 → paragraph break → segments kept separate.
  test("double \\n between sentences → segments kept separate", () => {
    const text = "Hello.\n\nWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });

  test("triple \\n → still two separate segments", () => {
    const text = "Hello.\n\n\nWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });

  test("\\r\\n (CRLF) single line ending — merged", () => {
    const text = "Hello\r\nWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello\r\nWorld"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consecutive delimiters
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — consecutive delimiters", () => {
  test("double period — no empty segment", () => {
    const text = "Wait..OK";
    expect(toStrings(text, segmentText(text))).toEqual(["Wait", "OK"]);
  });

  test("ellipsis — no empty segment", () => {
    const text = "Wait...OK";
    expect(toStrings(text, segmentText(text))).toEqual(["Wait", "OK"]);
  });

  test("mixed consecutive delimiters — no empty segments", () => {
    const text = "Hello!?World";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leading / trailing trim
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — leading/trailing trim", () => {
  test("leading punctuation trimmed", () => {
    expect(toStrings("...Hello", segmentText("...Hello"))).toEqual(["Hello"]);
  });

  test("trailing punctuation trimmed", () => {
    expect(toStrings("Hello...", segmentText("Hello..."))).toEqual(["Hello"]);
  });

  test("leading and trailing mixed punctuation trimmed", () => {
    expect(toStrings("!?Hello world.!", segmentText("!?Hello world.!"))).toEqual(["Hello world"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Merge logic — gap analysis
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — merge logic", () => {
  // The gap between prev[1] and p contains the delimiter char + whitespace.
  // c > 32 detects the delimiter char → keeps the split.
  // So every sentence-ending delimiter (. ! ? ;) always keeps the split.
  test("period in gap → split kept (c > 32 fires on '.')", () => {
    const text = "First. Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  test("exclamation in gap → split kept", () => {
    const text = "First! Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  test("question mark in gap → split kept", () => {
    const text = "First? Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  test("semicolon in gap → split kept", () => {
    const text = "First; Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  // Single \n is charCode 10 (not > 32) and nl === 1 (not > 1) → merge.
  test("single \\n only in gap → segments merged", () => {
    const text = "Line one\nLine two";
    expect(toStrings(text, segmentText(text))).toEqual(["Line one\nLine two"]);
  });

  // \n\n → nl === 2 → split kept.
  test("double \\n in gap → split kept", () => {
    const text = "Para one\n\nPara two";
    expect(toStrings(text, segmentText(text))).toEqual(["Para one", "Para two"]);
  });

  test("sentence + single \\n → merge: full text in one segment", () => {
    const text = "Hello world\nStill same para";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello world\nStill same para"]);
  });

  test("sentence + double \\n → separate segments", () => {
    const text = "Hello world.\n\nNew paragraph";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello world", "New paragraph"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-world multi-sentence text
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — real-world text", () => {
  test("multi-sentence paragraph produces one segment per sentence", () => {
    const text = "Biofilm cells activate stress responses. They shift to slower metabolic states. This increases tolerance.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Biofilm cells activate stress responses",
      "They shift to slower metabolic states",
      "This increases tolerance",
    ]);
  });

  test("paragraph with single line breaks → merged segments", () => {
    const text = "First sentence\nSecond sentence\nThird sentence.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "First sentence\nSecond sentence\nThird sentence",
    ]);
  });

  test("two paragraphs with blank line → two segments", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "First paragraph",
      "Second paragraph",
    ]);
  });

  test("em-dash mid-sentence not treated as delimiter", () => {
    const text = "Organisms — including bacteria — form biofilms.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Organisms — including bacteria — form biofilms",
    ]);
  });

  test("hyphenated words not split", () => {
    const text = "High-temperature shock treatments reset microbial populations.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "High-temperature shock treatments reset microbial populations",
    ]);
  });

  test("numeric abbreviations not split mid-sentence", () => {
    const text = "Rotate biocides every 3-6 months. Monitor weekly.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Rotate biocides every 3-6 months",
      "Monitor weekly",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Return shape invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — return shape", () => {
  test("returns an array", () => {
    expect(Array.isArray(segmentText("hello"))).toBe(true);
  });

  test("each element is a two-element array", () => {
    for (const seg of segmentText("a. b. c")) {
      expect(Array.isArray(seg)).toBe(true);
      expect(seg).toHaveLength(2);
    }
  });

  test("start < end for all segments", () => {
    for (const [s, e] of segmentText("Hello. World. How are you?")) {
      expect(s).toBeLessThan(e);
    }
  });

  test("segments do not overlap", () => {
    const segs = segmentText("a. b. c. d");
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i][0]).toBeGreaterThanOrEqual(segs[i - 1][1]);
    }
  });

  test("reconstructed segments have no leading/trailing whitespace", () => {
    const text = "  Hello  .  World  ";
    for (const [s, e] of segmentText(text)) {
      const seg = text.slice(s, e);
      expect(seg).toBe(seg.trim());
    }
  });

  test("module is frozen", () => {
    expect(Object.isFrozen(segmentText)).toBe(true);
  });

  test("segmentText.segmentText references same function", () => {
    expect(segmentText.segmentText).toBe(segmentText);
  });

  test("segmentTextSection exported on segmentText", () => {
    expect(typeof segmentText.segmentTextSection).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — falsy / empty
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — falsy input", () => {
  test("null → []",            () => expect(segmentTextSection(null)).toEqual([]));
  test("undefined → []",       () => expect(segmentTextSection(undefined)).toEqual([]));
  test("empty string → []",    () => expect(segmentTextSection("")).toEqual([]));
  test("only delimiters → []", () => expect(segmentTextSection(".,!?")).toEqual([]));
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — single section
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — single section", () => {
  test("single word → one section with one segment", () => {
    const text = "Hello";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(1);
    expect(text.slice(...sections[0][0])).toBe("Hello");
  });

  test("multi-sentence, no blank line → one section", () => {
    const text = "Hello. World. How are you?";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "World", "How are you"]);
  });

  test("single \\n between sentences — not a blank line → one section", () => {
    const text = "Hello.\nWorld";
    const sections = segmentTextSection(text);
    // segmentText merges these into one segment due to single \n
    expect(sections).toHaveLength(1);
  });

  test("CRLF single line ending — not a blank line → one section", () => {
    const text = "Hello.\r\nWorld";
    expect(segmentTextSection(text)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — multiple sections
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — multiple sections", () => {
  test("two paragraphs separated by \\n\\n", () => {
    const text = "Hello. World.\n\nHow are you?";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "World"]);
    expect(toStrings(text, sections[1])).toEqual(["How are you"]);
  });

  test("three paragraphs", () => {
    const text = "First.\n\nSecond.\n\nThird";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(3);
    expect(toStrings(text, sections[0])).toEqual(["First"]);
    expect(toStrings(text, sections[1])).toEqual(["Second"]);
    expect(toStrings(text, sections[2])).toEqual(["Third"]);
  });

  test("Windows CRLF blank line (\\r\\n\\r\\n) → two sections", () => {
    const text = "Hello.\r\n\r\nWorld";
    expect(segmentTextSection(text)).toHaveLength(2);
  });

  test("three or more newlines → still one section break", () => {
    const text = "Para one.\n\n\n\nPara two";
    expect(segmentTextSection(text)).toHaveLength(2);
  });

  test("multiple segments per section", () => {
    const text = "Hello. Nice day.\n\nHow are you? Fine.";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "Nice day"]);
    expect(toStrings(text, sections[1])).toEqual(["How are you", "Fine"]);
  });

  test("each section is non-empty", () => {
    const text = "A.\n\nB.\n\nC";
    for (const section of segmentTextSection(text)) {
      expect(section.length).toBeGreaterThan(0);
    }
  });

  test("paragraph with internal single \\n → one merged segment in section", () => {
    const text = "Line one\nLine two\n\nNew paragraph.";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
    // First section: the two sentences are merged due to single \n
    expect(sections[0]).toHaveLength(1);
    expect(toStrings(text, sections[1])).toEqual(["New paragraph"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — return shape invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — return shape", () => {
  test("returns an array", () => {
    expect(Array.isArray(segmentTextSection("hello"))).toBe(true);
  });

  test("each section is an array", () => {
    for (const section of segmentTextSection("a. b\n\nc. d")) {
      expect(Array.isArray(section)).toBe(true);
    }
  });

  test("each entry within a section is a two-element array", () => {
    for (const section of segmentTextSection("a. b\n\nc. d")) {
      for (const seg of section) {
        expect(Array.isArray(seg)).toBe(true);
        expect(seg).toHaveLength(2);
      }
    }
  });

  test("flattened sections equal segmentText output", () => {
    const text = "Hello. World.\n\nHow are you?";
    expect(segmentTextSection(text).flat()).toEqual(segmentText(text));
  });

  test("single paragraph — flat equals segmentText", () => {
    const text = "One. Two. Three.";
    expect(segmentTextSection(text).flat()).toEqual(segmentText(text));
  });
});