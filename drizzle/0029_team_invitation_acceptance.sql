CREATE TABLE `team_invitation_acceptances` (
  `acceptance_key` text PRIMARY KEY NOT NULL,
  `tenant_id` integer NOT NULL,
  `invitation_key` text NOT NULL,
  `external_user_id` text NOT NULL,
  `normalized_email` text NOT NULL,
  `role` text NOT NULL,
  `from_version` integer NOT NULL,
  `to_version` integer NOT NULL,
  `accepted_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`tenant_id`, `invitation_key`)
    REFERENCES `team_invitations` (`tenant_id`, `invitation_key`)
    ON DELETE restrict,
  FOREIGN KEY (`tenant_id`, `external_user_id`)
    REFERENCES `tenant_memberships` (`tenant_id`, `external_user_id`)
    ON DELETE restrict,
  CONSTRAINT `team_invitation_acceptances_key_valid`
    CHECK (
      length(`acceptance_key`) = 94
      AND `acceptance_key` GLOB
        'team_invitation_acceptance_v1_[0-9a-f]*'
      AND substr(`acceptance_key`, 31)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `team_invitation_acceptances_user_bounded`
    CHECK (
      length(trim(`external_user_id`)) BETWEEN 1 AND 512
      AND trim(`external_user_id`) = `external_user_id`
    ),
  CONSTRAINT `team_invitation_acceptances_email_normalized`
    CHECK (
      length(`normalized_email`) BETWEEN 3 AND 254
      AND `normalized_email` =
        lower(trim(`normalized_email`))
      AND instr(`normalized_email`, '@') > 1
    ),
  CONSTRAINT `team_invitation_acceptances_role_valid`
    CHECK (`role` IN ('manager', 'agent', 'viewer')),
  CONSTRAINT `team_invitation_acceptances_version_transition`
    CHECK (
      `from_version` >= 1
      AND `to_version` = `from_version` + 1
    ),
  CONSTRAINT `team_invitation_acceptances_time_valid`
    CHECK (
      length(`accepted_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `accepted_at`
      ) = `accepted_at`
      AND length(`expires_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `expires_at`
      ) = `expires_at`
      AND `accepted_at` < `expires_at`
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX
  `team_invitation_acceptances_invitation_uq`
ON `team_invitation_acceptances` (`invitation_key`);--> statement-breakpoint
CREATE UNIQUE INDEX
  `team_invitation_acceptances_tenant_user_uq`
ON `team_invitation_acceptances` (
  `tenant_id`,
  `external_user_id`
);--> statement-breakpoint
CREATE INDEX
  `team_invitation_acceptances_tenant_accepted_idx`
ON `team_invitation_acceptances` (
  `tenant_id`,
  `accepted_at`
);--> statement-breakpoint
DROP TRIGGER
  `team_invitations_delivery_pending_guard`;--> statement-breakpoint
CREATE TRIGGER
  `team_invitations_delivery_active_guard`
BEFORE UPDATE OF `role`, `status`, `version`
ON `team_invitations`
FOR EACH ROW
WHEN OLD.`status` = 'pending'
  AND (
    NEW.`role` <> OLD.`role`
    OR NEW.`status` <> OLD.`status`
    OR NEW.`version` <> OLD.`version`
  )
  AND EXISTS (
    SELECT 1
    FROM `team_invitation_deliveries`
    WHERE `tenant_id` = OLD.`tenant_id`
      AND `invitation_key` =
        OLD.`invitation_key`
      AND `invitation_version` =
        OLD.`version`
      AND `status` IN (
        'pending',
        'sending'
      )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'active invitation delivery must be settled before invitation transition'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `team_invitation_acceptances_state_guard`
BEFORE INSERT ON `team_invitation_acceptances`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `team_invitations`
  INNER JOIN `tenant_memberships`
    ON `tenant_memberships`.`tenant_id` =
      `team_invitations`.`tenant_id`
    AND `tenant_memberships`.`external_user_id` =
      NEW.`external_user_id`
  WHERE `team_invitations`.`tenant_id` =
      NEW.`tenant_id`
    AND `team_invitations`.`invitation_key` =
      NEW.`invitation_key`
    AND `team_invitations`.`normalized_email` =
      NEW.`normalized_email`
    AND `team_invitations`.`role` =
      NEW.`role`
    AND `team_invitations`.`status` =
      'pending'
    AND `team_invitations`.`version` =
      NEW.`to_version`
    AND `team_invitations`.`last_actor_kind` =
      'user'
    AND `team_invitations`.`last_actor_external_user_id` =
      NEW.`external_user_id`
    AND `team_invitations`.`updated_at` =
      NEW.`accepted_at`
    AND `team_invitations`.`expires_at` =
      NEW.`expires_at`
    AND `tenant_memberships`.`role` =
      NEW.`role`
    AND `tenant_memberships`.`status` =
      'active'
    AND `tenant_memberships`.`version` = 1
    AND `tenant_memberships`.`created_at` =
      NEW.`accepted_at`
    AND `tenant_memberships`.`updated_at` =
      NEW.`accepted_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation acceptance does not match persisted state'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `team_invitation_acceptances_update_guard`
BEFORE UPDATE ON `team_invitation_acceptances`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation acceptances are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `team_invitation_acceptances_delete_guard`
BEFORE DELETE ON `team_invitation_acceptances`
BEGIN
  SELECT RAISE(
    ABORT,
    'team invitation acceptances are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `team_invitations_accepted_update_guard`
BEFORE UPDATE ON `team_invitations`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `team_invitation_acceptances`
  WHERE `invitation_key` =
    OLD.`invitation_key`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'accepted team invitations are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `team_invitations_accepted_delete_guard`
BEFORE DELETE ON `team_invitations`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `team_invitation_acceptances`
  WHERE `invitation_key` =
    OLD.`invitation_key`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'accepted team invitations are immutable'
  );
END;
