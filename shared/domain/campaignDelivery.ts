import type {
  PersistedCampaign,
  PersistedCampaignRecipient,
} from "./campaign.ts";
import type {
  WhatsappProviderCooldownErrorCode,
  WhatsappProviderCooldownScope,
} from "./whatsappRateLimit.ts";

export interface CampaignDispatchState {
  campaignKey: string;
  tenantId: number;
  status: "scheduled" | "running";
  version: number;
  activatedAt: string;
  startedAt: string | null;
}

export interface CampaignDeliveryQueueJob {
  deliveryKey: string;
}

export interface CampaignDeliveryContext {
  campaignKey: string;
  tenantId: number;
  recipientPhoneNumber: string;
  nextDeliveryAttemptNumber: number;
}

export type CampaignDeliveryPreparation =
  | {
      outcome: "claimed";
      recipient: PersistedCampaignRecipient;
    }
  | {
      outcome: "skipped";
    }
  | {
      outcome: "duplicate";
    };

export interface PreparedCampaignDelivery {
  campaign: PersistedCampaign;
  recipient: PersistedCampaignRecipient;
  rateLimitReservationKey: string;
  deliveryAttemptNumber: number;
  queueAttemptNumber: number;
}

export interface CampaignDeliveryAdmissionRequest {
  campaign: PersistedCampaign;
  deliveryKey: string;
  recipientPhoneNumber: string;
  deliveryAttemptNumber: number;
  queueAttemptNumber: number;
  queueMessageId: string;
  reservedAt: string;
}

export type CampaignDeliveryAdmissionResult =
  | {
      outcome: "reserved";
      reservationKey: string;
    }
  | {
      outcome: "deferred";
      errorCode: string;
      retryAfterSeconds: number;
    };

export interface CampaignDeliveryAdmissionController {
  isConfigured(): boolean;
  reserve(
    delivery: CampaignDeliveryAdmissionRequest,
  ): Promise<CampaignDeliveryAdmissionResult>;
  settle(
    reservationKey: string,
    outcome:
      | "provider-failed"
      | "cancelled-before-submit",
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

export type CampaignDeliveryProcessorResult =
  | {
      outcome: "accepted";
      providerMessageId: string;
    }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | {
      outcome: "deferred";
      errorCode: string;
      providerErrorCode: WhatsappProviderCooldownErrorCode;
      cooldownScope: WhatsappProviderCooldownScope;
      retryAfterSeconds: number;
    };

export interface CampaignDeliveryProcessor {
  isConfigured(): boolean;
  process(
    delivery: PreparedCampaignDelivery,
  ): Promise<CampaignDeliveryProcessorResult>;
}
