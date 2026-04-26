"use strict";

/**
 * @file segmentText.test.js
 * @brief Unit tests for segmentText (sentence and word mode) and
 * segmentTextSection (paragraph grouping).
 */

const segmentText = require("../../src/utilities/segmentText");
const { segmentTextSection } = segmentText;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const toStrings = (text, segs) => segs.map(([s, e]) => text.slice(s, e));

// ─────────────────────────────────────────────────────────────────────────────
// Falsy input
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — falsy input", () => {
  test("null → []",          () => expect(segmentText(null)).toEqual([]));
  test("undefined → []",     () => expect(segmentText(undefined)).toEqual([]));
  test("empty string → []",  () => expect(segmentText("")).toEqual([]));
  test("0 → []",             () => expect(segmentText(0)).toEqual([]));
  test("false → []",         () => expect(segmentText(false)).toEqual([]));
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-string coercion
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — non-string coercion", () => {
  test("integer coerced to string", () => {
    expect(toStrings("42", segmentText(42))).toEqual(["42"]);
  });

  test("true coerced to 'true'", () => {
    expect(toStrings("true", segmentText(true))).toEqual(["true"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sentence mode (keepSentenceChunk = true, default)
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — sentence mode (default)", () => {
  // ── basic splits ──────────────────────────────────────────────────────────

  test("no punctuation → single segment (spaces preserved)", () => {
    const text = "One sentence only";
    expect(toStrings(text, segmentText(text))).toEqual(["One sentence only"]);
  });

  test("comma splits two phrases", () => {
    const text = "Hello, world";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "world"]);
  });

  test("period splits two phrases", () => {
    const text = "Hello. World";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "World"]);
  });

  test("exclamation mark splits", () => {
    const text = "Stop!Go";
    expect(toStrings(text, segmentText(text))).toEqual(["Stop", "Go"]);
  });

  test("question mark splits", () => {
    const text = "Yes?No";
    expect(toStrings(text, segmentText(text))).toEqual(["Yes", "No"]);
  });

  test("colon splits", () => {
    const text = "Key:Value";
    expect(toStrings(text, segmentText(text))).toEqual(["Key", "Value"]);
  });

  test("semicolon splits", () => {
    const text = "First;Second";
    expect(toStrings(text, segmentText(text))).toEqual(["First", "Second"]);
  });

  test("all punctuation delimiters in one string", () => {
    const text = "a!b,c.d:e;f?g";
    expect(toStrings(text, segmentText(text))).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });

  // ── whitespace not a delimiter in sentence mode ───────────────────────────

  test("space mid-text preserved inside segment", () => {
    const text = "Hello world";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello world"]);
  });

  test("tab mid-text preserved inside segment", () => {
    const text = "Hello\tWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello\tWorld"]);
  });

  test("newline mid-text preserved inside segment", () => {
    const text = "Hello\nWorld";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello\nWorld"]);
  });

  // ── trim ──────────────────────────────────────────────────────────────────

  test("trailing '?' trimmed from final segment", () => {
    const text = "Hello, world. How are you?";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "world", "How are you"]);
  });

  test("leading punctuation trimmed", () => {
    const text = "...Hello";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("trailing punctuation trimmed", () => {
    const text = "Hello...";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello"]);
  });

  test("leading and trailing whitespace trimmed", () => {
    const text = "   hello   ";
    expect(toStrings(text, segmentText(text))).toEqual(["hello"]);
  });

  test("only whitespace → []", () => {
    expect(segmentText("  \n  ")).toEqual([]);
  });

  test("only punctuation → []", () => {
    expect(segmentText(".,;:!?")).toEqual([]);
  });

  // ── whitespace adjacent to delimiter excluded ─────────────────────────────

  test("spaces around comma excluded from segments", () => {
    const text = "Hello  ,  world";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "world"]);
  });

  // ── consecutive delimiters ────────────────────────────────────────────────

  test("double comma — empty segment silently discarded", () => {
    const text = "Hello,,world";
    expect(toStrings(text, segmentText(text))).toEqual(["Hello", "world"]);
  });

  test("ellipsis — no empty segments", () => {
    const text = "Wait...OK";
    expect(toStrings(text, segmentText(text))).toEqual(["Wait", "OK"]);
  });

  // ── docstring example ─────────────────────────────────────────────────────

  test("docstring example — exact index pairs", () => {
    const text = "Hello, world. How are you?";
    expect(segmentText(text)).toEqual([[0, 5], [7, 12], [14, 25]]);
    expect(text.slice(14, 25)).toBe("How are you");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Word mode (keepSentenceChunk = false)
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentText — word mode (keepSentenceChunk=false)", () => {
  test("space splits words", () => {
    const text = "Hello World";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("tab splits words", () => {
    const text = "Hello\tWorld";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("newline splits words", () => {
    const text = "Hello\nWorld";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("carriage return splits words", () => {
    const text = "Hello\rWorld";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("multiple spaces — single gap, no empty segment", () => {
    const text = "Hello   World";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("three-word phrase split into three segments", () => {
    const text = "One sentence only";
    expect(toStrings(text, segmentText(text, false))).toEqual(["One", "sentence", "only"]);
  });

  test("punctuation also splits in word mode", () => {
    const text = "Hello,World";
    expect(toStrings(text, segmentText(text, false))).toEqual(["Hello", "World"]);
  });

  test("falsy → []", () => {
    expect(segmentText("", false)).toEqual([]);
    expect(segmentText(null, false)).toEqual([]);
  });

  test("only whitespace → []", () => {
    expect(segmentText("   \t\n  ", false)).toEqual([]);
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
    for (const seg of segmentText("a, b, c")) {
      expect(Array.isArray(seg)).toBe(true);
      expect(seg).toHaveLength(2);
    }
  });

  test("start < end for all segments", () => {
    for (const [s, e] of segmentText("Hello, world. How are you?")) {
      expect(s).toBeLessThan(e);
    }
  });

  test("segments do not overlap", () => {
    const segs = segmentText("a, b, c, d");
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i][0]).toBeGreaterThanOrEqual(segs[i - 1][1]);
    }
  });

  test("reconstructed segments have no leading/trailing whitespace", () => {
    const text = "  Hello  ,  World  ";
    for (const [s, e] of segmentText(text)) {
      const seg = text.slice(s, e);
      expect(seg).toBe(seg.trim());
    }
  });

  test("frozen — cannot add properties", () => {
    expect(() => { segmentText.foo = 1; }).toThrow();
  });

  test("named export matches default", () => {
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
  test("null → []",          () => expect(segmentTextSection(null)).toEqual([]));
  test("undefined → []",     () => expect(segmentTextSection(undefined)).toEqual([]));
  test("empty string → []",  () => expect(segmentTextSection("")).toEqual([]));
  test("only delimiters → []", () => expect(segmentTextSection(".,!?")).toEqual([]));
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — single section
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — single section", () => {
  test("no blank line — all segments in one section", () => {
    const text = "Hello, world. How are you?";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "world", "How are you"]);
  });

  test("single segment wrapped in one section", () => {
    const text = "Hello world";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(1);
    expect(text.slice(...sections[0][0])).toBe("Hello world");
  });

  test("single newline between segments — not a blank line, same section", () => {
    const text = "Hello.\nWorld";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "World"]);
  });

  test("CRLF (\\r\\n) single line ending — not a blank line, same section", () => {
    const text = "Hello.\r\nWorld";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — multiple sections
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — multiple sections", () => {
  test("two paragraphs separated by blank line (\\n\\n)", () => {
    const text = "Hello, world.\n\nHow are you?";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "world"]);
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

  test("Windows CRLF blank line (\\r\\n\\r\\n) creates new section", () => {
    const text = "Hello.\r\n\r\nWorld";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
  });

  test("three or more newlines — still one section break", () => {
    const text = "Para one.\n\n\n\nPara two";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
  });

  test("multiple segments per section with blank line between sections", () => {
    const text = "Hello, world. Nice day.\n\nHow are you? Fine, thanks.";
    const sections = segmentTextSection(text);
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["Hello", "world", "Nice day"]);
    expect(toStrings(text, sections[1])).toEqual(["How are you", "Fine", "thanks"]);
  });

  test("each section is non-empty", () => {
    const text = "A.\n\nB.\n\nC";
    for (const section of segmentTextSection(text)) {
      expect(section.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// segmentTextSection — return shape
// ─────────────────────────────────────────────────────────────────────────────

describe("segmentTextSection — return shape", () => {
  test("returns an array", () => {
    expect(Array.isArray(segmentTextSection("hello"))).toBe(true);
  });

  test("each section is an array", () => {
    for (const section of segmentTextSection("a, b\n\nc, d")) {
      expect(Array.isArray(section)).toBe(true);
    }
  });

  test("each entry within a section is a two-element array", () => {
    for (const section of segmentTextSection("a, b\n\nc, d")) {
      for (const seg of section) {
        expect(Array.isArray(seg)).toBe(true);
        expect(seg).toHaveLength(2);
      }
    }
  });

  test("flattened sections equal segmentText output", () => {
    const text = "Hello, world.\n\nHow are you?";
    const flat  = segmentTextSection(text).flat();
    expect(flat).toEqual(segmentText(text));
  });

  test("keepSentenceChunk=false forwarded — word-mode sections", () => {
    const text = "One two.\n\nThree four";
    const sections = segmentTextSection(text, false);
    // Word mode splits on spaces too — each word is its own segment.
    expect(sections).toHaveLength(2);
    expect(toStrings(text, sections[0])).toEqual(["One", "two"]);
    expect(toStrings(text, sections[1])).toEqual(["Three", "four"]);
  });

  test("flattened word-mode sections equal segmentText(text, false)", () => {
    const text = "Hello world.\n\nFoo bar";
    expect(segmentTextSection(text, false).flat()).toEqual(segmentText(text, false));
  });
});