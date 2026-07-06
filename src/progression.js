import { LESSONS, WORDS_PER_ROUND, randomWords } from "./lessons.js";

// Letters unlock a pair at a time, home row first, mirroring standard
// touch-typing pedagogy (and the old Home Row / Upper Row / Full Keyboard
// lessons). Within each row, the "reach" pair typed by the index fingers
// sliding off their home column (g/h, t/y, b/n) is deliberately introduced
// last, since it requires real finger movement even though g/h still sits
// on the home row. An empty stage right before each reach pair repeats an
// extra round on that row's easier keys instead of unlocking anything new,
// giving more practice before the harder stretch.
export const KEY_STAGES = [
  ["f", "j"],
  ["d", "k"],
  ["s", "l"],
  ["a"],
  [],
  ["g", "h"],
  ["e", "i"],
  ["r", "u"],
  ["w", "o"],
  ["q", "p"],
  [],
  ["t", "y"],
  ["c", "v"],
  ["m", "x"],
  ["z"],
  [],
  ["b", "n"],
];

// Beyond the full lowercase alphabet, three more stages layer on capitals,
// numbers, and symbols (each cumulative on top of the last, like KEY_STAGES).
export const CAPITALS_STAGE = KEY_STAGES.length;
export const NUMBERS_STAGE = CAPITALS_STAGE + 1;
export const SYMBOLS_STAGE = NUMBERS_STAGE + 1;
export const MAX_STAGE = SYMBOLS_STAGE;

// One name per stage (indices line up 1:1 with KEY_STAGES, then the three
// cumulative capitals/numbers/symbols stages). Named instead of numbered so
// an advanced typer landing on the last stage sees "Full Keyboard" rather
// than an arbitrary-looking "Level 20".
const STAGE_NAMES = [
  "Home Row: F & J",
  "Home Row: D & K",
  "Home Row: S & L",
  "Home Row: A",
  "Home Row Practice",
  "Home Row: G & H",
  "Top Row: E & I",
  "Top Row: R & U",
  "Top Row: W & O",
  "Top Row: Q & P",
  "Top Row Practice",
  "Top Row: T & Y",
  "Bottom Row: C & V",
  "Bottom Row: M & X",
  "Bottom Row: Z",
  "Bottom Row Practice",
  "Full Alphabet: B & N",
  "Capitals",
  "Numbers",
  "Full Keyboard",
];

export const MAX_HISTORY = 5;

// Speed targets from early school benchmarks up through adult proficiency
// levels, used both to seed the default target and to let anyone — a kid or
// a parent practicing alongside them — pick a target that matches where
// they're headed. Roughly follows common school keyboarding curricula for
// the grade entries, and typical adult typing-speed benchmarks beyond that.
export const GRADE_WPM_TARGETS = [
  { id: "1st", label: "1st grade", wpm: 5 },
  { id: "2nd", label: "2nd grade", wpm: 8 },
  { id: "3rd", label: "3rd grade", wpm: 12 },
  { id: "4th", label: "4th grade", wpm: 20 },
  { id: "5th", label: "5th grade", wpm: 25 },
  { id: "6th", label: "6th grade", wpm: 30 },
  { id: "7th", label: "7th grade", wpm: 35 },
  { id: "8th", label: "8th grade", wpm: 40 },
  { id: "high-school", label: "High school", wpm: 50 },
  { id: "adult", label: "Adult average", wpm: 60 },
  { id: "proficient", label: "Proficient", wpm: 75 },
  { id: "expert", label: "Expert", wpm: 100 },
];

export const DEFAULT_WPM_TARGET = 20;

export function gradeLabelForWpmTarget(wpmTarget) {
  return GRADE_WPM_TARGETS.find((grade) => grade.wpm === wpmTarget)?.label ?? null;
}

const ADVANCE_ACCURACY = 95;
const HOLD_ACCURACY = 80;
const REGRESS_ACCURACY = 75;
const SLOWDOWN_RATIO = 0.6;

const DIGITS = "0123456789".split("");
const SYMBOLS = [".", ",", "!", "?", "'", "-", ":", ";"];

