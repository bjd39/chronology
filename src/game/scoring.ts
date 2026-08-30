// Scoring is framed as "how long ago did this happen?". A guess is judged by its
// RELATIVE error on that quantity, so getting a recent event a few years off is
// penalised like getting an ancient event a few centuries off. This keeps every
// era equally fair.

// Reference "present" year used for the how-long-ago calculation.
export const REF_YEAR = 2026;

/**
 * Years added to every event's age before the relative error is taken.
 *
 * Pure relative error falls apart at the recent end, because the denominator
 * vanishes: a 2024 event is only two years old, so being a single year out is a
 * 50% error and used to score 32. Nobody can date last year's news to the year,
 * and being one year out is a good guess whatever the era — so every event is
 * judged as though it were this much older than it is.
 *
 * The grace is additive rather than a floor so there is one rule everywhere and
 * no kink in the curve. It matters in inverse proportion to age: it is most of
 * the denominator for something from the 2010s, a fifth of it for 1900, and
 * half a percent of it for 2500 BC, which is left effectively untouched.
 */
export const GRACE_YEARS = 25;

// Logistic spread for the daily score. Smaller = harsher. At this spread a guess
// within ~15% of the true "how long ago" scores ~75, and within ~30% scores ~55.
export const DAILY_SPREAD = 0.3;

export const DAILY_QUESTIONS = 5;
export const MAX_DAILY_SCORE = DAILY_QUESTIONS * 100;

/**
 * Sudden death tolerance. A run ends the first time a guess misses by more than
 * the chosen relative error, so a smaller percentage is a harder game. The
 * percentage is part of the result — "12 rounds at 5%" is a very different claim
 * from "12 rounds at 20%" — so it is shown in the UI and in the share text.
 */
export interface SuddenLevel {
  pct: number; // whole percent; also the stable storage key (String(pct))
  label: string;
  blurb: string;
}

export const SUDDEN_LEVELS: SuddenLevel[] = [
  { pct: 25, label: "Gentle", blurb: "Room to be roughly right." },
  { pct: 15, label: "Relaxed", blurb: "A comfortable margin." },
  { pct: 10, label: "Standard", blurb: "The classic run." },
  { pct: 5, label: "Hard", blurb: "Close enough won't cut it." },
  { pct: 2, label: "Brutal", blurb: "Near-exact years only." },
];

export const DEFAULT_SUDDEN_PCT = 10;

export function suddenLevel(pct: number): SuddenLevel {
  return SUDDEN_LEVELS.find((l) => l.pct === pct) ?? SUDDEN_LEVELS[2];
}

/** Years before the reference present. Always >= 1 for our historical events. */
export function yearsAgo(signedYear: number): number {
  return REF_YEAR - signedYear;
}

/**
 * The age an event is actually judged against: how long ago it happened, plus
 * the grace. Everything that divides by an event's age goes through here, so the
 * window the player is told about and the window they are marked against cannot
 * drift apart.
 */
export function judgedAge(answer: number): number {
  return Math.max(yearsAgo(answer) + GRACE_YEARS, 1);
}

/** Relative error of a guess, measured on the "how long ago" scale. */
export function relativeError(guess: number, answer: number): number {
  return Math.abs(guess - answer) / judgedAge(answer);
}

/**
 * Daily score in [0, 100]. A logistic decay of the relative error:
 *   score = 200 * (1 - logistic(r / spread))
 * Perfect guess -> 100, and the score falls off smoothly as the guess drifts.
 */
export function dailyScore(guess: number, answer: number): number {
  const r = relativeError(guess, answer);
  const score = 200 * (1 - 1 / (1 + Math.exp(-r / DAILY_SPREAD)));
  return Math.round(score);
}

/** Whether a guess survives a sudden-death round at the given tolerance (percent). */
export function survives(guess: number, answer: number, pct: number): boolean {
  return relativeError(guess, answer) <= pct / 100;
}

/** The window of years that would survive at this tolerance — shown as a hint. */
export function toleranceYears(answer: number, pct: number): number {
  return Math.floor((judgedAge(answer) * pct) / 100);
}
