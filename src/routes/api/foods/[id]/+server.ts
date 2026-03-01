import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
	const id = Number(params.id);
	if (!id || Number.isNaN(id)) return json({ error: 'invalid id' }, { status: 400 });
	const food = await db.query.foods.findFirst({ where: eq(foods.id, id), with: { servings: true } });
	if (!food) return json({ error: 'not found' }, { status: 404 });
	return json(food);
}

export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!id || Number.isNaN(id)) return json({ error: 'invalid id' }, { status: 400 });
	await db.delete(foods).where(eq(foods.id, id));
	return json({ success: true });
}
