ALTER TABLE `team_invitations`
ADD COLUMN `last_actor_kind` text NOT NULL DEFAULT 'user'
CONSTRAINT `team_invitations_last_actor_kind_valid`
CHECK (
  `last_actor_kind` = 'user'
  OR (
    `last_actor_kind` = 'system'
    AND `status` = 'expired'
    AND `last_actor_external_user_id` =
      'team-invitation-expiration-scheduler-v1'
  )
);--> statement-breakpoint
ALTER TABLE `team_invitation_events`
ADD COLUMN `actor_kind` text NOT NULL DEFAULT 'user'
CONSTRAINT `team_invitation_events_actor_kind_valid`
CHECK (
  `actor_kind` = 'user'
  OR (
    `actor_kind` = 'system'
    AND `event_type` = 'expired'
    AND `actor_external_user_id` =
      'team-invitation-expiration-scheduler-v1'
  )
);--> statement-breakpoint
DROP TRIGGER `team_invitations_state_version_guard`;--> statement-breakpoint
CREATE TRIGGER `team_invitations_state_version_guard`
BEFORE UPDATE OF
  `role`,
  `status`,
  `version`,
  `last_actor_kind`,
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
    OR NEW.`last_actor_kind` <>
      OLD.`last_actor_kind`
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
  AND NEW.`last_actor_kind` =
    OLD.`last_actor_kind`
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
DROP TRIGGER `team_invitation_events_state_guard`;--> statement-breakpoint
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
    AND `last_actor_kind` =
      NEW.`actor_kind`
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
END;
