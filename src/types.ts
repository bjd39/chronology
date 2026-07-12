// A historical event. `y` is the signed year: AD is positive, BC is negative
// (e.g. 44 BC is stored as -44). There is no year 0 — the small discontinuity
// at the BC/AD boundary is irrelevant to gameplay.
export interface GameEvent {
  y: number;
  e: string;
}

// One answered question within a round.
export interface Guess {
  event: GameEvent;
  guess: number; // signed year the player entered
  score: number; // 0..100 (daily scoring)
  relError: number; // relative "how long ago" error
}

// A completed daily result, stored per calendar day.
export interface DailyResult {
  scores: number[]; // one per question
  total: number;
  playedAt: string; // ISO timestamp
}

export interface Store {
  v: number;
  daily: Record<string, DailyResult>; // key: YYYY-MM-DD
  suddenBest: number;
  suddenGames: number;
  suddenTotalRounds: number;
}
