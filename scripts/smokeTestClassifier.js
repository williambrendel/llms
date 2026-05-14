"use strict";

/**
 * @file scripts/smokeTestClassifier.js
 * @brief End-to-end check for `buildClassifier` against the real BGE + NLI
 * models. Standalone Node script, not a Jest test.
 *
 * Why a script and not a Jest test? The combination of
 * `@xenova/transformers` (ESM-only) and ONNX Runtime (native binding,
 * loaded into the host realm) trips on Jest's `--experimental-vm-modules`
 * isolation: the test file's VM context has a different `Float32Array`
 * identity than the one ONNX captured at load time, so ONNX's
 * `data instanceof Float32Array` check fails with "A float32 tensor's
 * data must be type of function Float32Array() [native code]" even though
 * the data is, in fact, a Float32Array.
 *
 * Without `--experimental-vm-modules`, Jest cannot parse
 * `@xenova/transformers` at all (the package uses `import.meta.url`).
 *
 * So Jest can't host this kind of test cleanly. Plain Node can — same
 * realm throughout, no isolation, no transformations. The script form
 * also makes it explicit that these are SMOKE tests: real models, real
 * latencies, real-world failure modes. Run them on demand, not on every
 * unit-test loop.
 *
 * Usage:
 *
 *   node scripts/smokeTestClassifier.js
 *
 * Output: per-case PASS/FAIL line plus a final summary. Exit code is 0
 * on all-pass, 1 on at least one failure, 2 on crash. Suitable for a
 * pre-deploy gate or a slower CI stage.
 *
 *
 * ── What this file covers ───────────────────────────────────────────────────
 *
 *   Mode 2 (no TECHNICAL anchors):
 *     - CONVERSATIONAL: greetings, off-topic, very short, with punctuation
 *     - SUPPORT: explicit escalation, contact requests, edge framings
 *     - TECHNICAL by absence: domain queries, short technical, colloquial
 *       phrasings, implicit framings, adversarial (domain vocabulary in
 *       non-technical framings — these should NOT route to TECHNICAL)
 *
 *   Mode 1 (with TECHNICAL anchors):
 *     - TECHNICAL: near-anchor, paraphrased, colloquial, short
 *     - CONVERSATIONAL and SUPPORT continuing to work alongside anchors
 *     - Adversarial (technical-sounding non-technical) — must still
 *       route correctly
 *
 *   Boundary (informational only — does NOT fail the suite):
 *     Queries with no objectively correct label. Observational output
 *     surfaces what the classifier chooses on real-world ambiguity.
 *
 *
 * ── When cases fail ─────────────────────────────────────────────────────────
 *
 *   - Adversarial TECHNICAL fail (technical vocab routes to TECHNICAL when
 *     it shouldn't) → CONVERSATIONAL or SUPPORT anchors don't cover the
 *     phrasing well enough; the cosine match against TECHNICAL anchors
 *     beats both. Add the phrasing as a SUPPORT/CONVERSATIONAL anchor.
 *
 *   - TECHNICAL miss (legitimate domain query routes elsewhere) → likely
 *     a SUPPORT or CONVERSATIONAL anchor accidentally captures the
 *     phrasing. Remove or tighten the conflicting anchor, or supply
 *     TECHNICAL anchors (move to Mode 1).
 *
 *   - Short query miss → BGE struggles with very short text. Either
 *     accept these will be lower-confidence (NLI will fire), or add a
 *     dedicated short-query handler upstream.
 */

const buildClassifier = require("../src/xenova/buildAnalyzeQuery/buildClassifier");

// ─────────────────────────────────────────────────────────────────────────────
// Mode 2 test cases — classifier built with default anchors only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test cases for Mode 2: no TECHNICAL anchors supplied. TECHNICAL is
 * inferred by absence when neither SUPPORT nor CONVERSATIONAL anchors
 * match.
 *
 * Cases tagged "adversarial" use domain vocabulary inside non-technical
 * framings. They are the most informative tests in this suite — they
 * catch the failure mode where the classifier latches onto vocabulary
 * rather than intent.
 */
