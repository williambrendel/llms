const { pipeline } = require('@xenova/transformers');
const CONFIG = require("./config");

/**
 * @function summarize
 * @async
 * @description
 * Executes a neural summarization operation on a provided text body. This 
 * function utilizes a transformer-based sequence-to-sequence pipeline to 
 * condense lengthy input into a concise, coherent summary while 
 * preserving the core semantic meaning.
 *
 * The function is designed for high-precision, factual summarization. It 
 * defaults to greedy decoding (non-sampling) to ensure consistency across 
 * repeated calls, making it suitable for automated reporting and 
 * knowledge-base distillation.
 *
 * Like other pipeline utilities, it supports lazy initialization; it will 
 * reuse a preloaded summarizer instance or create a new one on-demand 
 * based on the provided model configuration.
 *
 * @param {string} text
 * The source text or document to be summarized.
 *
 * @param {Object} [options={}]
 * Configuration object for the summarization process.
 *
 * @param {number} [options.max_length=200]
 * The maximum number of tokens allowed in the output summary.
 *
 * @param {number} [options.max_new_tokens=200]
 * The maximum number of new tokens to generate, defaulting to the max_length.
 *
 * @param {number} [options.min_length=20]
 * The minimum number of tokens required for the output summary.
 *
 * @param {boolean} [options.do_sample=false]
 * Whether to use stochastic sampling. Set to false for deterministic, factual outputs.
 *
 * @param {*} [options.summarizer]
 * Preloaded @xenova/transformers summarization pipeline instance.
 *
 * @param {string} [options.summarizationModel=CONFIG.summarizationModel]
 * Model name used to initialize the pipeline if a preloaded instance is not supplied.
 *
 * @returns {Promise<string>}
 * Resolves to the generated summary text string.
 *
 * @example
 * const summary = await summarize(
 * "The specific heat capacity of water is high due to hydrogen bonding...",
 * { max_length: 50, min_length: 10 }
 * );
 * * console.log(summary); // "Water's high heat capacity results from hydrogen bonding."
 *
 * @notes
 * - The process is **abstractive**; the model may paraphrase or use synonyms 
 * to condense the information rather than just extracting sentences.
 * - For large documents, ensure the input text does not exceed the model's 
 * maximum context window (typically 512 or 1024 tokens).
 *
 * @throws {Error}
 * Throws if the summarization pipeline fails to initialize or the model 
 * encounter errors during inference.
 */
let model;
const summarize = async (
  text,
  {
    max_length = 200,
    max_new_tokens = max_length,
    min_length = 20,
    do_sample = false, // Set to false for consistent, factual results
    summarizer,
    summarizationModel,
    ...other
  } = {}
) => {

  // Init question summarization engine if needed.
  summarizer || (
    summarizer = model || (model = await createSummarizer(summarizationModel))
  );
  const result = await summarizer(text, {
    max_length: max_new_tokens,
    max_new_tokens,
    min_length,
    do_sample,
    ...other
  });
  return result[0].summary_text;
}

const createSummarizer = summarize.createSummarizer = async summarizationModel => (
  await pipeline("summarization", summarizationModel || CONFIG.summarizationModel)
);

/**
 * @function summarize.batch
 * @async
 * @description
 * Batched variant of {@link summarize}. Accepts an array of text strings and
 * processes them in a single forward pass for significantly better throughput
 * than N sequential calls.
 *
 * @param {string[]} texts   - Array of source texts to summarize.
 * @param {Object}   options - Same options as {@link summarize}.
 * @returns {Promise<string[]>} Array of summary strings in input order.
 *
 * @example
 * const summaries = await summarize.batch(segmentTexts, {
 *   summarizer,
 *   min_length: 3,
 *   max_length: 8,
 *   length_penalty: -1.0,
 * });
 */
summarize.batch = async (
  texts,
  {
    max_length = 200,
    max_new_tokens = max_length,
    min_length = 20,
    do_sample = false,
    summarizer,
    summarizationModel,
    ...other
  } = {}
) => {
  summarizer || (
    summarizer = model || (model = await createSummarizer(summarizationModel))
  );
  const results = await summarizer(texts, {
    max_length: max_new_tokens,
    max_new_tokens,
    min_length,
    do_sample,
    ...other
  });
  // Pipeline returns [[{summary_text}], [{summary_text}], ...] for batch input.
  return results.map(r => (Array.isArray(r) ? r[0] : r).summary_text);
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(summarize, "summarize", {
  value: summarize
}));