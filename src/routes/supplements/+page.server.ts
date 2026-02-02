import { db } from '$lib/server/db';
import { 
	supplements, 
	supplementSchedules, 
	supplementLogs 
} from '$lib/server/db/schema';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get date from query param or default to today
	const dateParam = url.searchParams.get('date');
	const today = new Date().toISOString().split('T')[0];
	const date = dateParam || today;
	
	// Get current day of week (0 = Sunday)
	const dayOfWeek = new Date(date).getDay();

	// Get all supplements with their schedules
	const allSupplements = await db.query.supplements.findMany({
		with: {
			schedules: true
		},
		orderBy: [asc(supplements.category), asc(supplements.name)]
	});

	// Get today's logs
	const todayLogs = await db.query.supplementLogs.findMany({
		where: eq(supplementLogs.date, date),
		with: {
			supplement: true,
			schedule: true
		},
		orderBy: desc(supplementLogs.takenAt)
	});

	// Build today's schedule - filter schedules that apply to today
	const todaySchedule = allSupplements.flatMap(supp => {
		return supp.schedules
			.filter(sched => {
				if (!sched.isActive) return false;
				if (sched.daysOfWeek) {
					try {
						const days = JSON.parse(sched.daysOfWeek) as number[];
						return days.includes(dayOfWeek);
					} catch {
						return true; // If parsing fails, assume every day
					}
				}
				return true; // No days specified = every day
			})
			.map(sched => {
				// Check if this schedule has been logged today
				const logged = todayLogs.find(log => log.scheduleId === sched.id);
				return {
					schedule: sched,
					supplement: supp,
					logged: !!logged,
					logId: logged?.id ?? null,
					loggedAt: logged?.takenAt ?? null
				};
			});
	}).sort((a, b) => {
		// Sort by scheduled time, then by time of day
		const timeOrder: Record<string, number> = {
			'morning': 0,
			'noon': 1,
			'preworkout': 2,
			'postworkout': 3,
			'evening': 4,
			'night': 5
		};
		const aTime = a.schedule.scheduledTime || '';
		const bTime = b.schedule.scheduledTime || '';
		const aOrder = timeOrder[a.schedule.timeOfDay || ''] ?? 2;
		const bOrder = timeOrder[b.schedule.timeOfDay || ''] ?? 2;
		
		if (aTime && bTime) return aTime.localeCompare(bTime);
		return aOrder - bOrder;
	});

	// Get recent logs (last 7 days)
	const weekAgo = new Date(date);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const weekAgoStr = weekAgo.toISOString().split('T')[0];

	const recentLogs = await db.query.supplementLogs.findMany({
		where: and(
			gte(supplementLogs.date, weekAgoStr),
			lte(supplementLogs.date, date)
		),
		with: {
			supplement: true,
			schedule: true
		},
		orderBy: desc(supplementLogs.takenAt),
		limit: 50
	});

	// Categories for filtering
	const categories = [...new Set(allSupplements.map(s => s.category).filter(Boolean))].sort();

	return {
		date,
		todaySchedule,
		todayLogs,
		allSupplements,
		recentLogs,
		categories
	};
};

