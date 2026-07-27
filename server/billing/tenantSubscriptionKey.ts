import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import type {
  TenantSubscriptionEventType,
  TenantSubscriptionStatus,
} from "../../shared/domain/tenantSubscription.ts";
import {
  isSubscriptionStatus,
  requireActorExternalUserId,
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requirePositiveVersion,
} from "./tenantSubscriptionValidation.ts";

export interface TenantSubscriptionEventIdentity {
  eventType: TenantSubscriptionEventType;
  expectedVersion: number | null;
  toStatus: TenantSubscriptionStatus;
  newEndsAt: string;
  actorExternalUserId: string;
}

export async function deriveTenantSubscriptionEventKey(
  tenantId: number,
  identity: TenantSubscriptionEventIdentity,
): Promise<string> {
  requirePositiveTenantId(tenantId);

  if (
    identity.eventType !== "created" &&
    identity.eventType !== "extended" &&
    identity.eventType !==
      "status-changed" &&
    identity.eventType !== "cancelled"
  ) {
    throw new Error(
      "subscription event type is invalid",
    );
  }

  if (
    !isSubscriptionStatus(
      identity.toStatus,
    )
  ) {
    throw new Error(
      "subscription target status is invalid",
    );
  }

  if (identity.expectedVersion !== null) {
    requirePositiveVersion(
      identity.expectedVersion,
    );
  }

  requireCanonicalTimestamp(
    identity.newEndsAt,
  );
  const actorExternalUserId =
    requireActorExternalUserId(
      identity.actorExternalUserId,
    );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "tenant_subscription_event_v1",
        tenantId,
        eventType: identity.eventType,
        expectedVersion:
          identity.expectedVersion,
        toStatus: identity.toStatus,
        newEndsAt: identity.newEndsAt,
        actorExternalUserId,
      }),
    ),
  );

  return `tenant_subscription_event_v1_${digest}`;
}
