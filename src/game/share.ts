// Wordle-style shareable text built from emoji, plus a link to the game.

// The live URL, derived from wherever the app is actually served.
function gameUrl(): string {
  if (typeof location !== "undefined") return location.origin + location.pathname;
  return "";
}

/** Map a per-question score (0..100) to a coloured square. */
function scoreSquare(score: number): string {
  if (score >= 90) return "🟩";
  if (score >= 70) return "🟨";
  if (score >= 45) return "🟧";
  if (score >= 20) return "🟥";
  return "⬛";
}

export function dailyShareText(dateKey: string, scores: number[], total: number): string {
  const squares = scores.map(scoreSquare).join("");
  const perRound = scores.join(" / ");
  return `Chronology ${dateKey}\n${total}/${scores.length * 100}\n${squares}\n${perRound}\n${gameUrl()}`;
}

export function suddenDeathShareText(rounds: number): string {
  // A row of skulls capped so the message stays compact.
  const capped = Math.min(rounds, 20);
  const bar = "💀".repeat(Math.max(1, Math.ceil(capped / 2)));
  const more = rounds > capped ? "…" : "";
  return `Chronology ☠️ Sudden Death\nSurvived ${rounds} ${rounds === 1 ? "round" : "rounds"} ${bar}${more}\n${gameUrl()}`;
}

/** Copy to clipboard, falling back to the Web Share sheet on mobile. */
export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // user cancelled the share sheet — fall through to copy
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
