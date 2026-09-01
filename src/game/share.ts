// Wordle-style shareable text built from emoji, plus a link to the game.

import { MAX_DAILY_SCORE } from "./scoring";
import type { Theme } from "./themes";

/**
 * Query parameter carrying a themed pack, so a shared pack result opens that
 * pack rather than the front page. Written by packShareText and read back by
 * packFromUrl — they are here together so they cannot drift apart.
 */
export const PACK_PARAM = "pack";

// The live URL, derived from wherever the app is actually served.
function gameUrl(): string {
  if (typeof location !== "undefined") return location.origin + location.pathname;
  return "";
}

/**
 * Map a per-question score (0..100) to a square. A full 100 gets its own mark —
 * it is the one result worth spotting in someone else's row of squares.
 */
export function scoreSquare(score: number): string {
  if (score >= 100) return "🎉";
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

/**
 * Sudden death results are only comparable alongside the tolerance they were set
 * at — twelve rounds at 2% is a different game from twelve at 25% — so the
 * percentage (and the pack, if the run was themed) is part of the claim.
 */
export function suddenDeathShareText(rounds: number, pct: number, themeLabel?: string): string {
  // A row of skulls capped so the message stays compact.
  const capped = Math.min(rounds, 20);
  const bar = "💀".repeat(Math.max(1, Math.ceil(capped / 2)));
  const more = rounds > capped ? "…" : "";
  const scope = themeLabel ? ` · ${themeLabel}` : "";
  return (
    `Chronology ☠️ Sudden Death${scope}\n` +
    `Survived ${rounds} ${rounds === 1 ? "round" : "rounds"} at ${pct}% ${bar}${more}\n` +
    gameUrl()
  );
}

export function packShareText(theme: Theme, scores: number[], total: number): string {
  const squares = scores.map(scoreSquare).join("");
  const url = `${gameUrl()}?${PACK_PARAM}=${encodeURIComponent(theme.id)}`;
  return `Chronology ${theme.emoji} ${theme.label}\n${total}/${MAX_DAILY_SCORE}\n${squares}\n${url}`;
}

/**
 * The pack id a link is asking for, if any. Takes the URL as an argument rather
 * than reading location itself, so the round trip out through packShareText and
 * back in again can be tested.
 */
export function packFromUrl(url: string): string | null {
  try {
    return new URL(url, "https://chronology.invalid/").searchParams.get(PACK_PARAM) || null;
  } catch {
    return null;
  }
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
