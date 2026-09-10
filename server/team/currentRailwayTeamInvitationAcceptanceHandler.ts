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
  inspectTeamInvitationAcceptanceActivation,
} from "./teamInvitationAcceptanceActivation.ts";
import {
  createRailwayTeamInvitationAcceptanceHandler,
} from "./railwayTeamInvitationAcceptanceHandler.ts";

function applicationConfigured(): boolean {
  return inspectTeamInvitationAcceptanceActivation().status === "ready" &&
    inspectRailwayApiClientConfiguration().status === "configured";
}

export function createCurrentRailwayTeamInvitationAcceptanceHandler() {
  return createRailwayTeamInvitationAcceptanceHandler({
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
