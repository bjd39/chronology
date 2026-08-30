# Chronology

Guess the year historical events happened. Three modes:

- **Daily** — five events, the same puzzle for everyone each day, spanning antiquity
  to the present and climbing a difficulty ladder from an easy opener to a
  specialist closer. Scored out of 500.
- **Sudden death** — endless random events; you pick the margin (25% down to 2%,
  default 10%) and one miss beyond it ends the run. The margin is part of the
  result — *"12 rounds at 5%"* — and bests are tracked per margin. Runs can be
  pointed at a single themed pack.
- **Themed packs** — five events from one corner of history (Rome, the World Wars,
  China & East Asia, …). Replayable, scored like the daily.

Scoring is framed as *how long ago* something happened, so a guess is judged by its
**relative error** on that quantity — recent events demand precision, ancient ones
give you room. The daily score is a logistic decay of that error. See the in-app FAQ.

## Stack

Vite + React + TypeScript, deployed to GitHub Pages. Stats are stored locally in the
browser (`localStorage`). No backend.

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build to dist/
npm test         # scoring, corpus and sampling tests
```

## Deploying

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`. The Vite
`base` is `/chronology/` — set it to match the repo name if you fork/rename.

## Versioning

The footer carries a build stamp — `v0.3.0 · e153e78` — so what is on screen can be
matched to what is in the repo. The two halves are set differently on purpose:

- the **version** is the `version` field in `package.json`, bumped by hand when a
  release is worth naming (`0.1` the original game, `0.2` the scoring and scraper
  pass, `0.3` selectable margins, themed packs and the curated corpus);
- the **commit** is injected at build time by `vite.config.ts`, from `GITHUB_SHA`
  in CI or `git rev-parse` locally, so it is always exactly what was deployed.

Hovering the stamp shows the build date.

### Keeping it current

Only the version half needs looking after — the commit half takes care of itself,
because nothing ever writes it down. There is one rule:

> **Bump `package.json` in the same commit as the change that earns the bump.**

Do it as part of the work, not as a release chore afterwards, and it cannot drift.

```bash
npm version patch --no-git-tag-version   # 0.3.0 -> 0.3.1  fixes, copy, data tweaks
npm version minor --no-git-tag-version   # 0.3.0 -> 0.4.0  a new mode, or a rule change
```

`--no-git-tag-version` keeps npm from making its own commit and tag, so the change
lands in yours. Use the command rather than editing the field by hand — the version
appears in `package-lock.json` too, and `npm version` keeps the two in step. Roughly: a **minor** bump for anything a player would notice as new
or different — a mode, a scoring rule, a corpus rebuild; a **patch** for everything
else. Nothing is versioned but the game, so there is no compatibility contract to
honour here; the number is a label, not a promise.

If the number is ever stale, it is only ever *behind*, and the commit beside it
still says exactly what is deployed — which is the half that matters when something
looks wrong. If hand-bumping turns out to be too much discipline, the honest
alternative is to drop the semver half and stamp the commit count instead
(`git rev-list --count HEAD`), which needs `fetch-depth: 0` on the checkout step in
`.github/workflows/deploy.yml` — CI clones shallow by default and would otherwise
count 1 forever.

## The event corpus

`src/data/events.json` (~3,200 events) is built in two stages.

**1. Scrape.** `scripts/scrape.py` pulls candidates from Wikipedia:

- **Century pages** (`5th_century_BC` … `19th_century`) for antiquity through the
  19th century — Wikipedia's curated "big events by year" bullet lists.
- **Year pages** (`1900` … `2025`) for the modern era, capped and spread per year.

It cleans wiki markup, redacts the answer year from clues where it would give the
game away, drops fragments the markup stripper mangled, and dedupes.

**2. Curate.** `scripts/curate.py` turns those candidates into the playable corpus:

- **Gettability.** Every scraped event was reviewed by hand and either kept or
  thrown out. Roughly one in eight went: events that name no single dateable
  occurrence ("this volcano erupted", "Etruscan civilization."), events whose date
  is scholarly guesswork, museum-artifact dating, legendary regnal lists,
  duplicates that disagreed with each other about the year, clues that leaked their
  own answer, and text the scraper had broken. The verdicts live in
  `scripts/curation.tsv`; a handful of salvageable-but-mangled entries are rewritten
  in `scripts/rewrites.tsv`.
- **Difficulty**, 1 (iconic) to 5 (specialist), on every surviving event. It is
  judged in *game* terms — against the relative-error scale, not raw years. The
  survivable window at 10% is about 450 years for a 2500 BC event but about four
  for a 1985 one, so an obscure Assyrian king is often easier to place than a famous
  modern election.
- **Theme packs**, from keyword lexicons in `curate.py`. Packs overlap: the fall of
  Constantinople belongs to Rome and to the Islamic world.

The corpus averages 3.6 out of 5, so uniform sampling makes almost every question a
hard one. The daily, the packs and sudden death all stratify on difficulty instead —
see `DAILY_LADDER` and `difficultyCap` in `src/game/events.ts`.

To regenerate:

```bash
python3 scripts/scrape.py raw.json          # ~150 Wikipedia requests
python3 scripts/curate.py raw.json src/data/events.json
```

`curate.py` reports anything in the fresh scrape that is not in `curation.tsv`;
those events are skipped until they are reviewed.
