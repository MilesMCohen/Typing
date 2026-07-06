import { describe, expect, it } from "vitest";
import { computeAccuracy, computeCharDurations, computeWpm, getCharStatuses } from "./typing.js";

describe("getCharStatuses", () => {
  it("marks fully typed correct text as correct", () => {
    expect(getCharStatuses("cat", "cat")).toEqual(["correct", "correct", "correct"]);
  });

  it("marks a mistyped character as incorrect", () => {
    expect(getCharStatuses("cat", "cx")).toEqual(["correct", "incorrect", "current"]);
  });

  it("marks the next character to type as current and the rest pending", () => {
    expect(getCharStatuses("cat", "c")).toEqual(["correct", "current", "pending"]);
  });

  it("marks everything pending/current before typing starts", () => {
    expect(getCharStatuses("cat", "")).toEqual(["current", "pending", "pending"]);
  });
});

describe("computeAccuracy", () => {
  it("is 100 when every character matches", () => {
    expect(computeAccuracy("cat", "cat")).toBe(100);
  });

  it("is 0 when no characters match", () => {
    expect(computeAccuracy("cat", "xyz")).toBe(0);
  });

  it("rounds partial accuracy to the nearest percent", () => {
    expect(computeAccuracy("cats", "cxts")).toBe(75);
  });
});

describe("computeWpm", () => {
  it("computes standard 5-chars-per-word wpm", () => {
    expect(computeWpm(25, 60)).toBe(5);
    expect(computeWpm(50, 30)).toBe(20);
  });

  it("clamps elapsed time so instant completion doesn't divide by zero", () => {
    expect(computeWpm(25, 0)).toBe(Math.round(25 / 5 / (0.1 / 60)));
  });
});

describe("computeCharDurations", () => {
  it("measures each keystroke against the one before it, and the first against the start time", () => {
    expect(computeCharDurations([1200, 1350, 1400], 1000)).toEqual([200, 150, 50]);
  });

  it("returns an empty list when nothing was typed", () => {
    expect(computeCharDurations([], 1000)).toEqual([]);
  });
});
