import type { Store } from "../types";
import { dailyStats } from "../game/storage";
import { todayKey } from "../game/format";
import { MAX_DAILY_SCORE } from "../game/scoring";

interface Props {
  store: Store;
  onPlayDaily: () => void;
  onPlaySudden: () => void;
}

export default function Home({ store, onPlayDaily, onPlaySudden }: Props) {
  const key = todayKey();
  const played = Boolean(store.daily[key]);
  const stats = dailyStats(store, key);
  const avgSudden =
    store.suddenGames > 0 ? (store.suddenTotalRounds / store.suddenGames).toFixed(1) : "—";

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
            Endless events. One miss over 10% and it's over.
          </span>
          <span className="mode-cta">
            {store.suddenBest > 0 ? `Best: ${store.suddenBest} rounds →` : "Start a run →"}
          </span>
        </button>
      </div>

      {(stats.played > 0 || store.suddenGames > 0) && (
        <div className="stats-strip">
          {stats.played > 0 && (
            <>
              <Stat label="Days played" value={stats.played} />
              <Stat label="Avg score" value={stats.averageTotal} />
              <Stat label="Streak" value={stats.currentStreak} />
              <Stat label="Best day" value={stats.bestTotal} />
            </>
          )}
          {store.suddenGames > 0 && (
            <>
              <Stat label="SD best" value={store.suddenBest} />
              <Stat label="SD avg" value={avgSudden} />
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
