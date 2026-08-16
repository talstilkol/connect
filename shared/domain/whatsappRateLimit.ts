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

export interface WhatsappRateLimitReservation {
  reservationKey: string;
  tenantId: number;
  portfolioKey: string;
  senderKey: string;
  recipientKey: string;
  portfolioCapacity: WhatsappPortfolioCapacity;
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
      outcome: "pair-limited";
      retryAt: string;
    }
  | {
      outcome: "recipient-in-flight";
      retryAt: string;
    }
  | {
      outcome: "portfolio-limited";
      occupiedUniqueRecipients: number;
      maximumUniqueRecipients:
        WhatsappPortfolioMessagingLimit;
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
