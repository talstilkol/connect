import type {
  TenantStatus,
} from "./model.ts";

export const tenantSubscriptionStatuses = [
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
] as const satisfies readonly TenantStatus[];

export type TenantSubscriptionStatus =
  (typeof tenantSubscriptionStatuses)[number];

export type ManualSubscriptionInitialStatus =
  | "trial"
  | "active";

export type ManualSubscriptionOperationalStatus =
  | "active"
  | "suspended"
  | "blocked";

export type TenantSubscriptionEventType =
  | "created"
  | "extended"
  | "status-changed"
  | "cancelled";

export interface TenantSubscription {
  tenantId: number;
  status: TenantSubscriptionStatus;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSubscriptionEvent {
  eventKey: string;
  tenantId: number;
  eventType: TenantSubscriptionEventType;
  fromStatus:
    TenantSubscriptionStatus | null;
  toStatus: TenantSubscriptionStatus;
  previousEndsAt: string | null;
  newEndsAt: string;
  actorExternalUserId: string;
  subscriptionVersion: number;
  occurredAt: string;
}

export type TenantSubscriptionMutationOutcome =
  | "created"
  | "updated"
  | "unchanged"
  | "not-found"
  | "conflict"
  | "invalid-transition";

export interface TenantSubscriptionMutationResult {
  outcome: TenantSubscriptionMutationOutcome;
  subscription: TenantSubscription | null;
}
