"use server";

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
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createKnowledgeUploadActionHandler,
} from "./knowledgeUploadActionHandler.ts";
import type {
  UploadKnowledgeSourceActionResult,
} from "./knowledgeUploadActionResult.ts";
import {
  readCurrentKnowledgeSourceScanner,
} from "./currentKnowledgeSourceScanner.ts";
import {
  createR2KnowledgeObjectStorage,
} from "./knowledgeObjectStorage.ts";
import {
  createConfiguredKnowledgeUploadPolicy,
  inspectKnowledgeUploadPolicyConfiguration,
} from "./knowledgeUploadPolicy.ts";
import {
  createKnowledgeUploadService,
} from "./knowledgeUploadService.ts";

export async function uploadKnowledgeSourceAction(
  input: unknown,
): Promise<UploadKnowledgeSourceActionResult> {
  if (
    inspectClerkConfiguration().status !==
    "configured"
  ) {
    return { status: "configuration-required" };
  }

  const { env } = await import(
    "cloudflare:workers"
  );
  const policyConfiguration =
    inspectKnowledgeUploadPolicyConfiguration(
      env,
    );
  const scanner =
    readCurrentKnowledgeSourceScanner();

  if (
    !env.FILES ||
    policyConfiguration.status !==
      "configured" ||
    scanner.status !== "configured"
  ) {
    return { status: "configuration-required" };
  }

  try {
    return await createKnowledgeUploadActionHandler({
      async createContext() {
        const database =
          await requireRuntimeDatabase();
        const session =
          await requireCurrentTenantMutationSession(
            database,
          );

        return {
          session,
          service: createKnowledgeUploadService({
            knowledgeSources:
              createKnowledgeSourceRepository(
                database,
              ),
            objectStorage:
              createR2KnowledgeObjectStorage(
                env.FILES,
              ),
            uploadPolicy:
              createConfiguredKnowledgeUploadPolicy(
                policyConfiguration.configuration,
              ),
            scanner:
              scanner.scanner,
          }),
        };
      },
    }).upload(input);
  } catch {
    return { status: "server-error" };
  }
}
