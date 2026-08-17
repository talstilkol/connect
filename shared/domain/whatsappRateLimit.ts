export const whatsappPortfolioMessagingLimits = [
  250,
  2_000,
  10_000,
  100_000,
] as const;

export type WhatsappPortfolioMessagingLimit =
  (typeof whatsappPortfolioMessagingLimits)[number];

export type WhatsappPortfolioCapacity =
  | {
      kind: "bounded";
      maximumUniqueRecipients:
        WhatsappPortfolioMessagingLimit;
    }
  | {
      kind: "unlimited";
    };

export const whatsappPhoneThroughputLimits = [
  20,
  80,
  1_000,
] as const;

export type WhatsappPhoneThroughputLimit =
  (typeof whatsappPhoneThroughputLimits)[number];

export interface WhatsappPhoneThroughputPolicy {
  maximumMessagesPerSecond:
    WhatsappPhoneThroughputLimit;
  maximumOutboundMessagesPerSecond: number;
}

export interface WhatsappRateLimitReservation {
  reservationKey: string;
  tenantId: number;
  portfolioKey: string;
  senderKey: string;
  recipientKey: string;
  policyEventKey: string | null;
  portfolioCapacity: WhatsappPortfolioCapacity;
  phoneThroughput:
    WhatsappPhoneThroughputPolicy | null;
  reservedAt: string;
  pairReservedUntil: string;
  reservationExpiresAt: string;
}

export type WhatsappRateLimitReservationResult =
  | {
      outcome: "reserved";
      reservation: WhatsappRateLimitReservation;
      idempotent: boolean;
    }
  | {
      outcome: "tenant-not-found";
    }
  | {
      outcome: "reservation-retired";
      settlement: WhatsappRateLimitSettlement;
    }
  | {
      outcome: "pair-limited";
      retryAt: string;
    }
  | {
      outcome: "recipient-in-flight";
      retryAt: string;
    }
  | {
      outcome: "provider-cooldown";
      scope: WhatsappProviderCooldownScope;
      providerErrorCode: WhatsappProviderCooldownErrorCode;
      retryAt: string;
    }
  | {
      outcome: "portfolio-limited";
      occupiedUniqueRecipients: number;
      maximumUniqueRecipients:
        WhatsappPortfolioMessagingLimit;
    }
  | {
      outcome: "phone-throughput-limited";
      retryAt: string;
    };

export const whatsappRateLimitSettlementOutcomes = [
  "delivered",
  "provider-failed",
  "cancelled-before-submit",
] as const;

export type WhatsappRateLimitSettlementOutcome =
  (typeof whatsappRateLimitSettlementOutcomes)[number];

export interface WhatsappRateLimitSettlement {
  reservationKey: string;
  outcome: WhatsappRateLimitSettlementOutcome;
  settledAt: string;
}

export type WhatsappRateLimitSettlementResult =
  | {
      outcome: "settled";
      settlement: WhatsappRateLimitSettlement;
      idempotent: boolean;
    }
  | {
      outcome: "reservation-not-found";
    }
  | {
      outcome: "settlement-precedes-reservation";
    }
  | {
      outcome: "settlement-conflict";
      existing: WhatsappRateLimitSettlement;
    };

export const whatsappProviderCooldownScopes = [
  "sender",
  "portfolio-recipient",
  "pair",
] as const;

export type WhatsappProviderCooldownScope =
  (typeof whatsappProviderCooldownScopes)[number];

export const whatsappProviderCooldownErrorCodes = [
  130429,
  131049,
  131056,
] as const;

export type WhatsappProviderCooldownErrorCode =
  (typeof whatsappProviderCooldownErrorCodes)[number];

export interface WhatsappProviderCooldown {
  reservationKey: string;
  scope: WhatsappProviderCooldownScope;
  providerErrorCode: WhatsappProviderCooldownErrorCode;
  observedAt: string;
  blockedUntil: string;
}

export type WhatsappProviderCooldownResult =
  | {
      outcome: "applied";
      cooldown: WhatsappProviderCooldown;
      idempotent: boolean;
    }
  | {
      outcome: "reservation-not-found";
    }
  | {
      outcome: "cooldown-conflict";
      existing: WhatsappProviderCooldown;
    }
  | {
      outcome: "settlement-conflict";
      existing: WhatsappRateLimitSettlement;
    };
