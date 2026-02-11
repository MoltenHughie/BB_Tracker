import { db, sqlite } from '$lib/server/db';
import {
	foods, foodEntries, dailyTargets, mealTypes,
	exercises, workoutTemplates, templateExercises, workouts, workoutSets, personalRecords,
	supplements, supplementSchedules, supplementLogs,
	bodyWeights, bodyMeasurements, measurementTypes, bodyComposition, bodyPhotos,
	appSettings
} from '$lib/server/db/schema';
import { count, eq, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	// Gather stats
	const [
		foodCount, entryCount, workoutCount, setCount,
		exerciseCount, suppCount, logCount, weightCount, measurementCount
	] = await Promise.all([
		db.select({ c: count() }).from(foods).then(r => r[0].c),
		db.select({ c: count() }).from(foodEntries).then(r => r[0].c),
		db.select({ c: count() }).from(workouts).then(r => r[0].c),
		db.select({ c: count() }).from(workoutSets).then(r => r[0].c),
		db.select({ c: count() }).from(exercises).then(r => r[0].c),
		db.select({ c: count() }).from(supplements).then(r => r[0].c),
		db.select({ c: count() }).from(supplementLogs).then(r => r[0].c),
		db.select({ c: count() }).from(bodyWeights).then(r => r[0].c),
		db.select({ c: count() }).from(bodyMeasurements).then(r => r[0].c),
	]);

	const allMealTypes = await db.select().from(mealTypes).orderBy(asc(mealTypes.sortOrder));

	const units = await db.query.appSettings.findFirst({
		where: eq(appSettings.key, 'unit_system')
	});

	return {
		mealTypes: allMealTypes,
		unitSystem: units?.value === 'imperial' ? 'imperial' : 'metric',
		stats: {
			foods: foodCount,
			foodEntries: entryCount,
			workouts: workoutCount,
			sets: setCount,
			exercises: exerciseCount,
			supplements: suppCount,
			supplementLogs: logCount,
			weights: weightCount,
			measurements: measurementCount
		}
	};
};

