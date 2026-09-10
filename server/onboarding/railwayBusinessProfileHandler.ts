import {
  validatePersistedBusinessProfile,
  type BusinessProfileValidationIssue,
} from "../../shared/validation/persistedBusinessProfile.ts";
import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  normalizeRailwayApiJson,
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
} from "../platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
} from "../platform/railwayOnboardingBusinessProfileOperationContract.ts";
import type {
  LoadBusinessProfileActionResult,
  SaveBusinessProfileActionResult,
} from "./businessProfileActionResult.ts";
import {
  parseRailwayBusinessProfileSaveView,
  parseRailwayBusinessProfileView,
} from "./railwayBusinessProfileResult.ts";

export interface RailwayBusinessProfileHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () => RailwayApiClientConfigurationState;
  readonly resolveIdentity: () => Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

type ClientContextResult =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

const strictPayloadKeys = Object.freeze([
  "businessName",
  "interfaceLanguage",
  "timezone",
]);
const unsupportedShapeIssues = Object.freeze([
  Object.freeze({
    field: "businessName" as const,
    code: "unsupported" as const,
  }),
  Object.freeze({
    field: "timezone" as const,
    code: "unsupported" as const,
  }),
  Object.freeze({
    field: "interfaceLanguage" as const,
    code: "unsupported" as const,
  }),
]) satisfies readonly BusinessProfileValidationIssue[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function requireDependencies(
  dependencies: Readonly<RailwayBusinessProfileHandlerDependencies>,
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
    throw new Error("Railway business profile dependencies are invalid");
  }
}

function mapLoadFailure(code: string): LoadBusinessProfileActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "permission-denied" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    default:
      return { status: "server-error" };
  }
}

function mapSaveFailure(code: string): SaveBusinessProfileActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return {
        status: "validation-error",
        issues: unsupportedShapeIssues,
      };
    default:
      return { status: "server-error" };
  }
}

function parseSaveInput(input: unknown):
  | Readonly<{ status: "ready"; payload: RailwayApiJsonObject }>
  | Readonly<{
      status: "invalid";
      issues: readonly BusinessProfileValidationIssue[];
    }> {
  let normalized: unknown;
  try {
    normalized = normalizeRailwayApiJson(input);
  } catch {
    return { status: "invalid", issues: unsupportedShapeIssues };
  }
  const validation = validatePersistedBusinessProfile(normalized);
  if (!validation.success) {
    return { status: "invalid", issues: validation.issues };
  }
  if (!isRecord(normalized) || !hasExactKeys(normalized, strictPayloadKeys)) {
    return { status: "invalid", issues: unsupportedShapeIssues };
  }
  return Object.freeze({
    status: "ready" as const,
    payload: Object.freeze({ ...validation.value }),
  });
}

export function createRailwayBusinessProfileHandler(
  dependencies: Readonly<RailwayBusinessProfileHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function createContext(): Promise<ClientContextResult> {
    try {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }
      const configuration = dependencies.inspectConfiguration();
      if (configuration.status !== "configured") {
        return { status: "configuration-required" };
      }
      const identity: RailwayApiServerIdentityState =
        await dependencies.resolveIdentity();
      if (identity.status === "unauthenticated") {
        return { status: "unauthenticated" };
      }
      if (identity.status !== "authenticated") {
        return { status: "server-error" };
      }
      return Object.freeze({
        status: "ready" as const,
        client: dependencies.createClient({
          ...configuration.configuration,
          oidcToken: identity.oidcToken,
          userSessionToken: identity.userSessionToken,
        }),
      });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    async load(): Promise<LoadBusinessProfileActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_ONBOARDING_BUSINESS_PROFILE_READ_OPERATION,
          requestKind: "query" as const,
          idempotencyKey: null,
          payload: Object.freeze({}),
        }));
        if (response.outcome !== "ok") {
          return mapLoadFailure(response.code);
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, ["profile"])
        ) {
          return { status: "server-error" };
        }
        if (response.data.profile === null) {
          return Object.freeze({ status: "loaded" as const, profile: null });
        }
        const profile = parseRailwayBusinessProfileView(
          response.data.profile,
        );
        return profile === null
          ? { status: "server-error" }
          : Object.freeze({ status: "loaded" as const, profile });
      } catch {
        return { status: "server-error" };
      }
    },

    async save(input: unknown): Promise<SaveBusinessProfileActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const parsed = parseSaveInput(input);
      if (parsed.status === "invalid") {
        return { status: "validation-error", issues: parsed.issues };
      }
      let idempotencyKey: string;
      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
          parsed.payload,
        );
      } catch {
        return { status: "server-error" };
      }
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
          requestKind: "mutation" as const,
          idempotencyKey,
          payload: parsed.payload,
        }));
        if (response.outcome !== "ok") {
          return mapSaveFailure(response.code);
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, [
            "createdTenant",
            "profile",
            "replayed",
          ]) ||
          typeof response.data.replayed !== "boolean"
        ) {
          return { status: "server-error" };
        }
        const saved = parseRailwayBusinessProfileSaveView({
          createdTenant: response.data.createdTenant,
          profile: response.data.profile,
        });
        return saved === null
          ? { status: "server-error" }
          : Object.freeze({
              status: "saved" as const,
              createdTenant: saved.createdTenant,
              profile: saved.profile,
            });
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
