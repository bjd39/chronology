// A historical event. `y` is the signed year: AD is positive, BC is negative
// (e.g. 44 BC is stored as -44). There is no year 0 — the small discontinuity
// at the BC/AD boundary is irrelevant to gameplay.
export interface GameEvent {
  y: number;
  e: string;
  /** Difficulty 1 (iconic) .. 5 (specialist). See scripts/curate.py. */
  d: number;
  /** Theme pack ids this event belongs to (may be empty). */
  t: string[];
}

// One answered question within a round.
export interface Guess {
  event: GameEvent;
  guess: number; // signed year the player entered
  score: number; // 0..100 (daily scoring)
  relError: number; // relative "how long ago" error
}

/**
 * One answered question as it is kept on disk. Short keys because these are the
 * bulk of the saved store, and it holds the event's own text rather than an index
 * into the corpus — the corpus is rebuilt and reordered, and a history that
 * silently repointed at different events would be worse than no history.
 */
export interface GuessRow {
  y: number; // the answer: the event's signed year
  e: string; // the event, as it was asked
  g: number; // the year guessed
  s: number; // the score awarded
}

// A completed daily result, stored per calendar day.
export interface DailyResult {
  scores: number[]; // one per question
  total: number;
  playedAt: string; // ISO timestamp
  /** Absent on results saved before rounds were kept (store v2 and earlier). */
  rounds?: GuessRow[];
}

/**
 * A finished sudden-death run or themed pack, kept in a capped log. The daily
 * lives in its own map instead, keyed by date, because streaks are computed from
 * it and it must never be trimmed away.
 */
export interface RunLog {
  at: string; // ISO timestamp
  mode: "sudden" | "pack";
  theme: string; // theme id, or "" for all of history
  pct?: number; // sudden death only: the tolerance played at
  survived?: number; // sudden death only: rounds survived
  total?: number; // pack only: score out of MAX_DAILY_SCORE
  /** The five questions for a pack; the fatal one for sudden death. */
  rounds: GuessRow[];
}

// Aggregate record for one sudden-death tolerance, or one theme pack.
export interface RunRecord {
  best: number;
  games: number;
  total: number; // summed rounds survived / points scored, for the average
}

export interface Store {
  v: number;
  daily: Record<string, DailyResult>; // key: YYYY-MM-DD
  sudden: Record<string, RunRecord>; // key: tolerance percent, e.g. "10"
  packs: Record<string, RunRecord>; // key: theme id
  runs: RunLog[]; // oldest first, capped at MAX_RUN_LOG
  lastSuddenPct: number;
  lastTheme: string; // theme id, or "" for all of history
}
