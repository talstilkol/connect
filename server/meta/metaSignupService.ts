import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import type { MetaEmbeddedSignupView, MetaEmbeddedSignupFlow } from "../../shared/domain/metaEmbeddedSignupView.ts";
import { isMetaSignupLaunchId, type MetaSignupBeginResult, type MetaSignupLaunchRepository } from './metaSignupLaunch.ts';
import { sha256Hex } from './metaWebhookSecurity.ts';
import type { MetaConnectionService } from "./metaConnectionService.ts";
import {
  MetaConnectionOrchestrationError,
  normalizeMetaEmbeddedSignupInput,
  normalizeMetaBusinessAppSignupInput,
  type MetaConnectionOrchestrator,
} from "./metaConnectionOrchestrator.ts";
import { mapMetaConnectionOrchestrationError, type MetaEmbeddedSignupCompletionResult } from "./metaEmbeddedSignupCompletion.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "../platform/railwayApiMutationExecutor.ts";
import {
  META_SIGNUP_COMPLETE_OPERATION, parseMetaSignupCompletionResult,
  type MetaSignupAttemptRepository, type MetaSignupAttemptResult,
} from "./metaSignupAttempt.ts";

export interface MetaSignupService {
  readConfiguration(): MetaEmbeddedSignupView;
  begin(session: TenantSession, flow?: MetaEmbeddedSignupFlow): Promise<MetaSignupBeginResult>;
  complete(session: TenantSession, input: unknown): Promise<MetaEmbeddedSignupCompletionResult>;
}

export function deriveMetaSignupConfigurationKey(configuration: MetaEmbeddedSignupView, businessApp = false) {
  // UI capability changes cannot invalidate an existing launch or worker job.
  const identity = configuration.status === 'configured'
    ? { status:configuration.status,appId:configuration.appId,configurationId:configuration.configurationId,apiVersion:configuration.apiVersion }
    : { status:configuration.status };
  return sha256Hex(new TextEncoder().encode(JSON.stringify(businessApp ? { configuration:identity, flow: 'business-app' } : identity)));
}

export function createMetaSignupService(dependencies: Readonly<{
  configuration: MetaEmbeddedSignupView;
  attempts: MetaSignupAttemptRepository;
  launches: MetaSignupLaunchRepository;
  connections: Pick<MetaConnectionService, "read">;
  orchestrator: MetaConnectionOrchestrator | null;
  // Only the dedicated server composition supplies this strategy. Existing
  // HTTP/legacy callers retain their Business App gate.
  businessApp?: Pick<MetaConnectionOrchestrator, 'completeBusinessAppSignup'>;
}>): MetaSignupService {
  const configurationKey = () => deriveMetaSignupConfigurationKey(dependencies.configuration, dependencies.businessApp !== undefined);
  async function response(session: TenantSession, result: MetaSignupAttemptResult): Promise<MetaEmbeddedSignupCompletionResult> {
    if (result.status !== "connected") return parseMetaSignupCompletionResult({ status: result.status }) ?? { status: "server-error" };
    const current = await dependencies.connections.read(session);
    return current?.tenantId === session.tenantId && current.status === "connected" && current.version === result.connectionVersion
      ? { status: "connected", connection: { status: "connected" } }
      : { status: "server-error" };
  }
  return Object.freeze({
    readConfiguration: () => dependencies.configuration,
    async begin(session: TenantSession): Promise<MetaSignupBeginResult> {
      requireTenantPermission(session, 'workspace.manage');
      if (dependencies.configuration.status !== 'configured') return { status: dependencies.configuration.status };
      if (dependencies.orchestrator === null) return { status: 'configuration-required' };
      return dependencies.launches.begin(session, await configurationKey());
    },
    async complete(session: TenantSession, rawInput: unknown): Promise<MetaEmbeddedSignupCompletionResult> {
      requireTenantPermission(session, "workspace.manage");
      if (dependencies.configuration.status !== "configured") return { status: dependencies.configuration.status };
      if (dependencies.orchestrator === null) return { status: "configuration-required" };
      let input;
      try {
        if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput) ||
          Object.keys(rawInput).some((key) => !["authorizationCode", "businessPortfolioId", "wabaId", "phoneNumberId", "flow", "launchId"].includes(key))) {
          return { status: "validation-error" };
        }
        input = dependencies.businessApp ? normalizeMetaBusinessAppSignupInput(rawInput) : normalizeMetaEmbeddedSignupInput(rawInput);
      } catch (error) {
        return error instanceof MetaConnectionOrchestrationError
          ? mapMetaConnectionOrchestrationError(error) : { status: "validation-error" };
      }
      if (typeof rawInput !== 'object' || rawInput === null || !('launchId' in rawInput) || !isMetaSignupLaunchId(rawInput.launchId)) return { status: 'validation-error' };
      const launchId = rawInput.launchId;
      const appId = dependencies.configuration.appId;
      const command = Object.freeze({
        session: Object.freeze({ ...session }),
        launchId,
        launchConfigurationKey: await configurationKey(),
        ...(dependencies.businessApp === undefined ? {} : { synchronizeBusinessApp: true as const }),
        // Reusing one code with different assets must hit the same claim.
        claimKey: await deriveRailwayApiDeterministicIdempotencyKey(META_SIGNUP_COMPLETE_OPERATION, {
          appId, authorizationCode: input.authorizationCode,
        }),
        requestDigest: await deriveRailwayApiMutationRequestDigest(META_SIGNUP_COMPLETE_OPERATION, { appId, ...input, launchId }),
      });
      const claim = await dependencies.attempts.claim(command);
      if (claim.outcome === "completed") return response(session, claim.result);
      if (claim.outcome !== "claimed") return { status: "server-error" };

      let result: MetaSignupAttemptResult;
      try {
        // The claim transaction has committed before any provider call.
        if (claim.baselineConnectionVersion !== null && !isMetaSignupLaunchId(claim.baselineConnectionVersion)) throw new Error('Meta signup launch baseline is unavailable');
        const connection = dependencies.businessApp
          ? await dependencies.businessApp.completeBusinessAppSignup(session, input, { expectedConnectionVersion: claim.baselineConnectionVersion })
          : await dependencies.orchestrator.completeEmbeddedSignup(session, input, { expectedConnectionVersion: claim.baselineConnectionVersion });
        if (connection.tenantId !== session.tenantId || connection.status !== "connected" ||
          !Number.isSafeInteger(connection.version) || connection.version <= 0) {
          throw new Error("Meta signup returned an invalid connection");
        }
        result = { status: "connected", connectionVersion: connection.version };
      } catch (error) {
        result = {
          status: error instanceof MetaConnectionOrchestrationError
            ? mapMetaConnectionOrchestrationError(error).status : "server-error",
          connectionVersion: null,
        };
      }
      // Failure or process loss leaves the durable claim unavailable for replay.
      await dependencies.attempts.complete(command, result);
      return response(session, result);
    },
  });
}
