import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// APP SETTINGS
// ============================================================================

export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value'),
	updatedAt: text('updated_at').notNull()
});

// ============================================================================
// CALORIE TRACKER
// ============================================================================

// Custom foods database (+ OpenFoodFacts cache)
export const foods = sqliteTable(
	'foods',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		brand: text('brand'),
		barcode: text('barcode'), // EAN/UPC for OpenFoodFacts lookup
		source: text('source').default('custom'), // 'custom' | 'openfoodfacts'
		// Per 100g/ml base values
		calories: real('calories').notNull(), // kcal
		protein: real('protein').notNull(), // g
		carbs: real('carbs').notNull(), // g
		fat: real('fat').notNull(), // g
		fiber: real('fiber'), // g
		sugar: real('sugar'), // g
		sodium: real('sodium'), // mg
		// Additional micros (optional)
		saturatedFat: real('saturated_fat'), // g
		transFat: real('trans_fat'), // g
		cholesterol: real('cholesterol'), // mg
		potassium: real('potassium'), // mg
		vitaminA: real('vitamin_a'), // IU
		vitaminC: real('vitamin_c'), // mg
		calcium: real('calcium'), // mg
		iron: real('iron'), // mg
		// Metadata
		isLiquid: integer('is_liquid', { mode: 'boolean' }).default(false),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => ({
		barcodeUnique: uniqueIndex('foods_barcode_unique').on(table.barcode),
		nameBrandIdx: index('foods_name_brand_idx').on(table.name, table.brand)
	})
);

// Serving sizes for foods
export const foodServings = sqliteTable(
	'food_servings',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		foodId: integer('food_id').notNull().references(() => foods.id, { onDelete: 'cascade' }),
		name: text('name').notNull(), // e.g., "1 cup", "1 slice", "1 scoop"
		grams: real('grams').notNull(), // weight in grams
		isDefault: integer('is_default', { mode: 'boolean' }).default(false)
	},
	(table) => ({
		foodIdx: index('food_servings_food_id_idx').on(table.foodId),
		foodNameUnique: uniqueIndex('food_servings_food_id_name_unique').on(table.foodId, table.name)
	})
);

// Daily calorie/macro targets
export const dailyTargets = sqliteTable('daily_targets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	date: text('date').notNull().unique(), // ISO date YYYY-MM-DD
	calories: integer('calories').notNull(),
	protein: integer('protein').notNull(), // g
	carbs: integer('carbs').notNull(), // g
	fat: integer('fat').notNull(), // g
	fiber: integer('fiber'), // g
	// Source of target: 'manual' | 'calculated'
	source: text('source').default('manual'),
	note: text('note')
});

// Meal types
export const mealTypes = sqliteTable(
	'meal_types',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(), // e.g., "Breakfast", "Lunch", "Dinner", "Snack"
		sortOrder: integer('sort_order').default(0),
		icon: text('icon') // emoji
	},
	(table) => ({
		nameUnique: uniqueIndex('meal_types_name_unique').on(table.name)
	})
);

// Food log entries
export const foodEntries = sqliteTable(
	'food_entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // ISO date
		mealTypeId: integer('meal_type_id').references(() => mealTypes.id),
		foodId: integer('food_id').notNull().references(() => foods.id),
		servingId: integer('serving_id').references(() => foodServings.id),
		// Amount consumed
		quantity: real('quantity').notNull().default(1), // number of servings
		customGrams: real('custom_grams'), // override if not using a serving
		// Calculated values at time of entry (for historical accuracy)
		calories: real('calories').notNull(),
		protein: real('protein').notNull(),
		carbs: real('carbs').notNull(),
		fat: real('fat').notNull(),
		// Timestamps
		loggedAt: text('logged_at').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('food_entries_date_idx').on(table.date),
		dateMealIdx: index('food_entries_date_meal_idx').on(table.date, table.mealTypeId)
	})
);

// ============================================================================
// TRAINING TRACKER
// ============================================================================

// Exercise library
export const exercises = sqliteTable('exercises', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	category: text('category'), // 'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'
	equipment: text('equipment'), // 'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'
	muscleGroups: text('muscle_groups'), // JSON array: ["chest", "triceps"]
	notes: text('notes'),
	// Rest timer defaults (seconds)
	restWarmup: integer('rest_warmup').default(60),
	restWorking: integer('rest_working').default(120),
	restDropset: integer('rest_dropset').default(30),
	restFailure: integer('rest_failure').default(180),
	// Metadata
	isCustom: integer('is_custom', { mode: 'boolean' }).default(true),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

// Workout templates (splits)
export const workoutTemplates = sqliteTable('workout_templates', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(), // e.g., "Push Day", "Leg Day"
	description: text('description'),
	color: text('color'), // hex color for UI
	sortOrder: integer('sort_order').default(0),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

// Exercises in a template
export const templateExercises = sqliteTable(
	'template_exercises',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		templateId: integer('template_id')
			.notNull()
			.references(() => workoutTemplates.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id').notNull().references(() => exercises.id),
		sortOrder: integer('sort_order').default(0),
		targetSets: integer('target_sets').default(3),
		targetRepsMin: integer('target_reps_min').default(8),
		targetRepsMax: integer('target_reps_max').default(12),
		notes: text('notes')
	},
	(table) => ({
		templateIdx: index('template_exercises_template_id_idx').on(table.templateId),
		templateExerciseUnique: uniqueIndex('template_exercises_template_exercise_unique').on(
			table.templateId,
			table.exerciseId
		),
		templateSortIdx: index('template_exercises_template_sort_idx').on(table.templateId, table.sortOrder)
	})
);

// Completed workouts
export const workouts = sqliteTable(
	'workouts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		templateId: integer('template_id').references(() => workoutTemplates.id),
		name: text('name').notNull(), // copied from template or custom
		date: text('date').notNull(), // ISO date
		startedAt: text('started_at').notNull(),
		finishedAt: text('finished_at'),
		durationSeconds: integer('duration_seconds'),
		notes: text('notes'),
		rating: integer('rating'), // 1-5 subjective rating
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('workouts_date_idx').on(table.date),
		templateDateIdx: index('workouts_template_date_idx').on(table.templateId, table.date)
	})
);

