import type { MetaConnectionView } from "../../shared/domain/metaConnectionView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import { RAILWAY_API_CONTRACT_VERSION } from "../platform/railwayApiContract.ts";
import {
  parseRailwayMetaConnectionView,
  RAILWAY_META_CONNECTION_READ_OPERATION,
} from "./railwayMetaConnectionResult.ts";

export interface RailwayMetaConnectionReadHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () => RailwayApiClientConfigurationState;
  readonly resolveIdentity: () => Promise<RailwayApiServerIdentityState>;
  readonly createClient: (configuration: Readonly<{
    apiOrigin: string;
    deploymentEnvironment: "development" | "preview" | "production";
    oidcToken: string;
    userSessionToken: string;
  }>) => RailwayApiClient;
}

function remoteFailure(code: string): MetaConnectionView {
  switch (code) {
    case "CONFIGURATION_REQUIRED": return { status: "configuration-required" };
    case "TENANT_MEMBERSHIP_REQUIRED": return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED": return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED": return { status: "permission-denied" };
    default: return { status: "server-error" };
  }
}

export function createRailwayMetaConnectionReadHandler(
  dependencies: Readonly<RailwayMetaConnectionReadHandlerDependencies>,
) {
  return Object.freeze({
    async read(): Promise<MetaConnectionView> {
      try {
        if (!dependencies.applicationConfigured()) {
          return { status: "configuration-required" };
        }
        const configuration = dependencies.inspectConfiguration();
        if (configuration.status !== "configured") {
          return { status: "configuration-required" };
        }
        const identity = await dependencies.resolveIdentity();
        if (identity.status !== "authenticated") return { status: "server-error" };
        const client = dependencies.createClient({
          ...configuration.configuration,
          oidcToken: identity.oidcToken,
          userSessionToken: identity.userSessionToken,
        });
        const response = await client.call({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_META_CONNECTION_READ_OPERATION,
          requestKind: "query",
          idempotencyKey: null,
          payload: {},
        });
        if (response.outcome !== "ok") return remoteFailure(response.code);
        const data = response.data;
        if (
          typeof data !== "object" || data === null || Array.isArray(data) ||
          Object.keys(data).join(",") !== "connection" || !("connection" in data)
        ) return { status: "server-error" };
        return parseRailwayMetaConnectionView(data.connection) ?? { status: "server-error" };
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
