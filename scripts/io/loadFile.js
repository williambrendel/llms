"use strict";

const path = require("path");
const fs = require("fs").promises;
const convert = require("./convert");
const getMediaType = require("../../src/utilities/getMediaType");

/**
 * @file loadFile.js
 * @module io/loadFile
 * @description Load a file's content as text. Automatically converts
 * binary documents (docx, pdf, doc) to Markdown via {@link convert}
 * (which uses MarkItDown); reads plain text and Markdown directly.
 *
 * ## Polymorphic input
 *
 * The function accepts either:
 *   - **A file path** (string): read from disk. Extension determined
 *     from the path.
 *   - **A Buffer**: in-memory bytes. The `filename` option must be
 *     provided so the extension can be derived.
 *
 * The Buffer path is what HTTP endpoints typically need: multer
 * gives you `req.files[0].buffer` and `req.files[0].originalname` —
 * pass both, get back the converted text.
 *
 * ## Return shape
 *
 *   {
 *     type:      "text",        // always "text" in this version
 *     data:      string,         // the file contents or converted markdown
 *     mediaType: string,         // detected MIME type
 *     filename:  string,         // basename (no path)
 *   }
 *
 * The shape matches earlier versions of this utility for backward
 * compatibility. Existing callers don't need changes.
 *
 * ## Files that trigger conversion
 *
 * The {@link CONVERT_EXTENSIONS} set defines which extensions go
 * through {@link convert}. Adding a format means MarkItDown supports
 * it AND we want the result as Markdown text. Adding `.xlsx` here
 * would convert spreadsheets to Markdown tables, etc.
 *
 * Anything not in the set is read as-is — plain text, JSON, CSV,
 * existing markdown, source code, all flow through unchanged.
 */

/**
 * File extensions that trigger conversion to Markdown via
 * {@link convert}. Everything else is read directly from disk
 * (path input) or decoded as text (buffer input).
 *
 * @type {Set<string>}
 */
const CONVERT_EXTENSIONS = new Set([".doc", ".docx", ".pdf"]);

/**
 * Load a file's content as text.
 *
 * @async
 * @param {string|Buffer} input - File path or in-memory buffer.
 * @param {object}  [options]
 * @param {string}  [options.filename]  - REQUIRED when `input` is a
 *   Buffer (used to derive extension and reported as the result's
 *   `filename`). Optional when `input` is a path (defaults to
 *   `path.basename(input)`).
 * @param {string}  [options.mediaType] - Explicit MIME type override.
 *   Useful when `getMediaType` would mis-detect or when the source
 *   is ambiguous.
 * @param {string}  [options.encoding="utf-8"] - Encoding for direct
 *   reads (ignored for converted documents — MarkItDown decides).
 * @returns {Promise<{type: string, data: string, mediaType: string, filename: string}>}
 * @throws {Error} When `input` is neither path nor Buffer, when a
 *   Buffer is passed without `filename`, or when conversion fails.
 *
 * @example
 *   // Path input
 *   const file = await loadFile("./report.docx");
 *
 * @example
 *   // Buffer input (HTTP upload)
 *   const file = await loadFile(req.files[0].buffer, {
 *     filename: req.files[0].originalname,
 *   });
 */
const loadFile = async (input, { filename, mediaType, encoding = "utf-8" } = {}) => {
  let resolvedFilename;
  let ext;

  if (typeof input === "string") {
    // Path input. Filename defaults to the basename; extension from the path.
    resolvedFilename = filename || path.basename(input);
    ext = path.extname(input).toLowerCase();
  } else if (Buffer.isBuffer(input)) {
    if (typeof filename !== "string" || filename.length === 0) {
      throw new Error("loadFile: filename is required when input is a Buffer");
    }
    resolvedFilename = filename;
    ext = path.extname(filename).toLowerCase();
  } else {
    throw new Error("loadFile: input must be a file path (string) or a Buffer");
  }

  // ── Conversion path ──────────────────────────────────────────────────────
  //
  // Binary formats route through `convert`. The result is always
  // Markdown text regardless of source format. We report it with
  // the markdown media type since the data is now markdown — even
  // though it ORIGINATED as docx or pdf.
  if (CONVERT_EXTENSIONS.has(ext)) {
    const markdown = await convert(input, ext);
    return {
      type:      "text",
      data:      markdown,
      mediaType: getMediaType.md,
      filename:  resolvedFilename,
    };
  }

  // ── Direct read path ─────────────────────────────────────────────────────
  //
  // Plain text formats (txt, md, json, csv, etc.) are decoded from
  // their bytes without conversion. Path inputs are read from disk;
  // Buffer inputs are decoded in place.
  let data;
  if (typeof input === "string") {
    const buffer = await fs.readFile(input);
    data = buffer.toString(encoding);
  } else {
    data = input.toString(encoding);
  }

  return {
    type:      "text",
    data,
    mediaType: mediaType || getMediaType(resolvedFilename),
    filename:  resolvedFilename,
  };
};

// Helper exports for tests.
loadFile.CONVERT_EXTENSIONS = CONVERT_EXTENSIONS;

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(loadFile, "loadFile", {
  value: loadFile,
}));