import { db } from '$lib/server/db';
import { foods, foodEntries, foodServings } from '$lib/server/db/schema';
import { eq, desc, sql, like } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') ?? '';
	const source = url.searchParams.get('source') ?? 'all';

	let query = db.select({
		id: foods.id,
		name: foods.name,
		brand: foods.brand,
		calories: foods.calories,
		protein: foods.protein,
		carbs: foods.carbs,
		fat: foods.fat,
		source: foods.source,
		barcode: foods.barcode,
		createdAt: foods.createdAt,
		updatedAt: foods.updatedAt,
		usageCount: sql<number>`(SELECT COUNT(*) FROM food_entries WHERE food_entries.food_id = foods.id)`.as('usage_count')
	}).from(foods).$dynamic();

	if (search) {
		query = query.where(like(foods.name, `%${search}%`));
	}
	if (source !== 'all') {
		query = query.where(eq(foods.source, source));
	}

	const allFoods = await query.orderBy(desc(foods.updatedAt));

	// Load servings for all returned food IDs
	const foodIds = allFoods.map(f => f.id);
	const servings = foodIds.length > 0
		? await db.select().from(foodServings).where(
			sql`${foodServings.foodId} IN (${sql.join(foodIds.map(id => sql`${id}`), sql`, `)})`
		)
		: [];

	const servingsByFood = new Map<number, typeof servings>();
	for (const s of servings) {
		const arr = servingsByFood.get(s.foodId) ?? [];
		arr.push(s);
		servingsByFood.set(s.foodId, arr);
	}

	const foodsWithServings = allFoods.map(f => ({
		...f,
		servings: servingsByFood.get(f.id) ?? []
	}));

	return { foods: foodsWithServings, search, source };
};

export const actions: Actions = {
	editFood: async ({ request }) => {
		const data = await request.formData();
		const foodId = parseInt(data.get('foodId') as string);
		const name = data.get('name') as string;
		const brand = data.get('brand') as string || null;
		const calories = parseFloat(data.get('calories') as string);
		const protein = parseFloat(data.get('protein') as string) || 0;
		const carbs = parseFloat(data.get('carbs') as string) || 0;
		const fat = parseFloat(data.get('fat') as string) || 0;
		const fiber = parseFloat(data.get('fiber') as string) || null;
		const sugar = parseFloat(data.get('sugar') as string) || null;
		const sodium = parseFloat(data.get('sodium') as string) || null;

		if (!foodId || !name || isNaN(calories)) {
			return fail(400, { error: 'Name and calories are required' });
		}

		await db.update(foods)
			.set({ name, brand, calories, protein, carbs, fat, fiber, sugar, sodium, updatedAt: new Date().toISOString() })
			.where(eq(foods.id, foodId));

		return { success: true };
	},

	deleteFood: async ({ request }) => {
		const data = await request.formData();
		const foodId = parseInt(data.get('foodId') as string);
		if (!foodId) return fail(400, { error: 'Food ID required' });

		// Delete associated entries first
		await db.delete(foodEntries).where(eq(foodEntries.foodId, foodId));
		await db.delete(foods).where(eq(foods.id, foodId));

		return { success: true };
	},

	addServing: async ({ request }) => {
		const data = await request.formData();
		const foodId = parseInt(data.get('foodId') as string);
		const name = data.get('name') as string;
		const grams = parseFloat(data.get('grams') as string);

		if (!foodId || !name || isNaN(grams) || grams <= 0) {
			return fail(400, { error: 'Food ID, name, and grams are required' });
		}

		await db.insert(foodServings).values({ foodId, name, grams });
		return { success: true };
	},

	deleteServing: async ({ request }) => {
		const data = await request.formData();
		const servingId = parseInt(data.get('servingId') as string);
		if (!servingId) return fail(400, { error: 'Serving ID required' });

		await db.delete(foodServings).where(eq(foodServings.id, servingId));
		return { success: true };
	},

	addFood: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const brand = data.get('brand') as string || null;
		const calories = parseFloat(data.get('calories') as string);
		const protein = parseFloat(data.get('protein') as string) || 0;
		const carbs = parseFloat(data.get('carbs') as string) || 0;
		const fat = parseFloat(data.get('fat') as string) || 0;

		if (!name || isNaN(calories)) {
			return fail(400, { error: 'Name and calories are required' });
		}

		const now = new Date().toISOString();
		await db.insert(foods).values({
			name, brand, calories, protein, carbs, fat,
			source: 'custom', createdAt: now, updatedAt: now
		});

		return { success: true };
	}
};
