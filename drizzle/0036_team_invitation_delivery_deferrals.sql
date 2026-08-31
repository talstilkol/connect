-- Durable Clerk Retry-After state for team invitation delivery.
-- A deferral is written only while the delivery is sending; the trigger moves
-- the delivery back to pending in the same SQLite transaction.

DROP TRIGGER `team_invitation_deliveries_transition_guard`;--> statement-breakpoint
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
  AND NEW.`status` = 'pending'
  AND NEW.`attempt_count` = 0
  AND NEW.`last_error_code` IS NULL
  AND NEW.`submitted_at` IS NULL
  AND EXISTS (
    SELECT 1
    FROM `team_invitation_delivery_deferrals`
    WHERE `delivery_key` = NEW.`delivery_key`
      AND `tenant_id` = NEW.`tenant_id`
      AND `reason_code` = 'PROVIDER_RATE_LIMITED'
      AND `deferred_at` = NEW.`updated_at`
  )
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
) AND NOT (
  OLD.`status` = 'ambiguous'
  AND NEW.`status` = 'submitted'
  AND NEW.`attempt_count` = 1
  AND NEW.`last_error_code` IS NULL
  AND NEW.`submitted_at` IS NOT NULL
) AND NOT (
  OLD.`status` = 'ambiguous'
  AND NEW.`status` = 'blocked'
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
CREATE TABLE `team_invitation_delivery_deferrals` (
  `delivery_key` text PRIMARY KEY NOT NULL,
  `tenant_id` integer NOT NULL,
  `reason_code` text NOT NULL,
  `retry_after_at` text NOT NULL,
  `deferred_at` text NOT NULL,
  FOREIGN KEY (`delivery_key`)
    REFERENCES `team_invitation_deliveries` (`delivery_key`)
    ON DELETE CASCADE,
  CONSTRAINT `team_invitation_delivery_deferrals_key_valid` CHECK(
    length(`delivery_key`) = 92
    and `delivery_key` glob 'team_invitation_delivery_v1_[0-9a-f]*'
    and substr(`delivery_key`, 29) not glob '*[^0-9a-f]*'
  ),
  CONSTRAINT `team_invitation_delivery_deferrals_tenant_valid` CHECK(
    `tenant_id` >= 1
  ),
  CONSTRAINT `team_invitation_delivery_deferrals_reason_valid` CHECK(
    `reason_code` = 'PROVIDER_RATE_LIMITED'
  ),
  CONSTRAINT `team_invitation_delivery_deferrals_deferred_at_canonical` CHECK(
    length(`deferred_at`) = 24
    and strftime('%Y-%m-%dT%H:%M:%fZ', `deferred_at`) = `deferred_at`
  ),
  CONSTRAINT `team_invitation_delivery_deferrals_retry_after_at_valid` CHECK(
    length(`retry_after_at`) = 24
    and strftime('%Y-%m-%dT%H:%M:%fZ', `retry_after_at`) = `retry_after_at`
    and `retry_after_at` > `deferred_at`
    and unixepoch(`retry_after_at`) - unixepoch(`deferred_at`)
      between 1 and 86400
  )
);--> statement-breakpoint
CREATE INDEX `team_invitation_delivery_deferrals_tenant_retry_idx`
ON `team_invitation_delivery_deferrals` (`tenant_id`, `retry_after_at`);--> statement-breakpoint
CREATE TRIGGER `team_invitation_delivery_deferrals_insert_guard`
BEFORE INSERT ON `team_invitation_delivery_deferrals`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `team_invitation_deliveries`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` = 'sending'
    AND `updated_at` <= NEW.`deferred_at`
)
BEGIN
  SELECT RAISE(ABORT, 'team invitation delivery deferral state is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_delivery_deferrals_update_guard`
BEFORE UPDATE ON `team_invitation_delivery_deferrals`
FOR EACH ROW
WHEN NEW.`delivery_key` <> OLD.`delivery_key`
  OR NEW.`tenant_id` <> OLD.`tenant_id`
  OR NEW.`reason_code` <> OLD.`reason_code`
  OR NEW.`deferred_at` <= OLD.`deferred_at`
  OR NOT EXISTS (
    SELECT 1
    FROM `team_invitation_deliveries`
    WHERE `delivery_key` = NEW.`delivery_key`
      AND `tenant_id` = NEW.`tenant_id`
      AND `status` = 'sending'
      AND `updated_at` <= NEW.`deferred_at`
  )
BEGIN
  SELECT RAISE(ABORT, 'team invitation delivery deferral update is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_delivery_deferrals_insert_transition`
AFTER INSERT ON `team_invitation_delivery_deferrals`
FOR EACH ROW
BEGIN
  UPDATE `team_invitation_deliveries`
  SET
    `status` = 'pending',
    `attempt_count` = 0,
    `updated_at` = NEW.`deferred_at`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` = 'sending';
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_delivery_deferrals_update_transition`
AFTER UPDATE ON `team_invitation_delivery_deferrals`
FOR EACH ROW
BEGIN
  UPDATE `team_invitation_deliveries`
  SET
    `status` = 'pending',
    `attempt_count` = 0,
    `updated_at` = NEW.`deferred_at`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` = 'sending';
END;--> statement-breakpoint
CREATE TRIGGER `team_invitation_delivery_deferrals_active_delete_guard`
BEFORE DELETE ON `team_invitation_delivery_deferrals`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `team_invitation_deliveries`
  WHERE `delivery_key` = OLD.`delivery_key`
    AND `tenant_id` = OLD.`tenant_id`
    AND `status` IN ('pending', 'sending')
)
BEGIN
  SELECT RAISE(ABORT, 'active team invitation delivery deferral cannot be deleted');
END;
