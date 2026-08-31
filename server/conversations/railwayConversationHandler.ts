import {
  defaultInboxFilters,
  type InboxDirectoryStatus,
  type InboxFilters,
  type InboxView,
} from "../../shared/domain/conversationView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";
import {
  parseRailwayConversationMutationState,
  type RailwayConversationMutationOperation,
} from "../platform/railwayConversationMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import type {
  ChangeConversationAssignmentActionResult,
  ConversationActionFailure,
  LoadConversationThreadActionResult,
  MarkConversationReadActionResult,
  RefreshInboxActionResult,
} from "./conversationActionResult.ts";
import {
  parseChangeAssignmentRequest,
  parseConversationKey,
  parseMarkReadRequest,
  parseRefreshRequest,
} from "./conversationService.ts";
import {
  parseRailwayConversationList,
  parseRailwayConversationThread,
} from "./railwayConversationResult.ts";

export interface RailwayConversationHandlerDependencies {
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

export type RailwayCurrentInboxResult =
  | Readonly<{ status: "ready"; inbox: InboxView }>
  | Readonly<{
      status: Exclude<InboxDirectoryStatus, "ready">;
      inbox: Readonly<{
        conversations: readonly [];
        selectedThread: null;
        canReply: false;
        filters: InboxFilters;
      }>;
    }>;

type ClientContextResult =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

const emptyInbox = Object.freeze({
  conversations: [] as const,
  selectedThread: null,
  canReply: false as const,
  filters: Object.freeze({ ...defaultInboxFilters }),
});

function requireDependencies(
  dependencies: Readonly<RailwayConversationHandlerDependencies>,
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
    throw new Error("Railway conversation dependencies are invalid");
  }
}

