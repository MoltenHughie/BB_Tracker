import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const row = await db.query.appSettings.findFirst({
		where: eq(appSettings.key, 'unit_system')
	});

	const unitSystem = row?.value === 'imperial' ? 'imperial' : 'metric';

	return {
		unitSystem
	};
};
