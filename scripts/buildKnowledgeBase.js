"use strict";

/**
 * @file scripts/buildKnowledgeBase.js
 * @description CLI entry point for building VECT `.bin` knowledge bases
 * from a directory (or single file) of `.md` sources.
 *
 * Pipeline per file:
 *   1. Read raw markdown.
 *   2. Compute documentId + output path via {@link resolveOutputPath}.
 *   3. Feed into `runBinary.batch` — the binary pipeline does
 *      segmentation, body vectorization (bucket strategy), LLM
 *      augmentation (question/anchor/variant generation), and Document
 *      serialization. Returns a Buffer per input.
 *   4. Write Buffers to disk under the mirrored subtree.
 *
 * Failure model:
 *   - `Promise.allSettled` at the batch level means per-file failures
 *     don't tear down the whole run
 *   - Hard failures (any stage throws) get reported per-file with
 *     `{stage, documentId, message}`
 *   - Soft failures (per-section LLM hiccups, individual vector rejects)
 *     get aggregated and counted at the end
 *   - Non-zero exit code on any hard failure so CI catches it
 *
 * Concurrency:
 *   - Shared `makeLimit(N)` across all files in the batch caps the total
 *     in-flight LLM count regardless of how many sections fan out
 *   - Default N=8, override with `NEREUS_LLM_CONCURRENCY` env var
 *
 * Usage:
 *   node scripts/buildKnowledgeBase.js <input> <output-dir> [prompt-file]
 *
 *   <input>         File or directory of `.md` sources.
 *   <output-dir>    Where `.bin` files are written. Subtree mirrors input.
 *   [prompt-file]   Augmentation prompt path. Defaults to
 *                   src/actions/generate/binary/prompts/augment-section.ppl
 */

const fs       = require("fs").promises;
const fsSync   = require("fs");
const path     = require("path");

const runBinary       = require("../src/actions/generate/binary");
const vectorize       = require("../src/xenova/vectorize");
const claudeRun       = require("../src/claude");
const { SONNET45_CONFIG } = require("../src/claude/config");
const makeLimit       = require("../src/utilities/makeLimit");
const makeRateLimit   = require("../src/utilities/makeLimit");
const formatDuration  = require("./utilities/formatDuration");
const resolveOutputPath = require("./io/resolveOutputPath");

/**
 * LLM caller for the build pipeline.
 *
 * Wraps `claudeRun` (the project's generic Claude entry point) with a
 * rate-limit acquire so sustained req/sec stays under NEREUS_LLM_RATE
 * regardless of how many calls are concurrently in flight. Prevents
 * burst-driven 429s when many sections finish their previous step at
 * the same moment.
 *
 * The action layer (augmentSections) is responsible for merging the
 * system prompt into `config.system` and unwrapping the Response
 * envelope to its text body. This wrapper does neither — it just
 * paces the call and forwards everything else unchanged.
 *
 * The rate-limit acquire is defined later (after CLI args parse) and
 * referenced via closure. See `rateLimit` below.
 */
let rateLimit;   // assigned below once env vars are parsed

