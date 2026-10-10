// A rank for a five-event score, as a pun on the number itself.

/**
 * The bands, highest first: the first one a score clears is the one it earns.
 *
 * Low down the puns are about the hundreds (a century is a centurion, three
 * hundred are Spartans, the quattrocento is the 1400s); from 450 up they are
 * clock faces, because what is left to say at that point is how far short of a
 * perfect 500 you fell — fifty, twenty-five, ten, and finally nothing at all.
 */
export interface ScoreBand {
  /** Lowest total that earns this title. */
  min: number;
  title: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { min: 500, title: "Bang on Time" },
  { min: 490, title: "Ten to Five" },
  { min: 475, title: "Quarter to Five" },
  { min: 450, title: "Half Past Four" },
  { min: 400, title: "Quattrocento" },
  { min: 300, title: "Spartan" },
  { min: 200, title: "Bicenturion" },
  { min: 100, title: "Centurion" },
  { min: 0, title: "Decimated" },
];

/** The title a total out of 500 earns. Never empty — 0 is still a rank. */
export function scoreTitle(total: number): string {
  const band = SCORE_BANDS.find((b) => total >= b.min);
  return (band ?? SCORE_BANDS[SCORE_BANDS.length - 1]).title;
}
