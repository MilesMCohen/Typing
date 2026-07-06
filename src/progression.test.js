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
  groupBreakdown,
  groupForChar,
  groupLabel,
  minWpmForTarget,
  stageIncludesCapitals,
  stageIncludesNumbers,
  stageIncludesSymbols,
  stageKeysHint,
  unlockedLettersForStage,
  weakGroups,
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

  it("does not unlock any new letters at an empty consolidation stage", () => {
    const emptyStageIndex = KEY_STAGES.findIndex((stage) => stage.length === 0);
    expect(emptyStageIndex).toBeGreaterThan(0);
    expect(unlockedLettersForStage(emptyStageIndex)).toEqual(unlockedLettersForStage(emptyStageIndex - 1));
  });

  it("introduces the index-finger reach pair (g/h, t/y, b/n) after the rest of its row", () => {
    const indexOf = (pair) => KEY_STAGES.findIndex((stage) => stage.join("") === pair.join(""));
    const homeRow = [["f", "j"], ["d", "k"], ["s", "l"], ["a"]];
    const topRow = [["e", "i"], ["r", "u"], ["w", "o"], ["q", "p"]];
    const bottomRow = [["c", "v"], ["m", "x"], ["z"]];

    expect(homeRow.every((pair) => indexOf(pair) < indexOf(["g", "h"]))).toBe(true);
    expect(topRow.every((pair) => indexOf(pair) < indexOf(["t", "y"]))).toBe(true);
    expect(bottomRow.every((pair) => indexOf(pair) < indexOf(["b", "n"]))).toBe(true);
  });
});

describe("groupForChar", () => {
  it("maps every letter in the same physical row onto the same group", () => {
    expect(groupForChar("f")).toBe("home-row");
    expect(groupForChar("j")).toBe("home-row");
    expect(groupForChar("a")).toBe("home-row");
  });

  it("gives a different group to a letter on a different row", () => {
    expect(groupForChar("q")).toBe("top-row");
    expect(groupForChar("z")).toBe("bottom-row");
  });

  it("groups capitals by the opposite-hand shift key they need, not their row", () => {
    expect(groupForChar("F")).toBe("capitals-right"); // f is a left-hand key -> right shift
    expect(groupForChar("J")).toBe("capitals-left"); // j is a right-hand key -> left shift
    expect(groupForChar("Q")).toBe("capitals-right"); // q is a left-hand key -> right shift
  });

  it("groups digits together and punctuation by which hand types it", () => {
    expect(groupForChar("7")).toBe("0-9");
    expect(groupForChar(",")).toBe("punctuation-right"); // unshifted, typed with the right hand
    expect(groupForChar("!")).toBe("punctuation-right"); // Shift+1: "1" is left-hand -> right shift
    expect(groupForChar("?")).toBe("punctuation-left"); // Shift+/: "/" is right-hand -> left shift
  });
});

describe("groupLabel", () => {
  it("gives each row a readable name", () => {
    expect(groupLabel("home-row")).toBe("Home Row");
    expect(groupLabel("top-row")).toBe("Top Row");
    expect(groupLabel("bottom-row")).toBe("Bottom Row");
  });

  it("gives the category groups a readable name too", () => {
    expect(groupLabel("capitals-left")).toBe("Capitals (Left Shift)");
    expect(groupLabel("capitals-right")).toBe("Capitals (Right Shift)");
    expect(groupLabel("punctuation-left")).toBe("Punctuation (Left Hand)");
    expect(groupLabel("punctuation-right")).toBe("Punctuation (Right Hand)");
    expect(groupLabel("0-9")).toBe("0-9");
  });
});

describe("getLetterStats", () => {
  it("counts attempts and correct hits per row group, ignoring spaces", () => {
    expect(getLetterStats("ae ae", "ax ae")).toEqual({
      "home-row": { attempts: 2, correct: 2, totalMs: 0, timedAttempts: 0 },
      "top-row": { attempts: 2, correct: 1, totalMs: 0, timedAttempts: 0 },
    });
  });

  it("folds a per-character duration into its group's speed total", () => {
    const stats = getLetterStats("aa", "aa", [200, 100]);
    expect(stats["home-row"]).toEqual({ attempts: 2, correct: 2, totalMs: 300, timedAttempts: 2 });
  });
});

describe("groupBreakdown", () => {
  it("computes rounded per-group accuracy and wpm, sorted worst-accuracy first", () => {
    const result = groupBreakdown({
      "home-row": { attempts: 4, correct: 4, totalMs: 800, timedAttempts: 4 }, // 200ms/char -> 60 wpm
      "top-row": { attempts: 4, correct: 1, totalMs: 0, timedAttempts: 0 },
    });
    expect(result).toEqual([
      { group: "top-row", label: "Top Row", attempts: 4, accuracy: 25, wpm: null },
      { group: "home-row", label: "Home Row", attempts: 4, accuracy: 100, wpm: 60 },
    ]);
  });

  it("returns an empty list for missing stats", () => {
    expect(groupBreakdown(undefined)).toEqual([]);
  });
});

