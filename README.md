# BB Tracker

Local-only, mobile-first bodybuilding tracker built with SvelteKit 5 + Drizzle ORM + SQLite.

## Features

- **Calorie Tracker**: Custom foods, OpenFoodFacts search, macro/micronutrient tracking, daily targets, history & charts, copy-previous-day
- **Training Tracker**: Workout templates, live workout with rest timer (per exercise/set type), PR detection (1RM + volume), exercise history with e1RM charts, workout history
- **Supplement Tracker**: Supplement library with categories, scheduling system, auto-nutrient logging to calories, 7-day adherence stats, history
- **Body Tracker**: Weight logging with trend sparklines, body composition, measurements with per-type charts, check-in photos with comparison mode
- **Food Library**: Browse, search, edit, delete foods + serving management
- **Dashboard**: Daily overview with calorie/macro progress, training status, supplement adherence, body stats, weekly chart, logging streak
- **Settings**: Dark/light theme, meal type management, JSON export/import (full backup & restore), database stats
- **PWA**: Installable as a Progressive Web App (manifest + icons)

## Tech Stack

- [SvelteKit 5](https://svelte.dev/) with Svelte 5 runes
- [Drizzle ORM](https://orm.drizzle.team/) with better-sqlite3
- [Tailwind CSS v4](https://tailwindcss.com/)
- SQLite for local data

## Development

```bash
npm install
npm run dev          # Dev server (http://localhost:5173)
npm run check        # Typecheck / Svelte diagnostics
npm run build        # Production build
npm run start        # Run production build
```

### Database

```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:seed      # Seed default data (meal types, exercises, etc.)
npm run db:studio    # Open Drizzle Studio (DB browser)
```

## Production Deployment

### Direct (Node.js)

```bash
npm run build
ORIGIN=http://localhost:3000 npm run start
```

### Docker

```bash
docker build -t bb-tracker .
docker run -p 3000:3000 -v bb-data:/app/data bb-tracker
```

The `-v bb-data:/app/data` flag persists your SQLite database and uploaded photos across container restarts.

## Project Structure

```
src/
├── app.css                  # Global styles + Tailwind + design tokens
├── lib/server/db/
│   ├── schema.ts            # Drizzle schema (20 tables)
│   ├── index.ts             # DB connection
│   └── seed.ts              # Default data seeder
└── routes/
    ├── +layout.svelte       # Shell + bottom navigation
    ├── +page.svelte         # Dashboard
    ├── calories/            # Calorie tracker + history
    ├── training/            # Training + exercise history + workout history
    ├── supplements/         # Supplement tracker + history
    ├── body/                # Body tracker + measurement trends
    ├── foods/               # Food library
    ├── settings/            # App settings + data management
    └── api/                 # API routes (food search, photo serving)
```

## Data Storage

- All data stored locally in `./data/bb_tracker.sqlite`
- Photos stored on disk (`./data/uploads/`) with DB references
- No cloud sync, no accounts — your data stays on your device
- Full JSON export/import from Settings page
