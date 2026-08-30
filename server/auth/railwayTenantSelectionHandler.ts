import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
} from "../platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import {
  RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION,
} from "../platform/railwayTenantSelectionOperations.ts";
import {
  RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
} from "../platform/railwayTenantSelectionMutationExecutor.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import type {
  LoadTenantSelectionActionResult,
  SelectTenantActionResult,
  TenantSelectionActionFailure,
} from "./tenantSelectionActionResult.ts";
import type {
  TenantSelectionInputIssue,
} from "./tenantSelectionService.ts";
import {
  parseRailwayTenantSelectionDirectory,
  parseRailwayTenantSelectionSaveResult,
} from "./railwayTenantSelectionResult.ts";

export interface RailwayTenantSelectionHandlerDependencies {
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

interface ParsedSelectionInput {
  readonly status: "ready";
  readonly payload: Readonly<{
    selectionKey: string;
    expectedVersion: number;
  }>;
}

const selectionKeyPattern = /^tenant_selection_option_v1_[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function requireDependencies(
  dependencies: Readonly<RailwayTenantSelectionHandlerDependencies>,
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
    throw new Error("Railway tenant selection handler dependencies are invalid");
  }
}

function parseSelectionInput(
  input: unknown,
): ParsedSelectionInput | Readonly<{
  status: "invalid";
  issue: TenantSelectionInputIssue;
}> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ["expectedVersion", "selectionKey"])
  ) {
    return { status: "invalid", issue: "INVALID_INPUT" };
  }
  if (
    typeof input.selectionKey !== "string" ||
    !selectionKeyPattern.test(input.selectionKey)
  ) {
    return { status: "invalid", issue: "INVALID_SELECTION_KEY" };
  }
  if (
    !Number.isSafeInteger(input.expectedVersion) ||
    Number(input.expectedVersion) < 0
  ) {
    return { status: "invalid", issue: "INVALID_EXPECTED_VERSION" };
  }
  return Object.freeze({
    status: "ready" as const,
    payload: Object.freeze({
      selectionKey: input.selectionKey,
      expectedVersion: Number(input.expectedVersion),
    }),
  });
}

function mapFailure(code: string): TenantSelectionActionFailure {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED":
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "selection-required" };
    case "CONFLICT":
      return { status: "conflict" };
    case "RATE_LIMITED":
      return { status: "rate-limited" };
    case "DEPENDENCY_UNAVAILABLE":
      return { status: "temporarily-unavailable" };
    default:
      return { status: "server-error" };
  }
}

export function createRailwayTenantSelectionHandler(
  dependencies: Readonly<RailwayTenantSelectionHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function createContext(): Promise<ClientContextResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }
    const configuration = dependencies.inspectConfiguration();
    if (configuration.status !== "configured") {
      return { status: "configuration-required" };
    }
    let identity: RailwayApiServerIdentityState;
    try {
      identity = await dependencies.resolveIdentity();
    } catch {
      return { status: "server-error" };
    }
    if (identity.status === "unauthenticated") {
      return { status: "unauthenticated" };
    }
    if (identity.status !== "authenticated") {
      return { status: "server-error" };
    }
    try {
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
    async load(): Promise<LoadTenantSelectionActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION,
          requestKind: "query" as const,
          idempotencyKey: null,
          payload: Object.freeze({}),
        }));
        if (response.outcome !== "ok") return mapFailure(response.code);
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, ["directory"])
        ) {
          return { status: "server-error" };
        }
        const directory = parseRailwayTenantSelectionDirectory(
          response.data.directory,
        );
        return directory === null
          ? { status: "server-error" }
          : Object.freeze({ status: "ready" as const, directory });
      } catch {
        return { status: "server-error" };
      }
    },

    async select(input: unknown): Promise<SelectTenantActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      const parsed = parseSelectionInput(input);
      if (parsed.status === "invalid") {
        return { status: "validation-error", issue: parsed.issue };
      }
      let idempotencyKey: string;
      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
          parsed.payload,
        );
      } catch {
        return { status: "server-error" };
      }
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
          requestKind: "mutation" as const,
          idempotencyKey,
          payload: parsed.payload as RailwayApiJsonObject,
        }));
        if (response.outcome !== "ok") {
          if (response.code === "INVALID_REQUEST") {
            return { status: "server-error" };
          }
          return mapFailure(response.code);
        }
        const result = parseRailwayTenantSelectionSaveResult(response.data);
        return result === null
          ? { status: "server-error" }
          : Object.freeze({
              status: "selected" as const,
              version: result.version,
              unchanged: result.unchanged,
            });
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
