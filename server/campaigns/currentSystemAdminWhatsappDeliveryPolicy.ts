import type {
  CurrentSystemAdminWhatsappDeliveryPolicy,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler,
} from "./currentRailwaySystemAdminWhatsappDeliveryPolicyHandler.ts";

export async function readCurrentSystemAdminWhatsappDeliveryPolicy(
  tenantIdInput: unknown,
): Promise<CurrentSystemAdminWhatsappDeliveryPolicy> {
  try {
    return await createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler()
      .read(tenantIdInput);
  } catch {
    return {
      status: "server-error",
      connection: null,
      record: null,
    };
  }
}