const runLLM = async (config, prompt) => {
  await rateLimit();
  return claudeRun(config, prompt);
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const inputArg       = args[0];
const outputDir      = args[1];
const promptFilename = args[2]
  || "src/actions/generate/binary/prompts/augment-section.ppl";

if (!inputArg || !outputDir) {
  console.error("Usage: node scripts/buildKnowledgeBase.js <input> <output-dir> [prompt-file]");
  process.exit(2);
}

const inputAbs   = path.resolve(inputArg);
const inputStat  = fsSync.statSync(inputAbs);
const sourceRoot = inputStat.isDirectory() ? inputAbs : path.dirname(inputAbs);

// Concurrency limit for LLM calls — shared across all files in the batch.
// Caps how many requests are *in flight* simultaneously.
// Override with NEREUS_LLM_CONCURRENCY env var.
const concurrency = parseInt(process.env.NEREUS_LLM_CONCURRENCY, 10) || 8;
const llmLimit = makeLimit(concurrency);

// Rate limit for LLM calls — caps sustained requests-per-second across
// the entire run. Token-bucket pacing prevents burst-driven 429s that
// makeLimit alone cannot prevent (since N callers finishing at the
// same instant fire N simultaneous requests).
//
// Defaults: 2 req/sec sustained, bursts up to 4. Tune per Anthropic tier:
//   Tier 1 (Sonnet):  ~0.5 req/sec safe
//   Tier 2 (Sonnet):  ~0.8 req/sec safe
//   Tier 3 (Sonnet):  ~16 req/sec safe
//   Haiku tends to have higher limits — bump rate accordingly.
const ratePerSec = parseFloat(process.env.NEREUS_LLM_RATE)    || 2;
const rateBurst  = parseInt(process.env.NEREUS_LLM_BURST, 10) || Math.ceil(ratePerSec * 2);

// Assign the closure-captured rateLimit referenced by runLLM above.
rateLimit = makeRateLimit({ rate: ratePerSec, burst: rateBurst });

// ─────────────────────────────────────────────────────────────────────────────
// Discover input files
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk the input path and collect every `.md` file. Uses `fs.readdir`
 * with `recursive: true` (Node 18.17+). Single-file inputs return just
 * that file regardless of extension.
 *
 * @returns {string[]} Absolute file paths.
 */
const collectFiles = () => {
  if (inputStat.isFile()) return [inputAbs];

  const entries = fsSync.readdirSync(inputAbs, {
    recursive: true, withFileTypes: true,
  });
  return entries
    .filter(e => e.isFile() && e.name.endsWith(".md"))
    .map(e => path.join(e.parentPath || e.path || inputAbs, e.name));
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const main = async () => {
  const runStart = Date.now();

  // Boot setup: load augmentation prompt and probe the embedder.
  // Both are one-time costs; doing them up front keeps each file's
  // processing focused on the actual pipeline work.
  const augmentPrompt = await fs.readFile(promptFilename, "utf-8");
  const probe = await vectorize("probe");
  const vecDim = probe.length;

  const filenames = collectFiles();

  console.log(`Embedding dimension: ${vecDim}`);
  console.log(`Source root:         ${sourceRoot}`);
  console.log(`Output directory:    ${path.resolve(outputDir)}`);
  console.log(`LLM concurrency:     ${concurrency}`);
  console.log(`LLM rate:            ${ratePerSec} req/sec (burst ${rateBurst})`);
  console.log(`Files to process:    ${filenames.length}`);
  console.log();

  // Soft error aggregation. The binary pipeline's `onError` callback
  // fires for per-section LLM failures (augment stage) and per-vector
  // rejections (encode stage). These don't abort the file but they
  // ARE real failures — sections that fired but produced no augmented
  // vectors. The target is zero. Anything else is a bug to investigate,
  // not noise to tolerate.
  //
  // We log the first 20 verbatim so when the build finishes with
  // non-zero soft errors, we can categorize what went wrong (rate limit?
  // bad JSON? truncation? specific section?) without re-running.
  const softErrors = { augment: 0, encode: 0 };
  const SOFT_ERROR_LOG_LIMIT = 20;
  let softErrorsLogged = 0;
  const onError = (err) => {
    if (err.stage in softErrors) softErrors[err.stage]++;
    if (softErrorsLogged < SOFT_ERROR_LOG_LIMIT) {
      const cause = err.cause && err.cause.message ? err.cause.message : "(no cause message)";
      const where = `${err.documentId || "?"} sec=${err.sectionIndex ?? "?"}`;
      console.error(`  ! soft[${err.stage}] ${where}: ${cause}`);
      softErrorsLogged++;
    }
  };

  // Build per-file inputs. We compute outPath up front so we know
  // where to write each Buffer after the batch returns.
  const inputs = filenames.map((filename) => {
    const { outPath, documentId } = resolveOutputPath(filename, outputDir, sourceRoot);
    return {
      filename,
      outPath,
      documentId,
      markdown:    null,       // populated below
      vecDim,
      vectorize,
      runLLM,
      prompt:      augmentPrompt,
      llmConfig:   SONNET45_CONFIG,
      limit:       llmLimit,
      maxRetries:  4,           // augmentation occasionally hits rate-limit windows; allow several retries
      onError,
    };
  });

  // Read all markdown sources in parallel.
  await Promise.all(inputs.map(async (input) => {
    input.markdown = await fs.readFile(input.filename, "utf-8");
  }));

  // The binary pipeline runs all files in parallel via
  // Promise.allSettled internally. Per-file failures are captured, not
  // thrown.
  const results = await runBinary.batch(inputs);

  // Walk results: write fulfilled Buffers, log rejected ones.
  let succeeded = 0;
  let failed    = 0;
  const failures = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const input  = inputs[i];

    if (result.status === "fulfilled") {
      try {
        const buffer = result.value;
        await fs.mkdir(path.dirname(input.outPath), { recursive: true });
        await fs.writeFile(input.outPath, buffer);

        console.log(
          `✓ ${input.outPath}: documentId=${input.documentId}, ` +
          `${(buffer.length / 1024).toFixed(1)}KB`
        );
        succeeded++;
      } catch (writeErr) {
        failed++;
        failures.push({
          filename:   input.filename,
          documentId: input.documentId,
          stage:      "write",
          message:    writeErr.message,
        });
        console.error(`✗ ${input.filename}: write failed — ${writeErr.message}`);
      }
    } else {
      failed++;
      const reason = result.reason;
      failures.push({
        filename:   input.filename,
        documentId: reason.documentId || input.documentId,
        stage:      reason.stage || "unknown",
        message:    reason.message,
      });
      console.error(
        `✗ ${input.filename}: failed at stage="${reason.stage}" — ${reason.message}`
      );
    }
  }

  // Summary.
  const totalMs = Date.now() - runStart;
  console.log();
  console.log(
    `Build complete: ${succeeded} succeeded, ${failed} failed in ${formatDuration(totalMs)}`
  );

  // Soft error summary. Zero is the target — anything else is a bug
  // to investigate (rate-limit leak, prompt drift, parser gap, etc.),
  // not acceptable noise. Files still got built with surviving vectors,
  // but those sections shipped with degraded retrieval surface.
  const softTotal = softErrors.augment + softErrors.encode;
  if (softTotal === 0) {
    console.log("Soft errors: 0 ✓");
  } else {
    console.log(
      `Soft errors: ${softTotal} total ` +
      `(augment: ${softErrors.augment}, encode: ${softErrors.encode}) — ` +
      `target is 0. Files built with degraded vectors on failed sections; ` +
      `re-investigate the cause above.`
    );
  }

  // Set exit code on any hard failure OR non-zero soft errors so CI
  // catches both classes of problem. Soft errors mean we shipped
  // degraded data; that's a bug, not a warning.
  if (failed > 0 || softTotal > 0) process.exitCode = 1;
};

if (require.main === module) {
  main().catch((err) => {
    // Unexpected setup-stage failure (couldn't read prompt, vectorize
    // probe failed, etc.). Differs from per-file failures which are
    // captured by Promise.allSettled.
    console.error("Build failed (unrecoverable):", err.message);
    process.exit(1);
  });
}