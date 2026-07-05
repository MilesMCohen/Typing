import { LESSONS, WORDS_PER_ROUND, randomWords } from "./lessons.js";

// Letters unlock two at a time, home row first, mirroring standard touch-typing
// pedagogy (and the old Home Row / Upper Row / Full Keyboard lessons).
export const KEY_STAGES = [
  ["f", "j"],
  ["d", "k"],
  ["s", "l"],
  ["a"],
  ["g", "h"],
  ["e", "i"],
  ["r", "u"],
  ["t", "y"],
  ["w", "o"],
  ["q", "p"],
  ["c", "v"],
  ["b", "n"],
  ["m", "x"],
  ["z"],
];

// Beyond the full lowercase alphabet, three more stages layer on capitals,
// numbers, and symbols (each cumulative on top of the last, like KEY_STAGES).
export const CAPITALS_STAGE = KEY_STAGES.length;
export const NUMBERS_STAGE = CAPITALS_STAGE + 1;
export const SYMBOLS_STAGE = NUMBERS_STAGE + 1;
export const MAX_STAGE = SYMBOLS_STAGE;

export const MAX_HISTORY = 5;

const ADVANCE_ACCURACY = 95;
const HOLD_ACCURACY = 80;
const REGRESS_ACCURACY = 75;
const SLOWDOWN_RATIO = 0.6;

const DIGITS = "0123456789".split("");
const SYMBOLS = [".", ",", "!", "?", "'", "-", ":", ";"];

const WORD_BANK = Array.from(
  new Set(LESSONS.flatMap((lesson) => lesson.words.map((w) => w.toLowerCase())))
);

// Named jumping-off points for the placement test, roughly in increasing
// difficulty. stageIndex ties each one back into the same stage scale used
// by the adaptive lesson track, so a test result can seed `history` directly.
export const TEST_LEVELS = [
  { id: "few-letters", label: "A few letters", stageIndex: 0 },
  { id: "home-row", label: "Home row", stageIndex: 4 },
  { id: "home-upper", label: "Home and upper row", stageIndex: 9 },
  { id: "all-letters", label: "All letters", stageIndex: KEY_STAGES.length - 1 },
  { id: "letters-capitals", label: "Letters with capitals", stageIndex: CAPITALS_STAGE },
  { id: "letters-numbers", label: "Letters and numbers", stageIndex: NUMBERS_STAGE },
  { id: "all-keys", label: "All keys including symbols", stageIndex: SYMBOLS_STAGE },
];

export function unlockedLettersForStage(stageIndex) {
  const clamped = Math.max(0, Math.min(stageIndex, KEY_STAGES.length - 1));
  return KEY_STAGES.slice(0, clamped + 1).flat();
}

export function stageIncludesCapitals(stageIndex) {
  return stageIndex >= CAPITALS_STAGE;
}

export function stageIncludesNumbers(stageIndex) {
  return stageIndex >= NUMBERS_STAGE;
}

export function stageIncludesSymbols(stageIndex) {
  return stageIndex >= SYMBOLS_STAGE;
}

export function stageLabel(stageIndex) {
  return `Level ${stageIndex + 1}`;
}

export function stageKeysHint(stageIndex) {
  const letters = unlockedLettersForStage(stageIndex).join(" ");
  const extras = [];
  if (stageIncludesCapitals(stageIndex)) extras.push("ABC");
  if (stageIncludesNumbers(stageIndex)) extras.push("123");
  if (stageIncludesSymbols(stageIndex)) extras.push("!?.");
  return extras.length > 0 ? `${letters} ${extras.join(" ")}` : letters;
}

