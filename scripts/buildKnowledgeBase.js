"use strict";

/**
 * @file scripts/buildKnowledgeBase.js
 * @description CLI entry point for building VECT `.bin` knowledge bases
 * from markdown source.
 *
 * Pipeline (per input file):
 *   1. Read raw markdown.
 *   2. `generateKnowledgeBase` — segments the text, vectorizes section
 *      bodies, calls the LLM to produce retrieval rows, vectorizes those
 *      rows. Returns an array of `{ range, vectors }` section records.
 *   3. `resolveOutputPath` — computes where the `.bin` should land,
 *      mirroring the source's subtree under `outputDir`.
 *   4. `Document.fromSpec` + `doc.toBuffer` + `fs.writeFile` — materialize
 *      the VECT binary and persist it. (See "Why two steps, not
 *      doc.write" below.)
 *
 * Orchestration:
 *   All files run in parallel via `Promise.allSettled`, but LLM calls
 *   within each file share a single global concurrency pool (`llmLimit`).
 *   This lets file-level parallelism scale arbitrarily without ever
 *   exceeding the LLM provider's rate limit.
 *
 * Failure model:
 *   Per-section LLM failures are isolated by `generateKnowledgeBase` and
 *   reported via `onSectionError`. A file that fails entirely (e.g. read
 *   error, write error) is reported via the top-level `Promise.allSettled`
 *   loop. Other files keep going regardless.
 *
 * Usage:
 *   node scripts/buildKnowledgeBase.js <input> <output-dir> [prompt-file]
 *
 *   <input>         File or directory of `.md` sources.
 *   <output-dir>    Where `.bin` files are written. Subtree mirrors input.
 *   [prompt-file]   LLM prompt for row generation (default:
 *                   scripts/prompts/facts-database-prompt.ppl).
 */

const fs       = require("fs").promises;
const fsSync   = require("fs");
const path     = require("path");

const getFilenames    = require("./io/getFilenames");
const loadFile        = require("./io/loadFile");
const makeLimit       = require("../src/utilities/makeLimit");
const formatDuration  = require("./utilities/formatDuration");
const vectorize       = require("../src/xenova/vectorize");
const Document        = require("../src/VectorStore/Document");

const {
  generateKnowledgeBase,
  resolveOutputPath,
} = require("../src/knowledgeBase");

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const inputArg       = args[0];
const outputDir      = args[1];
const promptFilename = args[2] || "scripts/prompts/facts-database-prompt.ppl";

// Resolve the input root once. When the input is a directory, all source
// filenames are interpreted relative to it to produce the mirrored output
// subtree. When the input is a single file, sourceRoot is set to the file's
// directory so the file ends up flat under outputDir (no synthetic subdir
// gets created from a leading folder we don't actually mean to mirror).
const inputAbs   = path.resolve(inputArg);
const inputStat  = fsSync.statSync(inputAbs);
const sourceRoot = inputStat.isDirectory() ? inputAbs : path.dirname(inputAbs);

// `filenames` may be a single-entry list (file input) or a recursive
// listing under the input directory. Either way, processOne handles each
// entry uniformly.
const filenames = getFilenames(inputArg);

// Shared concurrency limiter across all files. LLM calls from every file
// pass through this single pool so the total in-flight count is bounded
// regardless of how many files run in parallel. Without this shared limit,
// processing N files in parallel could fan out to N × sections-per-file
// LLM calls at once, easily blowing past the provider's rate limit.
//
// The limit (8) was tuned empirically — high enough to keep the pipeline
// busy, low enough to leave headroom for the provider's burst policy.
const llmLimit = makeLimit(8);

// ─────────────────────────────────────────────────────────────────────────────
// Per-file processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a single source file end-to-end: read, generate sections,
 * serialize as VECT v2, write to disk, log a summary line.
 *
 * Returns a small per-file record for the top-level summary. Throws on
 * unrecoverable errors (file read failure, write failure, malformed input)
 * — `Promise.allSettled` in `main` will catch and report those.
 */
