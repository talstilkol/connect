import type {
  ProductionDecisionRepository,
} from "../../db/productionDecisionRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  toProductionDecisionRecordView,
} from "../../shared/domain/productionDecisionRecord.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  createSystemAdminProductionDecisionService,
  SystemAdminProductionDecisionError,
  SystemAdminProductionDecisionInputError,
} from "../operations/systemAdminProductionDecisionService.ts";
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

export const railwaySystemAdminProductionDecisionOperationPolicies =
  Object.freeze([
    Object.freeze({
      id: "system-admin.production-decisions.list",
      requestKind: "query" as const,
      authorization: "system-admin-allowlist" as const,
      mutationSafety: null,
    }),
    Object.freeze({
      id: "system-admin.production-decisions.save",
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
  ]);

export interface RailwaySystemAdminProductionDecisionOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly productionDecisions: Pick<
    ProductionDecisionRepository,
    "list" | "save"
  >;
}

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

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,mutationRateLimit,productionDecisions" ||
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
    typeof dependencies.productionDecisions?.list !== "function" ||
    typeof dependencies.productionDecisions?.save !== "function"
  ) {
    throw new Error(
      "Railway system admin production decision dependencies are invalid",
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

  if (error instanceof SystemAdminProductionDecisionInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof SystemAdminProductionDecisionError) {
    throw new RailwayApiDispatchError(
      error.code === "CONFLICT"
        ? "CONFLICT"
        : "DEPENDENCY_UNAVAILABLE",
    );
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwaySystemAdminProductionDecisionOperations(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionOperationDependencies
  >,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  const service = createSystemAdminProductionDecisionService(
    dependencies.productionDecisions,
  );
  const listPolicy =
    railwaySystemAdminProductionDecisionOperationPolicies[0];
  const savePolicy =
    railwaySystemAdminProductionDecisionOperationPolicies[1];

  return Object.freeze([
    Object.freeze({
      id: listPolicy.id,
      requestKind: listPolicy.requestKind,
      async execute(
        context: Readonly<RailwayApiDispatchContext>,
        payload: RailwayApiJsonObject,
        request: Readonly<RailwayApiRequestEnvelope>,
      ) {
        try {
          if (
            !hasExactKeys(payload, []) ||
            request.operation !== listPolicy.id ||
            request.requestKind !== "query" ||
            request.idempotencyKey !== null
          ) {
            invalidRequest();
          }

          const session = resolveSystemAdminSession(
            context.userIdentity,
            dependencies.allowedExternalUserIds,
          );
          const records = await service.list(session);

          return Object.freeze({
            records: Object.freeze(
              records.map((record) =>
                Object.freeze(
                  toProductionDecisionRecordView(record),
                ),
              ),
            ),
          });
        } catch (error) {
          mapServiceError(error);
        }
      },
    }),
    Object.freeze({
      id: savePolicy.id,
      requestKind: savePolicy.requestKind,
      async execute(
        context: Readonly<RailwayApiDispatchContext>,
        payload: RailwayApiJsonObject,
        request: Readonly<RailwayApiRequestEnvelope>,
      ) {
        try {
          if (
            !hasExactKeys(payload, [
              "checkId",
              "expectedVersion",
              "selection",
              "rationale",
            ]) ||
            request.operation !== savePolicy.id ||
            request.requestKind !== "mutation" ||
            request.idempotencyKey === null
          ) {
            invalidRequest();
          }

          const session = resolveSystemAdminSession(
            context.userIdentity,
            dependencies.allowedExternalUserIds,
          );
          const expectedIdempotencyKey =
            await deriveRailwayApiDeterministicIdempotencyKey(
              savePolicy.id,
              payload,
            );

          if (request.idempotencyKey !== expectedIdempotencyKey) {
            throw new RailwayApiDispatchError("CONFLICT");
          }

          let rateLimitDecision;

          try {
            rateLimitDecision =
              await dependencies.mutationRateLimit.consume(
                `${session.externalUserId}:${savePolicy.id}`,
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

          const result = await service.save(session, payload);

          if (
            result.outcome !== "created" &&
            result.outcome !== "updated" &&
            result.outcome !== "unchanged"
          ) {
            throw new RailwayApiDispatchError(
              "DEPENDENCY_UNAVAILABLE",
            );
          }

          return Object.freeze({
            outcome: result.outcome,
            record: Object.freeze(
              toProductionDecisionRecordView(result.record),
            ),
          });
        } catch (error) {
          mapServiceError(error);
        }
      },
    }),
  ]);
}
