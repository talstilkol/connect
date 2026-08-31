import type {
  ConversationAssignmentStateView,
  ConversationReadStateView,
} from "../../shared/domain/conversationView.ts";
import type { TenantSession } from "../auth/tenantSession.ts";

export const railwayConversationMutationOperations = Object.freeze([
  "conversations.mark-read",
  "conversations.assignment.change",
] as const);

export type RailwayConversationMutationOperation =
  typeof railwayConversationMutationOperations[number];

export type RailwayConversationMutationPayload =
  | Readonly<{
      conversationKey: string;
      expectedVersion: number;
    }>
  | Readonly<{
      conversationKey: string;
      expectedVersion: number;
      action: "assign-self" | "unassign-self";
    }>;

export interface RailwayConversationMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayConversationMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayConversationMutationPayload;
}

export type RailwayConversationMutationState =
  | Readonly<ConversationReadStateView>
  | Readonly<ConversationAssignmentStateView>;

export type RailwayConversationMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayConversationMutationState;
    }>
  | Readonly<{
      outcome: "conflict" | "not-found" | "unavailable";
      tenantId: null;
      state: null;
    }>;

function hasExactKeys(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actualKeys.length === expected.length &&
    actualKeys.every((key, index) => key === expected[index]);
}

export function parseRailwayConversationMutationState(
  operation: RailwayConversationMutationOperation,
  expectedConversationKey: string,
  value: unknown,
): RailwayConversationMutationState | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const state = value as Record<string, unknown>;
  if (
    state.conversationKey !== expectedConversationKey ||
    !Number.isSafeInteger(state.version) ||
    Number(state.version) <= 0
  ) {
    return null;
  }

  if (operation === "conversations.mark-read") {
    return hasExactKeys(
      state,
      ["conversationKey", "unreadCount", "version"],
    ) &&
      Number.isSafeInteger(state.unreadCount) &&
      Number(state.unreadCount) >= 0
      ? Object.freeze({
          conversationKey: expectedConversationKey,
          unreadCount: Number(state.unreadCount),
          version: Number(state.version),
        })
      : null;
  }

  return hasExactKeys(
    state,
    ["assignment", "conversationKey", "version"],
  ) &&
    (state.assignment === "unassigned" ||
      state.assignment === "current-user" ||
      state.assignment === "other-user")
    ? Object.freeze({
        conversationKey: expectedConversationKey,
        assignment: state.assignment,
        version: Number(state.version),
      })
    : null;
}

/**
 * The production adapter claims the deterministic request, mutates one
 * tenant-scoped conversation, writes its audit record, stores the bounded
 * response, and completes the receipt in one PostgreSQL transaction.
 */
export interface RailwayConversationMutationExecutor {
  execute(
    command: Readonly<RailwayConversationMutationCommand>,
  ): Promise<RailwayConversationMutationResult>;
}
