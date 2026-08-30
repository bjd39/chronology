import { useMemo, useState } from "react";
import type { GameEvent, Guess } from "../types";
import { dailyEvents } from "../game/events";
import { dailyScore, relativeError, DAILY_QUESTIONS, MAX_DAILY_SCORE } from "../game/scoring";
import { formatYear, formatGap, todayKey } from "../game/format";
import { recordDaily, loadStore } from "../game/storage";
import { toGuessRow } from "../game/history";
import { dailyShareText } from "../game/share";
import YearInput from "./YearInput";
import ShareButton from "./ShareButton";
import ScoreDots from "./ScoreDots";
import Recap from "./Recap";

interface Props {
  onExit: () => void;
  onStoreChange: () => void;
}

type Phase = "guessing" | "revealed";

export default function DailyGame({ onExit, onStoreChange }: Props) {
  const key = todayKey();
  const events = useMemo<GameEvent[]>(() => dailyEvents(key), [key]);

  const existing = loadStore().daily[key];
  const [finished, setFinished] = useState(Boolean(existing));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("guessing");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [lastGuessYear, setLastGuessYear] = useState<number | null>(null);

  const submitGuess = (signed: number) => {
    const event = events[index];
    const score = dailyScore(signed, event.y);
    const relError = relativeError(signed, event.y);
    setLastGuessYear(signed);
    setGuesses((g) => [...g, { event, guess: signed, score, relError }]);
    setPhase("revealed");
  };

  const next = () => {
    if (index + 1 >= DAILY_QUESTIONS) {
      const scores = guesses.map((g) => g.score);
      const total = scores.reduce((a, b) => a + b, 0);
      recordDaily(key, {
        scores,
        total,
        playedAt: new Date().toISOString(),
        rounds: guesses.map(toGuessRow),
      });
      onStoreChange();
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setPhase("guessing");
      setLastGuessYear(null);
    }
  };

  // --- Completed view (either just finished, or already played today) ---
  if (finished) {
    const result = loadStore().daily[key];
    if (!result) return null;
    return (
      <div className="screen">
        <div className="result-card">
          <p className="eyebrow">Daily · {key}</p>
          <h2 className="big-score">
            {result.total}
            <span className="score-max"> / {MAX_DAILY_SCORE}</span>
          </h2>
          <ScoreDots scores={result.scores} />

          {result.rounds ? (
            <Recap rounds={result.rounds} />
          ) : (
            <p className="muted-note center">
              You played this one before Chronology kept your guesses, so only the
              score survives.
            </p>
          )}
          {guesses.length !== DAILY_QUESTIONS && (
            <p className="muted-note center">
              You've already played today. Come back tomorrow for five new events.
            </p>
          )}

          <ShareButton text={dailyShareText(key, result.scores, result.total)} />
          <button className="btn-text" onClick={onExit}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // --- Playing ---
  const event = events[index];
  const current = guesses[index];

  return (
    <div className="screen">
      <div className="progress-row">
        <button className="btn-text small" onClick={onExit}>
          ← Back
        </button>
        <span className="progress-label">
          {index + 1} / {DAILY_QUESTIONS}
        </span>
      </div>

      <div className="question-card">
        <p className="event-text">{event.e}</p>

        {phase === "guessing" ? (
          <YearInput key={index} onSubmit={submitGuess} />
        ) : (
          current && (
            <div className="reveal">
              <div className="reveal-line">
                <div>
                  <span className="reveal-label">Answer</span>
                  <span className="reveal-answer">{formatYear(event.y)}</span>
                </div>
                <div className="reveal-right">
                  <span className="reveal-label">You</span>
                  <span className="reveal-guess">
                    {lastGuessYear !== null ? formatYear(lastGuessYear) : "—"}
                  </span>
                </div>
                <div className="reveal-scorewrap">
                  <span className="reveal-score">+{current.score}</span>
                </div>
              </div>
              <p className="reveal-gap">{formatGap(current.guess, event.y)}</p>
              <button className="btn-primary" onClick={next}>
                {index + 1 >= DAILY_QUESTIONS ? "See results" : "Next event →"}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
