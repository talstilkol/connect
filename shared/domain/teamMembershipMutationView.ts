import type {
  TenantRole,
} from "./model.ts";
import type {
  TeamMembershipStatus,
} from "./teamMembership.ts";

export interface TeamMembershipMutationView {
  memberKey: string;
  role: TenantRole;
  status: TeamMembershipStatus;
  version: number;
}

export type TeamMembershipActionFailureStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "rate-limited"
  | "temporarily-unavailable"
  | "invalid-input"
  | "not-found"
  | "conflict"
  | "invalid-transition"
  | "stale-session"
  | "server-error";

export type TeamMembershipActionResult =
  | {
      status: "saved";
      outcome:
        | "updated"
        | "unchanged";
      membership:
        TeamMembershipMutationView;
    }
  | {
      status:
        TeamMembershipActionFailureStatus;
    };

export type TeamOwnerTransferActionResult =
  | {
      status: "saved";
      outcome:
        | "updated"
        | "unchanged";
      formerOwner:
        TeamMembershipMutationView;
      newOwner:
        TeamMembershipMutationView;
    }
  | {
      status:
        TeamMembershipActionFailureStatus;
    };
