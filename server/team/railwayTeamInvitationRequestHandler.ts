import type {
  TeamInvitationActionFailureStatus,
  TeamInvitationActionResult,
} from "../../shared/domain/teamInvitationView.ts";
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
  RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
} from "../platform/railwayTeamInvitationRequestOperation.ts";
import {
  parseRailwayTeamInvitationRequestResult,
} from "./railwayTeamInvitationRequestResult.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationRole,
} from "./teamInvitationValidation.ts";

export interface RailwayTeamInvitationRequestHandlerDependencies {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInput(value: unknown): RailwayApiJsonObject | null {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== "email,role"
  ) {
    return null;
  }

  try {
    return Object.freeze({
      email: requireTeamInvitationEmail(value.email),
      role: requireTeamInvitationRole(value.role),
    });
  } catch {
    return null;
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwayTeamInvitationRequestHandlerDependencies
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
    throw new Error("Railway team invitation handler dependencies are invalid");
  }
}

function mapFailure(code: string): TeamInvitationActionFailureStatus {
  switch (code) {
    case "CONFIGURATION_REQUIRED":
      return "configuration-required";
    case "USER_AUTHENTICATION_REQUIRED":
      return "unauthenticated";
    case "TENANT_MEMBERSHIP_REQUIRED":
      return "onboarding-required";
    case "TENANT_SELECTION_REQUIRED":
      return "tenant-selection-required";
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return "permission-denied";
    case "CONFLICT":
      return "conflict";
    case "RATE_LIMITED":
      return "rate-limited";
    case "DEPENDENCY_UNAVAILABLE":
      return "temporarily-unavailable";
    default:
      return "server-error";
  }
}

export function createRailwayTeamInvitationRequestHandler(
  dependencies: Readonly<
    RailwayTeamInvitationRequestHandlerDependencies
  >,
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

  return Object.freeze({
    async invite(input: unknown): Promise<TeamInvitationActionResult> {
      const payload = parseInput(input);

      if (payload === null) {
        return { status: "invalid-input" };
      }

      const context = await createContext();

      if (context.status !== "ready") {
        return context;
      }

      let idempotencyKey: string;

      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
          payload,
        );
      } catch {
        return { status: "server-error" };
      }

      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
          requestKind: "mutation" as const,
          idempotencyKey,
          payload,
        }));

        if (response.outcome !== "ok") {
          return { status: mapFailure(response.code) };
        }

        return parseRailwayTeamInvitationRequestResult(response.data) ??
          { status: "server-error" };
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
