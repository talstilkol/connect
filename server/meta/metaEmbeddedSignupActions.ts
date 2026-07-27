"use server";

import {
  createMetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import { createMetaRepository } from "../../db/metaRepository.ts";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createMetaConnectionRuntime,
} from "./metaConnectionRuntime.ts";
import {
  createMetaConnectionService,
} from "./metaConnectionService.ts";
import { createMetaCredentialVault } from "./metaCredentialVault.ts";
import {
  createMetaEmbeddedSignupCompletionHandler,
  type MetaEmbeddedSignupCompletionResult,
} from "./metaEmbeddedSignupCompletion.ts";
import {
  inspectMetaEmbeddedSignupServerReadiness,
} from "./metaEmbeddedSignupServerReadiness.ts";

export async function completeMetaEmbeddedSignupAction(
  input: unknown,
): Promise<MetaEmbeddedSignupCompletionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  const { env } = await import("cloudflare:workers");
  const runtimeReadiness =
    inspectMetaEmbeddedSignupServerReadiness(env);

  const handler = createMetaEmbeddedSignupCompletionHandler({
    readConfiguration: () => runtimeReadiness,
    async createContext() {
      const database = await requireRuntimeDatabase();
      const session =
        await requireCurrentTenantMutationSession(
          database,
        );
      const connectionService = createMetaConnectionService(
        createMetaRepository(database),
      );
      const credentialVault = createMetaCredentialVault(
        createMetaCredentialRepository(database),
        env,
      );
      const orchestrator = createMetaConnectionRuntime({
        environment: env,
        credentialVault,
        connectionService,
      });

      return {
        session,
        orchestrator,
      };
    },
  });

  return handler.complete(input);
}
