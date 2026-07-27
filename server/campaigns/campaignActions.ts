"use server";

import {
  createBusinessProfileRepository,
} from "../../db/businessProfileRepository.ts";
import {
  createCampaignAudienceRepository,
} from "../../db/campaignAudienceRepository.ts";
import {
  createCampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import {
  createCampaignRepository,
} from "../../db/campaignRepository.ts";
import {
  createMessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createCampaignActionHandler,
} from "./campaignActionHandler.ts";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "./campaignActionResult.ts";
import {
  createCampaignActivationService,
} from "./campaignActivationService.ts";
import {
  inspectCampaignDeliveryReadiness,
} from "./campaignDeliveryReadiness.ts";
import {
  createCampaignSnapshotService,
} from "./campaignSnapshotService.ts";

function runtimeClock(): {
  now(): Date;
} {
  return {
    now() {
      return new Date();
    },
  };
}

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status === "configured"
  );
}

function createActionHandler() {
  return createCampaignActionHandler({
    applicationConfigured,
    deliveryConfigured: () =>
      inspectCampaignDeliveryReadiness().status ===
      "ready",
    async createSnapshotContext() {
      const database =
        await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantMutationSession(
          database,
        );

      return {
        session,
        service: createCampaignSnapshotService({
          audiences:
            createCampaignAudienceRepository(database),
          campaigns:
            createCampaignRepository(database),
          templates:
            createMessageTemplateRepository(database),
          businessProfiles:
            createBusinessProfileRepository(database),
        }),
      };
    },
    async createActivationContext() {
      const database =
        await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantMutationSession(
          database,
        );

      return {
        session,
        service: createCampaignActivationService(
          createCampaignDispatchRepository(database),
          runtimeClock(),
        ),
      };
    },
  });
}

export async function saveCampaignSnapshotAction(
  input: unknown,
): Promise<SaveCampaignSnapshotActionResult> {
  if (!applicationConfigured()) {
    return { status: "configuration-required" };
  }

  try {
    return await createActionHandler().saveSnapshot(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function activateCampaignAction(
  input: unknown,
): Promise<ActivateCampaignActionResult> {
  if (!applicationConfigured()) {
    return { status: "configuration-required" };
  }

  try {
    return await createActionHandler().activate(input);
  } catch {
    return { status: "server-error" };
  }
}
