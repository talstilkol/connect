import type {
  TenantSubscriptionRepository,
} from "../../db/tenantSubscriptionRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  SystemAdminSubscriptionError,
  SystemAdminSubscriptionInputError,
  createSystemAdminSubscriptionService,
  type SystemAdminSubscriptionService,
} from "../billing/systemAdminSubscriptionService.ts";
import {
  toTenantSubscriptionAdminView,
} from "../billing/systemAdminSubscriptionView.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "./railwayApiMutationExecutor.ts";

export const railwaySystemAdminSubscriptionOperationPolicies =
  Object.freeze([
    Object.freeze({
      id: "system-admin.subscription.create",
      serviceMethod: "create" as const,
    }),
    Object.freeze({
      id: "system-admin.subscription.extend",
      serviceMethod: "extend" as const,
    }),
    Object.freeze({
      id: "system-admin.subscription.status.change",
      serviceMethod: "changeStatus" as const,
    }),
    Object.freeze({
      id: "system-admin.subscription.cancel",
      serviceMethod: "cancel" as const,
    }),
  ].map((operation) =>
    Object.freeze({
      ...operation,
      requestKind: "mutation" as const,
      authorization: "system-admin-allowlist" as const,
      mutationSafety: Object.freeze({
        rateLimit: "system-admin-mutation" as const,
        idempotency:
          "deterministic-request-key-and-event-replay" as const,
        audit: "atomic-immutable-event" as const,
        transaction: "required" as const,
      }),
    }),
  ));

export interface RailwaySystemAdminSubscriptionOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly subscriptions: Pick<
    TenantSubscriptionRepository,
    "create" | "extend" | "changeStatus" | "cancel"
  >;
}

type OperationPolicy =
  (typeof railwaySystemAdminSubscriptionOperationPolicies)[number];

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function hasExactKeys(
  payload: Readonly<RailwayApiJsonObject>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(payload).sort();
  const expected = [...expectedKeys].sort();

  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function createServiceInput(
  policy: Readonly<OperationPolicy>,
  payload: Readonly<RailwayApiJsonObject>,
): Readonly<Record<string, unknown>> {
  switch (policy.serviceMethod) {
    case "create":
      if (
        !hasExactKeys(payload, [
          "targetTenantId",
          "status",
          "startsAt",
          "endsAt",
        ])
      ) {
        invalidRequest();
      }

      return Object.freeze({
        tenantId: payload.targetTenantId,
        status: payload.status,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
      });
    case "extend":
      if (
        !hasExactKeys(payload, [
          "targetTenantId",
          "expectedVersion",
          "newEndsAt",
        ])
      ) {
        invalidRequest();
      }

      return Object.freeze({
        tenantId: payload.targetTenantId,
        expectedVersion: payload.expectedVersion,
        newEndsAt: payload.newEndsAt,
      });
    case "changeStatus":
      if (
        !hasExactKeys(payload, [
          "targetTenantId",
          "expectedVersion",
          "status",
        ])
      ) {
        invalidRequest();
      }

      return Object.freeze({
        tenantId: payload.targetTenantId,
        expectedVersion: payload.expectedVersion,
        status: payload.status,
      });
    case "cancel":
      if (
        !hasExactKeys(payload, [
          "targetTenantId",
          "expectedVersion",
        ])
      ) {
        invalidRequest();
      }

      return Object.freeze({
        tenantId: payload.targetTenantId,
        expectedVersion: payload.expectedVersion,
      });
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminSubscriptionOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,mutationRateLimit,subscriptions" ||
    !Array.isArray(dependencies.allowedExternalUserIds) ||
    dependencies.allowedExternalUserIds.length === 0 ||
    dependencies.allowedExternalUserIds.some(
      (identity) =>
        typeof identity !== "string" ||
        identity.length === 0 ||
        identity.length > 255 ||
        identity.trim() !== identity ||
        /[\u0000-\u001f\u007f]/.test(identity),
    ) ||
    new Set(dependencies.allowedExternalUserIds).size !==
      dependencies.allowedExternalUserIds.length ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.subscriptions?.create !== "function" ||
    typeof dependencies.subscriptions?.extend !== "function" ||
    typeof dependencies.subscriptions?.changeStatus !== "function" ||
    typeof dependencies.subscriptions?.cancel !== "function"
  ) {
    throw new Error(
      "Railway system admin subscription dependencies are invalid",
    );
  }
}

function mapServiceError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof SystemAdminSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }

  if (error instanceof SystemAdminSubscriptionInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof SystemAdminSubscriptionError) {
    switch (error.code) {
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      case "INVALID_TRANSITION":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      case "PERSISTENCE_FAILED":
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

async function executeService(
  service: Readonly<SystemAdminSubscriptionService>,
  policy: Readonly<OperationPolicy>,
  session: Readonly<SystemAdminSession>,
  input: Readonly<Record<string, unknown>>,
) {
  switch (policy.serviceMethod) {
    case "create":
      return service.create(session, input);
    case "extend":
      return service.extend(session, input);
    case "changeStatus":
      return service.changeStatus(session, input);
    case "cancel":
      return service.cancel(session, input);
  }
}

function createOperation(
  policy: Readonly<OperationPolicy>,
  dependencies: Readonly<
    RailwaySystemAdminSubscriptionOperationDependencies
  >,
  service: Readonly<SystemAdminSubscriptionService>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: policy.id,
    requestKind: policy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const serviceInput = createServiceInput(policy, payload);
        const session = resolveSystemAdminSession(
          context.userIdentity,
          dependencies.allowedExternalUserIds,
        );

        if (
          request.operation !== policy.id ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null
        ) {
          invalidRequest();
        }

        const expectedIdempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            policy.id,
            payload,
          );

        if (request.idempotencyKey !== expectedIdempotencyKey) {
          throw new RailwayApiDispatchError("CONFLICT");
        }

        let rateLimitDecision;

        try {
          rateLimitDecision =
            await dependencies.mutationRateLimit.consume(
              `${session.externalUserId}:${policy.id}`,
            );
        } catch {
          throw new RailwayApiDispatchError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        if (rateLimitDecision.outcome === "limited") {
          throw new RailwayApiDispatchError("RATE_LIMITED");
        }

        if (rateLimitDecision.outcome !== "allowed") {
          throw new RailwayApiDispatchError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        const result = await executeService(
          service,
          policy,
          session,
          serviceInput,
        );

        if (
          !result.subscription ||
          (result.outcome !== "created" &&
            result.outcome !== "updated" &&
            result.outcome !== "unchanged")
        ) {
          throw new RailwayApiDispatchError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        return Object.freeze({
          outcome: result.outcome,
          subscription: Object.freeze(
            toTenantSubscriptionAdminView(result.subscription),
          ),
        });
      } catch (error) {
        mapServiceError(error);
      }
    },
  });
}

export function createRailwaySystemAdminSubscriptionOperations(
  dependencies: Readonly<
    RailwaySystemAdminSubscriptionOperationDependencies
  >,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  const service = createSystemAdminSubscriptionService(
    dependencies.subscriptions,
  );

  return Object.freeze(
    railwaySystemAdminSubscriptionOperationPolicies.map((policy) =>
      createOperation(policy, dependencies, service),
    ),
  );
}
