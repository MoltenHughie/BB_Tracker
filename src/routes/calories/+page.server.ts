import { db } from '$lib/server/db';
import { foods, foodEntries, mealTypes, dailyTargets } from '$lib/server/db/schema';
import { eq, and, desc, asc, gte, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get date from query param or default to today
	const dateParam = url.searchParams.get('date');
	const today = new Date().toISOString().split('T')[0];
	const date = dateParam || today;

	// Get daily target for this date (or most recent)
	const target = await db.query.dailyTargets.findFirst({
		where: eq(dailyTargets.date, date)
	}) ?? await db.query.dailyTargets.findFirst({
		orderBy: desc(dailyTargets.date)
	});

	// Get all meal types
	const meals = await db.query.mealTypes.findMany({
		orderBy: asc(mealTypes.sortOrder)
	});

	// Get food entries for this date with relations
	const entries = await db.query.foodEntries.findMany({
		where: eq(foodEntries.date, date),
		with: {
			food: true,
			serving: true,
			mealType: true
		},
		orderBy: [asc(foodEntries.mealTypeId), desc(foodEntries.loggedAt)]
	});

	// Get all foods for the food picker
	const allFoods = await db.query.foods.findMany({
		with: { servings: true },
		orderBy: asc(foods.name)
	});

	// Get recently used food IDs (last 7 days) for quick-pick
	const recentEntries = await db.query.foodEntries.findMany({
		where: gte(foodEntries.date, new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
		columns: { foodId: true },
		orderBy: desc(foodEntries.loggedAt)
	});
	const recentFoodIds = [...new Set(recentEntries.map(e => e.foodId))].slice(0, 10);

	// Calculate totals (macros from entries, micros computed from food * quantity)
	const totals = entries.reduce(
		(acc, entry) => {
			const qty = entry.quantity ?? 1;
			const grams = entry.customGrams ?? (entry.serving as { grams?: number } | null)?.grams ?? 100;
			const food = entry.food;
			return {
				calories: acc.calories + (entry.calories || 0),
				protein: acc.protein + (entry.protein || 0),
				carbs: acc.carbs + (entry.carbs || 0),
				fat: acc.fat + (entry.fat || 0),
				// Prefer micros captured at log-time; fall back to computing from current food data.
				fiber: acc.fiber + (entry.fiber ?? ((food.fiber ?? 0) / 100 * grams * qty)),
				sugar: acc.sugar + (entry.sugar ?? ((food.sugar ?? 0) / 100 * grams * qty)),
				sodium: acc.sodium + (entry.sodium ?? ((food.sodium ?? 0) / 100 * grams * qty)),
			};
		},
		{ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
	);

	// Weekly average (last 7 days including today)
	const weekStart = new Date(date);
	weekStart.setDate(weekStart.getDate() - 6);
	const weekStartStr = weekStart.toISOString().split('T')[0];

	const weekEntries = await db
		.select({
			date: foodEntries.date,
			calories: sql<number>`SUM(${foodEntries.calories})`,
			protein: sql<number>`SUM(${foodEntries.protein})`,
		})
		.from(foodEntries)
		.where(and(
			gte(foodEntries.date, weekStartStr),
			sql`${foodEntries.date} <= ${date}`
		))
		.groupBy(foodEntries.date);

	const daysWithData = weekEntries.filter(d => d.calories > 0);
	const weeklyAvg = daysWithData.length > 0 ? {
		calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length),
		protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length),
		days: daysWithData.length
	} : null;

	return {
		date,
		target,
		meals,
		entries,
		allFoods,
		recentFoodIds,
		totals,
		weeklyAvg
	};
};

