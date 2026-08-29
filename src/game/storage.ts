import type { Store, DailyResult, RunRecord } from "../types";
import { DEFAULT_SUDDEN_PCT } from "./scoring";

const KEY = "chronology-store";

const EMPTY: Store = {
  v: 2,
  daily: {},
  sudden: {},
  packs: {},
  lastSuddenPct: DEFAULT_SUDDEN_PCT,
  lastTheme: "",
};

// v1 kept a single sudden-death record, from before tolerance was selectable.
interface StoreV1 {
  suddenBest?: number;
  suddenGames?: number;
  suddenTotalRounds?: number;
}

function migrate(raw: Store & StoreV1): Store {
  const store: Store = { ...EMPTY, ...raw, v: EMPTY.v };
  store.daily = raw.daily ?? {};
  store.sudden = raw.sudden ?? {};
  store.packs = raw.packs ?? {};
  // Old runs were all played at the 10% tolerance — file them under that level.
  if (raw.suddenGames && !store.sudden[String(DEFAULT_SUDDEN_PCT)]) {
    store.sudden[String(DEFAULT_SUDDEN_PCT)] = {
      best: raw.suddenBest ?? 0,
      games: raw.suddenGames,
      total: raw.suddenTotalRounds ?? 0,
    };
  }
  return store;
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // corrupted — start fresh
  }
  return { ...EMPTY, daily: {}, sudden: {}, packs: {} };
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage unavailable (private mode) — degrade gracefully
  }
}

export const EMPTY_RECORD: RunRecord = { best: 0, games: 0, total: 0 };

export function recordOf(bucket: Record<string, RunRecord>, key: string): RunRecord {
  return bucket[key] ?? EMPTY_RECORD;
}

/** Mean rounds/points per game, or "—" when the bucket is empty. */
export function averageOf(record: RunRecord): string {
  return record.games > 0 ? (record.total / record.games).toFixed(1) : "—";
}

export function recordDaily(key: string, result: DailyResult): Store {
  const store = loadStore();
  store.daily[key] = result;
  saveStore(store);
  return store;
}

function tally(bucket: Record<string, RunRecord>, key: string, value: number): void {
  const cur = bucket[key] ?? { best: 0, games: 0, total: 0 };
  bucket[key] = {
    best: Math.max(cur.best, value),
    games: cur.games + 1,
    total: cur.total + value,
  };
}

/** Record a finished sudden-death run at a given tolerance. */
export function recordSuddenDeath(pct: number, rounds: number): Store {
  const store = loadStore();
  tally(store.sudden, String(pct), rounds);
  store.lastSuddenPct = pct;
  saveStore(store);
  return store;
}

/** Record a finished themed pack (score out of MAX_DAILY_SCORE). */
export function recordPack(themeId: string, score: number): Store {
  const store = loadStore();
  tally(store.packs, themeId, score);
  store.lastTheme = themeId;
  saveStore(store);
  return store;
}

export function rememberSuddenPct(pct: number): void {
  const store = loadStore();
  store.lastSuddenPct = pct;
  saveStore(store);
}

// --- Derived stats ---

export interface DailyStats {
  played: number;
  averageTotal: number;
  bestTotal: number;
  currentStreak: number;
  maxStreak: number;
}

function prevKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function dailyStats(store: Store, todayKey: string): DailyStats {
  const keys = Object.keys(store.daily).sort();
  const played = keys.length;
  if (played === 0) {
    return { played: 0, averageTotal: 0, bestTotal: 0, currentStreak: 0, maxStreak: 0 };
  }
  let sum = 0;
  let best = 0;
  for (const k of keys) {
    sum += store.daily[k].total;
    best = Math.max(best, store.daily[k].total);
  }

  // max streak across all history
  const set = new Set(keys);
  let maxStreak = 0;
  for (const k of keys) {
    if (set.has(prevKey(k))) continue; // not a run start
    let len = 0;
    let cur = k;
    while (set.has(cur)) {
      len++;
      // advance forward
      const [y, m, d] = cur.split("-").map(Number);
      const nd = new Date(y, m - 1, d);
      nd.setDate(nd.getDate() + 1);
      cur = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`;
    }
    maxStreak = Math.max(maxStreak, len);
  }

  // current streak ending today (or yesterday if today not yet played)
  let currentStreak = 0;
  let cur = set.has(todayKey) ? todayKey : prevKey(todayKey);
  while (set.has(cur)) {
    currentStreak++;
    cur = prevKey(cur);
  }

  return {
    played,
    averageTotal: Math.round(sum / played),
    bestTotal: best,
    currentStreak,
    maxStreak,
  };
}

/** The player's best sudden-death run at any tolerance, for the home screen. */
export function bestSuddenRun(store: Store): { pct: number; rounds: number } | null {
  let bestPct = 0;
  let bestRounds = 0;
  for (const [pct, rec] of Object.entries(store.sudden)) {
    if (rec.best > bestRounds) {
      bestRounds = rec.best;
      bestPct = Number(pct);
    }
  }
  return bestRounds > 0 ? { pct: bestPct, rounds: bestRounds } : null;
}
