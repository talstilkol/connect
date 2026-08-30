import type {
  TeamInvitationAcceptanceActionResult,
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
  RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
} from "../platform/railwayTeamInvitationAcceptanceOperation.ts";
import {
  parseRailwayTeamInvitationAcceptanceResult,
} from "./railwayTeamInvitationAcceptanceResult.ts";
import {
  requireTeamInvitationKey,
} from "./teamInvitationValidation.ts";

export interface RailwayTeamInvitationAcceptanceHandlerDependencies {
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
      status: "configuration-required" | "sign-in-required" | "server-error";
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInput(value: unknown): RailwayApiJsonObject | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    !Object.hasOwn(value, "invitationKey")
  ) {
    return null;
  }

  try {
    return Object.freeze({
      invitationKey: requireTeamInvitationKey(value.invitationKey),
    });
  } catch {
    return null;
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwayTeamInvitationAcceptanceHandlerDependencies
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
    throw new Error("Railway invitation acceptance handler dependencies are invalid");
  }
}

function mapFailure(code: string): TeamInvitationAcceptanceActionResult {
  switch (code) {
    case "CONFIGURATION_REQUIRED":
      return { status: "configuration-required" };
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "sign-in-required" };
    case "IDENTITY_VERIFICATION_REQUIRED":
      return { status: "identity-verification-required" };
    case "INVITATION_UNAVAILABLE":
    case "NOT_FOUND":
    case "CONFLICT":
    case "INVALID_TRANSITION":
      return { status: "invitation-unavailable" };
    case "RATE_LIMITED":
    case "DEPENDENCY_UNAVAILABLE":
      return { status: "temporarily-unavailable" };
    default:
      return { status: "server-error" };
  }
}

export function createRailwayTeamInvitationAcceptanceHandler(
  dependencies: Readonly<
    RailwayTeamInvitationAcceptanceHandlerDependencies
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
      return { status: "sign-in-required" };
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
    async accept(input: unknown): Promise<TeamInvitationAcceptanceActionResult> {
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
          RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
          payload,
        );
      } catch {
        return { status: "server-error" };
      }

      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
          requestKind: "mutation" as const,
          idempotencyKey,
          payload,
        }));

        if (response.outcome !== "ok") {
          return mapFailure(response.code);
        }

        return parseRailwayTeamInvitationAcceptanceResult(response.data) ??
          { status: "server-error" };
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
