import { describe, expect, it } from "vitest";
import { WORD_BANK, randomWords, splitIntoLines } from "./lessons.js";

describe("WORD_BANK", () => {
  it("is a large, non-empty bank", () => {
    expect(WORD_BANK.length).toBeGreaterThan(300);
  });

  it("contains only lowercase a-z words of at least two letters", () => {
    for (const word of WORD_BANK) expect(word).toMatch(/^[a-z]{2,}$/);
  });

  it("has no duplicate entries", () => {
    expect(new Set(WORD_BANK).size).toBe(WORD_BANK.length);
  });
});

describe("randomWords", () => {
  const words = ["a", "b", "c", "d", "e"];

  it("returns the requested count when the list is large enough", () => {
    const result = randomWords(words, 3);
    expect(result).toHaveLength(3);
    for (const word of result) expect(words).toContain(word);
  });

  it("returns unique words when count is within the list size", () => {
    const result = randomWords(words, words.length);
    expect(new Set(result).size).toBe(words.length);
  });

  it("allows repeats when count exceeds the list size", () => {
    const result = randomWords(words, 8);
    expect(result).toHaveLength(8);
    for (const word of result) expect(words).toContain(word);
  });
});

describe("splitIntoLines", () => {
  const words = ["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj"];
  const target = words.join(" ");

  it("covers every character of the joined string exactly once, in order", () => {
    const lines = splitIntoLines(words, 4);
    expect(lines[0].start).toBe(0);
    expect(lines[lines.length - 1].end).toBe(target.length);
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].start).toBe(lines[i - 1].end);
    }
  });

  it("groups the requested number of words per line", () => {
    const lines = splitIntoLines(words, 4);
    expect(lines).toHaveLength(3); // 4 + 4 + 2 words
    const firstLineText = target.slice(lines[0].start, lines[0].end);
    expect(firstLineText).toBe("aa bb cc dd "); // trailing separator space absorbed
  });

  it("does not absorb a trailing separator space after the last line", () => {
    const lines = splitIntoLines(words, 4);
    const lastLineText = target.slice(lines[lines.length - 1].start, lines[lines.length - 1].end);
    expect(lastLineText).toBe("ii jj");
  });

  it("handles a word count that divides evenly with no remainder line", () => {
    const lines = splitIntoLines(words, 5);
    expect(lines).toHaveLength(2);
  });
});
