export const LESSONS = [
  {
    id: "home",
    label: "Home Row",
    keysHint: "a s d f g h j k l",
    words: [
      "add", "ads", "alas", "all", "ask", "dad", "dads", "fall", "flag",
      "flask", "gal", "gals", "gas", "gash", "glad", "glass", "hall", "half",
      "has", "had", "lad", "lag", "lash", "sad", "salad", "sag", "flash", "hash",
    ],
  },
  {
    id: "upper",
    label: "Upper Row",
    keysHint: "adds q w e r t y u i o p",
    words: [
      "the", "is", "it", "at", "of", "to", "you", "day", "play", "stay",
      "read", "help", "look", "good", "like", "kite", "lake", "gate", "desk",
      "list", "soap", "toad", "tiger", "eagle", "lego", "quiet", "pretty",
      "sleepy", "silly", "purple", "turtle", "otter", "jelly", "puppy",
      "potato", "letter",
    ],
  },
  {
    id: "full",
    label: "Full Keyboard",
    keysHint: "adds z x c v b n m",
    words: [
      "zebra", "fox", "cat", "dog", "bird", "fish", "frog", "bunny", "monkey",
      "van", "box", "exit", "next", "mix", "fix", "brave", "cave", "move",
      "give", "name", "many", "nice", "cozy", "buzz", "jazz", "fuzzy",
      "cactus", "circus", "picnic", "magic", "music", "exact", "mixed",
      "brown", "clown", "crown", "candy", "bench", "branch", "crunch",
    ],
  },
];

export const WORDS_PER_LINE = 8;
export const LINES_PER_ROUND = 3;
export const WORDS_PER_ROUND = WORDS_PER_LINE * LINES_PER_ROUND;

// Splits a flat list of words into { start, end } character offsets into
// `words.join(" ")`, grouping wordsPerLine words per row for display. Each
// row's end absorbs the separator space before the next row, so every
// character of the joined string belongs to exactly one row.
export function splitIntoLines(words, wordsPerLine) {
  let offset = 0;
  const rows = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    const group = words.slice(i, i + wordsPerLine);
    const isLastGroup = i + wordsPerLine >= words.length;
    const start = offset;
    let end = start + group.join(" ").length;
    if (!isLastGroup) end += 1;
    rows.push({ start, end });
    offset = end;
  }
  return rows;
}

export function randomWords(words, count) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  if (shuffled.length >= count) return shuffled.slice(0, count);
  const result = [...shuffled];
  while (result.length < count) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result;
}
