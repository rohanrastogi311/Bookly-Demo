CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`book_id` text NOT NULL,
	`quantity` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`order_id` text NOT NULL,
	`token` text NOT NULL,
	`kind` text NOT NULL,
	`book_id` text,
	`amount` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_resolution_per_order` ON `resolutions` (`session_id`,`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resolution_token` ON `resolutions` (`token`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
