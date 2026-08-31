import type {
  TeamMembershipActionFailureStatus,
  TeamMembershipActionResult,
  TeamOwnerTransferActionResult,
} from "../../shared/domain/teamMembershipMutationView.ts";
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
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_TEAM_MEMBER_ROLE_OPERATION,
  RAILWAY_TEAM_MEMBER_STATUS_OPERATION,
  RAILWAY_TEAM_OWNER_TRANSFER_OPERATION,
} from "../platform/railwayTeamMembershipOperations.ts";
import {
  parseRailwayTeamMembershipResult,
  parseRailwayTeamOwnerTransferResult,
} from "./railwayTeamMembershipResult.ts";
import {
  requireFormerOwnerRole,
  requireTeamMemberKey,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
} from "./teamMembershipValidation.ts";

export interface RailwayTeamMembershipHandlerDependencies {
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

type ClientContext =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

type ParsedMutation = Readonly<{
  operation:
    | typeof RAILWAY_TEAM_MEMBER_ROLE_OPERATION
    | typeof RAILWAY_TEAM_MEMBER_STATUS_OPERATION
    | typeof RAILWAY_TEAM_OWNER_TRANSFER_OPERATION;
  payload: RailwayApiJsonObject;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function requireDependencies(
  dependencies: Readonly<RailwayTeamMembershipHandlerDependencies>,
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
    throw new Error("Railway team membership handler dependencies are invalid");
  }
}

function parseNonOwnerRole(value: unknown): string {
  const role = requireTeamRole(value);
  if (role === "owner") throw new Error("Owner role requires transfer");
  return role;
}

function parseMutation(
  operation: ParsedMutation["operation"],
  input: unknown,
): ParsedMutation | null {
  if (!isRecord(input)) return null;
  try {
    if (operation === RAILWAY_TEAM_MEMBER_ROLE_OPERATION) {
      if (!hasExactKeys(input, ["expectedVersion", "memberKey", "role"])) {
        return null;
      }
      return Object.freeze({
        operation,
        payload: Object.freeze({
          memberKey: requireTeamMemberKey(input.memberKey),
          expectedVersion: requireTeamMembershipVersion(input.expectedVersion),
          role: parseNonOwnerRole(input.role),
        }),
      });
    }
    if (operation === RAILWAY_TEAM_MEMBER_STATUS_OPERATION) {
      if (!hasExactKeys(input, ["expectedVersion", "memberKey", "status"])) {
        return null;
      }
      return Object.freeze({
        operation,
        payload: Object.freeze({
          memberKey: requireTeamMemberKey(input.memberKey),
          expectedVersion: requireTeamMembershipVersion(input.expectedVersion),
          status: requireTeamMembershipStatus(input.status),
        }),
      });
    }
    if (!hasExactKeys(input, [
      "formerOwnerExpectedVersion",
      "formerOwnerRole",
      "newOwnerExpectedVersion",
      "newOwnerMemberKey",
    ])) {
      return null;
    }
    return Object.freeze({
      operation,
      payload: Object.freeze({
        newOwnerMemberKey: requireTeamMemberKey(input.newOwnerMemberKey),
        formerOwnerExpectedVersion: requireTeamMembershipVersion(
          input.formerOwnerExpectedVersion,
        ),
        newOwnerExpectedVersion: requireTeamMembershipVersion(
          input.newOwnerExpectedVersion,
        ),
        formerOwnerRole: requireFormerOwnerRole(input.formerOwnerRole),
      }),
    });
  } catch {
    return null;
  }
}

function mapFailure(code: string): TeamMembershipActionFailureStatus {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return "unauthenticated";
    case "TENANT_MEMBERSHIP_REQUIRED":
      return "onboarding-required";
    case "TENANT_SELECTION_REQUIRED":
      return "tenant-selection-required";
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return "permission-denied";
    case "NOT_FOUND":
      return "not-found";
    case "CONFLICT":
      return "conflict";
    case "INVALID_TRANSITION":
      return "invalid-transition";
    case "STALE_SESSION":
      return "stale-session";
    case "RATE_LIMITED":
      return "rate-limited";
    case "DEPENDENCY_UNAVAILABLE":
      return "temporarily-unavailable";
    default:
      return "server-error";
  }
}

export function createRailwayTeamMembershipHandler(
  dependencies: Readonly<RailwayTeamMembershipHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function createContext(): Promise<ClientContext> {
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

  async function call(
    operation: ParsedMutation["operation"],
    input: unknown,
  ): Promise<TeamMembershipActionResult | TeamOwnerTransferActionResult> {
    const parsed = parseMutation(operation, input);
    if (parsed === null) return { status: "invalid-input" };
    const context = await createContext();
    if (context.status !== "ready") return context;
    let idempotencyKey: string;
    try {
      idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        parsed.payload,
      );
    } catch {
      return { status: "server-error" };
    }
    try {
      const response = await context.client.call(Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind: "mutation" as const,
        idempotencyKey,
        payload: parsed.payload,
      }));
      if (response.outcome !== "ok") {
        return { status: mapFailure(response.code) };
      }
      const result = operation === RAILWAY_TEAM_OWNER_TRANSFER_OPERATION
        ? parseRailwayTeamOwnerTransferResult(response.data)
        : parseRailwayTeamMembershipResult(response.data);
      if (result === null) return { status: "server-error" };
      if (operation === RAILWAY_TEAM_OWNER_TRANSFER_OPERATION) {
        const payload = parsed.payload as Readonly<{
          newOwnerMemberKey: string;
          formerOwnerExpectedVersion: number;
          newOwnerExpectedVersion: number;
          formerOwnerRole: string;
        }>;
        if (
          !("newOwner" in result) ||
          result.newOwner.memberKey !== payload.newOwnerMemberKey ||
          result.newOwner.version < payload.newOwnerExpectedVersion ||
          result.newOwner.version > payload.newOwnerExpectedVersion + 1 ||
          result.formerOwner.version < payload.formerOwnerExpectedVersion ||
          result.formerOwner.version > payload.formerOwnerExpectedVersion + 1 ||
          result.formerOwner.role !== payload.formerOwnerRole
        ) {
          return { status: "server-error" };
        }
        return result;
      }
      const payload = parsed.payload as Readonly<{
        memberKey: string;
        expectedVersion: number;
        role?: string;
        status?: string;
      }>;
      if (
        !("membership" in result) ||
        result.membership.memberKey !== payload.memberKey ||
        result.membership.version < payload.expectedVersion ||
        result.membership.version > payload.expectedVersion + 1 ||
        (operation === RAILWAY_TEAM_MEMBER_ROLE_OPERATION &&
          result.membership.role !== payload.role) ||
        (operation === RAILWAY_TEAM_MEMBER_STATUS_OPERATION &&
          result.membership.status !== payload.status)
      ) {
        return { status: "server-error" };
      }
      return result;
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    changeRole(input: unknown): Promise<TeamMembershipActionResult> {
      return call(RAILWAY_TEAM_MEMBER_ROLE_OPERATION, input) as
        Promise<TeamMembershipActionResult>;
    },
    changeStatus(input: unknown): Promise<TeamMembershipActionResult> {
      return call(RAILWAY_TEAM_MEMBER_STATUS_OPERATION, input) as
        Promise<TeamMembershipActionResult>;
    },
    transferOwner(input: unknown): Promise<TeamOwnerTransferActionResult> {
      return call(RAILWAY_TEAM_OWNER_TRANSFER_OPERATION, input) as
        Promise<TeamOwnerTransferActionResult>;
    },
  });
}
