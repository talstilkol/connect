import type {
  CampaignDeliveryProviderRepository,
  CampaignProviderWebhookStatus,
} from "../../db/campaignDeliveryProviderRepository.ts";
import type {
  WhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";

export interface CampaignDeliveryStatusInput {
  tenantId: number;
  providerMessageId: string;
  status: CampaignProviderWebhookStatus;
  statusEventKey: string;
  statusEventAt: string;
}

export interface CampaignDeliveryStatusReconciler {
  reconcile(
    input: CampaignDeliveryStatusInput,
  ): Promise<{
    outcome: "not-found" | "reconciled";
  }>;
}

export function createCampaignDeliveryStatusReconciler(
  deliveries: CampaignDeliveryProviderRepository,
  rateLimits: Pick<
    WhatsappRateLimitRepository,
    "settle"
  >,
): CampaignDeliveryStatusReconciler {
  return {
    async reconcile(input) {
      const result =
        await deliveries.applyProviderStatus(input);

      if (result.outcome === "not-found") {
        return { outcome: "not-found" };
      }

      if (
        result.outcome === "event-conflict" ||
        result.outcome === "terminal-conflict"
      ) {
        throw new Error(
          "Campaign delivery status conflicts with durable evidence",
        );
      }

      if (!("settlement" in result)) {
        throw new Error(
          "Campaign delivery reconciliation result is invalid",
        );
      }

      if (result.settlement !== null) {
        const settlement = await rateLimits.settle(
          result.settlement,
        );

        if (
          settlement.outcome !== "settled" ||
          settlement.settlement.reservationKey !==
            result.settlement.reservationKey ||
          settlement.settlement.outcome !==
            result.settlement.outcome ||
          settlement.settlement.settledAt !==
            result.settlement.settledAt
        ) {
          throw new Error(
            "Campaign delivery rate-limit settlement conflicts with provider evidence",
          );
        }
      }

      return { outcome: "reconciled" };
    },
  };
}
