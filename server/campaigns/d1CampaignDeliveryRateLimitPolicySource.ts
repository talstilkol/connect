import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  CampaignDeliveryRateLimitPolicySource,
} from "./campaignDeliveryRateLimitContextResolver.ts";

export function createCampaignDeliveryRateLimitPolicySource(
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
        eventKey: policy.eventKey,
        portfolioCapacity:
          policy.portfolioCapacity,
        phoneThroughput:
          policy.phoneThroughput,
        reservationDurationSeconds:
          policy.reservationDurationSeconds,
      };
    },
  };
}

export const createD1CampaignDeliveryRateLimitPolicySource =
  createCampaignDeliveryRateLimitPolicySource;
