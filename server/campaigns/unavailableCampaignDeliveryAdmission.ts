import type {
  CampaignDeliveryAdmissionController,
} from "../../shared/domain/campaignDelivery.ts";

export function createUnavailableCampaignDeliveryAdmission(): CampaignDeliveryAdmissionController {
  return {
    isConfigured() {
      return false;
    },

    async reserve() {
      throw new Error(
        "Campaign delivery admission is not configured",
      );
    },

    async settle() {
      throw new Error(
        "Campaign delivery admission is not configured",
      );
    },
  };
}
