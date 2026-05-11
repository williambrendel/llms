"use strict";

const path = require("path");

/**
 * @file deriveDocumentId.js
 * @module utilities/deriveDocumentId
 * @description Derives a stable, mismatch-tolerant document ID from a file
 * path. The ID encodes the immediate parent folder (the "theme") and the
 * sanitized filename stem, joined by `|` so the prefix is always recoverable.
 */

// Canonical word separator used inside each segment (theme and stem).
// Distinct from the structural `|` delimiter that joins the two segments.
const WORD_SEP = "_";

// Structural delimiter between theme and stem in the final ID. Chosen so the
// theme prefix can always be stripped or extracted without ambiguity, even
// when stems themselves contain `_`.
const THEME_DELIM = "|";

// Fallback theme for files with no parent folder (i.e. files at the dataset
// root, or paths with no directory component).
const ROOT_THEME = "root";

/**
 * Sanitizes a single path segment (a folder name or filename stem) into a
 * lowercase, separator-normalized form.
 *
 * Transformations, in order:
 *   1. NFKD-normalize and strip combining marks (diacritics).
 *   2. Lowercase.
 *   3. Replace every character outside `[a-z0-9]` with `WORD_SEP`.
 *   4. Collapse runs of `WORD_SEP` to a single occurrence.
 *   5. Trim leading and trailing `WORD_SEP`.
 *
 * @param {string} segment - Raw segment.
 * @returns {string} Sanitized segment, possibly empty if the input contained
 *   no alphanumeric characters.
 */
const sanitizeSegment = segment => segment
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, WORD_SEP)
  .replace(new RegExp(`${WORD_SEP}+`, "g"), WORD_SEP)
  .replace(new RegExp(`^${WORD_SEP}|${WORD_SEP}$`, "g"), "");

/**
 * Derives a stable document ID from a file path.
 *
 * The ID combines the immediate parent folder (the "theme") with the
 * sanitized filename stem, separated by `|`. The `|` is a structural
 * delimiter chosen so the theme prefix can always be recovered or stripped
 * independently of the stem (which may itself contain `_`).
 *
 * Pipeline:
 *   1. Extract `path.basename` and immediate parent from the input.
 *   2. If there is no parent (root-level file), use {@link ROOT_THEME}.
 *   3. Strip the file extension from the basename.
 *   4. Strip everything after the first `|` in the basename — that suffix is
 *      treated as build metadata (e.g. `|md_2026-04-22T02-28-30-099Z`).
 *   5. Sanitize parent and stem independently via {@link sanitizeSegment}.
 *   6. Fall back to {@link ROOT_THEME} if the parent sanitizes to empty.
 *   7. Throw if the stem sanitizes to empty — an ID for a nameless file is
 *      not meaningful.
 *   8. Join: `${theme}|${stem}`.
 *
 * @function deriveDocumentId
 * @param {string} filepath - File path. May be absolute, relative, or a bare
 *   filename. Forward and backslash separators are both accepted via Node's
 *   `path` module.
 * @returns {string} Document ID of the form `"theme|stem"`.
 * @throws {Error} If `filepath` is not a non-empty string, or if the
 *   sanitized stem is empty.
 *
 * @example
 *   deriveDocumentId("biology/overview.md");
 *   // → "biology|overview"
 *
 * @example
 *   deriveDocumentId("chemistry/Cooling Towers.md");
 *   // → "chemistry|cooling_towers"
 *
 * @example
 *   deriveDocumentId("biology/causes_of_X|md_2026-04-22T02-28-30-099Z.bin");
 *   // → "biology|causes_of_x"
 *
 * @example
 *   deriveDocumentId("overview.md");
 *   // → "root|overview"
 *
 * @example
 *   // Recovering the parts:
 *   const id = deriveDocumentId("biology/overview.md");
 *   const theme = id.split("|", 1)[0];           // "biology"
 *   const stem  = id.slice(id.indexOf("|") + 1); // "overview"
 */
const deriveDocumentId = filepath => {
  if (typeof filepath !== "string" || !filepath.trim()) {
    throw new Error("deriveDocumentId: filepath must be a non-empty string");
  }

  // Normalize separators and extract the immediate parent + basename.
  const basename = path.basename(filepath);
  const dirname  = path.dirname(filepath);

  // path.dirname returns "." for bare filenames and "/" for root-level
  // absolute paths. Both mean "no meaningful parent folder."
  const rawParent = (dirname === "." || dirname === "/" || dirname === "")
    ? ""
    : path.basename(dirname);

  // Strip extension, then drop any build-metadata suffix introduced by `|`.
  const stemWithMeta = basename.replace(/\.[^.]+$/, "");
  const stemRaw      = stemWithMeta.split(THEME_DELIM, 1)[0];

  // Sanitize both segments independently.
  const theme = sanitizeSegment(rawParent) || ROOT_THEME;
  const stem  = sanitizeSegment(stemRaw);

  if (!stem) {
    throw new Error(`deriveDocumentId: filename "${basename}" sanitizes to an empty stem`);
  }

  return `${theme}${THEME_DELIM}${stem}`;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(deriveDocumentId, "deriveDocumentId", {
  value: deriveDocumentId,
}));