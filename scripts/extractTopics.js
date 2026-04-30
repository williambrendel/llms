#!/usr/bin/env node
"use strict";

/**
 * @file extractTopics.js
 * @description
 * Processes text files and builds a flat node array — one entry per section
 * or segment — each carrying:
 *
 *   topics   — string[]  keywords (sections: inferred; segments: inherited from parent)
 *   strings  — string[]  all embeddable text variants, deduplicated:
 *                          sections:  [body/summary, title?, ...question variants, ...paraphrase variants]
 *                          segments:  [original, ...question variants, ...paraphrase variants]
 *
 * Pipeline per file (three sequential steps, sections + segments processed together):
 *   1. topics+questions — extract topics (sections) and questions (all nodes)
 *   2. topics+Q  — extract topics and questions (five concurrent batches)
 *   3. paraphrase — paraphrase all content and questions in one flat batch
 *
 * After each step, a timing line is printed to stdout. After assembly,
 * each node is printed with its index (n/total), label, and signal counts.
 *
 * Output JSON shape per file:
 *   {
 *     file, durationMs,
 *     timings: { content, topicsQuestions, paraphrase },
 *     sections, segments,
 *     nodes: [
 *       {
 *         type: "section",
 *         level, start, end,
 *         header?:    { start, end },   ← heading line byte range
 *         body:       { start, end },   ← span of all direct body segments
 *         topics:  string[],
 *         strings: string[],
 *       },
 *       {
 *         type: "segment",
 *         start, end,
 *         topics:  string[],            ← inherited from closest parent section
 *         strings: string[],
 *       }
 *     ]
 *   }
 *
 * Usage:
 *   node extractTopics.js <path>
 *   node extractTopics.js <path> --out <dir>
 *   node extractTopics.js <path> --ext .md
 *   node extractTopics.js <path> --concurrency 3
 *   node extractTopics.js <path> --min-len 20
 *   node extractTopics.js <path> --max-body 400
 *   node extractTopics.js <path> --markdown
 */

const fs   = require("fs");
const path = require("path");

const segmentTextSections         = require("../src/xenova/textSegmentation/segmentTextSections");
const segmentMarkdownTextSections = require("../src/xenova/textSegmentation/segmentMarkdownTextSections");
const synthesize                  = require("../src/xenova/synthesize");

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (!args.length || args[0] === "--help" || args[0] === "-h") {
  console.log(`
Usage:
  node extractTopics.js <path> [options]

Options:
  --out <dir>       Write JSON output per file to this directory.
  --ext <exts>      Comma-separated extensions (default: .txt,.md).
  --concurrency <n> Parallel file limit (default: 2).
  --min-len <n>     Minimum text chars to process (default: 20).
  --max-body <n>    Max section body chars before summarizing (default: 400).
  --markdown        Parse files as markdown.
  --help            Show this help.
`.trim());
  process.exit(0);
}

const inputPath   = args[0];
const outDir      = args.includes("--out")         ? args[args.indexOf("--out")         + 1] : null;
const extArg      = args.includes("--ext")         ? args[args.indexOf("--ext")         + 1] : ".txt,.md";
const concurrency = args.includes("--concurrency") ? parseInt(args[args.indexOf("--concurrency") + 1], 10) : 2;
const minLen      = args.includes("--min-len")     ? parseInt(args[args.indexOf("--min-len")     + 1], 10) : 20;
const maxBody     = args.includes("--max-body")    ? parseInt(args[args.indexOf("--max-body")    + 1], 10) : 400;
const useMarkdown = args.includes("--markdown");

const ALLOWED_EXTS = new Set(extArg.split(",").map(e => e.trim().toLowerCase()));

// ─────────────────────────────────────────────────────────────────────────────
// File discovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function collectFiles
 * @description Recursively collects all files matching {@link ALLOWED_EXTS}
 * under `root`. If `root` is a file, returns it directly when its extension
 * matches, otherwise an empty array.
 *
 * @param {string} root - File path or directory path to search.
 * @returns {string[]} Absolute paths of matching files.
 */
