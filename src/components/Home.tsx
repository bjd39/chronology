import type { Store } from "../types";
import { dailyStats, bestSuddenRun, recordOf, averageOf } from "../game/storage";
import { todayKey } from "../game/format";
import { MAX_DAILY_SCORE, suddenLevel } from "../game/scoring";
import { THEMES, themeSize } from "../game/themes";

interface Props {
  store: Store;
  onPlayDaily: () => void;
  onPlaySudden: () => void;
  onPlayPack: (themeId: string) => void;
  onShowHistory: () => void;
}

export default function Home({
  store,
  onPlayDaily,
  onPlaySudden,
  onPlayPack,
  onShowHistory,
}: Props) {
  const key = todayKey();
  const played = Boolean(store.daily[key]);
  const stats = dailyStats(store, key);
  const best = bestSuddenRun(store);
  const played_ = Object.keys(store.daily).length + store.runs.length;
  const lastLevel = suddenLevel(store.lastSuddenPct);

  return (
    <div className="screen home">
      <p className="tagline">Guess the year history happened.</p>

      <div className="mode-cards">
        <button className="mode-card" onClick={onPlayDaily}>
          <span className="mode-icon">📅</span>
          <span className="mode-title">Daily</span>
          <span className="mode-desc">
            Five events, one shared puzzle a day. Score out of {MAX_DAILY_SCORE}.
          </span>
          <span className="mode-cta">
            {played ? `Today: ${store.daily[key].total}/${MAX_DAILY_SCORE} · view →` : "Play today →"}
          </span>
        </button>

        <button className="mode-card" onClick={onPlaySudden}>
          <span className="mode-icon">💀</span>
          <span className="mode-title">Sudden death</span>
          <span className="mode-desc">
            Endless events. Pick your margin — {lastLevel.pct}% is {lastLevel.label.toLowerCase()} —
            and see how far you get.
          </span>
          <span className="mode-cta">
            {best ? `Best: ${best.rounds} rounds at ${best.pct}% →` : "Start a run →"}
          </span>
        </button>
      </div>

      <h2 className="section-heading">Themed packs</h2>
      <p className="section-note">Five events from one corner of history. Play as often as you like.</p>
      <div className="pack-grid">
        {THEMES.map((t) => {
          const record = recordOf(store.packs, t.id);
          return (
            <button key={t.id} className="pack-card" onClick={() => onPlayPack(t.id)}>
              <span className="pack-emoji">{t.emoji}</span>
              <span className="pack-name">{t.label}</span>
              <span className="pack-meta">
                {record.games > 0
                  ? `Best ${record.best}/${MAX_DAILY_SCORE}`
                  : `${themeSize(t.id)} events`}
              </span>
            </button>
          );
        })}
      </div>

      {played_ > 0 && (
        <button className="btn-text history-link" onClick={onShowHistory}>
          See your history →
        </button>
      )}

      {(stats.played > 0 || best !== null) && (
        <div className="stats-strip">
          {stats.played > 0 && (
            <>
              <Stat label="Days played" value={stats.played} />
              <Stat label="Avg score" value={stats.averageTotal} />
              <Stat label="Streak" value={stats.currentStreak} />
              <Stat label="Best day" value={stats.bestTotal} />
            </>
          )}
          {best !== null && (
            <>
              <Stat label={`SD best (${best.pct}%)`} value={best.rounds} />
              <Stat
                label={`SD avg (${best.pct}%)`}
                value={averageOf(recordOf(store.sudden, String(best.pct)))}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
