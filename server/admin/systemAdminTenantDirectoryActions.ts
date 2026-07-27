"use server";

import {
  createSystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentSystemAdminSession,
} from "../auth/currentSystemAdminSession.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  createSystemAdminTenantDirectoryActionHandler,
} from "./systemAdminTenantDirectoryActionHandler.ts";
import type {
  SystemAdminTenantDirectoryActionResult,
} from "./systemAdminTenantDirectoryActionResult.ts";
import {
  createSystemAdminTenantDirectoryService,
} from "./systemAdminTenantDirectoryService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createSystemAdminTenantDirectoryActionHandler({
    applicationConfigured,
    async createContext() {
      const session =
        await requireCurrentSystemAdminSession();
      const database =
        await requireRuntimeDatabase();
      const service =
        createSystemAdminTenantDirectoryService(
          createSystemAdminTenantDirectoryRepository(
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

export async function loadSystemAdminTenantDirectoryAction(
  input: unknown,
): Promise<SystemAdminTenantDirectoryActionResult> {
  try {
    return await createActionHandler().load(
      input,
    );
  } catch {
    return { status: "server-error" };
  }
}
