import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, foodEntries } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';

export async function GET({ url }) {
	const date = url.searchParams.get('date');
	if (!date) return json({ error: 'date is required' }, { status: 400 });

	const entries = await db.query.foodEntries.findMany({
		where: eq(foodEntries.date, date),
		with: { food: true, serving: true, mealType: true },
		orderBy: [asc(foodEntries.mealTypeId), desc(foodEntries.loggedAt)]
	});

	return json(entries);
}

export async function POST({ request }) {
	const body = await request.json();
	const date = body.date as string;
	const foodId = Number(body.foodId);
	const mealTypeId = body.mealTypeId != null ? Number(body.mealTypeId) : null;
	const servingId = body.servingId != null ? Number(body.servingId) : null;
	const quantity = body.quantity != null ? Number(body.quantity) : 1;
	const customGrams = body.customGrams != null ? Number(body.customGrams) : null;

	if (!date) return json({ error: 'date is required' }, { status: 400 });
	if (!foodId || Number.isNaN(foodId)) return json({ error: 'foodId is required' }, { status: 400 });

	const food = await db.query.foods.findFirst({ where: eq(foods.id, foodId), with: { servings: true } });
	if (!food) return json({ error: 'Food not found' }, { status: 404 });

	let grams: number;
	if (customGrams) {
		grams = customGrams;
	} else if (servingId) {
		const serving = food.servings.find((s) => s.id === servingId);
		grams = serving ? serving.grams * quantity : 100 * quantity;
	} else {
		grams = 100 * quantity;
	}

	const multiplier = grams / 100;
	const now = new Date().toISOString();

	const inserted = await db.insert(foodEntries).values({
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
	}).returning({ id: foodEntries.id });

	return json({ success: true, entryId: inserted?.[0]?.id });
}
