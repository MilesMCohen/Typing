import { describe, expect, it } from "vitest";
import { computeAccuracy, computeCharDurations, computeExpectedProgress, computeLeopardProgress, computeWpm, extrapolateTypedLength, getCharStatuses } from "./typing.js";

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

describe("computeLeopardProgress", () => {
  it("is 0 before any characters are typed", () => {
    expect(computeLeopardProgress(0, 25, 0, 10)).toBe(0);
  });

  it("falls back to plain completion fraction when there's no wpm target", () => {
    expect(computeLeopardProgress(10, 25, 12, null)).toBe(10 / 25);
  });

  it("reaches exactly 1 (catches the prey) when typed at exactly the target pace", () => {
    // 25 chars = 5 words; at 10 wpm that's 30s.
    expect(computeLeopardProgress(25, 25, 30, 10)).toBe(1);
  });

  it("caps at 1 (still catches the prey) when typed faster than the target pace", () => {
    expect(computeLeopardProgress(25, 25, 15, 10)).toBe(1);
  });

  it("falls short of 1 when typed slower than the target pace", () => {
    expect(computeLeopardProgress(25, 25, 60, 10)).toBe(0.5);
  });

  it("scales down mid-round progress by how far behind pace the typist currently is", () => {
    // Same 2x-too-slow pace as above, but only 40% of the text typed so far.
    expect(computeLeopardProgress(10, 25, 24, 10)).toBeCloseTo(0.4 * 0.5);
  });
});

describe("computeExpectedProgress", () => {
  it("is 0 with no elapsed time", () => {
    expect(computeExpectedProgress(0, 25, 10)).toBe(0);
  });

  it("reaches exactly 1 once the target-pace time for the whole text has elapsed", () => {
    // 25 chars = 5 words; at 10 wpm that's 30s.
    expect(computeExpectedProgress(30, 25, 10)).toBe(1);
  });

  it("is halfway once half the target-pace time has elapsed", () => {
    expect(computeExpectedProgress(15, 25, 10)).toBe(0.5);
  });

  it("caps at 1 once more than the target-pace time has elapsed", () => {
    expect(computeExpectedProgress(60, 25, 10)).toBe(1);
  });
});

describe("extrapolateTypedLength", () => {
  it("is 0 before any characters are typed", () => {
    expect(extrapolateTypedLength(0, 0, 5, 25)).toBe(0);
  });

  it("matches the known typed length exactly at the known moment", () => {
    expect(extrapolateTypedLength(10, 10, 10, 25)).toBe(10);
  });

  it("guesses further ahead by continuing the average pace observed so far", () => {
    // 10 chars in 10s = 1 char/s; 5 more seconds should guess 5 more chars.
    expect(extrapolateTypedLength(10, 10, 15, 25)).toBe(15);
  });

  it("caps the guess at the target length", () => {
    expect(extrapolateTypedLength(10, 10, 100, 25)).toBe(25);
  });

  it("clamps the pace estimate's time divisor so an instant first keystroke doesn't guess wildly high", () => {
    // 5 chars at t=0 would be an infinite rate without the 0.1s floor.
    expect(extrapolateTypedLength(5, 0, 0.2, 25)).toBe(Math.min(25, 5 + (5 / 0.1) * 0.2));
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
