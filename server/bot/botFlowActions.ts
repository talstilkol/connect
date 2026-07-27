"use server";

import {
  createBotFlowRepository,
} from "../../db/botFlowRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createBotFlowActionHandler,
} from "./botFlowActionHandler.ts";
import type {
  LoadBotFlowDetailsActionResult,
  PublishBotFlowDraftActionResult,
  SaveBotFlowDraftActionResult,
} from "./botFlowActionResult.ts";
import {
  createBotFlowService,
} from "./botFlowService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
    "configured"
  );
}

function createActionHandler(
  mutation: boolean,
) {
  return createBotFlowActionHandler({
    applicationConfigured,
    async createContext() {
      const database =
        await requireRuntimeDatabase();
      const session = mutation
        ? await requireCurrentTenantMutationSession(
            database,
          )
        : await requireCurrentTenantSession(
            database,
          );

      return {
        session,
        service: createBotFlowService(
          createBotFlowRepository(database),
        ),
      };
    },
  });
}

export async function loadBotFlowDetailsAction(
  botFlowKey: unknown,
): Promise<LoadBotFlowDetailsActionResult> {
  try {
    return await createActionHandler(false).loadDetails(
      botFlowKey,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function saveBotFlowDraftAction(
  input: unknown,
): Promise<SaveBotFlowDraftActionResult> {
  try {
    return await createActionHandler(true).saveDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function publishBotFlowDraftAction(
  input: unknown,
): Promise<PublishBotFlowDraftActionResult> {
  try {
    return await createActionHandler(true).publishDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
