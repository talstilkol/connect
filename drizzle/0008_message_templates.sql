CREATE TABLE `message_templates` (
	`template_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`meta_template_id` text,
	`name` text NOT NULL,
	`language` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`last_status_event_key` text,
	`version` integer DEFAULT 1 NOT NULL,
	`submitted_at` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "message_templates_key_sha256" CHECK(length("message_templates"."template_key") = 76
        and substr("message_templates"."template_key", 1, 12) = 'template_v1_'
        and substr("message_templates"."template_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "message_templates_meta_id_valid" CHECK("message_templates"."meta_template_id" is null
        or (
          length("message_templates"."meta_template_id") between 1 and 255
          and "message_templates"."meta_template_id" not glob '*[^0-9]*'
        )),
	CONSTRAINT "message_templates_name_valid" CHECK(length("message_templates"."name") between 1 and 255
        and "message_templates"."name" not glob '*[^a-z0-9_]*'),
	CONSTRAINT "message_templates_language_valid" CHECK("message_templates"."language" in ('he', 'en_US', 'ar')),
	CONSTRAINT "message_templates_category_valid" CHECK("message_templates"."category" in ('MARKETING', 'UTILITY')),
	CONSTRAINT "message_templates_status_valid" CHECK("message_templates"."status" in ('draft', 'pending_review', 'approved', 'rejected', 'disabled', 'deleted')),
	CONSTRAINT "message_templates_definition_json_valid" CHECK(length("message_templates"."definition_json") between 2 and 50000
        and json_valid("message_templates"."definition_json")),
	CONSTRAINT "message_templates_status_event_key_valid" CHECK("message_templates"."last_status_event_key" is null
        or (
          length("message_templates"."last_status_event_key") = 64
          and "message_templates"."last_status_event_key" not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "message_templates_version_positive" CHECK("message_templates"."version" >= 1),
	CONSTRAINT "message_templates_lifecycle_consistent" CHECK((
        "message_templates"."status" = 'draft'
        and "message_templates"."meta_template_id" is null
        and "message_templates"."last_status_event_key" is null
        and "message_templates"."submitted_at" is null
        and "message_templates"."reviewed_at" is null
      ) or (
        "message_templates"."status" = 'pending_review'
        and "message_templates"."meta_template_id" is not null
        and "message_templates"."submitted_at" is not null
        and "message_templates"."reviewed_at" is null
      ) or (
        "message_templates"."status" in ('approved', 'rejected', 'disabled', 'deleted')
        and "message_templates"."meta_template_id" is not null
        and "message_templates"."submitted_at" is not null
        and "message_templates"."reviewed_at" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_tenant_name_language_uq` ON `message_templates` (`tenant_id`,`name`,`language`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_meta_id_uq` ON `message_templates` (`meta_template_id`) WHERE "message_templates"."meta_template_id" is not null;--> statement-breakpoint
CREATE INDEX `message_templates_tenant_status_updated_idx` ON `message_templates` (`tenant_id`,`status`,`updated_at`);
