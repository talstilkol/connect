import assert from "node:assert/strict";
import test from "node:test";

import {
  AiInboundRuntimeProcessorError,
  createAiInboundRuntimeProcessor,
} from "../server/ai/aiInboundRuntimeProcessor.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const requestKey =
  `ai_provider_request_v1_${"c".repeat(64)}`;
const auditKey =
  `ai_runtime_audit_v1_${"d".repeat(64)}`;
const aiAgentKey =
  `ai_agent_v1_${"e".repeat(64)}`;
const aiAgentVersionKey =
  `ai_agent_version_v1_${"f".repeat(64)}`;
const sourceKey =
  `knowledge_source_v1_${"1".repeat(64)}`;

function input(overrides = {}) {
  return {
    tenantId: 7,
    conversationKey,
    inboundMessageKey,
    recipientPhoneNumber: "+972501234567",
    textContent: "מה מדיניות השירות?",
    customerRequestedHuman: false,
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = {
    conversations: [],
    agents: [],
    runtime: [],
    outbox: [],
    existing: [],
  };
  const agent = {
    aiAgentKey,
    tenantId: 7,
  };
  const version = {
    aiAgentVersionKey,
    aiAgentKey,
    tenantId: 7,
  };
  const processor =
    createAiInboundRuntimeProcessor(
      {
        async findConversationState(
          tenantId,
          currentConversationKey,
        ) {
          calls.conversations.push({
            tenantId,
            conversationKey:
              currentConversationKey,
          });

          if (options.conversationError) {
            throw options.conversationError;
          }

          return (
            options.conversation ?? {
              tenantId,
              conversationKey:
                currentConversationKey,
              status: "new",
              assignedExternalUserId: null,
              version: 4,
            }
          );
        },
        async applyHandoff() {
          throw new Error("not used");
        },
      },
      {
        async load(tenantId) {
          calls.agents.push(tenantId);

          if (options.agentError) {
            throw options.agentError;
          }

          return (
            options.activeAgent ?? {
              outcome: "loaded",
              agent,
              version,
            }
          );
        },
      },
      {
        async process(runtimeInput) {
          calls.runtime.push(runtimeInput);

          if (options.runtimeError) {
            throw options.runtimeError;
          }

          return (
            options.plan ?? {
              outcome: "reply-planned",
              requestKey,
              auditKey,
              aiAgentKey,
              aiAgentVersionKey,
              responseMode:
                "agent-approval",
              approvalRequired: true,
              text:
                "זו התשובה המבוססת על המקור.",
              groundedSourceKeys: [
                sourceKey,
              ],
              groundingScoreBasisPoints:
                9_000,
              usage: {
                inputTokens: 20,
                outputTokens: 10,
                costMinorUnits: 2,
                currency: "ILS",
              },
              sendReply: false,
              auditRecorded: true,
            }
          );
        },
      },
      {
        async stage(stageInput) {
          calls.outbox.push(stageInput);

          if (options.outboxError) {
            throw options.outboxError;
          }

          return {
            outcome:
              options.stageOutcome ??
              "created",
            item: {},
          };
        },
        async findByInboundMessage() {
          calls.existing.push(
            [...arguments],
          );

          if (options.findError) {
            throw options.findError;
          }

          return options.existingReply ??
            null;
        },
        async findByKey() {
          throw new Error("not used");
        },
        async listAwaitingApproval() {
          throw new Error("not used");
        },
        async decide() {
          throw new Error("not used");
        },
      },
    );

  return { calls, processor };
}

test("skips unsupported content before persistence or AI access", async () => {
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.processor.process(
      input({ textContent: null }),
    ),
    {
      outcome: "skipped",
      reason:
        "unsupported-message-content",
    },
  );
  assert.deepEqual(
    testFixture.calls.conversations,
    [],
  );
  assert.deepEqual(
    testFixture.calls.runtime,
    [],
  );
});