const collectFiles = root => {
  const stat = fs.statSync(root);
  if (stat.isFile())
    return ALLOWED_EXTS.has(path.extname(root).toLowerCase()) ? [root] : [];
  const results = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    entry.isDirectory()
      ? results.push(...collectFiles(full))
      : ALLOWED_EXTS.has(path.extname(entry.name).toLowerCase()) && results.push(full);
  }
  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function _ms
 * @description Formats a millisecond count as a right-aligned `"  1.4s"` string
 * suitable for aligned console output.
 *
 * @param {number} ms
 * @returns {string}
 */
const _ms = ms => `${(ms / 1000).toFixed(1)}s`.padStart(6);

/**
 * @function isSegNode
 * @description Returns `true` when `x` is a body segment (Segment or Header —
 * both are `Uint32Array` subclasses with a uint32 number at `[0]`).
 * Returns `false` for Section instances (arrays whose `[0]` is an object).
 *
 * @param {*} x
 * @returns {boolean}
 */
const isSegNode = x => typeof x[0] === "number";

/**
 * @function extractText
 * @description Extracts the source text covered by `node`. Uses `.extract(text)`
 * when available (Segment/Header/Section), otherwise falls back to
 * `text.slice(node[0], node[1])`.
 *
 * @param {Segment|Section} node
 * @param {string} text - Original source text.
 * @returns {string}
 */
const extractText = (node, text) =>
  node.extract ? node.extract(text) : text.slice(node[0], node[1]);

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

/**
 * @function dedupe
 * @description Deduplicates an array of strings case-insensitively, preserving
 * first-seen order. Filters out entries shorter than 3 characters.
 *
 * @param {string[]} arr
 * @returns {string[]}
 */
