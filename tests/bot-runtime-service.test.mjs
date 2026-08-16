import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  compileKeywordButtonMenuBotFlowComposerDraft,
  compileKeywordHandoffBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";
import {
  BotRuntimeServiceError,
  createBotRuntimeService,
} from "../server/bot/botRuntimeService.ts";

const conversationKey =
  `conversation_v1_${"c".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"d".repeat(64)}`;

async function activeFlowFixture(
  tenantId = 7,
) {
  const name = "מענה שירות פעיל";
  const botFlowKey = await deriveBotFlowKey(
    tenantId,
    name,
  );
  const triggerKey =
    await deriveBotFlowBlockKey(botFlowKey, 1);
  const keywordKey =
    await deriveBotFlowBlockKey(botFlowKey, 2);
  const textKey =
    await deriveBotFlowBlockKey(botFlowKey, 3);
  const handoffKey =
    await deriveBotFlowBlockKey(botFlowKey, 4);
  const endKey =
    await deriveBotFlowBlockKey(botFlowKey, 5);
  const definition = {
    name,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: keywordKey,
      },
      {
        blockKey: keywordKey,
        type: "keyword",
        keywords: ["מידע"],
        matchMode: "contains",
        matchedBlockKey: textKey,
        unmatchedBlockKey: handoffKey,
      },
      {
        blockKey: textKey,
        type: "text",
        text: "המידע נמצא בטיפול",
        nextBlockKey: endKey,
      },
      {
        blockKey: handoffKey,
        type: "handoff",
        reason: "no-match",
      },
      {
        blockKey: endKey,
        type: "end",
      },
    ],
  };
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      tenantId,
      botFlowKey,
      1,
      definition,
    );
  const canonicalDefinition = {
    name,
    entryBlockKey: triggerKey,
    blocks: [...definition.blocks].sort(
      (first, second) =>
        first.blockKey < second.blockKey
          ? -1
          : first.blockKey >
              second.blockKey
            ? 1
            : 0,
    ),
  };

  return {
    flow: {
      botFlowKey,
      tenantId,
      name,
      status: "active",
      latestVersionKey:
        botFlowVersionKey,
      latestVersionNumber: 1,
      activeVersionKey:
        botFlowVersionKey,
      version: 2,
      createdAt: "2026-07-26 09:00:00",
      updatedAt: "2026-07-26 09:05:00",
    },
    version: {
      botFlowVersionKey,
      botFlowKey,
      tenantId,
      versionNumber: 1,
      status: "published",
      definition: canonicalDefinition,
      publishedAt:
        "2026-07-26 09:05:00",
      createdAt: "2026-07-26 09:00:00",
    },
  };
}

async function activeButtonMenuFixture() {
  const compiled =
    await compileKeywordButtonMenuBotFlowComposerDraft(
      7,
      {
        name: "ניתוב פעיל למחלקה",
        keywords: ["עזרה"],
        matchMode: "exact",
        introTexts: ["בחרו מחלקה."],
        buttonText: "באיזו מחלקה לבחור?",
        options: [
          {
            label: "מכירות",
            replyText: "נעביר למכירות.",
          },
          {
            label: "שירות",
            replyText: "נעביר לשירות.",
          },
        ],
        expectedFlowVersion: null,
      },
    );

  assert.equal(compiled.success, true);
  const botFlowKey = await deriveBotFlowKey(
    7,
    compiled.definition.name,
  );
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      7,
      botFlowKey,
      1,
      compiled.definition,
    );

  return {
    flow: {
      botFlowKey,
      tenantId: 7,
      name: compiled.definition.name,
      status: "active",
      latestVersionKey: botFlowVersionKey,
      latestVersionNumber: 1,
      activeVersionKey: botFlowVersionKey,
      version: 2,
      createdAt: "2026-07-26 09:00:00",
      updatedAt: "2026-07-26 09:05:00",
    },
    version: {
      botFlowVersionKey,
      botFlowKey,
      tenantId: 7,
      versionNumber: 1,
      status: "published",
      definition: compiled.definition,
      publishedAt: "2026-07-26 09:05:00",
      createdAt: "2026-07-26 09:00:00",
    },
  };
}

