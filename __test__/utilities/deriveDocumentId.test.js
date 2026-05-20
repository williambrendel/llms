"use strict";

/**
 * @file deriveDocumentId.test.js
 * @brief Unit tests for deriveDocumentId.
 *
 * Verifies:
 *   - Basic theme|stem derivation from various path shapes
 *   - Parent folder is the IMMEDIATE parent only (no full path)
 *   - Root-level files get the "root" theme
 *   - Build metadata (`|md_<timestamp>` suffix) is stripped conservatively
 *   - Non-timestamp `|` characters in the stem are preserved (sanitized to `_`)
 *   - Pass-through: already-formed documentIds return unchanged (idempotent)
 *   - Extension stripping handles common cases
 *   - Sanitization: lowercase, diacritics, separator normalization, run collapse
 *   - Error conditions: empty input, nameless files
 */

const deriveDocumentId = require("../../src/utilities/deriveDocumentId");
const { isDocumentIdShape, METADATA_SUFFIX_RE } = deriveDocumentId;

describe("deriveDocumentId — basic cases", () => {
  test("simple theme/file pair", () => {
    expect(deriveDocumentId("biology/overview.md")).toBe("biology|overview");
  });

  test("absolute path uses only immediate parent", () => {
    expect(deriveDocumentId("/abs/path/to/biology/overview.md")).toBe("biology|overview");
  });

  test("deeply nested path uses only immediate parent", () => {
    expect(deriveDocumentId("/a/b/c/biology/microbiology/legionella/overview.md")).toBe("legionella|overview");
  });

  test("relative path with leading dot", () => {
    expect(deriveDocumentId("./biology/overview.md")).toBe("biology|overview");
  });
});

describe("deriveDocumentId — root theme fallback", () => {
  test("bare filename gets root theme", () => {
    expect(deriveDocumentId("overview.md")).toBe("root|overview");
  });

  test("absolute root-level file gets root theme", () => {
    expect(deriveDocumentId("/overview.md")).toBe("root|overview");
  });

  test("parent that sanitizes to empty falls back to root", () => {
    expect(deriveDocumentId("!!!/overview.md")).toBe("root|overview");
  });

  test("parent of only punctuation falls back to root", () => {
    expect(deriveDocumentId("---/overview.md")).toBe("root|overview");
  });
});

describe("deriveDocumentId — build metadata stripping", () => {
  test("strips canonical |md_<timestamp> suffix from basename", () => {
    expect(deriveDocumentId("biology/causes_of_X|md_2026-04-22T02-28-30-099Z.bin"))
      .toBe("biology|causes_of_x");
  });

  test("strips |md_<timestamp> even without file extension", () => {
    expect(deriveDocumentId("biology/causes_of_x|md_2026-04-22T02-28-30-099Z"))
      .toBe("biology|causes_of_x");
  });

  test("strips |md_<timestamp> with .md extension", () => {
    expect(deriveDocumentId("biology/overview|md_2026-04-22T02-28-30-099Z.md"))
      .toBe("biology|overview");
  });

  test("preserves non-timestamp | (sanitizes to underscore)", () => {
    // Old behavior split on the first | and threw away the rest.
    // New behavior: only the canonical |md_<timestamp> suffix is
    // metadata. Other |'s are just punctuation that sanitizeSegment
    // converts to underscores.
    expect(deriveDocumentId("biology/foo|v2|extra.bin")).toBe("biology|foo_v2_extra");
  });

  test("preserves | from root-level files (sanitizes to underscore)", () => {
    expect(deriveDocumentId("foo|bar.bin")).toBe("root|foo_bar");
  });

  test("strips timestamp even when preceded by other |'s", () => {
    // The regex is anchored at end-of-string — it matches only the
    // LAST | when followed by a timestamp. Earlier |'s in the stem
    // stay and get sanitized.
    expect(deriveDocumentId("biology/doc|extra|md_2026-04-22T02-28-30-099Z.md"))
      .toBe("biology|doc_extra");
  });

  test("does not strip partial timestamps (year only)", () => {
    expect(deriveDocumentId("biology/doc|md_2026.md"))
      .toBe("biology|doc_md_2026");
  });

  test("does strip |md_ alone", () => {
    expect(deriveDocumentId("biology/doc|md_.md"))
      .toBe("biology|doc_md");
  });

  test("does not strip non-md prefix even with timestamp shape", () => {
    // The regex requires "|md_" specifically. "|other_<timestamp>" doesn't match.
    expect(deriveDocumentId("biology/doc|x_2026-04-22T02-28-30-099Z.md"))
      .toBe("biology|doc_x_2026_04_22t02_28_30_099z");
  });

  test("does not strip unmodified ISO timestamp", () => {
    // Our timestamps replace : and . with -. An unmodified ISO
    // doesn't match the regex.
    expect(deriveDocumentId("biology/doc|md_2026-04-22T02:28:30.099Z.md"))
      .toBe("biology|doc_md_2026_04_22t02_28_30_099z");
  });

  test("does not strip | from parent folder", () => {
    // Pipes in parent folder names sanitize to underscores like any other
    // non-alphanumeric character; they do not trigger build-metadata stripping.
    expect(deriveDocumentId("foo|bar/baz.md")).toBe("foo_bar|baz");
  });
});

