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
END;
