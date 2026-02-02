import { db } from '$lib/server/db';
import { 
	exercises, 
	workoutTemplates, 
	templateExercises,
	workouts,
	workoutSets,
	personalRecords
} from '$lib/server/db/schema';
import { eq, desc, asc, and, gte } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	// Get all workout templates
	const templates = await db.query.workoutTemplates.findMany({
		with: {
			exercises: {
				with: { exercise: true },
				orderBy: asc(templateExercises.sortOrder)
			}
		},
		orderBy: asc(workoutTemplates.sortOrder)
	});

	// Get recent workouts (last 10)
	const recentWorkouts = await db.query.workouts.findMany({
		with: {
			template: true,
			sets: {
				with: { exercise: true }
			}
		},
		orderBy: desc(workouts.date),
		limit: 10
	});

	// Get workouts this week for the weekly view
	const weekStart = new Date();
	weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
	weekStart.setHours(0, 0, 0, 0);
	const weekStartStr = weekStart.toISOString().split('T')[0];

	const thisWeekWorkouts = await db.query.workouts.findMany({
		where: gte(workouts.date, weekStartStr),
		with: { template: true },
		orderBy: asc(workouts.date)
	});

	// Get active (unfinished) workout if any
	const activeWorkout = await db.query.workouts.findFirst({
		where: eq(workouts.finishedAt, ''),
		with: {
			template: true,
			sets: {
				with: { exercise: true },
				orderBy: [asc(workoutSets.exerciseId), asc(workoutSets.setNumber)]
			}
		}
	});

	// Get all exercises for the exercise picker
	const allExercises = await db.query.exercises.findMany({
		orderBy: [asc(exercises.category), asc(exercises.name)]
	});

	return {
		templates,
		recentWorkouts,
		thisWeekWorkouts,
		activeWorkout,
		allExercises
	};
};

