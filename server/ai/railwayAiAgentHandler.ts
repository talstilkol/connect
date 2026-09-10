import type {
  AiAgentDirectoryStatus,
  AiAgentDirectoryView,
} from "../../shared/domain/aiAgentView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from
  "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  normalizeRailwayApiJson,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from
  "../platform/railwayApiMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from
  "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_AI_AGENT_DRAFT_OPERATION,
  RAILWAY_AI_AGENT_PUBLISH_OPERATION,
  parseRailwayAiAgentMutationState,
  type RailwayAiAgentMutationOperation,
} from "../platform/railwayAiAgentMutationExecutor.ts";
import type {
  AiAgentActionFailure,
  LoadAiAgentDetailsActionResult,
  PublishAiAgentDraftActionResult,
  SaveAiAgentDraftActionResult,
} from "./aiAgentActionResult.ts";
import {
  AiAgentInputError,
  parseAiAgentKey,
  parseAiAgentPublishDraftRequest,
  parseAiAgentSaveDraftRequest,
} from "./aiAgentService.ts";
import {
  parseRailwayAiAgentActivationIssues,
  parseRailwayAiAgentDetails,
  parseRailwayAiAgentList,
  parseRailwayKnowledgeSourceList,
} from "./railwayAiAgentResult.ts";

