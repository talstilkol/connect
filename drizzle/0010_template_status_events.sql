PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message_templates` (
	`template_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`meta_template_id` text,
	`name` text NOT NULL,
	`language` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`submission_key` text,
	`submission_started_at` text,
	`last_submission_error_code` text,
	`last_status_event_key` text,
	`last_status_event_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`submitted_at` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "message_templates_key_sha256" CHECK(length("template_key") = 76
        and substr("template_key", 1, 12) = 'template_v1_'
        and substr("template_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "message_templates_meta_id_valid" CHECK("meta_template_id" is null
        or (
          length("meta_template_id") between 1 and 255
          and "meta_template_id" not glob '*[^0-9]*'
        )),
	CONSTRAINT "message_templates_name_valid" CHECK(length("name") between 1 and 255
        and "name" not glob '*[^a-z0-9_]*'),
	CONSTRAINT "message_templates_language_valid" CHECK("language" in ('he', 'en_US', 'ar')),
	CONSTRAINT "message_templates_category_valid" CHECK("category" in ('MARKETING', 'UTILITY')),
	CONSTRAINT "message_templates_status_valid" CHECK("status" in ('draft', 'submitting', 'pending_review', 'approved', 'rejected', 'disabled', 'deleted')),
	CONSTRAINT "message_templates_definition_json_valid" CHECK(length("definition_json") between 2 and 50000
        and json_valid("definition_json")),
	CONSTRAINT "message_templates_submission_key_valid" CHECK("submission_key" is null
        or (
          length("submission_key") = 87
          and substr("submission_key", 1, 23) = 'template_submission_v1_'
          and substr("submission_key", 24) not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "message_templates_submission_error_code_valid" CHECK("last_submission_error_code" is null
        or (
          length("last_submission_error_code") between 1 and 100
          and "last_submission_error_code" not glob '*[^A-Z0-9_]*'
        )),
	CONSTRAINT "message_templates_status_event_key_valid" CHECK("last_status_event_key" is null
        or (
          length("last_status_event_key") = 64
          and "last_status_event_key" not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "message_templates_status_event_at_valid" CHECK("last_status_event_at" is null
        or (
          length("last_status_event_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "last_status_event_at")
            = "last_status_event_at"
        )),
	CONSTRAINT "message_templates_status_event_pair_consistent" CHECK((
        "last_status_event_key" is null
        and "last_status_event_at" is null
      ) or (
        "last_status_event_key" is not null
        and "last_status_event_at" is not null
      )),
	CONSTRAINT "message_templates_version_positive" CHECK("version" >= 1),
	CONSTRAINT "message_templates_lifecycle_consistent" CHECK((
        "status" = 'draft'
        and "meta_template_id" is null
        and "submission_key" is null
        and "submission_started_at" is null
        and "last_status_event_key" is null
        and "last_status_event_at" is null
        and "submitted_at" is null
        and "reviewed_at" is null
      ) or (
        "status" = 'submitting'
        and "meta_template_id" is null
        and "submission_key" is not null
        and "submission_started_at" is not null
        and "last_submission_error_code" is null
        and "last_status_event_key" is null
        and "last_status_event_at" is null
        and "submitted_at" is null
        and "reviewed_at" is null
      ) or (
        "status" = 'pending_review'
        and "meta_template_id" is not null
        and "submission_key" is not null
        and "submission_started_at" is not null
        and "last_submission_error_code" is null
        and "submitted_at" is not null
        and "reviewed_at" is null
      ) or (
        "status" in ('approved', 'rejected', 'disabled', 'deleted')
        and "meta_template_id" is not null
        and "submission_key" is not null
        and "submission_started_at" is not null
        and "last_submission_error_code" is null
        and "submitted_at" is not null
        and "reviewed_at" is not null
      ))
);
--> statement-breakpoint
INSERT INTO `__new_message_templates`("template_key", "tenant_id", "meta_template_id", "name", "language", "category", "status", "definition_json", "submission_key", "submission_started_at", "last_submission_error_code", "last_status_event_key", "last_status_event_at", "version", "submitted_at", "reviewed_at", "created_at", "updated_at") SELECT "template_key", "tenant_id", "meta_template_id", "name", "language", "category", "status", "definition_json", "submission_key", "submission_started_at", "last_submission_error_code", null, null, "version", "submitted_at", "reviewed_at", "created_at", "updated_at" FROM `message_templates`;--> statement-breakpoint
DROP TABLE `message_templates`;--> statement-breakpoint
ALTER TABLE `__new_message_templates` RENAME TO `message_templates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_tenant_name_language_uq` ON `message_templates` (`tenant_id`,`name`,`language`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_meta_id_uq` ON `message_templates` (`meta_template_id`) WHERE "message_templates"."meta_template_id" is not null;--> statement-breakpoint
CREATE INDEX `message_templates_tenant_status_updated_idx` ON `message_templates` (`tenant_id`,`status`,`updated_at`);
