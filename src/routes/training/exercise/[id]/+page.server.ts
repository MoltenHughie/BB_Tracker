import { db } from '$lib/server/db';
import { exercises, workoutSets, workouts, personalRecords } from '$lib/server/db/schema';
import { eq, desc, asc, and, isNotNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const exerciseId = parseInt(params.id);
	if (isNaN(exerciseId)) throw error(400, 'Invalid exercise ID');

	const exercise = await db.query.exercises.findFirst({
		where: eq(exercises.id, exerciseId)
	});
	if (!exercise) throw error(404, 'Exercise not found');

	// Get all sets for this exercise from completed workouts, grouped by workout
	const allSets = await db.query.workoutSets.findMany({
		where: eq(workoutSets.exerciseId, exerciseId),
		orderBy: [desc(workoutSets.workoutId), asc(workoutSets.setNumber)]
	});

	// Get the workout dates for these sets
	const workoutIds = [...new Set(allSets.map(s => s.workoutId))];
	const workoutData: Record<number, { date: string; name: string | null; finishedAt: string | null }> = {};
	
	for (const wid of workoutIds) {
		const w = await db.query.workouts.findFirst({
			where: eq(workouts.id, wid)
		});
		if (w) {
			workoutData[wid] = { date: w.date, name: w.name, finishedAt: w.finishedAt };
		}
	}

	// Only include sets from completed workouts
	const completedSets = allSets.filter(s => workoutData[s.workoutId]?.finishedAt);

	// Group sets by workout (session)
	const sessions = workoutIds
		.filter(wid => workoutData[wid]?.finishedAt)
		.map(wid => ({
			workoutId: wid,
			date: workoutData[wid].date,
			name: workoutData[wid].name,
			sets: completedSets
				.filter(s => s.workoutId === wid)
				.map(s => ({
					setNumber: s.setNumber,
					weight: s.weight,
					reps: s.reps,
					rpe: s.rpe,
					setType: s.setType
				}))
		}))
		.sort((a, b) => b.date.localeCompare(a.date)); // newest first

	// Compute estimated 1RM history (Brzycki) per session
	const oneRmHistory = sessions.map(session => {
		let best1rm = 0;
		let bestVolume = 0;
		for (const set of session.sets) {
			if (set.weight && set.reps && set.reps > 0) {
				const e1rm = set.reps === 1 ? set.weight : set.weight * (36 / (37 - set.reps));
				if (e1rm > best1rm) best1rm = e1rm;
				bestVolume += set.weight * set.reps;
			}
		}
		return {
			date: session.date,
			estimated1rm: Math.round(best1rm * 10) / 10,
			totalVolume: Math.round(bestVolume),
			sets: session.sets.length
		};
	}).reverse(); // chronological for chart

	// PRs for this exercise
	const prs = await db.query.personalRecords.findMany({
		where: eq(personalRecords.exerciseId, exerciseId),
		orderBy: desc(personalRecords.createdAt)
	});

	return {
		exercise,
		sessions: sessions.slice(0, 20), // last 20 sessions
		oneRmHistory,
		prs
	};
};