describe("deriveDocumentId — pass-through for already-formed IDs", () => {
  test("simple theme|stem passes through unchanged", () => {
    expect(deriveDocumentId("biology|overview")).toBe("biology|overview");
  });

  test("multi-word stem with underscores passes through", () => {
    expect(deriveDocumentId("biology|causes_of_resistance"))
      .toBe("biology|causes_of_resistance");
  });

  test("multi-word theme with underscores passes through", () => {
    expect(deriveDocumentId("water_quality_and_chemistry|glossary"))
      .toBe("water_quality_and_chemistry|glossary");
  });

  test("numeric segments pass through", () => {
    expect(deriveDocumentId("v1|chapter2")).toBe("v1|chapter2");
  });

  test("uppercase is NOT a pass-through (falls through to derivation)", () => {
    expect(deriveDocumentId("Biology|Overview")).toBe("root|biology_overview");
  });

  test("spaces are NOT a pass-through", () => {
    expect(deriveDocumentId("biology|cooling towers"))
      .toBe("root|biology_cooling_towers");
  });

  test("dashes are NOT a pass-through", () => {
    expect(deriveDocumentId("biology|cooling-towers"))
      .toBe("root|biology_cooling_towers");
  });

  test("path-shaped input is NOT a pass-through", () => {
    expect(deriveDocumentId("biology/overview.md")).toBe("biology|overview");
  });

  test("three segments (extra |) is NOT a pass-through", () => {
    // Treated as a basename — parent is ".", basename has multiple |'s.
    // None of them match the timestamp pattern, so all sanitize.
    expect(deriveDocumentId("biology|sub|overview")).toBe("root|biology_sub_overview");
  });
});

describe("deriveDocumentId — extension stripping", () => {
  test("strips .md", () => {
    expect(deriveDocumentId("biology/overview.md")).toBe("biology|overview");
  });

  test("strips .bin", () => {
    expect(deriveDocumentId("biology/overview.bin")).toBe("biology|overview");
  });

  test("strips arbitrary extensions", () => {
    expect(deriveDocumentId("biology/overview.txt")).toBe("biology|overview");
    expect(deriveDocumentId("biology/overview.json")).toBe("biology|overview");
  });

  test("strips only the last extension", () => {
    expect(deriveDocumentId("biology/overview.tar.gz")).toBe("biology|overview_tar");
  });

  test("no extension is fine", () => {
    expect(deriveDocumentId("biology/README")).toBe("biology|readme");
  });
});

