import assert from "node:assert/strict";
import test from "node:test";

import {
  BotInboundRuntimeProcessorError,
  createBotInboundRuntimeProcessor,
} from "../server/bot/botInboundRuntimeProcessor.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const botFlowKey =
  `bot_flow_v1_${"c".repeat(64)}`;
const botFlowVersionKey =
  `bot_flow_version_v1_${"d".repeat(64)}`;
const currentTimestamp =
  "2026-07-26T15:00:00.000Z";

function input() {
  return {
    tenantId: 7,
    conversationKey,
    inboundMessageKey,
    recipientPhoneNumber: "+972501234567",
    phoneNumberId: "phone-number-id",
    textContent: "שירות",
  };
}

function runtimeResult(replies = []) {
  return {
    outcome: "planned",
    botFlowKey,
    botFlowVersionKey,
    conversationVersion: 3,
    plan: {
      outcome: "completed",
      replies,
      terminalEffect: {
        outcome: "end",
        stopExecution: true,
        conversationStatus: null,
        assignmentAction: "none",
      },
    },
  };
}

function deliveryFromInput(
  stageInput,
  overrides = {},
) {
  return {
    ...stageInput,
    status: "pending",
    attemptCount: 0,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt: currentTimestamp,
    updatedAt: currentTimestamp,
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = {
    runtime: [],
    stages: [],
    claims: [],
    accepted: [],
    rejected: [],
    ambiguous: [],
    provider: [],
  };
  const processorResults = [
    ...(options.processorResults ?? [
      {
        outcome: "accepted",
        providerMessageId:
          "wamid.bot-reply-1",
      },
    ]),
  ];
  const service =
    createBotInboundRuntimeProcessor(
      {
        async processInbound(
          tenantId,
          currentConversationKey,
          textContent,
        ) {
          calls.runtime.push({
            tenantId,
            conversationKey:
              currentConversationKey,
            textContent,
          });

          if (options.runtimeError) {
            throw options.runtimeError;
          }

          return (
            options.runtimeResult ??
            runtimeResult([
              {
                kind: "text",
                text: "קיבלנו את פנייתך.",
              },
            ])
          );
        },
      },
      {
        async stage(stageInput) {
          calls.stages.push(stageInput);

          if (options.stageError) {
            throw options.stageError;
          }

          const delivery =
            deliveryFromInput(
              stageInput,
              options.stagedDeliveryOverrides,
            );

          return {
            outcome:
              options.stageOutcome ??
              "created",
            delivery,
          };
        },
        async claim(
          tenantId,
          deliveryKey,
          timestamp,
        ) {
          calls.claims.push({
            tenantId,
            deliveryKey,
            timestamp,
          });
          const staged =
            calls.stages.find(
              (item) =>
                item.deliveryKey ===
                deliveryKey,
            );
          const delivery =
            deliveryFromInput(staged, {
              status: "sending",
              attemptCount: 1,
            });

          return (
            options.claimResult ?? {
              outcome: "claimed",
              delivery,
            }
          );
        },
        async markAccepted(
          tenantId,
          deliveryKey,
          providerMessageId,
          timestamp,
        ) {
          calls.accepted.push({
            tenantId,
            deliveryKey,
            providerMessageId,
            timestamp,
          });
          return {};
        },
        async markRejected(
          tenantId,
          deliveryKey,
          errorCode,
          timestamp,
        ) {
          calls.rejected.push({
            tenantId,
            deliveryKey,
            errorCode,
            timestamp,
          });
          return {};
        },
        async markAmbiguous(
          tenantId,
          deliveryKey,
          errorCode,
          timestamp,
        ) {
          calls.ambiguous.push({
            tenantId,
            deliveryKey,
            errorCode,
            timestamp,
          });
          return {};
        },
      },
      {
        isConfigured() {
          return options.configured !== false;
        },
        async process(prepared) {
          calls.provider.push(prepared);

          if (options.processorError) {
            throw options.processorError;
          }

          return processorResults.shift();
        },
      },
      {
        now() {
          return new Date(currentTimestamp);
        },
      },
    );

  return { calls, service };
}

test("stages every deterministic reply before failing closed for an unavailable provider", async () => {
  const testFixture = fixture({
    configured: false,
    runtimeResult: runtimeResult([
      {
        kind: "text",
        text: "תשובה ראשונה",
      },
      {
        kind: "text",
        text: "תשובה שנייה",
      },
    ]),
  });

  await assert.rejects(
    testFixture.service.process(input()),
    (error) =>
      error instanceof
        BotInboundRuntimeProcessorError &&
      error.code ===
        "PROCESSOR_UNAVAILABLE",
  );
  assert.equal(
    testFixture.calls.stages.length,
    2,
  );
  assert.deepEqual(
    testFixture.calls.stages.map(
      (item) => item.replyIndex,
    ),
    [1, 2],
  );
  assert.notEqual(
    testFixture.calls.stages[0].deliveryKey,
    testFixture.calls.stages[1].deliveryKey,
  );
  assert.deepEqual(
    testFixture.calls.claims,
    [],
  );
});

test("claims and records explicit provider acceptance or rejection", async () => {
  const accepted = fixture();
  const rejected = fixture({
    processorResults: [
      {
        outcome: "rejected",
        errorCode: "POLICY_REJECTED",
      },
    ],
  });

  const acceptedResult =
    await accepted.service.process(input());
  const rejectedResult =
    await rejected.service.process(input());

  assert.equal(acceptedResult.accepted, 1);
  assert.equal(rejectedResult.rejected, 1);
  assert.equal(
    accepted.calls.accepted[0]
      .providerMessageId,
    "wamid.bot-reply-1",
  );
  assert.equal(
    rejected.calls.rejected[0].errorCode,
    "POLICY_REJECTED",
  );
});

test("does not send a settled duplicate and converts an uncertain claim to ambiguity", async () => {
  const settled = fixture({
    stageOutcome: "duplicate",
    stagedDeliveryOverrides: {
      status: "accepted",
      attemptCount: 1,
      providerMessageId:
        "wamid.bot-reply-1",
      acceptedAt: currentTimestamp,
    },
  });
  const uncertainDelivery =
    deliveryFromInput(
      {
        deliveryKey:
          `bot_reply_delivery_v1_${"e".repeat(64)}`,
        tenantId: 7,
        conversationKey,
        inboundMessageKey,
        botFlowKey,
        botFlowVersionKey,
        replyIndex: 1,
        recipientPhoneNumber:
          "+972501234567",
        reply: {
          kind: "text",
          text: "קיבלנו את פנייתך.",
        },
      },
      {
        status: "sending",
        attemptCount: 1,
      },
    );
  const uncertain = fixture({
    claimResult: {
      outcome: "uncertain",
      delivery: uncertainDelivery,
    },
  });

  const settledResult =
    await settled.service.process(input());
  const uncertainResult =
    await uncertain.service.process(input());

  assert.equal(settledResult.duplicates, 1);
  assert.deepEqual(settled.calls.provider, []);
  assert.equal(uncertainResult.ambiguous, 1);
  assert.equal(
    uncertain.calls.ambiguous[0].errorCode,
    "DELIVERY_OUTCOME_UNKNOWN",
  );
  assert.deepEqual(uncertain.calls.provider, []);
});

test("records an unknown external outcome as ambiguous without automatic resend", async () => {
  const testFixture = fixture({
    processorError: new Error(
      "network outcome is unknown",
    ),
  });

  const result =
    await testFixture.service.process(input());

  assert.equal(result.ambiguous, 1);
  assert.equal(
    testFixture.calls.ambiguous.length,
    1,
  );
  assert.deepEqual(
    testFixture.calls.accepted,
    [],
  );
});

test("skips persistence when runtime finds no eligible flow", async () => {
  const testFixture = fixture({
    runtimeResult: {
      outcome: "skipped",
      reason: "no-active-flow",
    },
  });

  const result =
    await testFixture.service.process(input());

  assert.equal(result.runtimeOutcome, "skipped");
  assert.equal(
    result.runtimeSkipReason,
    "no-active-flow",
  );
  assert.deepEqual(
    testFixture.calls.stages,
    [],
  );
});
