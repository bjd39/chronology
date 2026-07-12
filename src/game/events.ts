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

// Events sorted by year, used to build era bands for the daily.
const BY_YEAR = [...EVENTS].sort((a, b) => a.y - b.y);

/**
 * The daily set: one event drawn from each of DAILY_QUESTIONS chronological
 * bands, so every day spans antiquity through the modern era. Deterministic
 * from the date key.
 */
export function dailyEvents(key: string): GameEvent[] {
  const rand = mulberry32(seedFromKey(key));
  const n = BY_YEAR.length;
  const bandSize = n / DAILY_QUESTIONS;
  const picks: GameEvent[] = [];
  for (let i = 0; i < DAILY_QUESTIONS; i++) {
    const start = Math.floor(i * bandSize);
    const end = Math.floor((i + 1) * bandSize);
    const idx = start + Math.floor(rand() * (end - start));
    picks.push(BY_YEAR[idx]);
  }
  return picks;
}

/**
 * An endless deterministic-per-game stream of events for sudden death, avoiding
 * repeats. Difficulty is uniform-random across all eras.
 */
export function makeSuddenDeathDeck(seed: number): () => GameEvent {
  const rand = mulberry32(seed);
  const used = new Set<number>();
  return function next(): GameEvent {
    if (used.size >= EVENTS.length) used.clear();
    let idx = Math.floor(rand() * EVENTS.length);
    while (used.has(idx)) idx = (idx + 1) % EVENTS.length;
    used.add(idx);
    return EVENTS[idx];
  };
}
