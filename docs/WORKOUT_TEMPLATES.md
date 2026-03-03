# Workout Templates — DB schema + UI flow (draft)

Kanban: **BBT-2026-03-02-1**

Goal: allow users to define reusable workout templates (e.g., Push Day) composed of exercises and preset sets, then start a live workout from a template while retaining flexibility to modify the live workout.

---

## Terminology

- **Template**: a reusable blueprint.
- **Template exercise**: an exercise entry inside a template.
- **Template set**: a set specification inside a template exercise.
- **Workout**: a concrete logged session (already exists today).

---

## Data model (Drizzle/SQLite)

### 1) `workout_templates`
A top-level template.

Fields (suggested):
- `id` (pk, uuid/text)
- `name` (text, required)
- `description` (text, optional)
- `createdAt` / `updatedAt` (datetime)
- `archivedAt` (datetime, nullable) — keep old templates without deleting

Indexes:
- `(archivedAt)` for listing active templates quickly

### 2) `workout_template_exercises`
The ordered list of exercises in a template.

Fields:
- `id` (pk)
- `templateId` (fk → workout_templates.id, required)
- `exerciseId` (fk → exercises.id, required) OR `exerciseName` (text) depending on how exercises are modeled today
- `position` (int, required) — ordering within template
- `notes` (text, optional) — e.g., “slow eccentric”

Indexes/constraints:
- unique `(templateId, position)` (optional but nice)

### 3) `workout_template_sets`
Preset set prescriptions for each template exercise.

Fields:
- `id` (pk)
- `templateExerciseId` (fk → workout_template_exercises.id, required)
- `position` (int, required)
- `targetReps` (int, nullable)
- `targetRir` (int, nullable) — if you want RIR guidance
- `targetWeightKg` (real, nullable) — optional; many prefer leaving weight blank
- `restSeconds` (int, nullable)

Notes:
- Keep these targets as *guidance*; live workout should still allow edits.

---

## Migrations / compatibility with existing workouts

- This feature adds new tables; no destructive migration required.
- Starting a workout from a template should create normal `workouts`, `workout_exercises`, and `workout_sets` rows.
- If existing workouts already support arbitrary structure edits (add/remove sets/exercises), templates simply seed the initial structure.

Potential compatibility concern:
- If exercises are currently “free text” in workouts, prefer mirroring that in templates (store `exerciseName`) until a canonical `exercises` table is stable.

---

## UI/UX flow

### A) Templates list
Route/tab: **Training → Templates** (or Settings → Templates, but Training is more natural).

List shows:
- Template name
- Exercise count
- Last updated
- Quick actions: **Start**, **Edit**, (optional) **Duplicate**, **Archive**

### B) Create template (builder)
1. Click **New template**
2. Enter name + optional description
3. Add exercises (search/pick)
4. For each exercise:
   - set default number of sets (quick “+ set”)
   - optionally fill targets (reps/rest/etc.)
5. Reorder exercises (drag handles)
6. Save

### C) Edit template
Same UI as builder.

Rules:
- Editing a template must not mutate previously logged workouts.
- If you want versioning later, add `version` integer + snapshot copies; not required for v1.

### D) Start workout from template
From Templates list or template details:
- Click **Start**
- Creates a new workout session with exercises/sets prefilled
- Redirect to **Live workout** screen

### E) Live workout flexibility after starting
Even when seeded from a template, allow:
- add/remove exercises
- add/remove sets
- change targets and logged values

---

## Minimal v1 acceptance criteria

- CRUD templates (create, list, edit, archive)
- Start workout from template seeds a live workout structure
- Ordering preserved (exercise + set positions)
- No impact on existing non-template workouts

---

## Follow-ups (nice-to-have)

- Duplicate template
- “Progression hints” (e.g., last workout performance as suggested targets)
- Tag templates (push/pull/legs)
- Template import/export
