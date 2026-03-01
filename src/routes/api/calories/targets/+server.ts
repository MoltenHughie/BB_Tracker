import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dailyTargets } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET({ url }) {
	const date = url.searchParams.get('date');
	if (!date) return json(null);

	const target = (await db.query.dailyTargets.findFirst({ where: eq(dailyTargets.date, date) }))
		?? (await db.query.dailyTargets.findFirst({ orderBy: desc(dailyTargets.date) }));
	return json(target ?? null);
}

export async function POST({ request }) {
	const body = await request.json();
	const date = body.date as string;
	if (!date) return json({ error: 'date is required' }, { status: 400 });

	const payload = {
		date,
		calories: Number(body.calories),
		protein: Number(body.protein),
		carbs: Number(body.carbs),
		fat: Number(body.fat),
		fiber: body.fiber != null ? Number(body.fiber) : null,
		source: body.source ?? 'manual',
		note: body.note ?? null
	};

	// SQLite upsert by unique date: delete+insert for simplicity
	await db.delete(dailyTargets).where(eq(dailyTargets.date, date));
	const inserted = await db.insert(dailyTargets).values(payload).returning();
	return json(inserted[0]);
}
