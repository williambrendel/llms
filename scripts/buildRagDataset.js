const fs   = require("fs");
const path = require("path");
const segmentTextSections = require("../src/utilities/textSegmentation/segmentTextSections");
const getFilenames = require("./io/getFilenames");
const loadFile = require("./io/loadFile");
const synthesize = require("../src/xenova/synthesize");
const SpellEngine = require("../src/SpellEngine");

/** Shared synthesizer options applied to every batch call. */
const SYNTH_BASE = { num_beams: 4, repetition_penalty: 1.3, no_repeat_ngram_size: 2 };
const SYNTH_TOPIC = {
  ...SYNTH_BASE, temperature: 0.3, min_length: 3, max_new_tokens: 32, length_penalty: 0.8
};
const SYNTH_QUESTION = {
  ...SYNTH_BASE, temperature: 0.1, min_length: 3, max_new_tokens: 96, length_penalty: 0.8
};
const SYNTH_STATEMENT = {
  ...SYNTH_BASE, temperature: 0.3, min_length: 1, max_new_tokens: 32, length_penalty: 0.8
};
const SYNTH_VARIANT = {
  ...SYNTH_BASE, temperature: 0.5, min_length: 5, max_new_tokens: 48, do_sample: true
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filenames = getFilenames(args[0]);

// ─────────────────────────────────────────────────────────────────────────────
// Process filename
// ─────────────────────────────────────────────────────────────────────────────

const processFile = async data => {
  if (!data) throw Error(`Missing input data`);

  // 1. Extract sections.
  const sections = segmentTextSections(data).contentSections();

  // 2. Process each section.
  const output = [];
  for (let i = 0, l = sections.length, section, content, headerBreadcrumbs; i !== l; ++i) {
    section = sections[i];
    headerBreadcrumbs = (
      section.header && [...section.ancestors, section.header] || section.ancestors
    ).map(h => h.extractTitle(data)).join(" > ");
    content = section.extract(data);
    const spell = await SpellEngine.createEnglish(...content.split(/[^a-z0-9\-]+/gi));
    const questions = parseQuestions(await synthesize(`generate 3 short and concise google search query questions: ${content}`, SYNTH_QUESTION))
        .filter(q => isGrounded(q, content, 0.4))
        .slice(0, 3);
    const out = {
      range: [section.start, section.end],
      headerBreadcrumbs,
      content,
      questions,
      corrected: questions.map(q => q.replace(/\_/g, "-").split(/([^a-z0-9\-]+)/gi).map(w => /^[a-z0-9\-]+$/i.test(w) ? spell.correct(w) : w).join(""))
    };

    console.log(out);

    output.push(out);
  }
}

const STOPWORDS = new Set([
  "the","a","an","of","is","are","in","to","and","or","for","by","with","that",
  "this","what","how","why","when","where","who","which","do","does","can","could",
  "should","would","be","been","being","have","has","had","they","their","them",
  "these","those","it","its","on","as","at","from","but","not","no","so","if","than"
]);

const contentWords = (s) =>
  s.toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

const isGrounded = (question, sourceText, threshold = 0.4) => {
  const sourceSet = new Set(contentWords(sourceText));
  const qWords = contentWords(question);
  if (qWords.length === 0) return false;
  const overlap = qWords.filter(w => sourceSet.has(w)).length;
  return overlap / qWords.length >= threshold;
};

const SKIP_TITLES = /^(overview|executive summary|summary|key takeaways?|conclusion|introduction|abstract)$/i;

const isQuestion = (s) =>
  s.trim().endsWith("?") || /^(what|why|how|when|where|who|which|does|do|is|are|can|should|would|could)\b/i.test(s.trim());

/**
 * @function parseTopics
 * @description Parses a raw comma/semicolon-delimited topic string into a
 * deduplicated lowercase array. Strips any echoed instruction prefix first.
 *
 * @param {string} raw - Raw model output.
 * @returns {string[]}
 */
const parseTopics = raw =>
  [...new Set(
    stripPrefix(raw)
      .split(/[,;\n]+/)
      .map(t => t.trim().replace(/^[-•*]\s*/, "").replace(/\.$/, "").toLowerCase())
      .filter(t => t.length > 1)
  )];

/**
 * @function parseQuestions
 * @description Parses a raw question string into an array of individual
 * questions. Splits on `?` characters, strips prefixes, filters short results,
 * and ensures each entry ends with `?`.
 *
 * @param {string} raw - Raw model output.
 * @returns {string[]}
 */
const parseQuestions = raw =>
  [...new Set(
    stripPrefix(raw)
      .split(/\?+/)
      .map(q => q.trim().replace(/^\d+\.\s*/, ""))  // strip "1. " "2. " enumeration
      .filter(q => q.length >= 8)                   // reject fragments
      .map(q => `${q}?`)
  )];

/**
 * @function stripPrefix
 * @description Strips any echoed instruction prefix the model may prepend to
 * its output, e.g. `"topics: "`, `"generate questions: "`. Matches a run of
 * word characters and spaces followed by a colon at the start of the string.
 *
 * @param {string} raw - Raw model output.
 * @returns {string}
 */
const stripPrefix = raw => raw.replace(/^[\w\s]+:\s*/i, "").trim();

const main = async () => {
  for (const filename of filenames) {
    const { data } = await loadFile(filename);
    processFile(data);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}