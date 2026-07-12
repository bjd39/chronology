import type { Store, DailyResult } from "../types";

const KEY = "chronology-store";

const EMPTY: Store = {
  v: 1,
  daily: {},
  suddenBest: 0,
  suddenGames: 0,
  suddenTotalRounds: 0,
};

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    // corrupted — start fresh
  }
  return { ...EMPTY };
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage unavailable (private mode) — degrade gracefully
  }
}

export function recordDaily(key: string, result: DailyResult): Store {
  const store = loadStore();
  store.daily[key] = result;
  saveStore(store);
  return store;
}

export function recordSuddenDeath(rounds: number): Store {
  const store = loadStore();
  store.suddenGames += 1;
  store.suddenTotalRounds += rounds;
  if (rounds > store.suddenBest) store.suddenBest = rounds;
  saveStore(store);
  return store;
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
