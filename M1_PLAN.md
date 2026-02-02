# BB Tracker — M1 Plan

## Scope
Deliver a working local web app scaffold (SvelteKit + Drizzle + SQLite) and a minimal end-to-end vertical slice for each module:
- Calorie tracker (custom foods + OpenFoodFacts lookup + micro nutrients)
- Training tracker (splits + exercises + live workout + rest timer by exercise+set type)
- Supplement tracker (supplements/meds incl. PEDs + schedules + auto nutrient logging)
- Body tracker (measurements + check-in photo upload stored on disk with DB references)

## Milestones (subtasks)
1) Scaffold + DB wiring + basic responsive shell
2) Schema v1 + migrations
3) Calorie slice
4) Training slice
5) Supplement slice
6) Body slice

## Non-goals for M1
- multi-user auth
- cloud sync
- nutrition barcode scanning (optional later)
