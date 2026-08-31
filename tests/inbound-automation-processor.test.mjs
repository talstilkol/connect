import assert from "node:assert/strict";
import test from "node:test";

import {
  createInboundAutomationProcessor,
} from "../server/automation/inboundAutomationProcessor.ts";

const input = {
  tenantId: 7,
  conversationKey:
    `conversation_v1_${"a".repeat(64)}`,
  inboundMessageKey:
    `message_v1_${"b".repeat(64)}`,
  recipientPhoneNumber: "+972501234567",
  phoneNumberId: "phone-number-id",
  textContent: "שלום",
  selectedBotOptionKey: null,
  replyToProviderMessageId: null,
  inboundMessageOccurredAt:
    "2026-08-21T10:00:00.000Z",
};

function botResult(
  runtimeOutcome,
  runtimeSkipReason = null,
) {
  return {
    runtimeOutcome,
    runtimeSkipReason,
    staged: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    ambiguous: 0,
  };
}

function fixture(
  currentBotResult,
  currentAiResult = {
    outcome: "reply-staged",
    persistenceOutcome: "created",
    approvalRequired: true,
  },
) {
  const calls = {
    bot: [],
    ai: [],
  };
  const processor =
    createInboundAutomationProcessor(
      {
        async process(currentInput) {
          calls.bot.push(currentInput);
          return currentBotResult;
        },
      },
      {
        async process(currentInput) {
          calls.ai.push(currentInput);
          return currentAiResult;
        },
      },
    );

  return { calls, processor };
}

test("gives an active bot exclusive priority over AI", async () => {
  const testFixture = fixture(
    botResult("planned"),
  );

  assert.deepEqual(
    await testFixture.processor.process(
      input,
    ),
    {
      outcome: "bot",
      result: botResult("planned"),
    },
  );
  assert.deepEqual(
    testFixture.calls.ai,
    [],
  );
});

test("tries AI only for the exact no-active-flow bot result", async () => {
  const aiResult = {
    outcome: "reply-staged",
    persistenceOutcome: "created",
    approvalRequired: true,
  };
  const testFixture = fixture(
    botResult(
      "skipped",
      "no-active-flow",
    ),
    aiResult,
  );

  assert.deepEqual(
    await testFixture.processor.process(
      input,
    ),
    {
      outcome: "ai",
      result: aiResult,
    },
  );
  assert.deepEqual(
    testFixture.calls.ai,
    [
      {
        tenantId: input.tenantId,
        conversationKey:
          input.conversationKey,
        inboundMessageKey:
          input.inboundMessageKey,
        recipientPhoneNumber:
          input.recipientPhoneNumber,
        textContent: input.textContent,
        customerRequestedHuman: false,
      },
    ],
  );
});

test("passes a bounded exact customer handoff command to AI", async () => {
  const testFixture = fixture(
    botResult(
      "skipped",
      "no-active-flow",
    ),
    {
      outcome: "handoff-planned",
    },
  );

  await testFixture.processor.process({
    ...input,
    textContent: " נציג   אנושי ",
  });

  assert.equal(
    testFixture.calls.ai[0]
      .customerRequestedHuman,
    true,
  );
});

test("fails closed for bot conflicts, ambiguity, assignment, or ineligible state", async () => {
  const cases = [
    [
      botResult("conflict"),
      "bot-conflict",
    ],
    [
      botResult(
        "skipped",
        "ambiguous-active-flow",
      ),
      "bot-ineligible",
    ],
    [
      botResult(
        "skipped",
        "assignment-locked",
      ),
      "bot-ineligible",
    ],
    [
      botResult(
        "skipped",
        "conversation-ineligible",
      ),
      "bot-ineligible",
    ],
    [
      botResult(
        "policy-skipped",
        "service-window-closed",
      ),
      "bot-ineligible",
    ],
  ];

  for (const [currentBotResult, reason] of cases) {
    const testFixture = fixture(
      currentBotResult,
    );

    assert.deepEqual(
      await testFixture.processor.process(
        input,
      ),
      { outcome: "skipped", reason },
    );
    assert.deepEqual(
      testFixture.calls.ai,
      [],
    );
  }
});

test("returns a bounded skip when no active AI path is available", async () => {
  const testFixture = fixture(
    botResult(
      "skipped",
      "no-active-flow",
    ),
    {
      outcome: "skipped",
      reason: "no-active-agent",
    },
  );

  assert.deepEqual(
    await testFixture.processor.process(
      input,
    ),
    {
      outcome: "skipped",
      reason: "ai-unavailable",
    },
  );
});
