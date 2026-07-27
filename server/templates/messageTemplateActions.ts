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
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createMetaCredentialVault,
} from "../meta/metaCredentialVault.ts";
import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
  SyncMessageTemplatesActionResult,
} from "./messageTemplateActionResult.ts";
import {
  createMessageTemplateActionHandler,
} from "./messageTemplateActionHandler.ts";
import {
  createMessageTemplateService,
} from "./messageTemplateService.ts";
import {
  inspectMessageTemplateSubmissionReadiness,
} from "./messageTemplateSubmissionReadiness.ts";
import {
  createMessageTemplateSubmissionRuntime,
} from "./messageTemplateSubmissionRuntime.ts";
import {
  createMessageTemplateSyncActionHandler,
} from "./messageTemplateSyncActionHandler.ts";
import {
  createMessageTemplateSyncRuntime,
} from "./messageTemplateSyncRuntime.ts";

async function createActionHandler() {
  const { env } = await import("cloudflare:workers");

  return createMessageTemplateActionHandler({
    applicationConfigured: () =>
      inspectClerkConfiguration().status === "configured",
    readSubmissionReadiness: () =>
      inspectMessageTemplateSubmissionReadiness(env),
    async createDraftContext() {
      const database = await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantMutationSession(
          database,
        );
      const templates =
        createMessageTemplateRepository(database);

      return {
        session,
        service: createMessageTemplateService(templates),
      };
    },
    async createSubmissionContext() {
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
        service: createMessageTemplateSubmissionRuntime({
          environment: env,
          templates,
          metaConnections,
          credentialVault,
        }),
      };
    },
  });
}

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
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const handler = await createActionHandler();
    return handler.saveDraft(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function submitMessageTemplateAction(
  templateKey: unknown,
): Promise<SubmitMessageTemplateActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const handler = await createActionHandler();
    return handler.submit(templateKey);
  } catch {
    return { status: "server-error" };
  }
}

export async function syncMessageTemplatesAction(): Promise<SyncMessageTemplatesActionResult> {
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
