import assert from "node:assert/strict";
import test from "node:test";

import {
  BotFlowRuntimeError,
  executeBotFlowTurn,
} from "../server/bot/botFlowRuntime.ts";
import {
  compileKeywordButtonMenuBotFlowComposerDraft,
  compileKeywordSequenceBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";

const blockKey = (character) =>
  `bot_block_v1_${character.repeat(64)}`;
const optionKey = (character) =>
  `bot_option_v1_${character.repeat(64)}`;

test("routes an exact keyword through text to End deterministically", () => {
  const definition = {
    name: "מענה לפי מילת מפתח",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "keyword",
        keywords: ["שירות"],
        matchMode: "exact",
        matchedBlockKey: blockKey("c"),
        unmatchedBlockKey: blockKey("d"),
      },
      {
        blockKey: blockKey("c"),
        type: "text",
        text: "נציג שירות יחזור אליך",
        nextBlockKey: blockKey("e"),
      },
      {
        blockKey: blockKey("d"),
        type: "handoff",
        reason: "no-match",
      },
      {
        blockKey: blockKey("e"),
        type: "end",
      },
    ],
  };

  assert.deepEqual(
    executeBotFlowTurn(definition, {
      lastInboundText: "  שירות  ",
      conversationStatus: "new",
    }),
    {
      outcome: "completed",
      replies: [
        {
          kind: "text",
          text: "נציג שירות יחזור אליך",
        },
      ],
      terminalEffect: {
        outcome: "end",
        stopExecution: true,
        conversationStatus: null,
        assignmentAction: "none",
      },
    },
  );
});

test("executes every compiled reply step once and in editor order", async () => {
  const compiled =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      {
        name: "עדכון מדורג ללקוח",
        keywords: ["עדכון"],
        matchMode: "exact",
        replyTexts: [
          "הבקשה התקבלה.",
          "הצוות בודק את הפרטים.",
          "נעדכן עם סיום הבדיקה.",
        ],
        expectedFlowVersion: null,
      },
    );

  assert.equal(compiled.success, true);
  assert.deepEqual(
    executeBotFlowTurn(compiled.definition, {
      lastInboundText: "עדכון",
      conversationStatus: "new",
    }),
    {
      outcome: "completed",
      replies: [
        {
          kind: "text",
          text: "הבקשה התקבלה.",
        },
        {
          kind: "text",
          text: "הצוות בודק את הפרטים.",
        },
        {
          kind: "text",
          text: "נעדכן עם סיום הבדיקה.",
        },
      ],
      terminalEffect: {
        outcome: "end",
        stopExecution: true,
        conversationStatus: null,
        assignmentAction: "none",
      },
    },
  );
});

test("resumes a compiled button menu at its evidenced awaiting block", async () => {
  const compiled =
    await compileKeywordButtonMenuBotFlowComposerDraft(
      7,
      {
        name: "ניתוב למחלקה",
        keywords: ["עזרה"],
        matchMode: "exact",
        introTexts: [
          "קיבלנו את פנייתך.",
          "בחרו מחלקה.",
        ],
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
  const prompt = executeBotFlowTurn(
    compiled.definition,
    {
      lastInboundText: "עזרה",
      conversationStatus: "bot_active",
    },
  );

  assert.equal(prompt.outcome, "awaiting-input");
  assert.deepEqual(
    prompt.replies.map((reply) => reply.kind),
    ["text", "text", "buttons"],
  );

  const selection = executeBotFlowTurn(
    compiled.definition,
    {
      lastInboundText: "שירות",
      conversationStatus: "bot_active",
      resumeFromBlockKey:
        prompt.awaitingBlockKey,
    },
  );

  assert.equal(selection.outcome, "completed");
  assert.deepEqual(selection.replies, [
    {
      kind: "text",
      text: "נעביר לשירות.",
    },
  ]);
});

test("uses the unmatched keyword branch for non-text input and requests handoff without assignment", () => {
  const definition = {
    name: "העברה בהיעדר התאמה",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "keyword",
        keywords: ["תמיכה"],
        matchMode: "contains",
        matchedBlockKey: blockKey("c"),
        unmatchedBlockKey: blockKey("d"),
      },
      {
        blockKey: blockKey("c"),
        type: "end",
      },
      {
        blockKey: blockKey("d"),
        type: "handoff",
        reason: "no-match",
      },
    ],
  };

  const result = executeBotFlowTurn(
    definition,
    {
      lastInboundText: null,
      conversationStatus: "new",
    },
  );

  assert.equal(result.outcome, "handoff");
  assert.equal(
    result.terminalEffect.conversationStatus,
    "waiting_for_agent",
  );
  assert.equal(
    result.terminalEffect.assignmentAction,
    "none",
  );
});

