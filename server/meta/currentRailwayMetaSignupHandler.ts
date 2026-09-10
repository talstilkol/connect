import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import { createRailwayApiClient } from "../platform/railwayApiClient.ts";
import { inspectRailwayApiClientConfiguration } from "../platform/railwayApiClientConfiguration.ts";
import { resolveCurrentRailwayApiServerIdentity } from "../platform/currentRailwayApiServerIdentity.ts";
import { createRailwayMetaSignupHandler } from "./railwayMetaSignupHandler.ts";

export function createCurrentRailwayMetaSignupHandler() {
  return createRailwayMetaSignupHandler({
    applicationConfigured: () => inspectClerkConfiguration().status === "configured",
    inspectConfiguration: inspectRailwayApiClientConfiguration,
    resolveIdentity: resolveCurrentRailwayApiServerIdentity,
    createClient(configuration) {
      return createRailwayApiClient({
        apiOrigin: configuration.apiOrigin,
        deploymentEnvironment: configuration.deploymentEnvironment,
        requestTimeoutMs: 60_000,
        oidcTokenProvider: { async getToken() { return configuration.oidcToken; } },
        userSessionTokenProvider: { async getToken() { return configuration.userSessionToken; } },
      });
    },
  });
}
