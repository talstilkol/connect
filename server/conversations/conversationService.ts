import type {
  ConversationAssignmentState,
  ConversationReadState,
  ConversationRepository,
  PersistedInboxConversation,
} from "../../db/conversationRepository.ts";
import type {
  PersistedMessage,
} from "../../shared/domain/conversation.ts";
import {
  defaultInboxFilters,
  type InboxFilters,
} from "../../shared/domain/conversationView.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

const CONVERSATION_LIST_LIMIT = 50;
const CONVERSATION_MESSAGE_LIMIT = 100;
const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;

export type ConversationServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "ASSIGNMENT_CONFLICT"
  | "PERSISTENCE_FAILED";

export class ConversationServiceError extends Error {
  readonly code: ConversationServiceErrorCode;

  constructor(code: ConversationServiceErrorCode) {
    super("Conversation operation failed");
    this.name = "ConversationServiceError";
    this.code = code;
  }
}

export interface ConversationThread {
  conversation: PersistedInboxConversation;
  messages: readonly PersistedMessage[];
}

export interface MarkConversationReadRequest {
  conversationKey: string;
  expectedVersion: number;
}

export interface ChangeConversationAssignmentRequest {
  conversationKey: string;
  expectedVersion: number;
  action: "assign-self" | "unassign-self";
}

export interface ConversationInboxSnapshot {
  conversations:
    readonly PersistedInboxConversation[];
  selectedThread: ConversationThread | null;
  filters: InboxFilters;
}

export interface ConversationService {
  list(
    session: TenantSession,
    filters?: unknown,
  ): Promise<readonly PersistedInboxConversation[]>;
  readThread(
    session: TenantSession,
    conversationKey: unknown,
  ): Promise<ConversationThread>;
  markRead(
    session: TenantSession,
    input: unknown,
  ): Promise<ConversationReadState>;
  changeAssignment(
    session: TenantSession,
    input: unknown,
  ): Promise<ConversationAssignmentState>;
  refresh(
    session: TenantSession,
    input: unknown,
  ): Promise<ConversationInboxSnapshot>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseConversationKey(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    CONVERSATION_KEY_PATTERN.test(value)
    ? value
    : null;
}

function parseMarkReadRequest(
  input: unknown,
): MarkConversationReadRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const conversationKey = parseConversationKey(
    input.conversationKey,
  );

  if (
    !conversationKey ||
    typeof input.expectedVersion !== "number" ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion <= 0
  ) {
    return null;
  }

  return {
    conversationKey,
    expectedVersion: input.expectedVersion,
  };
}

function hasOnlyKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(input).every((key) =>
    keys.includes(key),
  );
}

function parseFilters(
  input: unknown,
): InboxFilters | null {
  if (input === undefined) {
    return { ...defaultInboxFilters };
  }

  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "searchTerm",
      "status",
      "assignment",
    ]) ||
    typeof input.searchTerm !== "string" ||
    typeof input.status !== "string" ||
    typeof input.assignment !== "string"
  ) {
    return null;
  }

  const searchTerm = input.searchTerm.trim();
  const status =
    input.status === "all" ||
    [
      "new",
      "bot_active",
      "waiting_for_agent",
      "agent_active",
      "waiting_for_contact",
      "closed",
    ].includes(input.status)
      ? input.status
      : null;
  const assignment =
    input.assignment === "all" ||
    input.assignment === "unassigned" ||
    input.assignment === "mine"
      ? input.assignment
      : null;

  if (
    searchTerm.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(searchTerm) ||
    status === null ||
    assignment === null
  ) {
    return null;
  }

  return {
    searchTerm,
    status: status as InboxFilters["status"],
    assignment,
  };
}

function parseChangeAssignmentRequest(
  input: unknown,
): ChangeConversationAssignmentRequest | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "conversationKey",
      "expectedVersion",
      "action",
    ])
  ) {
    return null;
  }

  const conversationKey = parseConversationKey(
    input.conversationKey,
  );

  if (
    !conversationKey ||
    typeof input.expectedVersion !== "number" ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion <= 0 ||
    (input.action !== "assign-self" &&
      input.action !== "unassign-self")
  ) {
    return null;
  }

  return {
    conversationKey,
    expectedVersion: input.expectedVersion,
    action: input.action,
  };
}

function parseRefreshRequest(
  input: unknown,
): {
  filters: InboxFilters;
  selectedConversationKey: string | null;
} | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "filters",
      "selectedConversationKey",
    ])
  ) {
    return null;
  }

  const filters = parseFilters(input.filters);
  const selectedConversationKey =
    input.selectedConversationKey === null
      ? null
      : parseConversationKey(
          input.selectedConversationKey,
        );

  if (
    !filters ||
    (input.selectedConversationKey !== null &&
      !selectedConversationKey)
  ) {
    return null;
  }

  return {
    filters,
    selectedConversationKey,
  };
}

