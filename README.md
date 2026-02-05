# BB Tracker

Local-only, mobile-first bodybuilding tracker built with SvelteKit 5 + Drizzle ORM + SQLite.

## Features (Planned)

- **Calorie Tracker**: Custom foods, OpenFoodFacts lookup, macro/micronutrient tracking
- **Training Tracker**: Workout splits, exercise library, live workout with rest timer
- **Supplement Tracker**: Supplements/meds/PEDs, schedules, auto-nutrient logging
- **Body Tracker**: Weight, measurements, check-in photos (stored on disk)

## Tech Stack

- [SvelteKit 5](https://svelte.dev/) with Svelte 5 runes
- [Drizzle ORM](https://orm.drizzle.team/) with better-sqlite3
- [Tailwind CSS v4](https://tailwindcss.com/)
- SQLite for local data

## Development

```bash
# Use correct Node version
nvm use

# Install dependencies
npm install

# Run dev server
npm run dev

# Typecheck / Svelte diagnostics
npm run check

# Build
npm run build

# Database commands
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## Project Structure

```
src/
├── app.css              # Global styles + Tailwind
├── lib/
│   └── server/db/       # Database schema + connection
└── routes/
    ├── +layout.svelte   # Mobile-first shell + bottom nav
    ├── +page.svelte     # Dashboard
    ├── calories/        # Calorie tracker module
    ├── training/        # Training tracker module
    ├── supplements/     # Supplement tracker module
    └── body/            # Body tracker module
```

## Data Storage

- All data stored locally in `./data/bb_tracker.sqlite`
- Photos stored on disk with DB references (not in DB)
- No cloud sync, no accounts — your data stays on your device
