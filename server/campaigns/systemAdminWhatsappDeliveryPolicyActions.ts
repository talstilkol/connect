"use server";

import {
  createMetaRepository,
} from "../../db/metaRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  createWhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentSystemAdminMutationSession,
} from "../auth/currentSystemAdminMutationSession.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  createSystemAdminWhatsappDeliveryPolicyActionHandler,
} from "./systemAdminWhatsappDeliveryPolicyActionHandler.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "./systemAdminWhatsappDeliveryPolicyActionResult.ts";
import {
  createSystemAdminWhatsappDeliveryPolicyService,
} from "./systemAdminWhatsappDeliveryPolicyService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createSystemAdminWhatsappDeliveryPolicyActionHandler({
    applicationConfigured,
    async createContext() {
      const session =
        await requireCurrentSystemAdminMutationSession();
      const database =
        await requireRuntimeDatabase();
      const service =
        createSystemAdminWhatsappDeliveryPolicyService(
          {
            metaRepository:
              createMetaRepository(database),
            policyRepository:
              createWhatsappCampaignDeliveryPolicyRepository(
                database,
              ),
          },
        );

      return {
        session,
        service,
      };
    },
  });
}

export async function approveSystemAdminWhatsappDeliveryPolicyAction(
  input: unknown,
): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
  try {
    return await createActionHandler().approve(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function activateSystemAdminWhatsappDeliveryPolicyKillSwitchAction(
  input: unknown,
): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
  try {
    return await createActionHandler()
      .activateKillSwitch(input);
  } catch {
    return { status: "server-error" };
  }
}
