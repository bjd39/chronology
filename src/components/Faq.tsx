import {
  DAILY_SPREAD,
  DEFAULT_SUDDEN_PCT,
  SUDDEN_LEVELS,
  REF_YEAR,
  GRACE_YEARS,
} from "../game/scoring";
import { THEMES } from "../game/themes";
import { SCORE_BANDS } from "../game/titles";

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

        <h3>The modes</h3>
        <p>
          <strong>Daily</strong> — five events, one from each era from antiquity to
          the modern day. Same five for everyone, every day. Score up to 100 per
          event.
        </p>
        <p>
          <strong>Sudden death</strong> — endless random events. Miss by more than
          your chosen margin and the run is over. The margin runs from{" "}
          {SUDDEN_LEVELS[0].pct}% ({SUDDEN_LEVELS[0].label.toLowerCase()}) down to{" "}
          {SUDDEN_LEVELS[SUDDEN_LEVELS.length - 1].pct}% (
          {SUDDEN_LEVELS[SUDDEN_LEVELS.length - 1].label.toLowerCase()}), and{" "}
          {DEFAULT_SUDDEN_PCT}% is the default — so a result is always quoted with
          it: "12 rounds at {DEFAULT_SUDDEN_PCT}%". Bests are tracked per margin.
        </p>
        <p>
          <strong>Themed packs</strong> — five events from one slice of history:
          {" "}{THEMES.slice(0, 4).map((t) => t.label).join(", ")} and{" "}
          {THEMES.length - 4} more. Replayable, and you can point sudden death at a
          pack too.
        </p>

        <h3>Why guessing "1850" for a Roman event isn't a disaster</h3>
        <p>
          Scoring is based on <em>how long ago</em> something happened, not the raw
          year. We measure your <strong>relative error</strong>:
        </p>
        <p className="formula">
          error = |your&nbsp;guess − answer| ÷ (years&nbsp;ago + {GRACE_YEARS})
        </p>
        <p>
          So being 50 years off on a recent event is judged as harshly as being
          centuries off on an ancient one. Ancient history gives you room; modern
          history demands precision. (Years ago is measured from {REF_YEAR}.)
        </p>
        <p>
          That <strong>+{GRACE_YEARS}</strong> is there because the pure version
          breaks down at the recent end. Something from 2024 is only a couple of
          years old, so being a single year out would be a 50% error — and nobody
          can date last year's news to the year. Every event is judged as though it
          were {GRACE_YEARS} years older than it is, which is nearly all of the
          sum for something from the 2010s and almost none of it for 2500 BC.
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

        <h3>Titles</h3>
        <p>
          A finished five — daily or pack — earns a rank, and the ranks are puns on
          the number you scored. Three hundred are Spartans, the quattrocento is the
          1400s, and above 450 it is a clock face counting down what you left on the
          table:
        </p>
        <p className="muted-note">
          {[...SCORE_BANDS]
            .reverse()
            .map((b) => `${b.min === 0 ? "under 100" : `${b.min}+`} → ${b.title}`)
            .join(" · ")}
        </p>

        <h3>How hard is it going to be?</h3>
        <p>
          Every event is graded 1 (iconic) to 5 (specialist), judged against this
          relative scale rather than raw years — knowing that an obscure Assyrian
          king belongs somewhere in the second millennium BC is enough to survive,
          while a 1985 event needs the right four-year window.
        </p>
        <p className="muted-note">
          Daily and pack rounds walk up that ladder: the first question is drawn
          from the 1s and 2s, the last from the 4s and 5s. Sudden death does the
          same as your streak grows, so a run ends when you run out of knowledge
          rather than luck.
        </p>

        <h3>Your stats and history</h3>
        <p>
          Every round you finish is kept — what you guessed against what was true —
          and you can read it back from <strong>See your history</strong> on the
          front page. Dailies are kept for good; sudden-death runs and packs keep
          the most recent few hundred.
        </p>
        <p>
          All of it lives in this browser's local storage, on this device only.
          Nothing is sent anywhere, which also means it does not follow you to
          another browser or phone, and clearing site data erases it.
        </p>

        <h3>Where the events come from</h3>
        <p className="muted-note">
          Scraped from Wikipedia's century and year pages, then reviewed by hand:
          events that were vague ("this volcano erupted"), self-answering,
          duplicated or mangled by the scraper were thrown out, and everything that
          survived was graded for difficulty. Just over three thousand remain.
        </p>
      </div>
    </div>
  );
}
