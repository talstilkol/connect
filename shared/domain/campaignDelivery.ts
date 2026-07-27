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
}

export type CampaignDeliveryProcessorResult =
  | {
      outcome: "accepted";
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
