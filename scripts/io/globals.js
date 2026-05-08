/**
 * @file env.js
 * @description Static environment constants resolved once at process startup.
 */

/**
 * @type {string}
 * @description The current operating system platform, lower-cased.
 * Derived from `process.platform` (e.g. `"linux"`, `"darwin"`, `"win32"`).
 */
const PLATFORM = process.platform.toLowerCase();

/**
 * @type {string}
 * @description Absolute path of the working directory at process startup.
 * Equivalent to `process.cwd()` captured once at module load time.
 */
const ROOT = (function () { return process.cwd(); })();

/**
 * @type {boolean}
 * @description `true` when `NODE_ENV` contains the substring `"prod"` (case-insensitive),
 * `false` otherwise. Treats a missing or empty `NODE_ENV` as non-production.
 *
 * @example
 * NODE_ENV=production   // → true
 * NODE_ENV=prod         // → true
 * NODE_ENV=development  // → false
 * NODE_ENV=             // → false  (unset)
 */
const PRODUCTION = (process.env.NODE_ENV || "").toLowerCase().includes("prod");

/**
 * @ignore
 * Default export.
 */
module.exports = { PLATFORM, ROOT, PRODUCTION };