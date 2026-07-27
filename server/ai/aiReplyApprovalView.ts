import type {
  PersistedAiReplyOutboxItem,
} from "../../shared/domain/aiReplyOutbox.ts";
import type {
  AiReplyApprovalDecisionView,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";

export function toAiReplyApprovalView(
  item: PersistedAiReplyOutboxItem,
): AiReplyApprovalView {
  if (item.status !== "awaiting-approval") {
    throw new Error(
      "AI reply is not awaiting approval",
    );
  }

  return {
    outboxKey: item.outboxKey,
    conversationKey: item.conversationKey,
    replyText: item.replyText,
    groundedSourceCount:
      item.groundedSourceKeys.length,
    groundingScoreBasisPoints:
      item.groundingScoreBasisPoints,
    version: item.version,
    createdAt: item.createdAt,
  };
}

export function toAiReplyApprovalDecisionView(
  item: PersistedAiReplyOutboxItem,
): AiReplyApprovalDecisionView {
  if (
    item.status !== "ready-for-delivery" &&
    item.status !== "rejected"
  ) {
    throw new Error(
      "AI reply decision is incomplete",
    );
  }

  return {
    outboxKey: item.outboxKey,
    status: item.status,
    version: item.version,
  };
}