export interface RailwayAiAgentHandlerDependencies {
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

export type RailwayCurrentAiAgentsResult =
  | Readonly<{ status: "ready"; aiAgents: AiAgentDirectoryView }>
  | Readonly<{
      status: Exclude<AiAgentDirectoryStatus, "ready">;
      aiAgents: Readonly<{
        agents: readonly [];
        selectedAgent: null;
        knowledgeSources: readonly [];
        canWrite: false;
      }>;
    }>;

type Context =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

const emptyDirectory = Object.freeze({
  agents: [] as const,
  selectedAgent: null,
  knowledgeSources: [] as const,
  canWrite: false as const,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length &&
    actual.every((key, index) => key === sorted[index]);
}

function requireDependencies(
  dependencies: Readonly<RailwayAiAgentHandlerDependencies>,
) {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error("Railway AI agent dependencies are invalid");
  }
}

function mapFailure(code: string): AiAgentActionFailure {
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

export function createRailwayAiAgentHandler(
  dependencies: Readonly<RailwayAiAgentHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function context(): Promise<Context> {
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

  async function loadDetailsWithClient(
    client: RailwayApiClient,
    aiAgentKey: string,
  ): Promise<LoadAiAgentDetailsActionResult> {
    try {
      const response = await client.call(queryRequest(
        "ai.agents.details.read",
        Object.freeze({ aiAgentKey }),
      ));
      if (response.outcome !== "ok") return mapFailure(response.code);
      if (!isRecord(response.data) || !hasExactKeys(response.data, ["aiAgent"])) {
        return { status: "server-error" };
      }
      const aiAgent = parseRailwayAiAgentDetails(
        response.data.aiAgent,
        aiAgentKey,
      );
      return aiAgent === null
        ? { status: "server-error" }
        : Object.freeze({ status: "loaded" as const, aiAgent });
    } catch {
      return { status: "server-error" };
    }
  }

  async function mutate(
    client: RailwayApiClient,
    operation: RailwayAiAgentMutationOperation,
    payload: RailwayApiJsonObject,
  ): Promise<Readonly<Record<string, unknown>> | AiAgentActionFailure> {
    let idempotencyKey: string;
    try {
      idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        payload,
      );
    } catch {
      return { status: "server-error" };
    }
    try {
      const response = await client.call(Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        requestKind: "mutation" as const,
        idempotencyKey,
        payload,
      }));
      if (response.outcome !== "ok") return mapFailure(response.code);
      return isRecord(response.data)
        ? response.data
        : { status: "server-error" };
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    async readCurrent(): Promise<RailwayCurrentAiAgentsResult> {
      const current = await context();
      if (current.status !== "ready") {
        return { status: current.status, aiAgents: emptyDirectory };
      }
      try {
        const response = await current.client.call(queryRequest(
          "ai.agents.directory.read",
          Object.freeze({}),
        ));
        if (response.outcome !== "ok") {
          const failure = mapFailure(response.code);
          const status = [
            "unauthenticated", "onboarding-required",
            "tenant-selection-required", "permission-denied",
          ].includes(failure.status)
            ? failure.status as Exclude<AiAgentDirectoryStatus, "ready">
            : "server-error";
          return { status, aiAgents: emptyDirectory };
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, ["agents", "canWrite", "knowledgeSources"]) ||
          typeof response.data.canWrite !== "boolean"
        ) {
          return { status: "server-error", aiAgents: emptyDirectory };
        }
        const agents = parseRailwayAiAgentList(response.data.agents);
        const knowledgeSources = parseRailwayKnowledgeSourceList(
          response.data.knowledgeSources,
        );
        if (agents === null || knowledgeSources === null) {
          return { status: "server-error", aiAgents: emptyDirectory };
        }
        const first = agents[0] ?? null;
        const selected = first === null
          ? null
          : await loadDetailsWithClient(current.client, first.aiAgentKey);
        if (selected !== null && selected.status !== "loaded") {
          return { status: "server-error", aiAgents: emptyDirectory };
        }
        return Object.freeze({
          status: "ready" as const,
          aiAgents: Object.freeze({
            agents,
            selectedAgent: selected?.aiAgent ?? null,
            knowledgeSources,
            canWrite: response.data.canWrite,
          }),
        });
      } catch {
        return { status: "server-error", aiAgents: emptyDirectory };
      }
    },

    async loadDetails(input: unknown): Promise<LoadAiAgentDetailsActionResult> {
      const current = await context();
      if (current.status !== "ready") return current;
      const aiAgentKey = parseAiAgentKey(input);
      return aiAgentKey === null
        ? { status: "invalid-input" }
        : loadDetailsWithClient(current.client, aiAgentKey);
    },

    async saveDraft(input: unknown): Promise<SaveAiAgentDraftActionResult> {
      let parsed;
      try {
        parsed = parseAiAgentSaveDraftRequest(input);
      } catch (error) {
        return error instanceof AiAgentInputError
          ? { status: "validation-error", issues: error.issues }
          : { status: "invalid-input" };
      }
      let payload: RailwayApiJsonObject;
      try {
        const normalized = normalizeRailwayApiJson(parsed);
        if (!isRecord(normalized)) return { status: "invalid-input" };
        payload = normalized;
      } catch {
        return { status: "invalid-input" };
      }
      const current = await context();
      if (current.status !== "ready") return current;
      const response = await mutate(
        current.client,
        RAILWAY_AI_AGENT_DRAFT_OPERATION,
        payload,
      );
      if ("status" in response) return response as AiAgentActionFailure;
      if (!hasExactKeys(response, ["agent", "draftVersion", "outcome", "replayed"]) ||
        typeof response.replayed !== "boolean") {
        return { status: "server-error" };
      }
      const state = parseRailwayAiAgentMutationState(
        RAILWAY_AI_AGENT_DRAFT_OPERATION,
        parsed,
        {
          outcome: response.outcome,
          agent: response.agent,
          draftVersion: response.draftVersion,
        },
      );
      return state === null || !("draftVersion" in state)
        ? { status: "server-error" }
        : Object.freeze({ status: "saved" as const, ...state });
    },

    async publishDraft(input: unknown): Promise<PublishAiAgentDraftActionResult> {
      const parsed = parseAiAgentPublishDraftRequest(input);
      if (parsed === null) return { status: "invalid-input" };
      let payload: RailwayApiJsonObject;
      try {
        const normalized = normalizeRailwayApiJson(parsed);
        if (!isRecord(normalized)) return { status: "invalid-input" };
        payload = normalized;
      } catch {
        return { status: "invalid-input" };
      }
      const current = await context();
      if (current.status !== "ready") return current;
      const response = await mutate(
        current.client,
        RAILWAY_AI_AGENT_PUBLISH_OPERATION,
        payload,
      );
      if ("status" in response) return response as AiAgentActionFailure;
      if (
        hasExactKeys(response, ["issues", "outcome", "replayed"]) &&
        response.outcome === "activation-blocked" && response.replayed === false
      ) {
        const issues = parseRailwayAiAgentActivationIssues(response.issues);
        return issues === null
          ? { status: "server-error" }
          : { status: "activation-blocked", issues };
      }
      if (!hasExactKeys(response, ["agent", "outcome", "publishedVersion", "replayed"]) ||
        typeof response.replayed !== "boolean") {
        return { status: "server-error" };
      }
      const state = parseRailwayAiAgentMutationState(
        RAILWAY_AI_AGENT_PUBLISH_OPERATION,
        parsed,
        {
          outcome: response.outcome,
          agent: response.agent,
          publishedVersion: response.publishedVersion,
        },
      );
      return state === null || !("publishedVersion" in state)
        ? { status: "server-error" }
        : Object.freeze({ status: "published" as const, ...state });
    },
  });
}
