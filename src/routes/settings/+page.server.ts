import { db } from '$lib/server/db';
import {
	foods, foodEntries, dailyTargets, mealTypes,
	exercises, workoutTemplates, templateExercises, workouts, workoutSets, personalRecords,
	supplements, supplementSchedules, supplementLogs,
	bodyWeights, bodyMeasurements, measurementTypes, bodyComposition, bodyPhotos,
	appSettings
} from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
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

	return {
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
	}
};
