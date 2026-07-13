import { DAILY_SPREAD, SUDDEN_DEATH_THRESHOLD, REF_YEAR } from "../game/scoring";

interface Props {
  onClose: () => void;
}

export default function Faq({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>How it works</h2>

        <p>
          You're shown a historical event and guess the year it happened. Type the
          year and tap <span className="chip">AD</span> / <span className="chip">BC</span>{" "}
          to switch era — or just type a minus sign for BC.
        </p>

        <h3>The two modes</h3>
        <p>
          <strong>Daily</strong> — five events, one from each era from antiquity to
          the modern day. Same five for everyone, every day. Score up to 100 per
          event.
        </p>
        <p>
          <strong>Sudden death</strong> — endless random events. Miss by more than{" "}
          {Math.round(SUDDEN_DEATH_THRESHOLD * 100)}% and the run is over. See how
          far you can get.
        </p>

        <h3>Why guessing "1850" for a Roman event isn't a disaster</h3>
        <p>
          Scoring is based on <em>how long ago</em> something happened, not the raw
          year. We measure your <strong>relative error</strong>:
        </p>
        <p className="formula">
          error = |your&nbsp;guess − answer| ÷ (years&nbsp;ago)
        </p>
        <p>
          So being 50 years off on a recent event is judged as harshly as being
          centuries off on an ancient one. Ancient history gives you room; modern
          history demands precision. (Years ago is measured from {REF_YEAR}.)
        </p>

        <h3>The daily score</h3>
        <p>
          Each event's score is a smooth logistic curve on that relative error —
          100 for a perfect guess, tailing off as you drift:
        </p>
        <p className="formula">
          score = 200 × (1 − logistic(error ÷ {DAILY_SPREAD}))
        </p>
        <p className="muted-note">
          Roughly: nail it → 100, within ~15% → ~75, within ~30% → ~55, way off (double
          or halve the true age) → near 0.
        </p>

        <h3>Your stats</h3>
        <p>
          Streaks, averages and best runs are saved on this device only (in local
          storage). Nothing is sent anywhere.
        </p>

        <h3>Where the events come from</h3>
        <p className="muted-note">
          Curated from Wikipedia's century and year pages. A few thousand events, so
          expect the occasional obscure one — that's what the partial-credit scoring
          is for.
        </p>
      </div>
    </div>
  );
}
