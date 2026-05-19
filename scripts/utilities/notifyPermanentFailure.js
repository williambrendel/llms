"use strict";

/**
 * @file notifyPermanentFailure.js
 * @module utilities/notifyPermanentFailure
 * @description Placeholder for permanent-failure notification.
 *
 * Fires when an entry in a PendingQueue (e.g. a new vector binary that
 * the build endpoint produced) fails to load `maxRetries` times in a
 * row. After that many failures, retrying is unlikely to help — most
 * likely the file is corrupt, the path is wrong, or the parse fails
 * deterministically. We give up automatic retries, move the entry to
 * the .failed.json sidecar (so it doesn't block future queries), and
 * notify someone who can investigate.
 *
 * Today: log to console.error so the failure is visible in stdout.
 * Tomorrow: send an email (or Slack/PagerDuty/etc.) to an ops list so
 * permanent failures get human attention. The shape of `details` is
 * already designed to populate an email body — entry path, retry
 * count, last error message, timestamp.
 *
 * TODO: wire the email transport
 *   - Decide the recipient list (env var? config file? config table?)
 *   - Pick a transport (nodemailer + SMTP, SendGrid SDK, SES, etc.)
 *   - Format the email body — include entry details, last error,
 *     timestamp, server hostname, and a link to the failed.json file
 *     so an operator can act on it without digging through logs.
 *   - Rate-limit or batch — a corrupt file dumped into pending.json
 *     would spam the recipient on every retry cycle otherwise.
 *
 * @async
 * @param {object} details
 * @param {string} details.kind         - "bin" or "markdown" — which queue.
 * @param {string} details.entryPath    - The bin path or md path that failed.
 * @param {number} details.retries      - Total retries before giving up.
 * @param {string} details.lastError    - Message of the last failure.
 * @param {string} details.timestamp    - ISO 8601 timestamp.
 *
 * @returns {Promise<void>}
 */
const notifyPermanentFailure = async ({ kind, entryPath, retries, lastError, timestamp } = {}) => {
  // TODO: replace this console.error with an email send.
  // See file-level docstring for the wiring checklist.
  console.error(
    `[PERMANENT FAILURE] ${kind}=${entryPath} ` +
    `retries=${retries} ts=${timestamp} ` +
    `lastError=${lastError}`
  );
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(notifyPermanentFailure, "notifyPermanentFailure", {
  value: notifyPermanentFailure,
}));