export const actions: Actions = {
	// Start a new workout
	startWorkout: async ({ request }) => {
		const data = await request.formData();
		const templateId = data.get('templateId') ? parseInt(data.get('templateId') as string) : null;
		const name = data.get('name') as string;

		const now = new Date().toISOString();
		const today = now.split('T')[0];

		let workoutName = name;
		if (templateId && !name) {
			const template = await db.query.workoutTemplates.findFirst({
				where: eq(workoutTemplates.id, templateId)
			});
			workoutName = template?.name ?? 'Workout';
		}

		const result = await db.insert(workouts).values({
			templateId,
			name: workoutName || 'Workout',
			date: today,
			startedAt: now,
			finishedAt: '', // Empty string means in progress
			createdAt: now
		}).returning({ id: workouts.id });

		return { success: true, workoutId: result[0].id };
	},

	// Add a set to the workout
	addSet: async ({ request }) => {
		const data = await request.formData();
		const workoutId = parseInt(data.get('workoutId') as string);
		const exerciseId = parseInt(data.get('exerciseId') as string);
		const setNumber = parseInt(data.get('setNumber') as string) || 1;
		const setType = (data.get('setType') as string) || 'working';
		const weight = data.get('weight') ? parseFloat(data.get('weight') as string) : null;
		const reps = data.get('reps') ? parseInt(data.get('reps') as string) : null;
		const rpe = data.get('rpe') ? parseFloat(data.get('rpe') as string) : null;

		if (!workoutId || !exerciseId) {
			return fail(400, { error: 'Workout and exercise are required' });
		}

		const now = new Date().toISOString();

		await db.insert(workoutSets).values({
			workoutId,
			exerciseId,
			setNumber,
			setType,
			weight,
			reps,
			rpe,
			isCompleted: true,
			completedAt: now
		});

		return { success: true };
	},

	// Update a set
	updateSet: async ({ request }) => {
		const data = await request.formData();
		const setId = parseInt(data.get('setId') as string);
		const weight = data.get('weight') ? parseFloat(data.get('weight') as string) : null;
		const reps = data.get('reps') ? parseInt(data.get('reps') as string) : null;
		const rpe = data.get('rpe') ? parseFloat(data.get('rpe') as string) : null;

		if (!setId) {
			return fail(400, { error: 'Set ID is required' });
		}

		await db.update(workoutSets)
			.set({ weight, reps, rpe })
			.where(eq(workoutSets.id, setId));

		return { success: true };
	},

	// Delete a set
	deleteSet: async ({ request }) => {
		const data = await request.formData();
		const setId = parseInt(data.get('setId') as string);

		if (!setId) {
			return fail(400, { error: 'Set ID is required' });
		}

		await db.delete(workoutSets).where(eq(workoutSets.id, setId));
		return { success: true };
	},

	// Finish the workout
	finishWorkout: async ({ request }) => {
		const data = await request.formData();
		const workoutId = parseInt(data.get('workoutId') as string);
		const rating = data.get('rating') ? parseInt(data.get('rating') as string) : null;
		const notes = data.get('notes') as string || null;

		if (!workoutId) {
			return fail(400, { error: 'Workout ID is required' });
		}

		const workout = await db.query.workouts.findFirst({
			where: eq(workouts.id, workoutId)
		});

		if (!workout) {
			return fail(404, { error: 'Workout not found' });
		}

		const now = new Date().toISOString();
		const startTime = new Date(workout.startedAt).getTime();
		const endTime = new Date(now).getTime();
		const durationSeconds = Math.round((endTime - startTime) / 1000);

		await db.update(workouts)
			.set({
				finishedAt: now,
				durationSeconds,
				rating,
				notes
			})
			.where(eq(workouts.id, workoutId));

		return { success: true };
	},

	// Cancel/delete a workout
	cancelWorkout: async ({ request }) => {
		const data = await request.formData();
		const workoutId = parseInt(data.get('workoutId') as string);

		if (!workoutId) {
			return fail(400, { error: 'Workout ID is required' });
		}

		// Delete all sets first (cascade would handle this, but being explicit)
		await db.delete(workoutSets).where(eq(workoutSets.workoutId, workoutId));
		await db.delete(workouts).where(eq(workouts.id, workoutId));

		return { success: true };
	},

	// Create a workout template
	createTemplate: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const description = data.get('description') as string || null;
		const color = data.get('color') as string || '#3b82f6';

		if (!name) {
			return fail(400, { error: 'Template name is required' });
		}

		const now = new Date().toISOString();

		const result = await db.insert(workoutTemplates).values({
			name,
			description,
			color,
			createdAt: now,
			updatedAt: now
		}).returning({ id: workoutTemplates.id });

		return { success: true, templateId: result[0].id };
	},

	// Add exercise to template
	addExerciseToTemplate: async ({ request }) => {
		const data = await request.formData();
		const templateId = parseInt(data.get('templateId') as string);
		const exerciseId = parseInt(data.get('exerciseId') as string);
		const targetSets = parseInt(data.get('targetSets') as string) || 3;
		const targetRepsMin = parseInt(data.get('targetRepsMin') as string) || 8;
		const targetRepsMax = parseInt(data.get('targetRepsMax') as string) || 12;

		if (!templateId || !exerciseId) {
			return fail(400, { error: 'Template and exercise are required' });
		}

		// Get max sort order
		const existing = await db.query.templateExercises.findMany({
			where: eq(templateExercises.templateId, templateId)
		});
		const maxOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder || 0), 0);

		await db.insert(templateExercises).values({
			templateId,
			exerciseId,
			sortOrder: maxOrder + 1,
			targetSets,
			targetRepsMin,
			targetRepsMax
		});

		return { success: true };
	},

	// Delete template
	deleteTemplate: async ({ request }) => {
		const data = await request.formData();
		const templateId = parseInt(data.get('templateId') as string);

		if (!templateId) {
			return fail(400, { error: 'Template ID is required' });
		}

		await db.delete(workoutTemplates).where(eq(workoutTemplates.id, templateId));
		return { success: true };
	}
};
