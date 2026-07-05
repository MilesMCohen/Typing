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

export const MAX_HISTORY = 5;

const ADVANCE_ACCURACY = 95;
const HOLD_ACCURACY = 80;
const REGRESS_ACCURACY = 75;
const SLOWDOWN_RATIO = 0.6;

const WORD_BANK = Array.from(
  new Set(LESSONS.flatMap((lesson) => lesson.words.map((w) => w.toLowerCase())))
);

export function unlockedLettersForStage(stageIndex) {
  const clamped = Math.max(0, Math.min(stageIndex, KEY_STAGES.length - 1));
  return KEY_STAGES.slice(0, clamped + 1).flat();
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
    if (baseStage >= KEY_STAGES.length - 1) return { stageIndex: baseStage, direction: "mastered" };
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

export function generateRoundWords(unlockedLetters, weak, count = WORDS_PER_ROUND) {
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

export function buildLessonPlan(history) {
  const { stageIndex, direction } = decideNextStage(history);
  const unlockedLetters = unlockedLettersForStage(stageIndex);
  const { letterTotals } = aggregateHistory(history);
  const weak = weakLetters(letterTotals, unlockedLetters);
  const words = generateRoundWords(unlockedLetters, weak, WORDS_PER_ROUND);
  return {
    stageIndex,
    direction,
    unlockedLetters,
    weakLetters: weak,
    label: `Level ${stageIndex + 1}`,
    keysHint: unlockedLetters.join(" "),
    words,
  };
}
