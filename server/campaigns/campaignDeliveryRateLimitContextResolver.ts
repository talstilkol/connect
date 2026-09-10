import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  whatsappPortfolioMessagingLimits,
  whatsappPhoneThroughputLimits,
  type WhatsappPhoneThroughputPolicy,
  type WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";
import type {
  CampaignDeliveryAdmissionRequest,
} from "../../shared/domain/campaignDelivery.ts";
import type {
  CampaignDeliveryRateLimitContextResolver,
  ResolvedCampaignDeliveryRateLimitContext,
} from "./campaignDeliveryAdmission.ts";
import type {
  WhatsappRateLimitKeyDeriver,
} from "./whatsappRateLimitKeyDeriver.ts";

const MINIMUM_RESERVATION_SECONDS = 6;
const MAXIMUM_RESERVATION_SECONDS =
  24 * 60 * 60;
const campaignDeliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const queueMessageIdPattern =
  /^[^\u0000-\u001f\u007f]{1,255}$/;

export interface CampaignDeliveryRateLimitPolicyRequest {
  tenantId: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
  checkedAt: string;
}

export interface CampaignDeliveryRateLimitPolicy {
  eventKey: string;
  portfolioCapacity: WhatsappPortfolioCapacity;
  phoneThroughput: WhatsappPhoneThroughputPolicy;
  reservationDurationSeconds: number;
}

export interface CampaignDeliveryRateLimitPolicySource {
  isConfigured(): boolean;
  load(
    request: CampaignDeliveryRateLimitPolicyRequest,
  ): Promise<CampaignDeliveryRateLimitPolicy | null>;
}

function sourceIsConfigured(
  source: CampaignDeliveryRateLimitPolicySource,
  keys: WhatsappRateLimitKeyDeriver,
): boolean {
  try {
    return (
      source.isConfigured() === true &&
      keys.isConfigured() === true
    );
  } catch {
    return false;
  }
}

function assertRequest(
  request: CampaignDeliveryAdmissionRequest,
): void {
  if (
    !Number.isSafeInteger(
      request.campaign.tenantId,
    ) ||
    request.campaign.tenantId <= 0 ||
    (
      request.campaign.template.category !==
        "MARKETING" &&
      request.campaign.template.category !== "UTILITY"
    ) ||
    !campaignDeliveryKeyPattern.test(
      request.deliveryKey,
    ) ||
    !Number.isSafeInteger(
      request.deliveryAttemptNumber,
    ) ||
    request.deliveryAttemptNumber < 1 ||
    !Number.isSafeInteger(
      request.queueAttemptNumber,
    ) ||
    request.queueAttemptNumber < 1 ||
    !queueMessageIdPattern.test(
      request.queueMessageId,
    ) ||
    request.queueMessageId.trim() !==
      request.queueMessageId ||
    !phoneNumberPattern.test(
      request.recipientPhoneNumber,
    ) ||
    !canonicalTimestampPattern.test(
      request.reservedAt,
    ) ||
    !Number.isFinite(
      Date.parse(request.reservedAt),
    ) ||
    new Date(request.reservedAt).toISOString() !==
      request.reservedAt
  ) {
    throw new Error(
      "Campaign delivery rate-limit request is invalid",
    );
  }
}

function hasExactKeys(
  value: object,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();

  return (
    actual.length === normalizedExpected.length &&
    actual.every(
      (key, index) =>
        key === normalizedExpected[index],
    )
  );
}

function normalizeCapacity(
  value: unknown,
): WhatsappPortfolioCapacity | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("kind" in value)
  ) {
    return null;
  }

  if (
    value.kind === "unlimited" &&
    hasExactKeys(value, ["kind"])
  ) {
    return { kind: "unlimited" };
  }

  if (
    value.kind === "bounded" &&
    hasExactKeys(value, [
      "kind",
      "maximumUniqueRecipients",
    ]) &&
    "maximumUniqueRecipients" in value &&
    whatsappPortfolioMessagingLimits.some(
      (limit) =>
        limit === value.maximumUniqueRecipients,
    )
  ) {
    return {
      kind: "bounded",
      maximumUniqueRecipients:
        value.maximumUniqueRecipients as (typeof whatsappPortfolioMessagingLimits)[number],
    };
  }

  return null;
}

