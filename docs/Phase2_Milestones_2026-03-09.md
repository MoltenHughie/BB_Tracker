# BBT Mobile Phase 2 — Next 3 concrete milestones + acceptance checks (2026-03-09)

Card: **BBT-2026-03-09-1**

Source: `Mobile_plan.md` (Phase 2: replace better-sqlite3 with on-device SQLite while keeping Drizzle).

Goal: identify the *next* 3 milestones that are each feasible in ~1–2 days, with clear acceptance criteria and known risks.

---

## Milestone 1 (1–2 days): Introduce a client DB layer (Capacitor SQLite + Drizzle adapter) behind a feature flag

### What
- Add a new DB module that can run in a Capacitor environment:
  - `src/lib/db/schema.ts` (move or re-export schema)
  - `src/lib/db/index.ts` to open DB and construct Drizzle instance
  - migrations runner on app start (runtime migrations)
- Keep the existing Node/better-sqlite3 path available for desktop/dev.

### Acceptance criteria
- App compiles and runs in current environment.
- A single entrypoint can select DB driver (e.g. `DB_DRIVER=node|cap_sqlite`) without touching feature logic.
- Running a small “smoke” query works through the new Drizzle instance (e.g. list days, read latest bodyweight entry, etc.).
- Migrations can be invoked in the new environment without crashing (even if not yet fully packaged for iOS).

### Risks / unknowns
- Migration bundling (Drizzle Kit output format) needs to be compatible with Capacitor runtime.
- Some queries may rely on Node-only APIs indirectly (must be surfaced early).

---

## Milestone 2 (1–2 days): Replace one vertical slice (Calories) to use the new client DB services end-to-end

### What
- Pick one module (Calories is a good candidate) and make it fully client-driven:
  - confirm that all data fetching/mutations go through client services (no `+page.server.ts` dependency)
  - ensure the UI refresh pattern is stable (stores/invalidate)

### Acceptance criteria
- Calories page works with no server actions:
  - add / update / delete food entries
  - copy previous day (if present)
  - totals/macros render correctly after mutations
- No `node:` imports are required for this slice.
- Data persists between reloads using the selected DB driver.

### Risks / unknowns
- Some “server-ish” operations (batch copy, import/export) may need async transaction patterns.

---

## Milestone 3 (1–2 days): Package migrations + first-run seed for the mobile DB

### What
- Produce a migration bundle that can be executed at runtime in the Capacitor environment.
- Implement first-run seeding logic (only when tables empty) equivalent to the current Node seed script.

### Acceptance criteria
- Fresh install flow:
  - app initializes DB
  - applies migrations (idempotent)
  - seeds minimal starter data
  - app reaches a usable UI state without manual DB setup
- Re-open app:
  - migrations do not re-apply
  - data remains intact

### Risks / unknowns
- Seeding might need to be made deterministic + versioned.
- If seed logic depends on file access, it must be adapted for mobile.

---

## Notes (what’s intentionally NOT in these 3 milestones)
- Photo storage migration (Phase 3 in Mobile_plan.md) — separate milestone.
- Adding the Capacitor iOS shell itself — should happen once at least one vertical slice is proven working on the mobile DB.
- Apple Watch integration — later, after core mobile DB + UI are stable.
