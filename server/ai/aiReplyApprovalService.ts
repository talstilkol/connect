import type {
  AiReplyOutboxRepository,
  DecideAiReplyOutboxResult,
} from "../../db/aiReplyOutboxRepository.ts";
import type {
  PersistedAiReplyOutboxItem,
} from "../../shared/domain/aiReplyOutbox.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

const OUTBOX_KEY_PATTERN =
  /^ai_reply_outbox_v1_[0-9a-f]{64}$/;
const APPROVAL_LIST_LIMIT = 50;

export type AiReplyApprovalServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "INVALID_STATE"
  | "PERSISTENCE_FAILED";

export class AiReplyApprovalServiceError
  extends Error {
  readonly code:
    AiReplyApprovalServiceErrorCode;

  constructor(
    code: AiReplyApprovalServiceErrorCode,
  ) {
    super("AI reply approval operation failed");
    this.name =
      "AiReplyApprovalServiceError";
    this.code = code;
  }
}

export interface AiReplyApprovalDecisionRequest {
  outboxKey: string;
  expectedVersion: number;
  decision: "approve" | "reject";
}

export interface AiReplyApprovalService {
  listAwaiting(
    session: TenantSession,
  ): Promise<readonly PersistedAiReplyOutboxItem[]>;
  decide(
    session: TenantSession,
    input: unknown,
  ): Promise<{
    outcome: "updated" | "unchanged";
    item: PersistedAiReplyOutboxItem;
  }>;
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

function parseDecision(
  input: unknown,
): AiReplyApprovalDecisionRequest | null {
  if (
    !isRecord(input) ||
    Object.keys(input).length !== 3 ||
    !Object.hasOwn(input, "outboxKey") ||
    !Object.hasOwn(input, "expectedVersion") ||
    !Object.hasOwn(input, "decision") ||
    typeof input.outboxKey !== "string" ||
    !OUTBOX_KEY_PATTERN.test(
      input.outboxKey,
    ) ||
    typeof input.expectedVersion !== "number" ||
    !Number.isSafeInteger(
      input.expectedVersion,
    ) ||
    input.expectedVersion <= 0 ||
    (input.decision !== "approve" &&
      input.decision !== "reject")
  ) {
    return null;
  }

  return {
    outboxKey: input.outboxKey,
    expectedVersion: input.expectedVersion,
    decision: input.decision,
  };
}

function mapDecisionFailure(
  outcome:
    | "not-found"
    | "conflict"
    | "invalid-state",
): never {
  const code: AiReplyApprovalServiceErrorCode =
    outcome === "not-found"
      ? "NOT_FOUND"
      : outcome === "conflict"
        ? "STATE_CONFLICT"
        : "INVALID_STATE";

  throw new AiReplyApprovalServiceError(code);
}

export function createAiReplyApprovalService(
  repository: AiReplyOutboxRepository,
  dependencies: {
    now(): Date;
  } = {
    now: () => new Date(),
  },
): AiReplyApprovalService {
  return {
    async listAwaiting(session) {
      requireTenantPermission(
        session,
        "conversations.read",
      );

      try {
        return await repository.listAwaitingApproval(
          session.tenantId,
          APPROVAL_LIST_LIMIT,
        );
      } catch {
        throw new AiReplyApprovalServiceError(
          "PERSISTENCE_FAILED",
        );
      }
    },

    async decide(session, input) {
      requireTenantPermission(
        session,
        "conversations.reply",
      );
      const request = parseDecision(input);

      if (!request) {
        throw new AiReplyApprovalServiceError(
          "INVALID_INPUT",
        );
      }

      const now = dependencies.now();

      if (Number.isNaN(now.getTime())) {
        throw new AiReplyApprovalServiceError(
          "PERSISTENCE_FAILED",
        );
      }

      let result: DecideAiReplyOutboxResult;

      try {
        result = await repository.decide({
          tenantId: session.tenantId,
          outboxKey: request.outboxKey,
          expectedVersion:
            request.expectedVersion,
          decidedByExternalUserId:
            session.externalUserId,
          decision: request.decision,
          decidedAt: now.toISOString(),
        });
      } catch {
        throw new AiReplyApprovalServiceError(
          "PERSISTENCE_FAILED",
        );
      }

      if ("item" in result) {
        return result;
      }

      return mapDecisionFailure(result.outcome);
    },
  };
}
