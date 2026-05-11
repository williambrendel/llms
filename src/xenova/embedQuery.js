/**
 * @file embedQuery.js
 * @brief Asymmetric query embedding for BGE-family retrieval encoders.
 *
 * Wraps `vectorize` with the BGE-v1.5 query-side instruction prefix so the
 * resulting embedding lands in the model's query subspace, properly aligned
 * with bare-text passage embeddings in the index. Passages are encoded
 * without a prefix; only the user query is prefixed.
 *
 * @see https://huggingface.co/BAAI/bge-small-en-v1.5
 */

/**
 * @constant {string} QUERY_PREFIX
 * @brief BGE-v1.5 query-side instruction.
 *
 * Prepended to user queries at retrieval time. Must NOT be applied to
 * passages during ingestion — doing so collapses the query/passage
 * asymmetry the model was trained to exploit and degrades recall.
 */
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

/**
 * @function embedQuery
 * @brief Embed a user query for cosine-similarity retrieval.
 *
 * Prepends the BGE query instruction to @p userQuery and forwards the
 * resulting string to `vectorize`. The returned vector is in the query
 * subspace and is intended to be compared against bare-text passage
 * vectors stored in the knowledge base.
 *
 * @param {string} userQuery
 *   The raw user query, with no instruction prefix applied. Leading and
 *   trailing whitespace is preserved as-is.
 * @param {string} [prefix=QUERY_PREFIX]
 *   Override for the instruction prefix. Defaults to the BGE-v1.5
 *   instruction. Override only if switching to a different encoder
 *   family with a different query convention (e.g. E5's "query: ").
 *
 * @returns {Promise<Float32Array>}
 *   Resolves to the query embedding. Dimensionality matches the
 *   underlying encoder (384 for bge-small-en-v1.5).
 *
 * @example
 *   const queryVec = await embedQuery("bugs keep coming back after shock");
 *   // Compare against passage vectors via dot product (assumes normalized embeddings).
 */
const embedQuery = (userQuery, prefix = QUERY_PREFIX) => (
  vectorize(`${prefix || ""}${(userQuery || "").trim()}`)
);

/**
 * @ignore
 * Frozen self-referential export following project conventions.
 */
module.exports = Object.freeze(Object.defineProperty(embedQuery, "embedQuery", {
  value: embedQuery,
}));