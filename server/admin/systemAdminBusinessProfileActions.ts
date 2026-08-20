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
import type {
  SystemAdminBusinessProfileActionResult,
} from "./systemAdminBusinessProfileActionResult.ts";
import {
  createRailwaySystemAdminBusinessProfileActionHandler,
} from "./railwaySystemAdminBusinessProfileActionHandler.ts";

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
  return createRailwaySystemAdminBusinessProfileActionHandler({
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
