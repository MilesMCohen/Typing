import { describe, expect, it } from "vitest";
import { hash, jitter, buildCrags, leopardPosition } from "./terrain.js";

describe("hash/jitter", () => {
  it("is deterministic for the same input", () => {
    expect(hash(5)).toBe(hash(5));
    expect(jitter(5, 10)).toBe(jitter(5, 10));
  });

  it("keeps jitter within +/- amount/2", () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(jitter(i, 10))).toBeLessThanOrEqual(5);
    }
  });
});

describe("buildCrags", () => {
  const crags = buildCrags(9);

  it("returns the requested number of crags", () => {
    expect(crags).toHaveLength(9);
  });

  it("places the first crag near the ground and the last as the tallest peak", () => {
    const ys = crags.map((c) => c.y);
    expect(crags[0].y).toBeGreaterThan(140);
    expect(Math.min(...ys)).toBe(crags[crags.length - 1].y);
  });

  it("advances worldX monotonically so the camera always scrolls forward", () => {
    for (let i = 1; i < crags.length; i++) {
      expect(crags[i].worldX).toBeGreaterThan(crags[i - 1].worldX);
    }
  });

  it("is deterministic across calls", () => {
    expect(buildCrags(9)).toEqual(crags);
  });

  it("shares the start and peak crag with a differently-seeded track, but not the middle", () => {
    const seeded = buildCrags(9, 1000);
    expect(seeded[0]).toEqual(crags[0]);
    expect(seeded[seeded.length - 1]).toEqual(crags[crags.length - 1]);
    const middleDiffers = seeded.slice(1, -1).some((c, i) => c.worldX !== crags[i + 1].worldX || c.y !== crags[i + 1].y);
    expect(middleDiffers).toBe(true);
  });
});

describe("leopardPosition", () => {
  const crags = buildCrags(9);

  it("sits exactly on the first crag at progress 0", () => {
    const pos = leopardPosition(crags, 0);
    expect(pos.worldX).toBeCloseTo(crags[0].worldX);
    expect(pos.y).toBeCloseTo(crags[0].y);
  });

  it("sits exactly on the last crag at progress 1", () => {
    const pos = leopardPosition(crags, 1);
    expect(pos.worldX).toBeCloseTo(crags[crags.length - 1].worldX);
    expect(pos.y).toBeCloseTo(crags[crags.length - 1].y);
  });

  it("arcs upward (smaller y) mid-jump relative to a straight line between crags", () => {
    const segments = crags.length - 1;
    const midProgress = 0.5 / segments; // midpoint of the first segment
    const straightLineY = (crags[0].y + crags[1].y) / 2;
    const pos = leopardPosition(crags, midProgress);
    expect(pos.y).toBeLessThan(straightLineY);
  });

  it("clamps out-of-range progress to the start and end crags", () => {
    expect(leopardPosition(crags, -1)).toEqual(leopardPosition(crags, 0));
    expect(leopardPosition(crags, 2)).toEqual(leopardPosition(crags, 1));
  });

  it("advances worldX monotonically as progress increases", () => {
    let prevX = -Infinity;
    for (let p = 0; p <= 1; p += 0.05) {
      const { worldX } = leopardPosition(crags, p);
      expect(worldX).toBeGreaterThanOrEqual(prevX);
      prevX = worldX;
    }
  });
});