// Per-letter stats take dozens of reps to say anything meaningful, since each
// individual key only comes up a handful of times per round — and even
// per-finger-pair groups (14 of them) spread attempts too thin to reach a
// meaningful sample quickly. Grouping by physical keyboard row instead — the
// same three-row split KEY_STAGES already progresses through, and that
// STAGE_NAMES already labels ("Home Row: ...", "Top Row: ...", "Bottom Row:
// ...") — means a weak-spot or speed reading has real data behind it within
// a round or two, and lines up with the level a kid is actually working
// through. Capitals get their own group rather than folding into their
// lowercase letter's row — hitting shift is a distinct skill worth tracking
// on its own, separate from which row the underlying key sits on.
const ROW_GROUPS = [
  { id: "home-row", label: "Home Row", stageRange: [0, 5] },
  { id: "top-row", label: "Top Row", stageRange: [6, 11] },
  { id: "bottom-row", label: "Bottom Row", stageRange: [12, 16] },
];
// Touch typing always presses Shift with the hand *opposite* the key being
// shifted (left hand types "j", right hand holds Shift for "J") — that
// opposite-hand pinky reach is its own skill, distinct per side. So capitals
// split into two groups by which shift key they need, and punctuation
// (which is either unshifted and typed by one hand outright, or shifted
// from a key on the other hand) splits the same way.
const LEFT_HAND_LETTERS = new Set(["q", "w", "e", "r", "t", "a", "s", "d", "f", "g", "z", "x", "c", "v", "b"]);

function handOfLetter(letter) {
  return LEFT_HAND_LETTERS.has(letter) ? "left" : "right";
}

function oppositeHand(hand) {
  return hand === "left" ? "right" : "left";
}

// hand: which hand's key produces this symbol (its own key if unshifted, or
// the base key it's shifted from, e.g. "!" is Shift+1 and "1" is a left-hand key).
// shifted: whether producing it actually requires holding Shift at all.
const SYMBOL_INFO = {
  ".": { hand: "right", shifted: false },
  ",": { hand: "right", shifted: false },
  "'": { hand: "right", shifted: false },
  "-": { hand: "right", shifted: false },
  ";": { hand: "right", shifted: false },
  "!": { hand: "left", shifted: true }, // Shift+1
  "?": { hand: "right", shifted: true }, // Shift+/
  ":": { hand: "right", shifted: true }, // Shift+;
};

function handForSymbol(sym) {
  const info = SYMBOL_INFO[sym];
  return info.shifted ? oppositeHand(info.hand) : info.hand;
}

const CAPITALS_LEFT = "capitals-left";
const CAPITALS_RIGHT = "capitals-right";
const PUNCTUATION_LEFT = "punctuation-left";
const PUNCTUATION_RIGHT = "punctuation-right";
const DIGIT_GROUP = "0-9";

const LETTER_GROUP_MAP = {};
const GROUP_LETTERS = {};
const GROUP_LABELS = {
  [CAPITALS_LEFT]: "Capitals (Left Shift)",
  [CAPITALS_RIGHT]: "Capitals (Right Shift)",
  [PUNCTUATION_LEFT]: "Punctuation (Left Hand)",
  [PUNCTUATION_RIGHT]: "Punctuation (Right Hand)",
  [DIGIT_GROUP]: "0-9",
};
for (const { id, label, stageRange: [start, end] } of ROW_GROUPS) {
  const letters = KEY_STAGES.slice(start, end + 1).flat();
  GROUP_LETTERS[id] = letters;
  GROUP_LABELS[id] = label;
  for (const letter of letters) LETTER_GROUP_MAP[letter] = id;
}

export function groupForChar(ch) {
  const lower = ch.toLowerCase();
  if (ch !== lower) return oppositeHand(handOfLetter(lower)) === "left" ? CAPITALS_LEFT : CAPITALS_RIGHT;
  if (LETTER_GROUP_MAP[lower]) return LETTER_GROUP_MAP[lower];
  if (DIGITS.includes(ch)) return DIGIT_GROUP;
  return handForSymbol(ch) === "left" ? PUNCTUATION_LEFT : PUNCTUATION_RIGHT;
}

export function groupLabel(groupId) {
  return GROUP_LABELS[groupId] ?? groupId;
}

