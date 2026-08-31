import type {
  CampaignDeliveryRateLimitPolicySource,
} from "./campaignDeliveryRateLimitContextResolver.ts";

export function createUnavailableCampaignDeliveryRateLimitPolicySource(): CampaignDeliveryRateLimitPolicySource {
  return {
    isConfigured() {
      return false;
    },

    async load() {
      throw new Error(
        "Campaign delivery rate-limit policy source is not configured",
      );
    },
  };
}