const processOne = async filename => {
  const fileStart = Date.now();
  const { data }  = await loadFile(filename);

  // ── Step 1: Generate section records ──────────────────────────────────
  // generateKnowledgeBase does the heavy lifting: segments the markdown,
  // vectorizes bodies under a word-count bucket heuristic, fans out one
  // LLM call per section (gated by llmLimit), then attaches the LLM-
  // derived row vectors. All vector promises are awaited before this
  // returns.
  //
  // The two callbacks let the build script handle logging without coupling
  // the generator to a logger. `onSection` fires after each section's body
  // vectorization is queued; `onSectionError` fires when an LLM call fails
  // (other sections continue).
  const sections = await generateKnowledgeBase(data, prompt, {
    limit: llmLimit,
    onSection: (i, { wordCount, bucket, bodyVecs }) => {
      console.log(
        `Section ${i}: ${wordCount} words → ${bucket} ` +
        `(${bodyVecs} body vector${bodyVecs === 1 ? "" : "s"})`
      );
    },
    onSectionError: (i, err) => {
      console.error(`🚨  Section ${i} failed:`, err?.message || err);
    },
  });

  // ── Step 2: Resolve the output path ───────────────────────────────────
  // resolveOutputPath handles two things:
  //   - mirrors the source's subtree under outputDir (biology/foo.md →
  //     <outputDir>/biology/foo.bin)
  //   - derives the documentId from the source filename
  //
  // Pure function — no I/O. The actual write happens below.
  const { outPath, documentId } = resolveOutputPath(filename, outputDir, sourceRoot);

  // ── Step 3: Materialize and write the VECT binary ─────────────────────
  // Document.write does NOT create intermediate directories; that's an
  // intentional separation of concerns (path layout is a build-pipeline
  // job, not a Document job). So we mkdir first.
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  // Build the Document. fromSpec is sync and cheap — allocates the index
  // and vec buffers, copies vectors into the vec buffer, computes
  // vecOffsets. No I/O.
  const doc = Document.fromSpec({ documentId, vecDim: dim, sections });

  // Why two steps (toBuffer + writeFile) instead of doc.write(outPath):
  //
  //   doc.write(outPath) would internally do `fs.writeFile(outPath,
  //   this.toBuffer())` — exactly the two lines below in one call.
  //   Convenient when the byte size doesn't matter to the caller.
  //
  //   We split the steps here because the summary log line reports the
  //   file size in KB. Going through doc.write would force us to either:
  //     - read the file back from disk after writing (extra I/O), or
  //     - call doc.toBuffer() a second time just for .length (serializes
  //       twice — wasted work).
  //
  //   Calling toBuffer() once and reusing the buffer for both the write
  //   and the byte count is the cleanest path. The trade-off is that we
  //   show the lower-level mechanics in this hot loop, but the comment
  //   above the alternative makes the choice traceable.
  const buffer = doc.toBuffer();
  await fs.writeFile(outPath, buffer);

  // ── Step 4: Summary ───────────────────────────────────────────────────
  // Compute total vector count from the section records. Could have read
  // it off the Document (doc.totalVecs is exposed), but summing here keeps
  // the summary block self-contained and makes the relationship between
  // the section list and the vector count obvious.
  let totalVecs = 0;
  for (let i = 0; i !== sections.length; ++i) totalVecs += sections[i].vectors.length;

  const durationMs = Date.now() - fileStart;

  console.log(
    `Wrote ${outPath}: ` +
    `documentId=${documentId}, ` +
    `${sections.length} sections, ${totalVecs} vectors, ` +
    `${(buffer.length / 1024).toFixed(1)}KB, ` +
    `${formatDuration(durationMs)}`
  );

  return { filename, durationMs };
};

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────

// `prompt` and `dim` are loaded once in main() but referenced by processOne
// through closure. Module-scoped `let` keeps them out of the inner function
// signature without making them globals — they're parameters to the build
// run, not to any individual file's processing.
let prompt;
let dim;

/**
 * Orchestrates the full build run:
 *   1. Loads the prompt file (one-time read).
 *   2. Probes the embedding dimension by vectorizing a dummy string. We
 *      can't hardcode this — it depends on the encoder model in use. A
 *      single probe at the start avoids inconsistency if the model
 *      changes between builds.
 *   3. Echoes the resolved paths and dim so the user can verify the build
 *      is reading what they expect.
 *   4. Fans out processOne across all input files in parallel. The shared
 *      llmLimit (defined at module top) keeps the LLM call rate bounded
 *      regardless of how many files are processed concurrently.
 *   5. Aggregates pass/fail counts and times. Per-file failures are
 *      reported in line but don't abort the run — other files keep going.
 *   6. Sets a non-zero exit code if anything failed, so CI surfaces the
 *      problem.
 */
const main = async () => {
  const runStart = Date.now();

  // Prompt is identical across all files in a run, so we read once.
  prompt = await fs.readFile(promptFilename, "utf-8");

  // Probe the embedding model to discover its output dimension. We use
  // this dim everywhere downstream — Document.fromSpec needs it, the
  // header records it, the loader verifies it. Doing this once at the
  // start guarantees every .bin in this run uses the same dim.
  const probe = await vectorize("probe");
  dim = probe.length;

  console.log(`Embedding dimension: ${dim}`);
  console.log(`Source root:        ${sourceRoot}`);
  console.log(`Output directory:   ${path.resolve(outputDir)}`);

  // Parallel processing of all files. Promise.allSettled (not
  // Promise.all) so that one bad file doesn't tear down the entire run —
  // we want to know about every failure, not just the first one.
  const results = await Promise.allSettled(filenames.map(processOne));

  // Tally outcomes for the final summary.
  let succeeded = 0, failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      ++succeeded;
    } else {
      ++failed;
      // The error came from processOne — typically a read, mkdir, or
      // write failure. Section-level LLM failures are caught inside
      // generateKnowledgeBase and reported via onSectionError, so they
      // don't reach here.
      console.error(`🚨  File failed:`, r.reason?.message || r.reason);
    }
  }

  const totalMs = Date.now() - runStart;
  console.log(
    `Build complete: ${succeeded} succeeded, ${failed} failed in ${formatDuration(totalMs)}`
  );

  // Set a non-zero exit code on any failure so CI/automation picks it up.
  // We use exitCode rather than process.exit() so the event loop drains
  // cleanly before exit — any pending logs flush, file handles close.
  if (failed > 0) process.exitCode = 1;
};

// Only run main() when this file is invoked directly (not when required
// by another module, e.g. a test). Standard Node entry-point pattern.
if (require.main === module) {
  main();
}