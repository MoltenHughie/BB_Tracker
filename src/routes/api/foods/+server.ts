import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
	const allFoods = await db.query.foods.findMany({
		with: { servings: true },
		orderBy: asc(foods.name)
	});
	return json(allFoods);
}

export async function POST({ request }) {
	const body = await request.json();
	const now = new Date().toISOString();

	// minimal upsert: if id present, update; else insert
	const id = body.id != null ? Number(body.id) : null;
	if (id) {
		await db.update(foods).set({
			name: body.name,
			brand: body.brand ?? null,
			barcode: body.barcode ?? null,
			source: body.source ?? 'custom',
			calories: Number(body.calories),
			protein: Number(body.protein),
			carbs: Number(body.carbs),
			fat: Number(body.fat),
			fiber: body.fiber ?? null,
			sugar: body.sugar ?? null,
			sodium: body.sodium ?? null,
			updatedAt: now
		}).where(eq(foods.id, id));
		const updated = await db.query.foods.findFirst({ where: eq(foods.id, id), with: { servings: true } });
		return json(updated);
	}

	const inserted = await db.insert(foods).values({
		name: body.name,
		brand: body.brand ?? null,
		barcode: body.barcode ?? null,
		source: body.source ?? 'custom',
		calories: Number(body.calories),
		protein: Number(body.protein),
		carbs: Number(body.carbs),
		fat: Number(body.fat),
		fiber: body.fiber ?? null,
		sugar: body.sugar ?? null,
		sodium: body.sodium ?? null,
		createdAt: now,
		updatedAt: now
	}).returning({ id: foods.id });

	const created = await db.query.foods.findFirst({ where: eq(foods.id, inserted[0].id), with: { servings: true } });
	return json(created);
}
