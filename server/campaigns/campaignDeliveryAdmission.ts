import type {
  WhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";
import type {
  CampaignDeliveryAdmissionController,
  CampaignDeliveryAdmissionRequest,
} from "../../shared/domain/campaignDelivery.ts";
import type {
  WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";

const MAXIMUM_QUEUE_RETRY_DELAY_SECONDS =
  24 * 60 * 60;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface ResolvedCampaignDeliveryRateLimitContext {
  reservationKey: string;
  tenantId: number;
  portfolioKey: string;
  senderKey: string;
  recipientKey: string;
  templateCategory: "MARKETING" | "UTILITY";
  portfolioCapacity: WhatsappPortfolioCapacity;
  reservationExpiresAt: string;
}

export interface CampaignDeliveryRateLimitContextResolver {
  isConfigured(): boolean;
  resolve(
    request: CampaignDeliveryAdmissionRequest,
  ): Promise<ResolvedCampaignDeliveryRateLimitContext | null>;
}

function isCanonicalTimestamp(value: string): boolean {
  return (
    canonicalTimestampPattern.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function retryDelaySeconds(
  retryAt: string,
  reservedAt: string,
): number {
  if (
    !isCanonicalTimestamp(retryAt) ||
    !isCanonicalTimestamp(reservedAt)
  ) {
    throw new Error(
      "WhatsApp admission retry timestamp is invalid",
    );
  }

  const delay = Math.ceil(
    (Date.parse(retryAt) -
      Date.parse(reservedAt)) /
      1_000,
  );

  if (
    !Number.isSafeInteger(delay) ||
    delay < 1 ||
    delay > MAXIMUM_QUEUE_RETRY_DELAY_SECONDS
  ) {
    throw new Error(
      "WhatsApp admission retry delay is unsafe",
    );
  }

  return delay;
}

function resolverIsConfigured(
  resolver: CampaignDeliveryRateLimitContextResolver,
): boolean {
  try {
    return resolver.isConfigured() === true;
  } catch {
    return false;
  }
}

function samePortfolioCapacity(
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

export function createCampaignDeliveryAdmission(
  repository: WhatsappRateLimitRepository,
  resolver: CampaignDeliveryRateLimitContextResolver,
): CampaignDeliveryAdmissionController {
  return {
    isConfigured() {
      return resolverIsConfigured(resolver);
    },

    async reserve(request) {
      if (!resolverIsConfigured(resolver)) {
        throw new Error(
          "Campaign delivery rate-limit context is unavailable",
        );
      }

      const context = await resolver.resolve(request);

      if (
        !context ||
        context.tenantId !== request.campaign.tenantId
      ) {
        throw new Error(
          "Campaign delivery rate-limit context is invalid",
        );
      }

      const result =
        await repository.reserveBusinessInitiatedMessage({
          ...context,
          reservedAt: request.reservedAt,
        });

      if (result.outcome === "reserved") {
        if (
          result.reservation.reservationKey !==
            context.reservationKey ||
          result.reservation.tenantId !==
            context.tenantId ||
          result.reservation.portfolioKey !==
            context.portfolioKey ||
          result.reservation.senderKey !==
            context.senderKey ||
          result.reservation.recipientKey !==
            context.recipientKey ||
          !samePortfolioCapacity(
            result.reservation.portfolioCapacity,
            context.portfolioCapacity,
          ) ||
          result.reservation.reservedAt !==
            request.reservedAt ||
          result.reservation.reservationExpiresAt !==
            context.reservationExpiresAt
        ) {
          throw new Error(
            "WhatsApp admission reservation is inconsistent",
          );
        }

        return {
          outcome: "reserved",
          reservationKey:
            result.reservation.reservationKey,
        };
      }

      if (result.outcome === "pair-limited") {
        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PAIR_LIMITED",
          retryAfterSeconds: retryDelaySeconds(
            result.retryAt,
            request.reservedAt,
          ),
        };
      }

      if (result.outcome === "provider-cooldown") {
        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PROVIDER_COOLDOWN",
          retryAfterSeconds: retryDelaySeconds(
            result.retryAt,
            request.reservedAt,
          ),
        };
      }

      if (result.outcome === "recipient-in-flight") {
        return {
          outcome: "deferred",
          errorCode:
            "WHATSAPP_RECIPIENT_IN_FLIGHT",
          retryAfterSeconds: retryDelaySeconds(
            result.retryAt,
            request.reservedAt,
          ),
        };
      }

      if (result.outcome === "portfolio-limited") {
        if (
          context.portfolioCapacity.kind !== "bounded" ||
          result.maximumUniqueRecipients !==
            context.portfolioCapacity
              .maximumUniqueRecipients ||
          !Number.isSafeInteger(
            result.occupiedUniqueRecipients,
          ) ||
          result.occupiedUniqueRecipients <
            result.maximumUniqueRecipients
        ) {
          throw new Error(
            "WhatsApp portfolio limit result is inconsistent",
          );
        }

        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PORTFOLIO_LIMITED",
          retryAfterSeconds:
            MAXIMUM_QUEUE_RETRY_DELAY_SECONDS,
        };
      }

      throw new Error(
        "WhatsApp admission reservation was rejected",
      );
    },

    async settle(
      reservationKey,
      outcome,
      settledAt,
    ) {
      const result = await repository.settle({
        reservationKey,
        outcome,
        settledAt,
      });

      if (result.outcome !== "settled") {
        throw new Error(
          "WhatsApp admission settlement was rejected",
        );
      }

      if (
        result.settlement.reservationKey !==
          reservationKey ||
        result.settlement.outcome !== outcome ||
        result.settlement.settledAt !== settledAt
      ) {
        throw new Error(
          "WhatsApp admission settlement is inconsistent",
        );
      }
    },

    async deferProviderRejection(
      reservationKey,
      scope,
      providerErrorCode,
      retryAfterSeconds,
      observedAt,
    ) {
      if (
        !reservationKey ||
        !isCanonicalTimestamp(observedAt) ||
        !Number.isSafeInteger(retryAfterSeconds) ||
        retryAfterSeconds < 1 ||
        retryAfterSeconds >
          MAXIMUM_QUEUE_RETRY_DELAY_SECONDS
      ) {
        throw new Error(
          "Provider cooldown request is invalid",
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
          "Provider cooldown was rejected",
        );
      }
    },
  };
}
