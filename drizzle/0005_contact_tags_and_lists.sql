-- Tenant-scoped tags, lists, and contact relationships. Unsubscribe remains global on contacts.
CREATE TABLE `contact_list_memberships` (
	`tenant_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`list_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`contact_id`, `list_id`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`list_id`) REFERENCES `contact_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_list_memberships_tenant_contact_idx` ON `contact_list_memberships` (`tenant_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_list_memberships_tenant_list_idx` ON `contact_list_memberships` (`tenant_id`,`list_id`);--> statement-breakpoint
CREATE TABLE `contact_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contact_lists_name_not_blank" CHECK(length(trim("contact_lists"."name")) > 0),
	CONSTRAINT "contact_lists_normalized_name_not_blank" CHECK(length(trim("contact_lists"."normalized_name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_lists_tenant_name_uq` ON `contact_lists` (`tenant_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_lists_tenant_created_idx` ON `contact_lists` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contact_tag_assignments` (
	`tenant_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`contact_id`, `tag_id`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `contact_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_tag_assignments_tenant_contact_idx` ON `contact_tag_assignments` (`tenant_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_tag_assignments_tenant_tag_idx` ON `contact_tag_assignments` (`tenant_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `contact_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contact_tags_name_not_blank" CHECK(length(trim("contact_tags"."name")) > 0),
	CONSTRAINT "contact_tags_normalized_name_not_blank" CHECK(length(trim("contact_tags"."normalized_name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_tags_tenant_name_uq` ON `contact_tags` (`tenant_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `contact_tags_tenant_created_idx` ON `contact_tags` (`tenant_id`,`created_at`);