test("evaluates inbound text and conversation status conditions", () => {
  const definition = {
    name: "תנאי שיחה",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "condition",
        fact: "last-inbound-text",
        operator: "contains",
        value: "נציג",
        matchedBlockKey: blockKey("c"),
        unmatchedBlockKey: blockKey("d"),
      },
      {
        blockKey: blockKey("c"),
        type: "handoff",
        reason: "customer-request",
      },
      {
        blockKey: blockKey("d"),
        type: "condition",
        fact: "conversation-status",
        operator: "equals",
        value: "bot_active",
        matchedBlockKey: blockKey("e"),
        unmatchedBlockKey: blockKey("f"),
      },
      {
        blockKey: blockKey("e"),
        type: "text",
        text: "השיחה כבר בטיפול הבוט",
        nextBlockKey: blockKey("f"),
      },
      {
        blockKey: blockKey("f"),
        type: "end",
      },
    ],
  };

  assert.equal(
    executeBotFlowTurn(definition, {
      lastInboundText: "אני רוצה נציג",
      conversationStatus: "new",
    }).outcome,
    "handoff",
  );
  assert.deepEqual(
    executeBotFlowTurn(definition, {
      lastInboundText: "מידע",
      conversationStatus: "bot_active",
    }).replies,
    [
      {
        kind: "text",
        text: "השיחה כבר בטיפול הבוט",
      },
    ],
  );
});

test("returns a bounded buttons prompt or follows an exact option label", () => {
  const definition = {
    name: "בחירת מחלקה",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "buttons",
        text: "באיזו מחלקה לבחור?",
        options: [
          {
            optionKey: optionKey("1"),
            label: "מכירות",
            nextBlockKey: blockKey("c"),
          },
          {
            optionKey: optionKey("2"),
            label: "שירות",
            nextBlockKey: blockKey("d"),
          },
        ],
      },
      {
        blockKey: blockKey("c"),
        type: "text",
        text: "הגעת למכירות",
        nextBlockKey: blockKey("e"),
      },
      {
        blockKey: blockKey("d"),
        type: "text",
        text: "הגעת לשירות",
        nextBlockKey: blockKey("e"),
      },
      {
        blockKey: blockKey("e"),
        type: "end",
      },
    ],
  };

  const prompt = executeBotFlowTurn(
    definition,
    {
      lastInboundText: "שלום",
      conversationStatus: "new",
    },
  );
  const selection = executeBotFlowTurn(
    definition,
    {
      lastInboundText: "שירות",
      conversationStatus: "new",
    },
  );

  assert.equal(
    prompt.outcome,
    "awaiting-input",
  );
  assert.equal(
    prompt.awaitingBlockKey,
    blockKey("b"),
  );
  assert.deepEqual(
    prompt.replies[0].options.map(
      (option) => option.label,
    ),
    ["מכירות", "שירות"],
  );
  assert.deepEqual(selection.replies, [
    {
      kind: "text",
      text: "הגעת לשירות",
    },
  ]);
});

test("rejects invalid definitions and unbounded turn input", () => {
  assert.throws(
    () =>
      executeBotFlowTurn(
        {
          name: "Flow לא מחובר",
          blocks: [],
        },
        {
          lastInboundText: "שלום",
          conversationStatus: "new",
        },
      ),
    (error) =>
      error instanceof BotFlowRuntimeError &&
      error.code === "INVALID_DEFINITION",
  );

  const definition = {
    name: "סיום",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "end",
      },
    ],
  };

  assert.throws(
    () =>
      executeBotFlowTurn(definition, {
        lastInboundText: "a".repeat(4_097),
        conversationStatus: "new",
      }),
    (error) =>
      error instanceof BotFlowRuntimeError &&
      error.code === "INVALID_INPUT",
  );
});
