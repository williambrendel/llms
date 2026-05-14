"use strict";

const path = require("path");
const deriveDocumentId = require("../utilities/deriveDocumentId");

/**
 * @file resolveOutputPath.js
 * @module knowledgeBase/resolveOutputPath
 * @description Compute the on-disk destination for a generated `.bin`
 * file, mirroring the source's subtree under an output directory.
 *
 * Pure function — no I/O, no side effects. The build script handles the
 * actual `mkdir` and the eventual write (typically via
 * {@link Document#write}).
 */

/**
 * Resolve the output path for a generated knowledge-base binary.
 *
 * Output mirrors the source's location relative to `sourceRoot`:
 *
 *   `<sourceRoot>/biology/foo.md` → `<outputDir>/biology/<stem>.bin`
 *
 * where `<stem>` is the portion of `deriveDocumentId(sourcePath)` after
 * `|` — the bare filename without the theme prefix. The parent directory
 * already encodes the theme, so naming files `biology|foo.bin` inside a
 * `biology/` folder would double-encode it. The full document ID is
 * recovered at load time by `deriveDocumentId(.bin path)`, which reads
 * the parent folder and stem together; the embedded header ID is
 * authoritative on mismatch.
 *
 * Single-file inputs (where `sourceRoot === path.dirname(sourcePath)`)
 * land flat under `outputDir`, since `path.relative` resolves to `""` in
 * that case.
 *
 * @function resolveOutputPath
 * @param {string} sourcePath - Path to the original source file.
 * @param {string} outputDir  - Root output directory.
 * @param {string} sourceRoot - Root of the source tree, used to compute
 *   the relative subdir the `.bin` should sit under.
 *
 * @returns {{ outPath: string, documentId: string }}
 *   - `outPath`    — absolute (or input-relative) path to the destination
 *                    `.bin` file. The caller is responsible for ensuring
 *                    `path.dirname(outPath)` exists before writing.
 *   - `documentId` — the full document ID derived from `sourcePath`,
 *                    suitable for passing to {@link Document.fromSpec}.
 */
const resolveOutputPath = (sourcePath, outputDir, sourceRoot) => {
  const documentId = deriveDocumentId(sourcePath);

  // Subtree mirroring: where the source sits under sourceRoot, the .bin
  // sits under outputDir.
  const relDir = path.relative(sourceRoot, path.dirname(path.resolve(sourcePath)));
  const outDir = path.join(outputDir, relDir);

  // Filename uses the bare stem (post-`|` portion of the documentId).
  const stem    = documentId.slice(documentId.indexOf("|") + 1);
  const outPath = path.join(outDir, `${stem}.bin`);

  return { outPath, documentId };
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(resolveOutputPath, "resolveOutputPath", {
  value: resolveOutputPath,
}));
