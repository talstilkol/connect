import type {
  CampaignDeliveryRateLimitContextResolver,
} from "./campaignDeliveryAdmission.ts";

export function createUnavailableCampaignDeliveryRateLimitContextResolver(): CampaignDeliveryRateLimitContextResolver {
  return {
    isConfigured() {
      return false;
    },

    async resolve() {
      throw new Error(
        "Campaign delivery rate-limit context resolver is not configured",
      );
    },
  };
}
