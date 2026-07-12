// Scoring is framed as "how long ago did this happen?". A guess is judged by its
// RELATIVE error on that quantity, so getting a recent event a few years off is
// penalised like getting an ancient event a few centuries off. This keeps every
// era equally fair.

// Reference "present" year used for the how-long-ago calculation.
export const REF_YEAR = 2026;

// Logistic spread for the daily score. Smaller = harsher. At r = SPREAD the
// score is ~73; at r = 2*SPREAD it's ~54.
export const DAILY_SPREAD = 0.2;

// Sudden-death: a relative error above this ends the game.
export const SUDDEN_DEATH_THRESHOLD = 0.1;

export const DAILY_QUESTIONS = 5;
export const MAX_DAILY_SCORE = DAILY_QUESTIONS * 100;

/** Years before the reference present. Always >= 1 for our historical events. */
export function yearsAgo(signedYear: number): number {
  return REF_YEAR - signedYear;
}

/** Relative error of a guess, measured on the "how long ago" scale. */
export function relativeError(guess: number, answer: number): number {
  const ago = Math.max(yearsAgo(answer), 1);
  return Math.abs(guess - answer) / ago;
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

/** Whether a guess survives a sudden-death round. */
export function survives(guess: number, answer: number): boolean {
  return relativeError(guess, answer) <= SUDDEN_DEATH_THRESHOLD;
}