export function letterBreakdown(letterStats) {
  return Object.entries(letterStats ?? {})
    .map(([letter, { attempts, correct }]) => ({
      letter,
      attempts,
      accuracy: Math.round((correct / attempts) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function getLetterStats(target, typed) {
  const stats = {};
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === " ") continue;
    if (!stats[ch]) stats[ch] = { attempts: 0, correct: 0 };
    stats[ch].attempts += 1;
    if (typed[i] === ch) stats[ch].correct += 1;
  }
  return stats;
}

export function aggregateHistory(history) {
  const recent = history.slice(-MAX_HISTORY);
  const letterTotals = {};
  let accuracySum = 0;
  let wpmSum = 0;
  for (const entry of recent) {
    accuracySum += entry.accuracy;
    wpmSum += entry.wpm;
    for (const [letter, { attempts, correct }] of Object.entries(entry.letterStats ?? {})) {
      if (!letterTotals[letter]) letterTotals[letter] = { attempts: 0, correct: 0 };
      letterTotals[letter].attempts += attempts;
      letterTotals[letter].correct += correct;
    }
  }
  const count = recent.length;
  return {
    count,
    avgAccuracy: count ? accuracySum / count : null,
    avgWpm: count ? wpmSum / count : null,
    letterTotals,
  };
}

export function weakLetters(
  letterTotals,
  unlockedLetters,
  { minAttempts = 4, errorRateThreshold = 0.2, max = 3 } = {}
) {
  return unlockedLetters
    .map((letter) => {
      const t = letterTotals[letter];
      if (!t || t.attempts < minAttempts) return null;
      const errorRate = 1 - t.correct / t.attempts;
      return errorRate >= errorRateThreshold ? { letter, errorRate } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, max)
    .map((entry) => entry.letter);
}

export function decideNextStage(history) {
  if (history.length === 0) return { stageIndex: 0, direction: "start" };

  const baseStage = history[history.length - 1].stageIndex;
  const { avgAccuracy, avgWpm } = aggregateHistory(history);
  const bestWpm = Math.max(...history.map((h) => h.wpm));
  const slowedDown = bestWpm > 0 && avgWpm < bestWpm * SLOWDOWN_RATIO;

  if (avgAccuracy < REGRESS_ACCURACY || (avgAccuracy < HOLD_ACCURACY && slowedDown)) {
    return { stageIndex: Math.max(0, baseStage - 1), direction: "regress" };
  }
  if (avgAccuracy >= ADVANCE_ACCURACY && !slowedDown) {
    if (baseStage >= MAX_STAGE) return { stageIndex: baseStage, direction: "mastered" };
    return { stageIndex: baseStage + 1, direction: "advance" };
  }
  return { stageIndex: baseStage, direction: "hold" };
}

function wordsMatchingLetters(words, unlockedSet) {
  return words.filter((word) => [...word].every((ch) => unlockedSet.has(ch)));
}

function randomDrillWord(unlockedLetters, weak) {
  const pool = weak.length > 0 ? [...unlockedLetters, ...weak, ...weak] : unlockedLetters;
  const length = 2 + Math.floor(Math.random() * 3);
  let word = "";
  for (let i = 0; i < length; i++) {
    word += pool[Math.floor(Math.random() * pool.length)];
  }
  return word;
}

const MIN_REAL_WORDS = 8;

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function randomToken(pool, minLength, maxLength) {
  const length = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
  let token = "";
  for (let i = 0; i < length; i++) token += pool[Math.floor(Math.random() * pool.length)];
  return token;
}

function sprinkleTokens(words, tokenFn, rate) {
  return words.map((word) => (Math.random() < rate ? tokenFn() : word));
}

function baseRoundWords(unlockedLetters, weak, count) {
  const unlockedSet = new Set(unlockedLetters);
  const realWords = wordsMatchingLetters(WORD_BANK, unlockedSet);

  if (realWords.length >= MIN_REAL_WORDS) {
    const weighted = realWords.flatMap((word) =>
      weak.some((letter) => word.includes(letter)) ? [word, word, word] : [word]
    );
    return randomWords(weighted, count);
  }

  const words = [];
  for (let i = 0; i < count; i++) {
    if (realWords.length > 0 && i % 3 === 0) {
      words.push(realWords[Math.floor(Math.random() * realWords.length)]);
    } else {
      words.push(randomDrillWord(unlockedLetters, weak));
    }
  }
  return words;
}

export function generateRoundWords(stageIndex, weak, count = WORDS_PER_ROUND) {
  const unlockedLetters = unlockedLettersForStage(stageIndex);
  let words = baseRoundWords(unlockedLetters, weak, count);

  if (stageIncludesCapitals(stageIndex)) {
    words = words.map((word) => (Math.random() < 0.5 ? capitalize(word) : word));
  }
  if (stageIncludesNumbers(stageIndex)) {
    words = sprinkleTokens(words, () => randomToken(DIGITS, 1, 3), 0.15);
  }
  if (stageIncludesSymbols(stageIndex)) {
    words = words.map((word) => (Math.random() < 0.25 ? word + SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : word));
    words = sprinkleTokens(words, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], 0.1);
  }
  return words;
}

export function buildLessonPlan(history) {
  const { stageIndex, direction } = decideNextStage(history);
  const unlockedLetters = unlockedLettersForStage(stageIndex);
  const { letterTotals } = aggregateHistory(history);
  const weak = weakLetters(letterTotals, unlockedLetters);
  const words = generateRoundWords(stageIndex, weak, WORDS_PER_ROUND);
  return {
    stageIndex,
    direction,
    unlockedLetters,
    weakLetters: weak,
    label: stageLabel(stageIndex),
    keysHint: stageKeysHint(stageIndex),
    words,
  };
}

export function buildTestRound(stageIndex, count = WORDS_PER_ROUND) {
  return generateRoundWords(stageIndex, [], count);
}

// Mirrors decideNextStage's own accuracy thresholds so a one-off test verdict
// stays consistent with what would happen in ongoing adaptive play.
export function evaluateTestResult(accuracy) {
  if (accuracy >= ADVANCE_ACCURACY) return "increase";
  if (accuracy < REGRESS_ACCURACY) return "decrease";
  return "fit";
}
