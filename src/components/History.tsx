import { useState } from "react";
import type { Store } from "../types";
import { historyEntries } from "../game/history";
import { themeLabel } from "../game/themes";
import { dailyStats } from "../game/storage";
import { todayKey } from "../game/format";
import ScoreDots from "./ScoreDots";
import Recap from "./Recap";

interface Props {
  store: Store;
  onExit: () => void;
}

const ICON = { daily: "📅", pack: "🎯", sudden: "💀" } as const;

export default function History({ store, onExit }: Props) {
  const entries = historyEntries(store, themeLabel);
  const [open, setOpen] = useState<string | null>(entries[0]?.id ?? null);
  const stats = dailyStats(store, todayKey());

  return (
    <div className="screen">
      <div className="progress-row">
        <button className="btn-text small" onClick={onExit}>
          ← Back
        </button>
        <span className="progress-label">Your history</span>
      </div>

      {entries.length === 0 ? (
        <div className="question-card">
          <p className="muted-note center">
            Nothing here yet. Play a daily, a pack or a sudden-death run and it will
            show up — with what you guessed against what was true.
          </p>
        </div>
      ) : (
        <>
          <p className="section-note">
            {entries.length} {entries.length === 1 ? "round" : "rounds"} played
            {stats.played > 0 &&
              (stats.played === 1 ? ", one of them a daily" : `, ${stats.played} of them dailies`)}
            . Tap one to see your guesses.
          </p>

          <ul className="history">
            {entries.map((entry) => {
              const isOpen = open === entry.id;
              return (
                <li key={entry.id} className={`history-item${isOpen ? " is-open" : ""}`}>
                  <button
                    className="history-head"
                    onClick={() => setOpen(isOpen ? null : entry.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="history-icon">{ICON[entry.mode]}</span>
                    <span className="history-title">{entry.title}</span>
                    <span className="history-result">{entry.result}</span>
                    <span className="history-chevron">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="history-body">
                      {entry.badge && <p className="history-badge">{entry.badge}</p>}
                      {entry.scores.length > 0 && <ScoreDots scores={entry.scores} />}
                      {entry.rounds.length > 0 ? (
                        <Recap rounds={entry.rounds} showScores={entry.mode !== "sudden"} />
                      ) : (
                        <p className="muted-note center">
                          {entry.mode === "sudden"
                            ? "This run ended before the first guess."
                            : "Played before Chronology kept your guesses — only the score survives."}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="muted-note center history-footnote">
            Kept in this browser's local storage, on this device only — clearing site
            data will erase it, and it does not follow you to another browser or phone.
          </p>
        </>
      )}
    </div>
  );
}
