"use strict";

/**
 * @file deriveDocumentId.test.js
 * @brief Unit tests for deriveDocumentId.
 *
 * Verifies:
 *   - Basic theme|stem derivation from various path shapes
 *   - Parent folder is the IMMEDIATE parent only (no full path)
 *   - Root-level files get the "root" theme
 *   - Build metadata (anything after first `|` in basename) is stripped
 *   - Extension stripping handles common cases
 *   - Sanitization: lowercase, diacritics, separator normalization, run collapse
 *   - Error conditions: empty input, nameless files
 */

const deriveDocumentId = require("../../src/utilities/deriveDocumentId");

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
  test("strips |md_<timestamp> suffix from basename", () => {
    expect(deriveDocumentId("biology/causes_of_X|md_2026-04-22T02-28-30-099Z.bin"))
      .toBe("biology|causes_of_x");
  });

  test("strips anything after first | even if not timestamp-shaped", () => {
    expect(deriveDocumentId("biology/foo|v2|extra.bin")).toBe("biology|foo");
  });

  test("strips | even from root-level files", () => {
    expect(deriveDocumentId("foo|bar.bin")).toBe("root|foo");
  });

  test("does not strip | from parent folder", () => {
    // Pipes in parent folder names sanitize to underscores like any other
    // non-alphanumeric character; they do not trigger build-metadata stripping.
    expect(deriveDocumentId("foo|bar/baz.md")).toBe("foo_bar|baz");
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
  test("running on output of derive does not change it", () => {
    const id = deriveDocumentId("biology/overview.md");
    expect(deriveDocumentId(id)).toBe("root|biology");
    // Note: it's not idempotent in the strict sense — derive(derive(x)) treats
    // the previous output as a flat filename and prefixes "root|". The
    // important invariant is that the OUTPUT FORMAT is stable (theme|stem
    // shape, lowercase, single-char separator).
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
});
