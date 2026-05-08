"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @typedef {Object} MkdirOptions
 * @property {boolean} [normalizePath=true] - When `true`, `path.normalize` is
 *                                            applied before creation. Pass `false`
 *                                            only if the path is already normalized.
 * @property {boolean} [recursive=true]     - When `true`, all intermediate parent
 *                                            directories are created as needed.
 *                                            Set to `false` to restrict creation
 *                                            to the final segment only.
 */

/**
 * @function mkdir
 * @description
 * Recursively creates a directory and all intermediate parent directories,
 * equivalent to `mkdir -p`. Delegates to `fs.mkdirSync` with
 * `{ recursive: true }`, which is a no-op if the directory already exists.
 *
 * @param {string}       dir                          - Directory path to create.
 * @param {MkdirOptions} [options]                    - Creation options.
 * @param {boolean}      [options.normalizePath=true] - Normalize path before creation.
 * @param {boolean}      [options.recursive=true]     - Create intermediate directories.
 *
 * @returns {string} The `dir` path (normalized if `options.normalizePath` was `true`).
 *
 * @throws {NodeJS.ErrnoException} Propagates any `fs.mkdirSync` error (e.g.
 *                                 `EACCES`, `ENOTDIR`) if the directory cannot
 *                                 be created.
 *
 * @example
 * // Defaults — normalize and create intermediates
 * mkdir("/var/app/logs/archive");
 *
 * @example
 * // Skip normalization when path is already clean
 * mkdir("/var/app/logs", { normalizePath: false });
 *
 * @example
 * // Single-level only — throws if parent does not exist
 * mkdir("/var/app/logs/archive", { recursive: false });
 */
const mkdir = (dir, { normalizePath = true, recursive = true } = {}) => {
  normalizePath && (dir = path.normalize(dir));
  fs.mkdirSync(dir, { recursive });
  return dir;
}

/**
 * @function mkdir.fromFilename
 * @description
 * Convenience wrapper that creates all directories along the path of a given
 * filename. Equivalent to calling `mkdir(path.dirname(filename))`.
 *
 * Useful when a file is about to be written and its parent directories may
 * not yet exist.
 *
 * @param {string}       filename                     - Full file path whose parent
 *                                                      directories should be created.
 * @param {MkdirOptions} [options]                    - Creation options.
 * @param {boolean}      [options.normalizePath=true] - Normalize path before creation.
 * @param {boolean}      [options.recursive=true]     - Create intermediate directories.
 *
 * @returns {string} The original `filename` (normalized if `options.normalizePath`
 *                   was `true`), allowing callers to use it immediately after
 *                   ensuring the directory exists.
 *
 * @throws {NodeJS.ErrnoException} Propagates any error thrown by {@link mkdir}.
 *
 * @example
 * const filepath = mkdir.fromFilename("/var/app/logs/archive/server.log");
 * fs.writeFileSync(filepath, "");
 * // Ensures /var/app/logs/archive/ exists, then returns the filename.
 *
 * @example
 * // Skip normalization on an already-clean path
 * mkdir.fromFilename("/var/app/logs/server.log", { normalizePath: false });
 */
mkdir.fromFilename = (filename, { normalizePath = true, recursive = true } = {}) => {
  normalizePath && (filename = path.normalize(filename));
  mkdir(path.dirname(filename), { normalizePath: false, recursive });
  return filename;
}

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(mkdir, "mkdir", {
  value: mkdir
}));