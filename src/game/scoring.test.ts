import { describe, it, expect } from "vitest";
import { dailyScore, relativeError, survives, SUDDEN_DEATH_THRESHOLD } from "./scoring";

describe("relativeError", () => {
  it("is zero for a perfect guess", () => {
    expect(relativeError(1492, 1492)).toBe(0);
  });
  it("scales by how long ago (recent events are unforgiving)", () => {
    // 50 years off on a ~36-years-ago event is a huge relative error...
    const recent = relativeError(1940, 1990);
    // ...but 50 years off on a ~2500-years-ago event is tiny.
    const ancient = relativeError(-450, -500);
    expect(recent).toBeGreaterThan(ancient);
  });
});

describe("dailyScore", () => {
  it("gives 100 for an exact guess", () => {
    expect(dailyScore(1969, 1969)).toBe(100);
  });
  it("is bounded to [0, 100]", () => {
    expect(dailyScore(2025, -2000)).toBeGreaterThanOrEqual(0);
    expect(dailyScore(2025, -2000)).toBeLessThanOrEqual(100);
  });
  it("rewards closer guesses more", () => {
    expect(dailyScore(1490, 1492)).toBeGreaterThan(dailyScore(1400, 1492));
  });
});

describe("survives (sudden death)", () => {
  it("survives at exactly the threshold", () => {
    const answer = 1000; // 1026 years ago
    const allowed = Math.floor(1026 * SUDDEN_DEATH_THRESHOLD); // ~102 years
    expect(survives(1000 - allowed, answer)).toBe(true);
  });
  it("dies when beyond the threshold", () => {
    const answer = 2000; // 26 years ago -> ~2.6 year tolerance
    expect(survives(1990, answer)).toBe(false);
  });
});