// Capitals and punctuation aren't tied to specific letters, so there's
// nothing to bias word selection toward when those groups are weak — they
// just contribute no extra weighting rather than being treated as an error.
function lettersInGroup(groupId) {
  if (groupId === DIGIT_GROUP) return DIGITS;
  return GROUP_LETTERS[groupId] ?? [];
}

function unlockedGroupsForStage(stageIndex) {
  const groups = new Set(unlockedLettersForStage(stageIndex).map((letter) => LETTER_GROUP_MAP[letter]));
  if (stageIncludesCapitals(stageIndex)) {
    groups.add(CAPITALS_LEFT);
    groups.add(CAPITALS_RIGHT);
  }
  if (stageIncludesNumbers(stageIndex)) groups.add(DIGIT_GROUP);
  if (stageIncludesSymbols(stageIndex)) {
    groups.add(PUNCTUATION_LEFT);
    groups.add(PUNCTUATION_RIGHT);
  }
  return [...groups];
}

const WORD_BANK = Array.from(
  new Set(LESSONS.flatMap((lesson) => lesson.words.map((w) => w.toLowerCase())))
);

// Named jumping-off points for the placement test, roughly in increasing
// difficulty. stageIndex ties each one back into the same stage scale used
// by the adaptive lesson track, so a test result can seed `history` directly.
// The "most of ___" tiers sit right before each row's harder index-finger
// reach pair (g/h, t/y, b/n) unlocks, mirroring KEY_STAGES' own consolidation
// stages, so placement can land just before or after the hardest part of a row.
export const TEST_LEVELS = [
  { id: "few-letters", label: "A few letters", stageIndex: 0 },
  { id: "most-home-row", label: "Most of the home row", stageIndex: 3 },
  { id: "home-row", label: "Home row", stageIndex: 5 },
  { id: "most-top-row", label: "Home row and most of the top row", stageIndex: 9 },
  { id: "home-upper", label: "Home and upper row", stageIndex: 11 },
  { id: "most-letters", label: "Most letters", stageIndex: 14 },
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
  const clamped = Math.max(0, Math.min(stageIndex, STAGE_NAMES.length - 1));
  return STAGE_NAMES[clamped];
}

export function stageKeysHint(stageIndex) {
  const letters = unlockedLettersForStage(stageIndex).join(" ");
  const extras = [];
  if (stageIncludesCapitals(stageIndex)) extras.push("ABC");
  if (stageIncludesNumbers(stageIndex)) extras.push("123");
  if (stageIncludesSymbols(stageIndex)) extras.push("!?.");
  return extras.length > 0 ? `${letters} ${extras.join(" ")}` : letters;
}

