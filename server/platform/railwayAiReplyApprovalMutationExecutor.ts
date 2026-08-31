import type { AiReplyApprovalDecisionView } from
  "../../shared/domain/aiReplyApprovalView.ts";
import type { TenantSession } from "../auth/tenantSession.ts";
import type { ParsedAiReplyApprovalDecisionRequest } from
  "../ai/aiReplyApprovalService.ts";
import { parseRailwayAiReplyApprovalDecisionView } from
  "../ai/railwayAiReplyApprovalResult.ts";

export const RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION =
  "ai.reply-approvals.decide" as const;

export type RailwayAiReplyApprovalMutationState = Readonly<{
  outcome: "updated" | "unchanged";
  approval: Readonly<AiReplyApprovalDecisionView>;
}>;

export interface RailwayAiReplyApprovalMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: typeof RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: Readonly<ParsedAiReplyApprovalDecisionRequest>;
}

export type RailwayAiReplyApprovalMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayAiReplyApprovalMutationState;
    }>
  | Readonly<{
      outcome:
        | "conflict"
        | "not-found"
        | "state-conflict"
        | "invalid-state"
        | "unavailable";
      tenantId: null;
      state: null;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export function parseRailwayAiReplyApprovalMutationState(
  payload: Readonly<ParsedAiReplyApprovalDecisionRequest>,
  value: unknown,
): RailwayAiReplyApprovalMutationState | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["approval", "outcome"]) ||
    (value.outcome !== "updated" && value.outcome !== "unchanged")
  ) {
    return null;
  }
  const approval = parseRailwayAiReplyApprovalDecisionView(value.approval);
  const expectedStatus = payload.decision === "approve"
    ? "ready-for-delivery"
    : "rejected";
  if (
    approval === null ||
    approval.outboxKey !== payload.outboxKey ||
    approval.status !== expectedStatus ||
    approval.version !== payload.expectedVersion + 1
  ) {
    return null;
  }
  return Object.freeze({ outcome: value.outcome, approval });
}

/**
 * Claims one deterministic approval request and stores its bounded replay,
 * the outbox transition, and immutable audit evidence atomically.
 */
export interface RailwayAiReplyApprovalMutationExecutor {
  execute(
    command: Readonly<RailwayAiReplyApprovalMutationCommand>,
  ): Promise<RailwayAiReplyApprovalMutationResult>;
}
