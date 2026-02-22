CREATE TABLE `exercise_catalog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`level` text,
	`equipment` text,
	`primary_muscles` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`source` text DEFAULT 'free-exercise-db' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_catalog_name_equipment_category_unique` ON `exercise_catalog` (`name`,`equipment`,`category`);--> statement-breakpoint
CREATE INDEX `exercise_catalog_name_idx` ON `exercise_catalog` (`name`);