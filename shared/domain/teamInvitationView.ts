export type TeamInvitationActionFailureStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "rate-limited"
  | "temporarily-unavailable"
  | "provider-unavailable"
  | "invalid-input"
  | "server-error";

export type TeamInvitationActionResult =
  | {
      status: "submitted";
    }
  | {
      status: "already-pending";
    }
  | {
      status:
        TeamInvitationActionFailureStatus;
    };
