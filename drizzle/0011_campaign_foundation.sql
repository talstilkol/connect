CREATE TABLE `campaign_recipients` (
	`campaign_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`contact_version` integer NOT NULL,
	`phone_e164` text NOT NULL,
	`personalization_json` text NOT NULL,
	`personalization_key` text NOT NULL,
	`delivery_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`queued_at` text,
	`accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`campaign_key`, `contact_id`),
	FOREIGN KEY (`tenant_id`,`campaign_key`) REFERENCES `campaigns`(`tenant_id`,`campaign_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`contact_id`) REFERENCES `contacts`(`tenant_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaign_recipients_campaign_key_sha256" CHECK(length("campaign_recipients"."campaign_key") = 76
        and substr("campaign_recipients"."campaign_key", 1, 12) = 'campaign_v1_'
        and substr("campaign_recipients"."campaign_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaign_recipients_contact_version_positive" CHECK("campaign_recipients"."contact_version" >= 1),
	CONSTRAINT "campaign_recipients_phone_e164_valid" CHECK(length("campaign_recipients"."phone_e164") between 2 and 16
        and substr("campaign_recipients"."phone_e164", 1, 1) = '+'
        and substr("campaign_recipients"."phone_e164", 2, 1) between '1' and '9'
        and substr("campaign_recipients"."phone_e164", 2) not glob '*[^0-9]*'),
	CONSTRAINT "campaign_recipients_personalization_json_valid" CHECK(length("campaign_recipients"."personalization_json") between 2 and 50000
        and json_valid("campaign_recipients"."personalization_json")),
	CONSTRAINT "campaign_recipients_personalization_key_sha256" CHECK(length("campaign_recipients"."personalization_key") = 64
        and "campaign_recipients"."personalization_key" not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaign_recipients_delivery_key_sha256" CHECK(length("campaign_recipients"."delivery_key") = 85
        and substr("campaign_recipients"."delivery_key", 1, 21) = 'campaign_delivery_v1_'
        and substr("campaign_recipients"."delivery_key", 22) not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaign_recipients_status_valid" CHECK("campaign_recipients"."status" in ('pending', 'queued', 'sending', 'accepted', 'delivered', 'read', 'failed', 'skipped', 'cancelled')),
	CONSTRAINT "campaign_recipients_attempt_count_nonnegative" CHECK("campaign_recipients"."attempt_count" >= 0),
	CONSTRAINT "campaign_recipients_error_code_valid" CHECK("campaign_recipients"."last_error_code" is null
        or (
          length("campaign_recipients"."last_error_code") between 1 and 100
          and "campaign_recipients"."last_error_code" not glob '*[^A-Z0-9_]*'
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_recipients_delivery_key_uq` ON `campaign_recipients` (`delivery_key`);--> statement-breakpoint
CREATE INDEX `campaign_recipients_tenant_status_idx` ON `campaign_recipients` (`tenant_id`,`status`,`contact_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`campaign_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`delivery_mode` text NOT NULL,
	`scheduled_at` text,
	`timezone` text NOT NULL,
	`template_key` text NOT NULL,
	`template_snapshot_json` text NOT NULL,
	`audience_snapshot_key` text NOT NULL,
	`recipient_count` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`activated_at` text,
	`started_at` text,
	`completed_at` text,
	`last_error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`template_key`) REFERENCES `message_templates`(`tenant_id`,`template_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaigns_key_sha256" CHECK(length("campaigns"."campaign_key") = 76
        and substr("campaigns"."campaign_key", 1, 12) = 'campaign_v1_'
        and substr("campaigns"."campaign_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaigns_name_bounded" CHECK(length(trim("campaigns"."name")) between 1 and 160),
	CONSTRAINT "campaigns_status_valid" CHECK("campaigns"."status" in ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed')),
	CONSTRAINT "campaigns_delivery_mode_valid" CHECK("campaigns"."delivery_mode" in ('immediate', 'scheduled')),
	CONSTRAINT "campaigns_schedule_consistent" CHECK((
        "campaigns"."delivery_mode" = 'immediate'
        and "campaigns"."scheduled_at" is null
      ) or (
        "campaigns"."delivery_mode" = 'scheduled'
        and length(trim("campaigns"."scheduled_at")) > 0
      )),
	CONSTRAINT "campaigns_timezone_bounded" CHECK(length(trim("campaigns"."timezone")) between 1 and 100),
	CONSTRAINT "campaigns_template_key_sha256" CHECK(length("campaigns"."template_key") = 76
        and substr("campaigns"."template_key", 1, 12) = 'template_v1_'
        and substr("campaigns"."template_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaigns_template_snapshot_json_valid" CHECK(length("campaigns"."template_snapshot_json") between 2 and 50000
        and json_valid("campaigns"."template_snapshot_json")),
	CONSTRAINT "campaigns_audience_key_sha256" CHECK(length("campaigns"."audience_snapshot_key") = 64
        and "campaigns"."audience_snapshot_key" not glob '*[^0-9a-f]*'),
	CONSTRAINT "campaigns_recipient_count_bounded" CHECK("campaigns"."recipient_count" between 1 and 100000),
	CONSTRAINT "campaigns_version_positive" CHECK("campaigns"."version" >= 1),
	CONSTRAINT "campaigns_error_code_valid" CHECK("campaigns"."last_error_code" is null
        or (
          length("campaigns"."last_error_code") between 1 and 100
          and "campaigns"."last_error_code" not glob '*[^A-Z0-9_]*'
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_tenant_key_uq` ON `campaigns` (`tenant_id`,`campaign_key`);--> statement-breakpoint
CREATE INDEX `campaigns_tenant_audience_idx` ON `campaigns` (`tenant_id`,`audience_snapshot_key`);--> statement-breakpoint
CREATE INDEX `campaigns_tenant_status_schedule_idx` ON `campaigns` (`tenant_id`,`status`,`scheduled_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_tenant_id_uq` ON `contacts` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_tenant_key_uq` ON `message_templates` (`tenant_id`,`template_key`);
