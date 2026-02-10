CREATE INDEX `body_composition_date_idx` ON `body_composition` (`date`);--> statement-breakpoint
CREATE INDEX `body_measurements_date_idx` ON `body_measurements` (`date`);--> statement-breakpoint
CREATE INDEX `body_measurements_type_date_idx` ON `body_measurements` (`measurement_type_id`,`date`);--> statement-breakpoint
CREATE INDEX `body_photos_date_idx` ON `body_photos` (`date`);--> statement-breakpoint
CREATE INDEX `body_weights_date_idx` ON `body_weights` (`date`);--> statement-breakpoint
CREATE INDEX `personal_records_exercise_type_idx` ON `personal_records` (`exercise_id`,`record_type`);--> statement-breakpoint
CREATE INDEX `personal_records_exercise_date_idx` ON `personal_records` (`exercise_id`,`date`);--> statement-breakpoint
CREATE INDEX `supplement_logs_date_idx` ON `supplement_logs` (`date`);--> statement-breakpoint
CREATE INDEX `supplement_logs_supplement_date_idx` ON `supplement_logs` (`supplement_id`,`date`);--> statement-breakpoint
CREATE INDEX `supplement_logs_schedule_date_idx` ON `supplement_logs` (`schedule_id`,`date`);--> statement-breakpoint
CREATE INDEX `supplement_schedules_supplement_id_idx` ON `supplement_schedules` (`supplement_id`);--> statement-breakpoint
CREATE INDEX `supplement_schedules_active_time_idx` ON `supplement_schedules` (`is_active`,`scheduled_time`);--> statement-breakpoint
CREATE INDEX `template_exercises_template_id_idx` ON `template_exercises` (`template_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `template_exercises_template_exercise_unique` ON `template_exercises` (`template_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `template_exercises_template_sort_idx` ON `template_exercises` (`template_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `workouts_date_idx` ON `workouts` (`date`);--> statement-breakpoint
CREATE INDEX `workouts_template_date_idx` ON `workouts` (`template_id`,`date`);