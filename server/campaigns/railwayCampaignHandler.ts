import type {
  CampaignAudienceOptionsView,
  CampaignDeliveryReadinessStatus,
  CampaignDirectoryStatus,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  normalizeRailwayApiJson,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
  RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
  type RailwayCampaignMutationOperation,
} from "../platform/railwayCampaignMutationExecutor.ts";
import type {
  ActivateCampaignActionResult,
  CampaignActionFailure,
  SaveCampaignSnapshotActionResult,
} from "./campaignActionResult.ts";
import {
  parseActivateCampaignRequest,
} from "./campaignActivationService.ts";
import {
  parseRailwayCampaignActivationView,
  parseRailwayCampaignAudienceOptions,
  parseRailwayCampaignList,
  parseRailwayCampaignTemplateOptions,
  parseRailwayCampaignView,
} from "./railwayCampaignResult.ts";
import {
  parseCampaignSnapshotRequest,
} from "./campaignSnapshotService.ts";

export interface RailwayCampaignHandlerDependencies {
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

export type RailwayCurrentCampaignsResult =
  | Readonly<{
      status: "ready";
      campaigns: readonly CampaignView[];
      templates: readonly CampaignTemplateOptionView[];
      audiences: CampaignAudienceOptionsView;
      canWrite: boolean;
      deliveryStatus: CampaignDeliveryReadinessStatus;
    }>
  | Readonly<{
      status: Exclude<CampaignDirectoryStatus, "ready">;
      campaigns: readonly [];
      templates: readonly [];
      audiences: Readonly<{ lists: readonly []; tags: readonly [] }>;
      canWrite: false;
      deliveryStatus: "configuration-required";
    }>;

type ClientContextResult =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

const emptyDirectory = Object.freeze({
  campaigns: [] as const,
  templates: [] as const,
  audiences: Object.freeze({ lists: [] as const, tags: [] as const }),
  canWrite: false as const,
  deliveryStatus: "configuration-required" as const,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function requireDependencies(
  dependencies: Readonly<RailwayCampaignHandlerDependencies>,
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
    throw new Error("Railway campaign dependencies are invalid");
  }
}

function mapFailure(code: string): CampaignActionFailure | { status: "invalid-input" | "state-conflict" } {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    case "CONFLICT":
      return { status: "state-conflict" };
    default:
      return { status: "server-error" };
  }
}

function queryRequest(): Readonly<RailwayApiRequestEnvelope> {
  return Object.freeze({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: "campaigns.directory.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: Object.freeze({}),
  });
}

function normalizeMutationPayload(input: unknown): RailwayApiJsonObject | null {
  try {
    const normalized = normalizeRailwayApiJson(input);
    return isRecord(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function createRailwayCampaignHandler(
  dependencies: Readonly<RailwayCampaignHandlerDependencies>,
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

  async function executeMutation(
    client: RailwayApiClient,
    operation: RailwayCampaignMutationOperation,
    payload: RailwayApiJsonObject,
  ): Promise<
    | Readonly<{ kind: "data"; data: Readonly<RailwayApiJsonObject> }>
    | Readonly<{ kind: "failure"; failure: ReturnType<typeof mapFailure> }>
  > {
    let idempotencyKey: string;
    try {
      idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        payload,
      );
    } catch {
      return { kind: "failure", failure: { status: "server-error" } };
    }
    try {
      const response = await client.call(Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind: "mutation" as const,
        idempotencyKey,
        payload,
      }));
      if (response.outcome !== "ok") {
        return { kind: "failure", failure: mapFailure(response.code) };
      }
      return isRecord(response.data)
        ? { kind: "data", data: response.data }
        : { kind: "failure", failure: { status: "server-error" } };
    } catch {
      return { kind: "failure", failure: { status: "server-error" } };
    }
  }

  return Object.freeze({
    async readCurrent(): Promise<RailwayCurrentCampaignsResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return {
          status: context.status === "unauthenticated"
            ? "server-error"
            : context.status,
          ...emptyDirectory,
        };
      }
      try {
        const response = await context.client.call(queryRequest());
        if (response.outcome !== "ok") {
          const failure = mapFailure(response.code);
          const status = failure.status === "onboarding-required" ||
            failure.status === "tenant-selection-required" ||
            failure.status === "permission-denied"
            ? failure.status
            : "server-error";
          return { status, ...emptyDirectory };
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, [
            "audiences",
            "campaigns",
            "canWrite",
            "deliveryStatus",
            "templates",
          ]) ||
          typeof response.data.canWrite !== "boolean" ||
          (response.data.deliveryStatus !== "ready" &&
            response.data.deliveryStatus !== "configuration-required")
        ) {
          return { status: "server-error", ...emptyDirectory };
        }
        const campaigns = parseRailwayCampaignList(response.data.campaigns);
        const templates = parseRailwayCampaignTemplateOptions(
          response.data.templates,
        );
        const audiences = parseRailwayCampaignAudienceOptions(
          response.data.audiences,
        );
        if (campaigns === null || templates === null || audiences === null) {
          return { status: "server-error", ...emptyDirectory };
        }
        return Object.freeze({
          status: "ready" as const,
          campaigns,
          templates,
          audiences,
          canWrite: response.data.canWrite,
          deliveryStatus: response.data.deliveryStatus,
        });
      } catch {
        return { status: "server-error", ...emptyDirectory };
      }
    },

