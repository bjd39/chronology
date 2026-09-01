import { useMemo, useState } from "react";
import type { GameEvent, Guess } from "../types";
import { packEvents, randomSeed } from "../game/events";
import { themeById, themePool } from "../game/themes";
import { dailyScore, relativeError, DAILY_QUESTIONS, MAX_DAILY_SCORE } from "../game/scoring";
import { formatYear, formatGap } from "../game/format";
import { recordPack, loadStore, recordOf } from "../game/storage";
import { toGuessRow } from "../game/history";
import { packShareText } from "../game/share";
import YearInput from "./YearInput";
import ShareButton from "./ShareButton";
import ScoreDots from "./ScoreDots";
import Recap from "./Recap";

interface Props {
  themeId: string;
  /** From a shared link: replay that exact five rather than dealing new ones. */
  initialSeed?: number | null;
  onExit: () => void;
  onStoreChange: () => void;
}

type Phase = "guessing" | "revealed" | "finished";

/**
 * A themed pack: five events from one slice of history, scored like the daily
 * but replayable — there is no "the" Roman puzzle, just another five.
 */
export default function PackGame({ themeId, initialSeed, onExit, onStoreChange }: Props) {
  const theme = themeById(themeId);
  // A fresh seed is a fresh set of five; "Five more" just draws a new one. A seed
  // off a shared link deals the same five the sharer played.
  const [seed, setSeed] = useState(() => initialSeed ?? randomSeed());
  const events = useMemo<GameEvent[]>(
    () => packEvents(themePool(themeId), seed),
    [themeId, seed],
  );

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("guessing");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [lastGuessYear, setLastGuessYear] = useState<number | null>(null);

  if (!theme) return null;

  const submitGuess = (signed: number) => {
    const event = events[index];
    setLastGuessYear(signed);
    setGuesses((g) => [
      ...g,
      { event, guess: signed, score: dailyScore(signed, event.y), relError: relativeError(signed, event.y) },
    ]);
    setPhase("revealed");
  };

  const next = () => {
    if (index + 1 >= DAILY_QUESTIONS) {
      const total = guesses.reduce((a, b) => a + b.score, 0);
      recordPack(themeId, total, guesses.map(toGuessRow));
      onStoreChange();
      setPhase("finished");
    } else {
      setIndex((i) => i + 1);
      setPhase("guessing");
      setLastGuessYear(null);
    }
  };

  const again = () => {
    setSeed(randomSeed());
    setIndex(0);
    setGuesses([]);
    setLastGuessYear(null);
    setPhase("guessing");
  };

  if (phase === "finished") {
    const scores = guesses.map((g) => g.score);
    const total = scores.reduce((a, b) => a + b, 0);
    const record = recordOf(loadStore().packs, themeId);
    return (
      <div className="screen">
        <div className="result-card">
          <p className="eyebrow">
            {theme.emoji} {theme.label}
          </p>
          <h2 className="big-score">
            {total}
            <span className="score-max"> / {MAX_DAILY_SCORE}</span>
          </h2>
          <ScoreDots scores={scores} />
          {total >= record.best && total > 0 && <p className="record-badge">Best yet in this pack!</p>}

          <Recap rounds={guesses.map(toGuessRow)} />

          <ShareButton text={packShareText(theme, scores, total, seed)} />
          <div className="btn-row">
            <button className="btn-primary" onClick={again}>
              Five more
            </button>
            <button className="btn-text" onClick={onExit}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const event = events[index];
  const current = guesses[index];

  return (
    <div className="screen">
      <div className="progress-row">
        <button className="btn-text small" onClick={onExit}>
          ← Back
        </button>
        <span className="progress-label">
          {theme.emoji} {theme.label} · {index + 1} / {DAILY_QUESTIONS}
        </span>
      </div>

      <div className="question-card">
        <p className="event-text">{event.e}</p>

        {phase === "guessing" ? (
          <YearInput key={`${seed}-${index}`} onSubmit={submitGuess} />
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
