import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiReplyApprovalActionHandler,
} from "../server/ai/aiReplyApprovalActionHandler.ts";
import {
  AiReplyApprovalServiceError,
} from "../server/ai/aiReplyApprovalService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const outboxKey =
  `ai_reply_outbox_v1_${"a".repeat(64)}`;
const conversationKey =
  `conversation_v1_${"b".repeat(64)}`;

const session = {
  externalUserId: "clerk-user-seven",
  tenantId: 7,
  displayName: "tenant-seven",
  status: "active",
  role: "agent",
};

function item(overrides = {}) {
  return {
    outboxKey,
    requestKey:
      `ai_provider_request_v1_${"c".repeat(64)}`,
    auditKey:
      `ai_runtime_audit_v1_${"d".repeat(64)}`,
    tenantId: 7,
    conversationKey,
    inboundMessageKey:
      `message_v1_${"e".repeat(64)}`,
    aiAgentKey:
      `ai_agent_v1_${"f".repeat(64)}`,
    aiAgentVersionKey:
      `ai_agent_version_v1_${"1".repeat(64)}`,
    expectedConversationVersion: 4,
    recipientPhoneNumber: "+972501234567",
    responseMode: "agent-approval",
    replyText: "תשובה מוצעת לנציג.",
    groundedSourceKeys: [
      `knowledge_source_v1_${"2".repeat(64)}`,
    ],
    groundingScoreBasisPoints: 9_000,
    status: "awaiting-approval",
    decidedByExternalUserId: null,
    decidedAt: null,
    version: 1,
    createdAt:
      "2026-07-26T10:00:00.000Z",
    updatedAt:
      "2026-07-26T10:00:00.000Z",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler =
    createAiReplyApprovalActionHandler({
      applicationConfigured: () =>
        options.applicationConfigured ??
        true,
      async createContext() {
        calls.push("context");

        if (options.contextError) {
          throw options.contextError;
        }

        return {
          session: options.session ?? session,
          service: {
            async listAwaiting() {
              calls.push("list");

              if (options.listError) {
                throw options.listError;
              }

              return [item()];
            },
            async decide(
              currentSession,
              input,
            ) {
              calls.push({
                currentSession,
                input,
              });

              if (options.decideError) {
                throw options.decideError;
              }

              return {
                outcome: "updated",
                item: item({
                  status:
                    "ready-for-delivery",
                  version: 2,
                  decidedByExternalUserId:
                    "must-not-be-exposed",
                }),
              };
            },
          },
        };
      },
    });

  return { calls, handler };
}

test("stops approval actions before context when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.load(),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.decide({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("loads a bounded approval directory and derives permission from the session", async () => {
  const result = await fixture().handler.load();
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "loaded");
  assert.equal(result.directory.canDecide, true);
  assert.equal(
    result.directory.approvals.length,
    1,
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|requestKey|auditKey|recipientPhoneNumber|inboundMessageKey|aiAgentKey|groundedSourceKeys|externalUserId/,
  );
});

test("passes only the server session to the service and returns a bounded decision", async () => {
  const testFixture = fixture();
  const request = {
    outboxKey,
    expectedVersion: 1,
    decision: "approve",
  };
  const result =
    await testFixture.handler.decide(request);

  assert.deepEqual(
    testFixture.calls.at(-1),
    {
      currentSession: session,
      input: request,
    },
  );
  assert.deepEqual(result, {
    status: "decided",
    outcome: "updated",
    approval: {
      outboxKey,
      status: "ready-for-delivery",
      version: 2,
    },
  });
});

test("maps tenant and service failures to bounded action statuses", async () => {
  const unauthenticated = fixture({
    contextError: new TenantSessionError(
      "AUTHENTICATION_REQUIRED",
      "internal authentication detail",
    ),
  });
  const stale = fixture({
    decideError:
      new AiReplyApprovalServiceError(
        "INVALID_STATE",
      ),
  });
  const persistence = fixture({
    listError:
      new AiReplyApprovalServiceError(
        "PERSISTENCE_FAILED",
      ),
  });

  assert.deepEqual(
    await unauthenticated.handler.load(),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await stale.handler.decide({}),
    { status: "invalid-state" },
  );
  assert.deepEqual(
    await persistence.handler.load(),
    { status: "server-error" },
  );
});