export function groupBreakdown(groupStats) {
  return Object.entries(groupStats ?? {})
    .map(([group, { attempts, correct, totalMs = 0, timedAttempts = 0 }]) => ({
      group,
      label: groupLabel(group),
      attempts,
      accuracy: Math.round((correct / attempts) * 100),
      wpm: timedAttempts > 0 ? Math.round(60000 / ((totalMs / timedAttempts) * 5)) : null,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// durationsMs[i], if provided, is how long the keystroke at target[i] took
// (ms since the previous keystroke) — used to build a per-group speed
// reading alongside accuracy. Omitting it (e.g. in tests) just skips speed.
export function getLetterStats(target, typed, durationsMs = []) {
  const stats = {};
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === " ") continue;
    const group = groupForChar(ch);
    if (!stats[group]) stats[group] = { attempts: 0, correct: 0, totalMs: 0, timedAttempts: 0 };
    stats[group].attempts += 1;
    if (typed[i] === ch) stats[group].correct += 1;
    const duration = durationsMs[i];
    if (typeof duration === "number" && duration > 0) {
      stats[group].totalMs += duration;
      stats[group].timedAttempts += 1;
    }
  }
  return stats;
}

export function aggregateHistory(history) {
  const recent = history.slice(-MAX_HISTORY);
  const groupTotals = {};
  let accuracySum = 0;
  let wpmSum = 0;
  for (const entry of recent) {
    accuracySum += entry.accuracy;
    wpmSum += entry.wpm;
    for (const [group, { attempts, correct, totalMs = 0, timedAttempts = 0 }] of Object.entries(
      entry.letterStats ?? {}
    )) {
      if (!groupTotals[group]) groupTotals[group] = { attempts: 0, correct: 0, totalMs: 0, timedAttempts: 0 };
      groupTotals[group].attempts += attempts;
      groupTotals[group].correct += correct;
      groupTotals[group].totalMs += totalMs;
      groupTotals[group].timedAttempts += timedAttempts;
    }
  }
  const count = recent.length;
  return {
    count,
    avgAccuracy: count ? accuracySum / count : null,
    avgWpm: count ? wpmSum / count : null,
    groupTotals,
  };
}

export function weakGroups(
  groupTotals,
  unlockedGroupList,
  { minAttempts = 4, errorRateThreshold = 0.2, max = 3 } = {}
) {
  return unlockedGroupList
    .map((group) => {
      const t = groupTotals[group];
      if (!t || t.attempts < minAttempts) return null;
      const errorRate = 1 - t.correct / t.attempts;
      return errorRate >= errorRateThreshold ? { group, errorRate } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, max)
    .map((entry) => entry.group);
}

// wpmTarget gates advancement deliberately: accuracy alone measures whether a
// kid knows where the letters are, but a kid who already knows the content
// can be accurate while still hunting-and-pecking. Requiring the wpm target
// too means she has to actually build touch-typing speed at a stage before
// more letters unlock, rather than racing through content she already knows.
export function decideNextStage(history, wpmTarget = DEFAULT_WPM_TARGET) {
  if (history.length === 0) return { stageIndex: 0, direction: "start" };

  const baseStage = history[history.length - 1].stageIndex;
  const { avgAccuracy, avgWpm } = aggregateHistory(history);
  const bestWpm = Math.max(...history.map((h) => h.wpm));
  const slowedDown = bestWpm > 0 && avgWpm < bestWpm * SLOWDOWN_RATIO;

  if (avgAccuracy < REGRESS_ACCURACY || (avgAccuracy < HOLD_ACCURACY && slowedDown)) {
    return { stageIndex: Math.max(0, baseStage - 1), direction: "regress" };
  }
  if (avgAccuracy >= ADVANCE_ACCURACY && !slowedDown) {
    if (avgWpm < wpmTarget) return { stageIndex: baseStage, direction: "hold-speed" };
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

export function buildLessonPlan(history, wpmTarget = DEFAULT_WPM_TARGET) {
  const { stageIndex, direction } = decideNextStage(history, wpmTarget);
  const unlockedLetters = unlockedLettersForStage(stageIndex);
  const { groupTotals } = aggregateHistory(history);
  const weak = weakGroups(groupTotals, unlockedGroupsForStage(stageIndex));
  const weakChars = weak.flatMap(lettersInGroup);
  const words = generateRoundWords(stageIndex, weakChars, WORDS_PER_ROUND);
  return {
    stageIndex,
    direction,
    unlockedLetters,
    weakGroups: weak.map(groupLabel),
    label: stageLabel(stageIndex),
    keysHint: stageKeysHint(stageIndex),
    words,
  };
}

export function buildTestRound(stageIndex, count = WORDS_PER_ROUND) {
  return generateRoundWords(stageIndex, [], count);
}

// The floor for "fast enough to pass" a test level is one grade below the
// current speed goal — not the goal itself, since the test is checking
// whether a level is a reasonable starting point, not whether she's already
// hit her long-term target.
export function minWpmForTarget(wpmTarget) {
  const index = GRADE_WPM_TARGETS.findIndex((grade) => grade.wpm === wpmTarget);
  if (index <= 0) return 0;
  return GRADE_WPM_TARGETS[index - 1].wpm;
}

// Mirrors decideNextStage's own accuracy thresholds so a one-off test verdict
// stays consistent with what would happen in ongoing adaptive play, plus a
// wpm floor so a level isn't judged a good fit purely on accurate-but-slow typing.
export function evaluateTestResult(accuracy, wpm, wpmTarget = DEFAULT_WPM_TARGET) {
  const minWpm = minWpmForTarget(wpmTarget);
  if (accuracy < REGRESS_ACCURACY || wpm < minWpm) return "decrease";
  if (accuracy >= ADVANCE_ACCURACY && wpm >= wpmTarget) return "increase";
  return "fit";
}
