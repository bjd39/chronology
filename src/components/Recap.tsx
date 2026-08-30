import type { GuessRow } from "../types";
import { formatYear, formatGap } from "../game/format";

/**
 * What you said against what was true. This is the whole point of keeping the
 * rounds: a score on its own tells you that you did badly, not what you got wrong.
 */
export default function Recap({
  rounds,
  showScores = true,
}: {
  rounds: GuessRow[];
  /** Sudden death is pass/fail, so its rounds have no score worth showing. */
  showScores?: boolean;
}) {
  if (rounds.length === 0) return null;
  return (
    <ul className="recap">
      {rounds.map((r, i) => (
        <li key={i}>
          <span className="recap-year">{formatYear(r.y)}</span>
          <span className="recap-event">{r.e}</span>
          {showScores && <span className="recap-score">{r.s}</span>}
          <span className="recap-guess">
            You said {formatYear(r.g)} · {formatGap(r.g, r.y)}
          </span>
        </li>
      ))}
    </ul>
  );
}
