import { useRef, useState } from "react";
import type { GameEvent } from "../types";
import { makeSuddenDeathDeck } from "../game/events";
import { survives, relativeError, SUDDEN_DEATH_THRESHOLD } from "../game/scoring";
import { formatYear, formatGap } from "../game/format";
import { recordSuddenDeath, loadStore } from "../game/storage";
import { suddenDeathShareText } from "../game/share";
import YearInput from "./YearInput";
import ShareButton from "./ShareButton";

interface Props {
  onExit: () => void;
  onStoreChange: () => void;
}

type Phase = "guessing" | "survived" | "dead";

export default function SuddenDeath({ onExit, onStoreChange }: Props) {
  const [gameId, setGameId] = useState(0);
  const deckRef = useRef<() => GameEvent>(
    makeSuddenDeathDeck(Math.floor(Math.random() * 2 ** 31) >>> 0),
  );

  const [event, setEvent] = useState<GameEvent>(() => deckRef.current());
  const [survived_, setSurvived] = useState(0);
  const [phase, setPhase] = useState<Phase>("guessing");
  const [lastGuess, setLastGuess] = useState<number | null>(null);
  const bestRef = useRef(loadStore().suddenBest);

  const submitGuess = (signed: number) => {
    setLastGuess(signed);
    if (survives(signed, event.y)) {
      setSurvived((s) => s + 1);
      setPhase("survived");
    } else {
      recordSuddenDeath(survived_);
      onStoreChange();
      setPhase("dead");
    }
  };

  const next = () => {
    setEvent(deckRef.current());
    setPhase("guessing");
    setLastGuess(null);
  };

  const restart = () => {
    deckRef.current = makeSuddenDeathDeck(Math.floor(Math.random() * 2 ** 31) >>> 0);
    bestRef.current = loadStore().suddenBest;
    setGameId((g) => g + 1);
    setSurvived(0);
    setPhase("guessing");
    setLastGuess(null);
    setEvent(deckRef.current());
  };

  if (phase === "dead") {
    const isRecord = survived_ > 0 && survived_ >= bestRef.current;
    return (
      <div className="screen">
        <div className="result-card">
          <p className="eyebrow">☠️ Sudden death</p>
          <h2 className="big-score">{survived_}</h2>
          <p className="score-sub">{survived_ === 1 ? "round survived" : "rounds survived"}</p>
          {isRecord && survived_ > 0 && <p className="record-badge">New personal best!</p>}

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
              (limit {Math.round(SUDDEN_DEATH_THRESHOLD * 100)}%)
            </p>
          </div>

          <ShareButton text={suddenDeathShareText(survived_)} />
          <div className="btn-row">
            <button className="btn-primary" onClick={restart}>
              Play again
            </button>
            <button className="btn-text" onClick={onExit}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="progress-row">
        <button className="btn-text small" onClick={onExit}>
          ← Back
        </button>
        <span className="progress-label streak-count">
          <span className="flame">🔥</span> {survived_} survived
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