const MODE_2_CASES = [
  // ── CONVERSATIONAL: standard greetings ────────────────────────────────────
  { query: "hello",                              expected: "CONVERSATIONAL" },
  { query: "hi",                                 expected: "CONVERSATIONAL" },
  { query: "hey there",                          expected: "CONVERSATIONAL" },
  { query: "good morning",                       expected: "CONVERSATIONAL" },
  { query: "thanks",                             expected: "CONVERSATIONAL" },
  { query: "thank you so much",                  expected: "CONVERSATIONAL" },

  // ── CONVERSATIONAL: off-topic / small talk ───────────────────────────────
  { query: "what's the weather like",            expected: "CONVERSATIONAL" },
  { query: "tell me a joke",                     expected: "CONVERSATIONAL" },
  { query: "what is your name",                  expected: "CONVERSATIONAL" },
  { query: "how are you today",                  expected: "CONVERSATIONAL" },

  // ── CONVERSATIONAL: short / edge phrasings ───────────────────────────────
  { query: "hey!",                               expected: "CONVERSATIONAL" },
  { query: "thanks!",                            expected: "CONVERSATIONAL" },

  // ── SUPPORT: explicit escalation requests ────────────────────────────────
  { query: "I need to talk to a person",         expected: "SUPPORT" },
  { query: "can I speak with a human",           expected: "SUPPORT" },
  { query: "I need urgent help",                 expected: "SUPPORT" },
  { query: "what's your phone number",           expected: "SUPPORT" },

  // ── SUPPORT: contact / business inquiries ────────────────────────────────
  { query: "when are you open",                  expected: "SUPPORT" },
  { query: "where are you located",              expected: "SUPPORT" },
  { query: "how can I reach customer service",   expected: "SUPPORT" },

  // ── TECHNICAL: full domain queries (the easy cases) ──────────────────────
  { query: "what is the pH of chlorinated water",        expected: "TECHNICAL" },
  { query: "how do I prevent scale in my cooling tower", expected: "TECHNICAL" },
  { query: "what causes biofilm formation",              expected: "TECHNICAL" },
  { query: "Legionella prevention best practices",       expected: "TECHNICAL" },

  // ── TECHNICAL: short / minimal phrasing ──────────────────────────────────
  // Real users often type abbreviated technical queries. These exercise
  // the by-absence mechanism on inputs that BGE struggles to embed.
  { query: "biofilm",                            expected: "TECHNICAL" },
  { query: "what causes corrosion",              expected: "TECHNICAL" },

  // ── TECHNICAL: colloquial / non-jargon phrasings ─────────────────────────
  // The user has the problem but lacks the vocabulary. Tests that the
  // model generalizes beyond exact anchor wording.
  { query: "there's slimy stuff growing in the tank",    expected: "TECHNICAL" },
  { query: "white crust building up on the pipes",       expected: "TECHNICAL" },

  // ── TECHNICAL: implicit framing ──────────────────────────────────────────
  // Conversational-looking question word, technical noun. Tests that the
  // classifier weights the content noun more than the framing verb.
  { query: "do I need to worry about Legionella",         expected: "TECHNICAL" },
  { query: "is bromine safe for drinking water systems",  expected: "TECHNICAL" },

  // ── ADVERSARIAL: technical vocabulary in non-technical framings ─────────
  // These are the canary tests. If the classifier passes the "easy"
  // TECHNICAL cases but FAILS these, it's overfitting on vocabulary
  // rather than learning intent — a serious failure mode in production.
  { query: "thanks for the pH info",                       expected: "CONVERSATIONAL" },
  { query: "someone tell me where the biofilm meeting is", expected: "SUPPORT" },
  { query: "what's the phone number for the lab",          expected: "SUPPORT" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mode 1 test cases — classifier built with caller-supplied TECHNICAL anchors
// ─────────────────────────────────────────────────────────────────────────────

const MODE_1_TECHNICAL_ANCHORS = [
  "what is the pH of chlorinated water",
  "how do I prevent scale in cooling towers",
  "Legionella prevention in industrial systems",
  "biofilm removal techniques",
  "chlorine vs bromine for sanitization",
  "what causes corrosion in boilers",
  "how often should I shock my system",
  "alkalinity testing procedures",
];

const MODE_1_TECHNICAL_DESCRIPTION =
  "a question about water treatment, chemistry, or system maintenance";

/**
 * Test cases for Mode 1: TECHNICAL anchors are supplied. Domain queries
 * should match anchors directly via cosine rather than falling through
 * by absence; non-TECHNICAL queries continue to route normally.
 */
const MODE_1_CASES = [
  // ── TECHNICAL: near-anchor paraphrases ───────────────────────────────────
  { query: "how do I lower the pH in my cooling tower",      expected: "TECHNICAL" },
  { query: "my boiler keeps corroding what should I check",  expected: "TECHNICAL" },
  { query: "should I use chlorine or bromine in my system",  expected: "TECHNICAL" },
  { query: "what's the right alkalinity for my water loop",  expected: "TECHNICAL" },

  // ── TECHNICAL: more distant paraphrases ──────────────────────────────────
  // Tests how far the anchors generalize.
  { query: "limescale buildup keeps clogging my pipes",      expected: "TECHNICAL" },
  { query: "how do I clean slime off the tower fill",        expected: "TECHNICAL" },

  // ── TECHNICAL: short phrasings (now with anchors should be easier) ──────
  { query: "biofilm",                                        expected: "TECHNICAL" },
  { query: "scale prevention",                               expected: "TECHNICAL" },

  // ── CONVERSATIONAL alongside Mode 1 anchors ─────────────────────────────
  { query: "hello",                                          expected: "CONVERSATIONAL" },
  { query: "thank you so much",                              expected: "CONVERSATIONAL" },
  { query: "how are you today",                              expected: "CONVERSATIONAL" },

  // ── SUPPORT alongside Mode 1 anchors ────────────────────────────────────
  { query: "I need to escalate this to a person",            expected: "SUPPORT" },
  { query: "can you give me a phone number",                 expected: "SUPPORT" },

  // ── ADVERSARIAL: must not be poisoned by the Mode 1 TECHNICAL anchors ──
  // Critical: adding TECHNICAL anchors should NOT pull these toward
  // TECHNICAL just because they share vocabulary.
  { query: "thanks for the pH info",                         expected: "CONVERSATIONAL" },
  { query: "what's the phone number for the lab",            expected: "SUPPORT" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Boundary cases — informational only, do NOT fail the suite
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genuinely ambiguous queries. There is no objectively correct label;
 * each case has at least two defensible answers. The script prints what
 * the classifier picks (with confidence and any NLI usage) without
 * grading the result.
 *
 * Use these to:
 *   - Understand the model's bias on real-world ambiguity.
 *   - Detect drift when anchors are tuned (if "help me" used to be
 *     SUPPORT but now is CONVERSATIONAL, that's a signal).
 *   - Identify which queries need disambiguation at the application
 *     layer rather than expecting the classifier to settle them.
 */
const BOUNDARY_CASES = [
  // Real-user-style: short, no specific intent, could go anywhere.
  { query: "help me",                  why: "Could be SUPPORT or vague TECHNICAL." },
  { query: "I have a question",        why: "Could be any of the three." },
  { query: "what should I do",         why: "Domain-less request for action." },
  { query: "this isn't working",       why: "SUPPORT or TECHNICAL depending on context." },

  // Technical noun without question framing.
  { query: "pH",                       why: "Single technical token; no intent." },
  { query: "Legionella",               why: "Single technical token; no intent." },

  // Polite formulations of technical questions — does politeness pull
  // them toward CONVERSATIONAL?
  { query: "could you please explain pH",  why: "Polite framing of technical question." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

// ANSI colors for terminal output. Disabled automatically when stdout isn't
// a TTY (e.g. CI logs piped to a file), so the file output stays clean.
const isTTY = process.stdout.isTTY;
const GREEN  = isTTY ? "\x1b[32m" : "";
const RED    = isTTY ? "\x1b[31m" : "";
const YELLOW = isTTY ? "\x1b[33m" : "";
const DIM    = isTTY ? "\x1b[2m"  : "";
const RESET  = isTTY ? "\x1b[0m"  : "";

/**
 * Run a list of `{query, expected}` cases through a built classifier.
 * Prints one line per case, accumulates results, and returns
 * `{passed, failed, total}`. NLI usage is annotated in the output.
 */
const runCases = async (label, classify, cases) => {
  console.log(`\n── ${label} ──`);

  let passed = 0;
  let failed = 0;

  for (const { query, expected } of cases) {
    const t0 = Date.now();
    const result = await classify(query);
    const elapsed = Date.now() - t0;

    const ok = result.label === expected;
    if (ok) ++passed; else ++failed;

    const mark = ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    const expectedColumn = ok
      ? ""
      : `  ${DIM}(expected ${expected}, got ${result.label}${result.usedNli ? ", NLI" : ""})${RESET}`;
    const conf = result.confidence.toFixed(3);
    const nliFlag = result.usedNli ? " [NLI]" : "";

    console.log(
      `  ${mark}  ${query.padEnd(56)} → ${result.label.padEnd(15)} ` +
      `${DIM}conf=${conf}${nliFlag} ${elapsed}ms${RESET}${expectedColumn}`
    );
  }

  console.log(`  ${DIM}${passed}/${cases.length} passed${RESET}`);
  return { passed, failed, total: cases.length };
};

/**
 * Run a list of `{query, why}` cases through a built classifier. Does
 * NOT grade pass/fail — purely informational. The `why` annotation
 * documents the ambiguity for the reader.
 */
const runBoundaryCases = async (label, classify, cases) => {
  console.log(`\n── ${label} ── ${DIM}(informational; not graded)${RESET}`);

  for (const { query, why } of cases) {
    const t0 = Date.now();
    const result = await classify(query);
    const elapsed = Date.now() - t0;

    const conf = result.confidence.toFixed(3);
    const nliFlag = result.usedNli ? " [NLI]" : "";

    console.log(
      `  ${YELLOW}OBSV${RESET}  ${query.padEnd(56)} → ${result.label.padEnd(15)} ` +
      `${DIM}conf=${conf}${nliFlag} ${elapsed}ms${RESET}`
    );
    console.log(`        ${DIM}${why}${RESET}`);
  }
};

/**
 * Build both classifiers, run their cases, print a summary, and exit
 * with a non-zero code on any failure.
 */
const main = async () => {
  console.log("Smoke test: buildClassifier against real models");
  console.log("(first run downloads ~25-80MB of quantized models; subsequent runs use the cache)");

  const t0 = Date.now();
  console.log("\nBuilding Mode 2 classifier (no TECHNICAL anchors, defaults)...");
  const mode2 = await buildClassifier();
  console.log(`  built in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  console.log("\nBuilding Mode 1 classifier (with caller-supplied TECHNICAL anchors)...");
  const mode1 = await buildClassifier({
    classes: {
      TECHNICAL: {
        anchors:     MODE_1_TECHNICAL_ANCHORS,
        description: MODE_1_TECHNICAL_DESCRIPTION,
      },
    },
  });
  console.log(`  built in ${Date.now() - t1}ms`);

  // Graded suites.
  const r2 = await runCases("Mode 2 (defaults)", mode2, MODE_2_CASES);
  const r1 = await runCases("Mode 1 (with TECHNICAL anchors)", mode1, MODE_1_CASES);

  // Informational. We run boundary queries against Mode 2 because that
  // exercises the more sensitive by-absence path. Running them against
  // Mode 1 is a useful follow-up if anchors are tuned.
  await runBoundaryCases("Boundary (Mode 2)", mode2, BOUNDARY_CASES);

  const total  = r1.total  + r2.total;
  const passed = r1.passed + r2.passed;
  const failed = r1.failed + r2.failed;

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`Total (graded): ${passed}/${total} passed, ${failed} failed`);
  console.log(`Boundary cases: ${BOUNDARY_CASES.length} observed (not graded)`);
  console.log(`Wall time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("══════════════════════════════════════════════════════════════");

  process.exit(failed > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("\nSmoke test crashed:", err);
  process.exit(2);
});