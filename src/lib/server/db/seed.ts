/**
 * Database seed script - run with: npx tsx src/lib/server/db/seed.ts
 */
import { db } from './index';
import { 
	appSettings,
	mealTypes, 
	measurementTypes, 
	exercises,
	dailyTargets
} from './schema';

const now = new Date().toISOString();
const today = now.split('T')[0];

async function seed() {
	console.log('🌱 Seeding database...\n');

	// =========================================================================
	// App Settings (defaults)
	// =========================================================================
	console.log('📝 App settings...');
	const settings = [
		{ key: 'unit_system', value: 'metric' }, // 'metric' | 'imperial'
		{ key: 'weight_unit', value: 'kg' },
		{ key: 'height_unit', value: 'cm' },
		{ key: 'measurement_unit', value: 'cm' },
		{ key: 'default_rest_warmup', value: '60' },
		{ key: 'default_rest_working', value: '120' },
		{ key: 'default_rest_dropset', value: '30' },
		{ key: 'default_rest_failure', value: '180' },
	];
	for (const s of settings) {
		await db.insert(appSettings).values({ ...s, updatedAt: now }).onConflictDoNothing();
	}

	// =========================================================================
	// Meal Types
	// =========================================================================
	console.log('🍽️  Meal types...');
	const meals = [
		{ name: 'Breakfast', sortOrder: 1, icon: '🍳' },
		{ name: 'Morning Snack', sortOrder: 2, icon: '🥛' },
		{ name: 'Lunch', sortOrder: 3, icon: '🥗' },
		{ name: 'Afternoon Snack', sortOrder: 4, icon: '🍎' },
		{ name: 'Dinner', sortOrder: 5, icon: '🍝' },
		{ name: 'Evening Snack', sortOrder: 6, icon: '🍫' },
		{ name: 'Supplements', sortOrder: 7, icon: '💊' },
	];
	for (const m of meals) {
		await db.insert(mealTypes).values(m).onConflictDoNothing();
	}

	// =========================================================================
	// Measurement Types
	// =========================================================================
	console.log('📏 Measurement types...');
	const measurements = [
		{ name: 'Neck', sortOrder: 1, icon: '🦒' },
		{ name: 'Shoulders', sortOrder: 2, icon: '🏔️' },
		{ name: 'Chest', sortOrder: 3, icon: '🫁' },
		{ name: 'Biceps (L)', sortOrder: 4, icon: '💪' },
		{ name: 'Biceps (R)', sortOrder: 5, icon: '💪' },
		{ name: 'Forearms (L)', sortOrder: 6, icon: '🦾' },
		{ name: 'Forearms (R)', sortOrder: 7, icon: '🦾' },
		{ name: 'Waist', sortOrder: 8, icon: '⭕' },
		{ name: 'Hips', sortOrder: 9, icon: '🍑' },
		{ name: 'Thighs (L)', sortOrder: 10, icon: '🦵' },
		{ name: 'Thighs (R)', sortOrder: 11, icon: '🦵' },
		{ name: 'Calves (L)', sortOrder: 12, icon: '🦶' },
		{ name: 'Calves (R)', sortOrder: 13, icon: '🦶' },
	];
	for (const m of measurements) {
		await db.insert(measurementTypes).values({ ...m, unit: 'cm' }).onConflictDoNothing();
	}

	// =========================================================================
	// Default Exercises (common bodybuilding movements)
	// =========================================================================
	console.log('🏋️  Default exercises...');
	const exerciseList = [
		// Chest
		{ name: 'Bench Press (Barbell)', category: 'chest', equipment: 'barbell', muscleGroups: '["chest", "triceps", "shoulders"]' },
		{ name: 'Bench Press (Dumbbell)', category: 'chest', equipment: 'dumbbell', muscleGroups: '["chest", "triceps", "shoulders"]' },
		{ name: 'Incline Bench Press (Barbell)', category: 'chest', equipment: 'barbell', muscleGroups: '["chest", "shoulders"]' },
		{ name: 'Incline Bench Press (Dumbbell)', category: 'chest', equipment: 'dumbbell', muscleGroups: '["chest", "shoulders"]' },
		{ name: 'Decline Bench Press', category: 'chest', equipment: 'barbell', muscleGroups: '["chest", "triceps"]' },
		{ name: 'Chest Flyes (Dumbbell)', category: 'chest', equipment: 'dumbbell', muscleGroups: '["chest"]' },
		{ name: 'Cable Flyes', category: 'chest', equipment: 'cable', muscleGroups: '["chest"]' },
		{ name: 'Pec Deck', category: 'chest', equipment: 'machine', muscleGroups: '["chest"]' },
		{ name: 'Push-Ups', category: 'chest', equipment: 'bodyweight', muscleGroups: '["chest", "triceps", "shoulders"]' },
		{ name: 'Dips (Chest)', category: 'chest', equipment: 'bodyweight', muscleGroups: '["chest", "triceps"]' },
		
		// Back
		{ name: 'Deadlift (Conventional)', category: 'back', equipment: 'barbell', muscleGroups: '["back", "glutes", "hamstrings"]' },
		{ name: 'Deadlift (Sumo)', category: 'back', equipment: 'barbell', muscleGroups: '["back", "glutes", "hamstrings"]' },
		{ name: 'Romanian Deadlift', category: 'back', equipment: 'barbell', muscleGroups: '["hamstrings", "glutes", "back"]' },
		{ name: 'Bent Over Row (Barbell)', category: 'back', equipment: 'barbell', muscleGroups: '["back", "biceps"]' },
		{ name: 'Bent Over Row (Dumbbell)', category: 'back', equipment: 'dumbbell', muscleGroups: '["back", "biceps"]' },
		{ name: 'T-Bar Row', category: 'back', equipment: 'barbell', muscleGroups: '["back", "biceps"]' },
		{ name: 'Seated Cable Row', category: 'back', equipment: 'cable', muscleGroups: '["back", "biceps"]' },
		{ name: 'Lat Pulldown', category: 'back', equipment: 'cable', muscleGroups: '["back", "biceps"]' },
		{ name: 'Pull-Ups', category: 'back', equipment: 'bodyweight', muscleGroups: '["back", "biceps"]' },
		{ name: 'Chin-Ups', category: 'back', equipment: 'bodyweight', muscleGroups: '["back", "biceps"]' },
		
		// Shoulders
		{ name: 'Overhead Press (Barbell)', category: 'shoulders', equipment: 'barbell', muscleGroups: '["shoulders", "triceps"]' },
		{ name: 'Overhead Press (Dumbbell)', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["shoulders", "triceps"]' },
		{ name: 'Arnold Press', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["shoulders"]' },
		{ name: 'Lateral Raises', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["shoulders"]' },
		{ name: 'Front Raises', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["shoulders"]' },
		{ name: 'Rear Delt Flyes', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["shoulders"]' },
		{ name: 'Face Pulls', category: 'shoulders', equipment: 'cable', muscleGroups: '["shoulders", "back"]' },
		{ name: 'Shrugs (Barbell)', category: 'shoulders', equipment: 'barbell', muscleGroups: '["traps"]' },
		{ name: 'Shrugs (Dumbbell)', category: 'shoulders', equipment: 'dumbbell', muscleGroups: '["traps"]' },
		
		// Arms - Biceps
		{ name: 'Barbell Curl', category: 'arms', equipment: 'barbell', muscleGroups: '["biceps"]' },
		{ name: 'Dumbbell Curl', category: 'arms', equipment: 'dumbbell', muscleGroups: '["biceps"]' },
		{ name: 'Hammer Curl', category: 'arms', equipment: 'dumbbell', muscleGroups: '["biceps", "forearms"]' },
		{ name: 'Preacher Curl', category: 'arms', equipment: 'barbell', muscleGroups: '["biceps"]' },
		{ name: 'Incline Dumbbell Curl', category: 'arms', equipment: 'dumbbell', muscleGroups: '["biceps"]' },
		{ name: 'Cable Curl', category: 'arms', equipment: 'cable', muscleGroups: '["biceps"]' },
		{ name: 'Concentration Curl', category: 'arms', equipment: 'dumbbell', muscleGroups: '["biceps"]' },
		
		// Arms - Triceps
		{ name: 'Close Grip Bench Press', category: 'arms', equipment: 'barbell', muscleGroups: '["triceps", "chest"]' },
		{ name: 'Skull Crushers', category: 'arms', equipment: 'barbell', muscleGroups: '["triceps"]' },
		{ name: 'Tricep Pushdown', category: 'arms', equipment: 'cable', muscleGroups: '["triceps"]' },
		{ name: 'Overhead Tricep Extension', category: 'arms', equipment: 'dumbbell', muscleGroups: '["triceps"]' },
		{ name: 'Dips (Triceps)', category: 'arms', equipment: 'bodyweight', muscleGroups: '["triceps"]' },
		{ name: 'Diamond Push-Ups', category: 'arms', equipment: 'bodyweight', muscleGroups: '["triceps", "chest"]' },
		
		// Legs
		{ name: 'Squat (Barbell)', category: 'legs', equipment: 'barbell', muscleGroups: '["quads", "glutes", "hamstrings"]' },
		{ name: 'Front Squat', category: 'legs', equipment: 'barbell', muscleGroups: '["quads", "core"]' },
		{ name: 'Leg Press', category: 'legs', equipment: 'machine', muscleGroups: '["quads", "glutes"]' },
		{ name: 'Hack Squat', category: 'legs', equipment: 'machine', muscleGroups: '["quads"]' },
		{ name: 'Lunges', category: 'legs', equipment: 'dumbbell', muscleGroups: '["quads", "glutes"]' },
		{ name: 'Bulgarian Split Squat', category: 'legs', equipment: 'dumbbell', muscleGroups: '["quads", "glutes"]' },
		{ name: 'Leg Extension', category: 'legs', equipment: 'machine', muscleGroups: '["quads"]' },
		{ name: 'Leg Curl (Lying)', category: 'legs', equipment: 'machine', muscleGroups: '["hamstrings"]' },
		{ name: 'Leg Curl (Seated)', category: 'legs', equipment: 'machine', muscleGroups: '["hamstrings"]' },
		{ name: 'Calf Raise (Standing)', category: 'legs', equipment: 'machine', muscleGroups: '["calves"]' },
		{ name: 'Calf Raise (Seated)', category: 'legs', equipment: 'machine', muscleGroups: '["calves"]' },
		{ name: 'Hip Thrust', category: 'legs', equipment: 'barbell', muscleGroups: '["glutes", "hamstrings"]' },
		
		// Core
		{ name: 'Plank', category: 'core', equipment: 'bodyweight', muscleGroups: '["core"]' },
		{ name: 'Crunches', category: 'core', equipment: 'bodyweight', muscleGroups: '["abs"]' },
		{ name: 'Leg Raises (Hanging)', category: 'core', equipment: 'bodyweight', muscleGroups: '["abs"]' },
		{ name: 'Cable Crunch', category: 'core', equipment: 'cable', muscleGroups: '["abs"]' },
		{ name: 'Ab Wheel Rollout', category: 'core', equipment: 'other', muscleGroups: '["abs", "core"]' },
		{ name: 'Russian Twist', category: 'core', equipment: 'bodyweight', muscleGroups: '["obliques"]' },
	];
	
	for (const e of exerciseList) {
		await db.insert(exercises).values({
			...e,
			isCustom: false,
			restWarmup: 60,
			restWorking: 120,
			restDropset: 30,
			restFailure: 180,
			createdAt: now,
			updatedAt: now
		}).onConflictDoNothing();
	}

	// =========================================================================
	// Default Daily Targets (example for today)
	// =========================================================================
	console.log('🎯 Default daily targets...');
	await db.insert(dailyTargets).values({
		date: today,
		calories: 2500,
		protein: 180,
		carbs: 280,
		fat: 80,
		fiber: 30,
		source: 'default'
	}).onConflictDoNothing();

	console.log('\n✅ Seed complete!');
}

seed()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error('❌ Seed failed:', e);
		process.exit(1);
	});
