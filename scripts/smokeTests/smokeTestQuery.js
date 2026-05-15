#!/usr/bin/env node
"use strict";

/**
 * @file smokeTestQuery.js
 * @description End-to-end smoke test for the runQuery orchestrator.
 *
 * Exercises the full query pipeline against the real corpus + real
 * Claude LLM. Loads the VectorStore, builds the analyzer with
 * SpellEngine, constructs the SectionResolver, reads the answer prompt,
 * and runs ~15 curated queries through runQuery.
 *
 * Grading is structural — we verify each response has the right SHAPE
 * (valid schema, sources present where expected, follow-ups generated),
 * not the right content. Content quality is qualitative and visible in
 * the output for human review.
 *
 * Usage:
 *   node scripts/smokeTests/smokeTestQuery.js
 *
 * Optional positional args:
 *   $1: binDir (default scripts/dataset)
 *   $2: mdDir  (default scripts/data)
 *
 * Cost: each query costs ~$0.001 with Haiku; ~15 queries ≈ $0.015/run.
 * Wall time: ~30-60s depending on LLM latency.
 */

const fs   = require("fs").promises;
const path = require("path");

const VectorStore        = require("../../src/VectorStore");
const buildAnalyzeQuery  = require("../../src/xenova/buildAnalyzeQuery");
const SectionResolver    = require("../../src/actions/query/SectionResolver");
const runQuery           = require("../../src/actions/query");

// LLM runner — same module the old endpoint used.
const runLLM             = require("../../llms/claude");
const { HAIKU45_CONFIG } = require("../../llms/claude/config");
const parseResponseJson  = require("../../io/parseResponseJson");

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const binDir = path.resolve(args[0] || "scripts/dataset");
const mdDir  = path.resolve(args[1] || "scripts/data");

// ─────────────────────────────────────────────────────────────────────────────
// Output helpers
// ─────────────────────────────────────────────────────────────────────────────

const isTTY  = process.stdout.isTTY;
const GREEN  = isTTY ? "\x1b[32m" : "";
const RED    = isTTY ? "\x1b[31m" : "";
const YELLOW = isTTY ? "\x1b[33m" : "";
const CYAN   = isTTY ? "\x1b[36m" : "";
const DIM    = isTTY ? "\x1b[2m"  : "";
const BOLD   = isTTY ? "\x1b[1m"  : "";
const RESET  = isTTY ? "\x1b[0m"  : "";

const truncate = (s, n = 60) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

const makeStats = () => ({ passed: 0, failed: 0, total: 0 });

