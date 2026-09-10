import type {
  BotFlowDirectoryStatus,
  BotFlowDirectoryView,
} from "../../shared/domain/botFlowView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  normalizeRailwayApiJson,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import type {
  BotFlowActionFailure,
  LoadBotFlowDetailsActionResult,
  PublishBotFlowDraftActionResult,
  SaveBotFlowDraftActionResult,
} from "./botFlowActionResult.ts";
import {
  parseBotFlowKey,
  parseBotFlowPublishDraftRequest,
} from "./botFlowService.ts";
import {
  parseRailwayBotFlowDraftMutationResponse,
  parseRailwayBotFlowDetails,
  parseRailwayBotFlowList,
  parseRailwayBotFlowPublishMutationResponse,
} from "./railwayBotFlowResult.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import {
  RAILWAY_BOT_FLOW_DRAFT_OPERATION,
  RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
  type RailwayBotFlowMutationOperation,
} from "../platform/railwayBotFlowMutationExecutor.ts";

export interface RailwayBotFlowHandlerDependencies {
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

export type RailwayCurrentBotFlowsResult =
  | Readonly<{ status: "ready"; botFlows: BotFlowDirectoryView }>
  | Readonly<{
      status: Exclude<BotFlowDirectoryStatus, "ready">;
      botFlows: Readonly<{
        flows: readonly [];
        selectedFlow: null;
        canWrite: false;
      }>;
    }>;

type ClientContextResult =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

const emptyBotFlows = Object.freeze({
  flows: [] as const,
  selectedFlow: null,
  canWrite: false as const,
});

function requireDependencies(
  dependencies: Readonly<RailwayBotFlowHandlerDependencies>,
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
    throw new Error("Railway bot flow dependencies are invalid");
  }
}

function mapFailure(code: string): BotFlowActionFailure {
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
    case "NOT_FOUND":
      return { status: "not-found" };
    case "CONFLICT":
      return { status: "state-conflict" };
    case "INVALID_TRANSITION":
      return { status: "invalid-state" };
    default:
      return { status: "server-error" };
  }
}

function queryRequest(
  operation: string,
  payload: RailwayApiJsonObject,
): Readonly<RailwayApiRequestEnvelope> {
  return Object.freeze({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation,
    requestKind: "query",
    idempotencyKey: null,
    payload,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function normalizeMutationPayload(
  input: unknown,
): RailwayApiJsonObject | null {
  try {
    const normalized = normalizeRailwayApiJson(input);
    return isRecord(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function createRailwayBotFlowHandler(
  dependencies: Readonly<RailwayBotFlowHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function createContext(): Promise<ClientContextResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }
    const configurationState = dependencies.inspectConfiguration();
    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
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

    try {
      return Object.freeze({
        status: "ready" as const,
        client: dependencies.createClient({
          ...configurationState.configuration,
          oidcToken: identityState.oidcToken,
          userSessionToken: identityState.userSessionToken,
        }),
      });
    } catch {
      return { status: "server-error" };
    }
  }

  async function loadDetails(
    client: RailwayApiClient,
    botFlowKey: string,
  ): Promise<LoadBotFlowDetailsActionResult> {
    try {
      const response = await client.call(queryRequest(
        "bot.flows.details.read",
        Object.freeze({ botFlowKey }),
      ));
      if (response.outcome !== "ok") {
        return mapFailure(response.code);
      }
      if (
        !isRecord(response.data) ||
        !hasExactKeys(response.data, ["botFlow"])
      ) {
        return { status: "server-error" };
      }
      const botFlow = parseRailwayBotFlowDetails(
        response.data.botFlow,
        botFlowKey,
      );
      return botFlow === null
        ? { status: "server-error" }
        : Object.freeze({ status: "loaded" as const, botFlow });
    } catch {
      return { status: "server-error" };
    }
  }

  async function executeMutation(
    client: RailwayApiClient,
    operation: RailwayBotFlowMutationOperation,
    payload: RailwayApiJsonObject,
  ): Promise<
    | Readonly<{ kind: "data"; data: Readonly<RailwayApiJsonObject> }>
    | Readonly<{ kind: "failure"; failure: BotFlowActionFailure }>
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
    async readCurrent(): Promise<RailwayCurrentBotFlowsResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return { status: context.status, botFlows: emptyBotFlows };
      }

      try {
        const response = await context.client.call(queryRequest(
          "bot.flows.list",
          Object.freeze({}),
        ));
        if (response.outcome !== "ok") {
          const failure = mapFailure(response.code);
          const status = failure.status === "unauthenticated" ||
            failure.status === "onboarding-required" ||
            failure.status === "tenant-selection-required" ||
            failure.status === "permission-denied"
            ? failure.status
            : "server-error";
          return { status, botFlows: emptyBotFlows };
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, ["canWrite", "flows"]) ||
          typeof response.data.canWrite !== "boolean"
        ) {
          return { status: "server-error", botFlows: emptyBotFlows };
        }
        const flows = parseRailwayBotFlowList(response.data.flows);
        if (flows === null) {
          return { status: "server-error", botFlows: emptyBotFlows };
        }

        const selected = flows[0] ?? null;
        const selectedResult = selected === null
          ? null
          : await loadDetails(context.client, selected.botFlowKey);
        if (selectedResult !== null && selectedResult.status !== "loaded") {
          return { status: "server-error", botFlows: emptyBotFlows };
        }

        return Object.freeze({
          status: "ready" as const,
          botFlows: Object.freeze({
            flows,
            selectedFlow: selectedResult?.botFlow ?? null,
            canWrite: response.data.canWrite,
          }),
        });
      } catch {
        return { status: "server-error", botFlows: emptyBotFlows };
      }
    },

    async loadDetails(
      botFlowKeyInput: unknown,
    ): Promise<LoadBotFlowDetailsActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const botFlowKey = parseBotFlowKey(botFlowKeyInput);
      if (botFlowKey === null) {
        return { status: "invalid-input" };
      }
      return loadDetails(context.client, botFlowKey);
    },

    async saveDraft(
      input: unknown,
    ): Promise<SaveBotFlowDraftActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const payload = normalizeMutationPayload(input);
      if (payload === null) {
        return { status: "invalid-input" };
      }
      const response = await executeMutation(
        context.client,
        RAILWAY_BOT_FLOW_DRAFT_OPERATION,
        payload,
      );
      if (response.kind === "failure") {
        return response.failure;
      }
      const parsed = parseRailwayBotFlowDraftMutationResponse(response.data);
      return parsed === null
        ? { status: "server-error" }
        : Object.freeze({
            status: "saved" as const,
            outcome: parsed.outcome,
            flow: parsed.flow,
            draftVersion: parsed.draftVersion,
          });
    },

    async publishDraft(
      input: unknown,
    ): Promise<PublishBotFlowDraftActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      const parsedInput = parseBotFlowPublishDraftRequest(input);
      if (parsedInput === null) {
        return { status: "invalid-input" };
      }
      const payload = normalizeMutationPayload(parsedInput);
      if (payload === null) {
        return { status: "server-error" };
      }
      const response = await executeMutation(
        context.client,
        RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
        payload,
      );
      if (response.kind === "failure") {
        return response.failure;
      }
      const parsed = parseRailwayBotFlowPublishMutationResponse(
        response.data,
        parsedInput.botFlowKey,
        parsedInput.botFlowVersionKey,
      );
      return parsed === null
        ? { status: "server-error" }
        : Object.freeze({
            status: "published" as const,
            outcome: parsed.outcome,
            flow: parsed.flow,
            publishedVersion: parsed.publishedVersion,
          });
    },
  });
}
