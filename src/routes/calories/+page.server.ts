import { db } from '$lib/server/db';
import { 
	foods, 
	foodServings, 
	foodEntries, 
	mealTypes, 
	dailyTargets 
} from '$lib/server/db/schema';
import { eq, and, desc, asc, like } from 'drizzle-orm';
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

	// Calculate totals
	const totals = entries.reduce(
		(acc, entry) => ({
			calories: acc.calories + (entry.calories || 0),
			protein: acc.protein + (entry.protein || 0),
			carbs: acc.carbs + (entry.carbs || 0),
			fat: acc.fat + (entry.fat || 0)
		}),
		{ calories: 0, protein: 0, carbs: 0, fat: 0 }
	);

	return {
		date,
		target,
		meals,
		entries,
		allFoods,
		totals
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
	}
};