const grade = (stats, ok, msg) => {
  ++stats.total;
  if (ok) {
    ++stats.passed;
    return `${GREEN}PASS${RESET}  ${msg}`;
  }
  ++stats.failed;
  return `${RED}FAIL${RESET}  ${msg}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// LLM wrapper — runQuery expects a function that returns the parsed JSON,
// not the raw response envelope. We wrap `run` + `parseResponseJson` here.
// ─────────────────────────────────────────────────────────────────────────────

let llmCallCount = 0;

/**
 * Wraps the raw Claude `run` to:
 *   1. Call the LLM with the same signature `run(config, prompt, userMessage)`.
 *   2. Parse the JSON out of the response envelope via `parseResponseJson`.
 *   3. Count the call so the smoke test can report totals.
 *
 * Returns the parsed JSON directly. The validator inside runQuery sees
 * the shape it expects.
 */
const wrappedRunLLM = async (config, prompt, userMessage) => {
  ++llmCallCount;
  const response = await runLLM(config, prompt, userMessage);
  const parsed = parseResponseJson(response);
  return parsed;
};

// ─────────────────────────────────────────────────────────────────────────────
// Curated query set
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each query carries metadata used by the grader:
 *   - category:        bucket for output grouping
 *   - expectLLMCall:   whether the orchestrator should invoke the LLM
 *   - expectSources:   whether the response should contain at least one sourced chunk
 *   - expectFollowUps: whether followUpQuestions should be non-empty
 *   - expectGreeting:  whether the analyzer should have peeled a greeting
 */
const QUERIES = [
  // Calm technical
  { text: "what causes biofilm",                              category: "technical",  expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },
  { text: "how do efflux pumps work in biocide resistance",   category: "technical",  expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },
  { text: "what are persister cells",                         category: "technical",  expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },

  // Broad
  { text: "how to prevent biocide resistance",                category: "broad",      expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },
  { text: "tell me about biofilm formation",                  category: "broad",      expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },

  // Frustrated
  { text: "WHY ISNT MY BIOCIDE WORKING",                      category: "frustrated", expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },
  { text: "biofilm WONT GO AWAY!!!",                          category: "frustrated", expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },

  // Greeting + technical
  { text: "hi, what causes biofilm",                          category: "greeting+",  expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: true  },
  { text: "good morning, how do efflux pumps work",           category: "greeting+",  expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: true  },

  // Multi-part
  { text: "what causes biofilm and how do efflux pumps work", category: "multi-part", expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },

  // Off-topic (LLM handles conversationally)
  { text: "what's the weather today",                         category: "off-topic",  expectLLMCall: true,  expectSources: false, expectFollowUps: false, expectGreeting: false },

  // Pure greeting (fast path; no LLM)
  { text: "hello",                                            category: "greeting",   expectLLMCall: false, expectSources: false, expectFollowUps: false, expectGreeting: true  },
  { text: "thanks!",                                          category: "greeting",   expectLLMCall: false, expectSources: false, expectFollowUps: false, expectGreeting: true  },

  // Support
  { text: "i need urgent help with my cooling tower",         category: "support",    expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },

  // Typo (analyzer's spell engine should fix)
  { text: "what causes biofim formation",                     category: "typo",       expectLLMCall: true,  expectSources: true,  expectFollowUps: true, expectGreeting: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const setup = async () => {
  console.log(`Smoke test: runQuery against real corpus + Claude Haiku`);
  console.log(`  binDir: ${binDir}`);
  console.log(`  mdDir:  ${mdDir}`);

  const t0 = Date.now();

  console.log(`\nLoading VectorStore...`);
  const store = await VectorStore.load(binDir);
  console.log(`  ${store.documents.length} documents loaded`);

  console.log(`Building SectionResolver...`);
  const resolver = await SectionResolver.create(mdDir);
  console.log(`  ${resolver.size} documents indexed`);

  // Try to wire up SpellEngine. Smoke test runs work without it; with it,
  // typo + frustration queries handle better.
  console.log(`Building analyzer (with SpellEngine if available)...`);
  let spellEngine;
  try {
    const SpellEngine = require("../../src/SpellEngine");
    const domainWords = require("./data/domainWords.json");
    const corrections = require("./data/corrections.json");
    spellEngine = await SpellEngine.createEnglish(domainWords, corrections);
    console.log(`  ${GREEN}spell engine ready${RESET} (${corrections.length || Object.keys(corrections).length} corrections, ${domainWords.length} domain words)`);
  } catch (err) {
    console.log(`  ${YELLOW}spell engine unavailable${RESET} (${err.message})`);
  }

  const analyzeQuery = await buildAnalyzeQuery({ store, spellEngine });

  console.log(`Loading answer prompt...`);
  const answerPrompt = await fs.readFile(
    path.join(__dirname, "../../src/actions/query/prompts/answer.ppl"),
    "utf8"
  );
  console.log(`  ${answerPrompt.length} chars`);

  const setupMs = Date.now() - t0;
  console.log(`  setup complete in ${setupMs}ms\n`);

  return {
    store,
    resolver,
    analyzeQuery,
    prompts: { answer: answerPrompt },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-query grading
// ─────────────────────────────────────────────────────────────────────────────

const gradeResponse = (response, query, llmCallsBefore, llmCallsAfter, stats) => {
  const lines = [];
  const cat = query.category.padEnd(11);
  const text = truncate(query.text, 50);

  // (1) Response has the basic shape we expect.
  const validShape = (
    response &&
    typeof response.query === "string" &&
    Array.isArray(response.answer) &&
    response.answer.length > 0 &&
    Array.isArray(response.followUpQuestions)
  );
  lines.push(`  ${grade(stats, validShape, `${cat} ${JSON.stringify(text)} → valid shape`)}`);

  // (2) LLM call expectation. Pure greetings should NOT trigger an LLM call.
  const llmCalled = (llmCallsAfter > llmCallsBefore);
  const llmExpectationMet = llmCalled === query.expectLLMCall;
  const llmLabel = query.expectLLMCall ? "LLM called" : "no LLM call";
  lines.push(`  ${grade(stats, llmExpectationMet, `${cat} ${JSON.stringify(text)} → ${llmLabel}`)}`);

  // (3) Sources where expected.
  if (query.expectSources) {
    const hasSource = response.answer.some(c => c.source);
    lines.push(`  ${grade(stats, hasSource, `${cat} ${JSON.stringify(text)} → has source`)}`);
  }

  // (4) Follow-ups where expected.
  if (query.expectFollowUps) {
    const hasFollowUps = response.followUpQuestions.length > 0;
    lines.push(`  ${grade(stats, hasFollowUps, `${cat} ${JSON.stringify(text)} → has follow-ups`)}`);
  }

  // (5) Greeting flag matches expectation.
  const greetingMatch = response.greeting === query.expectGreeting;
  lines.push(`  ${grade(stats, greetingMatch, `${cat} ${JSON.stringify(text)} → greeting=${query.expectGreeting}`)}`);

  return lines;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pretty-print a response (for human review)
// ─────────────────────────────────────────────────────────────────────────────

const printResponse = (response) => {
  console.log(`    ${DIM}corrected:${RESET} ${response.corrected}`);
  console.log(`    ${DIM}intent:${RESET}    ${response.user_intent.join(", ")}`);
  if (response.frustration && response.frustration.score > 0) {
    console.log(`    ${DIM}frustration:${RESET} ${response.frustration.score.toFixed(2)}`);
  }
  console.log(`    ${DIM}answer:${RESET}`);
  for (const chunk of response.answer) {
    const snippet = truncate(chunk.text, 100);
    const sourceTag = chunk.source ? ` ${CYAN}[${chunk.source.documentId} ${chunk.source.range.join(",")}]${RESET}` : "";
    console.log(`      ${snippet}${sourceTag}`);
  }
  if (response.followUpQuestions.length > 0) {
    console.log(`    ${DIM}follow-ups:${RESET}`);
    for (const q of response.followUpQuestions) {
      console.log(`      • ${q}`);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const main = async () => {
  const deps = await setup();
  const stats = makeStats();

  console.log(`${BOLD}── Running ${QUERIES.length} queries ──${RESET}\n`);

  const tStart = Date.now();
  let queryIdx = 0;

  for (const query of QUERIES) {
    ++queryIdx;
    console.log(`${BOLD}[${queryIdx}/${QUERIES.length}]${RESET} ${query.category}: ${JSON.stringify(query.text)}`);

    const llmCallsBefore = llmCallCount;
    const t0 = Date.now();
    let response;
    try {
      response = await runQuery({
        rawQuery:     query.text,
        store:        deps.store,
        analyzeQuery: deps.analyzeQuery,
        resolver:     deps.resolver,
        runLLM:       wrappedRunLLM,
        prompts:      deps.prompts,
        llmConfig:    HAIKU45_CONFIG,
        maxRetries:   2,
      });
    } catch (err) {
      console.log(`  ${RED}EXCEPTION${RESET} ${err.message}`);
      ++stats.failed;
      ++stats.total;
      continue;
    }
    const ms = Date.now() - t0;
    const llmCallsAfter = llmCallCount;

    const gradeLines = gradeResponse(response, query, llmCallsBefore, llmCallsAfter, stats);
    for (const line of gradeLines) console.log(line);

    console.log(`    ${DIM}(${ms}ms, ${llmCallsAfter - llmCallsBefore} LLM call${llmCallsAfter - llmCallsBefore === 1 ? "" : "s"})${RESET}`);
    printResponse(response);
    console.log("");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalMs = Date.now() - tStart;
  console.log(`${"═".repeat(62)}`);
  console.log(`  ${stats.passed}/${stats.total} structural checks passed`);
  console.log(`  ${llmCallCount} total LLM calls`);
  console.log(`  Wall time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`${"═".repeat(62)}`);

  if (stats.failed > 0) {
    console.log(`${RED}${stats.failed} check${stats.failed === 1 ? "" : "s"} failed${RESET}`);
    process.exit(1);
  }
};

main().catch(err => {
  console.error(`${RED}FATAL${RESET}`, err);
  process.exit(1);
});
