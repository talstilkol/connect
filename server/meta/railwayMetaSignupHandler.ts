import { META_SIGNUP_BEGIN_OPERATION, isMetaSignupLaunchId, parseMetaSignupBeginResult, type MetaSignupBeginResult } from './metaSignupLaunch.ts';
import type { MetaEmbeddedSignupView, MetaEmbeddedSignupFlow } from "../../shared/domain/metaEmbeddedSignupView.ts";
import { inspectMetaEmbeddedSignupConfiguration, toMetaEmbeddedSignupView } from "./metaEmbeddedSignupConfiguration.ts";
import { normalizeMetaEmbeddedSignupInput, normalizeMetaBusinessAppSignupInput, MetaConnectionOrchestrationError } from "./metaConnectionOrchestrator.ts";
import { mapMetaConnectionOrchestrationError, type MetaEmbeddedSignupCompletionResult } from "./metaEmbeddedSignupCompletion.ts";
import type { RailwayMetaConnectionReadHandlerDependencies } from "./railwayMetaConnectionReadHandler.ts";
import { META_SIGNUP_COMPLETE_OPERATION, META_SIGNUP_CONFIGURATION_OPERATION, parseMetaSignupCompletionResult } from "./metaSignupAttempt.ts";
import { RAILWAY_API_CONTRACT_VERSION, type RailwayApiJsonObject, type RailwayApiRequestEnvelope, type RailwayApiResponseEnvelope } from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";

function parseConfiguration(value: unknown): MetaEmbeddedSignupView | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("status" in value)) return null;
  if (value.status === "configuration-required" || value.status === "configuration-invalid") {
    return Object.keys(value).join(",") === "status" ? { status: value.status } : null;
  }
  const businessAppEnabled = Object.hasOwn(value,"businessAppEnabled");
  if (value.status !== "configured" || (businessAppEnabled && (!("businessAppEnabled" in value) || value.businessAppEnabled!==true)) ||
    Object.keys(value).sort().join(",") !== (businessAppEnabled ? "apiVersion,appId,businessAppEnabled,configurationId,status" : "apiVersion,appId,configurationId,status") ||
    !("appId" in value) || typeof value.appId !== "string" ||
    !("configurationId" in value) || typeof value.configurationId !== "string" ||
    !("apiVersion" in value) || typeof value.apiVersion !== "string") return null;
  const state = inspectMetaEmbeddedSignupConfiguration({
    META_APP_ID: value.appId, META_EMBEDDED_SIGNUP_CONFIGURATION_ID: value.configurationId,
    META_GRAPH_API_VERSION: value.apiVersion,
  });
  return state.status === "configured" ? { ...toMetaEmbeddedSignupView(state),...(businessAppEnabled ? { businessAppEnabled:true as const } : {}) } : null;
}

function remoteFailure(code: string): MetaEmbeddedSignupCompletionResult {
  switch (code) {
    case "CONFIGURATION_REQUIRED": return { status: "configuration-required" };
    case "TENANT_MEMBERSHIP_REQUIRED": return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED": return { status: "tenant-selection-required" };
    case "USER_AUTHENTICATION_REQUIRED": return { status: "unauthenticated" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED": return { status: "permission-denied" };
    case "INVALID_REQUEST": return { status: "validation-error" };
    default: return { status: "server-error" };
  }
}

export function createRailwayMetaSignupHandler(dependencies: Readonly<RailwayMetaConnectionReadHandlerDependencies>) {
  async function call(request: RailwayApiRequestEnvelope): Promise<RailwayApiResponseEnvelope | null> {
    if (!dependencies.applicationConfigured()) return null;
    const configuration = dependencies.inspectConfiguration();
    if (configuration.status !== "configured") return null;
    const identity = await dependencies.resolveIdentity();
    if (identity.status !== "authenticated") return { contractVersion: RAILWAY_API_CONTRACT_VERSION,
      outcome: "error", code: identity.status === "unauthenticated" ? "USER_AUTHENTICATION_REQUIRED" : "DEPENDENCY_UNAVAILABLE" };
    return dependencies.createClient({ ...configuration.configuration,
      oidcToken: identity.oidcToken, userSessionToken: identity.userSessionToken }).call(request);
  }
  return Object.freeze({
    async readConfiguration(): Promise<MetaEmbeddedSignupView> {
      try {
        const response = await call({ contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: META_SIGNUP_CONFIGURATION_OPERATION, requestKind: "query", idempotencyKey: null, payload: {} });
        if (response === null || response.outcome !== "ok") return { status: "configuration-required" };
        return parseConfiguration(response.data) ?? { status: "configuration-invalid" };
      } catch { return { status: "configuration-required" }; }
    },
    async begin(flow: MetaEmbeddedSignupFlow = "cloud-api"): Promise<MetaSignupBeginResult> {
      try {
        if (flow!=="cloud-api" && flow!=="business-app") return { status:"configuration-invalid" };
        const payload: RailwayApiJsonObject = flow==="business-app" ? { flow } : {};
        const response = await call({ contractVersion: RAILWAY_API_CONTRACT_VERSION, operation: META_SIGNUP_BEGIN_OPERATION,
          requestKind: 'mutation', idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(META_SIGNUP_BEGIN_OPERATION, payload), payload });
        if (response === null) return { status: 'configuration-required' };
        if (response.outcome !== 'ok') return parseMetaSignupBeginResult(remoteFailure(response.code)) ?? { status: 'server-error' };
        return parseMetaSignupBeginResult(response.data) ?? { status: 'server-error' };
      } catch { return { status: 'server-error' }; }
    },
    async complete(rawInput: unknown): Promise<MetaEmbeddedSignupCompletionResult> {
      try {
        if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput) ||
          Object.keys(rawInput).some((key) => !["authorizationCode", "businessPortfolioId", "wabaId", "phoneNumberId", "flow", "launchId"].includes(key))) {
          return { status: "validation-error" };
        }
        const businessApp = "flow" in rawInput && rawInput.flow === "business-app";
        const assets = businessApp ? normalizeMetaBusinessAppSignupInput(rawInput) : normalizeMetaEmbeddedSignupInput(rawInput);
        if (!('launchId' in rawInput) || !isMetaSignupLaunchId(rawInput.launchId)) return { status: 'validation-error' };
        const input = { ...assets, launchId: rawInput.launchId };
        const response = await call({ contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: META_SIGNUP_COMPLETE_OPERATION, requestKind: "mutation",
          idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(META_SIGNUP_COMPLETE_OPERATION, input),
          payload: { ...input },
        });
        if (response === null) return { status: "configuration-required" };
        if (response.outcome !== "ok") return remoteFailure(response.code);
        const result = parseMetaSignupCompletionResult(response.data);
        if (result?.status === "connected" && (businessApp !== (result.synchronization === "background"))) return { status:"server-error" };
        return result ?? { status:"server-error" };
      } catch (error) {
        return error instanceof MetaConnectionOrchestrationError
          ? mapMetaConnectionOrchestrationError(error) : { status: "server-error" };
      }
    },
  });
}
