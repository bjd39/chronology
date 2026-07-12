// Display and parsing helpers for signed years (AD positive, BC negative).

export function formatYear(signed: number): string {
  if (signed < 0) return `${-signed} BC`;
  return `${signed} AD`;
}

/** e.g. "off by 37 years" */
export function formatGap(guess: number, answer: number): string {
  const gap = Math.abs(guess - answer);
  if (gap === 0) return "spot on";
  return `off by ${gap.toLocaleString()} ${gap === 1 ? "year" : "years"}`;
}

/** Today's daily key in the player's local timezone, YYYY-MM-DD. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
