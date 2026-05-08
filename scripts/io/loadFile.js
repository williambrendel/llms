"use strict";

const path = require("path");
const fs = require("fs").promises;
const { MarkItDown } = require("markitdown-ts");
const getMediaType = require("../../src/utilities/getMediaType");

/**
 * @function loadFile
 * @async
 * @description
 * Loads a file from disk, automatically converting binary documents (PDF, DOC, DOCX) 
 * to Markdown text if necessary.
 * This function performs the following logic:
 * 1. **Conversion**: If the file is a `.doc`, `.docx`, or `.pdf`, it uses `MarkItDown` 
 * to convert the content into a Markdown string.
 * 2. **Standard Read**: For all other file types, it reads the file directly from the 
 * filesystem using the specified encoding.
 * The return object always follows a consistent structure containing the text data 
 * and associated metadata (MIME type and filename).
 * @param {string} filePath - The relative or absolute path to the file.
 * @param {Object} [options={}] - Configuration options.
 * @param {string} [options.mediaType] - Explicitly override the detected MIME type.
 * @param {string} [options.encoding="utf-8"] - The character encoding to use for the output string.
 * @returns {Promise<Object>} Resolves to:
 * `{ data: string/base64, mediaType: string, filename: string }`.
 * 
 * @example
 * const loadFile = require("./loadFile");
 * // Example 1: Loading and converting a PDF to Markdown
 * const doc = await loadFile("./manual.pdf");
 * console.log(doc.data);      // "# Manual Content..." (Markdown string)
 * console.log(doc.mediaType); // "text/markdown" (via getMediaType.md)
 * 
 * @example
 * // Example 2: Loading a standard text file
 * const text = await loadFile("./config.json", { encoding: "utf-8" });
 * console.log(text.filename);  // "config.json"
 * console.log(text.data);      // "{ "key": "value" }"
 * @see getMediaType
 */
const loadFile = async (filePath, {
  mediaType,
  encoding = "utf-8"
} = {}) => {
  // Get file etension.
  const ext = path.extname(filePath).toLowerCase();

  // Convert document if needed.
  if (ext === ".doc" || ext === ".docx" || ext === ".pdf") {
    console.log("🔄 Convert document to MarkDown (.md)");
    const markitdown = new MarkItDown();
    const result = await markitdown.convert(filePath);
    return {
      type: (!encoding || encoding.startsWith("utf")) && "text" || encoding,
      data: result.markdown.toString(encoding),
      mediaType: getMediaType.md,
      filename: path.basename(filePath)
    };
  }

  // No conversion needed.
  const buffer = await fs.readFile(filePath);
  return {
    type: "text",
    data: buffer.toString(encoding),
    mediaType: mediaType || getMediaType(filePath),
    filename: path.basename(filePath)
  };
}

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(loadFile, "loadFile", {
  value: loadFile
}));