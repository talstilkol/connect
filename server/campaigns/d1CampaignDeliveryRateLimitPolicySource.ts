import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  CampaignDeliveryRateLimitPolicySource,
} from "./campaignDeliveryRateLimitContextResolver.ts";

export function createD1CampaignDeliveryRateLimitPolicySource(
  repository: WhatsappCampaignDeliveryPolicyRepository,
): CampaignDeliveryRateLimitPolicySource {
  return {
    isConfigured() {
      return true;
    },

    async load(request) {
      const policy =
        await repository.findCurrentEnabledPolicy(
          request,
        );

      if (!policy) {
        return null;
      }

      return {
        portfolioCapacity:
          policy.portfolioCapacity,
        reservationDurationSeconds:
          policy.reservationDurationSeconds,
      };
    },
  };
}
