import type { GameEvent } from "../types";
import { EVENTS } from "./events";

/**
 * A themed pack is a slice of the corpus. Membership is decided offline and baked
 * into each event's `t` array: most packs come from the keyword lexicons in
 * scripts/curate.py, and packs whose subject is an idea rather than a vocabulary
 * are hand-picked in scripts/packs.tsv. Keep the ids here in step with both.
 *
 * Packs overlap on purpose: the fall of Constantinople belongs to Rome and to
 * the Islamic world, and it would be a worse question in only one of them.
 */
export interface Theme {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
}

export const THEMES: Theme[] = [
  { id: "rome", label: "Rome & Byzantium", emoji: "🏛️", blurb: "Republic, empire and the long Byzantine afterlife." },
  { id: "greece", label: "Ancient Greece", emoji: "🏺", blurb: "Athens, Sparta, and the Hellenistic world." },
  { id: "egypt", label: "Egypt & the Near East", emoji: "🐫", blurb: "Pharaohs, Assyria, Babylon and Persia." },
  { id: "china", label: "China & East Asia", emoji: "🐉", blurb: "Dynastic China, Japan, Korea and beyond." },
  { id: "india", label: "India & South Asia", emoji: "🪷", blurb: "Maurya to Mughal to modern." },
  { id: "islam", label: "The Islamic World", emoji: "🕌", blurb: "Caliphates, sultanates and the Ottomans." },
  { id: "britain", label: "Britain & Ireland", emoji: "👑", blurb: "From Northumbria to Westminster." },
  { id: "americas", label: "The Americas", emoji: "🗽", blurb: "North and South, before and after 1492." },
  { id: "africa", label: "Africa", emoji: "🦁", blurb: "Aksum, Mali, Benin and the modern continent." },
  { id: "worldwars", label: "The World Wars", emoji: "⚔️", blurb: "1914 to 1945, and the years between." },
  { id: "coldwar", label: "The Cold War", emoji: "☢️", blurb: "Iron curtain, proxy wars and the thaw." },
  { id: "exploration", label: "Exploration & Empire", emoji: "🧭", blurb: "Voyages, colonies and the poles." },
  { id: "science", label: "Science & Space", emoji: "🔭", blurb: "Discoveries, inventions and spaceflight." },
  {
    id: "explaining",
    label: "Explaining the World",
    emoji: "⚗️",
    blurb: "Learning how to find things out — reckoning time, then measuring it.",
  },
  { id: "arts", label: "Art & Culture", emoji: "🎭", blurb: "Paintings, operas, novels and films." },
  { id: "disasters", label: "Disasters", emoji: "🌋", blurb: "Earthquakes, plagues, eruptions and wrecks." },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Events belonging to a theme, or the whole corpus for the empty id. */
const POOLS = new Map<string, GameEvent[]>([["", EVENTS]]);
for (const theme of THEMES) {
  POOLS.set(
    theme.id,
    EVENTS.filter((e) => e.t.includes(theme.id)),
  );
}

export function themeById(id: string): Theme | null {
  return BY_ID.get(id) ?? null;
}

/** The playable pool for a theme id; falls back to everything if unknown. */
export function themePool(id: string): GameEvent[] {
  return POOLS.get(id) ?? EVENTS;
}

export function themeLabel(id: string): string {
  return themeById(id)?.label ?? "All of history";
}

export function themeSize(id: string): number {
  return themePool(id).length;
}
