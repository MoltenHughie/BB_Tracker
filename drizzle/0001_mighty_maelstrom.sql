CREATE INDEX `food_entries_date_idx` ON `food_entries` (`date`);--> statement-breakpoint
CREATE INDEX `food_entries_date_meal_idx` ON `food_entries` (`date`,`meal_type_id`);--> statement-breakpoint
CREATE INDEX `food_servings_food_id_idx` ON `food_servings` (`food_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `food_servings_food_id_name_unique` ON `food_servings` (`food_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `foods_barcode_unique` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `foods_name_brand_idx` ON `foods` (`name`,`brand`);--> statement-breakpoint
CREATE UNIQUE INDEX `meal_types_name_unique` ON `meal_types` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `measurement_types_name_unique` ON `measurement_types` (`name`);--> statement-breakpoint
CREATE INDEX `workout_sets_workout_id_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sets_workout_exercise_set_unique` ON `workout_sets` (`workout_id`,`exercise_id`,`set_number`);