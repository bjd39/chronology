// Wordle-style shareable text built from emoji, plus a link to the game.

import { MAX_DAILY_SCORE } from "./scoring";
import type { Theme } from "./themes";

/**
 * Query parameters carrying a themed pack and the seed that dealt it, so a shared
 * pack result opens that pack on the very same five events. Written by
 * packShareText and read back by packFromUrl — they are here together so they
 * cannot drift apart.
 */
export const PACK_PARAM = "pack";
export const SEED_PARAM = "seed";

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

/** Total, the row of squares, then the individual scores. */
function scoreboard(scores: number[], total: number, max: number): string {
  return [`${total}/${max}`, scores.map(scoreSquare).join(""), scores.join(" / ")].join("\n");
}

export function dailyShareText(dateKey: string, scores: number[], total: number): string {
  return `Chronology ${dateKey}\n${scoreboard(scores, total, scores.length * 100)}\n${gameUrl()}`;
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

/**
 * Packs are replayable, so unlike the daily there is no shared puzzle of the day —
 * the seed that dealt these five is what makes the result comparable. It travels
 * in base 36 to keep the link short enough to read in a chat message.
 */
export function packShareText(
  theme: Theme,
  scores: number[],
  total: number,
  seed: number,
): string {
  const params = new URLSearchParams({
    [PACK_PARAM]: theme.id,
    [SEED_PARAM]: (seed >>> 0).toString(36),
  });
  const url = `${gameUrl()}?${params}`;
  return `Chronology ${theme.emoji} ${theme.label}\n${scoreboard(scores, total, MAX_DAILY_SCORE)}\n${url}`;
}

export interface PackLink {
  pack: string;
  /** null when the link named a pack but no usable seed: deal a fresh five. */
  seed: number | null;
}

/**
 * What a link is asking for, if anything. Takes the URL as an argument rather
 * than reading location itself, so the round trip out through packShareText and
 * back in again can be tested.
 */
export function packFromUrl(url: string): PackLink | null {
  let params: URLSearchParams;
  try {
    params = new URL(url, "https://chronology.invalid/").searchParams;
  } catch {
    return null;
  }
  const pack = params.get(PACK_PARAM);
  if (!pack) return null;
  const raw = params.get(SEED_PARAM);
  const seed = raw ? parseInt(raw, 36) : NaN;
  const usable = Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff;
  return { pack, seed: usable ? seed : null };
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
