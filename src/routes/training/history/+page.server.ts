import { db } from '$lib/server/db';
import { workouts, workoutSets } from '$lib/server/db/schema';
import { desc, isNotNull, count, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const limit = 20;
	const offset = (page - 1) * limit;

	// Get finished workouts with set counts
	const allWorkouts = await db.query.workouts.findMany({
		where: isNotNull(workouts.finishedAt),
		orderBy: desc(workouts.date),
		limit,
		offset,
		with: { sets: true }
	});

	// Compute stats per workout
	const workoutList = allWorkouts.map(w => {
		const exercises = new Set(w.sets.map(s => s.exerciseId));
		const totalVolume = w.sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
		return {
			id: w.id,
			name: w.name,
			date: w.date,
			startedAt: w.startedAt,
			durationSeconds: w.durationSeconds,
			exerciseCount: exercises.size,
			setCount: w.sets.length,
			totalVolume: Math.round(totalVolume),
			notes: w.notes
		};
	});

	// Total count for pagination
	const totalResult = await db.select({ count: count() }).from(workouts).where(isNotNull(workouts.finishedAt));
	const total = totalResult[0]?.count ?? 0;

	// Monthly summary (workouts per month for the chart)
	const monthlySummary: { month: string; count: number }[] = [];
	const monthMap = new Map<string, number>();
	for (const w of workoutList) {
		const month = w.date.slice(0, 7); // YYYY-MM
		monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
	}
	for (const [month, cnt] of monthMap) {
		monthlySummary.push({ month, count: cnt });
	}

	return {
		workouts: workoutList,
		page,
		totalPages: Math.ceil(total / limit),
		total
	};
};