async function activeHandoffFixture() {
  const compiled =
    await compileKeywordHandoffBotFlowComposerDraft(
      7,
      {
        name: "העברה פעילה לנציג",
        keywords: ["נציג"],
        matchMode: "contains",
        handoffReason: "customer-request",
        expectedFlowVersion: null,
      },
    );

  assert.equal(compiled.success, true);
  const botFlowKey = await deriveBotFlowKey(
    7,
    compiled.definition.name,
  );
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      7,
      botFlowKey,
      1,
      compiled.definition,
    );

  return {
    flow: {
      botFlowKey,
      tenantId: 7,
      name: compiled.definition.name,
      status: "active",
      latestVersionKey: botFlowVersionKey,
      latestVersionNumber: 1,
      activeVersionKey: botFlowVersionKey,
      version: 2,
      createdAt: "2026-07-26 09:00:00",
      updatedAt: "2026-07-26 09:05:00",
    },
    version: {
      botFlowVersionKey,
      botFlowKey,
      tenantId: 7,
      versionNumber: 1,
      status: "published",
      definition: compiled.definition,
      publishedAt: "2026-07-26 09:05:00",
      createdAt: "2026-07-26 09:00:00",
    },
  };
}

function conversation(overrides = {}) {
  return {
    conversationKey,
    tenantId: 7,
    status: "new",
    assignedExternalUserId: null,
    version: 3,
    ...overrides,
  };
}

function fixture(active, options = {}) {
  const calls = {
    conversations: [],
    continuations: [],
    activeFlows: [],
    versions: [],
    handoffs: [],
  };
  const flows = {
    async listActiveByTenant(tenantId, limit) {
      calls.activeFlows.push({
        tenantId,
        limit,
      });

      if (options.activeFlowError) {
        throw options.activeFlowError;
      }

      return options.activeFlows ??
        (active ? [active.flow] : []);
    },
    async findVersionByKey(
      tenantId,
      botFlowKey,
      botFlowVersionKey,
    ) {
      calls.versions.push({
        tenantId,
        botFlowKey,
        botFlowVersionKey,
      });

      if (options.versionError) {
        throw options.versionError;
      }

      return options.version ??
        active?.version ??
        null;
    },
  };
  const runtime = {
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

      return Object.hasOwn(
        options,
        "conversation",
      )
        ? options.conversation
        : conversation();
    },
    async findAcceptedButtonContinuation(
      tenantId,
      currentConversationKey,
      currentInboundMessageKey,
    ) {
      calls.continuations.push({
        tenantId,
        conversationKey:
          currentConversationKey,
        inboundMessageKey:
          currentInboundMessageKey,
      });

      if (options.continuationError) {
        throw options.continuationError;
      }

      return (
        options.continuation ?? {
          outcome: "none",
        }
      );
    },
    async applyHandoff(
      tenantId,
      currentConversationKey,
      expectedVersion,
    ) {
      calls.handoffs.push({
        tenantId,
        conversationKey:
          currentConversationKey,
        expectedVersion,
      });

      if (options.handoffError) {
        throw options.handoffError;
      }

      return (
        options.handoffResult ?? {
          outcome: "updated",
          state: conversation({
            status: "waiting_for_agent",
            version: expectedVersion + 1,
          }),
        }
      );
    },
  };

  return {
    calls,
    service: createBotRuntimeService(
      flows,
      runtime,
    ),
  };
}

test("skips missing, assigned, and ineligible conversations before flow lookup", async () => {
  const active = await activeFlowFixture();
  const cases = [
    {
      conversation: null,
      reason: "conversation-not-found",
    },
    {
      conversation: conversation({
        assignedExternalUserId: "agent-id",
      }),
      reason: "assignment-locked",
    },
    {
      conversation: conversation({
        status: "waiting_for_agent",
      }),
      reason: "conversation-ineligible",
    },
  ];

  for (const item of cases) {
    const testFixture = fixture(active, {
      conversation: item.conversation,
    });

    assert.deepEqual(
      await testFixture.service.processInbound(
        7,
        conversationKey,
        inboundMessageKey,
        "מידע",
      ),
      {
        outcome: "skipped",
        reason: item.reason,
      },
    );
    assert.deepEqual(
      testFixture.calls.activeFlows,
      [],
    );
  }
});

test("fails closed for zero or multiple active flows without choosing one", async () => {
  const active = await activeFlowFixture();
  const none = fixture(active, {
    activeFlows: [],
  });
  const multiple = fixture(active, {
    activeFlows: [
      active.flow,
      {
        ...active.flow,
        botFlowKey:
          `bot_flow_v1_${"f".repeat(64)}`,
      },
    ],
  });

  assert.deepEqual(
    await none.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "מידע",
    ),
    {
      outcome: "skipped",
      reason: "no-active-flow",
    },
  );
  assert.deepEqual(
    await multiple.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "מידע",
    ),
    {
      outcome: "skipped",
      reason: "ambiguous-active-flow",
    },
  );
  assert.deepEqual(
    multiple.calls.versions,
    [],
  );
});

