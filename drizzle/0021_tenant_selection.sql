CREATE TABLE `tenant_selections` (
	`external_user_id` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`external_user_id`) REFERENCES `tenant_memberships`(`tenant_id`,`external_user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tenant_selections_external_user_id_not_blank" CHECK(length(trim("tenant_selections"."external_user_id")) > 0),
	CONSTRAINT "tenant_selections_version_positive" CHECK("tenant_selections"."version" >= 1)
);
--> statement-breakpoint
CREATE INDEX `tenant_selections_tenant_idx` ON `tenant_selections` (`tenant_id`);