function mapFailure(
  code: string,
  conflictStatus: "state-conflict" | "assignment-conflict" = "state-conflict",
): ConversationActionFailure {
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
      return { status: conflictStatus };
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

export function createRailwayConversationHandler(
  dependencies: Readonly<RailwayConversationHandlerDependencies>,
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

  async function readInbox(
    client: RailwayApiClient,
    filters: Readonly<InboxFilters>,
    selectedConversationKey: string | null,
  ): Promise<RefreshInboxActionResult> {
    try {
      const listResponse = await client.call(queryRequest(
        "conversations.list",
        Object.freeze({ ...filters }) as RailwayApiJsonObject,
      ));
      if (listResponse.outcome !== "ok") {
        return mapFailure(listResponse.code);
      }
      if (
        !isRecord(listResponse.data) ||
        !hasExactKeys(listResponse.data, ["canReply", "conversations"]) ||
        typeof listResponse.data.canReply !== "boolean"
      ) {
        return { status: "server-error" };
      }

      const conversations = parseRailwayConversationList(
        listResponse.data.conversations,
      );
      if (conversations === null) {
        return { status: "server-error" };
      }

      const selectedConversation =
        (selectedConversationKey === null
          ? null
          : conversations.find(
              (conversation) =>
                conversation.conversationKey === selectedConversationKey,
            )) ?? conversations[0] ?? null;
      let selectedThread = null;

      if (selectedConversation !== null) {
        const threadResponse = await client.call(queryRequest(
          "conversations.thread.read",
          Object.freeze({
            conversationKey: selectedConversation.conversationKey,
          }),
        ));
        if (threadResponse.outcome !== "ok") {
          return mapFailure(threadResponse.code);
        }
        if (
          !isRecord(threadResponse.data) ||
          !hasExactKeys(threadResponse.data, ["thread"])
        ) {
          return { status: "server-error" };
        }

        selectedThread = parseRailwayConversationThread(
          threadResponse.data.thread,
          selectedConversation.conversationKey,
        );
        if (selectedThread === null) {
          return { status: "server-error" };
        }
      }

      return Object.freeze({
        status: "refreshed" as const,
        inbox: Object.freeze({
          conversations,
          selectedThread,
          canReply: listResponse.data.canReply,
          filters: Object.freeze({ ...filters }),
        }),
      });
    } catch {
      return { status: "server-error" };
    }
  }

  async function executeMutation(
    client: RailwayApiClient,
    operation: RailwayConversationMutationOperation,
    payload: RailwayApiJsonObject & Readonly<{ conversationKey: string }>,
    conflictStatus: "state-conflict" | "assignment-conflict",
  ): Promise<Readonly<{
    status: "updated";
    conversation: NonNullable<ReturnType<
      typeof parseRailwayConversationMutationState
    >>;
  }> | ConversationActionFailure> {
    let idempotencyKey: string;
    try {
      idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
        operation,
        payload,
      );
    } catch {
      return { status: "server-error" };
    }

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation,
      requestKind: "mutation",
      idempotencyKey,
      payload,
    } satisfies RailwayApiRequestEnvelope);

    try {
      const response = await client.call(request);
      if (response.outcome !== "ok") {
        return mapFailure(response.code, conflictStatus);
      }
      if (
        !isRecord(response.data) ||
        !hasExactKeys(response.data, ["conversation", "replayed"]) ||
        typeof response.data.replayed !== "boolean"
      ) {
        return { status: "server-error" };
      }

      const conversation = parseRailwayConversationMutationState(
        operation,
        payload.conversationKey,
        response.data.conversation,
      );
      return conversation === null
        ? { status: "server-error" }
        : Object.freeze({ status: "updated" as const, conversation });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    async readCurrent(): Promise<RailwayCurrentInboxResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return { status: context.status, inbox: emptyInbox };
      }

      const result = await readInbox(
        context.client,
        defaultInboxFilters,
        null,
      );
      if (result.status === "refreshed") {
        return { status: "ready", inbox: result.inbox };
      }

      const status = result.status === "unauthenticated" ||
        result.status === "onboarding-required" ||
        result.status === "tenant-selection-required" ||
        result.status === "permission-denied"
        ? result.status
        : "server-error";
      return { status, inbox: emptyInbox };
    },

    async loadThread(
      conversationKeyInput: unknown,
    ): Promise<LoadConversationThreadActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      const conversationKey = parseConversationKey(conversationKeyInput);
      if (conversationKey === null) return { status: "invalid-input" };

      try {
        const response = await context.client.call(queryRequest(
          "conversations.thread.read",
          Object.freeze({ conversationKey }),
        ));
        if (response.outcome !== "ok") return mapFailure(response.code);
        if (!isRecord(response.data) || !hasExactKeys(response.data, ["thread"])) {
          return { status: "server-error" };
        }
        const thread = parseRailwayConversationThread(
          response.data.thread,
          conversationKey,
        );
        return thread === null
          ? { status: "server-error" }
          : Object.freeze({ status: "loaded" as const, thread });
      } catch {
        return { status: "server-error" };
      }
    },

    async markRead(input: unknown): Promise<MarkConversationReadActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      const parsed = parseMarkReadRequest(input);
      if (parsed === null) return { status: "invalid-input" };
      const result = await executeMutation(
        context.client,
        "conversations.mark-read",
        Object.freeze({ ...parsed }),
        "state-conflict",
      );
      if (result.status !== "updated") return result;
      return "unreadCount" in result.conversation
        ? { status: "marked-read", conversation: result.conversation }
        : { status: "server-error" };
    },

    async changeAssignment(
      input: unknown,
    ): Promise<ChangeConversationAssignmentActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      const parsed = parseChangeAssignmentRequest(input);
      if (parsed === null) return { status: "invalid-input" };
      const result = await executeMutation(
        context.client,
        "conversations.assignment.change",
        Object.freeze({ ...parsed }),
        "assignment-conflict",
      );
      if (result.status !== "updated") return result;
      return "assignment" in result.conversation
        ? { status: "assignment-updated", conversation: result.conversation }
        : { status: "server-error" };
    },

    async refresh(input: unknown): Promise<RefreshInboxActionResult> {
      const context = await createContext();
      if (context.status !== "ready") return context;
      const parsed = parseRefreshRequest(input);
      if (parsed === null) return { status: "invalid-input" };
      return readInbox(
        context.client,
        parsed.filters,
        parsed.selectedConversationKey,
      );
    },
  });
}
