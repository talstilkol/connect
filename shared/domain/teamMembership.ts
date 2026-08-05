import type {
  TenantRole,
  UserId,
} from "./model.ts";

export const teamMembershipStatuses = [
  "active",
  "suspended",
] as const;

export type TeamMembershipStatus =
  (typeof teamMembershipStatuses)[number];

export type TeamMembershipEventType =
  | "role-changed"
  | "suspended"
  | "reactivated"
  | "owner-transfer-out"
  | "owner-transfer-in";

export interface TeamMembership {
  tenantId: number;
  externalUserId: UserId;
  role: TenantRole;
  status: TeamMembershipStatus;
  version: number;
}

export type TeamMembershipMutationOutcome =
  | "updated"
  | "unchanged"
  | "not-found"
  | "conflict"
  | "invalid-transition";

export interface TeamMembershipMutationResult {
  outcome:
    TeamMembershipMutationOutcome;
  membership:
    TeamMembership | null;
}

export interface TeamOwnerTransferResult {
  outcome:
    TeamMembershipMutationOutcome;
  formerOwner:
    TeamMembership | null;
  newOwner:
    TeamMembership | null;
}
