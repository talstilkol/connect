"use server";

import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  createRailwayApiClient,
} from "../platform/railwayApiClient.ts";
import {
  inspectRailwayApiClientConfiguration,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  resolveCurrentRailwayApiServerIdentity,
} from "../platform/currentRailwayApiServerIdentity.ts";
import {
  createRailwaySystemAdminSubscriptionActionHandler,
} from "./railwaySystemAdminSubscriptionActionHandler.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "./systemAdminSubscriptionActionResult.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status ===
      "configured" &&
    inspectSystemAdminConfiguration().status ===
      "configured" &&
    inspectRailwayApiClientConfiguration().status ===
      "configured"
  );
}

function createActionHandler() {
  return createRailwaySystemAdminSubscriptionActionHandler({
    applicationConfigured,
    inspectConfiguration:
      inspectRailwayApiClientConfiguration,
    resolveIdentity:
      resolveCurrentRailwayApiServerIdentity,
    createClient(configuration) {
      return createRailwayApiClient({
        apiOrigin: configuration.apiOrigin,
        deploymentEnvironment:
          configuration.deploymentEnvironment,
        oidcTokenProvider: {
          async getToken() {
            return configuration.oidcToken;
          },
        },
        userSessionTokenProvider: {
          async getToken() {
            return configuration.userSessionToken;
          },
        },
      });
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
