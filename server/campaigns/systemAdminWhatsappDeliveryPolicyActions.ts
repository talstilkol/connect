"use server";

import {
  createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler,
} from "./currentRailwaySystemAdminWhatsappDeliveryPolicyHandler.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "./systemAdminWhatsappDeliveryPolicyActionResult.ts";

export async function approveSystemAdminWhatsappDeliveryPolicyAction(
  input: unknown,
): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
  try {
    return await createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler()
      .approve(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function activateSystemAdminWhatsappDeliveryPolicyKillSwitchAction(
  input: unknown,
): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
  try {
    return await createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler()
      .activateKillSwitch(input);
  } catch {
    return { status: "server-error" };
  }
}
