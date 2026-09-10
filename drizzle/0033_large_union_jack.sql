CREATE TABLE `business_profile_admin_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`previous_profile_digest` text NOT NULL,
	`new_profile_digest` text NOT NULL,
	`changed_fields` text NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`profile_version` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `business_profiles`(`tenant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "business_profile_admin_events_key_sha256" CHECK(length("business_profile_admin_events"."event_key") = 96
          and substr("business_profile_admin_events"."event_key", 1, 32)
            = 'business_profile_admin_event_v1_'
          and substr("business_profile_admin_events"."event_key", 33)
            not glob '*[^0-9a-f]*'),
	CONSTRAINT "business_profile_admin_events_previous_digest_sha256" CHECK(length("business_profile_admin_events"."previous_profile_digest") = 64
          and "business_profile_admin_events"."previous_profile_digest"
            not glob '*[^0-9a-f]*'),
	CONSTRAINT "business_profile_admin_events_new_digest_sha256" CHECK(length("business_profile_admin_events"."new_profile_digest") = 64
          and "business_profile_admin_events"."new_profile_digest"
            not glob '*[^0-9a-f]*'
          and "business_profile_admin_events"."new_profile_digest"
            <> "business_profile_admin_events"."previous_profile_digest"),
	CONSTRAINT "business_profile_admin_events_changed_fields_valid" CHECK("business_profile_admin_events"."changed_fields" in (
          'businessName',
          'timezone',
          'interfaceLanguage',
          'businessName,timezone',
          'businessName,interfaceLanguage',
          'timezone,interfaceLanguage',
          'businessName,timezone,interfaceLanguage'
        )),
	CONSTRAINT "business_profile_admin_events_actor_bounded" CHECK(length(trim("business_profile_admin_events"."actor_external_user_id")) between 1 and 255),
	CONSTRAINT "business_profile_admin_events_version_valid" CHECK("business_profile_admin_events"."profile_version" >= 2),
	CONSTRAINT "business_profile_admin_events_occurred_at_canonical" CHECK(length("business_profile_admin_events"."occurred_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "business_profile_admin_events"."occurred_at")
            = "business_profile_admin_events"."occurred_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_profile_admin_events_tenant_version_uq` ON `business_profile_admin_events` (`tenant_id`,`profile_version`);
--> statement-breakpoint
CREATE INDEX `business_profile_admin_events_tenant_occurred_idx` ON `business_profile_admin_events` (`tenant_id`,`occurred_at`);
--> statement-breakpoint
CREATE TRIGGER `business_profile_admin_events_proof_guard`
BEFORE INSERT ON `business_profile_admin_events`
WHEN NOT EXISTS (
  SELECT 1
  FROM `business_profiles`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `version` = NEW.`profile_version`
    AND `updated_at` = NEW.`occurred_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Business profile admin event is not linked to current state'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `business_profile_admin_events_insert_audit`
AFTER INSERT ON `business_profile_admin_events`
BEGIN
  INSERT INTO `audit_logs` (
    `tenant_id`,
    `actor_external_user_id`,
    `action`,
    `target_type`,
    `target_id`,
    `idempotency_key`,
    `metadata_json`
  ) VALUES (
    NEW.`tenant_id`,
    NEW.`actor_external_user_id`,
    'business_profile.updated',
    'business_profile',
    CAST(NEW.`tenant_id` AS TEXT),
    NEW.`event_key`,
    NULL
  );
END;
--> statement-breakpoint
CREATE TRIGGER `business_profile_admin_events_update_guard`
BEFORE UPDATE ON `business_profile_admin_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'Business profile admin events are immutable'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `business_profile_admin_events_delete_guard`
BEFORE DELETE ON `business_profile_admin_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'Business profile admin events are immutable'
  );
END;
