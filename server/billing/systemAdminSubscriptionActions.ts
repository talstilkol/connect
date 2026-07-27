"use server";

import {
  createTenantSubscriptionRepository,
} from "../../db/tenantSubscriptionRepository.ts";
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
  createSystemAdminSubscriptionActionHandler,
} from "./systemAdminSubscriptionActionHandler.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "./systemAdminSubscriptionActionResult.ts";
import {
  createSystemAdminSubscriptionService,
} from "./systemAdminSubscriptionService.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createSystemAdminSubscriptionActionHandler({
    applicationConfigured,
    async createContext() {
      const session =
        await requireCurrentSystemAdminMutationSession();
      const database =
        await requireRuntimeDatabase();
      const service =
        createSystemAdminSubscriptionService(
          createTenantSubscriptionRepository(
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

async function execute(
  operation:
    | "create"
    | "extend"
    | "changeStatus"
    | "cancel",
  input: unknown,
): Promise<SystemAdminSubscriptionActionResult> {
  try {
    return await createActionHandler()[
      operation
    ](input);
  } catch {
    return { status: "server-error" };
  }
}

export async function createTenantSubscriptionAdminAction(
  input: unknown,
): Promise<SystemAdminSubscriptionActionResult> {
  return execute("create", input);
}

export async function extendTenantSubscriptionAdminAction(
  input: unknown,
): Promise<SystemAdminSubscriptionActionResult> {
  return execute("extend", input);
}

export async function changeTenantSubscriptionStatusAdminAction(
  input: unknown,
): Promise<SystemAdminSubscriptionActionResult> {
  return execute("changeStatus", input);
}

export async function cancelTenantSubscriptionAdminAction(
  input: unknown,
): Promise<SystemAdminSubscriptionActionResult> {
  return execute("cancel", input);
}
