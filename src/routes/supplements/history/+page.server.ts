import { db } from '$lib/server/db';
import { supplementLogs, supplements } from '$lib/server/db/schema';
import { desc, gte, lte, and, eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Last 30 days of supplement logs
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
	const today = new Date().toISOString().split('T')[0];

	const logs = await db.query.supplementLogs.findMany({
		where: and(
			gte(supplementLogs.date, thirtyDaysAgo.toISOString().split('T')[0]),
			lte(supplementLogs.date, today)
		),
		with: { supplement: true },
		orderBy: desc(supplementLogs.date)
	});

	// Group by date
	const dateMap = new Map<string, { supplement: string; time: string | null; dosage: string | null }[]>();
	for (const log of logs) {
		const items = dateMap.get(log.date) ?? [];
		items.push({
			supplement: log.supplement?.name ?? 'Unknown',
			time: log.takenAt,
			dosage: log.dose ? `${log.dose}` : null
		});
		dateMap.set(log.date, items);
	}

	const days = [...dateMap.entries()]
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([date, items]) => ({ date, items, count: items.length }));

	// Per-supplement adherence (last 30 days)
	const allSupps = await db.query.supplements.findMany();
	const suppStats = allSupps.map(s => {
		const suppLogs = logs.filter(l => l.supplementId === s.id);
		const uniqueDays = new Set(suppLogs.map(l => l.date)).size;
		return {
			name: s.name,
			category: s.category,
			daysTaken: uniqueDays,
			totalDoses: suppLogs.length
		};
	}).filter(s => s.totalDoses > 0)
	  .sort((a, b) => b.daysTaken - a.daysTaken);

	return { days, suppStats, totalDays: days.length };
};
