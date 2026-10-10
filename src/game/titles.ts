// A rank for a five-event score: where that total puts you in the record.

/**
 * The bands, highest first: the first one a score clears is the one it earns.
 *
 * The ladder climbs — a footnote in the margins, then an officer, then a legend,
 * then something history does not forget. The numbers still show through where
 * they can (a centurion commands a hundred; three hundred held Thermopylae), but
 * the rank has to read as an achievement first and a pun second.
 */
export interface ScoreBand {
  /** Lowest total that earns this title. */
  min: number;
  title: string;
  /** A line of praise for the result card, scaled to the rank. */
  note: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { min: 500, title: "Immortal", note: "Five from five. Nothing left to prove." },
  { min: 490, title: "Colossus", note: "Within ten of perfect. Towering." },
  { min: 475, title: "Oracle", note: "You don't guess. You divine." },
  { min: 450, title: "Emperor", note: "The timeline answers to you." },
  { min: 400, title: "Conqueror", note: "Four hundred. The field is yours." },
  { min: 300, title: "Spartan", note: "Three hundred, and you held the line." },
  { min: 200, title: "Praetorian", note: "Two hundred. Consider yourself promoted." },
  { min: 100, title: "Centurion", note: "A hundred up. You're on the board." },
  { min: 0, title: "Footnote", note: "In the margins — for now." },
];

function bandFor(total: number): ScoreBand {
  return SCORE_BANDS.find((b) => total >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/** The title a total out of 500 earns. Never empty — 0 is still a rank. */
export function scoreTitle(total: number): string {
  return bandFor(total).title;
}

/** The line of praise that goes with it. */
export function scoreNote(total: number): string {
  return bandFor(total).note;
}
