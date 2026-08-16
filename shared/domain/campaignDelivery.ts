import type {
  PersistedCampaign,
  PersistedCampaignRecipient,
} from "./campaign.ts";

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
}

export interface CampaignDeliveryAdmissionRequest {
  campaign: PersistedCampaign;
  deliveryKey: string;
  recipientPhoneNumber: string;
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
}

export type CampaignDeliveryProcessorResult =
  | {
      outcome: "accepted";
      providerMessageId: string;
    }
  | {
      outcome: "rejected";
      errorCode: string;
    };

export interface CampaignDeliveryProcessor {
  isConfigured(): boolean;
  process(
    delivery: PreparedCampaignDelivery,
  ): Promise<CampaignDeliveryProcessorResult>;
}
