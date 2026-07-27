CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`actor_external_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "audit_logs_action_not_blank" CHECK(length(trim("audit_logs"."action")) > 0),
	CONSTRAINT "audit_logs_target_type_not_blank" CHECK(length(trim("audit_logs"."target_type")) > 0)
);
--> statement-breakpoint
CREATE INDEX `audit_logs_tenant_created_idx` ON `audit_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`tenant_id` integer PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`timezone` text NOT NULL,
	`interface_language` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "business_profiles_business_name_not_blank" CHECK(length(trim("business_profiles"."business_name")) > 0),
	CONSTRAINT "business_profiles_timezone_not_blank" CHECK(length(trim("business_profiles"."timezone")) > 0),
	CONSTRAINT "business_profiles_language_valid" CHECK("business_profiles"."interface_language" in ('he', 'en', 'ar')),
	CONSTRAINT "business_profiles_version_positive" CHECK("business_profiles"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE `tenant_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`external_user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tenant_memberships_external_user_id_not_blank" CHECK(length(trim("tenant_memberships"."external_user_id")) > 0),
	CONSTRAINT "tenant_memberships_role_valid" CHECK("tenant_memberships"."role" in ('owner', 'manager', 'agent', 'viewer')),
	CONSTRAINT "tenant_memberships_status_valid" CHECK("tenant_memberships"."status" in ('active', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_memberships_tenant_user_uq` ON `tenant_memberships` (`tenant_id`,`external_user_id`);--> statement-breakpoint
CREATE INDEX `tenant_memberships_user_idx` ON `tenant_memberships` (`external_user_id`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tenants_display_name_not_blank" CHECK(length(trim("tenants"."display_name")) > 0),
	CONSTRAINT "tenants_status_valid" CHECK("tenants"."status" in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked'))
);
--> statement-breakpoint
CREATE INDEX `tenants_status_idx` ON `tenants` (`status`);