export const actions: Actions = {
	// Add a food entry
	addEntry: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string;
		const foodId = parseInt(data.get('foodId') as string);
		const mealTypeId = data.get('mealTypeId') ? parseInt(data.get('mealTypeId') as string) : null;
		const servingId = data.get('servingId') ? parseInt(data.get('servingId') as string) : null;
		const quantity = parseFloat(data.get('quantity') as string) || 1;
		const customGrams = data.get('customGrams') ? parseFloat(data.get('customGrams') as string) : null;

		if (!foodId || isNaN(foodId)) {
			return fail(400, { error: 'Food is required' });
		}

		// Get the food
		const food = await db.query.foods.findFirst({
			where: eq(foods.id, foodId),
			with: { servings: true }
		});

		if (!food) {
			return fail(404, { error: 'Food not found' });
		}

		// Calculate nutrition values
		let grams: number;
		if (customGrams) {
			grams = customGrams;
		} else if (servingId) {
			const serving = food.servings.find(s => s.id === servingId);
			grams = serving ? serving.grams * quantity : 100 * quantity;
		} else {
			// Default to 100g * quantity
			grams = 100 * quantity;
		}

		const multiplier = grams / 100;
		const now = new Date().toISOString();

		await db.insert(foodEntries).values({
			date,
			foodId,
			mealTypeId,
			servingId,
			quantity,
			customGrams,
			calories: food.calories * multiplier,
			protein: food.protein * multiplier,
			carbs: food.carbs * multiplier,
			fat: food.fat * multiplier,
			fiber: (food.fiber ?? 0) * multiplier,
			sugar: (food.sugar ?? 0) * multiplier,
			sodium: (food.sodium ?? 0) * multiplier,
			loggedAt: now,
			createdAt: now
		});

		return { success: true };
	},

	// Delete a food entry
	deleteEntry: async ({ request }) => {
		const data = await request.formData();
		const entryId = parseInt(data.get('entryId') as string);

		if (!entryId || isNaN(entryId)) {
			return fail(400, { error: 'Entry ID is required' });
		}

		await db.delete(foodEntries).where(eq(foodEntries.id, entryId));
		return { success: true };
	},

	updateEntry: async ({ request }) => {
		const data = await request.formData();
		const entryId = parseInt(data.get('entryId') as string);
		const quantity = parseFloat(data.get('quantity') as string);

		if (!entryId || isNaN(entryId)) {
			return fail(400, { error: 'Entry ID is required' });
		}
		if (isNaN(quantity) || quantity <= 0) {
			return fail(400, { error: 'Quantity must be a positive number' });
		}

		// Get the entry with food + serving to recalculate
		const entry = await db.query.foodEntries.findFirst({
			where: eq(foodEntries.id, entryId),
			with: { food: true, serving: true }
		});

		if (!entry || !entry.food) {
			return fail(404, { error: 'Entry not found' });
		}

		const food = entry.food;
		// Calculate per-unit values (based on serving or 100g)
		let baseCalories: number, baseProtein: number, baseCarbs: number, baseFat: number;
		let baseFiber: number, baseSugar: number, baseSodium: number;
		if (entry.serving) {
			const grams = entry.serving.grams ?? 100;
			baseCalories = (food.calories / 100) * grams;
			baseProtein = (food.protein / 100) * grams;
			baseCarbs = (food.carbs / 100) * grams;
			baseFat = (food.fat / 100) * grams;
			baseFiber = ((food.fiber ?? 0) / 100) * grams;
			baseSugar = ((food.sugar ?? 0) / 100) * grams;
			baseSodium = ((food.sodium ?? 0) / 100) * grams;
		} else if (entry.customGrams) {
			baseCalories = (food.calories / 100) * entry.customGrams;
			baseProtein = (food.protein / 100) * entry.customGrams;
			baseCarbs = (food.carbs / 100) * entry.customGrams;
			baseFat = (food.fat / 100) * entry.customGrams;
			baseFiber = ((food.fiber ?? 0) / 100) * entry.customGrams;
			baseSugar = ((food.sugar ?? 0) / 100) * entry.customGrams;
			baseSodium = ((food.sodium ?? 0) / 100) * entry.customGrams;
		} else {
			baseCalories = food.calories;
			baseProtein = food.protein;
			baseCarbs = food.carbs;
			baseFat = food.fat;
			baseFiber = food.fiber ?? 0;
			baseSugar = food.sugar ?? 0;
			baseSodium = food.sodium ?? 0;
		}

		await db.update(foodEntries)
			.set({
				quantity,
				calories: baseCalories * quantity,
				protein: baseProtein * quantity,
				carbs: baseCarbs * quantity,
				fat: baseFat * quantity,
				fiber: baseFiber * quantity,
				sugar: baseSugar * quantity,
				sodium: baseSodium * quantity,
			})
			.where(eq(foodEntries.id, entryId));

		return { success: true };
	},

	// Quick-add a custom food
	quickAddFood: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const calories = parseFloat(data.get('calories') as string);
		const protein = parseFloat(data.get('protein') as string) || 0;
		const carbs = parseFloat(data.get('carbs') as string) || 0;
		const fat = parseFloat(data.get('fat') as string) || 0;

		if (!name || isNaN(calories)) {
			return fail(400, { error: 'Name and calories are required' });
		}

		const now = new Date().toISOString();

		const result = await db.insert(foods).values({
			name,
			calories,
			protein,
			carbs,
			fat,
			source: 'custom',
			createdAt: now,
			updatedAt: now
		}).returning({ id: foods.id });

		return { success: true, foodId: result[0].id };
	},

	// Update daily targets
	updateTarget: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string;
		const calories = parseInt(data.get('calories') as string);
		const protein = parseInt(data.get('protein') as string);
		const carbs = parseInt(data.get('carbs') as string);
		const fat = parseInt(data.get('fat') as string);

		if (!date || isNaN(calories)) {
			return fail(400, { error: 'Date and calories are required' });
		}

		// Upsert target
		const existing = await db.query.dailyTargets.findFirst({
			where: eq(dailyTargets.date, date)
		});

		if (existing) {
			await db.update(dailyTargets)
				.set({ calories, protein, carbs, fat })
				.where(eq(dailyTargets.date, date));
		} else {
			await db.insert(dailyTargets).values({
				date,
				calories,
				protein,
				carbs,
				fat,
				source: 'manual'
			});
		}

		return { success: true };
	},

	// Copy all entries from the previous day
	copyPreviousDay: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string;

		if (!date) {
			return fail(400, { error: 'Date is required' });
		}

		// Calculate previous day
		const prev = new Date(date);
		prev.setDate(prev.getDate() - 1);
		const prevDate = prev.toISOString().split('T')[0];

		// Get previous day's entries
		const prevEntries = await db.query.foodEntries.findMany({
			where: eq(foodEntries.date, prevDate)
		});

		if (prevEntries.length === 0) {
			return fail(400, { error: 'No entries found for the previous day' });
		}

		const now = new Date().toISOString();

		// Copy each entry to the current date
		for (const entry of prevEntries) {
			await db.insert(foodEntries).values({
				date,
				foodId: entry.foodId,
				mealTypeId: entry.mealTypeId,
				servingId: entry.servingId,
				quantity: entry.quantity,
				customGrams: entry.customGrams,
				calories: entry.calories,
				protein: entry.protein,
				carbs: entry.carbs,
				fat: entry.fat,
				fiber: entry.fiber,
				sugar: entry.sugar,
				sodium: entry.sodium,
				loggedAt: now,
				createdAt: now
			});
		}

		return { success: true, copied: prevEntries.length };
	},

	editFood: async ({ request }) => {
		const data = await request.formData();
		const foodId = parseInt(data.get('foodId') as string);
		const name = data.get('name') as string;
		const calories = parseFloat(data.get('calories') as string);
		const protein = parseFloat(data.get('protein') as string) || 0;
		const carbs = parseFloat(data.get('carbs') as string) || 0;
		const fat = parseFloat(data.get('fat') as string) || 0;

		if (!foodId || !name || isNaN(calories)) {
			return fail(400, { error: 'Food ID, name, and calories are required' });
		}

		await db.update(foods)
			.set({ name, calories, protein, carbs, fat, updatedAt: new Date().toISOString() })
			.where(eq(foods.id, foodId));

		return { success: true };
	},

	deleteFood: async ({ request }) => {
		const data = await request.formData();
		const foodId = parseInt(data.get('foodId') as string);

		if (!foodId) return fail(400, { error: 'Food ID is required' });

		// Delete associated entries first
		await db.delete(foodEntries).where(eq(foodEntries.foodId, foodId));
		await db.delete(foods).where(eq(foods.id, foodId));

		return { success: true };
	}
};
