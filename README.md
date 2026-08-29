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
