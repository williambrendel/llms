"use strict";

/**
 * @file formatDuration.js
 * @module utilities/formatDuration
 * @description Compact, human-readable duration formatting in milliseconds.
 */

/**
 * Formats a millisecond duration as a compact human-readable string.
 *
 * Scale-adaptive — switches units automatically:
 *   - `< 1s`  → `"980ms"`
 *   - `< 1m`  → `"1.5s"`
 *   - `< 1h`  → `"1m02s"`
 *   - `≥ 1h`  → `"1h02m05s"`
 *
 * Useful for build logs and progress reporting where total times can range
 * from sub-second probes to multi-hour ingestions.
 *
 * @function formatDuration
 * @param {number} ms - Duration in milliseconds. Non-negative.
 * @returns {string} Compact formatted duration.
 *
 * @example
 *   formatDuration(980);     // → "980ms"
 *   formatDuration(1450);    // → "1.5s"
 *   formatDuration(62_000);  // → "1m02s"
 *   formatDuration(3_725_000); // → "1h02m05s"
 */
const formatDuration = ms => {
  if (ms < 1000)    return `${Math.round(ms)}ms`;
  if (ms < 60_000)  return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}m${String(s).padStart(2, "0")}s`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(formatDuration, "formatDuration", {
  value: formatDuration,
}));
