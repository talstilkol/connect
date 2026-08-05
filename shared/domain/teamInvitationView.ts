export type TeamInvitationActionFailureStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "rate-limited"
  | "temporarily-unavailable"
  | "conflict"
  | "invalid-input"
  | "server-error";

export type TeamInvitationActionResult =
  | {
      status: "queued";
    }
  | {
      status: "already-pending";
    }
  | {
      status:
        TeamInvitationActionFailureStatus;
    };
