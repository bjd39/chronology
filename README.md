# Chronology

Guess the year historical events happened. Two modes:

- **Daily** — five events, one from each era (antiquity → modern), the same puzzle for
  everyone each day. Scored out of 500.
- **Sudden death** — endless random events; miss by more than 10% and the run ends.

Scoring is framed as *how long ago* something happened, so a guess is judged by its
**relative error** on that quantity — recent events demand precision, ancient ones give
you room. The daily score is a logistic decay of that error. See the in-app FAQ.

## Stack

Vite + React + TypeScript, deployed to GitHub Pages. Stats are stored locally in the
browser (`localStorage`). No backend.

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build to dist/
npm test         # scoring unit tests
```

## Deploying

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`. The Vite
`base` is `/chronology/` — set it to match the repo name if you fork/rename.

## The event corpus

`src/data/events.json` (~3,700 events) is generated from Wikipedia by
`scripts/scrape.py`:

- **Century pages** (`5th_century_BC` … `19th_century`) for antiquity through the 19th
  century — Wikipedia's curated "big events by year" bullet lists.
- **Year pages** (`1900` … `2025`) for the modern era, capped and spread per year.

The scraper cleans wiki markup, redacts the answer year from clues where it would give
the game away, and dedupes. To regenerate:

```bash
python3 scripts/scrape.py src/data/events.json
```
