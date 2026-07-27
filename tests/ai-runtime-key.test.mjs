import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../server/ai/aiRuntimeKey.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";

const identity = {
  conversationKey:
    `conversation_v1_${"a".repeat(64)}`,
  inboundMessageKey:
    `message_v1_${"b".repeat(64)}`,
  aiAgentVersionKey:
    `ai_agent_version_v1_${"c".repeat(64)}`,
};

test("derives stable and purpose-separated AI runtime keys", async () => {
  const requestKey =
    await deriveAiProviderRequestKey(
      7,
      identity,
    );
  const repeatedRequestKey =
    await deriveAiProviderRequestKey(
      7,
      identity,
    );
  const auditKey =
    await deriveAiRuntimeAuditKey(
      7,
      identity,
    );
  const outboxKey =
    await deriveAiReplyOutboxKey(
      7,
      requestKey,
    );
  const anotherMessageKey =
    await deriveAiProviderRequestKey(
      7,
      {
        ...identity,
        inboundMessageKey:
          `message_v1_${"d".repeat(64)}`,
      },
    );

  assert.equal(
    requestKey,
    repeatedRequestKey,
  );
  assert.match(
    requestKey,
    /^ai_provider_request_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    auditKey,
    /^ai_runtime_audit_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    outboxKey,
    /^ai_reply_outbox_v1_[0-9a-f]{64}$/,
  );
  assert.notEqual(requestKey, auditKey);
  assert.notEqual(
    requestKey,
    anotherMessageKey,
  );
});

test("rejects invalid AI runtime identity before hashing", async () => {
  await assert.rejects(
    deriveAiProviderRequestKey(0, identity),
    /identity/,
  );
  await assert.rejects(
    deriveAiRuntimeAuditKey(7, {
      ...identity,
      conversationKey: "conversation-invalid",
    }),
    /identity/,
  );
  await assert.rejects(
    deriveAiReplyOutboxKey(
      7,
      "invalid-request",
    ),
    /outbox identity/,
  );
});
