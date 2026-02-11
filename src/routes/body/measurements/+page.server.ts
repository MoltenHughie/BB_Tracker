import { db } from '$lib/server/db';
import { measurementTypes, bodyMeasurements } from '$lib/server/db/schema';
import { desc, eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const types = await db.query.measurementTypes.findMany({
		orderBy: asc(measurementTypes.sortOrder)
	});

	const typeData = [];
	for (const type of types) {
		const history = await db.query.bodyMeasurements.findMany({
			where: eq(bodyMeasurements.measurementTypeId, type.id),
			orderBy: desc(bodyMeasurements.date),
			limit: 30
		});
		if (history.length > 0) {
			const latest = history[0];
			const oldest = history[history.length - 1];
			const change = latest.value - oldest.value;
			typeData.push({
				type,
				history: history.map(h => ({ date: h.date, value: h.value })),
				latest: latest.value,
				change,
				entries: history.length
			});
		}
	}

	return { typeData };
};
