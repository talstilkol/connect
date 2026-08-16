"use server";

import {
  createSystemAdminBusinessProfileRepository,
} from "../../db/systemAdminBusinessProfileRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
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
  createSystemAdminBusinessProfileActionHandler,
} from "./systemAdminBusinessProfileActionHandler.ts";
import type {
  SystemAdminBusinessProfileActionResult,
} from "./systemAdminBusinessProfileActionResult.ts";
import {
  createSystemAdminBusinessProfileService,
} from "./systemAdminBusinessProfileService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createSystemAdminBusinessProfileActionHandler({
    applicationConfigured,
    async createContext() {
      const session =
        await requireCurrentSystemAdminMutationSession();
      const database =
        await requireRuntimeDatabase();
      const service =
        createSystemAdminBusinessProfileService(
          createSystemAdminBusinessProfileRepository(
            database,
          ),
        );

      return {
        session,
        service,
      };
    },
  });
}

export async function updateBusinessProfileAdminAction(
  input: unknown,
): Promise<SystemAdminBusinessProfileActionResult> {
  try {
    return await createActionHandler().update(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
