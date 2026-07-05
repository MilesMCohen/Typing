import { describe, expect, it } from "vitest";
import {
  CAPITALS_STAGE,
  DEFAULT_WPM_TARGET,
  GRADE_WPM_TARGETS,
  KEY_STAGES,
  MAX_STAGE,
  NUMBERS_STAGE,
  SYMBOLS_STAGE,
  TEST_LEVELS,
  aggregateHistory,
  buildLessonPlan,
  buildTestRound,
  decideNextStage,
  evaluateTestResult,
  generateRoundWords,
  getLetterStats,
  letterBreakdown,
  stageIncludesCapitals,
  stageIncludesNumbers,
  stageIncludesSymbols,
  stageKeysHint,
  unlockedLettersForStage,
  weakLetters,
} from "./progression.js";

describe("unlockedLettersForStage", () => {
  it("returns only the first stage's letters at stage 0", () => {
    expect(unlockedLettersForStage(0)).toEqual(KEY_STAGES[0]);
  });

  it("accumulates letters from every stage up to and including the given index", () => {
    const letters = unlockedLettersForStage(2);
    expect(letters).toEqual([...KEY_STAGES[0], ...KEY_STAGES[1], ...KEY_STAGES[2]]);
  });

  it("clamps to the final stage for an out-of-range index", () => {
    expect(unlockedLettersForStage(999)).toEqual(KEY_STAGES.flat());
  });

  it("covers every letter of the alphabet exactly once across all stages", () => {
    const all = KEY_STAGES.flat();
    expect(new Set(all).size).toBe(26);
  });
});

describe("getLetterStats", () => {
  it("counts attempts and correct hits per letter, ignoring spaces", () => {
    expect(getLetterStats("ab ab", "ax ab")).toEqual({
      a: { attempts: 2, correct: 2 },
      b: { attempts: 2, correct: 1 },
    });
  });
});

describe("letterBreakdown", () => {
  it("computes rounded per-letter accuracy, sorted worst first", () => {
    const result = letterBreakdown({
      a: { attempts: 4, correct: 4 },
      b: { attempts: 4, correct: 1 },
    });
    expect(result).toEqual([
      { letter: "b", attempts: 4, accuracy: 25 },
      { letter: "a", attempts: 4, accuracy: 100 },
    ]);
  });

  it("returns an empty list for missing stats", () => {
    expect(letterBreakdown(undefined)).toEqual([]);
  });
});

describe("aggregateHistory", () => {
  it("averages accuracy/wpm and sums per-letter totals across entries", () => {
    const history = [
      { accuracy: 80, wpm: 10, letterStats: { a: { attempts: 4, correct: 2 } } },
      { accuracy: 100, wpm: 20, letterStats: { a: { attempts: 4, correct: 4 } } },
    ];
    const result = aggregateHistory(history);
    expect(result.avgAccuracy).toBe(90);
    expect(result.avgWpm).toBe(15);
    expect(result.letterTotals).toEqual({ a: { attempts: 8, correct: 6 } });
  });

  it("only considers the most recent MAX_HISTORY entries", () => {
    const history = Array.from({ length: 8 }, (_, i) => ({ accuracy: i, wpm: i, letterStats: {} }));
    const result = aggregateHistory(history);
    expect(result.count).toBe(5);
  });

  it("returns nulls for an empty history", () => {
    expect(aggregateHistory([])).toEqual({ count: 0, avgAccuracy: null, avgWpm: null, letterTotals: {} });
  });
});

describe("weakLetters", () => {
  it("flags unlocked letters at or above the error rate threshold with enough attempts", () => {
    const totals = {
      a: { attempts: 10, correct: 5 }, // 50% error - weak
      b: { attempts: 10, correct: 9 }, // 10% error - fine
      c: { attempts: 2, correct: 0 }, // 100% error but too few attempts
    };
    expect(weakLetters(totals, ["a", "b", "c"])).toEqual(["a"]);
  });

  it("sorts weakest first and caps at max", () => {
    const totals = {
      a: { attempts: 10, correct: 8 }, // 20%
      b: { attempts: 10, correct: 2 }, // 80%
      c: { attempts: 10, correct: 5 }, // 50%
    };
    expect(weakLetters(totals, ["a", "b", "c"], { max: 2 })).toEqual(["b", "c"]);
  });
});

