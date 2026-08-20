import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import {
  requireCanonicalTimestamp,
  requirePositiveVersion,
} from "../billing/tenantSubscriptionValidation.ts";
import type {
  SystemAdminBusinessProfileActionResult,
} from "./systemAdminBusinessProfileActionResult.ts";
import {
  normalizeSystemAdminBusinessProfileInput,
  SystemAdminBusinessProfileInputError,
  type NormalizedSystemAdminBusinessProfileInput,
} from "./systemAdminBusinessProfileService.ts";

const operationId =
  "system-admin.business-profile.update";
const successDataKeys = Object.freeze([
  "outcome",
  "profile",
]);
const profileKeys = Object.freeze([
  "businessName",
  "createdAt",
  "interfaceLanguage",
  "timezone",
  "updatedAt",
  "version",
]);

export interface RailwaySystemAdminBusinessProfileActionHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () =>
    RailwayApiClientConfigurationState;
  readonly resolveIdentity: () =>
    Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

export interface RailwaySystemAdminBusinessProfileActionHandler {
  readonly update: (
    input: unknown,
  ) => Promise<SystemAdminBusinessProfileActionResult>;
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const actualKeys = Object.keys(value).sort();

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key, index) => key === keys[index])
  );
}

function createPayload(
  input: Readonly<NormalizedSystemAdminBusinessProfileInput>,
): Readonly<RailwayApiJsonObject> {
  return Object.freeze({
    targetTenantId: input.tenantId,
    expectedVersion: input.expectedVersion,
    businessName: input.businessName,
    timezone: input.timezone,
    interfaceLanguage: input.interfaceLanguage,
  });
}

function parseSuccess(
  data: unknown,
  input: Readonly<NormalizedSystemAdminBusinessProfileInput>,
): SystemAdminBusinessProfileActionResult {
  if (
    !isExactRecord(data, successDataKeys) ||
    (data.outcome !== "updated" && data.outcome !== "unchanged") ||
    !isExactRecord(data.profile, profileKeys)
  ) {
    return { status: "server-error" };
  }

  const validation = validatePersistedBusinessProfile(data.profile);
  let version: number;
  let createdAt: string;
  let updatedAt: string;

  try {
    version = requirePositiveVersion(data.profile.version as number);
    createdAt = requireCanonicalTimestamp(
      data.profile.createdAt as string,
    );
    updatedAt = requireCanonicalTimestamp(
      data.profile.updatedAt as string,
    );
  } catch {
    return { status: "server-error" };
  }

  if (
    !validation.success ||
    validation.value.businessName !== input.businessName ||
    validation.value.timezone !== input.timezone ||
    validation.value.interfaceLanguage !== input.interfaceLanguage ||
    Date.parse(updatedAt) < Date.parse(createdAt) ||
    (data.outcome === "updated"
      ? version !== input.expectedVersion + 1
      : version !== input.expectedVersion &&
        version !== input.expectedVersion + 1)
  ) {
    return { status: "server-error" };
  }

  return Object.freeze({
    status: "saved",
    outcome: data.outcome,
    profile: Object.freeze({
      ...validation.value,
      version,
      createdAt,
      updatedAt,
    }),
  });
}

function mapFailure(
  code: string,
): SystemAdminBusinessProfileActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "AUTHORIZATION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    case "NOT_FOUND":
      return { status: "not-found" };
    case "CONFLICT":
      return { status: "conflict" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminBusinessProfileActionHandlerDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error(
      "Railway system admin action dependencies are invalid",
    );
  }
}

export function createRailwaySystemAdminBusinessProfileActionHandler(
  dependencies: Readonly<
    RailwaySystemAdminBusinessProfileActionHandlerDependencies
  >,
): Readonly<RailwaySystemAdminBusinessProfileActionHandler> {
  requireDependencies(dependencies);

  return Object.freeze({
    async update(
      input: unknown,
    ): Promise<SystemAdminBusinessProfileActionResult> {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      const configurationState =
        dependencies.inspectConfiguration();

      if (configurationState.status !== "configured") {
        return { status: "configuration-required" };
      }

      let normalizedInput;

      try {
        normalizedInput =
          normalizeSystemAdminBusinessProfileInput(input);
      } catch (error) {
        return error instanceof SystemAdminBusinessProfileInputError
          ? { status: "invalid-input" }
          : { status: "server-error" };
      }

      let identityState: RailwayApiServerIdentityState;

      try {
        identityState = await dependencies.resolveIdentity();
      } catch {
        return { status: "server-error" };
      }

      if (identityState.status === "unauthenticated") {
        return { status: "unauthenticated" };
      }

      if (identityState.status !== "authenticated") {
        return { status: "server-error" };
      }

      const payload = createPayload(normalizedInput);
      let idempotencyKey: string;

      try {
        idempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            operationId,
            payload,
          );
      } catch {
        return { status: "server-error" };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: operationId,
        requestKind: "mutation",
        idempotencyKey,
        payload,
      } satisfies RailwayApiRequestEnvelope);

      try {
        const client = dependencies.createClient({
          ...configurationState.configuration,
          oidcToken: identityState.oidcToken,
          userSessionToken: identityState.userSessionToken,
        });
        const response = await client.call(request);

        return response.outcome === "ok"
          ? parseSuccess(response.data, normalizedInput)
          : mapFailure(response.code);
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
