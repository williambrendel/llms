"use strict";

/**
 * @file segmentText.test.js
 * @brief Unit tests for segmentText().
 *
 * segmentText is now a standalone module. It no longer exports
 * segmentTextSection — that lives in segmentTextSection.js.
 * It does export segmentText.Segment for convenience.
 *
 * Splitting delimiters (collector): . ! ? ; \n \r \t
 * Trim-only (leading/trailing): , : space and all of the above
 * Merge logic: gap between prev[1] and p scanned for nl>1 or c>32 (dl)
 *   - sentence delimiters (. ! ? ;) have c>32 → dl fires → split kept
 *   - single \n has c=10 (not >32), nl=1 (not >1) → segments merged
 *   - \n\n has nl=2 → split kept
 */

const segmentText = require("../../../src/xenova/textSegmentation/segmentText");
const Segment     = require("../../../src/xenova/textSegmentation/Segment");
const Header      = require("../../../src/xenova/textSegmentation/Header");

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
// Returns Segment instances
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — returns Segment instances", () => {
  test("each element is a Segment (Uint32Array)", () => {
    for (const seg of segmentText("a. b. c"))
      expect(seg).toBeInstanceOf(Uint32Array);
  });

  test("each element has length 2", () => {
    for (const seg of segmentText("a. b. c"))
      expect(seg).toHaveLength(2);
  });

  test("segments have .start, .end, .span, .extract", () => {
    const [seg] = segmentText("Hello. World");
    expect(typeof seg.start).toBe("number");
    expect(typeof seg.end).toBe("number");
    expect(typeof seg.span).toBe("number");
    expect(typeof seg.extract).toBe("function");
  });

  test(".extract() works on returned segments", () => {
    const text = "Hello. World";
    const segs = segmentText(text);
    expect(segs[0].extract(text)).toBe("Hello");
    expect(segs[1].extract(text)).toBe("World");
  });

  test(".toJSON() returns plain array", () => {
    const [seg] = segmentText("Hello. World");
    expect(Array.isArray(seg.toJSON())).toBe(true);
    expect(seg.toJSON()).toEqual([seg.start, seg.end]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Splitting delimiters
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — splitting delimiters", () => {
  test("period splits", () => {
    expect(toStrings("Hello. World", segmentText("Hello. World")))
      .toEqual(["Hello", "World"]);
  });

  test("exclamation mark splits", () => {
    expect(toStrings("Stop! Go", segmentText("Stop! Go")))
      .toEqual(["Stop", "Go"]);
  });

  test("question mark splits", () => {
    expect(toStrings("Yes? No", segmentText("Yes? No")))
      .toEqual(["Yes", "No"]);
  });

  test("semicolon splits", () => {
    expect(toStrings("First; Second", segmentText("First; Second")))
      .toEqual(["First", "Second"]);
  });

  test("all sentence delimiters in sequence", () => {
    expect(toStrings("aa. B! C? d; e", segmentText("aa. B! C? d; e")))
      .toEqual(["aa", "B", "C", "d", "e"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trim-only delimiters — , :
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — trim-only delimiters (, :)", () => {
  test("leading comma trimmed",  () => expect(toStrings(",Hello",  segmentText(",Hello"))).toEqual(["Hello"]));
  test("trailing comma trimmed", () => expect(toStrings("Hello,",  segmentText("Hello,"))).toEqual(["Hello"]));
  test("leading colon trimmed",  () => expect(toStrings(":Hello",  segmentText(":Hello"))).toEqual(["Hello"]));
  test("trailing colon trimmed", () => expect(toStrings("Hello:",  segmentText("Hello:"))).toEqual(["Hello"]));

  test("mid-text comma does NOT split", () => {
    expect(toStrings("Hello, world", segmentText("Hello, world")))
      .toEqual(["Hello, world"]);
  });

  test("mid-text colon does NOT split", () => {
    expect(toStrings("Key: value", segmentText("Key: value")))
      .toEqual(["Key: value"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Whitespace handling
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — whitespace handling", () => {
  test("no punctuation → one segment", () => {
    expect(toStrings("One sentence only", segmentText("One sentence only")))
      .toEqual(["One sentence only"]);
  });

  test("leading whitespace trimmed", () => {
    expect(toStrings("   hello", segmentText("   hello"))).toEqual(["hello"]);
  });

  test("trailing whitespace trimmed", () => {
    expect(toStrings("hello   ", segmentText("hello   "))).toEqual(["hello"]);
  });

  test("only whitespace → []", () => {
    expect(segmentText("  \n  \t  ")).toEqual([]);
  });

  test("only punctuation → []", () => {
    expect(segmentText(".,;!?")).toEqual([]);
  });

  test("spaces around delimiter excluded from segments", () => {
    expect(toStrings("Hello  .  World", segmentText("Hello  .  World")))
      .toEqual(["Hello", "World"]);
  });

  test("single \\n between words → merged", () => {
    expect(toStrings("Hello\nWorld", segmentText("Hello\nWorld")))
      .toEqual(["Hello\nWorld"]);
  });

  test("single \\n after sentence delimiter → split kept (. fires dl)", () => {
    expect(toStrings("Hello.\nWorld", segmentText("Hello.\nWorld")))
      .toEqual(["Hello", "World"]);
  });

  test("double \\n → paragraph break → split kept", () => {
    expect(toStrings("Hello.\n\nWorld", segmentText("Hello.\n\nWorld")))
      .toEqual(["Hello", "World"]);
  });

  test("triple \\n → still two segments", () => {
    expect(toStrings("Hello.\n\n\nWorld", segmentText("Hello.\n\n\nWorld")))
      .toEqual(["Hello", "World"]);
  });

  test("single \\r\\n → merged", () => {
    expect(toStrings("Hello\r\nWorld", segmentText("Hello\r\nWorld")))
      .toEqual(["Hello\r\nWorld"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Consecutive delimiters
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — consecutive delimiters", () => {
  test("ellipsis — no empty segment",              () => expect(toStrings("Wait...OK",  segmentText("Wait...OK"))).toEqual(["Wait", "OK"]));
  test("double period — no empty segment",         () => expect(toStrings("Wait..OK",   segmentText("Wait..OK"))).toEqual(["Wait", "OK"]));
  test("mixed consecutive — no empty segments",    () => expect(toStrings("Hello!?World", segmentText("Hello!?World"))).toEqual(["Hello", "World"]));
});

// ─────────────────────────────────────────────────────────────────────────────
// Leading / trailing trim
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — leading/trailing trim", () => {
  test("leading punctuation trimmed",          () => expect(toStrings("...Hello",      segmentText("...Hello"))).toEqual(["Hello"]));
  test("trailing punctuation trimmed",         () => expect(toStrings("Hello...",      segmentText("Hello..."))).toEqual(["Hello"]));
  test("leading and trailing mixed trimmed",   () => expect(toStrings("!?Hello world.!", segmentText("!?Hello world.!"))).toEqual(["Hello world"]));
});

// ─────────────────────────────────────────────────────────────────────────────
// Merge logic
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — merge logic", () => {
  test("period in gap → dl fires → split kept",    () => expect(toStrings("First. Second",  segmentText("First. Second"))).toEqual(["First", "Second"]));
  test("exclamation in gap → split kept",          () => expect(toStrings("First! Second",  segmentText("First! Second"))).toEqual(["First", "Second"]));
  test("question in gap → split kept",             () => expect(toStrings("First? Second",  segmentText("First? Second"))).toEqual(["First", "Second"]));
  test("semicolon in gap → split kept",            () => expect(toStrings("First; Second",  segmentText("First; Second"))).toEqual(["First", "Second"]));

  test("single \\n only in gap → merge", () => {
    expect(toStrings("Line one\nLine two", segmentText("Line one\nLine two")))
      .toEqual(["Line one\nLine two"]);
  });

  test("double \\n → nl=2 → split kept", () => {
    expect(toStrings("Para one\n\nPara two", segmentText("Para one\n\nPara two")))
      .toEqual(["Para one", "Para two"]);
  });

  test("sentence + single \\n → . fires dl → split kept", () => {
    expect(toStrings("Hello world.\nStill same", segmentText("Hello world.\nStill same")))
      .toEqual(["Hello world", "Still same"]);
  });

  test("sentence + double \\n → two segments", () => {
    expect(toStrings("Hello world.\n\nNew para", segmentText("Hello world.\n\nNew para")))
      .toEqual(["Hello world", "New para"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-world text
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — real-world text", () => {
  test("multi-sentence paragraph", () => {
    const text = "Biofilm cells activate stress responses. They shift to slower metabolic states. This increases tolerance.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Biofilm cells activate stress responses",
      "They shift to slower metabolic states",
      "This increases tolerance",
    ]);
  });

  test("single \\n line breaks — . fires dl → each sentence split", () => {
    const text = "First sentence.\nSecond sentence.\nThird sentence.";
    expect(toStrings(text, segmentText(text))).toEqual([
      "First sentence", "Second sentence", "Third sentence",
    ]);
  });

  test("two paragraphs with blank line", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    expect(toStrings(text, segmentText(text))).toEqual(["First paragraph", "Second paragraph"]);
  });

  test("em-dash not a delimiter", () => {
    const text = "Organisms — including bacteria — form biofilms.";
    expect(toStrings(text, segmentText(text))).toEqual(["Organisms — including bacteria — form biofilms"]);
  });

  test("hyphenated words not split", () => {
    const text = "High-temperature shock treatments reset microbial populations.";
    expect(toStrings(text, segmentText(text))).toEqual(["High-temperature shock treatments reset microbial populations"]);
  });

  test("numeric range not split", () => {
    const text = "Rotate biocides every 3-6 months. Monitor weekly.";
    expect(toStrings(text, segmentText(text))).toEqual(["Rotate biocides every 3-6 months", "Monitor weekly"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Return shape invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — return shape", () => {
  test("returns an Array", () => {
    expect(Array.isArray(segmentText("hello"))).toBe(true);
  });

  test("start < end for all segments", () => {
    for (const seg of segmentText("Hello. World. How are you?"))
      expect(seg.start).toBeLessThan(seg.end);
  });

  test("segments do not overlap", () => {
    const segs = segmentText("a. b. c. d");
    for (let i = 1; i < segs.length; i++)
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
  });

  test("reconstructed segments have no leading/trailing whitespace", () => {
    const text = "  Hello  .  World  ";
    for (const seg of segmentText(text)) {
      const str = seg.extract(text);
      expect(str).toBe(str.trim());
    }
  });

  test("module is frozen", () => {
    expect(Object.isFrozen(segmentText)).toBe(true);
  });

  test("segmentText.segmentText self-reference", () => {
    expect(segmentText.segmentText).toBe(segmentText);
  });

  test("segmentText.Segment is the Segment class", () => {
    expect(segmentText.Segment).toBe(Segment);
  });

  test("segmentText does NOT export segmentTextSection", () => {
    // segmentTextSection is now a separate module
    expect(segmentText.segmentTextSection).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentText — dot protection (decimals, acronyms, abbrevs, outlines, URLs)
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — dot protection: decimals", () => {
  test("simple decimal not split", () => {
    const text = "The value is 3.14 in this case";
    expect(toStrings(text, segmentText(text))).toEqual([
      "The value is 3.14 in this case",
    ]);
  });

  test("decimal between sentences keeps real boundaries only", () => {
    const text = "Pi equals 3.14. The next sentence follows";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Pi equals 3.14",
      "The next sentence follows",
    ]);
  });

  test("multiple decimals in one sentence", () => {
    const text = "Values 1.5, 2.7, and 3.14159 were measured";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Values 1.5, 2.7, and 3.14159 were measured",
    ]);
  });

  test("thousands-separator decimal not split", () => {
    const text = "Total was 1,234.56 dollars";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Total was 1,234.56 dollars",
    ]);
  });

  test("leading-dot decimal not split", () => {
    const text = "Confidence is .95 in this trial";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Confidence is .95 in this trial",
    ]);
  });
});

describe("segmentText — dot protection: acronyms and initials", () => {
  test("U.S.A. mid-sentence not split", () => {
    const text = "She moved to the U.S.A. last year";
    expect(toStrings(text, segmentText(text))).toEqual([
      "She moved to the U.S.A. last year",
    ]);
  });

  test("U.S.A.. at sentence end — trailing dot is the boundary", () => {
    const text = "She moved to the U.S.A. . The year was 2020";
    const result = toStrings(text, segmentText(text));
    // First segment must contain the full acronym
    expect(result[0]).toContain("U.S.A.");
    expect(result).toHaveLength(2);
  });

  test("U.S.A. mid-sentence not split (trailing dot absorbed into acronym)", () => {
    const text = "She moved to the U.S.A. The year was 2020";
    const result = toStrings(text, segmentText(text));
    // Acronym pattern includes the trailing dot, so no sentence boundary remains.
    // This is a known trade-off: protecting the abbreviation loses the sentence break.
    expect(result).toEqual(["She moved to the U.S.A. The year was 2020"]);
  });

  test("two-letter initials J.K. not split", () => {
    const text = "J.K. Rowling wrote the book";
    expect(toStrings(text, segmentText(text))).toEqual([
      "J.K. Rowling wrote the book",
    ]);
  });

  test("e.g. mid-sentence not split", () => {
    const text = "Citrus fruits, e.g. oranges and lemons, are acidic";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Citrus fruits, e.g. oranges and lemons, are acidic",
    ]);
  });

  test("i.e. mid-sentence not split", () => {
    const text = "The mean, i.e. the average value, was reported";
    expect(toStrings(text, segmentText(text))).toEqual([
      "The mean, i.e. the average value, was reported",
    ]);
  });
});

describe("segmentText — dot protection: honorifics and abbreviations", () => {
  test.each([
    ["Dr. Smith arrived early today", "Dr. Smith arrived early today"],
    ["Mr. Jones called the office", "Mr. Jones called the office"],
    ["Mrs. Davis agreed to attend", "Mrs. Davis agreed to attend"],
    ["Ms. Lee responded promptly", "Ms. Lee responded promptly"],
    ["Prof. Allen taught the class", "Prof. Allen taught the class"],
    ["See Fig. 3 below for details", "See Fig. 3 below for details"],
    ["Refer to Eq. 12 in the paper", "Refer to Eq. 12 in the paper"],
    ["Vol. 5 of the journal series", "Vol. 5 of the journal series"],
  ])("does not split on abbreviation: %s", (input, expected) => {
    expect(toStrings(input, segmentText(input))).toEqual([expected]);
  });

  test("Dr. and real sentence boundary in same text", () => {
    const text = "Dr. Smith reported the result. The team agreed";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Dr. Smith reported the result",
      "The team agreed",
    ]);
  });

  test("et al. mid-sentence not split", () => {
    const text = "Smith et al. demonstrated the effect clearly";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Smith et al. demonstrated the effect clearly",
    ]);
  });
});

describe("segmentText — dot protection: outline numbering", () => {
  test("multi-level numbering 1.2.3 not split mid-sentence", () => {
    const text = "Refer to section 1.2.3 for the proof";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Refer to section 1.2.3 for the proof",
    ]);
  });

  test("multi-level mixed A.1.b not split", () => {
    const text = "See appendix A.1.b for the full table";
    expect(toStrings(text, segmentText(text))).toEqual([
      "See appendix A.1.b for the full table",
    ]);
  });
});

