import type { Guess, GuessRow, DailyResult, RunLog, Store } from "../types";
import { scoreTitle } from "./titles";

/** Compress an in-play guess down to what is worth keeping on disk. */
export function toGuessRow(g: Guess): GuessRow {
  return { y: g.event.y, e: g.event.e, g: g.guess, s: g.score };
}

/**
 * One line in the history screen. Dailies and runs are stored separately — the
 * daily map is keyed by date and drives the streak, the run log is capped — but
 * the player thinks of them as one list of things they have played, so they are
 * merged for display.
 */
export interface HistoryEntry {
  id: string;
  at: string; // ISO timestamp, for ordering
  mode: "daily" | "pack" | "sudden";
  /** "Daily · 2026-08-30", "Rome & Byzantium", "Sudden death · 10%" */
  title: string;
  /** "371 / 500", "12 rounds" */
  result: string;
  /** The rank the total earned ("Spartan"); absent for sudden death, which is
   *  measured in rounds survived rather than points. */
  badge?: string;
  scores: number[]; // for the dot row; empty when there is nothing to show
  rounds: GuessRow[];
  dailyKey?: string;
}

function dailyEntry(key: string, r: DailyResult): HistoryEntry {
  return {
    id: `daily-${key}`,
    at: r.playedAt || `${key}T12:00:00.000Z`,
    mode: "daily",
    title: `Daily · ${key}`,
    result: `${r.total} / ${r.scores.length * 100}`,
    badge: scoreTitle(r.total),
    scores: r.scores,
    rounds: r.rounds ?? [],
    dailyKey: key,
  };
}

function runEntry(run: RunLog, i: number, themeLabel: (id: string) => string): HistoryEntry {
  const scope = run.theme ? themeLabel(run.theme) : "All of history";
  if (run.mode === "sudden") {
    const n = run.survived ?? 0;
    return {
      id: `run-${i}-${run.at}`,
      at: run.at,
      mode: "sudden",
      title: `Sudden death · ${run.pct}%${run.theme ? ` · ${scope}` : ""}`,
      result: `${n} ${n === 1 ? "round" : "rounds"}`,
      scores: [],
      rounds: run.rounds,
    };
  }
  return {
    id: `run-${i}-${run.at}`,
    at: run.at,
    mode: "pack",
    title: scope,
    result: `${run.total ?? 0} / ${run.rounds.length * 100 || 500}`,
    badge: scoreTitle(run.total ?? 0),
    scores: run.rounds.map((r) => r.s),
    rounds: run.rounds,
  };
}

/** Everything the player has played, newest first. */
export function historyEntries(
  store: Store,
  themeLabel: (id: string) => string,
): HistoryEntry[] {
  const entries = [
    ...Object.entries(store.daily).map(([key, r]) => dailyEntry(key, r)),
    ...store.runs.map((run, i) => runEntry(run, i, themeLabel)),
  ];
  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return entries;
}
