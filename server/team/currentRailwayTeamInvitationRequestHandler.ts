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
  createRailwayTeamInvitationRequestHandler,
} from "./railwayTeamInvitationRequestHandler.ts";

function applicationConfigured(): boolean {
  return inspectClerkConfiguration().status === "configured" &&
    inspectRailwayApiClientConfiguration().status === "configured";
}

export function createCurrentRailwayTeamInvitationRequestHandler() {
  return createRailwayTeamInvitationRequestHandler({
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
