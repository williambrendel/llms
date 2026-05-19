"use strict";

const { MarkItDown } = require("markitdown-ts");

/**
 * @file convert.js
 * @module io/convert
 * @description Convert a binary document (docx, pdf, etc.) to
 * Markdown text via MarkItDown. Polymorphic input: accepts either
 * a file path or an in-memory Buffer.
 *
 * Pure conversion — no decision logic. If you call this, you've
 * already decided that conversion is appropriate. For load-or-convert
 * behavior (read plain text directly, convert binaries), use
 * {@link loadFile} instead.
 *
 * ## Signatures
 *
 *   convert(input)              // input is a path string
 *   convert(input, extension)   // input is a Buffer; extension required
 *
 * ## Why polymorphic
 *
 * Different call sites have different shapes:
 *   - CLI scripts / batch jobs: have paths from disk walks
 *   - HTTP upload endpoints: have buffers from multer/formidable
 *
 * Rather than forcing every caller to write to a temp file before
 * calling, `convert` handles both shapes natively — paths go through
 * MarkItDown.convert(), buffers go through MarkItDown.convertBuffer().
 */

/**
 * Convert a document to Markdown text.
 *
 * @async
 * @param {string|Buffer} input - Either a file path or a Buffer.
 * @param {string} [extension] - File extension including leading dot
 *   (e.g. `.docx`). REQUIRED when `input` is a Buffer; ignored when
 *   `input` is a path (extension is derived from the path).
 * @returns {Promise<string>} The Markdown text.
 * @throws {Error} When:
 *   - `input` is neither a string nor a Buffer
 *   - `input` is a Buffer but `extension` is missing
 *   - MarkItDown returns null/undefined/no-markdown
 *
 * @example
 *   // From a path
 *   const md = await convert("./report.docx");
 *
 * @example
 *   // From a buffer (e.g. multer upload)
 *   const md = await convert(req.files[0].buffer, ".docx");
 */
const convert = async (input, extension) => {
  const markitdown = new MarkItDown();
  let result;

  if (typeof input === "string") {
    // Path input. MarkItDown.convert handles both local paths and URLs.
    result = await markitdown.convert(input);
  } else if (Buffer.isBuffer(input)) {
    // Buffer input. MarkItDown needs the extension to pick a converter.
    if (typeof extension !== "string" || extension.length === 0) {
      throw new Error("convert: extension is required when input is a Buffer");
    }
    result = await markitdown.convertBuffer(input, { file_extension: extension });
  } else {
    throw new Error("convert: input must be a file path (string) or a Buffer");
  }

  // MarkItDown's return type is `ConverterResult | null | undefined`.
  // Defensive check — we don't want a downstream `result.markdown`
  // crash buried in stack traces.
  if (!result || typeof result.markdown !== "string") {
    const inputDesc = typeof input === "string" ? `path "${input}"` : `buffer with extension "${extension}"`;
    throw new Error(`convert: MarkItDown returned no markdown for ${inputDesc}`);
  }

  return result.markdown;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(convert, "convert", {
  value: convert,
}));