test("stops before the agent when the conversation is locked or ineligible", async () => {
  for (const [conversation, reason] of [
    [
      {
        tenantId: 7,
        conversationKey,
        status: "new",
        assignedExternalUserId:
          "clerk-agent",
        version: 4,
      },
      "assignment-locked",
    ],
    [
      {
        tenantId: 7,
        conversationKey,
        status: "waiting_for_agent",
        assignedExternalUserId: null,
        version: 4,
      },
      "conversation-ineligible",
    ],
  ]) {
    const testFixture = fixture({
      conversation,
    });

    assert.deepEqual(
      await testFixture.processor.process(
        input(),
      ),
      { outcome: "skipped", reason },
    );
    assert.deepEqual(
      testFixture.calls.agents,
      [],
    );
  }
});

test("does not choose an AI agent when active state is absent or ambiguous", async () => {
  for (const reason of [
    "no-active-agent",
    "ambiguous-active-agent",
  ]) {
    const testFixture = fixture({
      activeAgent: {
        outcome: "unavailable",
        reason,
      },
    });

    assert.deepEqual(
      await testFixture.processor.process(
        input(),
      ),
      { outcome: "skipped", reason },
    );
    assert.deepEqual(
      testFixture.calls.runtime,
      [],
    );
  }
});

test("passes the durable conversation version to AI and stages the audited reply deterministically", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.processor.process(
      input(),
    );

  assert.deepEqual(result, {
    outcome: "reply-staged",
    persistenceOutcome: "created",
    approvalRequired: true,
  });
  assert.equal(
    testFixture.calls.runtime[0]
      .conversationVersion,
    4,
  );
  assert.equal(
    testFixture.calls.runtime[0]
      .inboundMessageKey,
    inboundMessageKey,
  );
  assert.deepEqual(
    testFixture.calls.outbox,
    [
      {
        outboxKey:
          await deriveAiReplyOutboxKey(
            7,
            requestKey,
          ),
        requestKey,
        auditKey,
        tenantId: 7,
        conversationKey,
        inboundMessageKey,
        aiAgentKey,
        aiAgentVersionKey,
        expectedConversationVersion: 4,
        recipientPhoneNumber:
          "+972501234567",
        responseMode: "agent-approval",
        replyText:
          "זו התשובה המבוססת על המקור.",
        groundedSourceKeys: [
          sourceKey,
        ],
        groundingScoreBasisPoints:
          9_000,
      },
    ],
  );
});

test("does not invoke AI again when the deterministic outbox reply already exists", async () => {
  const testFixture = fixture({
    existingReply: {
      responseMode: "agent-approval",
    },
  });

  assert.deepEqual(
    await testFixture.processor.process(
      input(),
    ),
    {
      outcome: "reply-staged",
      persistenceOutcome: "unchanged",
      approvalRequired: true,
    },
  );
  assert.deepEqual(
    testFixture.calls.runtime,
    [],
  );
  assert.deepEqual(
    testFixture.calls.outbox,
    [],
  );
  assert.equal(
    testFixture.calls.existing.length,
    1,
  );
});

test("does not stage reply content after an audited handoff", async () => {
  const testFixture = fixture({
    plan: {
      outcome: "handoff-planned",
      requestKey,
      auditKey,
      aiAgentKey,
      aiAgentVersionKey,
      effect: {
        outcome: "handoff",
        stopExecution: true,
        conversationStatus:
          "waiting_for_agent",
        assignmentAction: "none",
      },
    },
  });

  assert.deepEqual(
    await testFixture.processor.process(
      input({
        customerRequestedHuman: true,
      }),
    ),
    { outcome: "handoff-planned" },
  );
  assert.deepEqual(
    testFixture.calls.outbox,
    [],
  );
});

test("maps storage and runtime failures to bounded error codes", async () => {
  const cases = [
    [
      fixture({
        conversationError:
          new Error("private D1 detail"),
      }),
      "PERSISTENCE_FAILED",
    ],
    [
      fixture({
        runtimeError:
          new Error("private provider detail"),
      }),
      "RUNTIME_FAILED",
    ],
    [
      fixture({
        outboxError:
          new Error("private outbox detail"),
      }),
      "PERSISTENCE_FAILED",
    ],
  ];

  for (const [testFixture, code] of cases) {
    await assert.rejects(
      testFixture.processor.process(
        input(),
      ),
      (error) =>
        error instanceof
          AiInboundRuntimeProcessorError &&
        error.code === code &&
        !error.message.includes("private"),
    );
  }
});
