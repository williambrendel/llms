"use strict";

/**
 * @file scripts/smokeTests/smokeTestMarkdown.js
 * @description End-to-end smoke test for the markdown pipeline.
 * Exercises generateMarkdown + classifyMarkdown against the real
 * Claude API, using the same adapter pattern that buildKnowledgeBase
 * uses for the binary pipeline.
 *
 * Validates:
 *   - The runLLM adapter (mapping runWithRetry's 3-arg call shape to
 *     claude/run.js's actual signature) works for non-binary actions
 *   - generateMarkdown produces a valid H1-headed markdown document
 *   - classifyMarkdown returns one of the 17 taxonomy themes with
 *     confidence + rationale
 *
 * Usage:
 *   node scripts/smokeTests/smokeTestMarkdown.js [input-text-file]
 *
 * Defaults to a small inline text sample if no file is provided.
 */

const fs   = require("fs").promises;
const path = require("path");

const generateMarkdown = require("../../src/actions/generate/markdown/generateMarkdown");
const classifyMarkdown = require("../../src/actions/generate/markdown/classifyMarkdown");
const claudeRun        = require("../../src/claude");
const { SONNET45_CONFIG } = require("../../src/claude/config");

const main = async () => {
  const inputArg = process.argv[2];

  // ── Stage 1: prepare input text ─────────────────────────────────────────
  let text;
  if (inputArg) {
    text = await fs.readFile(inputArg, "utf-8");
    console.log(`Input: ${inputArg} (${text.length} bytes)`);
  } else {
    text = `
Calcium carbonate scale is one of the most common deposits in open
recirculating cooling towers. It forms when calcium and bicarbonate
ions concentrate in the recirculating water through evaporation,
exceeding the saturation limit predicted by the Langelier Saturation
Index. At an LSI of +0.5 or higher, calcium carbonate begins to
precipitate onto heat exchange surfaces, acting as an insulator that
reduces thermal transfer efficiency. A scale layer just 1/32" thick
can increase energy consumption by 8-12% in a chiller.

Control strategies include lowering pH with sulfuric acid or CO2,
adding phosphonate or polymer scale inhibitors at 5-15 ppm active,
and managing cycles of concentration to keep the recirculating water
below the saturation threshold. Operators should monitor calcium
hardness, M alkalinity, pH, and conductivity weekly, with LSI
calculated from those values to track saturation trends over time.
`.trim();
    console.log(`Input: inline sample (${text.length} bytes)`);
  }

  // ── Stage 2: generate markdown ──────────────────────────────────────────
  console.log("\n[1/2] Running generateMarkdown...");
  const genPrompt = await fs.readFile(
    "src/actions/generate/markdown/prompts/generate-markdown.ppl",
    "utf-8"
  );

  const t0 = Date.now();
  const markdown = await generateMarkdown({
    text,
    prompt:    genPrompt,
    runLLM:    claudeRun,
    llmConfig: SONNET45_CONFIG,
    maxRetries: 2,
  });
  const t1 = Date.now();

  console.log(`  → ${markdown.length} bytes, ${((t1 - t0) / 1000).toFixed(1)}s`);

  // Show first 200 chars to confirm shape.
  console.log("\n  Preview:");
  console.log("  " + markdown.split("\n").slice(0, 8).join("\n  "));
  console.log("  ...");

  // ── Stage 3: classify ───────────────────────────────────────────────────
  console.log("\n[2/2] Running classifyMarkdown...");
  const classifyPrompt = await fs.readFile(
    "src/actions/generate/markdown/prompts/classify-markdown.ppl",
    "utf-8"
  );
  const themes = JSON.parse(
    await fs.readFile("scripts/data/themes.json", "utf-8")
  );

  const t2 = Date.now();
  const classification = await classifyMarkdown({
    content:   markdown,
    themes,
    prompt:    classifyPrompt,
    runLLM:    claudeRun,
    llmConfig: SONNET45_CONFIG,
    maxRetries: 2,
  });
  const t3 = Date.now();

  console.log(`  → ${((t3 - t2) / 1000).toFixed(1)}s`);
  console.log(`  theme:      ${classification.theme}`);
  console.log(`  confidence: ${classification.confidence}`);
  console.log(`  rationale:  ${classification.rationale}`);

  // ── Sanity assertions ──────────────────────────────────────────────────
  const errors = [];
  if (!/^# .+/m.test(markdown)) errors.push("generated markdown has no H1");
  if (!classification.theme) errors.push("classify returned no theme");
  if (!themes[classification.theme]) errors.push(`theme "${classification.theme}" not in taxonomy`);
  if (typeof classification.confidence !== "number") errors.push("confidence is not a number");

  console.log();
  if (errors.length === 0) {
    console.log("✓ smoke test passed");
  } else {
    console.error("✗ smoke test failed:");
    for (const e of errors) console.error("  -", e);
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error("Smoke test crashed:", err.message);
  console.error(err.stack);
  process.exit(1);
});