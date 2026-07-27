import {
  createUnavailableCampaignDeliveryProcessor,
} from "./unavailableCampaignDeliveryProcessor.ts";
import type {
  CampaignDeliveryReadinessStatus,
} from "../../shared/domain/campaignView.ts";

export function inspectCampaignDeliveryReadiness(): {
  status: CampaignDeliveryReadinessStatus;
} {
  return createUnavailableCampaignDeliveryProcessor()
    .isConfigured()
    ? { status: "ready" }
    : { status: "configuration-required" };
}
