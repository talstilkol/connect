import type {
  WhatsappPhoneThroughputPolicy,
  WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";
import type {
  WhatsappCampaignDeliveryPolicyState,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireWhatsappDeliveryPolicyDigest,
  requireWhatsappDeliveryPolicyGraphVersion,
  requireWhatsappDeliveryPolicyPositiveInteger,
  requireWhatsappDeliveryPolicyState,
  requireWhatsappDeliveryPolicyTimestamp,
  requireWhatsappDeliveryPolicyVersion,
  requireWhatsappPortfolioCapacity,
  requireWhatsappPhoneThroughputPolicy,
  requireWhatsappProviderIdentifier,
  requireWhatsappReservationDuration,
} from "./whatsappCampaignDeliveryPolicyValidation.ts";

export interface WhatsappCampaignDeliveryPolicyEventIdentity {
  tenantId: unknown;
  connectionVersion: unknown;
  expectedPolicyVersion: unknown;
  deliveryState: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  phoneThroughputMessagesPerSecond: unknown;
  maximumOutboundMessagesPerSecond: unknown;
  reservationDurationSeconds: unknown;
  metaGraphApiVersion: unknown;
  evidenceDigest: unknown;
  evidenceCheckedAt: unknown;
  evidenceExpiresAt: unknown;
  actorExternalUserId: unknown;
}

interface NormalizedIdentity {
  tenantId: number;
  connectionVersion: number;
  expectedPolicyVersion: number;
  deliveryState:
    WhatsappCampaignDeliveryPolicyState;
  portfolioCapacity:
    WhatsappPortfolioCapacity;
  phoneThroughput:
    WhatsappPhoneThroughputPolicy | null;
  reservationDurationSeconds: number;
  metaGraphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
  actorExternalUserId: string;
}

function normalizeIdentity(
  identity:
    WhatsappCampaignDeliveryPolicyEventIdentity,
): NormalizedIdentity {
  const deliveryState =
    requireWhatsappDeliveryPolicyState(
      identity.deliveryState,
    );
  const phoneThroughput =
    deliveryState === "disabled" &&
    identity.phoneThroughputMessagesPerSecond == null &&
    identity.maximumOutboundMessagesPerSecond == null
      ? null
      : requireWhatsappPhoneThroughputPolicy(
          identity.phoneThroughputMessagesPerSecond,
          identity.maximumOutboundMessagesPerSecond,
        );

  return {
    tenantId:
      requireWhatsappDeliveryPolicyPositiveInteger(
        identity.tenantId,
        "tenant",
      ),
    connectionVersion:
      requireWhatsappDeliveryPolicyPositiveInteger(
        identity.connectionVersion,
        "connection version",
      ),
    expectedPolicyVersion:
      requireWhatsappDeliveryPolicyVersion(
        identity.expectedPolicyVersion,
        true,
      ),
    deliveryState,
    portfolioCapacity:
      requireWhatsappPortfolioCapacity(
        identity.portfolioLimitKind,
        identity.portfolioLimitValue,
      ),
    phoneThroughput,
    reservationDurationSeconds:
      requireWhatsappReservationDuration(
        identity.reservationDurationSeconds,
      ),
    metaGraphApiVersion:
      requireWhatsappDeliveryPolicyGraphVersion(
        identity.metaGraphApiVersion,
      ),
    evidenceDigest:
      requireWhatsappDeliveryPolicyDigest(
        identity.evidenceDigest,
      ),
    evidenceCheckedAt:
      requireWhatsappDeliveryPolicyTimestamp(
        identity.evidenceCheckedAt,
        "evidence checked timestamp",
      ),
    evidenceExpiresAt:
      requireWhatsappDeliveryPolicyTimestamp(
        identity.evidenceExpiresAt,
        "evidence expiration timestamp",
      ),
    actorExternalUserId:
      requireWhatsappProviderIdentifier(
        identity.actorExternalUserId,
        "actor",
      ),
  };
}

export async function deriveWhatsappCampaignDeliveryPolicyEventKey(
  identity:
    WhatsappCampaignDeliveryPolicyEventIdentity,
): Promise<string> {
  const normalized = normalizeIdentity(
    identity,
  );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "whatsapp_delivery_policy_event_v1",
        ...normalized,
      }),
    ),
  );

  return `whatsapp_delivery_policy_event_v1_${digest}`;
}
