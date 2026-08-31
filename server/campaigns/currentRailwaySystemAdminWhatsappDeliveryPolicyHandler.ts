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
  createRailwaySystemAdminWhatsappDeliveryPolicyHandler,
} from "./railwaySystemAdminWhatsappDeliveryPolicyHandler.ts";

function applicationConfigured(): boolean {
  return (
    inspectClerkConfiguration().status === "configured" &&
    inspectSystemAdminConfiguration().status === "configured" &&
    inspectRailwayApiClientConfiguration().status === "configured"
  );
}

export function createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler() {
  return createRailwaySystemAdminWhatsappDeliveryPolicyHandler({
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
