-- Persistent contacts and explicit consent/unsubscribe history.
CREATE TABLE `contact_consent_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`source` text NOT NULL,
	`occurred_at` text NOT NULL,
	`evidence_reference` text,
	`actor_external_user_id` text,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contact_consent_events_type_valid" CHECK("contact_consent_events"."event_type" in ('granted', 'unsubscribed')),
	CONSTRAINT "contact_consent_events_source_not_blank" CHECK(length(trim("contact_consent_events"."source")) > 0),
	CONSTRAINT "contact_consent_events_occurred_at_not_blank" CHECK(length(trim("contact_consent_events"."occurred_at")) > 0),
	CONSTRAINT "contact_consent_events_idempotency_key_not_blank" CHECK(length(trim("contact_consent_events"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_consent_events_tenant_key_uq` ON `contact_consent_events` (`tenant_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `contact_consent_events_contact_time_idx` ON `contact_consent_events` (`tenant_id`,`contact_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`phone_e164` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`email` text,
	`company` text,
	`mailing_status` text DEFAULT 'unsubscribed' NOT NULL,
	`consent_status` text DEFAULT 'unknown' NOT NULL,
	`consent_source` text,
	`consent_recorded_at` text,
	`consent_withdrawn_at` text,
	`consent_evidence_reference` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contacts_phone_e164_valid" CHECK(length("contacts"."phone_e164") between 2 and 16
        and substr("contacts"."phone_e164", 1, 1) = '+'
        and substr("contacts"."phone_e164", 2, 1) between '1' and '9'
        and substr("contacts"."phone_e164", 2) not glob '*[^0-9]*'),
	CONSTRAINT "contacts_mailing_status_valid" CHECK("contacts"."mailing_status" in ('subscribed', 'unsubscribed')),
	CONSTRAINT "contacts_consent_status_valid" CHECK("contacts"."consent_status" in ('unknown', 'granted', 'withdrawn')),
	CONSTRAINT "contacts_consent_state_consistent" CHECK((
        "contacts"."consent_status" = 'unknown'
        and "contacts"."mailing_status" = 'unsubscribed'
        and "contacts"."consent_source" is null
        and "contacts"."consent_recorded_at" is null
        and "contacts"."consent_withdrawn_at" is null
      ) or (
        "contacts"."consent_status" = 'granted'
        and "contacts"."mailing_status" = 'subscribed'
        and "contacts"."consent_source" is not null
        and "contacts"."consent_recorded_at" is not null
        and "contacts"."consent_withdrawn_at" is null
      ) or (
        "contacts"."consent_status" = 'withdrawn'
        and "contacts"."mailing_status" = 'unsubscribed'
        and "contacts"."consent_source" is not null
        and "contacts"."consent_recorded_at" is not null
        and "contacts"."consent_withdrawn_at" is not null
      )),
	CONSTRAINT "contacts_version_positive" CHECK("contacts"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_tenant_phone_uq` ON `contacts` (`tenant_id`,`phone_e164`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_updated_idx` ON `contacts` (`tenant_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_mailing_idx` ON `contacts` (`tenant_id`,`mailing_status`);
