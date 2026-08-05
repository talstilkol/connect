CREATE TABLE `team_invitation_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`operation_key` text NOT NULL,
	`invitation_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_role` text,
	`to_role` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`from_version` integer NOT NULL,
	`to_version` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`invitation_key`) REFERENCES `team_invitations`(`tenant_id`,`invitation_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "team_invitation_events_key_valid" CHECK(length("team_invitation_events"."event_key") = 89
          and "team_invitation_events"."event_key" glob 'team_invitation_event_v1_[0-9a-f]*'
          and substr("team_invitation_events"."event_key", 26) not glob '*[^0-9a-f]*'),
	CONSTRAINT "team_invitation_events_operation_key_valid" CHECK(length("team_invitation_events"."operation_key") = 93
          and "team_invitation_events"."operation_key" glob 'team_invitation_operation_v1_[0-9a-f]*'
          and substr("team_invitation_events"."operation_key", 30) not glob '*[^0-9a-f]*'),
	CONSTRAINT "team_invitation_events_actor_bounded" CHECK(length(trim("team_invitation_events"."actor_external_user_id")) between 1 and 512
          and trim("team_invitation_events"."actor_external_user_id")
            = "team_invitation_events"."actor_external_user_id"),
	CONSTRAINT "team_invitation_events_type_valid" CHECK("team_invitation_events"."event_type" in ('requested', 're-requested', 'revoked', 'expired')),
	CONSTRAINT "team_invitation_events_to_role_valid" CHECK("team_invitation_events"."to_role" in ('manager', 'agent', 'viewer')),
	CONSTRAINT "team_invitation_events_to_status_valid" CHECK("team_invitation_events"."to_status" in ('pending', 'revoked', 'expired')),
	CONSTRAINT "team_invitation_events_version_transition" CHECK((
            "team_invitation_events"."event_type" = 'requested'
            and "team_invitation_events"."from_version" = 0
            and "team_invitation_events"."to_version" = 1
          ) or (
            "team_invitation_events"."event_type" <> 'requested'
            and "team_invitation_events"."from_version" >= 1
            and "team_invitation_events"."to_version" = "team_invitation_events"."from_version" + 1
          )),
	CONSTRAINT "team_invitation_events_shape_valid" CHECK((
            "team_invitation_events"."event_type" = 'requested'
            and "team_invitation_events"."from_role" is null
            and "team_invitation_events"."from_status" is null
            and "team_invitation_events"."to_status" = 'pending'
          ) or (
            "team_invitation_events"."event_type" = 're-requested'
            and "team_invitation_events"."from_role" in ('manager', 'agent', 'viewer')
            and "team_invitation_events"."from_status" in ('revoked', 'expired')
            and "team_invitation_events"."to_status" = 'pending'
          ) or (
            "team_invitation_events"."event_type" = 'revoked'
            and "team_invitation_events"."from_role" = "team_invitation_events"."to_role"
            and "team_invitation_events"."from_status" = 'pending'
            and "team_invitation_events"."to_status" = 'revoked'
          ) or (
            "team_invitation_events"."event_type" = 'expired'
            and "team_invitation_events"."from_role" = "team_invitation_events"."to_role"
            and "team_invitation_events"."from_status" = 'pending'
            and "team_invitation_events"."to_status" = 'expired'
          )),
	CONSTRAINT "team_invitation_events_occurred_at_canonical" CHECK(length("team_invitation_events"."occurred_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitation_events"."occurred_at")
            = "team_invitation_events"."occurred_at"),
	CONSTRAINT "team_invitation_events_expires_at_canonical" CHECK(length("team_invitation_events"."expires_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitation_events"."expires_at")
            = "team_invitation_events"."expires_at"
          and (
            "team_invitation_events"."to_status" <> 'pending'
            or "team_invitation_events"."expires_at" > "team_invitation_events"."occurred_at"
          ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitation_events_operation_uq` ON `team_invitation_events` (`operation_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitation_events_invitation_version_uq` ON `team_invitation_events` (`invitation_key`,`to_version`);--> statement-breakpoint
CREATE INDEX `team_invitation_events_tenant_occurred_idx` ON `team_invitation_events` (`tenant_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`invitation_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`normalized_email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`invited_by_external_user_id` text NOT NULL,
	`last_actor_external_user_id` text NOT NULL,
	`requested_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "team_invitations_key_valid" CHECK(length("team_invitations"."invitation_key") = 83
          and "team_invitations"."invitation_key" glob 'team_invitation_v1_[0-9a-f]*'
          and substr("team_invitations"."invitation_key", 20) not glob '*[^0-9a-f]*'),
	CONSTRAINT "team_invitations_email_normalized" CHECK(length("team_invitations"."normalized_email") between 3 and 254
          and "team_invitations"."normalized_email" = lower(trim("team_invitations"."normalized_email"))
          and instr("team_invitations"."normalized_email", '@') > 1
          and instr(substr(
            "team_invitations"."normalized_email",
            instr("team_invitations"."normalized_email", '@') + 1
          ), '.') > 1),
	CONSTRAINT "team_invitations_role_valid" CHECK("team_invitations"."role" in ('manager', 'agent', 'viewer')),
	CONSTRAINT "team_invitations_status_valid" CHECK("team_invitations"."status" in ('pending', 'revoked', 'expired')),
	CONSTRAINT "team_invitations_version_positive" CHECK("team_invitations"."version" >= 1),
	CONSTRAINT "team_invitations_inviter_bounded" CHECK(length(trim("team_invitations"."invited_by_external_user_id")) between 1 and 512
          and trim("team_invitations"."invited_by_external_user_id")
            = "team_invitations"."invited_by_external_user_id"),
	CONSTRAINT "team_invitations_last_actor_bounded" CHECK(length(trim("team_invitations"."last_actor_external_user_id")) between 1 and 512
          and trim("team_invitations"."last_actor_external_user_id")
            = "team_invitations"."last_actor_external_user_id"),
	CONSTRAINT "team_invitations_requested_at_canonical" CHECK(length("team_invitations"."requested_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitations"."requested_at")
            = "team_invitations"."requested_at"),
	CONSTRAINT "team_invitations_expires_at_canonical" CHECK(length("team_invitations"."expires_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitations"."expires_at")
            = "team_invitations"."expires_at"
          and "team_invitations"."expires_at" > "team_invitations"."requested_at"),
	CONSTRAINT "team_invitations_updated_at_canonical" CHECK(length("team_invitations"."updated_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "team_invitations"."updated_at")
            = "team_invitations"."updated_at"
          and "team_invitations"."updated_at" >= "team_invitations"."requested_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_tenant_email_uq` ON `team_invitations` (`tenant_id`,`normalized_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_tenant_key_uq` ON `team_invitations` (`tenant_id`,`invitation_key`);--> statement-breakpoint
CREATE INDEX `team_invitations_tenant_status_expiry_idx` ON `team_invitations` (`tenant_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE TRIGGER `team_invitations_identity_guard`
BEFORE UPDATE OF
  `invitation_key`,
  `tenant_id`,
  `normalized_email`,
  `invited_by_external_user_id`,
  `created_at`
ON `team_invitations`
FOR EACH ROW
WHEN NEW.`invitation_key` <> OLD.`invitation_key`
  OR NEW.`tenant_id` <> OLD.`tenant_id`
  OR NEW.`normalized_email` <> OLD.`normalized_email`
  OR NEW.`invited_by_external_user_id` <>
    OLD.`invited_by_external_user_id`
  OR NEW.`created_at` <> OLD.`created_at`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation identity is immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitations_transition_guard`
BEFORE UPDATE OF `role`, `status`
ON `team_invitations`
FOR EACH ROW
WHEN NOT (
  OLD.`status` = 'pending'
  AND NEW.`status` IN ('revoked', 'expired')
  AND NEW.`role` = OLD.`role`
) AND NOT (
  OLD.`status` IN ('revoked', 'expired')
  AND NEW.`status` = 'pending'
  AND NEW.`role` IN ('manager', 'agent', 'viewer')
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation transition is invalid'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitations_state_version_guard`
BEFORE UPDATE OF
  `role`,
  `status`,
  `version`,
  `last_actor_external_user_id`,
  `requested_at`,
  `expires_at`,
  `updated_at`
ON `team_invitations`
FOR EACH ROW
WHEN (
  (
    NEW.`role` <> OLD.`role`
    OR NEW.`status` <> OLD.`status`
    OR NEW.`last_actor_external_user_id` <>
      OLD.`last_actor_external_user_id`
    OR NEW.`requested_at` <> OLD.`requested_at`
    OR NEW.`expires_at` <> OLD.`expires_at`
    OR NEW.`updated_at` <> OLD.`updated_at`
  )
  AND NEW.`version` <> OLD.`version` + 1
) OR (
  NEW.`role` = OLD.`role`
  AND NEW.`status` = OLD.`status`
  AND NEW.`last_actor_external_user_id` =
    OLD.`last_actor_external_user_id`
  AND NEW.`requested_at` = OLD.`requested_at`
  AND NEW.`expires_at` = OLD.`expires_at`
  AND NEW.`updated_at` = OLD.`updated_at`
  AND NEW.`version` <> OLD.`version`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation state requires an exact version transition'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitations_pending_delete_guard`
BEFORE DELETE ON `team_invitations`
FOR EACH ROW
WHEN OLD.`status` = 'pending'
BEGIN
  SELECT RAISE(
    ABORT,
    'pending team invitations cannot be deleted'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_events_state_guard`
BEFORE INSERT ON `team_invitation_events`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `team_invitations`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `invitation_key` = NEW.`invitation_key`
    AND `role` = NEW.`to_role`
    AND `status` = NEW.`to_status`
    AND `version` = NEW.`to_version`
    AND `last_actor_external_user_id` =
      NEW.`actor_external_user_id`
    AND `updated_at` = NEW.`occurred_at`
    AND `expires_at` = NEW.`expires_at`
    AND (
      NEW.`to_status` <> 'pending'
      OR `requested_at` = NEW.`occurred_at`
    )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation event does not match persisted state'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_events_update_guard`
BEFORE UPDATE ON `team_invitation_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation events are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_events_delete_guard`
BEFORE DELETE ON `team_invitation_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation events are immutable'
  );
END;