describe("deriveDocumentId — sanitization", () => {
  test("lowercases", () => {
    expect(deriveDocumentId("Biology/Overview.md")).toBe("biology|overview");
  });

  test("strips diacritics", () => {
    expect(deriveDocumentId("Chimie/Café Résumé.md")).toBe("chimie|cafe_resume");
  });

  test("converts spaces to underscore", () => {
    expect(deriveDocumentId("chemistry/Cooling Towers.md")).toBe("chemistry|cooling_towers");
  });

  test("converts hyphen to underscore", () => {
    expect(deriveDocumentId("foo/bar-baz-qux.md")).toBe("foo|bar_baz_qux");
  });

  test("collapses runs of separators", () => {
    expect(deriveDocumentId("foo/bar___baz.md")).toBe("foo|bar_baz");
    expect(deriveDocumentId("foo/bar---baz.md")).toBe("foo|bar_baz");
    expect(deriveDocumentId("foo/bar-_-baz.md")).toBe("foo|bar_baz");
  });

  test("trims leading and trailing separators per segment", () => {
    expect(deriveDocumentId("--foo--/--bar--.md")).toBe("foo|bar");
  });

  test("strips arbitrary punctuation", () => {
    expect(deriveDocumentId("foo/bar!@#$%baz.md")).toBe("foo|bar_baz");
  });

  test("preserves digits", () => {
    expect(deriveDocumentId("foo/bar123.md")).toBe("foo|bar123");
    expect(deriveDocumentId("foo/123bar.md")).toBe("foo|123bar");
  });
});

describe("deriveDocumentId — idempotence", () => {
  // True idempotence: f(f(x)) === f(x). Achieved via the pass-through
  // for already-formed documentIds. Without it, derive(derive(x)) would
  // mangle the output into "root|biology" (treating the previous output
  // as a bare filename and dropping the post-| portion).
  const paths = [
    "biology/overview.md",
    "chemistry/Cooling Towers.md",
    "biology/causes_of_X|md_2026-04-22T02-28-30-099Z.bin",
    "overview.md",
    "water-quality-and-chemistry/terms_glossary_with_synonyms_v2.md",
    "/abs/path/to/theme/file.md",
    "biology/foo|v2|extra.bin",
  ];

  test.each(paths)("f(f(x)) === f(x) for %s", (input) => {
    const once  = deriveDocumentId(input);
    const twice = deriveDocumentId(once);
    expect(twice).toBe(once);
  });

  test("explicit example: passing a derived id back gets the same id", () => {
    const id = deriveDocumentId("biology/overview.md");
    expect(id).toBe("biology|overview");
    expect(deriveDocumentId(id)).toBe("biology|overview");
  });
});

describe("deriveDocumentId — recoverability", () => {
  test("theme prefix is recoverable", () => {
    const id = deriveDocumentId("biology/overview.md");
    const theme = id.split("|", 1)[0];
    expect(theme).toBe("biology");
  });

  test("stem suffix is recoverable even when stem contains underscores", () => {
    const id = deriveDocumentId("biology/causes_of_resistance.md");
    const stem = id.slice(id.indexOf("|") + 1);
    expect(stem).toBe("causes_of_resistance");
  });

  test("works for filtering by theme", () => {
    const ids = [
      deriveDocumentId("biology/a.md"),
      deriveDocumentId("biology/b.md"),
      deriveDocumentId("chemistry/c.md"),
    ];
    const biologyIds = ids.filter(id => id.startsWith("biology|"));
    expect(biologyIds).toHaveLength(2);
  });
});

describe("deriveDocumentId — error conditions", () => {
  test("throws on empty string", () => {
    expect(() => deriveDocumentId("")).toThrow("non-empty string");
  });

  test("throws on whitespace-only string", () => {
    expect(() => deriveDocumentId("   ")).toThrow("non-empty string");
  });

  test("throws on null", () => {
    expect(() => deriveDocumentId(null)).toThrow("non-empty string");
  });

  test("throws on non-string input", () => {
    expect(() => deriveDocumentId(42)).toThrow("non-empty string");
    expect(() => deriveDocumentId({})).toThrow("non-empty string");
  });

  test("throws on filename that sanitizes to empty stem", () => {
    // A file named e.g. "!!!.md" — extension stripped → "!!!" → sanitized → ""
    expect(() => deriveDocumentId("biology/!!!.md")).toThrow("empty stem");
  });

  test("throws on filename that is only the extension", () => {
    expect(() => deriveDocumentId("biology/.md")).toThrow("empty stem");
  });
});

