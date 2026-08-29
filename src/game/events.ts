import raw from "../data/events.json";
import type { GameEvent } from "../types";
import { DAILY_QUESTIONS } from "./scoring";

export const EVENTS: GameEvent[] = raw as GameEvent[];

// --- Deterministic PRNG (mulberry32) so the daily is identical for everyone ---

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer seed from a YYYY-MM-DD daily key. */
function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31) >>> 0;
}

// Events sorted by year, used to build era bands for the daily.
const BY_YEAR = [...EVENTS].sort((a, b) => a.y - b.y);

/**
 * The difficulty ladder for a daily round: one rung per question, from a gentle
 * opener to a specialist closer. The corpus averages 3.65 out of 5, so sampling
 * a band uniformly makes almost every question a hard one; stratifying on
 * difficulty as well as era is what keeps a daily playable.
 */
const DAILY_LADDER: number[][] = [[1, 2], [2, 3], [3], [3, 4], [4, 5]];

function pick<T>(rand: () => number, xs: T[]): T {
  return xs[Math.floor(rand() * xs.length)];
}

/** Shuffle in place (Fisher–Yates) using the supplied PRNG. */
function shuffle<T>(rand: () => number, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/**
 * The daily set: DAILY_QUESTIONS events, one drawn from each chronological band
 * so the day spans antiquity to the present, and one from each rung of the
 * difficulty ladder so it opens gently and ends hard. Which band supplies which
 * rung varies by day; the questions are then served easiest first.
 * Deterministic from the date key.
 */
export function dailyEvents(key: string): GameEvent[] {
  const rand = mulberry32(seedFromKey(key));
  const bandSize = BY_YEAR.length / DAILY_QUESTIONS;
  const bands: GameEvent[][] = [];
  for (let i = 0; i < DAILY_QUESTIONS; i++) {
    bands.push(BY_YEAR.slice(Math.floor(i * bandSize), Math.floor((i + 1) * bandSize)));
  }

  // Rung i is served by band order[i]; each band supplies exactly one question.
  const order = shuffle(rand, [...bands.keys()]);
  return DAILY_LADDER.map((rung, i) => {
    const band = bands[order[i]];
    const matching = band.filter((e) => rung.includes(e.d));
    return pick(rand, matching.length > 0 ? matching : band);
  });
}

/**
 * Sudden death gets harder as the run goes on: the first few rounds are drawn
 * from the events almost anyone can place, and the ceiling lifts from there. A
 * run therefore ends when the player runs out of knowledge rather than luck.
 */
export function difficultyCap(round: number): number {
  if (round < 3) return 2;
  if (round < 7) return 3;
  if (round < 12) return 4;
  return 5;
}

export interface Deck {
  /** The next unseen event at or below the round's difficulty ceiling. */
  next: (round: number) => GameEvent;
}

/**
 * An endless deterministic-per-game stream drawn from `pool`, avoiding repeats
 * until the pool is exhausted.
 */
export function makeDeck(seed: number, pool: GameEvent[]): Deck {
  const rand = mulberry32(seed);
  const used = new Set<number>();

  return {
    next(round: number): GameEvent {
      if (used.size >= pool.length) used.clear();
      const cap = difficultyCap(round);
      // Widen the ceiling if this pool has nothing left that easy — small themed
      // packs can run dry at the bottom of the ladder long before the top.
      for (let ceiling = cap; ceiling <= 5; ceiling++) {
        const candidates: number[] = [];
        for (let i = 0; i < pool.length; i++) {
          if (!used.has(i) && pool[i].d <= ceiling) candidates.push(i);
        }
        if (candidates.length > 0) {
          const idx = pick(rand, candidates);
          used.add(idx);
          return pool[idx];
        }
      }
      // Unreachable while the pool is non-empty, but keep the types honest.
      used.clear();
      return pool[Math.floor(rand() * pool.length)];
    },
  };
}

/**
 * A one-off round of DAILY_QUESTIONS events from a themed pack, on the same
 * difficulty ladder as the daily. Not deterministic — packs are replayable.
 */
export function packEvents(pool: GameEvent[], seed: number): GameEvent[] {
  const rand = mulberry32(seed);
  const chosen: GameEvent[] = [];
  const used = new Set<GameEvent>();
  for (const rung of DAILY_LADDER) {
    let candidates = pool.filter((e) => rung.includes(e.d) && !used.has(e));
    if (candidates.length === 0) candidates = pool.filter((e) => !used.has(e));
    if (candidates.length === 0) candidates = pool;
    const chosenEvent = pick(rand, candidates);
    used.add(chosenEvent);
    chosen.push(chosenEvent);
  }
  return chosen;
}
