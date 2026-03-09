# Workout templates — migration plan + edge cases (draft)

Kanban: **BBT-2026-03-04-1**

This note extends `docs/WORKOUT_TEMPLATES.md` with:
- migration/backfill strategy
- edge cases (template edits after workouts exist, renames, set-count changes)
- analytics stability considerations

## 1) Migration / backfill strategy

### A) Additive migration (v1)
- Introduce new tables:
  - `workout_templates`
  - `workout_template_exercises`
  - `workout_template_sets`
- No changes required to existing workout tables.
- No backfill is needed for the feature to ship.

### B) Optional backfill: “Save workout as template” (v1.1)
If you want a smooth adoption path:
- Add action on a completed workout: **Save as template**.
- Backfill algorithm:
  1. Create a `workout_templates` row with name derived from workout (e.g., "Push Day (from 2026-03-04)").
  2. For each workout exercise, create `workout_template_exercises` in the same order.
  3. For each exercise, create `workout_template_sets`:
     - `targetReps` from the *logged reps* (or leave null if variable)
     - `restSeconds` from workout’s stored rest (if tracked)
     - leave `targetWeightKg` null by default (weight progresses; better as hint not prescription)

This preserves ordering and gives users an on-ramp without forcing manual template builder use.

## 2) Core invariants

1. **Templates are immutable with respect to past workouts**
   - Editing a template must never mutate previously logged workout rows.
   - A workout may optionally store `sourceTemplateId` and `sourceTemplateVersion` for traceability only.

2. **Live workouts remain editable**
   - Starting from a template is a seeding step; the workout is then free-form.

3. **Analytics operate on workout logs, not templates**
   - Templates should not affect volume/PR/trends.

## 3) Edge cases & how to handle them

### Edge case 1: Template edited after workouts exist
**Scenario:** User logs several workouts from template T, then edits T.

**Rule:** Logged workouts remain unchanged.

**Implementation suggestions:**
- Workouts created from templates store:
  - `sourceTemplateId` (nullable)
  - `sourceTemplateSnapshot` (optional JSON) or `sourceTemplateVersion` (int)

**Trade-off:**
- `sourceTemplateVersion` requires explicit template versioning.
- `sourceTemplateSnapshot` (JSON) makes future UI “show me original template” easy, but increases DB size.

Recommendation for v1:
- Store only `sourceTemplateId` (nullable) and keep it simple.
- Add version/snapshot only if you need later provenance.

### Edge case 2: Exercise rename / canonicalization
**Scenario:** Template uses `exerciseName="Incline DB Press"`, later user renames it to "Incline Dumbbell Press".

Options:
1) If you have an `exercises` table with stable IDs: reference `exerciseId` and store display name separately.
2) If workouts are free-text today: keep templates free-text too.

Recommendation:
- Mirror the workout model: if workouts are free-text, templates should be free-text for now.
- Later, when migrating to canonical exercises, add a mapping table and keep old `exerciseName` as fallback.

### Edge case 3: Set count changes between template and live workout
**Scenario:** Template prescribes 3 sets, but user adds 1 set mid-workout.

Rule:
- Live workout structure can diverge without penalty.

Analytics:
- Set count for volume is computed from logged sets.
- Do not compare against template to avoid “missing set” warnings.

### Edge case 4: Editing a template while a workout seeded from it is in-progress
**Scenario:** Start workout from template; mid-workout user edits the template.

Rule:
- The in-progress workout does NOT auto-update.

Implementation:
- Seed at workout creation time; after that, template changes are irrelevant.

### Edge case 5: Template archiving/deletion
**Scenario:** Template is archived but workouts reference it.

Rule:
- Workouts keep `sourceTemplateId` even if template is archived.
- In UI, show “(archived template)” rather than breaking.

Recommendation:
- Prefer **archive** to delete.
- If delete exists, make it soft-delete or block deletion if referenced.

### Edge case 6: Reordering exercises/sets in template
**Scenario:** User reorders template exercises.

Rule:
- Affects only future workouts.

Implementation:
- Use explicit `position` fields and enforce uniqueness per template.

## 4) Analytics stability (important)

To keep analytics stable and comparable over time:
- Do not derive analytics from templates.
- Use workout logs as the source of truth.
- If you introduce exercise canonicalization later, add:
  - stable exercise identifiers
  - alias mapping for historical names

A useful compromise:
- Keep `exerciseName` for display and historical continuity.
- Optionally attach `exerciseId` when available for aggregation.

## 5) Minimal acceptance criteria for this card

- A written migration/backfill plan (this file)
- Edge cases documented with explicit rules
- Clear statement that analytics uses workouts, not templates
