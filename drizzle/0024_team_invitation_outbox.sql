CREATE TABLE `team_invitation_deliveries` (
	`delivery_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`invitation_key` text NOT NULL,
	`invitation_version` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`submitted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`,`invitation_key`) REFERENCES `team_invitations`(`tenant_id`,`invitation_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "team_invitation_deliveries_key_valid" CHECK(length("team_invitation_deliveries"."delivery_key") = 92
          and "team_invitation_deliveries"."delivery_key" glob 'team_invitation_delivery_v1_[0-9a-f]*'
          and substr("team_invitation_deliveries"."delivery_key", 29) not glob '*[^0-9a-f]*'),
	CONSTRAINT "team_invitation_deliveries_version_positive" CHECK("team_invitation_deliveries"."invitation_version" >= 1),
	CONSTRAINT "team_invitation_deliveries_status_valid" CHECK("team_invitation_deliveries"."status" in ('pending', 'sending', 'submitted', 'blocked', 'ambiguous', 'cancelled')),
	CONSTRAINT "team_invitation_deliveries_attempt_count_valid" CHECK("team_invitation_deliveries"."attempt_count" >= 0),
	CONSTRAINT "team_invitation_deliveries_error_code_valid" CHECK("team_invitation_deliveries"."last_error_code" is null
          or (
            length("team_invitation_deliveries"."last_error_code") between 1 and 100
            and "team_invitation_deliveries"."last_error_code" not glob '*[^A-Z0-9_]*'
          )),
	CONSTRAINT "team_invitation_deliveries_created_at_canonical" CHECK(length("team_invitation_deliveries"."created_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitation_deliveries"."created_at")
            = "team_invitation_deliveries"."created_at"),
	CONSTRAINT "team_invitation_deliveries_updated_at_canonical" CHECK(length("team_invitation_deliveries"."updated_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitation_deliveries"."updated_at")
            = "team_invitation_deliveries"."updated_at"
          and "team_invitation_deliveries"."updated_at" >= "team_invitation_deliveries"."created_at"),
	CONSTRAINT "team_invitation_deliveries_submitted_at_canonical" CHECK("team_invitation_deliveries"."submitted_at" is null
          or (
            length("team_invitation_deliveries"."submitted_at") = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitation_deliveries"."submitted_at")
              = "team_invitation_deliveries"."submitted_at"
            and "team_invitation_deliveries"."submitted_at" >= "team_invitation_deliveries"."created_at"
          )),
	CONSTRAINT "team_invitation_deliveries_state_shape_valid" CHECK((
            "team_invitation_deliveries"."status" = 'pending'
            and "team_invitation_deliveries"."attempt_count" = 0
            and "team_invitation_deliveries"."last_error_code" is null
            and "team_invitation_deliveries"."submitted_at" is null
          ) or (
            "team_invitation_deliveries"."status" = 'sending'
            and "team_invitation_deliveries"."attempt_count" = 1
            and "team_invitation_deliveries"."last_error_code" is null
            and "team_invitation_deliveries"."submitted_at" is null
          ) or (
            "team_invitation_deliveries"."status" = 'submitted'
            and "team_invitation_deliveries"."attempt_count" = 1
            and "team_invitation_deliveries"."last_error_code" is null
            and "team_invitation_deliveries"."submitted_at" is not null
          ) or (
            "team_invitation_deliveries"."status" in ('blocked', 'ambiguous', 'cancelled')
            and "team_invitation_deliveries"."attempt_count" in (0, 1)
            and "team_invitation_deliveries"."last_error_code" is not null
            and "team_invitation_deliveries"."submitted_at" is null
          ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitation_deliveries_invitation_version_uq` ON `team_invitation_deliveries` (`invitation_key`,`invitation_version`);--> statement-breakpoint
CREATE INDEX `team_invitation_deliveries_status_created_idx` ON `team_invitation_deliveries` (`status`,`created_at`);--> statement-breakpoint
CREATE TRIGGER `team_invitation_deliveries_insert_guard`
BEFORE INSERT ON `team_invitation_deliveries`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `team_invitations`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `invitation_key` = NEW.`invitation_key`
    AND `version` = NEW.`invitation_version`
    AND `status` = 'pending'
    AND `requested_at` = NEW.`created_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation delivery does not match pending invitation'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_deliveries_identity_guard`
BEFORE UPDATE OF
  `delivery_key`,
  `tenant_id`,
  `invitation_key`,
  `invitation_version`,
  `created_at`
ON `team_invitation_deliveries`
FOR EACH ROW
WHEN NEW.`delivery_key` <> OLD.`delivery_key`
  OR NEW.`tenant_id` <> OLD.`tenant_id`
  OR NEW.`invitation_key` <> OLD.`invitation_key`
  OR NEW.`invitation_version` <>
    OLD.`invitation_version`
  OR NEW.`created_at` <> OLD.`created_at`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation delivery identity is immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_deliveries_transition_guard`
BEFORE UPDATE OF
  `status`,
  `attempt_count`,
  `last_error_code`,
  `submitted_at`,
  `updated_at`
ON `team_invitation_deliveries`
FOR EACH ROW
WHEN NOT (
  OLD.`status` = 'pending'
  AND NEW.`status` = 'sending'
  AND NEW.`attempt_count` = 1
  AND NEW.`last_error_code` IS NULL
  AND NEW.`submitted_at` IS NULL
) AND NOT (
  OLD.`status` = 'pending'
  AND NEW.`status` = 'cancelled'
  AND NEW.`attempt_count` = 0
  AND NEW.`last_error_code` IS NOT NULL
  AND NEW.`submitted_at` IS NULL
) AND NOT (
  OLD.`status` = 'sending'
  AND NEW.`status` = 'submitted'
  AND NEW.`attempt_count` = 1
  AND NEW.`last_error_code` IS NULL
  AND NEW.`submitted_at` IS NOT NULL
) AND NOT (
  OLD.`status` = 'sending'
  AND NEW.`status` IN ('blocked', 'ambiguous')
  AND NEW.`attempt_count` = 1
  AND NEW.`last_error_code` IS NOT NULL
  AND NEW.`submitted_at` IS NULL
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation delivery transition is invalid'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_deliveries_active_delete_guard`
BEFORE DELETE ON `team_invitation_deliveries`
FOR EACH ROW
WHEN OLD.`status` IN ('pending', 'sending')
BEGIN
  SELECT RAISE(
    ABORT,
    'active team invitation deliveries cannot be deleted'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitations_delivery_sending_guard`
BEFORE UPDATE OF `role`, `status`, `version`
ON `team_invitations`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `team_invitation_deliveries`
  WHERE `tenant_id` = OLD.`tenant_id`
    AND `invitation_key` =
      OLD.`invitation_key`
    AND `invitation_version` =
      OLD.`version`
    AND `status` = 'sending'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'sending invitation delivery must settle before invitation transition'
  );
END;