test("returns a reply plan without mutating conversation state", async () => {
  const active = await activeFlowFixture();
  const testFixture = fixture(active);

  const result =
    await testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "בקשת מידע",
    );

  assert.equal(result.outcome, "planned");
  assert.equal(
    result.conversationVersion,
    3,
  );
  assert.deepEqual(result.plan.replies, [
    {
      kind: "text",
      text: "המידע נמצא בטיפול",
    },
  ]);
  assert.deepEqual(
    testFixture.calls.handoffs,
    [],
  );
});

test("resumes only from an accepted button delivery tied to the current active version", async () => {
  const active = await activeButtonMenuFixture();
  const buttons =
    active.version.definition.blocks.find(
      (block) => block.type === "buttons",
    );

  assert.ok(buttons);
  const testFixture = fixture(active, {
    continuation: {
      outcome: "found",
      evidence: {
        botFlowVersionKey:
          active.version.botFlowVersionKey,
        replyJson: JSON.stringify({
          kind: "buttons",
          text: buttons.text,
          options: buttons.options.map(
            (option) => ({
              optionKey: option.optionKey,
              label: option.label,
            }),
          ),
        }),
        acceptedAt:
          "2026-07-26T09:05:00.000Z",
      },
    },
  });

  const result =
    await testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "שירות",
    );

  assert.equal(result.outcome, "planned");
  assert.equal(result.plan.outcome, "completed");
  assert.deepEqual(result.plan.replies, [
    {
      kind: "text",
      text: "נעביר לשירות.",
    },
  ]);
  assert.deepEqual(
    testFixture.calls.continuations,
    [
      {
        tenantId: 7,
        conversationKey,
        inboundMessageKey,
      },
    ],
  );
});

test("fails closed for missing current-message evidence or ambiguous continuation", async () => {
  const active = await activeButtonMenuFixture();
  const cases = [
    [
      { outcome: "current-message-not-found" },
      "PERSISTENCE_FAILED",
    ],
    [
      { outcome: "ambiguous" },
      "FLOW_CONFIGURATION_INVALID",
    ],
  ];

  for (const [continuation, code] of cases) {
    const testFixture = fixture(active, {
      continuation,
    });

    await assert.rejects(
      testFixture.service.processInbound(
        7,
        conversationKey,
        inboundMessageKey,
        "שירות",
      ),
      (error) =>
        error instanceof BotRuntimeServiceError &&
        error.code === code,
    );
  }
});

test("rejects continuation evidence that does not identify exactly one button block", async () => {
  const active = await activeButtonMenuFixture();
  const testFixture = fixture(active, {
    continuation: {
      outcome: "found",
      evidence: {
        botFlowVersionKey:
          active.version.botFlowVersionKey,
        replyJson: JSON.stringify({
          kind: "buttons",
          text: "תפריט שלא נשלח",
          options: [],
        }),
        acceptedAt:
          "2026-07-26T09:05:00.000Z",
      },
    },
  });

  await assert.rejects(
    testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "שירות",
    ),
    (error) =>
      error instanceof BotRuntimeServiceError &&
      error.code ===
        "FLOW_CONFIGURATION_INVALID",
  );
});

test("applies handoff with the exact conversation version and never assigns an agent", async () => {
  const active = await activeFlowFixture();
  const testFixture = fixture(active);

  const result =
    await testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "לא מצאתי התאמה",
    );

  assert.equal(
    result.outcome,
    "handoff-applied",
  );
  assert.equal(
    result.conversation.status,
    "waiting_for_agent",
  );
  assert.equal(
    result.conversation
      .assignedExternalUserId,
    null,
  );
  assert.equal(
    result.plan.terminalEffect
      .assignmentAction,
    "none",
  );
  assert.deepEqual(
    testFixture.calls.handoffs,
    [
      {
        tenantId: 7,
        conversationKey,
        expectedVersion: 3,
      },
    ],
  );
});