const dedupe = arr => {
  const seen = new Set();
  return arr.filter(s => {
    const k = s.trim().toLowerCase();
    if (!k || k.length < 3 || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

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
    stripPrefix(raw).split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 1)
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
    stripPrefix(raw).split(/\?+/).map(q => q.trim()).filter(q => q.length > 4)
                    .map(q => `${q}?`)
  )];

/**
 * @function timed
 * @description Wraps a promise and resolves with `{ value, ms }` where `ms`
 * is the wall-clock elapsed time in milliseconds.
 *
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<{ value: T, ms: number }>}
 */
const timed = async promise => {
  const t = Date.now();
  const value = await promise;
  return { value, ms: Date.now() - t };
};

// ─────────────────────────────────────────────────────────────────────────────
// Batched inference helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Shared synthesizer options applied to every batch call. */
const SYNTH_BASE = { num_beams: 4, repetition_penalty: 1.3, no_repeat_ngram_size: 2 };

/**
 * @function batchTopics
 * @description Extracts topic keywords from a batch of texts using the
 * `"extract topics: <text>"` prompt. Returns `[]` immediately when `texts`
 * is empty to avoid a zero-length forward pass.
 *
 * @param {string[]} texts
 * @param {Function} synthesizer - Pre-loaded synthesizer pipeline.
 * @returns {Promise<string[]>} One raw topic string per input text.
 */
const batchTopics = (texts, synthesizer) =>
  texts.length
    ? synthesize.batch(texts.map(t => `extract topics: ${t}`),
        { ...SYNTH_BASE, synthesizer, temperature: 0.3, min_length: 3, max_new_tokens: 32, length_penalty: 0.8 })
    : Promise.resolve([]);

/**
 * @function batchQuestions
 * @description Generates questions from a batch of texts using the
 * `"generate questions: <text>"` prompt with higher temperature for variety.
 *
 * @param {string[]} texts
 * @param {Function} synthesizer
 * @returns {Promise<string[]>} One raw question string per input text.
 */
const batchQuestions = (texts, synthesizer) =>
  texts.length
    ? synthesize.batch(texts.map(t => `generate questions: ${t}`),
        { ...SYNTH_BASE, synthesizer, temperature: 0.7, do_sample: true, min_length: 5, max_new_tokens: 48 })
    : Promise.resolve([]);

/**
 * @function batchParaphrase
 * @description Paraphrases a batch of texts using the `"paraphrase: <text>"`
 * prompt. Used both for content and for individual questions.
 *
 * @param {string[]} texts
 * @param {Function} synthesizer
 * @returns {Promise<string[]>} One paraphrase string per input text.
 */
const batchParaphrase = (texts, synthesizer) =>
  texts.length
    ? synthesize.batch(texts.map(t => `paraphrase: ${t}`),
        { ...SYNTH_BASE, synthesizer, temperature: 0.5, do_sample: true, min_length: 5, max_new_tokens: 48 })
    : Promise.resolve([]);

// ─────────────────────────────────────────────────────────────────────────────
// Processing steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function stepTopicsAndQuestions
 * @description Step 1 — extracts topics and questions. Exactly 2 forward passes.
 *
 * Input per node (one clean short text):
 *   - Section with header    → extracted title (heading line stripped of `#`)
 *   - Section without header → text of first direct body segment
 *   - Segment                → segment text (topics skipped — inherited later)
 *
 * Topics batch  : section inputs only.
 * Questions batch: all inputs (sections + segments) in one flat call.
 *
 * @param {string[]} sectionInputs - One inference text per section.
 * @param {string[]} segmentTexts  - One text per segment.
 * @param {Function} synthesizer
 * @returns {Promise<{
 *   sectionTopics:    string[][],
 *   sectionQuestions: string[][],
 *   segmentQuestions: string[][],
 *   ms: number
 * }>}
 */
const stepTopicsAndQuestions = async (sectionInputs, segmentTexts, synthesizer) => {
  const t0 = Date.now();
  const [topicRaws, questionRaws] = await Promise.all([
    batchTopics(sectionInputs, synthesizer),
    batchQuestions([...sectionInputs, ...segmentTexts], synthesizer),
  ]);
  const ms = Date.now() - t0;

  const sectionTopics    = sectionInputs.map((_, i) => parseTopics(topicRaws[i]       ?? ""));
  const sectionQuestions = sectionInputs.map((_, i) => parseQuestions(questionRaws[i] ?? ""));
  const segmentQuestions = segmentTexts .map((_, i) => parseQuestions(questionRaws[sectionInputs.length + i] ?? ""));

  return { sectionTopics, sectionQuestions, segmentQuestions, ms };
};

/**
 * @function stepParaphrase
 * @description Step 2 — paraphrases all inputs and questions in one flat batch.
 *
 * For each node: input text + each question → one paraphrase each.
 * Everything goes into a single `batchParaphrase` call for maximum throughput.
 *
 * @param {string[]}   sectionInputs
 * @param {string[][]} sectionQuestions
 * @param {string[]}   segmentTexts
 * @param {string[][]} segmentQuestions
 * @param {Function}   synthesizer
 * @returns {Promise<{
 *   raws:    string[],
 *   secSpans: Array<{ input: number, qStart: number, qEnd: number }>,
 *   segSpans: Array<{ input: number, qStart: number, qEnd: number }>,
 *   ms:      number
 * }>}
 */
const stepParaphrase = async (sectionInputs, sectionQuestions, segmentTexts, segmentQuestions, synthesizer) => {
  const batch    = [];
  const secSpans = [];
  const segSpans = [];

  for (let i = 0; i < sectionInputs.length; i++) {
    const inputIdx = batch.push(sectionInputs[i]) - 1;
    const qStart   = batch.length;
    sectionQuestions[i].forEach(q => batch.push(q));
    secSpans.push({ input: inputIdx, qStart, qEnd: batch.length });
  }

  for (let i = 0; i < segmentTexts.length; i++) {
    const inputIdx = batch.push(segmentTexts[i]) - 1;
    const qStart   = batch.length;
    segmentQuestions[i].forEach(q => batch.push(q));
    segSpans.push({ input: inputIdx, qStart, qEnd: batch.length });
  }

  const { value: raws, ms } = await timed(batchParaphrase(batch, synthesizer));
  return { raws, secSpans, segSpans, ms };
};

/**
 * @function assembleResults
 * @description Assembles `toEmbed[]` per node from step outputs.
 *
 * `toEmbed[]` = deduplicated array of all embeddable strings:
 *   [input, ...questions interleaved with paraphrase variants, input_variant]
 *
 * `topics[]` for sections comes from step 1.
 * Segments receive empty topics here — inherited in processFile.
 *
 * @param {string[]}   sectionInputs
 * @param {string[][]} sectionTopics
 * @param {string[][]} sectionQuestions
 * @param {string[]}   segmentTexts
 * @param {string[][]} segmentQuestions
 * @param {{ raws: string[], secSpans: object[], segSpans: object[] }} paraphrase
 * @returns {{ sectionResults: Array<{topics, toEmbed}>, segmentResults: Array<{toEmbed}> }}
 */
const assembleResults = (sectionInputs, sectionTopics, sectionQuestions, segmentTexts, segmentQuestions, { raws, secSpans, segSpans }) => {
  const sectionResults = sectionInputs.map((inp, i) => {
    const { input, qStart } = secSpans[i];
    const inputVariant = stripPrefix(raws[input] ?? "");
    const questionStrings = sectionQuestions[i].flatMap((q, qi) => {
      const v = stripPrefix(raws[qStart + qi] ?? "");
      return v.length > 4 ? [q, v] : [q];
    });
    return {
      topics:  sectionTopics[i],
      toEmbed: dedupe([inp, ...questionStrings, ...(inputVariant.length > 4 ? [inputVariant] : [])]),
    };
  });

  const segmentResults = segmentTexts.map((inp, i) => {
    const { input, qStart } = segSpans[i];
    const inputVariant = stripPrefix(raws[input] ?? "");
    const questionStrings = segmentQuestions[i].flatMap((q, qi) => {
      const v = stripPrefix(raws[qStart + qi] ?? "");
      return v.length > 4 ? [q, v] : [q];
    });
    return {
      toEmbed: dedupe([inp, ...questionStrings, ...(inputVariant.length > 4 ? [inputVariant] : [])]),
    };
  });

  return { sectionResults, segmentResults };
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-file processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function processFile
 * @description Reads a file, segments it, runs the three-step pipeline, and
 * returns the flat node result. Prints step timings and per-node stats
 * (`n/total  [type] label  topics:N  strings:M`) as output becomes available.
 *
 * @param {string}   filePath
 * @param {Function} synthesizer - Pre-loaded LaMini-Flan-T5 synthesizer.
 * @param {Function} synthesizer - Pre-loaded LaMini-Flan-T5 synthesizer.
 * @returns {Promise<{
 *   file:       string,
 *   durationMs: number,
 *   timings:    { content: number, topicsQuestions: number, paraphrase: number },
 *   sections:   number,
 *   segments:   number,
 *   nodes:      object[]
 * }>}
 */
const processFile = async (filePath, synthesizer) => {
  const t0         = Date.now();
  const text       = fs.readFileSync(filePath, "utf8");
  const isMarkdown = useMarkdown || path.extname(filePath).toLowerCase() === ".md";
  const sections   = isMarkdown
    ? segmentMarkdownTextSections(text)
    : segmentTextSections(text);

  const nodes = sections.reduce((out, s) => {
    s.flatten ? out.push(...s.flatten()) : out.push(s);
    return out;
  }, []);

  const segCount = nodes.filter(isSegNode).length;
  const secCount = nodes.length - segCount;
  const total    = nodes.length;

  const relPath = path.relative(process.cwd(), filePath);
  console.log(`\n📄 ${relPath}  [${isMarkdown ? "markdown" : "plain"}]`);
  console.log(`   ${secCount} section${secCount === 1 ? "" : "s"}, ${segCount} segment${segCount === 1 ? "" : "s"}`);

  // ── Collect inputs ───────────────────────────────────────────────────────────
  // One clean short text per node:
  //   Section with header    → extracted title (stripped of #)
  //   Section without header → text of first direct body segment
  //   Segment                → segment text
  const sectionInputs  = [];
  const sectionIndices = [];
  const segmentTexts   = [];
  const segmentIndices = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isSegNode(node)) {
      const header  = node.header;
      const content = node.content;
      const input   = header
        ? header.extractTitle(text)
        : extractText(content.find(isSegNode), text);
      if (input && input.length >= minLen) {
        sectionInputs.push(input);
        sectionIndices.push(i);
      }
    } else {
      const t = extractText(node, text);
      if (t.length >= minLen) {
        segmentTexts.push(t);
        segmentIndices.push(i);
      }
    }
  }

  // ── Step 1: topics + questions ───────────────────────────────────────────────
  const { sectionTopics, sectionQuestions, segmentQuestions, ms: tqMs } =
    await stepTopicsAndQuestions(sectionInputs, segmentTexts, synthesizer);
  console.log(`   topics+questions ${_ms(tqMs)}`);

  // ── Step 2: paraphrase ───────────────────────────────────────────────────────
  const paraphrase = await stepParaphrase(
    sectionInputs, sectionQuestions,
    segmentTexts, segmentQuestions, synthesizer
  );
  console.log(`   paraphrase       ${_ms(paraphrase.ms)}`);

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const { sectionResults, segmentResults } = assembleResults(
    sectionInputs, sectionTopics, sectionQuestions,
    segmentTexts, segmentQuestions, paraphrase
  );

  // ── Build signal map ─────────────────────────────────────────────────────────
  const signalMap = new Map();
  sectionIndices.forEach((ni, i) => signalMap.set(ni, sectionResults[i]));
  segmentIndices.forEach((ni, i) => signalMap.set(ni, segmentResults[i]));

  // ── Inherit topics: most-recently-seen section → all following segments ───────
  let currentTopics = [];
  for (let i = 0; i < nodes.length; i++) {
    const sig = signalMap.get(i);
    if (!sig) continue;
    if (!isSegNode(nodes[i])) currentTopics = sig.topics ?? [];
    else sig.topics = currentTopics;
  }

  // ── Build output nodes, printing each result as it's assembled ──────────────
  const pad         = String(total).length;
  const nodeResults = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const sig  = signalMap.get(i) ?? { topics: [], toEmbed: [] };
    const idx  = `${String(i + 1).padStart(pad)}/${total}`;

    if (!isSegNode(node)) {
      const header  = node.header;
      const content = node.content;
      const result  = {
        type:    "section",
        level:   node.level ?? 0,
        start:   node.start,
        end:     node.end,
        body:    { start: content.start, end: content.end },
        topics:  sig.topics  ?? [],
        toEmbed: sig.toEmbed ?? [],
      };
      if (header) result.header = { start: header[0], end: header[1] };
      const label = header ? header.extractTitle(text).slice(0, 60) : `[${node.start}–${node.end}]`;
      console.log(`   ${idx}  [section] ${label}`);
      if (result.topics.length)
        console.log(`          topics:  ${result.topics.join(", ")}`);
      result.toEmbed.forEach((s, si) => console.log(`          [${si}] ${s}`));
      nodeResults.push(result);
    } else {
      const result = {
        type:    "segment",
        start:   node[0],
        end:     node[1],
        topics:  sig.topics  ?? [],
        toEmbed: sig.toEmbed ?? [],
      };
      const label = extractText(node, text).slice(0, 60).replace(/\n/g, " ");
      console.log(`   ${idx}  [segment] "${label}"`);
      if (result.topics.length)
        console.log(`          topics:  ${result.topics.join(", ")}`);
      result.toEmbed.forEach((s, si) => console.log(`          [${si}] ${s}`));
      nodeResults.push(result);
    }
  }

  const durationMs = Date.now() - t0;
  const timings    = { topicsQuestions: tqMs, paraphrase: paraphrase.ms };
  console.log(`\n   ⏱  total ${_ms(durationMs)}`);

  return { file: path.resolve(filePath), durationMs, timings, sections: secCount, segments: segCount, nodes: nodeResults };
};

