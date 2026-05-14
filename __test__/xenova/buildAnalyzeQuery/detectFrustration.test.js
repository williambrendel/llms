"use strict";

/**
 * @file detectFrustration.test.js
 * @brief Unit tests for the frustration-signal detector.
 *
 * Pure function, no mocks. Tests cover each individual signal
 * (shouting, repeated punctuation, urgent keywords, profanity) and
 * combinations that exercise the composite score, plus edge inputs.
 */

const detectFrustration = require("../../../src/xenova/buildAnalyzeQuery/detectFrustration");

// ─────────────────────────────────────────────────────────────────────────────
// Shouting signal
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — shouting (ALL CAPS)", () => {
  test("ALL CAPS query → shouting=true", () => {
    const r = detectFrustration("THIS IS BROKEN");
    expect(r.shouting).toBe(true);
    expect(r.allCaps).toBe(true);
  });

  test("lowercase → shouting=false", () => {
    const r = detectFrustration("this is fine");
    expect(r.shouting).toBe(false);
    expect(r.allCaps).toBe(false);
  });

  test("short ALL CAPS (≤3 alpha chars) → allCaps=true but shouting=false", () => {
    // "PH" is an acronym, not a shout.
    const r = detectFrustration("PH");
    expect(r.allCaps).toBe(true);
    expect(r.shouting).toBe(false);
  });

  test("mixed case under threshold → shouting=false", () => {
    const r = detectFrustration("This Is Mixed Case");
    expect(r.shouting).toBe(false);
  });

  test("majority uppercase passes threshold", () => {
    // 4 upper, 0 lower → ratio 1.0, alphaCount 4 ≥ 4 → shouting
    const r = detectFrustration("HELP");
    expect(r.shouting).toBe(true);
  });

  test("queries with no letters → shouting=false (cannot shout numbers)", () => {
    const r = detectFrustration("123 456");
    expect(r.shouting).toBe(false);
    expect(r.allCaps).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Repeated punctuation signal
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — repeated punctuation count", () => {
  test("single !? not counted", () => {
    expect(detectFrustration("hello!").repeatedPunctCount).toBe(0);
    expect(detectFrustration("really?").repeatedPunctCount).toBe(0);
  });

  test("'!!!' → one run", () => {
    expect(detectFrustration("thanks!!!").repeatedPunctCount).toBe(1);
  });

  test("'???' → one run", () => {
    expect(detectFrustration("why???").repeatedPunctCount).toBe(1);
  });

  test("'!!! ???' → two distinct runs", () => {
    // Two separate runs of repeated terminal punct, counted separately.
    expect(detectFrustration("help!!! why???").repeatedPunctCount).toBe(2);
  });

  test("mixed run '??!!' → one run", () => {
    // Both ? and ! are in the same character class, adjacent.
    expect(detectFrustration("hello??!!").repeatedPunctCount).toBe(1);
  });

  test("no punctuation → 0", () => {
    expect(detectFrustration("what is pH").repeatedPunctCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Urgent keywords signal
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — urgent keywords", () => {
  test("'urgent' matches", () => {
    expect(detectFrustration("this is urgent").urgentKeywords).toContain("urgent");
  });

  test("'asap' matches", () => {
    expect(detectFrustration("need help asap").urgentKeywords).toContain("asap");
  });

  test("'broken' matches", () => {
    expect(detectFrustration("the system is broken").urgentKeywords).toContain("broken");
  });

  test("multi-word phrase 'not working' matches as a phrase", () => {
    expect(detectFrustration("this is not working").urgentKeywords).toContain("not working");
  });

  test("'doesn't work' matches", () => {
    expect(detectFrustration("the valve doesn't work").urgentKeywords).toContain("doesn't work");
  });

  test("case-insensitive matching", () => {
    expect(detectFrustration("URGENT request").urgentKeywords).toContain("urgent");
  });

  test("multiple urgent keywords accumulate", () => {
    const r = detectFrustration("urgent! broken now!");
    expect(r.urgentKeywords.length).toBeGreaterThanOrEqual(2);
  });

  test("no urgent words → empty array", () => {
    expect(detectFrustration("what is pH").urgentKeywords).toEqual([]);
  });

  test("'now' inside another word does NOT match", () => {
    // 'now' inside 'knowledge' should not trigger via word boundary.
    expect(detectFrustration("I need knowledge").urgentKeywords).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profanity signal
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — profanity", () => {
  test("'damn' detected", () => {
    expect(detectFrustration("this damn thing").profanity).toBe(true);
  });

  test("'fuck' detected", () => {
    expect(detectFrustration("what the fuck").profanity).toBe(true);
  });

  test("'wtf' detected", () => {
    expect(detectFrustration("wtf is happening").profanity).toBe(true);
  });

  test("case-insensitive", () => {
    expect(detectFrustration("DAMN system").profanity).toBe(true);
  });

  test("no profanity → false", () => {
    expect(detectFrustration("what is pH").profanity).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Composite score
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — composite score", () => {
  test("neutral query → score 0", () => {
    expect(detectFrustration("what is pH?").score).toBe(0);
  });

  test("only shouting → ~0.3", () => {
    const r = detectFrustration("HELLO WORLD");
    expect(r.score).toBeGreaterThan(0.2);
    expect(r.score).toBeLessThanOrEqual(0.4);
  });

  test("only one repeated-punct run → ~0.07", () => {
    const r = detectFrustration("hello!!!");
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(0.15);
  });

  test("only one urgent keyword → ~0.15", () => {
    const r = detectFrustration("help asap");
    expect(r.score).toBeGreaterThan(0.1);
    expect(r.score).toBeLessThan(0.2);
  });

  test("only profanity → ~0.2", () => {
    const r = detectFrustration("what the fuck");
    expect(r.score).toBeGreaterThan(0.15);
    expect(r.score).toBeLessThanOrEqual(0.4);
  });

  test("everything combined → high score", () => {
    const r = detectFrustration("THIS DAMN SYSTEM IS NOT WORKING!!!");
    expect(r.score).toBeGreaterThan(0.7);
  });

  test("score is clamped at 1", () => {
    const r = detectFrustration("THIS DAMN FUCKING BROKEN URGENT ASAP NOW!!! ??? !!!");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  test("score is at least 0", () => {
    expect(detectFrustration("").score).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — edge inputs", () => {
  test("empty string → all signals false / empty / 0", () => {
    const r = detectFrustration("");
    expect(r.score).toBe(0);
    expect(r.shouting).toBe(false);
    expect(r.allCaps).toBe(false);
    expect(r.repeatedPunctCount).toBe(0);
    expect(r.urgentKeywords).toEqual([]);
    expect(r.profanity).toBe(false);
  });

  test("null input → safe defaults", () => {
    const r = detectFrustration(null);
    expect(r.score).toBe(0);
    expect(r.shouting).toBe(false);
  });

  test("undefined input → safe defaults", () => {
    const r = detectFrustration(undefined);
    expect(r.score).toBe(0);
  });

  test("whitespace-only → safe defaults", () => {
    const r = detectFrustration("   ");
    expect(r.score).toBe(0);
  });

  test("single character → no signals", () => {
    expect(detectFrustration("?").repeatedPunctCount).toBe(0);
    expect(detectFrustration("!").repeatedPunctCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Module export shape
// ─────────────────────────────────────────────────────────────────────────────

describe("detectFrustration — module export", () => {
  test("module is frozen", () => {
    expect(Object.isFrozen(detectFrustration)).toBe(true);
  });

  test("self-referential property", () => {
    expect(detectFrustration.detectFrustration).toBe(detectFrustration);
  });
});