test("applies a compiled keyword handoff only on the matched branch", async () => {
  const active = await activeHandoffFixture();
  const matchedFixture = fixture(active);
  const unmatchedFixture = fixture(active);

  const matched =
    await matchedFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "אני מבקש נציג",
    );
  const unmatched =
    await unmatchedFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "מה שעות הפעילות?",
    );

  assert.equal(
    matched.outcome,
    "handoff-applied",
  );
  assert.deepEqual(matched.plan.replies, []);
  assert.equal(unmatched.outcome, "planned");
  assert.equal(
    unmatched.plan.outcome,
    "completed",
  );
  assert.deepEqual(
    matchedFixture.calls.handoffs,
    [
      {
        tenantId: 7,
        conversationKey,
        expectedVersion: 3,
      },
    ],
  );
  assert.deepEqual(
    unmatchedFixture.calls.handoffs,
    [],
  );
});

test("fails closed before handoff when a graph would send and transfer in one turn", async () => {
  const active = await activeFlowFixture();
  const handoffBlock =
    active.version.definition.blocks.find(
      (block) => block.type === "handoff",
    );
  const triggerBlock =
    active.version.definition.blocks.find(
      (block) => block.type === "trigger",
    );
  const keywordBlock =
    active.version.definition.blocks.find(
      (block) => block.type === "keyword",
    );
  const textBlock =
    active.version.definition.blocks.find(
      (block) => block.type === "text",
    );
  const definition = {
    name: active.version.definition.name,
    entryBlockKey: triggerBlock.blockKey,
    blocks: [
      triggerBlock,
      keywordBlock,
      {
        ...textBlock,
        nextBlockKey:
          handoffBlock.blockKey,
      },
      handoffBlock,
    ],
  };
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      7,
      active.flow.botFlowKey,
      1,
      definition,
    );
  const guardedActive = {
    flow: {
      ...active.flow,
      latestVersionKey:
        botFlowVersionKey,
      activeVersionKey:
        botFlowVersionKey,
    },
    version: {
      ...active.version,
      botFlowVersionKey,
      definition: {
        ...definition,
        blocks: [...definition.blocks].sort(
          (first, second) =>
            first.blockKey < second.blockKey
              ? -1
              : first.blockKey >
                  second.blockKey
                ? 1
                : 0,
        ),
      },
    },
  };
  const testFixture = fixture(guardedActive);

  await assert.rejects(
    testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "מידע",
    ),
    (error) =>
      error instanceof BotRuntimeServiceError &&
      error.code ===
        "FLOW_CONFIGURATION_INVALID",
  );
  assert.deepEqual(
    testFixture.calls.handoffs,
    [],
  );
});

test("maps assignment, state, and optimistic concurrency misses without overwriting", async () => {
  const active = await activeFlowFixture();
  const mappings = [
    [
      { outcome: "locked" },
      {
        outcome: "skipped",
        reason: "assignment-locked",
      },
    ],
    [
      { outcome: "invalid-state" },
      {
        outcome: "skipped",
        reason: "conversation-ineligible",
      },
    ],
    [
      { outcome: "conflict" },
      {
        outcome: "conflict",
        reason: "conversation-state-changed",
      },
    ],
  ];

  for (const [handoffResult, expected] of mappings) {
    const testFixture = fixture(active, {
      handoffResult,
    });

    assert.deepEqual(
      await testFixture.service.processInbound(
        7,
        conversationKey,
        inboundMessageKey,
        "לא נמצא",
      ),
      expected,
    );
  }
});

test("rejects a mismatched active snapshot before execution or handoff", async () => {
  const active = await activeFlowFixture();
  const testFixture = fixture(active, {
    version: {
      ...active.version,
      status: "draft",
      publishedAt: null,
    },
  });

  await assert.rejects(
    testFixture.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "לא נמצא",
    ),
    (error) =>
      error instanceof BotRuntimeServiceError &&
      error.code ===
        "FLOW_CONFIGURATION_INVALID",
  );
  assert.deepEqual(
    testFixture.calls.handoffs,
    [],
  );
});

test("rejects invalid input before persistence and sanitizes storage failures", async () => {
  const active = await activeFlowFixture();
  const invalid = fixture(active);
  const failed = fixture(active, {
    conversationError: new Error(
      "private D1 detail",
    ),
  });

  await assert.rejects(
    invalid.service.processInbound(
      0,
      conversationKey,
      inboundMessageKey,
      "מידע",
    ),
    (error) =>
      error instanceof BotRuntimeServiceError &&
      error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    failed.service.processInbound(
      7,
      conversationKey,
      inboundMessageKey,
      "מידע",
    ),
    (error) =>
      error instanceof BotRuntimeServiceError &&
      error.code ===
        "PERSISTENCE_FAILED" &&
      !error.message.includes("private"),
  );
  assert.deepEqual(
    invalid.calls.conversations,
    [],
  );
});
