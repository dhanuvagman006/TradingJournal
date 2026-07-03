# Trade Ledger — Trading Journal

A private, local-first trading journal that runs entirely in your browser. Log each trading day with P/L, chart screenshots, structured notes and tags — then review your performance by calendar, weekday and analytics.

## Features

- **Log Entry** — daily P/L, number of trades, instruments, tags, five structured note sections (plan, review, mistakes, lessons, emotions), and drag-and-drop chart screenshots (auto-compressed, up to ~4 MB/day).
- **Calendar** — month view heat-mapped by P/L; click any day to review or edit it.
- **Weekday Review** — see all your Mondays (or any weekday) side by side to spot day-of-week patterns.
- **Analytics** — equity curve, per-day P/L bars, win rate, streaks and tag breakdowns (Recharts).
- **Compare** — put any two days side by side, screenshots included.
- **Search** — full-text search across notes, tags and instruments.
- **Stats strip** — net P/L, win rate, current streak, best day and average per session, always visible.

## Permanent storage

All data is stored **on your device** in the browser's **IndexedDB** (database `trade-ledger`) — nothing is uploaded anywhere. Entries, screenshots and settings survive page refreshes and browser restarts. The app also requests durable-storage permission (`navigator.storage.persist()`) so the browser won't evict your journal under storage pressure.

You can export/import a full JSON backup from the **Settings** tab. Note: clearing the browser's site data will erase the journal, and data does not sync between browsers or devices — use the backup export to move it.

## Run it

```bash
npm install
npm run dev      # start dev server
npm run build    # production build in dist/
npm run preview  # preview the production build
```

## Stack

React 19 · Vite 8 · Recharts · IndexedDB (no backend, no accounts)
