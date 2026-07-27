CREATE TABLE `meta_connections` (
	`tenant_id` integer PRIMARY KEY NOT NULL,
	`business_portfolio_id` text NOT NULL,
	`waba_id` text NOT NULL,
	`phone_number_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`webhook_subscribed_at` text,
	`connected_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "meta_connections_business_portfolio_id_not_blank" CHECK(length(trim("meta_connections"."business_portfolio_id")) > 0),
	CONSTRAINT "meta_connections_waba_id_not_blank" CHECK(length(trim("meta_connections"."waba_id")) > 0),
	CONSTRAINT "meta_connections_phone_number_id_not_blank" CHECK(length(trim("meta_connections"."phone_number_id")) > 0),
	CONSTRAINT "meta_connections_status_valid" CHECK("meta_connections"."status" in ('pending', 'connected', 'verification_required', 'revoked', 'error', 'restricted')),
	CONSTRAINT "meta_connections_lifecycle_consistent" CHECK((
        "meta_connections"."status" = 'pending'
        and "meta_connections"."webhook_subscribed_at" is null
        and "meta_connections"."connected_at" is null
      ) or (
        "meta_connections"."status" = 'connected'
        and "meta_connections"."webhook_subscribed_at" is not null
        and "meta_connections"."connected_at" is not null
      ) or (
        "meta_connections"."status" in ('verification_required', 'revoked', 'error', 'restricted')
      )),
	CONSTRAINT "meta_connections_version_positive" CHECK("meta_connections"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_connections_waba_uq` ON `meta_connections` (`waba_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `meta_connections_phone_number_uq` ON `meta_connections` (`phone_number_id`);--> statement-breakpoint
CREATE INDEX `meta_connections_status_idx` ON `meta_connections` (`status`);--> statement-breakpoint
CREATE TABLE `meta_webhook_receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`waba_id` text NOT NULL,
	`event_key` text NOT NULL,
	`object_type` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`last_error_code` text,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "meta_webhook_receipts_waba_id_not_blank" CHECK(length(trim("meta_webhook_receipts"."waba_id")) > 0),
	CONSTRAINT "meta_webhook_receipts_event_key_sha256" CHECK(length("meta_webhook_receipts"."event_key") = 64
        and "meta_webhook_receipts"."event_key" not glob '*[^0-9a-f]*'),
	CONSTRAINT "meta_webhook_receipts_object_type_not_blank" CHECK(length(trim("meta_webhook_receipts"."object_type")) > 0),
	CONSTRAINT "meta_webhook_receipts_status_valid" CHECK("meta_webhook_receipts"."status" in ('processing', 'processed', 'failed')),
	CONSTRAINT "meta_webhook_receipts_attempt_count_positive" CHECK("meta_webhook_receipts"."attempt_count" >= 1),
	CONSTRAINT "meta_webhook_receipts_state_consistent" CHECK((
        "meta_webhook_receipts"."status" = 'processing'
        and "meta_webhook_receipts"."processed_at" is null
        and "meta_webhook_receipts"."last_error_code" is null
      ) or (
        "meta_webhook_receipts"."status" = 'processed'
        and "meta_webhook_receipts"."processed_at" is not null
        and "meta_webhook_receipts"."last_error_code" is null
      ) or (
        "meta_webhook_receipts"."status" = 'failed'
        and "meta_webhook_receipts"."processed_at" is null
        and length(trim("meta_webhook_receipts"."last_error_code")) > 0
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_webhook_receipts_tenant_event_uq` ON `meta_webhook_receipts` (`tenant_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `meta_webhook_receipts_tenant_status_idx` ON `meta_webhook_receipts` (`tenant_id`,`status`,`updated_at`);