import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, foodEntries } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH({ params, request }) {
	const id = Number(params.id);
	if (!id || Number.isNaN(id)) return json({ error: 'invalid id' }, { status: 400 });
	const body = await request.json();
	const quantity = Number(body.quantity);
	if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
		return json({ error: 'quantity must be > 0' }, { status: 400 });
	}

	const entry = await db.query.foodEntries.findFirst({
		where: eq(foodEntries.id, id),
		with: { food: true, serving: true }
	});
	if (!entry || !entry.food) return json({ error: 'Entry not found' }, { status: 404 });

	const food = entry.food;
	let baseGrams = 100;
	if (entry.serving) {
		baseGrams = entry.serving.grams ?? 100;
	} else if (entry.customGrams) {
		baseGrams = entry.customGrams;
	}
	const grams = baseGrams * quantity;
	const multiplier = grams / 100;

	await db.update(foodEntries)
		.set({
			quantity,
			calories: food.calories * multiplier,
			protein: food.protein * multiplier,
			carbs: food.carbs * multiplier,
			fat: food.fat * multiplier,
			fiber: (food.fiber ?? 0) * multiplier,
			sugar: (food.sugar ?? 0) * multiplier,
			sodium: (food.sodium ?? 0) * multiplier
		})
		.where(eq(foodEntries.id, id));

	return json({ success: true });
}

export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!id || Number.isNaN(id)) return json({ error: 'invalid id' }, { status: 400 });
	await db.delete(foodEntries).where(eq(foodEntries.id, id));
	return json({ success: true });
}
