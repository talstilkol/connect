import type {
  CampaignDeliveryProcessor,
} from "../../shared/domain/campaignDelivery.ts";

export function createUnavailableCampaignDeliveryProcessor(): CampaignDeliveryProcessor {
  return {
    isConfigured() {
      return false;
    },

    async process() {
      throw new Error(
        "Campaign delivery processor is not configured",
      );
    },
  };
}