describe("aggregateHistory", () => {
  it("averages accuracy/wpm and sums per-group totals across entries", () => {
    const history = [
      { accuracy: 80, wpm: 10, letterStats: { a: { attempts: 4, correct: 2, totalMs: 800, timedAttempts: 4 } } },
      { accuracy: 100, wpm: 20, letterStats: { a: { attempts: 4, correct: 4, totalMs: 400, timedAttempts: 4 } } },
    ];
    const result = aggregateHistory(history);
    expect(result.avgAccuracy).toBe(90);
    expect(result.avgWpm).toBe(15);
    expect(result.groupTotals).toEqual({ a: { attempts: 8, correct: 6, totalMs: 1200, timedAttempts: 8 } });
  });

  it("only considers the most recent MAX_HISTORY entries", () => {
    const history = Array.from({ length: 8 }, (_, i) => ({ accuracy: i, wpm: i, letterStats: {} }));
    const result = aggregateHistory(history);
    expect(result.count).toBe(5);
  });

  it("returns nulls for an empty history", () => {
    expect(aggregateHistory([])).toEqual({ count: 0, avgAccuracy: null, avgWpm: null, groupTotals: {} });
  });
});

describe("weakGroups", () => {
  it("flags unlocked groups at or above the error rate threshold with enough attempts", () => {
    const totals = {
      a: { attempts: 10, correct: 5 }, // 50% error - weak
      b: { attempts: 10, correct: 9 }, // 10% error - fine
      c: { attempts: 2, correct: 0 }, // 100% error but too few attempts
    };
    expect(weakGroups(totals, ["a", "b", "c"])).toEqual(["a"]);
  });

  it("sorts weakest first and caps at max", () => {
    const totals = {
      a: { attempts: 10, correct: 8 }, // 20%
      b: { attempts: 10, correct: 2 }, // 80%
      c: { attempts: 10, correct: 5 }, // 50%
    };
    expect(weakGroups(totals, ["a", "b", "c"], { max: 2 })).toEqual(["b", "c"]);
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

  it("has a 'most of' tier right before each row's harder reach pair unlocks", () => {
    const letters = (id) => {
      const level = TEST_LEVELS.find((l) => l.id === id);
      return new Set(unlockedLettersForStage(level.stageIndex));
    };
    expect(letters("most-home-row").has("g")).toBe(false);
    expect(letters("home-row").has("g")).toBe(true);
    expect(letters("most-top-row").has("t")).toBe(false);
    expect(letters("home-upper").has("t")).toBe(true);
    expect(letters("most-letters").has("b")).toBe(false);
    expect(letters("all-letters").has("b")).toBe(true);
  });
});

describe("buildTestRound", () => {
  it("generates a full round of words for the given stage", () => {
    const words = buildTestRound(TEST_LEVELS[0].stageIndex, 24);
    expect(words).toHaveLength(24);
  });
});

describe("minWpmForTarget", () => {
  it("uses the wpm of the grade one below the target", () => {
    expect(minWpmForTarget(20)).toBe(12); // 4th grade target -> 3rd grade floor
  });

  it("has no floor below the lowest grade", () => {
    expect(minWpmForTarget(5)).toBe(0); // 1st grade has no grade below it
  });

  it("has no floor for an unrecognized target", () => {
    expect(minWpmForTarget(999)).toBe(0);
  });
});

describe("evaluateTestResult", () => {
  it("suggests increasing the level for high accuracy and speed at or above the target", () => {
    expect(evaluateTestResult(97, 25, 20)).toBe("increase");
  });

  it("does not suggest increasing on accuracy alone if speed is below the target", () => {
    expect(evaluateTestResult(97, 15, 20)).toBe("fit");
  });

  it("suggests decreasing the level for low accuracy even with good speed", () => {
    expect(evaluateTestResult(60, 25, 20)).toBe("decrease");
  });

  it("suggests decreasing the level when speed is below the one-grade-down floor, even with good accuracy", () => {
    expect(evaluateTestResult(90, 5, 20)).toBe("decrease");
  });

  it("reports a good fit for middling accuracy and speed above the floor but below the target", () => {
    expect(evaluateTestResult(85, 15, 20)).toBe("fit");
  });
});

describe("buildLessonPlan", () => {
  it("produces a lesson plan with matching stage metadata and a full round of words", () => {
    const plan = buildLessonPlan([]);
    expect(plan.stageIndex).toBe(0);
    expect(plan.direction).toBe("start");
    expect(plan.unlockedLetters).toEqual(KEY_STAGES[0]);
    expect(plan.words.length).toBeGreaterThan(0);
    expect(plan.label).toBe("Home Row: F & J");
  });

  it("threads a custom wpm target through to the stage decision", () => {
    const history = [{ stageIndex: 2, accuracy: 99, wpm: 10 }];
    expect(buildLessonPlan(history, 20).direction).toBe("hold-speed");
    expect(buildLessonPlan(history, 5).direction).toBe("advance");
  });
});

describe("GRADE_WPM_TARGETS", () => {
  it("is ordered by strictly increasing wpm", () => {
    for (let i = 1; i < GRADE_WPM_TARGETS.length; i++) {
      expect(GRADE_WPM_TARGETS[i].wpm).toBeGreaterThan(GRADE_WPM_TARGETS[i - 1].wpm);
    }
  });

  it("includes the default target as one of the presets", () => {
    expect(GRADE_WPM_TARGETS.some((g) => g.wpm === DEFAULT_WPM_TARGET)).toBe(true);
  });

  it("reaches up to 100 wpm for adult proficiency levels", () => {
    expect(GRADE_WPM_TARGETS[GRADE_WPM_TARGETS.length - 1].wpm).toBe(100);
  });
});
