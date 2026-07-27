"use server";

import {
  createProductionDecisionRepository,
} from "../../db/productionDecisionRepository.ts";
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
  createSystemAdminProductionDecisionActionHandler,
} from "./systemAdminProductionDecisionActionHandler.ts";
import type {
  SystemAdminProductionDecisionActionResult,
} from "./systemAdminProductionDecisionActionResult.ts";
import {
  createSystemAdminProductionDecisionService,
} from "./systemAdminProductionDecisionService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createSystemAdminProductionDecisionActionHandler({
    applicationConfigured,
    async createContext() {
      const session =
        await requireCurrentSystemAdminMutationSession();
      const database =
        await requireRuntimeDatabase();
      const service =
        createSystemAdminProductionDecisionService(
          createProductionDecisionRepository(
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

export async function saveSystemAdminProductionDecisionAction(
  input: unknown,
): Promise<SystemAdminProductionDecisionActionResult> {
  try {
    return await createActionHandler().save(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
