import type {
  WhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";
import {
  whatsappPhoneThroughputLimits,
  whatsappPortfolioMessagingLimits,
  type WhatsappPhoneThroughputPolicy,
  type WhatsappPortfolioCapacity,
  type WhatsappProviderCooldownErrorCode,
  type WhatsappProviderCooldownScope,
} from "../../shared/domain/whatsappRateLimit.ts";
import type {
  CampaignDeliveryRateLimitPolicy,
  CampaignDeliveryRateLimitPolicySource,
} from "../campaigns/campaignDeliveryRateLimitContextResolver.ts";
import type {
  WhatsappRateLimitKeyDeriver,
} from "../campaigns/whatsappRateLimitKeyDeriver.ts";

const MINIMUM_RESERVATION_SECONDS = 6;
const MAXIMUM_RESERVATION_SECONDS = 24 * 60 * 60;
const deliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const providerIdentifierPattern =
  /^[^\u0000-\u001f\u007f]{1,255}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;

export interface BotReplyAdmissionRequest {
  tenantId: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
  recipientPhoneNumber: string;
  deliveryKey: string;
  deliveryAttemptNumber: number;
  reservedAt: string;
  serviceWindowExpiresAt: string;
}

export type BotReplyAdmissionResult =
  | {
      outcome: "reserved";
      reservationKey: string;
    }
  | {
      outcome: "deferred";
      errorCode: string;
      retryAt: string;
    };

export interface BotReplyAdmissionController {
  isConfigured(): boolean;
  reserve(
    request: BotReplyAdmissionRequest,
  ): Promise<BotReplyAdmissionResult>;
  settleBeforeSubmit(
    reservationKey: string,
    settledAt: string,
  ): Promise<void>;
  settleProviderFailure(
    reservationKey: string,
    settledAt: string,
  ): Promise<void>;
  deferProviderRejection(
    reservationKey: string,
    scope: WhatsappProviderCooldownScope,
    providerErrorCode: WhatsappProviderCooldownErrorCode,
    retryAfterSeconds: number,
    observedAt: string,
  ): Promise<void>;
}

function isCanonicalTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    canonicalTimestampPattern.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function isProviderIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    providerIdentifierPattern.test(value)
  );
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
      (key, index) => key === normalizedExpected[index],
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
    whatsappPortfolioMessagingLimits.includes(
      value.maximumUniqueRecipients as never,
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
  const phoneThroughput = normalizePhoneThroughput(
    value.phoneThroughput,
  );

  if (
    !/^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/.test(
      value.eventKey,
    ) ||
    !portfolioCapacity ||
    !phoneThroughput ||
    !Number.isSafeInteger(value.reservationDurationSeconds) ||
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

function requireRequest(
  request: BotReplyAdmissionRequest,
): void {
  if (
    !Number.isSafeInteger(request.tenantId) ||
    request.tenantId < 1 ||
    !isProviderIdentifier(request.businessPortfolioId) ||
    !isProviderIdentifier(request.wabaId) ||
    !isProviderIdentifier(request.phoneNumberId) ||
    !phoneNumberPattern.test(request.recipientPhoneNumber) ||
    !deliveryKeyPattern.test(request.deliveryKey) ||
    !Number.isSafeInteger(request.deliveryAttemptNumber) ||
    request.deliveryAttemptNumber < 1 ||
    !isCanonicalTimestamp(request.reservedAt) ||
    !isCanonicalTimestamp(request.serviceWindowExpiresAt) ||
    request.serviceWindowExpiresAt <= request.reservedAt
  ) {
    throw new Error("Bot reply admission request is invalid");
  }
}

function sameCapacity(
  left: WhatsappPortfolioCapacity,
  right: WhatsappPortfolioCapacity,
): boolean {
  return (
    left.kind === right.kind &&
    (left.kind === "unlimited" ||
      (right.kind === "bounded" &&
        left.maximumUniqueRecipients ===
          right.maximumUniqueRecipients))
  );
}

function requireRetryAt(
  retryAt: string,
  request: BotReplyAdmissionRequest,
): string {
  if (
    !isCanonicalTimestamp(retryAt) ||
    retryAt <= request.reservedAt
  ) {
    throw new Error("Bot reply admission retry is invalid");
  }

  return retryAt;
}

function isConfigured(
  policies: CampaignDeliveryRateLimitPolicySource,
  keys: WhatsappRateLimitKeyDeriver,
): boolean {
  try {
    return (
      policies.isConfigured() === true &&
      keys.isConfigured() === true
    );
  } catch {
    return false;
  }
}

export function createBotReplyAdmission(
  repository: Pick<
    WhatsappRateLimitRepository,
    | "reserveServiceReply"
    | "settle"
    | "applyProviderCooldown"
  >,
  keys: WhatsappRateLimitKeyDeriver,
  policies: CampaignDeliveryRateLimitPolicySource,
): BotReplyAdmissionController {
  const settle = async (
    reservationKey: string,
    outcome: "provider-failed" | "cancelled-before-submit",
    settledAt: string,
  ): Promise<void> => {
    if (
      !reservationKeyPattern.test(reservationKey) ||
      !isCanonicalTimestamp(settledAt)
    ) {
      throw new Error("Bot reply admission settlement is invalid");
    }

    const result = await repository.settle({
      reservationKey,
      outcome,
      settledAt,
    });

    if (
      result.outcome !== "settled" ||
      result.settlement.reservationKey !== reservationKey ||
      result.settlement.outcome !== outcome ||
      result.settlement.settledAt !== settledAt
    ) {
      throw new Error("Bot reply admission settlement was rejected");
    }
  };

  return {
    isConfigured() {
      return isConfigured(policies, keys);
    },

    async reserve(request) {
      if (!isConfigured(policies, keys)) {
        throw new Error("Bot reply admission is unavailable");
      }

      requireRequest(request);
      const loaded = await policies.load({
        tenantId: request.tenantId,
        businessPortfolioId: request.businessPortfolioId,
        wabaId: request.wabaId,
        phoneNumberId: request.phoneNumberId,
        checkedAt: request.reservedAt,
      });
      const policy = loaded ? normalizePolicy(loaded) : null;

      if (!policy) {
        throw new Error("Bot reply admission policy is unavailable");
      }

      const derived = await keys.deriveServiceReply({
        businessPortfolioId: request.businessPortfolioId,
        phoneNumberId: request.phoneNumberId,
        recipientPhoneNumber: request.recipientPhoneNumber,
        deliveryKey: request.deliveryKey,
        deliveryAttemptNumber: request.deliveryAttemptNumber,
      });
      const reservationExpiresAt = new Date(
        Date.parse(request.reservedAt) +
          policy.reservationDurationSeconds * 1_000,
      ).toISOString();
      const result = await repository.reserveServiceReply({
        ...derived,
        tenantId: request.tenantId,
        policyEventKey: policy.eventKey,
        portfolioCapacity: policy.portfolioCapacity,
        phoneThroughput: policy.phoneThroughput,
        reservedAt: request.reservedAt,
        reservationExpiresAt,
      });

      if (result.outcome === "reserved") {
        const reservation = result.reservation;

        if (
          reservation.reservationClass !== "service-reply" ||
          reservation.reservationKey !== derived.reservationKey ||
          reservation.tenantId !== request.tenantId ||
          reservation.portfolioKey !== derived.portfolioKey ||
          reservation.senderKey !== derived.senderKey ||
          reservation.recipientKey !== derived.recipientKey ||
          reservation.policyEventKey !== policy.eventKey ||
          !sameCapacity(
            reservation.portfolioCapacity,
            policy.portfolioCapacity,
          ) ||
          JSON.stringify(reservation.phoneThroughput) !==
            JSON.stringify(policy.phoneThroughput) ||
          reservation.reservedAt !== request.reservedAt ||
          reservation.reservationExpiresAt !==
            reservationExpiresAt
        ) {
          throw new Error("Bot reply admission reservation is inconsistent");
        }

        return {
          outcome: "reserved",
          reservationKey: reservation.reservationKey,
        };
      }

      if (result.outcome === "pair-limited") {
        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PAIR_LIMITED",
          retryAt: requireRetryAt(result.retryAt, request),
        };
      }

      if (result.outcome === "phone-throughput-limited") {
        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PHONE_THROUGHPUT_LIMITED",
          retryAt: requireRetryAt(result.retryAt, request),
        };
      }

      if (result.outcome === "provider-cooldown") {
        if (result.scope === "portfolio-recipient") {
          throw new Error("Bot reply admission cooldown scope is invalid");
        }

        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PROVIDER_COOLDOWN",
          retryAt: requireRetryAt(result.retryAt, request),
        };
      }

      if (result.outcome === "recipient-in-flight") {
        throw new Error(
          "Bot reply admission returned business-only recipient state",
        );
      }

      throw new Error("Bot reply admission reservation was rejected");
    },

    settleBeforeSubmit(reservationKey, settledAt) {
      return settle(
        reservationKey,
        "cancelled-before-submit",
        settledAt,
      );
    },

    settleProviderFailure(reservationKey, settledAt) {
      return settle(
        reservationKey,
        "provider-failed",
        settledAt,
      );
    },

    async deferProviderRejection(
      reservationKey,
      scope,
      providerErrorCode,
      retryAfterSeconds,
      observedAt,
    ) {
      if (
        !reservationKeyPattern.test(reservationKey) ||
        !isCanonicalTimestamp(observedAt) ||
        !Number.isSafeInteger(retryAfterSeconds) ||
        retryAfterSeconds < 1 ||
        retryAfterSeconds > MAXIMUM_RESERVATION_SECONDS ||
        scope === "portfolio-recipient" ||
        (
          providerErrorCode === 130429 &&
          scope !== "sender"
        ) ||
        (
          providerErrorCode === 131056 &&
          scope !== "pair"
        ) ||
        providerErrorCode === 131049
      ) {
        throw new Error(
          "Bot reply provider cooldown request is invalid",
        );
      }

      const blockedUntil = new Date(
        Date.parse(observedAt) +
          retryAfterSeconds * 1_000,
      ).toISOString();
      const result =
        await repository.applyProviderCooldown({
          reservationKey,
          scope,
          providerErrorCode,
          observedAt,
          blockedUntil,
        });

      if (
        result.outcome !== "applied" ||
        result.cooldown.reservationKey !==
          reservationKey ||
        result.cooldown.scope !== scope ||
        result.cooldown.providerErrorCode !==
          providerErrorCode ||
        result.cooldown.observedAt !== observedAt ||
        result.cooldown.blockedUntil !== blockedUntil
      ) {
        throw new Error(
          "Bot reply provider cooldown was rejected",
        );
      }
    },
  };
}
