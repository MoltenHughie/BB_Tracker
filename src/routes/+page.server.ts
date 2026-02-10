import { db } from '$lib/server/db';
import {
	foodEntries,
	dailyTargets,
	workouts,
	workoutSets,
	bodyWeights,
	supplementLogs,
	supplementSchedules,
	supplements
} from '$lib/server/db/schema';
import { eq, desc, and, gte, isNull, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const today = new Date().toISOString().split('T')[0];

	// --- Calories ---
	const todayEntries = await db.query.foodEntries.findMany({
		where: eq(foodEntries.date, today)
	});
	const caloriesEaten = todayEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0);
	const proteinEaten = todayEntries.reduce((sum, e) => sum + (e.protein ?? 0), 0);

	const target = await db.query.dailyTargets.findFirst({
		where: eq(dailyTargets.date, today)
	});
	// Fallback: check if there's any target at all (use latest)
	const latestTarget = target ?? await db.query.dailyTargets.findFirst({
		orderBy: desc(dailyTargets.date)
	});

	// --- Training ---
	const activeWorkout = await db.query.workouts.findFirst({
		where: isNull(workouts.finishedAt),
		with: { sets: true }
	});

	const todayWorkout = !activeWorkout
		? await db.query.workouts.findFirst({
				where: eq(workouts.date, today),
				orderBy: desc(workouts.startedAt),
				with: { sets: true }
			})
		: null;

	// --- Body weight ---
	const latestWeight = await db.query.bodyWeights.findFirst({
		orderBy: desc(bodyWeights.date)
	});

	// --- Supplements ---
	const dayOfWeek = new Date().getDay(); // 0=Sunday
	const allSchedules = await db.query.supplementSchedules.findMany({
		where: eq(supplementSchedules.isActive, true),
		with: { supplement: true }
	});
	// Filter schedules active today
	const todaySchedules = allSchedules.filter(s => {
		if (!s.daysOfWeek) return true; // no restriction = every day
		try {
			const days: number[] = JSON.parse(s.daysOfWeek);
			return days.includes(dayOfWeek);
		} catch {
			return true;
		}
	});
	const todayLogs = await db.query.supplementLogs.findMany({
		where: eq(supplementLogs.date, today)
	});
	const suppsTaken = todayLogs.length;
	const suppsTotal = todaySchedules.length;

	return {
		today,
		calories: {
			eaten: Math.round(caloriesEaten),
			target: latestTarget?.calories ?? null,
			protein: Math.round(proteinEaten),
			proteinTarget: latestTarget?.protein ?? null
		},
		training: {
			active: activeWorkout
				? { name: activeWorkout.name, sets: activeWorkout.sets.length }
				: null,
			todayDone: todayWorkout
				? { name: todayWorkout.name, sets: todayWorkout.sets.length, duration: todayWorkout.durationSeconds }
				: null
		},
		body: {
			weight: latestWeight?.weight ?? null,
			date: latestWeight?.date ?? null
		},
		supplements: {
			taken: suppsTaken,
			total: suppsTotal
		}
	};
};
