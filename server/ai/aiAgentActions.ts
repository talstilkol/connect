"use server";

import {
  createAiAgentRepository,
} from "../../db/aiAgentRepository.ts";
import {
  createKnowledgeSourceRepository,
} from "../../db/knowledgeSourceRepository.ts";
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
  createAiAgentActionHandler,
} from "./aiAgentActionHandler.ts";
import type {
  LoadAiAgentDetailsActionResult,
  PublishAiAgentDraftActionResult,
  SaveAiAgentDraftActionResult,
} from "./aiAgentActionResult.ts";
import {
  createAiAgentService,
} from "./aiAgentService.ts";
import {
  unavailableAiOperationalReadinessProvider,
} from "./aiOperationalReadiness.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
    "configured"
  );
}

function createActionHandler(
  mutation: boolean,
) {
  return createAiAgentActionHandler({
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
        service: createAiAgentService({
          agents:
            createAiAgentRepository(database),
          knowledgeSources:
            createKnowledgeSourceRepository(
              database,
            ),
          operationalReadiness:
            unavailableAiOperationalReadinessProvider,
        }),
      };
    },
  });
}

export async function loadAiAgentDetailsAction(
  aiAgentKey: unknown,
): Promise<LoadAiAgentDetailsActionResult> {
  try {
    return await createActionHandler(false).loadDetails(
      aiAgentKey,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function saveAiAgentDraftAction(
  input: unknown,
): Promise<SaveAiAgentDraftActionResult> {
  try {
    return await createActionHandler(true).saveDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}

export async function publishAiAgentDraftAction(
  input: unknown,
): Promise<PublishAiAgentDraftActionResult> {
  try {
    return await createActionHandler(true).publishDraft(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
