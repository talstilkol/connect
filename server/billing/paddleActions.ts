"use server";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import { inspectRailwayApiClientConfiguration } from "../platform/railwayApiClientConfiguration.ts";
import { resolveCurrentRailwayApiServerIdentity } from "../platform/currentRailwayApiServerIdentity.ts";
import { createRailwayApiClient } from "../platform/railwayApiClient.ts";
import { createRailwayPaddleHandler } from "./railwayPaddleHandler.ts";
function handler() {
  return createRailwayPaddleHandler({
    applicationConfigured: () => inspectClerkConfiguration().status === "configured",
    inspectConfiguration: inspectRailwayApiClientConfiguration, resolveIdentity: resolveCurrentRailwayApiServerIdentity,
    createClient: config => createRailwayApiClient({ apiOrigin: config.apiOrigin, deploymentEnvironment: config.deploymentEnvironment,
      oidcTokenProvider: { getToken: async () => config.oidcToken }, userSessionTokenProvider: { getToken: async () => config.userSessionToken } }),
  });
}
export async function readPaddleBillingAction() { return handler().read(); }
export async function createPaddleCheckoutAction() { return handler().createCheckout(); }
