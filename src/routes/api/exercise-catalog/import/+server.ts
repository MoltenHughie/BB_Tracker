import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { exerciseCatalog } from '$lib/server/db/schema';
import { mapFreeExerciseDbEntry, type FreeExerciseDbEntry } from '$lib/server/integrations/free-exercise-db';

const FREE_EXERCISE_DB_URL =
	'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

export const POST: RequestHandler = async ({ url }) => {
	// Optional query param: ?limit=100 for smoke testing
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Math.max(0, parseInt(limitParam, 10)) : null;

	const res = await fetch(FREE_EXERCISE_DB_URL);
	if (!res.ok) {
		throw error(502, `Failed to fetch free-exercise-db: ${res.status} ${res.statusText}`);
	}

	const raw = (await res.json()) as FreeExerciseDbEntry[];
	const entries = (limit ? raw.slice(0, limit) : raw).map(mapFreeExerciseDbEntry);

	const now = new Date().toISOString();

	let inserted = 0;

	// Insert row-by-row with ON CONFLICT DO NOTHING (unique constraint on name+equipment+category).
	for (const e of entries) {
		const result = await db
			.insert(exerciseCatalog)
			.values({
				name: e.name,
				category: e.category,
				level: e.level,
				equipment: e.equipment,
				primaryMuscles: JSON.stringify(e.primaryMuscles ?? []),
				secondaryMuscles: JSON.stringify(e.secondaryMuscles ?? []),
				source: 'free-exercise-db',
				createdAt: now
			})
			.onConflictDoNothing();

		// better-sqlite3 returns changes count on run(); drizzle returns a result array for returning().
		// For onConflictDoNothing() we just conservatively increment if no exception.
		// (If we want accurate counts later, we can query counts before/after.)
		if (result) inserted += 1;
	}

	return json({
		success: true,
		fetched: raw.length,
		processed: entries.length,
		attemptedInserts: inserted,
		url: FREE_EXERCISE_DB_URL
	});
};
