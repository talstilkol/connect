import { requireTenantPermission, TenantSessionError } from "../auth/tenantSession.ts";
import { PaddleError, type PaddlePlan } from "../billing/paddleProtocol.ts";
import type { RateLimitGuard } from "../security/rateLimit.ts";
import { RailwayApiDispatchError, type RailwayApiOperation } from "./railwayApiHttpHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "./railwayApiMutationExecutor.ts";
import type { PostgresPaddleRepository } from "./postgresPaddleRepository.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";
export const PADDLE_CHECKOUT_OPERATION = "billing.checkout.create";
export function createRailwayPaddleOperations(dependencies: {
  tenantSessions: Pick<RailwayTenantSessionResolver, "resolve">;
  billing: Readonly<{ journal: PostgresPaddleRepository; plan: PaddlePlan; clientToken: string }> | null;
  mutationRateLimit: Pick<RateLimitGuard, "consume">;
}): readonly RailwayApiOperation[] {
  return ["billing.current.read", PADDLE_CHECKOUT_OPERATION].map(id => ({ id, requestKind: id === PADDLE_CHECKOUT_OPERATION ? "mutation" : "query",
    async execute(context, payload, request) {
      try {
        const mutation = id === PADDLE_CHECKOUT_OPERATION;
        if (Object.keys(payload).length !== 0 || request.operation !== id || request.requestKind !== (mutation ? "mutation" : "query") ||
          request.idempotencyKey !== (mutation ? await deriveRailwayApiDeterministicIdempotencyKey(id, {}) : null)) throw new RailwayApiDispatchError("INVALID_REQUEST");
        const session = await dependencies.tenantSessions.resolve(context.userIdentity);
        requireTenantPermission(session, mutation ? "workspace.manage" : "billing.read");
        if (!dependencies.billing) throw new RailwayApiDispatchError("CONFIGURATION_REQUIRED");
        if (mutation) {
          const rate = await dependencies.mutationRateLimit.consume(`${session.tenantId}:${session.externalUserId}:${id}`);
          if (rate.outcome !== "allowed") throw new RailwayApiDispatchError("RATE_LIMITED");
          await dependencies.billing.journal.enqueue(session, dependencies.billing.plan);
        }
        return { ...await dependencies.billing.journal.read(session, dependencies.billing.plan.environment), clientToken: dependencies.billing.clientToken };
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) throw error;
        if (error instanceof TenantSessionError) throw new RailwayApiDispatchError("PERMISSION_DENIED");
        if (error instanceof PaddleError && error.code !== "INVALID_SIGNATURE") throw new RailwayApiDispatchError(error.code);
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
      }
    },
  }));
}