// ─────────────────────────────────────────────────────────────────────────────
// Output helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function writeOutput
 * @description Writes a file result to `<outDir>/<basename>.topics.json`.
 * Creates `outDir` recursively if it does not exist.
 *
 * @param {{ file: string, nodes: object[] }} result
 * @param {string} outDir
 */
const writeOutput = (result, outDir) => {
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, `${path.basename(result.file, path.extname(result.file))}.topics.json`);
  fs.writeFileSync(dest, JSON.stringify(result, null, 2), "utf8");
  console.log(`\n  ✅ Written → ${dest}`);
};

/**
 * @function printSummary
 * @description Prints the final aggregate summary across all processed files:
 * file/section/segment counts, total string count, step-level timing breakdown,
 * and a deduplicated sorted list of all unique topics.
 *
 * @param {object[]} results - Array of per-file results from {@link processFile}.
 */
const printSummary = results => {
  const allTopics  = [...new Set(results.flatMap(r => r.nodes.flatMap(n => n.topics ?? [])))].sort();
  const totalEmbed = results.reduce((n, r) => n + r.nodes.reduce((m, nd) => m + (nd.toEmbed?.length ?? 0), 0), 0);
  const totalMs    = results.reduce((n, r) => n + r.durationMs, 0);
  const sumT       = k => results.reduce((n, r) => n + (r.timings?.[k] ?? 0), 0);
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Files    : ${results.length}
  Sections : ${results.reduce((n, r) => n + r.sections, 0)}
  Segments : ${results.reduce((n, r) => n + r.segments, 0)}
  toEmbed  : ${totalEmbed} total strings to embed
  Duration : ${_ms(totalMs)} total
    topics+questions ${_ms(sumT("topicsQuestions"))}
    paraphrase       ${_ms(sumT("paraphrase"))}

  Unique topics: ${allTopics.length}
  ${allTopics.join(", ")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency pool
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function pool
 * @description Runs an array of async task factories with a maximum concurrency
 * limit. Tasks are started as slots become available; results are returned in
 * the same order as `tasks`.
 *
 * @param {Array<() => Promise<*>>} tasks
 * @param {number} limit - Maximum number of concurrently running tasks.
 * @returns {Promise<*[]>}
 */
const pool = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @function main
 * @description CLI entry point. Validates the input path, collects matching
 * files, loads both models in parallel, processes files via {@link pool}, and
 * writes output if `--out` was specified.
 */
const main = async () => {
  if (!fs.existsSync(inputPath)) { console.error(`❌ Path not found: ${inputPath}`); process.exit(1); }
  const files = collectFiles(inputPath);
  if (!files.length) { console.error(`❌ No files found matching: ${[...ALLOWED_EXTS].join(", ")}`); process.exit(1); }

  console.log(`🔍 Found ${files.length} file${files.length === 1 ? "" : "s"}`);
  console.log(`🤖 Loading models…`);
  const synthesizer = await synthesize.createSynthesizer();
  console.log(`✅ Models ready. concurrency=${concurrency}, min-len=${minLen}, max-body=${maxBody}`);

  const results = await pool(files.map(f => () => processFile(f, synthesizer)), concurrency);
  if (outDir) for (const r of results) writeOutput(r, outDir);
  printSummary(results);
};

main().catch(err => { console.error("❌ Fatal error:", err.message); process.exit(1); });