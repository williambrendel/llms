"use strict";

const correctQuery = require("../../src/utilities/correctQuery");

// ─────────────────────────────────────────────────────────────────────────────
// Mock spell engine factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal mock nspell engine.
 * @param {Object} dict - Map of word → correct spelling (or true if already correct).
 */
const mockSpell = (dict = {}) => ({
  correct: word => dict[word.toLowerCase()] === true || word.toLowerCase() in dict === false,
  suggest: word => {
    const correction = dict[word.toLowerCase()];
    return correction && correction !== true ? [correction] : [];
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Falsy / passthrough
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — falsy input", () => {
  test("null — returned as-is", () => {
    expect(correctQuery(null)).toBe(null);
  });

  test("undefined — returned as-is", () => {
    expect(correctQuery(undefined)).toBe(undefined);
  });

  test("empty string — returned as-is", () => {
    expect(correctQuery("")).toBe("");
  });

  test("zero — returned as-is", () => {
    expect(correctQuery(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Punctuation normalization (no spell engine)
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — punctuation normalization", () => {
  test("multiple commas → single comma", () => {
    expect(correctQuery("too many commas,,,")).toBe("too many commas,");
  });

  test("multiple exclamation marks → single", () => {
    expect(correctQuery("wow!!!")).toBe("wow!");
  });

  test("multiple question marks → single", () => {
    expect(correctQuery("really???")).toBe("really?");
  });

  test("four dots → ellipsis", () => {
    expect(correctQuery("wait....")).toBe("wait...");
  });

  test("two dots → ellipsis", () => {
    expect(correctQuery("wait..")).toBe("wait...");
  });

  test("underscore → hyphen", () => {
    expect(correctQuery("some_thing")).toBe("some-thing");
  });

  test("tilde → hyphen", () => {
    expect(correctQuery("some~thing")).toBe("some-thing");
  });

  test("double hyphen → em dash", () => {
    expect(correctQuery("word--word")).toBe("word—word");
  });

  test("triple hyphen → em dash", () => {
    expect(correctQuery("word---word")).toBe("word—word");
  });

  test("clean input unchanged", () => {
    expect(correctQuery("What is corrosion?")).toBe("What is corrosion?");
  });

  test("numbers preserved", () => {
    expect(correctQuery("pH 7.4 at 25°C")).toBe("pH 7.4 at 25°C");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CORRECTIONS dictionary (no nspell needed)
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — CORRECTIONS dictionary", () => {
  // Corrections fire before nspell, so a spell engine that marks everything
  // correct still won't block them.
  const spell = mockSpell({});  // correct() always true — only CORRECTIONS fire

  test("teh → the", () => {
    expect(correctQuery("teh", spell)).toBe("the");
  });

  test("dont → don't", () => {
    expect(correctQuery("dont", spell)).toBe("don't");
  });

  test("doesnt → doesn't", () => {
    expect(correctQuery("doesnt", spell)).toBe("doesn't");
  });

  test("wont → won't", () => {
    expect(correctQuery("wont", spell)).toBe("won't");
  });

  test("cant → can't", () => {
    expect(correctQuery("cant", spell)).toBe("can't");
  });

  test("alot → a lot", () => {
    expect(correctQuery("alot", spell)).toBe("a lot");
  });

  test("ph → pH", () => {
    expect(correctQuery("ph level", spell)).toBe("pH level");
  });

  test("legionella → Legionella (capitalized)", () => {
    expect(correctQuery("legionella risk", spell)).toBe("Legionella risk");
  });

  test("algea → algae", () => {
    expect(correctQuery("algea growth", spell)).toBe("algae growth");
  });

  test("corrison → corrosion", () => {
    expect(correctQuery("corrison", spell)).toBe("corrosion");
  });

  test("scalling → scaling", () => {
    expect(correctQuery("scalling issue", spell)).toBe("scaling issue");
  });

  test("seperate → separate", () => {
    expect(correctQuery("seperate", spell)).toBe("separate");
  });

  test("definately → definitely", () => {
    expect(correctQuery("definately", spell)).toBe("definitely");
  });

  test("recieve → receive", () => {
    expect(correctQuery("recieve", spell)).toBe("receive");
  });

  test("CORRECTIONS key is case-insensitive — uppercase input", () => {
    // "TEH" lowercased → "teh" in CORRECTIONS → "the"
    expect(correctQuery("TEH", spell)).toBe("the");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spell engine correction (via mock)
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — spell engine correction", () => {
  const spell = mockSpell({
    quikc:  "quick",
    brwon:  "brown",
    corrct: "correct",
  });

  test("misspelled word corrected via nspell suggestion", () => {
    expect(correctQuery("quikc", spell)).toBe("quick");
  });

  test("multiple misspelled words corrected", () => {
    expect(correctQuery("quikc brwon", spell)).toBe("quick brown");
  });

  test("correctly spelled word passed through unchanged", () => {
    expect(correctQuery("fox", spell)).toBe("fox");
  });

  test("no suggestion available — original token kept", () => {
    const noSuggest = mockSpell({ xyz: undefined });
    // "xyz" is misspelled (correct() returns false) but suggest() returns []
    const spellNoSuggest = {
      correct: () => false,
      suggest: () => []
    };
    expect(correctQuery("xyz", spellNoSuggest)).toBe("xyz");
  });

  test("punctuation tokens not passed to spell engine", () => {
    // If punctuation were corrected it would change; verify it's preserved.
    expect(correctQuery("quikc, brwon!", spell)).toBe("quick, brown!");
  });

  test("numbers not passed to spell engine", () => {
    expect(correctQuery("42 quikc", spell)).toBe("42 quick");
  });

  test("whitespace normalized between and around corrected words", () => {
    expect(correctQuery(" quikc   brwon ", spell)).toBe("quick brown");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contractions
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — contractions", () => {
  const spell = mockSpell({});

  test("don't preserved — already in CORRECTIONS output", () => {
    expect(correctQuery("dont worry", spell)).toBe("don't worry");
  });

  test("existing contraction passed through unchanged", () => {
    // "don't" is already correct — spell.correct("don't") → true
    const passthrough = { correct: () => true, suggest: () => [] };
    expect(correctQuery("don't", passthrough)).toBe("don't");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createSpellMapFunc memoization
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — createSpellMapFunc memoization", () => {
  test("same spell instance → same result for same input across calls", () => {
    const spell = { correct: () => false, suggest: () => ["fixed"] };
    // Two separate calls with same spell engine should produce same output.
    expect(correctQuery("brokn", spell)).toBe("fixed");
    expect(correctQuery("brokn", spell)).toBe("fixed");
  });

  test("null spell engine → no spell correction applied", () => {
    // Without spell engine, CORRECTIONS still fire but nspell does not.
    expect(correctQuery("teh quikc", null)).toBe("teh quikc");
  });

  test("different spell instances produce independent corrections", () => {
    const spellA = { correct: () => false, suggest: () => ["alpha"] };
    const spellB = { correct: () => false, suggest: () => ["beta"] };
    expect(correctQuery("word", spellA)).toBe("alpha");
    expect(correctQuery("word", spellB)).toBe("beta");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDomainWords
// ─────────────────────────────────────────────────────────────────────────────

describe("getDomainWords", () => {
  const { getDomainWords } = correctQuery;

  test("returns an array", () => {
    expect(Array.isArray(getDomainWords())).toBe(true);
  });

  test("array is non-empty", () => {
    expect(getDomainWords().length).toBeGreaterThan(0);
  });

  test("lazy singleton — same reference on repeated calls", () => {
    expect(getDomainWords()).toBe(getDomainWords());
  });

  test("contains core domain terms", () => {
    const words = getDomainWords();
    expect(words).toContain("Legionella");
    expect(words).toContain("algae");
    expect(words).toContain("biofilm");
    expect(words).toContain("blowdown");
    expect(words).toContain("conductivity");
    expect(words).toContain("phosphonate");
    expect(words).toContain("corrosion");
    expect(words).toContain("scaling");
    expect(words).toContain("alkalinity");
    expect(words).toContain("passivation");
  });

  test("contains units and abbreviations", () => {
    const words = getDomainWords();
    expect(words).toContain("ppm");
    expect(words).toContain("NTU");
    expect(words).toContain("GPM");
    expect(words).toContain("TDS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createSpellingEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("createSpellingEngine", () => {
  const { createSpellingEngine } = correctQuery;

  test("returns an object with correct() and suggest()", async () => {
    const spell = await createSpellingEngine();
    expect(typeof spell.correct).toBe("function");
    expect(typeof spell.suggest).toBe("function");
  }, 10000);

  test("correctly spelled word returns true", async () => {
    const spell = await createSpellingEngine();
    expect(spell.correct("water")).toBe(true);
    expect(spell.correct("corrosion")).toBe(true);
  }, 10000);

  test("domain words are pre-loaded — Legionella correct", async () => {
    const spell = await createSpellingEngine();
    expect(spell.correct("Legionella")).toBe(true);
  }, 10000);

  test("domain words are pre-loaded — algae correct", async () => {
    const spell = await createSpellingEngine();
    expect(spell.correct("algae")).toBe(true);
  }, 10000);

  test("skip domain words when passed null", async () => {
    const spell = await createSpellingEngine(null, null);
    expect(typeof spell.correct).toBe("function");
  }, 10000);

  test("custom domain words added", async () => {
    const spell = await createSpellingEngine(null, ["mycustomterm"]);
    expect(spell.correct("mycustomterm")).toBe(true);
  }, 10000);

  test("single string domain word (not array) added correctly", async () => {
    const spell = await createSpellingEngine(null, "singletestword");
    expect(spell.correct("singletestword")).toBe(true);
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Frozen export
// ─────────────────────────────────────────────────────────────────────────────

describe("correctQuery — module export", () => {
  test("frozen — cannot add properties", () => {
    expect(() => { correctQuery.foo = 1; }).toThrow();
  });

  test("named export matches default", () => {
    expect(correctQuery.correctQuery).toBe(correctQuery);
  });

  test("createSpellingEngine attached to export", () => {
    expect(typeof correctQuery.createSpellingEngine).toBe("function");
  });

  test("getDomainWords attached to export", () => {
    expect(typeof correctQuery.getDomainWords).toBe("function");
  });
});
