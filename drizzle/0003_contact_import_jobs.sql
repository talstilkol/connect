-- Persistent, resumable contact import jobs and privacy-safe row outcomes.
CREATE TABLE `contact_import_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`file_name` text NOT NULL,
	`total_rows` integer NOT NULL,
	`processed_rows` integer DEFAULT 0 NOT NULL,
	`created_rows` integer DEFAULT 0 NOT NULL,
	`updated_rows` integer DEFAULT 0 NOT NULL,
	`unchanged_rows` integer DEFAULT 0 NOT NULL,
	`rejected_rows` integer DEFAULT 0 NOT NULL,
	`duplicate_rows` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`created_by_external_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contact_import_jobs_idempotency_key_not_blank" CHECK(length(trim("contact_import_jobs"."idempotency_key")) > 0),
	CONSTRAINT "contact_import_jobs_file_name_not_blank" CHECK(length(trim("contact_import_jobs"."file_name")) > 0),
	CONSTRAINT "contact_import_jobs_total_rows_positive" CHECK("contact_import_jobs"."total_rows" > 0),
	CONSTRAINT "contact_import_jobs_counts_valid" CHECK("contact_import_jobs"."processed_rows" >= 0
        and "contact_import_jobs"."created_rows" >= 0
        and "contact_import_jobs"."updated_rows" >= 0
        and "contact_import_jobs"."unchanged_rows" >= 0
        and "contact_import_jobs"."rejected_rows" >= 0
        and "contact_import_jobs"."duplicate_rows" >= 0
        and "contact_import_jobs"."processed_rows" <= "contact_import_jobs"."total_rows"
        and "contact_import_jobs"."processed_rows" = "contact_import_jobs"."created_rows"
          + "contact_import_jobs"."updated_rows"
          + "contact_import_jobs"."unchanged_rows"
          + "contact_import_jobs"."rejected_rows"
          + "contact_import_jobs"."duplicate_rows"),
	CONSTRAINT "contact_import_jobs_status_valid" CHECK("contact_import_jobs"."status" in ('processing', 'completed')),
	CONSTRAINT "contact_import_jobs_completion_consistent" CHECK((
        "contact_import_jobs"."status" = 'processing'
        and "contact_import_jobs"."completed_at" is null
      ) or (
        "contact_import_jobs"."status" = 'completed'
        and "contact_import_jobs"."processed_rows" = "contact_import_jobs"."total_rows"
        and "contact_import_jobs"."completed_at" is not null
      )),
	CONSTRAINT "contact_import_jobs_actor_not_blank" CHECK(length(trim("contact_import_jobs"."created_by_external_user_id")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_import_jobs_tenant_key_uq` ON `contact_import_jobs` (`tenant_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `contact_import_jobs_tenant_created_idx` ON `contact_import_jobs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contact_import_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`job_id` integer NOT NULL,
	`source_row_number` integer NOT NULL,
	`contact_id` integer,
	`phone_fingerprint` text,
	`status` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `contact_import_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "contact_import_rows_source_row_positive" CHECK("contact_import_rows"."source_row_number" >= 2),
	CONSTRAINT "contact_import_rows_status_valid" CHECK("contact_import_rows"."status" in ('created', 'updated', 'unchanged', 'rejected', 'duplicate')),
	CONSTRAINT "contact_import_rows_reason_valid" CHECK("contact_import_rows"."reason" is null
        or "contact_import_rows"."reason" in ('missing_phone', 'invalid_phone', 'duplicate_in_file')),
	CONSTRAINT "contact_import_rows_outcome_consistent" CHECK((
        "contact_import_rows"."status" in ('created', 'updated', 'unchanged')
        and "contact_import_rows"."contact_id" is not null
        and "contact_import_rows"."phone_fingerprint" is not null
        and "contact_import_rows"."reason" is null
      ) or (
        "contact_import_rows"."status" = 'duplicate'
        and "contact_import_rows"."phone_fingerprint" is not null
        and "contact_import_rows"."reason" = 'duplicate_in_file'
      ) or (
        "contact_import_rows"."status" = 'rejected'
        and "contact_import_rows"."contact_id" is null
        and "contact_import_rows"."phone_fingerprint" is null
        and "contact_import_rows"."reason" in ('missing_phone', 'invalid_phone')
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_import_rows_job_source_uq` ON `contact_import_rows` (`job_id`,`source_row_number`);--> statement-breakpoint
CREATE INDEX `contact_import_rows_job_phone_idx` ON `contact_import_rows` (`job_id`,`phone_fingerprint`);--> statement-breakpoint
CREATE INDEX `contact_import_rows_tenant_job_idx` ON `contact_import_rows` (`tenant_id`,`job_id`);
