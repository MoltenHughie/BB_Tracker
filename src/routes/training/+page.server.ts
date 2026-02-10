import { db } from '$lib/server/db';
import { 
	exercises, 
	workoutTemplates, 
	templateExercises,
	workouts,
	workoutSets,
	personalRecords
} from '$lib/server/db/schema';
import { eq, desc, asc, and, gte, isNull, isNotNull } from 'drizzle-orm';
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
		where: isNull(workouts.finishedAt),
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

	// Get previous performance data for all exercises (from most recent completed workout)
	// This helps users see what they did last time
	const previousPerformance: Record<number, Array<{
		weight: number | null;
		reps: number | null;
		rpe: number | null;
		setType: string;
	}>> = {};

	if (activeWorkout) {
		// Get the most recent COMPLETED workout (not the current active one)
		const previousWorkout = await db.query.workouts.findFirst({
			where: isNotNull(workouts.finishedAt),
			with: {
				sets: true
			},
			orderBy: desc(workouts.finishedAt)
		});

		if (previousWorkout) {
			// Group sets by exercise
			for (const set of previousWorkout.sets) {
				if (!previousPerformance[set.exerciseId]) {
					previousPerformance[set.exerciseId] = [];
				}
				previousPerformance[set.exerciseId].push({
					weight: set.weight,
					reps: set.reps,
					rpe: set.rpe,
					setType: set.setType || 'working'
				});
			}
		}
	}

	// Get all PRs with exercise names
	const allPRsRaw = await db.query.personalRecords.findMany({
		orderBy: desc(personalRecords.createdAt)
	});
	// Enrich with exercise names
	const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
	const allPRs = allPRsRaw.map(pr => ({
		...pr,
		exercise: exerciseMap[pr.exerciseId] ?? { name: 'Unknown', id: pr.exerciseId }
	}));

	// Weekly volume by category
	const weeklyVolumeByCategory: Record<string, number> = {};
	for (const w of thisWeekWorkouts) {
		if (!('sets' in w)) continue;
		const wWithSets = w as typeof w & { sets: Array<{ exerciseId: number; weight: number | null; reps: number | null }> };
		// We need sets for this week's workouts - load them
	}
	// Load all sets from this week's workouts
	const thisWeekWorkoutIds = thisWeekWorkouts.map(w => w.id);
	if (thisWeekWorkoutIds.length > 0) {
		const weekSets = await db.query.workoutSets.findMany({
			where: and(
				...thisWeekWorkoutIds.length === 1
					? [eq(workoutSets.workoutId, thisWeekWorkoutIds[0])]
					: [gte(workoutSets.workoutId, Math.min(...thisWeekWorkoutIds))]
			)
		});
		const filteredSets = weekSets.filter(s => thisWeekWorkoutIds.includes(s.workoutId));
		for (const set of filteredSets) {
			const ex = exerciseMap[set.exerciseId];
			const cat = ex?.category || 'other';
			weeklyVolumeByCategory[cat] = (weeklyVolumeByCategory[cat] || 0) + 1; // count sets
		}
	}

	return {
		templates,
		recentWorkouts,
		thisWeekWorkouts,
		activeWorkout,
		allExercises,
		previousPerformance,
		personalRecords: allPRs,
		weeklyVolumeByCategory
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
		let templateExercisesList = null;

		if (templateId && !name) {
			const template = await db.query.workoutTemplates.findFirst({
				where: eq(workoutTemplates.id, templateId),
				with: {
					exercises: {
						with: { exercise: true },
						orderBy: asc(templateExercises.sortOrder)
					}
				}
			});
			workoutName = template?.name ?? 'Workout';
			
			// Return template exercises with target sets/reps for UI
			if (template?.exercises) {
				templateExercisesList = template.exercises.map(te => ({
					id: te.exercise.id,
					name: te.exercise.name,
					category: te.exercise.category,
					equipment: te.exercise.equipment,
					targetSets: te.targetSets,
					targetRepsMin: te.targetRepsMin,
					targetRepsMax: te.targetRepsMax,
					sortOrder: te.sortOrder
				}));
			}
		}

		const result = await db.insert(workouts).values({
			templateId,
			name: workoutName || 'Workout',
			date: today,
			startedAt: now,
			finishedAt: null,
			createdAt: now
		}).returning({ id: workouts.id });

		return { 
			success: true, 
			workoutId: result[0].id,
			templateExercises: templateExercisesList
		};
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
			where: eq(workouts.id, workoutId),
			with: {
				sets: true
			}
		});

		if (!workout) {
			return fail(404, { error: 'Workout not found' });
		}

		const now = new Date().toISOString();
		const today = now.split('T')[0];
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

		// Auto-detect PRs
		const newPRs: Array<{
			exerciseId: number;
			exerciseName: string;
			recordType: string;
			value: number;
			weight?: number;
			reps?: number;
		}> = [];

		// Group sets by exercise
		const exerciseGroups = new Map<number, typeof workout.sets>();
		for (const set of workout.sets) {
			if (!exerciseGroups.has(set.exerciseId)) {
				exerciseGroups.set(set.exerciseId, []);
			}
			exerciseGroups.get(set.exerciseId)!.push(set);
		}

		// Check PRs for each exercise
		for (const [exerciseId, sets] of exerciseGroups) {
			// Calculate 1RM PR (using Brzycki formula: weight × (36 / (37 - reps)))
			// Only for working sets with weight > 0 and reps > 0
			const workingSets = sets.filter(s => 
				s.setType === 'working' && 
				s.weight && s.weight > 0 && 
				s.reps && s.reps > 0 && 
				s.reps < 37 // Brzycki formula breaks down at 37+ reps
			);

			if (workingSets.length > 0) {
				// Find the best estimated 1RM from this workout
				let bestEstimated1RM = 0;
				let bestSet: typeof workingSets[0] | null = null;

				for (const set of workingSets) {
					const estimated1RM = set.weight! * (36 / (37 - set.reps!));
					if (estimated1RM > bestEstimated1RM) {
						bestEstimated1RM = estimated1RM;
						bestSet = set;
					}
				}

				if (bestSet && bestEstimated1RM > 0) {
					// Check if this is a PR
					const existingPR = await db.query.personalRecords.findFirst({
						where: and(
							eq(personalRecords.exerciseId, exerciseId),
							eq(personalRecords.recordType, '1rm')
						),
						orderBy: desc(personalRecords.value)
					});

					if (!existingPR || bestEstimated1RM > existingPR.value) {
						// New PR!
						await db.insert(personalRecords).values({
							exerciseId,
							recordType: '1rm',
							value: bestEstimated1RM,
							weight: bestSet.weight,
							reps: bestSet.reps,
							workoutSetId: bestSet.id,
							date: today,
							createdAt: now
						});

						// Get exercise name
						const exercise = await db.query.exercises.findFirst({
							where: eq(exercises.id, exerciseId)
						});

						newPRs.push({
							exerciseId,
							exerciseName: exercise?.name || 'Unknown',
							recordType: '1rm',
							value: Math.round(bestEstimated1RM * 10) / 10,
							weight: bestSet.weight ?? undefined,
							reps: bestSet.reps ?? undefined
						});
					}
				}
			}

			// Calculate volume PR (total weight × reps for this exercise)
			const totalVolume = sets.reduce((sum, set) => {
				if (set.weight && set.reps && set.weight > 0 && set.reps > 0) {
					return sum + (set.weight * set.reps);
				}
				return sum;
			}, 0);

			if (totalVolume > 0) {
				const existingVolumePR = await db.query.personalRecords.findFirst({
					where: and(
						eq(personalRecords.exerciseId, exerciseId),
						eq(personalRecords.recordType, 'volume')
					),
					orderBy: desc(personalRecords.value)
				});

				if (!existingVolumePR || totalVolume > existingVolumePR.value) {
					// New volume PR!
					await db.insert(personalRecords).values({
						exerciseId,
						recordType: 'volume',
						value: totalVolume,
						date: today,
						createdAt: now
					});

					// Get exercise name if not already fetched
					const exercise = await db.query.exercises.findFirst({
						where: eq(exercises.id, exerciseId)
					});

					newPRs.push({
						exerciseId,
						exerciseName: exercise?.name || 'Unknown',
						recordType: 'volume',
						value: Math.round(totalVolume)
					});
				}
			}
		}

		return { success: true, newPRs };
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
	},

	// Create a custom exercise
	createExercise: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const category = data.get('category') as string || 'other';
		const equipment = data.get('equipment') as string || 'other';

		if (!name?.trim()) {
			return fail(400, { error: 'Exercise name is required' });
		}

		const now = new Date().toISOString();

		await db.insert(exercises).values({
			name: name.trim(),
			category,
			equipment,
			restWorking: 120,
			restWarmup: 60,
			restDropset: 30,
			restFailure: 180,
			createdAt: now,
			updatedAt: now
		});

		return { success: true };
	}
};
