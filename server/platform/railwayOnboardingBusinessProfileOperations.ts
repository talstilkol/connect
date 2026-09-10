import type {
  BusinessProfileRepository,
} from "../../db/businessProfileRepository.ts";
import type {
  BusinessProfileDraft,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  parseRailwayBusinessProfileView,
} from "../onboarding/railwayBusinessProfileResult.ts";
import {
  requireTenantPermission,
  TenantSessionError,
} from "../auth/tenantSession.ts";
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
  deriveRailwayApiMutationRequestDigest,
} from "./railwayApiMutationExecutor.ts";
import {
  parseRailwayOnboardingBusinessProfileMutationState,
  type RailwayOnboardingBusinessProfileMutationExecutor,
} from "./railwayOnboardingBusinessProfileMutationExecutor.ts";
import {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
} from "./railwayOnboardingBusinessProfileOperationContract.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";

export {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
} from "./railwayOnboardingBusinessProfileOperationContract.ts";

export const railwayOnboardingBusinessProfileOperationPolicies =
  Object.freeze([
    Object.freeze({
      id: RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
      requestKind: "query" as const,
      authorization: "authenticated-user-with-optional-tenant" as const,
      mutationSafety: null,
    }),
    Object.freeze({
      id: RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
      requestKind: "mutation" as const,
      authorization: "authenticated-user-with-optional-tenant" as const,
      mutationSafety: Object.freeze({
        rateLimit: "tenant-mutation" as const,
        idempotency: "atomic-request-digest-replay" as const,
        audit: "atomic-immutable-event" as const,
        transaction: "required" as const,
      }),
    }),
  ]);

export interface RailwayOnboardingBusinessProfileOperationDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly businessProfiles: Pick<
    BusinessProfileRepository,
    "findByTenantId"
  >;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly mutations: RailwayOnboardingBusinessProfileMutationExecutor;
}

const profilePayloadKeys = Object.freeze([
  "businessName",
  "interfaceLanguage",
  "timezone",
]);
const mutationResultKeys = Object.freeze([
  "outcome",
  "state",
  "tenantId",
]);

type MutationResultSnapshot =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: unknown;
    }>
  | Readonly<{
      outcome: "conflict" | "unavailable";
      tenantId: null;
      state: null;
    }>;

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function requireDependencies(
  dependencies: Readonly<
    RailwayOnboardingBusinessProfileOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "businessProfiles,mutationRateLimit,mutations,tenantSessions" ||
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.tenantSessions?.resolveOptional !== "function" ||
    typeof dependencies.businessProfiles?.findByTenantId !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.mutations?.execute !== "function"
  ) {
    throw new Error(
      "Railway onboarding business profile dependencies are invalid",
    );
  }
}

function parseProfilePayload(
  payload: RailwayApiJsonObject,
): Readonly<BusinessProfileDraft> {
  const keys = Object.keys(payload).sort();
  const validation = validatePersistedBusinessProfile(payload);
  if (
    keys.length !== profilePayloadKeys.length ||
    !keys.every((key, index) => key === profilePayloadKeys[index]) ||
    !validation.success ||
    validation.value.businessName !== payload.businessName ||
    validation.value.timezone !== payload.timezone ||
    validation.value.interfaceLanguage !== payload.interfaceLanguage
  ) {
    invalidRequest();
  }
  return Object.freeze(validation.value);
}

function snapshotMutationResult(
  value: unknown,
): MutationResultSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  try {
    if (Array.isArray(value)) {
      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Reflect.ownKeys(descriptors);
    if (
      actualKeys.length !== mutationResultKeys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" || !mutationResultKeys.includes(key)
      )
    ) {
      return null;
    }

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of mutationResultKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }

    if (
      snapshot.outcome === "conflict" ||
      snapshot.outcome === "unavailable"
    ) {
      return snapshot.tenantId === null && snapshot.state === null
        ? Object.freeze({
            outcome: snapshot.outcome,
            tenantId: null,
            state: null,
          })
        : null;
    }

    if (
      (snapshot.outcome !== "committed" &&
        snapshot.outcome !== "replayed") ||
      !Number.isSafeInteger(snapshot.tenantId) ||
      Number(snapshot.tenantId) <= 0
    ) {
      return null;
    }

    return Object.freeze({
      outcome: snapshot.outcome,
      tenantId: Number(snapshot.tenantId),
      state: snapshot.state,
    });
  } catch {
    return null;
  }
}

