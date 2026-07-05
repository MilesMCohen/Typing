import { describe, expect, it } from "vitest";
import { LESSONS, randomWords } from "./lessons.js";

describe("LESSONS", () => {
  it("each lesson has an id, label, and a non-empty word list", () => {
    for (const lesson of LESSONS) {
      expect(lesson.id).toBeTruthy();
      expect(lesson.label).toBeTruthy();
      expect(lesson.words.length).toBeGreaterThan(0);
    }
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
