export function getCharStatuses(target, typed) {
  return target.split("").map((char, i) => {
    if (i < typed.length) return typed[i] === char ? "correct" : "incorrect";
    if (i === typed.length) return "current";
    return "pending";
  });
}

export function computeAccuracy(target, typed) {
  let correct = 0;
  for (let i = 0; i < target.length; i++) {
    if (typed[i] === target[i]) correct++;
  }
  return Math.round((correct / target.length) * 100);
}

export function computeWpm(charCount, elapsedSeconds) {
  const minutes = Math.max(elapsedSeconds, 0.1) / 60;
  return Math.round(charCount / 5 / minutes);
}

// timestamps[i] is the ms-since-epoch when the character at index i was
// typed; returns how long each keystroke took (ms since the previous one,
// or since startTime for the first character).
export function computeCharDurations(timestamps, startTime) {
  return timestamps.map((t, i) => t - (i === 0 ? startTime : timestamps[i - 1]));
}

// Drives the snow leopard's in-round position: scales how far through the
// text the typist is by how their current pace compares to the target wpm,
// so the leopard visibly lags when typing slower than target and tracks
// completion 1:1 once pace is at or above target. This keeps the endpoint
// (typedLength === targetLength) equal to min(1, finalWpm / wpmTarget) —
// exactly 1 (reaching the peak) only if the round was typed at goal pace.
export function computeLeopardProgress(typedLength, targetLength, elapsedSeconds, wpmTarget) {
  if (targetLength === 0 || typedLength === 0) return 0;
  const charsTypedFraction = typedLength / targetLength;
  if (!wpmTarget) return charsTypedFraction;
  const currentWpm = computeWpm(typedLength, elapsedSeconds);
  return charsTypedFraction * Math.min(1, currentWpm / wpmTarget);
}

// Drives the prey animal: unlike the leopard, it isn't tied to what's been
// typed at all — it simply runs the whole text length at a constant
// wpmTarget pace, so its position is a live "if you were exactly on goal
// pace" marker the leopard can be measured against.
export function computeExpectedProgress(elapsedSeconds, targetLength, wpmTarget) {
  if (!wpmTarget || targetLength === 0) return 0;
  const expectedSeconds = ((targetLength / 5) / wpmTarget) * 60;
  return Math.min(1, elapsedSeconds / expectedSeconds);
}

// React only re-renders (and hands the leopard a fresh typedLength) on
// keystrokes, which produces a stair-step animation at slow typing speeds —
// long flat pauses followed by a jump. This dead-reckons how much would
// probably be typed by time `t` (seconds since the round started) by
// continuing at the average pace observed as of the last real keystroke
// (`knownTypedLength` at `knownElapsedSeconds`), so the leopard can be
// redrawn smoothly on every animation frame instead of only on keystrokes.
// It self-corrects: each new keystroke re-anchors the guess to reality.
export function extrapolateTypedLength(knownTypedLength, knownElapsedSeconds, t, targetLength) {
  if (knownTypedLength === 0) return 0;
  const rate = knownTypedLength / Math.max(knownElapsedSeconds, 0.1);
  const guess = knownTypedLength + rate * Math.max(0, t - knownElapsedSeconds);
  return Math.min(targetLength, guess);
}
