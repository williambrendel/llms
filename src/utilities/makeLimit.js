"use strict";

/**
 * @file makeLimit.js
 * @module utilities/makeLimit
 * @description FIFO concurrency limiter for async work.
 */

/**
 * Creates a function that runs async thunks under a fixed concurrency cap.
 *
 * The returned function accepts a zero-argument async function and returns
 * a promise that resolves with its result. Work is queued FIFO; rejections
 * propagate to the caller of the limited function without breaking the
 * queue or affecting other in-flight work.
 *
 * Typical use is at module scope so multiple call sites share one rate-limit
 * pool (e.g. all LLM calls across all files going through one
 * `makeLimit(4)`).
 *
 * @function makeLimit
 * @param {number} concurrency - Maximum number of in-flight thunks at once.
 *   Must be a positive integer.
 * @returns {(fn: () => Promise<any>) => Promise<any>} A limiter function.
 *
 * @example
 *   const limit = makeLimit(4);
 *   const results = await Promise.all(
 *     urls.map(url => limit(() => fetch(url)))
 *   );
 *   // At most 4 fetches in flight at any time; rest queue FIFO.
 */
const makeLimit = (concurrency) => {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    ++active;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      --active;
      next();
    });
  };

  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(makeLimit, "makeLimit", {
  value: makeLimit,
}));