export const actions: Actions = {
	// Log a supplement intake (from schedule or manual)
	logIntake: async ({ request }) => {
		const data = await request.formData();
		const supplementId = parseInt(data.get('supplementId') as string);
		const scheduleId = data.get('scheduleId') ? parseInt(data.get('scheduleId') as string) : null;
		const date = data.get('date') as string;
		const dose = parseFloat(data.get('dose') as string) || 1;
		const notes = data.get('notes') as string || null;

		if (!supplementId || isNaN(supplementId)) {
			return fail(400, { error: 'Supplement is required' });
		}

		const now = new Date().toISOString();

		await db.insert(supplementLogs).values({
			supplementId,
			scheduleId,
			date,
			dose,
			takenAt: now,
			notes,
			createdAt: now
		});

		return { success: true };
	},

	// Delete a log entry (undo)
	deleteLog: async ({ request }) => {
		const data = await request.formData();
		const logId = parseInt(data.get('logId') as string);

		if (!logId || isNaN(logId)) {
			return fail(400, { error: 'Log ID is required' });
		}

		await db.delete(supplementLogs).where(eq(supplementLogs.id, logId));
		return { success: true };
	},

	// Add a new supplement
	addSupplement: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const brand = data.get('brand') as string || null;
		const category = data.get('category') as string || null;
		const form = data.get('form') as string || null;
		const servingSize = data.get('servingSize') as string || null;
		const concentration = data.get('concentration') as string || null;
		const isPed = data.get('isPed') === 'true';
		const isRx = data.get('isRx') === 'true';
		const notes = data.get('notes') as string || null;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		const now = new Date().toISOString();

		const result = await db.insert(supplements).values({
			name,
			brand,
			category,
			form,
			servingSize,
			concentration,
			isPed,
			isRx,
			notes,
			createdAt: now,
			updatedAt: now
		}).returning({ id: supplements.id });

		return { success: true, supplementId: result[0].id };
	},

	// Update a supplement
	updateSupplement: async ({ request }) => {
		const data = await request.formData();
		const supplementId = parseInt(data.get('supplementId') as string);
		const name = data.get('name') as string;
		const brand = data.get('brand') as string || null;
		const category = data.get('category') as string || null;
		const form = data.get('form') as string || null;
		const servingSize = data.get('servingSize') as string || null;
		const concentration = data.get('concentration') as string || null;
		const isPed = data.get('isPed') === 'true';
		const isRx = data.get('isRx') === 'true';
		const notes = data.get('notes') as string || null;

		if (!supplementId || isNaN(supplementId)) {
			return fail(400, { error: 'Supplement ID is required' });
		}

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		const now = new Date().toISOString();

		await db.update(supplements)
			.set({
				name,
				brand,
				category,
				form,
				servingSize,
				concentration,
				isPed,
				isRx,
				notes,
				updatedAt: now
			})
			.where(eq(supplements.id, supplementId));

		return { success: true };
	},

	// Delete a supplement
	deleteSupplement: async ({ request }) => {
		const data = await request.formData();
		const supplementId = parseInt(data.get('supplementId') as string);

		if (!supplementId || isNaN(supplementId)) {
			return fail(400, { error: 'Supplement ID is required' });
		}

		// Cascade will handle schedules and logs
		await db.delete(supplements).where(eq(supplements.id, supplementId));
		return { success: true };
	},

	// Add a schedule for a supplement
	addSchedule: async ({ request }) => {
		const data = await request.formData();
		const supplementId = parseInt(data.get('supplementId') as string);
		const name = data.get('name') as string || null;
		const timeOfDay = data.get('timeOfDay') as string || null;
		const scheduledTime = data.get('scheduledTime') as string || null;
		const daysOfWeek = data.get('daysOfWeek') as string || null; // JSON array
		const dose = parseFloat(data.get('dose') as string) || 1;
		const withFood = data.get('withFood') === 'true';
		const notes = data.get('notes') as string || null;

		if (!supplementId || isNaN(supplementId)) {
			return fail(400, { error: 'Supplement is required' });
		}

		const now = new Date().toISOString();

		await db.insert(supplementSchedules).values({
			supplementId,
			name,
			timeOfDay,
			scheduledTime,
			daysOfWeek,
			dose,
			withFood,
			notes,
			isActive: true,
			createdAt: now,
			updatedAt: now
		});

		return { success: true };
	},

	// Update a schedule
	updateSchedule: async ({ request }) => {
		const data = await request.formData();
		const scheduleId = parseInt(data.get('scheduleId') as string);
		const name = data.get('name') as string || null;
		const timeOfDay = data.get('timeOfDay') as string || null;
		const scheduledTime = data.get('scheduledTime') as string || null;
		const daysOfWeek = data.get('daysOfWeek') as string || null;
		const dose = parseFloat(data.get('dose') as string) || 1;
		const withFood = data.get('withFood') === 'true';
		const notes = data.get('notes') as string || null;
		const isActive = data.get('isActive') !== 'false';

		if (!scheduleId || isNaN(scheduleId)) {
			return fail(400, { error: 'Schedule ID is required' });
		}

		const now = new Date().toISOString();

		await db.update(supplementSchedules)
			.set({
				name,
				timeOfDay,
				scheduledTime,
				daysOfWeek,
				dose,
				withFood,
				notes,
				isActive,
				updatedAt: now
			})
			.where(eq(supplementSchedules.id, scheduleId));

		return { success: true };
	},

	// Delete a schedule
	deleteSchedule: async ({ request }) => {
		const data = await request.formData();
		const scheduleId = parseInt(data.get('scheduleId') as string);

		if (!scheduleId || isNaN(scheduleId)) {
			return fail(400, { error: 'Schedule ID is required' });
		}

		await db.delete(supplementSchedules).where(eq(supplementSchedules.id, scheduleId));
		return { success: true };
	},

	// Toggle schedule active status
	toggleSchedule: async ({ request }) => {
		const data = await request.formData();
		const scheduleId = parseInt(data.get('scheduleId') as string);
		const isActive = data.get('isActive') === 'true';

		if (!scheduleId || isNaN(scheduleId)) {
			return fail(400, { error: 'Schedule ID is required' });
		}

		const now = new Date().toISOString();

		await db.update(supplementSchedules)
			.set({ isActive, updatedAt: now })
			.where(eq(supplementSchedules.id, scheduleId));

		return { success: true };
	}
};
