import { db } from '$lib/server/db';
import { foodEntries, foods, foodServings, dailyTargets } from '$lib/server/db/schema';
import { sql, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const days = parseInt(url.searchParams.get('days') ?? '14');

	// Aggregate daily calories + macros over last N days
	const dailyTotals = await db
		.select({
			date: foodEntries.date,
			totalCalories: sql<number>`sum(${foods.calories} * ${foodEntries.quantity} * coalesce(${foodServings.grams}, 100) / 100)`.as('total_calories'),
			totalProtein: sql<number>`sum(${foods.protein} * ${foodEntries.quantity} * coalesce(${foodServings.grams}, 100) / 100)`.as('total_protein'),
			totalCarbs: sql<number>`sum(${foods.carbs} * ${foodEntries.quantity} * coalesce(${foodServings.grams}, 100) / 100)`.as('total_carbs'),
			totalFat: sql<number>`sum(${foods.fat} * ${foodEntries.quantity} * coalesce(${foodServings.grams}, 100) / 100)`.as('total_fat'),
		})
		.from(foodEntries)
		.innerJoin(foods, sql`${foodEntries.foodId} = ${foods.id}`)
		.leftJoin(foodServings, sql`${foodEntries.servingId} = ${foodServings.id}`)
		.groupBy(foodEntries.date)
		.orderBy(desc(foodEntries.date))
		.limit(days);

	// Get most recent target
	const target = await db.query.dailyTargets.findFirst({
		orderBy: desc(dailyTargets.date),
	});

	return {
		dailyTotals: dailyTotals.reverse(), // chronological order
		target: target ?? null,
		days,
	};
};