describe("segmentText — dot protection: URLs, emails, filenames", () => {
  test("https URL not split", () => {
    const text = "Visit https://example.com for more info";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Visit https://example.com for more info",
    ]);
  });

  test("www URL not split", () => {
    const text = "Go to www.example.com today";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Go to www.example.com today",
    ]);
  });

  test("email not split", () => {
    const text = "Contact user@example.com about the issue";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Contact user@example.com about the issue",
    ]);
  });

  test("email with dotted local part not split", () => {
    const text = "Reach john.doe@company.co.uk for support";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Reach john.doe@company.co.uk for support",
    ]);
  });

  test("filename with extension not split", () => {
    const text = "Open the file.txt to begin";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Open the file.txt to begin",
    ]);
  });

  test("compound extension not split", () => {
    const text = "Extract archive.tar.gz to a folder";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Extract archive.tar.gz to a folder",
    ]);
  });
});

describe("segmentText — dot protection: indices remap to original text", () => {
  test("segment indices index into original (un-protected) text", () => {
    const text = "Dr. Smith found pi = 3.14. Done";
    const segs = segmentText(text);
    // Each segment, when sliced from the ORIGINAL text, should yield readable content
    const reconstructed = segs.map((s) => s.extract(text));
    expect(reconstructed[0]).toContain("Dr. Smith");
    expect(reconstructed[0]).toContain("3.14");
    expect(reconstructed[reconstructed.length - 1]).toContain("Done");
  });

  test("indices monotonically increase", () => {
    const text = "Dr. Smith said pi = 3.14. See Fig. 2 for details. End";
    const segs = segmentText(text);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
  });

  test("no segment exposes a placeholder token character (\\x00)", () => {
    const text = "Dr. Smith uses 3.14 daily. Mr. Lee agrees";
    for (const seg of segmentText(text)) {
      expect(seg.extract(text)).not.toMatch(/\x00/);
    }
  });

  test("dense protection: many patterns in one segment", () => {
    const text =
      "Dr. Smith (e.g. at https://example.com) reports pi = 3.14 in Fig. 2";
    expect(toStrings(text, segmentText(text))).toEqual([
      "Dr. Smith (e.g. at https://example.com) reports pi = 3.14 in Fig. 2",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentText — delimiter-line ("rule") segments
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — delimiter lines", () => {
  // Note: by default segmentText filters out delim segments after collection,
  // but the segments adjacent to a delim line should still get hasDelimLineBefore.
  // These tests confirm the delim is recognized and acts as a paragraph break.

  test.each([
    ["---", "dashes"],
    ["===", "equals"],
    ["***", "asterisks"],
    ["___", "underscores"],
    ["+++", "plusses"],
    ["~~~", "tildes"],
  ])("%s line splits surrounding text into separate segments (%s)", (rule) => {
    const text = `Before paragraph\n\n${rule}\n\nAfter paragraph`;
    const result = toStrings(text, segmentText(text));
    expect(result).toEqual(["Before paragraph", "After paragraph"]);
  });

  test("longer rule line still recognized", () => {
    const text = "Before\n\n----------\n\nAfter";
    expect(toStrings(text, segmentText(text))).toEqual(["Before", "After"]);
  });

  test("rule with mixed characters NOT treated as delimiter line", () => {
    // "-=-" is not homogeneous and should be left as content
    const text = "Before\n\n-=-\n\nAfter";
    const result = toStrings(text, segmentText(text));
    // The "-=-" line itself remains as a segment somewhere
    expect(result.some((s) => s.includes("-=-"))).toBe(true);
  });

  test("rule line shorter than 3 chars NOT a delimiter", () => {
    // "--" has only 2 chars, fails the length check in isDelimiterSegment
    const text = "Before\n\n--\n\nAfter";
    const result = toStrings(text, segmentText(text));
    expect(result.some((s) => s.includes("--"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentText — header detection
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — markdown headers", () => {
  test("level-1 markdown header recognized at document start", () => {
    const text = "# Title\n\nBody paragraph here";
    const segs = segmentText(text);
    expect(segs[0]).toBeInstanceOf(Header);
    expect(segs[0].level).toBe(1);
  });

  test("level-2 markdown header", () => {
    const text = "## Subtitle\n\nBody text";
    const segs = segmentText(text);
    expect(segs[0]).toBeInstanceOf(Header);
    expect(segs[0].level).toBe(2);
  });

  test("level-3 markdown header", () => {
    const text = "### Subsubtitle\n\nBody text";
    const segs = segmentText(text);
    expect(segs[0]).toBeInstanceOf(Header);
    expect(segs[0].level).toBe(3);
  });

  test("markdown header surrounded by paragraphs", () => {
    const text = "First paragraph.\n\n## Section Two\n\nSecond paragraph";
    const segs = segmentText(text);
    // Find the Header instance
    const headerSeg = segs.find((s) => s instanceof Header);
    expect(headerSeg).toBeDefined();
    expect(headerSeg.level).toBe(2);
    expect(headerSeg.extract(text)).toContain("Section Two");
  });

  test("hash mid-sentence is NOT a header", () => {
    const text = "The price is # 5 dollars";
    const segs = segmentText(text);
    expect(segs[0]).not.toBeInstanceOf(Header);
  });

  test("header followed by another header", () => {
    const text = "# Title\n\n## Subtitle\n\nBody";
    const segs = segmentText(text);
    const headers = segs.filter((s) => s instanceof Header);
    expect(headers).toHaveLength(2);
    expect(headers[0].level).toBe(1);
    expect(headers[1].level).toBe(2);
  });
});

describe("segmentText — ordered headers (numbered titles)", () => {
  // These rely on detectOrderedHeader's behavior; tests assume it recognizes
  // common patterns like "1. Title", "A. Title", etc., when the segment is
  // bracketed by paragraph breaks.

  test("numbered title between paragraphs treated as header", () => {
    const text = "Intro paragraph.\n\n1. Methods\n\nMethods paragraph";
    const segs = segmentText(text);
    const headerSeg = segs.find((s) => s instanceof Header);
    expect(headerSeg).toBeDefined();
    expect(headerSeg.extract(text)).toContain("Methods");
  });

  test("numbered item inside paragraph (no blank lines) NOT a header", () => {
    const text = "Some intro. 1. inline thing. More text";
    const segs = segmentText(text);
    expect(segs.some((s) => s instanceof Header)).toBe(false);
  });
});

describe("segmentText — header detection gating", () => {
  test("merged multi-line segment (hasNewline) NOT promoted to header", () => {
    // "# Foo\nbar" merges across single \n → hasNewline=true → not a header
    const text = "# Foo\nbar baz\n\nNext paragraph";
    const segs = segmentText(text);
    expect(segs[0]).not.toBeInstanceOf(Header);
  });

  test("trailing header detected at end of document", () => {
    const text = "Body paragraph here.\n\n# Trailing";
    const segs = segmentText(text);
    // Trailing header is now detected — EOF acts as an after-boundary.
    expect(segs[segs.length - 1]).toBeInstanceOf(Header);
    expect(segs[segs.length - 1].level).toBe(1);
  });
});

describe("segmentText — Header class shape", () => {
  test("Header extends Segment (Uint32Array)", () => {
    const text = "# Title\n\nBody";
    const segs = segmentText(text);
    const header = segs.find((s) => s instanceof Header);
    expect(header).toBeInstanceOf(Uint32Array);
    expect(header).toHaveLength(2);
  });
});