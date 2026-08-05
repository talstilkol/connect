CREATE TRIGGER `team_invitations_delivery_pending_guard`
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
      AND `status` = 'pending'
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'pending invitation delivery must be cancelled before invitation transition'
  );
END;
