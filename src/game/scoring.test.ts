import { describe, it, expect, beforeEach } from "vitest";
import {
  dailyScore,
  relativeError,
  survives,
  toleranceYears,
  suddenLevel,
  judgedAge,
  yearsAgo,
  SUDDEN_LEVELS,
  DEFAULT_SUDDEN_PCT,
  DAILY_QUESTIONS,
  GRACE_YEARS,
} from "./scoring";
import { EVENTS, dailyEvents, makeDeck, packEvents, difficultyCap } from "./events";
import { THEMES, themePool, themeSize, themeById } from "./themes";
import {
  suddenDeathShareText,
  dailyShareText,
  packShareText,
  packFromUrl,
  scoreSquare,
} from "./share";
import { historyEntries, toGuessRow } from "./history";
import { loadStore, saveStore, recordDaily, recordSuddenDeath, recordPack, MAX_RUN_LOG } from "./storage";
import type { Store, GuessRow } from "../types";

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
    const answer = 1000; // judged as 1051 years old -> ~105 years at 10%
    const allowed = toleranceYears(answer, DEFAULT_SUDDEN_PCT);
    expect(survives(1000 - allowed, answer, DEFAULT_SUDDEN_PCT)).toBe(true);
  });
  it("dies when beyond the tolerance", () => {
    const answer = 2000; // judged as 51 years old -> ~5 year window at 10%
    expect(survives(1990, answer, DEFAULT_SUDDEN_PCT)).toBe(false);
  });
  it("the window it reports is the window it marks against", () => {
    // The reveal tells the player how many years of room they had; if that ever
    // drifted from the rule actually applied, the game would be lying.
    for (const answer of [-2500, -44, 476, 1066, 1500, 1800, 1900, 1969, 2005, 2024]) {
      for (const level of SUDDEN_LEVELS) {
        const allowed = toleranceYears(answer, level.pct);
        expect(survives(answer + allowed, answer, level.pct)).toBe(true);
        expect(survives(answer + allowed + 1, answer, level.pct)).toBe(false);
      }
    }
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

describe("the grace horizon", () => {
  it("judges every event as older than it is, by the grace", () => {
    expect(judgedAge(2024)).toBe(yearsAgo(2024) + GRACE_YEARS);
    expect(judgedAge(-2500)).toBe(yearsAgo(-2500) + GRACE_YEARS);
  });
  it("stops a one-year miss on a recent event being a disaster", () => {
    // The complaint that prompted it: one year out on a 2024 event scored 32.
    expect(dailyScore(2023, 2024)).toBeGreaterThan(85);
    expect(dailyScore(2019, 2020)).toBeGreaterThan(85);
    expect(dailyScore(2024, 2025)).toBeGreaterThan(85);
  });
  it("still punishes being a decade out on a recent event", () => {
    expect(dailyScore(2014, 2024)).toBeLessThan(50);
  });
  it("barely touches the ancient end", () => {
    // The grace is half a percent of a 4,500-year-old event's age, so antiquity
    // must not have got measurably easier.
    for (const [guess, answer] of [
      [-2400, -2500],
      [-400, -500],
      [900, 1066],
    ] as const) {
      const before = Math.abs(guess - answer) / yearsAgo(answer);
      const after = relativeError(guess, answer);
      expect(before - after).toBeLessThan(0.02);
    }
  });
  it("keeps recent events strictly harder than ancient ones", () => {
    // The whole point of relative error: the grace must not invert the ordering.
    const ages = [-2500, -44, 476, 1066, 1500, 1800, 1900, 1969, 2005, 2024];
    const windows = ages.map((y) => toleranceYears(y, DEFAULT_SUDDEN_PCT));
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]).toBeLessThan(windows[i - 1]);
    }
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
    expect(packShareText(THEMES[0], [100, 40, 40, 40, 40], 260)).toContain("🎉");
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

describe("pack deep links", () => {
  it("a shared pack result links back to that pack", () => {
    for (const theme of THEMES) {
      const text = packShareText(theme, [50, 50, 50, 50, 50], 250);
      const url = text.trim().split("\n").pop() as string;
      // the whole point: the link the reader taps reopens the pack that was played
      expect(packFromUrl(url)).toBe(theme.id);
      expect(themeById(packFromUrl(url) as string)?.label).toBe(theme.label);
    }
  });
  it("finds nothing in a plain link, and survives a malformed one", () => {
    expect(packFromUrl("https://bjd39.github.io/chronology/")).toBeNull();
    expect(packFromUrl("https://bjd39.github.io/chronology/?other=1")).toBeNull();
    expect(packFromUrl("not a url at all")).toBeNull();
    expect(packFromUrl("?pack=")).toBeNull();
  });
  it("does not resolve a pack id that no longer exists", () => {
    expect(themeById(packFromUrl("?pack=phlogiston") as string)).toBeNull();
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
  it("every pack can fill each rung of the difficulty ladder", () => {
    // packEvents widens a rung it cannot fill, which silently flattens the
    // easy-to-hard curve. Every pack should be able to serve the real thing.
    for (const theme of THEMES) {
      const difficulties = new Set(themePool(theme.id).map((e) => e.d));
      for (const rung of [[1, 2], [2, 3], [3], [3, 4], [4, 5]]) {
        expect(rung.some((d) => difficulties.has(d))).toBe(true);
      }
    }
  });
  it("the hand-picked pack spans the whole arc it is about", () => {
    // "Explaining the World" is chosen by hand in scripts/packs.tsv rather than
    // by keyword; it is meant to run from antiquity to the present, so a rescrape
    // quietly dropping its ancient half should fail here rather than in play.
    const years = themePool("explaining").map((e) => e.y);
    expect(years.length).toBeGreaterThanOrEqual(50);
    expect(Math.min(...years)).toBeLessThan(-400);
    expect(Math.max(...years)).toBeGreaterThan(1900);
    expect(years.filter((y) => y < 1000).length).toBeGreaterThanOrEqual(10);
    expect(years.filter((y) => y >= 1000 && y < 1800).length).toBeGreaterThanOrEqual(10);
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


describe("history", () => {
  const row = (y: number, g: number, s: number): GuessRow => ({ y, e: `event ${y}`, g, s });
  const store = (over: Partial<Store>): Store => ({
    v: 3,
    daily: {},
    sudden: {},
    packs: {},
    runs: [],
    lastSuddenPct: 10,
    lastTheme: "",
    ...over,
  });
  const label = (id: string) => (id === "rome" ? "Rome & Byzantium" : id);

  it("keeps the answer alongside the guess", () => {
    const g = toGuessRow({
      event: { y: 1066, e: "Battle of Hastings", d: 1, t: [] },
      guess: 1100,
      score: 62,
      relError: 0.03,
    });
    expect(g).toEqual({ y: 1066, e: "Battle of Hastings", g: 1100, s: 62 });
  });

  it("merges dailies and runs, newest first", () => {
    const entries = historyEntries(
      store({
        daily: {
          "2026-08-29": {
            scores: [10, 20, 30, 40, 50],
            total: 150,
            playedAt: "2026-08-29T09:00:00.000Z",
            rounds: [row(1066, 1100, 10)],
          },
        },
        runs: [
          { at: "2026-08-28T09:00:00.000Z", mode: "pack", theme: "rome", total: 300, rounds: [row(-44, -50, 60)] },
          { at: "2026-08-30T09:00:00.000Z", mode: "sudden", theme: "", pct: 5, survived: 7, rounds: [row(1969, 1970, 0)] },
        ],
      }),
      label,
    );
    expect(entries.map((e) => e.mode)).toEqual(["sudden", "daily", "pack"]);
    expect(entries[0].title).toBe("Sudden death · 5%");
    expect(entries[0].result).toBe("7 rounds");
    expect(entries[1].result).toBe("150 / 500");
    expect(entries[2].title).toBe("Rome & Byzantium");
  });

  it("survives a daily saved before rounds were kept", () => {
    const entries = historyEntries(
      store({
        daily: {
          "2026-01-01": { scores: [50, 50, 50, 50, 50], total: 250, playedAt: "2026-01-01T09:00:00.000Z" },
        },
      }),
      label,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].rounds).toEqual([]);
    expect(entries[0].result).toBe("250 / 500");
  });

  it("names a one-round sudden-death run correctly", () => {
    const entries = historyEntries(
      store({
        runs: [{ at: "2026-08-30T09:00:00.000Z", mode: "sudden", theme: "", pct: 25, survived: 1, rounds: [] }],
      }),
      label,
    );
    expect(entries[0].result).toBe("1 round");
  });
});


/** A localStorage good enough to migrate and overflow. */
function fakeStorage(limit = Infinity) {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (v.length > limit) throw new DOMException("quota", "QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

describe("the saved store", () => {
  beforeEach(() => {
    globalThis.localStorage = fakeStorage();
  });

  it("upgrades a v1 store without losing anything", () => {
    // v1 kept one sudden-death record and no run log at all.
    localStorage.setItem(
      "chronology-store",
      JSON.stringify({
        v: 1,
        daily: { "2026-01-01": { scores: [10, 10, 10, 10, 10], total: 50, playedAt: "x" } },
        suddenBest: 9,
        suddenGames: 4,
        suddenTotalRounds: 20,
      }),
    );
    const store = loadStore();
    expect(store.v).toBe(3);
    expect(store.daily["2026-01-01"].total).toBe(50);
    expect(store.sudden["10"]).toEqual({ best: 9, games: 4, total: 20 });
    expect(store.runs).toEqual([]);
  });

  it("round-trips guesses through storage", () => {
    recordDaily("2026-08-30", {
      scores: [90],
      total: 90,
      playedAt: "2026-08-30T09:00:00.000Z",
      rounds: [{ y: 1066, e: "Battle of Hastings", g: 1070, s: 90 }],
    });
    expect(loadStore().daily["2026-08-30"].rounds).toEqual([
      { y: 1066, e: "Battle of Hastings", g: 1070, s: 90 },
    ]);
  });

  it("logs runs from both modes and caps the log", () => {
    recordPack("rome", 300, [{ y: -44, e: "Ides of March", g: -50, s: 60 }]);
    recordSuddenDeath(10, 7, "", [{ y: 1969, e: "Moon landing", g: 1970, s: 80 }]);
    let store = loadStore();
    expect(store.runs.map((r) => r.mode)).toEqual(["pack", "sudden"]);
    expect(store.runs[1].survived).toBe(7);

    for (let i = 0; i < MAX_RUN_LOG + 10; i++) recordPack("rome", i, []);
    store = loadStore();
    expect(store.runs).toHaveLength(MAX_RUN_LOG);
    // the oldest are the ones shed, so the newest write survives
    expect(store.runs[store.runs.length - 1].total).toBe(MAX_RUN_LOG + 9);
  });

  it("sheds history rather than losing the streak when storage is full", () => {
    const store = loadStore();
    store.daily["2026-08-30"] = { scores: [100], total: 100, playedAt: "t" };
    for (let i = 0; i < 50; i++) {
      store.runs.push({
        at: `2026-08-30T00:00:${String(i).padStart(2, "0")}.000Z`,
        mode: "pack",
        theme: "rome",
        total: i,
        rounds: [{ y: 1, e: "x".repeat(200), g: 2, s: 3 }],
      });
    }
    globalThis.localStorage = fakeStorage(2000); // too small for all that history
    saveStore(store);

    const reloaded = loadStore();
    expect(reloaded.daily["2026-08-30"].total).toBe(100); // the part that matters kept
    expect(reloaded.runs.length).toBeLessThan(50); // history shed to make room
  });
});