function serviceError(
  code: ConversationServiceErrorCode,
): ConversationServiceError {
  return new ConversationServiceError(code);
}

export function createConversationService(
  repository: ConversationRepository,
): ConversationService {
  const list = async (
    session: TenantSession,
    filtersInput?: unknown,
  ): Promise<
    readonly PersistedInboxConversation[]
  > => {
    requireTenantPermission(
      session,
      "conversations.read",
    );
    const filters = parseFilters(filtersInput);

    if (!filters) {
      throw serviceError("INVALID_INPUT");
    }

    try {
      return await repository.listFilteredByTenant(
        session.tenantId,
        {
          searchTerm:
            filters.searchTerm.length > 0
              ? filters.searchTerm
              : null,
          status:
            filters.status === "all"
              ? null
              : filters.status,
          assignment: filters.assignment,
          currentExternalUserId:
            filters.assignment === "mine"
              ? session.externalUserId
              : null,
        },
        CONVERSATION_LIST_LIMIT,
      );
    } catch {
      throw serviceError("PERSISTENCE_FAILED");
    }
  };

  const readThread = async (
    session: TenantSession,
    conversationKeyInput: unknown,
  ): Promise<ConversationThread> => {
    requireTenantPermission(
      session,
      "conversations.read",
    );
    const conversationKey = parseConversationKey(
      conversationKeyInput,
    );

    if (!conversationKey) {
      throw serviceError("INVALID_INPUT");
    }

    try {
      const conversation =
        await repository.findByKey(
          session.tenantId,
          conversationKey,
        );

      if (!conversation) {
        throw serviceError("NOT_FOUND");
      }

      const messages =
        await repository.listMessagesByConversation(
          session.tenantId,
          conversationKey,
          CONVERSATION_MESSAGE_LIMIT,
        );

      return {
        conversation,
        messages,
      };
    } catch (error) {
      if (error instanceof ConversationServiceError) {
        throw error;
      }

      throw serviceError("PERSISTENCE_FAILED");
    }
  };

  return {
    list,

    readThread,

    async markRead(session, input) {
      requireTenantPermission(
        session,
        "conversations.reply",
      );
      const request = parseMarkReadRequest(input);

      if (!request) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const result = await repository.markRead(
          session.tenantId,
          request.conversationKey,
          request.expectedVersion,
        );

        if (
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          return result.state;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        throw serviceError("STATE_CONFLICT");
      } catch (error) {
        if (error instanceof ConversationServiceError) {
          throw error;
        }

        throw serviceError("PERSISTENCE_FAILED");
      }
    },

    async changeAssignment(session, input) {
      requireTenantPermission(
        session,
        "conversations.reply",
      );
      const request =
        parseChangeAssignmentRequest(input);

      if (!request) {
        throw serviceError("INVALID_INPUT");
      }

      try {
        const result =
          await repository.changeAssignment(
            session.tenantId,
            request.conversationKey,
            request.expectedVersion,
            session.externalUserId,
            request.action,
          );

        if (
          result.outcome === "updated" ||
          result.outcome === "unchanged"
        ) {
          return result.state;
        }

        if (result.outcome === "not-found") {
          throw serviceError("NOT_FOUND");
        }

        if (result.outcome === "locked") {
          throw serviceError(
            "ASSIGNMENT_CONFLICT",
          );
        }

        throw serviceError("STATE_CONFLICT");
      } catch (error) {
        if (error instanceof ConversationServiceError) {
          throw error;
        }

        throw serviceError("PERSISTENCE_FAILED");
      }
    },

    async refresh(session, input) {
      requireTenantPermission(
        session,
        "conversations.read",
      );
      const request = parseRefreshRequest(input);

      if (!request) {
        throw serviceError("INVALID_INPUT");
      }

      const conversations = await list(
        session,
        request.filters,
      );
      const requestedConversation =
        request.selectedConversationKey
          ? conversations.find(
              (conversation) =>
                conversation.conversationKey ===
                request.selectedConversationKey,
            ) ?? null
          : null;
      const selectedConversation =
        requestedConversation ??
        conversations[0] ??
        null;
      const selectedThread = selectedConversation
        ? await readThread(
            session,
            selectedConversation.conversationKey,
          )
        : null;

      return {
        conversations,
        selectedThread,
        filters: request.filters,
      };
    },
  };
}
