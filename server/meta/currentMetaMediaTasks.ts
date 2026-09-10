import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import { createRailwayApiClient } from "../platform/railwayApiClient.ts";
import { inspectRailwayApiClientConfiguration } from "../platform/railwayApiClientConfiguration.ts";
import { resolveCurrentRailwayApiServerIdentity } from "../platform/currentRailwayApiServerIdentity.ts";
import { createRailwayMetaMediaTaskReadHandler } from "./railwayMetaMediaTaskReadHandler.ts";
export async function readCurrentMetaMediaTasks(after?: unknown) {
  return createRailwayMetaMediaTaskReadHandler({
    applicationConfigured: () => inspectClerkConfiguration().status === "configured",
    inspectConfiguration: inspectRailwayApiClientConfiguration,
    resolveIdentity: resolveCurrentRailwayApiServerIdentity,
    createClient(configuration) {
      return createRailwayApiClient({ apiOrigin: configuration.apiOrigin, deploymentEnvironment: configuration.deploymentEnvironment,
        oidcTokenProvider: { async getToken() { return configuration.oidcToken; } },
        userSessionTokenProvider: { async getToken() { return configuration.userSessionToken; } } });
    },
  }).read(after);
}