function normalizePolicy(
  value: CampaignDeliveryRateLimitPolicy,
): CampaignDeliveryRateLimitPolicy | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !hasExactKeys(value, [
      "eventKey",
      "phoneThroughput",
      "portfolioCapacity",
      "reservationDurationSeconds",
    ])
  ) {
    return null;
  }

  const portfolioCapacity = normalizeCapacity(
    value.portfolioCapacity,
  );
  const phoneThroughput =
    normalizePhoneThroughput(value.phoneThroughput);

  if (
    !/^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/.test(
      value.eventKey,
    ) ||
    !portfolioCapacity ||
    !phoneThroughput ||
    !Number.isSafeInteger(
      value.reservationDurationSeconds,
    ) ||
    value.reservationDurationSeconds <
      MINIMUM_RESERVATION_SECONDS ||
    value.reservationDurationSeconds >
      MAXIMUM_RESERVATION_SECONDS
  ) {
    return null;
  }

  return {
    eventKey: value.eventKey,
    portfolioCapacity,
    phoneThroughput,
    reservationDurationSeconds:
      value.reservationDurationSeconds,
  };
}

function normalizePhoneThroughput(
  value: unknown,
): WhatsappPhoneThroughputPolicy | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !hasExactKeys(value, [
      "maximumMessagesPerSecond",
      "maximumOutboundMessagesPerSecond",
    ]) ||
    !("maximumMessagesPerSecond" in value) ||
    !("maximumOutboundMessagesPerSecond" in value) ||
    !whatsappPhoneThroughputLimits.includes(
      value.maximumMessagesPerSecond as never,
    ) ||
    !Number.isSafeInteger(
      value.maximumOutboundMessagesPerSecond,
    ) ||
    Number(value.maximumOutboundMessagesPerSecond) < 1 ||
    Number(value.maximumOutboundMessagesPerSecond) >=
      Number(value.maximumMessagesPerSecond)
  ) {
    return null;
  }

  return {
    maximumMessagesPerSecond:
      value.maximumMessagesPerSecond as (typeof whatsappPhoneThroughputLimits)[number],
    maximumOutboundMessagesPerSecond: Number(
      value.maximumOutboundMessagesPerSecond,
    ),
  };
}

export function createCampaignDeliveryRateLimitContextResolver(
  meta: Pick<MetaRepository, "findConnectionByTenantId">,
  keys: WhatsappRateLimitKeyDeriver,
  policies: CampaignDeliveryRateLimitPolicySource,
): CampaignDeliveryRateLimitContextResolver {
  return {
    isConfigured() {
      return sourceIsConfigured(policies, keys);
    },

    async resolve(
      request: CampaignDeliveryAdmissionRequest,
    ): Promise<ResolvedCampaignDeliveryRateLimitContext | null> {
      if (!sourceIsConfigured(policies, keys)) {
        throw new Error(
          "Campaign delivery rate-limit resolver is not configured",
        );
      }

      assertRequest(request);

      const connection =
        await meta.findConnectionByTenantId(
          request.campaign.tenantId,
        );

      if (
        !connection ||
        connection.tenantId !==
          request.campaign.tenantId ||
        connection.status !== "connected"
      ) {
        return null;
      }

      const loadedPolicy = await policies.load({
        tenantId: connection.tenantId,
        businessPortfolioId:
          connection.businessPortfolioId,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        checkedAt: request.reservedAt,
      });
      const policy = loadedPolicy
        ? normalizePolicy(loadedPolicy)
        : null;

      if (!policy) {
        return null;
      }

      const derived = await keys.derive({
        businessPortfolioId:
          connection.businessPortfolioId,
        phoneNumberId: connection.phoneNumberId,
        recipientPhoneNumber:
          request.recipientPhoneNumber,
        deliveryKey: request.deliveryKey,
        deliveryAttemptNumber:
          request.deliveryAttemptNumber,
        queueAttemptNumber:
          request.queueAttemptNumber,
        queueMessageId: request.queueMessageId,
      });
      const reservationExpiresAt = new Date(
        Date.parse(request.reservedAt) +
          policy.reservationDurationSeconds *
            1_000,
      ).toISOString();

      return {
        ...derived,
        policyEventKey: policy.eventKey,
        tenantId: connection.tenantId,
        templateCategory:
          request.campaign.template.category,
        portfolioCapacity:
          policy.portfolioCapacity,
        phoneThroughput:
          policy.phoneThroughput,
        reservationExpiresAt,
      };
    },
  };
}
