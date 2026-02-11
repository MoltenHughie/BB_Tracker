import { db } from '$lib/server/db';
import {
	foodEntries,
	dailyTargets,
	workouts,
	workoutSets,
	bodyWeights,
	bodyComposition,
	supplementLogs,
	supplementSchedules,
	supplements,
	appSettings
} from '$lib/server/db/schema';
import { eq, desc, isNull, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

function getWeekDates(): string[] {
	const dates: string[] = [];
	const now = new Date();
	// Start from Monday of current week
	const day = now.getDay();
	const monday = new Date(now);
	monday.setDate(now.getDate() - ((day + 6) % 7));
	for (let i = 0; i < 7; i++) {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		dates.push(d.toISOString().split('T')[0]);
	}
	return dates;
}

export const load: PageServerLoad = async () => {
	const today = new Date().toISOString().split('T')[0];
	const weekDates = getWeekDates();

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

	// --- Body weight + goal + composition ---
	const latestWeight = await db.query.bodyWeights.findFirst({
		orderBy: desc(bodyWeights.date)
	});
	const weightGoalSetting = await db.query.appSettings.findFirst({
		where: eq(appSettings.key, 'weight_goal')
	});
	const weightGoal = weightGoalSetting ? parseFloat(weightGoalSetting.value ?? '') : null;
	const latestComposition = await db.query.bodyComposition.findFirst({
		orderBy: desc(bodyComposition.date)
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

	// --- 7-day calorie rolling average ---
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
	const recentEntries = await db.query.foodEntries.findMany({
		where: and(gte(foodEntries.date, sevenDaysAgo.toISOString().split('T')[0]), lte(foodEntries.date, today))
	});
	const dailyTotals = new Map<string, number>();
	for (const e of recentEntries) {
		dailyTotals.set(e.date, (dailyTotals.get(e.date) ?? 0) + (e.calories ?? 0));
	}
	const daysWithEntries = [...dailyTotals.values()].filter(v => v > 0);
	const calAvg7d = daysWithEntries.length > 0 ? Math.round(daysWithEntries.reduce((a, b) => a + b, 0) / daysWithEntries.length) : null;

	// --- Weekly overview ---
	const weekEntries = await db.query.foodEntries.findMany({
		where: and(gte(foodEntries.date, weekDates[0]), lte(foodEntries.date, weekDates[6]))
	});
	const weekWorkouts = await db.query.workouts.findMany({
		where: and(gte(workouts.date, weekDates[0]), lte(workouts.date, weekDates[6]))
	});

	const weeklyCalories = weekDates.map(date => {
		const dayEntries = weekEntries.filter(e => e.date === date);
		return {
			date,
			dayLabel: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][weekDates.indexOf(date)],
			calories: Math.round(dayEntries.reduce((s, e) => s + (e.calories ?? 0), 0)),
			protein: Math.round(dayEntries.reduce((s, e) => s + (e.protein ?? 0), 0)),
			trained: weekWorkouts.some(w => w.date === date)
		};
	});

	// --- Logging streak (consecutive days with any food entry, ending today or yesterday) ---
	const recentDates = await db.selectDistinct({ date: foodEntries.date })
		.from(foodEntries)
		.orderBy(desc(foodEntries.date));
	
	let streak = 0;
	const checkDate = new Date(today);
	for (const row of recentDates) {
		const expected = checkDate.toISOString().split('T')[0];
		if (row.date === expected) {
			streak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (streak === 0) {
			// Allow starting from yesterday
			checkDate.setDate(checkDate.getDate() - 1);
			const yesterdayExpected = checkDate.toISOString().split('T')[0];
			if (row.date === yesterdayExpected) {
				streak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		} else {
			break;
		}
	}

	return {
		today,
		streak,
		calories: {
			eaten: Math.round(caloriesEaten),
			target: latestTarget?.calories ?? null,
			protein: Math.round(proteinEaten),
			proteinTarget: latestTarget?.protein ?? null,
			avg7d: calAvg7d
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
			date: latestWeight?.date ?? null,
			weightGoal: weightGoal,
			bodyFat: latestComposition?.bodyFatPercent ?? null
		},
		supplements: {
			taken: suppsTaken,
			total: suppsTotal
		},
		weeklyCalories,
		calorieTarget: latestTarget?.calories ?? null
	};
};