export const actions: Actions = {
	exportData: async () => {
		const data = {
			exportedAt: new Date().toISOString(),
			version: '1.0',
			foods: await db.select().from(foods),
			foodEntries: await db.select().from(foodEntries),
			dailyTargets: await db.select().from(dailyTargets),
			mealTypes: await db.select().from(mealTypes),
			exercises: await db.select().from(exercises),
			workoutTemplates: await db.select().from(workoutTemplates),
			templateExercises: await db.select().from(templateExercises),
			workouts: await db.select().from(workouts),
			workoutSets: await db.select().from(workoutSets),
			personalRecords: await db.select().from(personalRecords),
			supplements: await db.select().from(supplements),
			supplementSchedules: await db.select().from(supplementSchedules),
			supplementLogs: await db.select().from(supplementLogs),
			bodyWeights: await db.select().from(bodyWeights),
			bodyMeasurements: await db.select().from(bodyMeasurements),
			measurementTypes: await db.select().from(measurementTypes),
			bodyComposition: await db.select().from(bodyComposition),
			bodyPhotos: await db.select().from(bodyPhotos),
			appSettings: await db.select().from(appSettings)
		};

		return { exportJson: JSON.stringify(data, null, 2) };
	},

	addMealType: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const icon = data.get('icon') as string || '🍽️';
		const sortOrder = parseInt(data.get('sortOrder') as string) || 99;

		if (!name) return fail(400, { error: 'Name is required' });

		await db.insert(mealTypes).values({ name, icon, sortOrder }).onConflictDoNothing();
		return { success: true };
	},

	deleteMealType: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string);
		if (!id) return fail(400, { error: 'ID required' });

		// Nullify references in food entries
		await db.update(foodEntries).set({ mealTypeId: null }).where(eq(foodEntries.mealTypeId, id));
		await db.delete(mealTypes).where(eq(mealTypes.id, id));
		return { success: true };
	},

	editMealType: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string);
		const name = data.get('name') as string;
		const icon = data.get('icon') as string || '🍽️';
		const sortOrder = parseInt(data.get('sortOrder') as string) || 99;

		if (!id || !name) return fail(400, { error: 'ID and name required' });

		await db.update(mealTypes).set({ name, icon, sortOrder }).where(eq(mealTypes.id, id));
		return { success: true };
	},

	exportCaloriesCSV: async () => {
		const entries = await db.select({
			date: foodEntries.date,
			foodName: foods.name,
			quantity: foodEntries.quantity,
			calories: foodEntries.calories,
			protein: foodEntries.protein,
			carbs: foodEntries.carbs,
			fat: foodEntries.fat,
		}).from(foodEntries)
			.leftJoin(foods, eq(foodEntries.foodId, foods.id))
			.orderBy(asc(foodEntries.date));

		const rows = entries.map(e => [
			e.date,
			`"${(e.foodName ?? '').replace(/"/g, '""')}"`,
			e.quantity ?? 1,
			Math.round(e.calories ?? 0),
			Math.round((e.protein ?? 0) * 10) / 10,
			Math.round((e.carbs ?? 0) * 10) / 10,
			Math.round((e.fat ?? 0) * 10) / 10
		].join(','));
		const csv = ['date,food,quantity,calories,protein_g,carbs_g,fat_g', ...rows].join('\n');
		return { csvData: csv, csvName: `bb-calories-${new Date().toISOString().split('T')[0]}.csv` };
	},

	exportTrainingCSV: async () => {
		const sets = await db.select({
			date: workouts.startedAt,
			workoutName: workouts.name,
			exerciseName: exercises.name,
			setNumber: workoutSets.setNumber,
			setType: workoutSets.setType,
			weight: workoutSets.weight,
			reps: workoutSets.reps,
		}).from(workoutSets)
			.leftJoin(workouts, eq(workoutSets.workoutId, workouts.id))
			.leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
			.orderBy(asc(workouts.startedAt), asc(workoutSets.setNumber));

		const rows = sets.map(s => [
			s.date ? s.date.split('T')[0] : '',
			`"${(s.workoutName ?? '').replace(/"/g, '""')}"`,
			`"${(s.exerciseName ?? '').replace(/"/g, '""')}"`,
			s.setNumber,
			s.setType ?? 'working',
			s.weight ?? '',
			s.reps ?? ''
		].join(','));
		const csv = ['date,workout,exercise,set_number,set_type,weight_kg,reps', ...rows].join('\n');
		return { csvData: csv, csvName: `bb-training-${new Date().toISOString().split('T')[0]}.csv` };
	},

	setUnitSystem: async ({ request }) => {
		const data = await request.formData();
		const unitSystem = data.get('unitSystem') === 'imperial' ? 'imperial' : 'metric';

		const now = new Date().toISOString();
		await db
			.insert(appSettings)
			.values({ key: 'unit_system', value: unitSystem, updatedAt: now })
			.onConflictDoUpdate({
				target: appSettings.key,
				set: { value: unitSystem, updatedAt: now }
			});

		return { success: true };
	},

	importData: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('backup');
		if (!(file instanceof File)) return fail(400, { error: 'Missing backup file.' });

		let payload: any;
		try {
			payload = JSON.parse(await file.text());
		} catch {
			return fail(400, { error: 'Invalid JSON file.' });
		}

		if (!payload || typeof payload !== 'object') return fail(400, { error: 'Invalid backup payload.' });
		if (payload.version !== '1.0') return fail(400, { error: `Unsupported backup version: ${String(payload.version)}` });

		const tx = sqlite.transaction(() => {
			// Be permissive: restore should work even if foreign key relationships changed slightly.
			sqlite.exec('PRAGMA foreign_keys = OFF;');

			// Clear (children first not required with FK off)
			db.delete(workoutSets).run();
			db.delete(workouts).run();
			db.delete(templateExercises).run();
			db.delete(workoutTemplates).run();
			db.delete(personalRecords).run();
			db.delete(exercises).run();

			db.delete(foodEntries).run();
			db.delete(dailyTargets).run();
			db.delete(mealTypes).run();
			db.delete(foods).run();

			db.delete(supplementLogs).run();
			db.delete(supplementSchedules).run();
			db.delete(supplements).run();

			db.delete(bodyPhotos).run();
			db.delete(bodyMeasurements).run();
			db.delete(measurementTypes).run();
			db.delete(bodyComposition).run();
			db.delete(bodyWeights).run();

			db.delete(appSettings).run();

			// Insert (parents first where possible)
			const insertMany = (table: any, rows: any) => {
				if (!Array.isArray(rows) || rows.length === 0) return;
				db.insert(table).values(rows as any).run();
			};

			insertMany(foods, payload.foods);
			insertMany(mealTypes, payload.mealTypes);
			insertMany(dailyTargets, payload.dailyTargets);
			insertMany(foodEntries, payload.foodEntries);

			insertMany(exercises, payload.exercises);
			insertMany(workoutTemplates, payload.workoutTemplates);
			insertMany(templateExercises, payload.templateExercises);
			insertMany(workouts, payload.workouts);
			insertMany(workoutSets, payload.workoutSets);
			insertMany(personalRecords, payload.personalRecords);

			insertMany(supplements, payload.supplements);
			insertMany(supplementSchedules, payload.supplementSchedules);
			insertMany(supplementLogs, payload.supplementLogs);

			insertMany(measurementTypes, payload.measurementTypes);
			insertMany(bodyWeights, payload.bodyWeights);
			insertMany(bodyMeasurements, payload.bodyMeasurements);
			insertMany(bodyComposition, payload.bodyComposition);
			insertMany(bodyPhotos, payload.bodyPhotos);

			insertMany(appSettings, payload.appSettings);

			sqlite.exec('PRAGMA foreign_keys = ON;');
		});

		try {
			tx();
		} catch (e: any) {
			return fail(500, { error: `Import failed: ${e?.message ?? String(e)}` });
		}

		return { success: true };
	}
};