describe("deriveDocumentId — collision disambiguation", () => {
  test("same filename in different themes produces different IDs", () => {
    const id1 = deriveDocumentId("biology/overview.md");
    const id2 = deriveDocumentId("chemistry/overview.md");
    expect(id1).not.toBe(id2);
    expect(id1).toBe("biology|overview");
    expect(id2).toBe("chemistry|overview");
  });

  test("same stem with different casing produces same ID", () => {
    expect(deriveDocumentId("biology/Overview.md"))
      .toBe(deriveDocumentId("biology/overview.md"));
  });

  test("hyphen and underscore variants produce same ID", () => {
    expect(deriveDocumentId("biology/cooling-towers.md"))
      .toBe(deriveDocumentId("biology/cooling_towers.md"));
  });
});

describe("deriveDocumentId — module export conventions", () => {
  test("the export is the function itself (self-referential)", () => {
    expect(typeof deriveDocumentId).toBe("function");
  });

  test("exposes a self-referential .deriveDocumentId property", () => {
    expect(deriveDocumentId.deriveDocumentId).toBe(deriveDocumentId);
  });

  test("the exported function is frozen", () => {
    expect(Object.isFrozen(deriveDocumentId)).toBe(true);
  });

  test("exposes isDocumentIdShape helper", () => {
    expect(typeof deriveDocumentId.isDocumentIdShape).toBe("function");
  });

  test("exposes METADATA_SUFFIX_RE constant", () => {
    expect(deriveDocumentId.METADATA_SUFFIX_RE).toBeInstanceOf(RegExp);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isDocumentIdShape — direct predicate tests
// ─────────────────────────────────────────────────────────────────────────────

describe("isDocumentIdShape", () => {
  test("accepts canonical theme|stem", () => {
    expect(isDocumentIdShape("biology|overview")).toBe(true);
    expect(isDocumentIdShape("water_quality_and_chemistry|glossary_v2")).toBe(true);
  });

  test("rejects path-like inputs", () => {
    expect(isDocumentIdShape("biology/overview.md")).toBe(false);
    expect(isDocumentIdShape("biology\\overview.md")).toBe(false);
  });

  test("rejects inputs with extensions", () => {
    expect(isDocumentIdShape("biology|overview.md")).toBe(false);
  });

  test("rejects uppercase / spaces / dashes", () => {
    expect(isDocumentIdShape("Biology|Overview")).toBe(false);
    expect(isDocumentIdShape("biology|cooling towers")).toBe(false);
    expect(isDocumentIdShape("biology|cooling-towers")).toBe(false);
  });

  test("rejects wrong number of segments", () => {
    expect(isDocumentIdShape("biology")).toBe(false);
    expect(isDocumentIdShape("biology|sub|overview")).toBe(false);
  });

  test("rejects empty halves", () => {
    expect(isDocumentIdShape("|overview")).toBe(false);
    expect(isDocumentIdShape("biology|")).toBe(false);
    expect(isDocumentIdShape("|")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// METADATA_SUFFIX_RE — direct regex tests
// ─────────────────────────────────────────────────────────────────────────────

describe("METADATA_SUFFIX_RE", () => {
  test("matches the canonical timestamp suffix", () => {
    expect("|md_2026-04-22T02-28-30-099Z").toMatch(METADATA_SUFFIX_RE);
  });

  test("matches at end of string only", () => {
    expect("doc|md_2026-04-22T02-28-30-099Z".match(METADATA_SUFFIX_RE)?.[0])
      .toBe("|md_2026-04-22T02-28-30-099Z");
  });

  test("does NOT match in the middle of a string", () => {
    expect("|md_2026-04-22T02-28-30-099Zextra").not.toMatch(METADATA_SUFFIX_RE);
  });

  test("does NOT match without the leading |", () => {
    expect("md_2026-04-22T02-28-30-099Z").not.toMatch(METADATA_SUFFIX_RE);
  });
});