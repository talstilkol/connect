import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { META_SIGNUP_BEGIN_OPERATION } from '../meta/metaSignupLaunch.ts';
import type { MetaSignupService } from "../meta/metaSignupService.ts";
import { META_SIGNUP_COMPLETE_OPERATION, META_SIGNUP_CONFIGURATION_OPERATION } from "../meta/metaSignupAttempt.ts";
import type { RateLimitGuard } from "../security/rateLimit.ts";
import { RailwayApiDispatchError, type RailwayApiOperation } from "./railwayApiHttpHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "./railwayApiMutationExecutor.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";

export function createRailwayMetaSignupOperations(dependencies: Readonly<{
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">;
  mutationRateLimit: Pick<RateLimitGuard, "consume">;
  service: MetaSignupService;
}>): readonly Readonly<RailwayApiOperation>[] {
  return [META_SIGNUP_CONFIGURATION_OPERATION, META_SIGNUP_BEGIN_OPERATION, META_SIGNUP_COMPLETE_OPERATION].map((id) => {
    const requestKind = id === META_SIGNUP_CONFIGURATION_OPERATION ? "query" : "mutation";
    return Object.freeze({
      id, requestKind,
      async execute(context, payload, request) {
        try {
          if (request.operation !== id || request.requestKind !== requestKind ||
            (requestKind === "query" && (request.idempotencyKey !== null || Object.keys(payload).length !== 0)) ||
            (requestKind === "mutation" && request.idempotencyKey !== await deriveRailwayApiDeterministicIdempotencyKey(id, payload))) {
            throw new RailwayApiDispatchError("INVALID_REQUEST");
          }
          if (id === META_SIGNUP_BEGIN_OPERATION && !(Object.keys(payload).length === 0 ||
            (Object.keys(payload).join(',')==='flow' && (payload.flow==='cloud-api' || payload.flow==='business-app')))) throw new RailwayApiDispatchError('INVALID_REQUEST');
          const session = await dependencies.tenantSessions.resolve(context.userIdentity);
          requireTenantPermission(session, "workspace.manage");
          if (requestKind === "query") return dependencies.service.readConfiguration();
          const decision = await dependencies.mutationRateLimit.consume(`${session.tenantId}:${session.externalUserId}:${id}`);
          if (decision.outcome === "limited") throw new RailwayApiDispatchError("RATE_LIMITED");
          if (decision.outcome !== "allowed") throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
          if (id === META_SIGNUP_BEGIN_OPERATION) {
            if (payload.flow==='business-app') {
              const configuration = dependencies.service.readConfiguration();
              if (configuration.status!=='configured' || configuration.businessAppEnabled!==true) return { status:'configuration-required' };
              return await dependencies.service.begin(session,'business-app');
            }
            return await dependencies.service.begin(session);
          }
          return await dependencies.service.complete(session, payload);
        } catch (error) {
          if (error instanceof RailwayApiDispatchError) throw error;
          if (error instanceof TenantSessionError) {
            if (["PERMISSION_DENIED", "TENANT_MEMBERSHIP_REQUIRED", "TENANT_SELECTION_REQUIRED"].includes(error.code)) {
              throw new RailwayApiDispatchError(error.code as "PERMISSION_DENIED" | "TENANT_MEMBERSHIP_REQUIRED" | "TENANT_SELECTION_REQUIRED");
            }
            throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
          }
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
      },
    } satisfies RailwayApiOperation);
  });
}
