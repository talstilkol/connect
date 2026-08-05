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

export const teamInvitationActorKinds = [
  "user",
  "system",
] as const;

export type TeamInvitationActorKind =
  (typeof teamInvitationActorKinds)[number];

export const teamInvitationExpirationSystemActorId =
  "team-invitation-expiration-scheduler-v1";

export const teamInvitationSystemActorIds = [
  teamInvitationExpirationSystemActorId,
] as const;

export type TeamInvitationSystemActorId =
  (typeof teamInvitationSystemActorIds)[number];

export type TeamInvitationActor =
  | {
      kind: "user";
      id: UserId;
    }
  | {
      kind: "system";
      id: TeamInvitationSystemActorId;
    };

export interface TeamInvitation {
  invitationKey: string;
  tenantId: number;
  normalizedEmail: string;
  role: TeamInvitationRole;
  status: TeamInvitationStatus;
  version: number;
  invitedByExternalUserId: UserId;
  lastActor: TeamInvitationActor;
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

export const teamInvitationDeliveryStatuses = [
  "pending",
  "sending",
  "submitted",
  "blocked",
  "ambiguous",
  "cancelled",
] as const;

export type TeamInvitationDeliveryStatus =
  (typeof teamInvitationDeliveryStatuses)[number];

export interface TeamInvitationDelivery {
  deliveryKey: string;
  tenantId: number;
  invitationKey: string;
  invitationVersion: number;
  status:
    TeamInvitationDeliveryStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
