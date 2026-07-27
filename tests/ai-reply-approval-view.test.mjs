import assert from "node:assert/strict";
import test from "node:test";

import {
  toAiReplyApprovalDecisionView,
  toAiReplyApprovalView,
} from "../server/ai/aiReplyApprovalView.ts";

const item = {
  outboxKey:
    `ai_reply_outbox_v1_${"a".repeat(64)}`,
  requestKey:
    `ai_provider_request_v1_${"b".repeat(64)}`,
  auditKey:
    `ai_runtime_audit_v1_${"c".repeat(64)}`,
  tenantId: 7,
  conversationKey:
    `conversation_v1_${"d".repeat(64)}`,
  inboundMessageKey:
    `message_v1_${"e".repeat(64)}`,
  aiAgentKey:
    `ai_agent_v1_${"f".repeat(64)}`,
  aiAgentVersionKey:
    `ai_agent_version_v1_${"1".repeat(64)}`,
  expectedConversationVersion: 4,
  recipientPhoneNumber: "+972501234567",
  responseMode: "agent-approval",
  replyText:
    "תשובה המבוססת על מקור מאושר.",
  groundedSourceKeys: [
    `knowledge_source_v1_${"2".repeat(64)}`,
    `knowledge_source_v1_${"3".repeat(64)}`,
  ],
  groundingScoreBasisPoints: 8_750,
  status: "awaiting-approval",
  decidedByExternalUserId: null,
  decidedAt: null,
  version: 1,
  createdAt: "2026-07-26T10:00:00.000Z",
  updatedAt: "2026-07-26T10:00:00.000Z",
};

test("maps an awaiting approval to a bounded client view", () => {
  const view = toAiReplyApprovalView(item);
  const serialized = JSON.stringify(view);

  assert.deepEqual(view, {
    outboxKey: item.outboxKey,
    conversationKey: item.conversationKey,
    replyText: item.replyText,
    groundedSourceCount: 2,
    groundingScoreBasisPoints: 8_750,
    version: 1,
    createdAt: item.createdAt,
  });
  assert.doesNotMatch(
    serialized,
    /tenantId|requestKey|auditKey|recipientPhoneNumber|inboundMessageKey|aiAgentKey|groundedSourceKeys|decidedByExternalUserId/,
  );
});

test("returns only the bounded result of an approval decision", () => {
  const view =
    toAiReplyApprovalDecisionView({
      ...item,
      status: "ready-for-delivery",
      decidedByExternalUserId:
        "clerk-user-seven",
      decidedAt:
        "2026-07-26T10:05:00.000Z",
      version: 2,
    });

  assert.deepEqual(view, {
    outboxKey: item.outboxKey,
    status: "ready-for-delivery",
    version: 2,
  });
});

test("refuses to map outbox states outside the intended UI boundary", () => {
  assert.throws(
    () =>
      toAiReplyApprovalView({
        ...item,
        status: "rejected",
      }),
    /not awaiting approval/,
  );
  assert.throws(
    () =>
      toAiReplyApprovalDecisionView(item),
    /decision is incomplete/,
  );
});
