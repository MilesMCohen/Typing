import { describe, expect, it } from "vitest";
import {
  KEY_STAGES,
  aggregateHistory,
  buildLessonPlan,
  decideNextStage,
  generateRoundWords,
  getLetterStats,
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

  it("reports mastered instead of advancing past the last stage", () => {
    const lastStage = KEY_STAGES.length - 1;
    const history = [{ stageIndex: lastStage, accuracy: 99, wpm: 30 }];
    expect(decideNextStage(history)).toEqual({ stageIndex: lastStage, direction: "mastered" });
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
    const unlocked = KEY_STAGES[0];
    const unlockedSet = new Set(unlocked);
    const words = generateRoundWords(unlocked, [], 24);
    expect(words).toHaveLength(24);
    for (const word of words) {
      for (const ch of word) expect(unlockedSet.has(ch)).toBe(true);
    }
  });

  it("returns the requested count once the full alphabet is unlocked", () => {
    const unlocked = KEY_STAGES.flat();
    const words = generateRoundWords(unlocked, [], 24);
    expect(words).toHaveLength(24);
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
});