function requireQueryRequest(
  payload: RailwayApiJsonObject,
  request: Readonly<RailwayApiRequestEnvelope>,
): void {
  if (
    Object.keys(payload).length !== 0 ||
    request.operation !==
      RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION ||
    request.requestKind !== "query" ||
    request.idempotencyKey !== null
  ) {
    invalidRequest();
  }
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }
  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_SELECTION_REQUIRED");
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      case "AUTHENTICATION_REQUIRED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
    }
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

function createReadOperation(
  dependencies: Readonly<
    RailwayOnboardingBusinessProfileOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
    requestKind: "query" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        requireQueryRequest(payload, request);
        const session = await dependencies.tenantSessions.resolveOptional(
          context.userIdentity,
        );
        if (session === null) {
          return Object.freeze({ profile: null });
        }
        const stored = await dependencies.businessProfiles.findByTenantId(
          session.tenantId,
        );
        if (stored === null) {
          return Object.freeze({ profile: null });
        }
        const profile = parseRailwayBusinessProfileView({
          businessName: stored.businessName,
          timezone: stored.timezone,
          interfaceLanguage: stored.interfaceLanguage,
          version: stored.version,
        });
        if (profile === null || stored.tenantId !== session.tenantId) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        return Object.freeze({ profile });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

function createSaveOperation(
  dependencies: Readonly<
    RailwayOnboardingBusinessProfileOperationDependencies
  >,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
    requestKind: "mutation" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const parsedPayload = parseProfilePayload(payload);
        if (
          request.operation !==
            RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null
        ) {
          invalidRequest();
        }
        const [expectedIdempotencyKey, requestDigest] = await Promise.all([
          deriveRailwayApiDeterministicIdempotencyKey(
            RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
            parsedPayload,
          ),
          deriveRailwayApiMutationRequestDigest(
            RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
            parsedPayload,
          ),
        ]);
        if (request.idempotencyKey !== expectedIdempotencyKey) {
          invalidRequest();
        }
        let rateLimitDecision;
        try {
          rateLimitDecision = await dependencies.mutationRateLimit.consume(
            `${context.userIdentity.externalUserId}:${RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION}`,
          );
        } catch {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (rateLimitDecision.outcome === "limited") {
          throw new RailwayApiDispatchError("RATE_LIMITED");
        }
        if (rateLimitDecision.outcome !== "allowed") {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        const session = await dependencies.tenantSessions.resolveOptional(
          context.userIdentity,
        );
        if (session !== null) {
          requireTenantPermission(session, "workspace.manage");
        }
        const result = snapshotMutationResult(
          await dependencies.mutations.execute({
            identity: context.userIdentity,
            session,
            operation: RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
            idempotencyKey: request.idempotencyKey,
            requestDigest,
            payload: parsedPayload,
          }),
        );
        if (result === null) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (result.outcome === "conflict") {
          throw new RailwayApiDispatchError("CONFLICT");
        }
        if (result.outcome === "unavailable") {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (
          (session !== null && result.tenantId !== session.tenantId)
        ) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        const state = parseRailwayOnboardingBusinessProfileMutationState(
          parsedPayload,
          result.state,
        );
        if (state === null) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (
          result.outcome === "committed" &&
          state.createdTenant !== (session === null)
        ) {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        return Object.freeze({
          replayed: result.outcome === "replayed",
          createdTenant: state.createdTenant,
          profile: state.profile,
        });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

export function createRailwayOnboardingBusinessProfileOperations(
  dependencies: Readonly<
    RailwayOnboardingBusinessProfileOperationDependencies
  >,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  return Object.freeze([
    createReadOperation(dependencies),
    createSaveOperation(dependencies),
  ]);
}
