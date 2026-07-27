CREATE TABLE `production_decision_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`event_type` text DEFAULT 'recorded' NOT NULL,
	`selection` text NOT NULL,
	`rationale` text NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`decision_version` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `production_decision_records`(`check_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "production_decision_events_key_sha256" CHECK(length("production_decision_events"."event_key") = 93
          and substr("production_decision_events"."event_key", 1, 29)
            = 'production_decision_event_v1_'
          and substr("production_decision_events"."event_key", 30)
            not glob '*[^0-9a-f]*'),
	CONSTRAINT "production_decision_events_type_valid" CHECK("production_decision_events"."event_type" = 'recorded'),
	CONSTRAINT "production_decision_events_selection_bounded" CHECK(length(trim("production_decision_events"."selection")) between 1 and 120
          and trim("production_decision_events"."selection") = "production_decision_events"."selection"),
	CONSTRAINT "production_decision_events_rationale_bounded" CHECK(length(trim("production_decision_events"."rationale")) between 1 and 2000
          and trim("production_decision_events"."rationale") = "production_decision_events"."rationale"),
	CONSTRAINT "production_decision_events_actor_bounded" CHECK(length(trim("production_decision_events"."actor_external_user_id")) between 1 and 255
          and trim("production_decision_events"."actor_external_user_id")
            = "production_decision_events"."actor_external_user_id"),
	CONSTRAINT "production_decision_events_version_positive" CHECK("production_decision_events"."decision_version" >= 1),
	CONSTRAINT "production_decision_events_occurred_at_canonical" CHECK(length("production_decision_events"."occurred_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "production_decision_events"."occurred_at")
            = "production_decision_events"."occurred_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_decision_events_check_version_uq` ON `production_decision_events` (`check_id`,`decision_version`);--> statement-breakpoint
CREATE INDEX `production_decision_events_check_occurred_idx` ON `production_decision_events` (`check_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `production_decision_records` (
	`check_id` text PRIMARY KEY NOT NULL,
	`selection` text NOT NULL,
	`rationale` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`last_event_key` text NOT NULL,
	`decided_by_external_user_id` text NOT NULL,
	`decided_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "production_decision_records_check_id_bounded" CHECK(length(trim("production_decision_records"."check_id")) between 3 and 100
          and trim("production_decision_records"."check_id") = "production_decision_records"."check_id"),
	CONSTRAINT "production_decision_records_selection_bounded" CHECK(length(trim("production_decision_records"."selection")) between 1 and 120
          and trim("production_decision_records"."selection") = "production_decision_records"."selection"),
	CONSTRAINT "production_decision_records_rationale_bounded" CHECK(length(trim("production_decision_records"."rationale")) between 1 and 2000
          and trim("production_decision_records"."rationale") = "production_decision_records"."rationale"),
	CONSTRAINT "production_decision_records_version_positive" CHECK("production_decision_records"."version" >= 1),
	CONSTRAINT "production_decision_records_event_key_sha256" CHECK(length("production_decision_records"."last_event_key") = 93
          and substr("production_decision_records"."last_event_key", 1, 29)
            = 'production_decision_event_v1_'
          and substr("production_decision_records"."last_event_key", 30)
            not glob '*[^0-9a-f]*'),
	CONSTRAINT "production_decision_records_actor_bounded" CHECK(length(trim("production_decision_records"."decided_by_external_user_id")) between 1 and 255
          and trim("production_decision_records"."decided_by_external_user_id")
            = "production_decision_records"."decided_by_external_user_id"),
	CONSTRAINT "production_decision_records_decided_at_canonical" CHECK(length("production_decision_records"."decided_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "production_decision_records"."decided_at")
            = "production_decision_records"."decided_at"),
	CONSTRAINT "production_decision_records_updated_at_canonical" CHECK(length("production_decision_records"."updated_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "production_decision_records"."updated_at")
            = "production_decision_records"."updated_at")
);
--> statement-breakpoint
CREATE INDEX `production_decision_records_updated_idx` ON `production_decision_records` (`updated_at`);--> statement-breakpoint
CREATE TRIGGER `production_decision_records_insert_audit`
AFTER INSERT ON `production_decision_records`
FOR EACH ROW
BEGIN
  INSERT INTO `production_decision_events` (
    `event_key`,
    `check_id`,
    `event_type`,
    `selection`,
    `rationale`,
    `actor_external_user_id`,
    `decision_version`,
    `occurred_at`
  )
  VALUES (
    NEW.`last_event_key`,
    NEW.`check_id`,
    'recorded',
    NEW.`selection`,
    NEW.`rationale`,
    NEW.`decided_by_external_user_id`,
    NEW.`version`,
    NEW.`decided_at`
  );
END;--> statement-breakpoint
CREATE TRIGGER `production_decision_records_update_guard`
BEFORE UPDATE ON `production_decision_records`
FOR EACH ROW
WHEN
  NEW.`check_id` <> OLD.`check_id`
  OR NEW.`version` <> OLD.`version` + 1
  OR NEW.`last_event_key` = OLD.`last_event_key`
  OR NEW.`decided_at` <> NEW.`updated_at`
BEGIN
  SELECT RAISE(
    ABORT,
    'invalid production decision transition'
  );
END;--> statement-breakpoint
CREATE TRIGGER `production_decision_records_update_audit`
AFTER UPDATE ON `production_decision_records`
FOR EACH ROW
BEGIN
  INSERT INTO `production_decision_events` (
    `event_key`,
    `check_id`,
    `event_type`,
    `selection`,
    `rationale`,
    `actor_external_user_id`,
    `decision_version`,
    `occurred_at`
  )
  VALUES (
    NEW.`last_event_key`,
    NEW.`check_id`,
    'recorded',
    NEW.`selection`,
    NEW.`rationale`,
    NEW.`decided_by_external_user_id`,
    NEW.`version`,
    NEW.`decided_at`
  );
END;