describe("decideNextStage", () => {
  it("starts at stage 0 with no history", () => {
    expect(decideNextStage([])).toEqual({ stageIndex: 0, direction: "start" });
  });

  it("advances a stage after consistently high accuracy and steady speed", () => {
    const history = [
      { stageIndex: 2, accuracy: 96, wpm: 20 },
      { stageIndex: 2, accuracy: 97, wpm: 22 },
    ];
    expect(decideNextStage(history)).toEqual({ stageIndex: 3, direction: "advance" });
  });

  it("advances from the full alphabet into the capitals stage", () => {
    const lastLetterStage = KEY_STAGES.length - 1;
    const history = [{ stageIndex: lastLetterStage, accuracy: 99, wpm: 30 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: CAPITALS_STAGE, direction: "advance" });
  });

  it("reports mastered instead of advancing past the final stage", () => {
    const history = [{ stageIndex: MAX_STAGE, accuracy: 99, wpm: 30 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: MAX_STAGE, direction: "mastered" });
  });

  it("holds for speed instead of advancing when accuracy is high but wpm is below target", () => {
    const history = [{ stageIndex: 2, accuracy: 99, wpm: 10 }];
    expect(decideNextStage(history, 20)).toEqual({ stageIndex: 2, direction: "hold-speed" });
  });

  it("does not report mastered at the final stage until the wpm target is met", () => {
    const history = [{ stageIndex: MAX_STAGE, accuracy: 99, wpm: 10 }];
    expect(decideNextStage(history, 20)).toEqual({ stageIndex: MAX_STAGE, direction: "hold-speed" });
  });

  it("uses a lower default wpm bar when no target is given", () => {
    const history = [{ stageIndex: 2, accuracy: 99, wpm: DEFAULT_WPM_TARGET }];
    expect(decideNextStage(history)).toEqual({ stageIndex: 3, direction: "advance" });
  });

  it("holds the stage steady for middling accuracy", () => {
    const history = [{ stageIndex: 3, accuracy: 85, wpm: 20 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: 3, direction: "hold" });
  });

  it("regresses a stage when accuracy drops too low", () => {
    const history = [{ stageIndex: 3, accuracy: 60, wpm: 20 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: 2, direction: "regress" });
  });

  it("regresses when speed drops sharply even with borderline accuracy", () => {
    const history = [
      { stageIndex: 3, accuracy: 82, wpm: 30 },
      { stageIndex: 3, accuracy: 76, wpm: 4 },
    ];
    expect(decideNextStage(history)).toEqual({ stageIndex: 2, direction: "regress" });
  });

  it("never regresses below stage 0", () => {
    const history = [{ stageIndex: 0, accuracy: 50, wpm: 5 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: 0, direction: "regress" });
  });
});

