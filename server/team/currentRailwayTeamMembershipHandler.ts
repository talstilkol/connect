import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
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
  createRailwayTeamMembershipHandler,
} from "./railwayTeamMembershipHandler.ts";

function applicationConfigured(): boolean {
  return inspectClerkConfiguration().status === "configured" &&
    inspectRailwayApiClientConfiguration().status === "configured";
}

export function createCurrentRailwayTeamMembershipHandler() {
  return createRailwayTeamMembershipHandler({
    applicationConfigured,
    inspectConfiguration: inspectRailwayApiClientConfiguration,
    resolveIdentity: resolveCurrentRailwayApiServerIdentity,
    createClient(configuration) {
      return createRailwayApiClient({
        apiOrigin: configuration.apiOrigin,
        deploymentEnvironment: configuration.deploymentEnvironment,
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