// Individual sets in a workout
export const workoutSets = sqliteTable(
	'workout_sets',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		workoutId: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id').notNull().references(() => exercises.id),
		setNumber: integer('set_number').notNull(),
		setType: text('set_type').default('working'), // 'warmup' | 'working' | 'dropset' | 'failure'
		weight: real('weight'), // kg or lbs (user preference)
		reps: integer('reps'),
		rpe: real('rpe'), // Rate of Perceived Exertion 1-10
		isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
		notes: text('notes'),
		completedAt: text('completed_at')
	},
	(table) => ({
		workoutIdx: index('workout_sets_workout_id_idx').on(table.workoutId),
		workoutExerciseSetUnique: uniqueIndex('workout_sets_workout_exercise_set_unique').on(
			table.workoutId,
			table.exerciseId,
			table.setNumber
		)
	})
);

// Personal records
export const personalRecords = sqliteTable(
	'personal_records',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		exerciseId: integer('exercise_id').notNull().references(() => exercises.id),
		recordType: text('record_type').notNull(), // '1rm', '3rm', '5rm', 'volume', 'reps'
		value: real('value').notNull(),
		weight: real('weight'), // for rep PRs
		reps: integer('reps'), // for rep PRs
		workoutSetId: integer('workout_set_id').references(() => workoutSets.id),
		date: text('date').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		exerciseTypeIdx: index('personal_records_exercise_type_idx').on(table.exerciseId, table.recordType),
		exerciseDateIdx: index('personal_records_exercise_date_idx').on(table.exerciseId, table.date)
	})
);

// ============================================================================
// SUPPLEMENT TRACKER
// ============================================================================

// Supplement definitions
export const supplements = sqliteTable('supplements', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	brand: text('brand'),
	category: text('category'), // 'vitamin', 'mineral', 'protein', 'preworkout', 'hormone', 'medication', 'other'
	form: text('form'), // 'pill', 'capsule', 'powder', 'liquid', 'injection'
	servingSize: text('serving_size'), // e.g., "1 capsule", "5g", "1ml"
	servingSizeGrams: real('serving_size_grams'),
	totalServings: integer('total_servings'),
	// For PEDs/hormones - track concentration
	concentration: text('concentration'), // e.g., "250mg/ml"
	// Nutritional content per serving (for auto-logging to calories)
	calories: real('calories'),
	protein: real('protein'),
	carbs: real('carbs'),
	fat: real('fat'),
	// Flags
	isPed: integer('is_ped', { mode: 'boolean' }).default(false),
	isRx: integer('is_rx', { mode: 'boolean' }).default(false), // prescription
	notes: text('notes'),
	// Metadata
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

// Supplement schedules
export const supplementSchedules = sqliteTable(
	'supplement_schedules',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		supplementId: integer('supplement_id')
			.notNull()
			.references(() => supplements.id, { onDelete: 'cascade' }),
		name: text('name'), // e.g., "Morning", "Pre-workout"
		timeOfDay: text('time_of_day'), // 'morning', 'noon', 'evening', 'night', 'preworkout', 'postworkout'
		scheduledTime: text('scheduled_time'), // HH:MM format
		daysOfWeek: text('days_of_week'), // JSON array: [0,1,2,3,4,5,6] (0=Sunday)
		dose: real('dose').notNull(), // number of servings
		withFood: integer('with_food', { mode: 'boolean' }),
		notes: text('notes'),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => ({
		supplementIdx: index('supplement_schedules_supplement_id_idx').on(table.supplementId),
		activeTimeIdx: index('supplement_schedules_active_time_idx').on(table.isActive, table.scheduledTime)
	})
);

// Supplement intake logs
export const supplementLogs = sqliteTable(
	'supplement_logs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		supplementId: integer('supplement_id').notNull().references(() => supplements.id),
		scheduleId: integer('schedule_id').references(() => supplementSchedules.id),
		date: text('date').notNull(), // ISO date
		dose: real('dose').notNull(),
		takenAt: text('taken_at').notNull(), // ISO datetime
		// Auto-log to food entries
		foodEntryId: integer('food_entry_id').references(() => foodEntries.id),
		notes: text('notes'),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('supplement_logs_date_idx').on(table.date),
		supplementDateIdx: index('supplement_logs_supplement_date_idx').on(table.supplementId, table.date),
		scheduleDateIdx: index('supplement_logs_schedule_date_idx').on(table.scheduleId, table.date)
	})
);

