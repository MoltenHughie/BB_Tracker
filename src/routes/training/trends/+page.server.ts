import { db } from '$lib/server/db';
import { workoutSets, workouts, exercises } from '$lib/server/db/schema';
import { sql, desc, eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const exerciseId = url.searchParams.get('exercise');
	const days = parseInt(url.searchParams.get('days') ?? '30');

	// List all exercises that have logged sets
	const exerciseList = await db
		.selectDistinct({
			id: exercises.id,
			name: exercises.name,
		})
		.from(workoutSets)
		.innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
		.orderBy(exercises.name);

	let progressData: { date: string; maxWeight: number; maxVolume: number; topSetReps: number }[] = [];

	if (exerciseId) {
		// Get best set per workout date for this exercise
		const rows = await db
			.select({
				date: workouts.date,
				weight: workoutSets.weight,
				reps: workoutSets.reps,
			})
			.from(workoutSets)
			.innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
			.where(
				and(
					eq(workoutSets.exerciseId, parseInt(exerciseId)),
					eq(workoutSets.isCompleted, true),
				)
			)
			.orderBy(workouts.date);

		// Aggregate per date: max weight, max volume (weight × reps), top set reps
		const byDate = new Map<string, typeof rows>();
		for (const r of rows) {
			const d = r.date ?? '';
			if (!byDate.has(d)) byDate.set(d, []);
			byDate.get(d)!.push(r);
		}

		progressData = Array.from(byDate.entries()).map(([date, sets]) => {
			const maxWeight = Math.max(...sets.map((s) => s.weight ?? 0));
			const maxVolume = Math.max(...sets.map((s) => (s.weight ?? 0) * (s.reps ?? 0)));
			const topSetReps = Math.max(...sets.filter((s) => s.weight === maxWeight).map((s) => s.reps ?? 0));
			return { date, maxWeight, maxVolume, topSetReps };
		});
	}

	return {
		exerciseList,
		selectedExercise: exerciseId ? parseInt(exerciseId) : null,
		progressData,
		days,
	};
};
