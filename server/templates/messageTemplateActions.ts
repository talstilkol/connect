"use server";

import {
  createMessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import {
  createMetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import {
  createMetaRepository,
} from "../../db/metaRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  createMetaCredentialVault,
} from "../meta/metaCredentialVault.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
  SyncMessageTemplatesActionResult,
} from "./messageTemplateActionResult.ts";
import {
  createCurrentRailwayMessageTemplateDraftHandler,
} from "./currentRailwayMessageTemplateDraftHandler.ts";
import {
  inspectMessageTemplateSubmissionReadiness,
} from "./messageTemplateSubmissionReadiness.ts";
import {
  createCurrentRailwayMessageTemplateSubmissionHandler,
} from "./currentRailwayMessageTemplateSubmissionHandler.ts";
import {
  createMessageTemplateSyncActionHandler,
} from "./messageTemplateSyncActionHandler.ts";
import {
  createMessageTemplateSyncRuntime,
} from "./messageTemplateSyncRuntime.ts";

const railwayMetaTemplateProviderActionsReady = false;

async function createSyncActionHandler() {
  const { env } = await import("cloudflare:workers");

  return createMessageTemplateSyncActionHandler({
    applicationConfigured: () =>
      inspectClerkConfiguration().status === "configured",
    readSyncReadiness: () =>
      inspectMessageTemplateSubmissionReadiness(env),
    async createSyncContext() {
      const database = await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantMutationSession(
          database,
        );
      const templates =
        createMessageTemplateRepository(database);
      const metaConnections =
        createMetaRepository(database);
      const credentialVault = createMetaCredentialVault(
        createMetaCredentialRepository(database),
        env,
      );

      return {
        session,
        service: createMessageTemplateSyncRuntime({
          environment: env,
          templates,
          metaConnections,
          credentialVault,
        }),
      };
    },
  });
}

export async function saveMessageTemplateDraftAction(
  input: unknown,
): Promise<SaveMessageTemplateDraftActionResult> {
  return createCurrentRailwayMessageTemplateDraftHandler().save(input);
}

export async function submitMessageTemplateAction(
  templateKey: unknown,
): Promise<SubmitMessageTemplateActionResult> {
  if (!railwayMetaTemplateProviderActionsReady) {
    return { status: "meta-configuration-required" };
  }

  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    return createCurrentRailwayMessageTemplateSubmissionHandler()
      .submit(templateKey);
  } catch {
    return { status: "server-error" };
  }
}

export async function syncMessageTemplatesAction(): Promise<SyncMessageTemplatesActionResult> {
  if (!railwayMetaTemplateProviderActionsReady) {
    return { status: "meta-configuration-required" };
  }

  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const handler = await createSyncActionHandler();
    return handler.sync();
  } catch {
    return { status: "server-error" };
  }
}
