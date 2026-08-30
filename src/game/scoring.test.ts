import { describe, it, expect } from "vitest";
import {
  dailyScore,
  relativeError,
  survives,
  toleranceYears,
  suddenLevel,
  SUDDEN_LEVELS,
  DEFAULT_SUDDEN_PCT,
  DAILY_QUESTIONS,
} from "./scoring";
import { EVENTS, dailyEvents, makeDeck, packEvents, difficultyCap } from "./events";
import { THEMES, themePool, themeSize } from "./themes";
import { suddenDeathShareText, dailyShareText, packShareText, scoreSquare } from "./share";

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
  it("survives at exactly the chosen tolerance", () => {
    const answer = 1000; // 1026 years ago
    const allowed = toleranceYears(answer, DEFAULT_SUDDEN_PCT); // ~102 years
    expect(survives(1000 - allowed, answer, DEFAULT_SUDDEN_PCT)).toBe(true);
  });
  it("dies when beyond the tolerance", () => {
    const answer = 2000; // 26 years ago -> ~2.6 year window at 10%
    expect(survives(1990, answer, DEFAULT_SUDDEN_PCT)).toBe(false);
  });
  it("a wider tolerance forgives a guess a narrower one kills", () => {
    const answer = 1900;
    expect(survives(1880, answer, 2)).toBe(false);
    expect(survives(1880, answer, 25)).toBe(true);
  });
  it("the tolerance window grows with the age of the event", () => {
    expect(toleranceYears(-2000, 10)).toBeGreaterThan(toleranceYears(1990, 10));
  });
  it("every level is a real, distinct percentage", () => {
    const pcts = SUDDEN_LEVELS.map((l) => l.pct);
    expect(new Set(pcts).size).toBe(pcts.length);
    expect(pcts).toContain(DEFAULT_SUDDEN_PCT);
    expect(suddenLevel(DEFAULT_SUDDEN_PCT).pct).toBe(DEFAULT_SUDDEN_PCT);
    expect(suddenLevel(999).pct).toBe(DEFAULT_SUDDEN_PCT); // unknown falls back
  });
});

describe("score squares", () => {
  it("gives a perfect round its own mark", () => {
    expect(scoreSquare(100)).toBe("🎉");
    expect(scoreSquare(99)).toBe("🟩");
  });
  it("steps down through the bands", () => {
    expect([100, 95, 80, 50, 30, 5].map(scoreSquare)).toEqual([
      "🎉", "🟩", "🟨", "🟧", "🟥", "⬛",
    ]);
  });
  it("an exact guess earns it, a miss does not", () => {
    expect(scoreSquare(dailyScore(1066, 1066))).toBe("🎉");
    expect(scoreSquare(dailyScore(1000, 1066))).not.toBe("🎉");
  });
  it("reaches the share text of both scored modes", () => {
    expect(dailyShareText("2026-08-30", [100, 96, 76, 88, 83], 443)).toContain("🎉🟩🟨🟨🟨");
    expect(packShareText("Rome & Byzantium", "🏛️", [100, 40, 40, 40, 40], 260)).toContain("🎉");
  });
});

describe("share text", () => {
  it("quotes the tolerance the run was played at", () => {
    expect(suddenDeathShareText(12, 5)).toContain("Survived 12 rounds at 5%");
  });
  it("names the pack when the run was themed", () => {
    expect(suddenDeathShareText(3, 10, "Rome & Byzantium")).toContain("Rome & Byzantium");
  });
});

describe("corpus", () => {
  it("every event carries a difficulty in 1..5 and a theme list", () => {
    for (const e of EVENTS) {
      expect(e.d).toBeGreaterThanOrEqual(1);
      expect(e.d).toBeLessThanOrEqual(5);
      expect(Array.isArray(e.t)).toBe(true);
    }
  });
  it("no event names its own year", () => {
    // The scraper drops these, but a hand-written rewrite could reintroduce one.
    for (const e of EVENTS) {
      const y = e.y < 0 ? `${-e.y} BC` : String(e.y);
      expect(e.e).not.toContain(y);
    }
  });
});

describe("dailyEvents", () => {
  it("is deterministic for a given day", () => {
    expect(dailyEvents("2026-03-04")).toEqual(dailyEvents("2026-03-04"));
  });
  it("differs between days", () => {
    expect(dailyEvents("2026-03-04")).not.toEqual(dailyEvents("2026-03-05"));
  });
  it("walks up the difficulty ladder", () => {
    for (const key of ["2026-01-01", "2026-06-15", "2027-11-30"]) {
      const picks = dailyEvents(key);
      expect(picks).toHaveLength(DAILY_QUESTIONS);
      expect(picks[0].d).toBeLessThanOrEqual(2);
      expect(picks[DAILY_QUESTIONS - 1].d).toBeGreaterThanOrEqual(4);
      expect(new Set(picks).size).toBe(DAILY_QUESTIONS);
    }
  });
  it("still spans history", () => {
    const years = dailyEvents("2026-04-01").map((e) => e.y);
    expect(Math.min(...years)).toBeLessThan(500);
    expect(Math.max(...years)).toBeGreaterThan(1800);
  });
});

describe("themes", () => {
  it("every pack has enough events to play", () => {
    for (const theme of THEMES) {
      expect(themeSize(theme.id)).toBeGreaterThanOrEqual(DAILY_QUESTIONS * 4);
    }
  });
  it("an unknown id falls back to the whole corpus", () => {
    expect(themeSize("not-a-theme")).toBe(EVENTS.length);
    expect(themeSize("")).toBe(EVENTS.length);
  });
  it("pool members really carry the tag", () => {
    for (const theme of THEMES) {
      for (const e of themePool(theme.id)) expect(e.t).toContain(theme.id);
    }
  });
});

describe("sudden-death deck", () => {
  it("ramps the difficulty ceiling with the round number", () => {
    expect(difficultyCap(0)).toBeLessThan(difficultyCap(20));
    expect(difficultyCap(0)).toBe(2);
    expect(difficultyCap(50)).toBe(5);
  });
  it("respects the ceiling early on and never repeats an event", () => {
    const deck = makeDeck(1234, EVENTS);
    const seen = new Set<string>();
    for (let round = 0; round < 60; round++) {
      const e = deck.next(round);
      expect(e.d).toBeLessThanOrEqual(difficultyCap(round));
      expect(seen.has(e.e)).toBe(false);
      seen.add(e.e);
    }
  });
  it("keeps dealing from a small themed pack without crashing", () => {
    const pool = themePool(THEMES[THEMES.length - 1].id);
    const deck = makeDeck(7, pool);
    for (let round = 0; round < pool.length + 10; round++) {
      expect(deck.next(round)).toBeDefined();
    }
  });
});

describe("packEvents", () => {
  it("deals five distinct events from the pack, easiest first", () => {
    for (const theme of THEMES) {
      const picks = packEvents(themePool(theme.id), 99);
      expect(picks).toHaveLength(DAILY_QUESTIONS);
      expect(new Set(picks).size).toBe(DAILY_QUESTIONS);
      for (const e of picks) expect(e.t).toContain(theme.id);
      expect(picks[0].d).toBeLessThanOrEqual(picks[DAILY_QUESTIONS - 1].d);
    }
  });
});
