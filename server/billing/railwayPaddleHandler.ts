import type { RailwayAiAgentHandlerDependencies } from "../ai/railwayAiAgentHandler.ts";
import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";
import { parsePaddleBillingView, type PaddleBillingResult } from "../../shared/domain/paddleBillingView.ts";
export function createRailwayPaddleHandler(dependencies: RailwayAiAgentHandlerDependencies) {
  async function call(mutation: boolean): Promise<PaddleBillingResult> {
    try {
      if (!dependencies.applicationConfigured()) return { status: "configuration-required" };
      const config = dependencies.inspectConfiguration(); if (config.status !== "configured") return { status: "configuration-required" };
      const identity = await dependencies.resolveIdentity();
      if (identity.status !== "authenticated") return { status: identity.status === "unauthenticated" ? "unauthenticated" : "server-error" };
      const client = dependencies.createClient({ ...config.configuration, oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken });
      const operation = mutation ? "billing.checkout.create" : "billing.current.read";
      const response = await client.call({ contractVersion: RAILWAY_API_CONTRACT_VERSION, operation, requestKind: mutation ? "mutation" : "query",
        idempotencyKey: mutation ? await deriveRailwayApiDeterministicIdempotencyKey(operation, {}) : null, payload: {} });
      if (response.outcome !== "ok") return { status: response.code === "CONFIGURATION_REQUIRED" ? "configuration-required" : ["AUTHORIZATION_DENIED", "PERMISSION_DENIED", "TENANT_MEMBERSHIP_REQUIRED"].includes(response.code) ? "permission-denied" : "server-error" };
      const billing = parsePaddleBillingView(response.data); return billing ? { status: "ready", billing } : { status: "server-error" };
    } catch { return { status: "server-error" }; }
  }
  return { read: () => call(false), createCheckout: () => call(true) };
}
