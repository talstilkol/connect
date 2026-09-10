import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_TEAM_DIRECTORY_OPERATION,
} from "../platform/railwayTeamDirectoryOperation.ts";
import type {
  CurrentTeamDirectoryResult,
} from "./currentTeamDirectory.ts";
import {
  parseRailwayTeamDirectory,
} from "./railwayTeamDirectoryResult.ts";

export interface RailwayTeamDirectoryHandlerDependencies {
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

const emptyDirectory = Object.freeze({
  identityStatus: "unavailable" as const,
  members: [] as const,
});

function requireDependencies(
  dependencies: Readonly<RailwayTeamDirectoryHandlerDependencies>,
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
    throw new Error("Railway team directory handler dependencies are invalid");
  }
}

function failure(
  status: Exclude<CurrentTeamDirectoryResult["status"], "ready">,
): CurrentTeamDirectoryResult {
  return Object.freeze({ status, directory: emptyDirectory });
}

function mapFailure(code: string): CurrentTeamDirectoryResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return failure("unauthenticated");
    case "TENANT_MEMBERSHIP_REQUIRED":
      return failure("onboarding-required");
    case "TENANT_SELECTION_REQUIRED":
      return failure("tenant-selection-required");
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return failure("permission-denied");
    default:
      return failure("server-error");
  }
}

export function createRailwayTeamDirectoryHandler(
  dependencies: Readonly<RailwayTeamDirectoryHandlerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async read(): Promise<CurrentTeamDirectoryResult> {
      if (!dependencies.applicationConfigured()) {
        return failure("configuration-required");
      }
      const configuration = dependencies.inspectConfiguration();
      if (configuration.status !== "configured") {
        return failure("configuration-required");
      }
      let identity: RailwayApiServerIdentityState;
      try {
        identity = await dependencies.resolveIdentity();
      } catch {
        return failure("server-error");
      }
      if (identity.status === "unauthenticated") {
        return failure("unauthenticated");
      }
      if (identity.status !== "authenticated") {
        return failure("server-error");
      }

      try {
        const client = dependencies.createClient({
          ...configuration.configuration,
          oidcToken: identity.oidcToken,
          userSessionToken: identity.userSessionToken,
        });
        const response = await client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_TEAM_DIRECTORY_OPERATION,
          requestKind: "query" as const,
          idempotencyKey: null,
          payload: Object.freeze({}),
        }));
        if (response.outcome !== "ok") return mapFailure(response.code);
        if (
          typeof response.data !== "object" ||
          response.data === null ||
          Array.isArray(response.data) ||
          Object.keys(response.data).join(",") !== "directory"
        ) {
          return failure("server-error");
        }
        const directory = parseRailwayTeamDirectory(
          (response.data as Readonly<Record<string, unknown>>).directory,
        );
        return directory === null
          ? failure("server-error")
          : Object.freeze({ status: "ready" as const, directory });
      } catch {
        return failure("server-error");
      }
    },
  });
}
