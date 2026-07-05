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