// ============================================================================
// BODY TRACKER
// ============================================================================

// Body weight entries
export const bodyWeights = sqliteTable(
	'body_weights',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // ISO date
		weight: real('weight').notNull(), // kg (primary unit)
		time: text('time'), // HH:MM - time of measurement
		condition: text('condition'), // 'fasted', 'post_meal', 'post_workout'
		notes: text('note'),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('body_weights_date_idx').on(table.date)
	})
);

// Measurement types
export const measurementTypes = sqliteTable(
	'measurement_types',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(), // e.g., "Chest", "Waist", "Biceps (L)", "Biceps (R)"
		unit: text('unit').default('cm'), // 'cm' | 'inches'
		sortOrder: integer('sort_order').default(0),
		icon: text('icon') // emoji
	},
	(table) => ({
		nameUnique: uniqueIndex('measurement_types_name_unique').on(table.name)
	})
);

// Body measurements
export const bodyMeasurements = sqliteTable(
	'body_measurements',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // ISO date
		measurementTypeId: integer('measurement_type_id').notNull().references(() => measurementTypes.id),
		value: real('value').notNull(),
		notes: text('notes'),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('body_measurements_date_idx').on(table.date),
		typeDateIdx: index('body_measurements_type_date_idx').on(table.measurementTypeId, table.date)
	})
);

// Check-in photos (stored on disk, DB has reference)
export const bodyPhotos = sqliteTable(
	'body_photos',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // ISO date
		filename: text('filename').notNull(), // relative path in uploads/photos/
		pose: text('pose'), // 'front', 'back', 'side_left', 'side_right', 'front_relaxed', 'front_flexed'
		notes: text('notes'),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('body_photos_date_idx').on(table.date)
	})
);

// Body composition estimates (if user tracks BF%, muscle mass, etc.)
export const bodyComposition = sqliteTable(
	'body_composition',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // ISO date
		bodyFatPercent: real('body_fat_percent'),
		muscleMassKg: real('muscle_mass_kg'),
		boneMassKg: real('bone_mass_kg'),
		waterPercent: real('water_percent'),
		method: text('method'), // 'scale', 'caliper', 'dexa', 'estimate'
		notes: text('notes'),
		createdAt: text('created_at').notNull()
	},
	(table) => ({
		dateIdx: index('body_composition_date_idx').on(table.date)
	})
);

// ============================================================================
// RELATIONS
// ============================================================================

export const foodsRelations = relations(foods, ({ many }) => ({
	servings: many(foodServings),
	entries: many(foodEntries)
}));

export const foodServingsRelations = relations(foodServings, ({ one }) => ({
	food: one(foods, { fields: [foodServings.foodId], references: [foods.id] })
}));

export const foodEntriesRelations = relations(foodEntries, ({ one }) => ({
	food: one(foods, { fields: [foodEntries.foodId], references: [foods.id] }),
	serving: one(foodServings, { fields: [foodEntries.servingId], references: [foodServings.id] }),
	mealType: one(mealTypes, { fields: [foodEntries.mealTypeId], references: [mealTypes.id] })
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({ many }) => ({
	exercises: many(templateExercises),
	workouts: many(workouts)
}));

export const templateExercisesRelations = relations(templateExercises, ({ one }) => ({
	template: one(workoutTemplates, { fields: [templateExercises.templateId], references: [workoutTemplates.id] }),
	exercise: one(exercises, { fields: [templateExercises.exerciseId], references: [exercises.id] })
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
	template: one(workoutTemplates, { fields: [workouts.templateId], references: [workoutTemplates.id] }),
	sets: many(workoutSets)
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
	workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
	exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] })
}));

export const supplementsRelations = relations(supplements, ({ many }) => ({
	schedules: many(supplementSchedules),
	logs: many(supplementLogs)
}));

export const supplementSchedulesRelations = relations(supplementSchedules, ({ one }) => ({
	supplement: one(supplements, { fields: [supplementSchedules.supplementId], references: [supplements.id] })
}));

export const supplementLogsRelations = relations(supplementLogs, ({ one }) => ({
	supplement: one(supplements, { fields: [supplementLogs.supplementId], references: [supplements.id] }),
	schedule: one(supplementSchedules, { fields: [supplementLogs.scheduleId], references: [supplementSchedules.id] }),
	foodEntry: one(foodEntries, { fields: [supplementLogs.foodEntryId], references: [foodEntries.id] })
}));

export const bodyMeasurementsRelations = relations(bodyMeasurements, ({ one }) => ({
	measurementType: one(measurementTypes, { fields: [bodyMeasurements.measurementTypeId], references: [measurementTypes.id] })
}));
