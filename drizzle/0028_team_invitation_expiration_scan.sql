CREATE INDEX `team_invitations_expiration_scan_idx`
ON `team_invitations` (
  `status`,
  `expires_at`,
  `invitation_key`
);
