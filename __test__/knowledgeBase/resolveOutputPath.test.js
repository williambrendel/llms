"use strict";

/**
 * @file resolveOutputPath.test.js
 * @brief Tests for the output-path resolver.
 *
 * `resolveOutputPath` is a pure function — it takes a source path, output
 * directory, and source root, and returns the destination `.bin` path plus
 * the derived document ID. No filesystem I/O.
 *
 * Tests cover:
 *   - Subtree mirroring (source/biology/foo.md → out/biology/<stem>.bin)
 *   - Bare-stem filename (no theme prefix in the filename itself)
 *   - Flat output for single-file inputs (when sourceRoot === dirname)
 *   - documentId propagation
 */

const path = require("path");

const resolveOutputPath = require("../../src/knowledgeBase/resolveOutputPath");

// ─────────────────────────────────────────────────────────────────────────────
// Subtree mirroring
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — subtree mirroring", () => {
  test("mirrors a single-level source subdirectory under outputDir", () => {
    const sourceRoot = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/biology/causes.md");
    const outputDir  = path.resolve("/data/out");

    const { outPath } = resolveOutputPath(sourcePath, outputDir, sourceRoot);

    expect(outPath).toBe(path.join(path.resolve("/data/out"), "biology", "causes.bin"));
  });

  test("mirrors a multi-level source subdirectory under outputDir", () => {
    const sourceRoot = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/biology/cellular/membranes.md");
    const outputDir  = path.resolve("/data/out");

    const { outPath } = resolveOutputPath(sourcePath, outputDir, sourceRoot);

    expect(outPath).toBe(path.join(path.resolve("/data/out"), "biology", "cellular", "membranes.bin"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flat output for single-file inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — single-file inputs", () => {
  test("lands flat under outputDir when sourceRoot equals dirname(sourcePath)", () => {
    // Single-file CLI mode: `node build.js path/to/single.md`.
    // sourceRoot is path.dirname(sourcePath), so path.relative is "".
    const sourceDir  = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/causes.md");
    const outputDir  = path.resolve("/data/out");

    const { outPath } = resolveOutputPath(sourcePath, outputDir, sourceDir);

    expect(outPath).toBe(path.join(path.resolve("/data/out"), "causes.bin"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bare-stem filename
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — bare-stem filename", () => {
  test("the output filename does not include the theme prefix", () => {
    // documentId is "biology|causes" — but we name the file just `causes.bin`,
    // since the parent directory already encodes the theme.
    const sourceRoot = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/biology/causes.md");
    const outputDir  = path.resolve("/data/out");

    const { outPath } = resolveOutputPath(sourcePath, outputDir, sourceRoot);

    expect(path.basename(outPath)).toBe("causes.bin");
    expect(path.basename(outPath)).not.toMatch(/biology/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// documentId propagation
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — documentId", () => {
  test("returns the full document ID with theme prefix intact", () => {
    const sourceRoot = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/biology/causes.md");
    const outputDir  = path.resolve("/data/out");

    const { documentId } = resolveOutputPath(sourcePath, outputDir, sourceRoot);

    expect(documentId).toBe("biology|causes");
  });

  test("returns the documentId for a flat single-file input", () => {
    const sourceDir  = path.resolve("/data/source");
    const sourcePath = path.resolve("/data/source/causes.md");
    const outputDir  = path.resolve("/data/out");

    const { documentId } = resolveOutputPath(sourcePath, outputDir, sourceDir);

    // Top-level files use their parent folder name as the theme: "source|causes".
    expect(documentId).toMatch(/^[^|]+\|causes$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Return shape
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — return shape", () => {
  test("returns an object with outPath and documentId", () => {
    const result = resolveOutputPath(
      path.resolve("/data/source/biology/causes.md"),
      path.resolve("/data/out"),
      path.resolve("/data/source"),
    );

    expect(result).toHaveProperty("outPath");
    expect(result).toHaveProperty("documentId");
    expect(typeof result.outPath).toBe("string");
    expect(typeof result.documentId).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module export conventions
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveOutputPath — module export conventions", () => {
  test("the export is the function itself", () => {
    expect(typeof resolveOutputPath).toBe("function");
  });

  test("exposes a self-referential .resolveOutputPath property", () => {
    expect(resolveOutputPath.resolveOutputPath).toBe(resolveOutputPath);
  });

  test("the exported function is frozen", () => {
    expect(Object.isFrozen(resolveOutputPath)).toBe(true);
  });
});
