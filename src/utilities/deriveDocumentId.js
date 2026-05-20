"use strict";

const path = require("path");

/**
 * @file deriveDocumentId.js
 * @module utilities/deriveDocumentId
 * @description Derives a stable, mismatch-tolerant document ID from a file
 * path. The ID encodes the immediate parent folder (the "theme") and the
 * sanitized filename stem, joined by `|` so the prefix is always recoverable.
 *
 * ## Pass-through for already-formed IDs
 *
 * `deriveDocumentId(deriveDocumentId(x)) === deriveDocumentId(x)`: passing
 * the function's own output gets it back unchanged. This makes the function
 * safe to use in code paths that may have either a filesystem path OR a
 * previously-derived documentId — endpoints, queue drainers, batch scripts.
 *
 * The pass-through check is strict — only exact matches of the output
 * format short-circuit. Near-misses (uppercase, dashes, extra `|`) fall
 * through to the normal derivation so we don't silently "fix" inputs the
 * caller didn't mean to pass.
 *
 * ## Build-metadata suffix
 *
 * Files written by the ingest pipeline carry a timestamp suffix so multiple
 * regenerations of the same document can co-exist on disk without name
 * collision:
 *
 *     biocides/water_chemistry|md_2026-04-22T02-28-30-099Z.md
 *                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                             dropped during ID derivation
 *
 * The stripping is conservative — only the LAST `|` is considered, and only
 * if what follows it matches the `md_<filesystem-safe-ISO>` shape produced
 * by `processUpload.js`. Any other `|` in the stem is preserved.
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

// Regex matching the build-metadata suffix appended by the ingest
// pipeline (see processUpload.js#buildMarkdownPath):
//
//     |md_2026-04-22T02-28-30-099Z
//
// The timestamp is a filesystem-safe variant of an ISO 8601 string: `:`
// and `.` replaced by `-`. The Z is required (UTC). Three milliseconds.
//
// Anchored at end-of-string so we only ever strip the LAST occurrence,
// and only when it matches this exact shape. A stem that happens to
// contain a `|` for unrelated reasons stays intact.
const METADATA_SUFFIX_RE = /\|md_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

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
 * Predicate: is the input already a well-formed documentId?
 *
 * Returns true ONLY when the input matches `deriveDocumentId`'s own
 * output format exactly:
 *   - Contains no path separators (`/` or `\`)
 *   - Contains no file-extension dot (`.`)
 *   - Splits into exactly two non-empty segments on `|`
 *   - Both segments are already in sanitized-canonical form
 *
 * Anything else falls through to the normal derivation pipeline.
 *
 * @param {string} input
 * @returns {boolean}
 */
const isDocumentIdShape = (input) => {
  if (/[/\\.]/.test(input)) return false;

  const parts = input.split(THEME_DELIM);
  if (parts.length !== 2) return false;

  const [theme, stem] = parts;
  if (!theme || !stem) return false;

  // Round-trip check: each segment must equal its own sanitization.
  // Without this, "biocides|Water Chemistry" would pass through
  // unchanged even though it's clearly meant to be normalized.
  return theme === sanitizeSegment(theme) && stem === sanitizeSegment(stem);
};

/**
 * Strip the build-metadata suffix from a basename (no extension).
 * Returns the basename unchanged if no metadata suffix is present.
 *
 * @param {string} basenameWithoutExt
 * @returns {string}
 */
const stripMetadataSuffix = (basenameWithoutExt) =>
  basenameWithoutExt.replace(METADATA_SUFFIX_RE, "");

/**
 * Derives a stable document ID from a file path.
 *
 * The ID combines the immediate parent folder (the "theme") with the
 * sanitized filename stem, separated by `|`. The `|` is a structural
 * delimiter chosen so the theme prefix can always be recovered or stripped
 * independently of the stem (which may itself contain `_`).
 *
 * Idempotent: if `input` is already a well-formed documentId, returns
 * it unchanged. See {@link isDocumentIdShape}.
 *
 * Pipeline (for non-pass-through inputs):
 *   1. Extract `path.basename` and immediate parent from the input.
 *   2. If there is no parent (root-level file), use {@link ROOT_THEME}.
 *   3. Strip the file extension from the basename.
 *   4. Strip the LAST `|md_<timestamp>` suffix if present. Other `|`
 *      characters in the stem are preserved.
 *   5. Sanitize parent and stem independently via {@link sanitizeSegment}.
 *   6. Fall back to {@link ROOT_THEME} if the parent sanitizes to empty.
 *   7. Throw if the stem sanitizes to empty — an ID for a nameless file is
 *      not meaningful.
 *   8. Join: `${theme}|${stem}`.
 *
 * @function deriveDocumentId
 * @param {string} input - File path OR an already-derived documentId.
 *   File paths may be absolute, relative, or a bare filename. Forward
 *   and backslash separators are both accepted via Node's `path` module.
 * @returns {string} Document ID of the form `"theme|stem"`.
 * @throws {Error} If `input` is not a non-empty string, or if the
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
 * @example <caption>Pass-through (idempotent)</caption>
 *   deriveDocumentId("biology|overview");
 *   // → "biology|overview"   ← unchanged
 *
 * @example
 *   // Recovering the parts:
 *   const id = deriveDocumentId("biology/overview.md");
 *   const theme = id.split("|", 1)[0];           // "biology"
 *   const stem  = id.slice(id.indexOf("|") + 1); // "overview"
 */
const deriveDocumentId = input => {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("deriveDocumentId: input must be a non-empty string");
  }

  // Pass-through: already a well-formed documentId. Returns unchanged
  // so deriveDocumentId(deriveDocumentId(x)) === deriveDocumentId(x).
  if (isDocumentIdShape(input)) return input;

  // Normalize separators and extract the immediate parent + basename.
  const basename = path.basename(input);
  const dirname  = path.dirname(input);

  // path.dirname returns "." for bare filenames and "/" for root-level
  // absolute paths. Both mean "no meaningful parent folder."
  const rawParent = (dirname === "." || dirname === "/" || dirname === "")
    ? ""
    : path.basename(dirname);

  // Strip extension, then strip the build-metadata suffix (only if
  // it matches the exact ingest-pipeline format). Other `|` characters
  // in the stem are preserved.
  const stemWithMeta = basename.replace(/\.[^.]+$/, "");
  const stemRaw      = stripMetadataSuffix(stemWithMeta);

  // Sanitize both segments independently.
  const theme = sanitizeSegment(rawParent) || ROOT_THEME;
  const stem  = sanitizeSegment(stemRaw);

  if (!stem) {
    throw new Error(`deriveDocumentId: filename "${basename}" sanitizes to an empty stem`);
  }

  return `${theme}${THEME_DELIM}${stem}`;
};

// Helper exports for tests.
deriveDocumentId.isDocumentIdShape    = isDocumentIdShape;
deriveDocumentId.METADATA_SUFFIX_RE   = METADATA_SUFFIX_RE;

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(deriveDocumentId, "deriveDocumentId", {
  value: deriveDocumentId,
}));