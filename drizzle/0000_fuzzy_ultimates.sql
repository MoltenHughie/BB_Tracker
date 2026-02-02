CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `body_composition` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`body_fat_percent` real,
	`muscle_mass_kg` real,
	`bone_mass_kg` real,
	`water_percent` real,
	`method` text,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `body_measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`measurement_type_id` integer NOT NULL,
	`value` real NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`measurement_type_id`) REFERENCES `measurement_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `body_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`filename` text NOT NULL,
	`pose` text,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `body_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`weight` real NOT NULL,
	`time` text,
	`condition` text,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`calories` integer NOT NULL,
	`protein` integer NOT NULL,
	`carbs` integer NOT NULL,
	`fat` integer NOT NULL,
	`fiber` integer,
	`source` text DEFAULT 'manual',
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_targets_date_unique` ON `daily_targets` (`date`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`equipment` text,
	`muscle_groups` text,
	`notes` text,
	`rest_warmup` integer DEFAULT 60,
	`rest_working` integer DEFAULT 120,
	`rest_dropset` integer DEFAULT 30,
	`rest_failure` integer DEFAULT 180,
	`is_custom` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal_type_id` integer,
	`food_id` integer NOT NULL,
	`serving_id` integer,
	`quantity` real DEFAULT 1 NOT NULL,
	`custom_grams` real,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`logged_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`serving_id`) REFERENCES `food_servings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `food_servings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_id` integer NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL,
	`is_default` integer DEFAULT false,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`source` text DEFAULT 'custom',
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`fiber` real,
	`sugar` real,
	`sodium` real,
	`saturated_fat` real,
	`trans_fat` real,
	`cholesterol` real,
	`potassium` real,
	`vitamin_a` real,
	`vitamin_c` real,
	`calcium` real,
	`iron` real,
	`is_liquid` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `measurement_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text DEFAULT 'cm',
	`sort_order` integer DEFAULT 0,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` integer NOT NULL,
	`record_type` text NOT NULL,
	`value` real NOT NULL,
	`weight` real,
	`reps` integer,
	`workout_set_id` integer,
	`date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workout_set_id`) REFERENCES `workout_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplement_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplement_id` integer NOT NULL,
	`schedule_id` integer,
	`date` text NOT NULL,
	`dose` real NOT NULL,
	`taken_at` text NOT NULL,
	`food_entry_id` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`schedule_id`) REFERENCES `supplement_schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_entry_id`) REFERENCES `food_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplement_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplement_id` integer NOT NULL,
	`name` text,
	`time_of_day` text,
	`scheduled_time` text,
	`days_of_week` text,
	`dose` real NOT NULL,
	`with_food` integer,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `supplements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category` text,
	`form` text,
	`serving_size` text,
	`serving_size_grams` real,
	`total_servings` integer,
	`concentration` text,
	`calories` real,
	`protein` real,
	`carbs` real,
	`fat` real,
	`is_ped` integer DEFAULT false,
	`is_rx` integer DEFAULT false,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0,
	`target_sets` integer DEFAULT 3,
	`target_reps_min` integer DEFAULT 8,
	`target_reps_max` integer DEFAULT 12,
	`notes` text,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`set_number` integer NOT NULL,
	`set_type` text DEFAULT 'working',
	`weight` real,
	`reps` integer,
	`rpe` real,
	`is_completed` integer DEFAULT false,
	`notes` text,
	`completed_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`duration_seconds` integer,
	`notes` text,
	`rating` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE no action
);
