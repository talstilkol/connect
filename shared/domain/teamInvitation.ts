import type {
  TenantRole,
  UserId,
} from "./model.ts";

export const teamInvitationStatuses = [
  "pending",
  "revoked",
  "expired",
] as const;

export type TeamInvitationStatus =
  (typeof teamInvitationStatuses)[number];

export type TeamInvitationRole =
  Exclude<TenantRole, "owner">;

export type TeamInvitationEventType =
  | "requested"
  | "re-requested"
  | "revoked"
  | "expired";

export interface TeamInvitation {
  invitationKey: string;
  tenantId: number;
  normalizedEmail: string;
  role: TeamInvitationRole;
  status: TeamInvitationStatus;
  version: number;
  invitedByExternalUserId: UserId;
  lastActorExternalUserId: UserId;
  requestedAt: string;
  expiresAt: string;
  updatedAt: string;
}

export type TeamInvitationMutationOutcome =
  | "created"
  | "updated"
  | "unchanged"
  | "not-found"
  | "conflict"
  | "invalid-transition";

export interface TeamInvitationMutationResult {
  outcome:
    TeamInvitationMutationOutcome;
  invitation:
    TeamInvitation | null;
}
