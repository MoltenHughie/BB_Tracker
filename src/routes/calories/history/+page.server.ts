import { db } from '$lib/server/db';
import { foodEntries, dailyTargets } from '$lib/server/db/schema';
import { desc, gte, lte, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Default: last 30 days
	const today = new Date().toISOString().split('T')[0];
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
	const from = url.searchParams.get('from') ?? thirtyDaysAgo.toISOString().split('T')[0];
	const to = url.searchParams.get('to') ?? today;

	const entries = await db.query.foodEntries.findMany({
		where: and(gte(foodEntries.date, from), lte(foodEntries.date, to)),
		orderBy: desc(foodEntries.date)
	});

	// Get latest target for reference
	const latestTarget = await db.query.dailyTargets.findFirst({
		orderBy: desc(dailyTargets.date)
	});

	// Group by date
	const dateMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; entries: number }>();
	for (const e of entries) {
		const existing = dateMap.get(e.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
		existing.calories += e.calories ?? 0;
		existing.protein += e.protein ?? 0;
		existing.carbs += e.carbs ?? 0;
		existing.fat += e.fat ?? 0;
		existing.entries += 1;
		dateMap.set(e.date, existing);
	}

	const days = [...dateMap.entries()]
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([date, totals]) => ({
			date,
			calories: Math.round(totals.calories),
			protein: Math.round(totals.protein),
			carbs: Math.round(totals.carbs),
			fat: Math.round(totals.fat),
			entries: totals.entries
		}));

	// Averages
	const totalDays = days.length;
	const avgCalories = totalDays > 0 ? Math.round(days.reduce((s, d) => s + d.calories, 0) / totalDays) : 0;
	const avgProtein = totalDays > 0 ? Math.round(days.reduce((s, d) => s + d.protein, 0) / totalDays) : 0;

	return {
		days,
		from,
		to,
		avgCalories,
		avgProtein,
		target: latestTarget?.calories ?? null,
		proteinTarget: latestTarget?.protein ?? null
	};
};