describe("generateRoundWords", () => {
  it("only uses letters from the unlocked set, even in early sparse stages", () => {
    const unlockedSet = new Set(KEY_STAGES[0]);
    const words = generateRoundWords(0, [], 24);
    expect(words).toHaveLength(24);
    for (const word of words) {
      for (const ch of word.toLowerCase()) expect(unlockedSet.has(ch)).toBe(true);
    }
  });

  it("returns the requested count once the full alphabet is unlocked", () => {
    const words = generateRoundWords(KEY_STAGES.length - 1, [], 24);
    expect(words).toHaveLength(24);
  });

  it("includes some capitalized words at the capitals stage", () => {
    const words = generateRoundWords(CAPITALS_STAGE, [], 40);
    expect(words.some((w) => /^[A-Z]/.test(w))).toBe(true);
  });

  it("includes some digit tokens at the numbers stage", () => {
    const words = generateRoundWords(NUMBERS_STAGE, [], 40);
    expect(words.some((w) => /\d/.test(w))).toBe(true);
  });

  it("includes some symbol characters at the symbols stage", () => {
    const words = generateRoundWords(SYMBOLS_STAGE, [], 40);
    expect(words.some((w) => /[.,!?':;-]/.test(w))).toBe(true);
  });
});

describe("stage content flags", () => {
  it("only turn on at or after their stage", () => {
    expect(stageIncludesCapitals(CAPITALS_STAGE - 1)).toBe(false);
    expect(stageIncludesCapitals(CAPITALS_STAGE)).toBe(true);
    expect(stageIncludesNumbers(NUMBERS_STAGE - 1)).toBe(false);
    expect(stageIncludesNumbers(NUMBERS_STAGE)).toBe(true);
    expect(stageIncludesSymbols(SYMBOLS_STAGE - 1)).toBe(false);
    expect(stageIncludesSymbols(SYMBOLS_STAGE)).toBe(true);
  });
});

describe("stageKeysHint", () => {
  it("appends ABC/123/!?. hints once those stages unlock", () => {
    expect(stageKeysHint(0)).toBe("f j");
    expect(stageKeysHint(SYMBOLS_STAGE)).toContain("ABC");
    expect(stageKeysHint(SYMBOLS_STAGE)).toContain("123");
    expect(stageKeysHint(SYMBOLS_STAGE)).toContain("!?.");
  });
});

describe("TEST_LEVELS", () => {
  it("is ordered by increasing stageIndex", () => {
    for (let i = 1; i < TEST_LEVELS.length; i++) {
      expect(TEST_LEVELS[i].stageIndex).toBeGreaterThan(TEST_LEVELS[i - 1].stageIndex);
    }
  });

  it("covers the full stage range from a few letters to all keys", () => {
    expect(TEST_LEVELS[0].stageIndex).toBe(0);
    expect(TEST_LEVELS[TEST_LEVELS.length - 1].stageIndex).toBe(MAX_STAGE);
  });
});

describe("buildTestRound", () => {
  it("generates a full round of words for the given stage", () => {
    const words = buildTestRound(TEST_LEVELS[0].stageIndex, 24);
    expect(words).toHaveLength(24);
  });
});

describe("evaluateTestResult", () => {
  it("suggests increasing the level for high accuracy", () => {
    expect(evaluateTestResult(97)).toBe("increase");
  });

  it("suggests decreasing the level for low accuracy", () => {
    expect(evaluateTestResult(60)).toBe("decrease");
  });

  it("reports a good fit for middling accuracy", () => {
    expect(evaluateTestResult(85)).toBe("fit");
  });
});

describe("buildLessonPlan", () => {
  it("produces a lesson plan with matching stage metadata and a full round of words", () => {
    const plan = buildLessonPlan([]);
    expect(plan.stageIndex).toBe(0);
    expect(plan.direction).toBe("start");
    expect(plan.unlockedLetters).toEqual(KEY_STAGES[0]);
    expect(plan.words.length).toBeGreaterThan(0);
    expect(plan.label).toBe("Level 1");
  });

  it("threads a custom wpm target through to the stage decision", () => {
    const history = [{ stageIndex: 2, accuracy: 99, wpm: 10 }];
    expect(buildLessonPlan(history, 20).direction).toBe("hold-speed");
    expect(buildLessonPlan(history, 5).direction).toBe("advance");
  });
});

describe("GRADE_WPM_TARGETS", () => {
  it("is ordered by increasing wpm from 1st to 6th grade", () => {
    for (let i = 1; i < GRADE_WPM_TARGETS.length; i++) {
      expect(GRADE_WPM_TARGETS[i].wpm).toBeGreaterThan(GRADE_WPM_TARGETS[i - 1].wpm);
    }
  });

  it("includes the default target as one of the grade presets", () => {
    expect(GRADE_WPM_TARGETS.some((g) => g.wpm === DEFAULT_WPM_TARGET)).toBe(true);
  });
});