    async saveSnapshot(input: unknown): Promise<SaveCampaignSnapshotActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const payload = normalizeMutationPayload(input);
      if (payload === null || parseCampaignSnapshotRequest(payload) === null) {
        return { status: "invalid-input" };
      }
      const result = await executeMutation(
        context.client,
        RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
        payload,
      );
      if (result.kind === "failure") {
        if (result.failure.status === "state-conflict") {
          return { status: "server-error" };
        }
        if (result.failure.status === "invalid-input") {
          return { status: "invalid-input" };
        }
        return { status: result.failure.status };
      }
      if (
        hasExactKeys(result.data, ["outcome", "replayed"]) &&
        result.data.replayed === false
      ) {
        if (result.data.outcome === "profile-required") {
          return { status: "profile-required" };
        }
        if (result.data.outcome === "template-unavailable") {
          return { status: "template-unavailable" };
        }
        if (result.data.outcome === "audience-invalid") {
          return { status: "audience-invalid" };
        }
        return { status: "server-error" };
      }
      if (
        !hasExactKeys(result.data, ["campaign", "outcome", "replayed"]) ||
        result.data.outcome !== "saved" ||
        typeof result.data.replayed !== "boolean"
      ) {
        return { status: "server-error" };
      }
      const campaign = parseRailwayCampaignView(result.data.campaign);
      return campaign === null
        ? { status: "server-error" }
        : Object.freeze({ status: "saved" as const, campaign });
    },

    async activate(input: unknown): Promise<ActivateCampaignActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const payload = normalizeMutationPayload(input);
      if (payload === null || parseActivateCampaignRequest(payload) === null) {
        return { status: "invalid-input" };
      }
      const result = await executeMutation(
        context.client,
        RAILWAY_CAMPAIGN_ACTIVATE_OPERATION,
        payload,
      );
      if (result.kind === "failure") {
        return result.failure.status === "state-conflict"
          ? { status: "state-conflict" }
          : result.failure;
      }
      if (
        hasExactKeys(result.data, ["outcome", "replayed"]) &&
        result.data.replayed === false &&
        result.data.outcome === "delivery-configuration-required"
      ) {
        return { status: "delivery-configuration-required" };
      }
      if (
        !hasExactKeys(result.data, ["campaign", "outcome", "replayed"]) ||
        result.data.outcome !== "activated" ||
        typeof result.data.replayed !== "boolean"
      ) {
        return { status: "server-error" };
      }
      const campaign = parseRailwayCampaignActivationView(
        result.data.campaign,
      );
      return campaign === null
        ? { status: "server-error" }
        : Object.freeze({ status: "activated" as const, campaign });
    },
  });
}
