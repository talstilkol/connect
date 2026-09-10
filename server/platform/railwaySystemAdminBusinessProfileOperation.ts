import type {
  SystemAdminBusinessProfileRepository,
} from "../../db/systemAdminBusinessProfileRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  SystemAdminBusinessProfileError,
  SystemAdminBusinessProfileInputError,
  createSystemAdminBusinessProfileService,
} from "../admin/systemAdminBusinessProfileService.ts";
import {
  toSystemAdminBusinessProfileView,
} from "../admin/systemAdminBusinessProfileView.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
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

export const railwaySystemAdminBusinessProfileOperationPolicy =
  Object.freeze({
    id: "system-admin.business-profile.update",
    requestKind: "mutation" as const,
    authorization: "system-admin-allowlist" as const,
    mutationSafety: Object.freeze({
      rateLimit: "system-admin-mutation" as const,
      idempotency:
        "deterministic-request-key-and-event-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  });

export interface RailwaySystemAdminBusinessProfileOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly businessProfiles: SystemAdminBusinessProfileRepository;
}

const payloadKeys = Object.freeze([
  "businessName",
  "expectedVersion",
  "interfaceLanguage",
  "targetTenantId",
  "timezone",
]);

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function parsePayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  targetTenantId: unknown;
  expectedVersion: unknown;
  businessName: unknown;
  timezone: unknown;
  interfaceLanguage: unknown;
}> {
  const keys = Object.keys(payload).sort();

  if (
    keys.length !== payloadKeys.length ||
    !keys.every((key, index) => key === payloadKeys[index])
  ) {
    invalidRequest();
  }

  return Object.freeze({
    targetTenantId: payload.targetTenantId,
    expectedVersion: payload.expectedVersion,
    businessName: payload.businessName,
    timezone: payload.timezone,
    interfaceLanguage: payload.interfaceLanguage,
  });
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminBusinessProfileOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,businessProfiles,mutationRateLimit" ||
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
    typeof dependencies.businessProfiles?.update !== "function"
  ) {
    throw new Error(
      "Railway system admin business profile dependencies are invalid",
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

  if (error instanceof SystemAdminBusinessProfileInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof SystemAdminBusinessProfileError) {
    if (error.code === "NOT_FOUND") {
      throw new RailwayApiDispatchError("NOT_FOUND");
    }

    if (error.code === "CONFLICT") {
      throw new RailwayApiDispatchError("CONFLICT");
    }

    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

export function createRailwaySystemAdminBusinessProfileOperation(
  dependencies: Readonly<
    RailwaySystemAdminBusinessProfileOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);
  const service = createSystemAdminBusinessProfileService(
    dependencies.businessProfiles,
  );

  return Object.freeze({
    id: railwaySystemAdminBusinessProfileOperationPolicy.id,
    requestKind:
      railwaySystemAdminBusinessProfileOperationPolicy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const parsedPayload = parsePayload(payload);
        const session = resolveSystemAdminSession(
          context.userIdentity,
          dependencies.allowedExternalUserIds,
        );

        if (
          request.operation !==
            railwaySystemAdminBusinessProfileOperationPolicy.id ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null
        ) {
          invalidRequest();
        }

        const expectedIdempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            railwaySystemAdminBusinessProfileOperationPolicy.id,
            parsedPayload,
          );

        if (request.idempotencyKey !== expectedIdempotencyKey) {
          throw new RailwayApiDispatchError("CONFLICT");
        }

        let rateLimitDecision;

        try {
          rateLimitDecision =
            await dependencies.mutationRateLimit.consume(
              `${session.externalUserId}:${railwaySystemAdminBusinessProfileOperationPolicy.id}`,
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

        const result = await service.update(session, {
          tenantId: parsedPayload.targetTenantId,
          expectedVersion: parsedPayload.expectedVersion,
          businessName: parsedPayload.businessName,
          timezone: parsedPayload.timezone,
          interfaceLanguage: parsedPayload.interfaceLanguage,
        });

        if (
          !result.profile ||
          (result.outcome !== "updated" &&
            result.outcome !== "unchanged")
        ) {
          throw new RailwayApiDispatchError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        return Object.freeze({
          outcome: result.outcome,
          profile: Object.freeze(
            toSystemAdminBusinessProfileView(result.profile),
          ),
        });
      } catch (error) {
        mapServiceError(error);
      }
    },
  });
}
