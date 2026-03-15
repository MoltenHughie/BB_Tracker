CREATE TABLE `day_meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `day_meals_date_idx` ON `day_meals` (`date`);--> statement-breakpoint
CREATE INDEX `day_meals_date_sort_idx` ON `day_meals` (`date`,`sort_order`);--> statement-breakpoint
CREATE TABLE `workout_splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `day_meal_id` integer REFERENCES day_meals(id);--> statement-breakpoint
CREATE INDEX `food_entries_date_day_meal_idx` ON `food_entries` (`date`,`day_meal_id`);--> statement-breakpoint
ALTER TABLE `supplements` ADD `nutrients` text;--> statement-breakpoint
ALTER TABLE `workout_templates` ADD `split_id` integer REFERENCES workout_splits(id);--> statement-breakpoint
ALTER TABLE `workout_sets` DROP COLUMN `rpe`;