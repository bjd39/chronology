import { useRef, useState } from "react";
import type { GameEvent } from "../types";
import { makeDeck, randomSeed, type Deck } from "../game/events";
import { THEMES, themeById, themeLabel, themePool, themeSize } from "../game/themes";
import {
  survives,
  relativeError,
  toleranceYears,
  suddenLevel,
  SUDDEN_LEVELS,
} from "../game/scoring";
import { formatYear, formatGap } from "../game/format";
import { recordSuddenDeath, loadStore, recordOf, rememberSuddenPct } from "../game/storage";
import { suddenDeathShareText } from "../game/share";
import YearInput from "./YearInput";
import ShareButton from "./ShareButton";

interface Props {
  onExit: () => void;
  onStoreChange: () => void;
}

type Phase = "setup" | "guessing" | "survived" | "dead";

export default function SuddenDeath({ onExit, onStoreChange }: Props) {
  const saved = loadStore();
  const [pct, setPct] = useState(saved.lastSuddenPct);
  const [themeId, setThemeId] = useState(saved.lastTheme);
  const [phase, setPhase] = useState<Phase>("setup");

  const [gameId, setGameId] = useState(0);
  const deckRef = useRef<Deck | null>(null);
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [survived_, setSurvived] = useState(0);
  const [lastGuess, setLastGuess] = useState<number | null>(null);
  const bestRef = useRef(0);

  const level = suddenLevel(pct);
  const label = themeId ? themeLabel(themeId) : "";

  const begin = (startPct: number, startTheme: string) => {
    const deck = makeDeck(randomSeed(), themePool(startTheme));
    deckRef.current = deck;
    bestRef.current = recordOf(loadStore().sudden, String(startPct)).best;
    setPct(startPct);
    setThemeId(startTheme);
    rememberSuddenPct(startPct);
    setGameId((g) => g + 1);
    setSurvived(0);
    setLastGuess(null);
    setEvent(deck.next(0));
    setPhase("guessing");
  };

  const submitGuess = (signed: number) => {
    if (!event) return;
    setLastGuess(signed);
    if (survives(signed, event.y, pct)) {
      setSurvived((s) => s + 1);
      setPhase("survived");
    } else {
      recordSuddenDeath(pct, survived_);
      onStoreChange();
      setPhase("dead");
    }
  };

  const next = () => {
    if (!deckRef.current) return;
    setEvent(deckRef.current.next(survived_));
    setPhase("guessing");
    setLastGuess(null);
  };

  // --- Pre-game setup: tolerance and pack ---
  if (phase === "setup") {
    const record = recordOf(saved.sudden, String(pct));
    return (
      <div className="screen">
        <div className="progress-row">
          <button className="btn-text small" onClick={onExit}>
            ← Back
          </button>
          <span className="progress-label">☠️ Sudden death</span>
        </div>

        <div className="question-card setup-card">
          <h3 className="setup-heading">How close do you have to be?</h3>
          <p className="setup-note">
            Miss by more than this share of the event's age and the run ends. Ten
            percent of a 2,500-year-old event is 250 years; ten percent of a
            1985 one is four.
          </p>
          <div className="level-row">
            {SUDDEN_LEVELS.map((l) => (
              <button
                key={l.pct}
                className={`level-chip${l.pct === pct ? " is-active" : ""}`}
                onClick={() => setPct(l.pct)}
                aria-pressed={l.pct === pct}
              >
                <span className="level-pct">{l.pct}%</span>
                <span className="level-label">{l.label}</span>
              </button>
            ))}
          </div>
          <p className="setup-blurb">{level.blurb}</p>
          {record.games > 0 && (
            <p className="setup-note">
              Your best at {pct}%: <strong>{record.best}</strong>{" "}
              {record.best === 1 ? "round" : "rounds"} over {record.games}{" "}
              {record.games === 1 ? "run" : "runs"}.
            </p>
          )}

          <h3 className="setup-heading">What are you playing?</h3>
          <div className="pack-row">
            <button
              className={`pack-chip${themeId === "" ? " is-active" : ""}`}
              onClick={() => setThemeId("")}
              aria-pressed={themeId === ""}
            >
              🌍 All of history
            </button>
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`pack-chip${themeId === t.id ? " is-active" : ""}`}
                onClick={() => setThemeId(t.id)}
                aria-pressed={themeId === t.id}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <p className="setup-note">
            {themeId ? themeById(themeId)?.blurb : "Everything in the corpus."}{" "}
            {themeSize(themeId).toLocaleString()} events.
          </p>

          <button className="btn-primary wide" onClick={() => begin(pct, themeId)}>
            Start run →
          </button>
        </div>
      </div>
    );
  }

  if (!event) return null;

  // --- Run over ---
  if (phase === "dead") {
    const isRecord = survived_ > 0 && survived_ >= bestRef.current;
    return (
      <div className="screen">
        <div className="result-card">
          <p className="eyebrow">
            ☠️ Sudden death · {pct}%{label && ` · ${label}`}
          </p>
          <h2 className="big-score">{survived_}</h2>
          <p className="score-sub">
            {survived_ === 1 ? "round survived" : "rounds survived"} at {pct}%
          </p>
          {isRecord && survived_ > 0 && (
            <p className="record-badge">New personal best at {pct}%!</p>
          )}

          <div className="reveal death-reveal">
            <div className="reveal-line">
              <div>
                <span className="reveal-label">Answer</span>
                <span className="reveal-answer">{formatYear(event.y)}</span>
              </div>
              <div className="reveal-right">
                <span className="reveal-label">You</span>
                <span className="reveal-guess">
                  {lastGuess !== null ? formatYear(lastGuess) : "—"}
                </span>
              </div>
            </div>
            <p className="event-text small">{event.e}</p>
            <p className="reveal-gap">
              {lastGuess !== null && formatGap(lastGuess, event.y)} ·{" "}
              {lastGuess !== null && (relativeError(lastGuess, event.y) * 100).toFixed(0)}% off
              (you had {toleranceYears(event.y, pct).toLocaleString()} years of room)
            </p>
          </div>

          <ShareButton text={suddenDeathShareText(survived_, pct, label || undefined)} />
          <div className="btn-row">
            <button className="btn-primary" onClick={() => begin(pct, themeId)}>
              Play again
            </button>
            <button className="btn-text" onClick={() => setPhase("setup")}>
              Change settings
            </button>
          </div>
          <button className="btn-text" onClick={onExit}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // --- Playing ---
  return (
    <div className="screen">
      <div className="progress-row">
        <button className="btn-text small" onClick={onExit}>
          ← Back
        </button>
        <span className="progress-label streak-count">
          <span className="flame">🔥</span> {survived_} survived
          <span className="tolerance-tag"> · {pct}%</span>
        </span>
      </div>

      <div className="question-card">
        <p className="event-text">{event.e}</p>

        {phase === "guessing" ? (
          <YearInput key={`${gameId}-${survived_}`} onSubmit={submitGuess} />
        ) : (
          <div className="reveal survived-reveal">
            <div className="reveal-line">
              <div>
                <span className="reveal-label">Answer</span>
                <span className="reveal-answer">{formatYear(event.y)}</span>
              </div>
              <div className="reveal-right">
                <span className="reveal-label">You</span>
                <span className="reveal-guess">
                  {lastGuess !== null ? formatYear(lastGuess) : "—"}
                </span>
              </div>
              <div className="reveal-scorewrap">
                <span className="reveal-safe">Safe ✓</span>
              </div>
            </div>
            <p className="reveal-gap">
              {lastGuess !== null && formatGap(lastGuess, event.y)} ·{" "}
              {lastGuess !== null && (relativeError(lastGuess, event.y) * 100).toFixed(0)}% off
            </p>
            <button className="btn-primary" onClick={next}>
              Next event →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
