import type {
  WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";
import {
  whatsappPortfolioMessagingLimits,
} from "../../shared/domain/whatsappRateLimit.ts";
import {
  whatsappCampaignDeliveryPolicyStates,
  type WhatsappCampaignDeliveryPolicyState,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";

const eventKeyPattern =
  /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/;
const evidenceDigestPattern = /^[0-9a-f]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const boundedTextPattern =
  /^[^\u0000-\u001f\u007f]{1,255}$/;

export const minimumWhatsappReservationSeconds = 6;
export const maximumWhatsappReservationSeconds =
  24 * 60 * 60;

export function requireWhatsappDeliveryPolicyPositiveInteger(
  value: unknown,
  field: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1
  ) {
    throw new Error(
      `WhatsApp delivery policy ${field} is invalid`,
    );
  }

  return Number(value);
}

export function requireWhatsappDeliveryPolicyVersion(
  value: unknown,
  allowZero = false,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < (allowZero ? 0 : 1)
  ) {
    throw new Error(
      "WhatsApp delivery policy version is invalid",
    );
  }

  return Number(value);
}

export function requireWhatsappProviderIdentifier(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !boundedTextPattern.test(value) ||
    value.trim() !== value
  ) {
    throw new Error(
      `WhatsApp delivery policy ${field} is invalid`,
    );
  }

  return value;
}

export function requireWhatsappDeliveryPolicyTimestamp(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(
      `WhatsApp delivery policy ${field} is invalid`,
    );
  }

  return value;
}

export function requireWhatsappDeliveryPolicyEventKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !eventKeyPattern.test(value)
  ) {
    throw new Error(
      "WhatsApp delivery policy event key is invalid",
    );
  }

  return value;
}

export function requireWhatsappDeliveryPolicyDigest(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !evidenceDigestPattern.test(value)
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence digest is invalid",
    );
  }

  return value;
}

export function requireWhatsappDeliveryPolicyGraphVersion(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !graphApiVersionPattern.test(value)
  ) {
    throw new Error(
      "WhatsApp delivery policy Graph API version is invalid",
    );
  }

  return value;
}

export function requireWhatsappDeliveryPolicyState(
  value: unknown,
): WhatsappCampaignDeliveryPolicyState {
  if (
    typeof value !== "string" ||
    !whatsappCampaignDeliveryPolicyStates.includes(
      value as WhatsappCampaignDeliveryPolicyState,
    )
  ) {
    throw new Error(
      "WhatsApp delivery policy state is invalid",
    );
  }

  return value as WhatsappCampaignDeliveryPolicyState;
}

export function requireWhatsappPortfolioCapacity(
  kind: unknown,
  value: unknown,
): WhatsappPortfolioCapacity {
  if (kind === "unlimited" && value === null) {
    return { kind: "unlimited" };
  }

  if (
    kind === "bounded" &&
    whatsappPortfolioMessagingLimits.some(
      (limit) => limit === value,
    )
  ) {
    return {
      kind: "bounded",
      maximumUniqueRecipients:
        value as (typeof whatsappPortfolioMessagingLimits)[number],
    };
  }

  throw new Error(
    "WhatsApp delivery policy portfolio capacity is invalid",
  );
}

export function requireWhatsappReservationDuration(
  value: unknown,
): number {
  const duration =
    requireWhatsappDeliveryPolicyPositiveInteger(
      value,
      "reservation duration",
    );

  if (
    duration < minimumWhatsappReservationSeconds ||
    duration > maximumWhatsappReservationSeconds
  ) {
    throw new Error(
      "WhatsApp delivery policy reservation duration is invalid",
    );
  }

  return duration;
}
