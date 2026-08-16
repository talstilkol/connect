import assert from "node:assert/strict";
import test from "node:test";

import {
  readKeywordButtonMenuBotFlowComposerDraft,
  readKeywordBotFlowComposerDraft,
  readKeywordConditionBotFlowComposerDraft,
  readKeywordSequenceBotFlowComposerDraft,
} from "../shared/domain/botFlowComposer.ts";
import {
  compileKeywordButtonMenuBotFlowComposerDraft,
  compileKeywordBotFlowComposerDraft,
  compileKeywordConditionBotFlowComposerDraft,
  compileKeywordSequenceBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
} from "../server/bot/botFlowKey.ts";

function composerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    replyText: "קיבלנו את פנייתך.",
    expectedFlowVersion: null,
    ...overrides,
  };
}

function sequenceComposerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    replyTexts: [
      "קיבלנו את פנייתך.",
      "נציג יחזור אליך בהקדם.",
      "אין צורך לשלוח הודעה נוספת.",
    ],
    expectedFlowVersion: null,
    ...overrides,
  };
}

function buttonMenuComposerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    introTexts: [
      "קיבלנו את פנייתך.",
      "בחרו את המחלקה המתאימה.",
    ],
    buttonText: "לאיזו מחלקה לפנות?",
    options: [
      {
        label: "מכירות",
        replyText: "מחלקת מכירות תחזור אליך.",
      },
      {
        label: "שירות",
        replyText: "מחלקת שירות תחזור אליך.",
      },
      {
        label: "כספים",
        replyText: "מחלקת כספים תחזור אליך.",
      },
    ],
    expectedFlowVersion: null,
    ...overrides,
  };
}

function conditionComposerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    introTexts: [
      "קיבלנו את פנייתך.",
      "נבדוק מהו מסלול המענה המתאים.",
    ],
    condition: {
      fact: "last-inbound-text",
      operator: "contains",
      value: "נציג",
      matchedReplyText:
        "הפנייה תועבר לטיפול נציג.",
      unmatchedReplyText:
        "הבוט ימשיך לטפל בפנייה.",
    },
    expectedFlowVersion: null,
    ...overrides,
  };
}

test("compiles the bounded composer input into the deterministic MVP graph", async () => {
  const result =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(result.success, true);

  const flowKey = await deriveBotFlowKey(
    7,
    "מענה לפניות שירות",
  );
  const expectedBlockKeys =
    await Promise.all(
      [1, 2, 3, 4, 5].map((ordinal) =>
        deriveBotFlowBlockKey(
          flowKey,
          ordinal,
        ),
      ),
    );

  assert.equal(
    result.definition.entryBlockKey,
    expectedBlockKeys[0],
  );
  assert.deepEqual(
    new Set(
      result.definition.blocks.map(
        (block) => block.blockKey,
      ),
    ),
    new Set(expectedBlockKeys),
  );
  assert.deepEqual(
    readKeywordBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      replyText: "קיבלנו את פנייתך.",
    },
  );
});

test("produces the same graph for the same tenant and normalized content", async () => {
  const first =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );
  const repeated =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(first.success, true);
  assert.equal(repeated.success, true);
  assert.deepEqual(
    first.definition,
    repeated.definition,
  );
});

test("rejects extended or invalid composer input before graph persistence", async () => {
  const extended =
    await compileKeywordBotFlowComposerDraft(
      7,
      {
        ...composerInput(),
        tenantId: 8,
      },
    );
  const duplicateKeywords =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput({
        keywords: ["שירות", "שירות"],
      }),
    );

  assert.deepEqual(extended, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.equal(
    duplicateKeywords.success,
    false,
  );
  assert.ok(
    duplicateKeywords.issues.includes(
      "invalid-block",
    ),
  );
});

test("does not project advanced graphs into the bounded composer", async () => {
  const compiled =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(compiled.success, true);

  const advancedDefinition = {
    ...compiled.definition,
    blocks:
      compiled.definition.blocks.filter(
        (block) => block.type !== "handoff",
      ),
  };

  assert.equal(
    readKeywordBotFlowComposerDraft(
      advancedDefinition,
    ),
    null,
  );
});

test("compiles an ordered text sequence into one deterministic acyclic graph", async () => {
  const result =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput(),
    );

  assert.equal(result.success, true);
  assert.equal(result.definition.blocks.length, 7);
  assert.deepEqual(
    readKeywordSequenceBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      replyTexts: [
        "קיבלנו את פנייתך.",
        "נציג יחזור אליך בהקדם.",
        "אין צורך לשלוח הודעה נוספת.",
      ],
    },
  );
  assert.equal(
    readKeywordBotFlowComposerDraft(
      result.definition,
    ),
    null,
  );

  const blocksByKey = new Map(
    result.definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const trigger = blocksByKey.get(
    result.definition.entryBlockKey,
  );
  const keyword = blocksByKey.get(
    trigger.nextBlockKey,
  );
  const firstReply = blocksByKey.get(
    keyword.matchedBlockKey,
  );
  const secondReply = blocksByKey.get(
    firstReply.nextBlockKey,
  );
  const thirdReply = blocksByKey.get(
    secondReply.nextBlockKey,
  );
  const end = blocksByKey.get(
    thirdReply.nextBlockKey,
  );

  assert.deepEqual(
    [
      firstReply.text,
      secondReply.text,
      thirdReply.text,
    ],
    sequenceComposerInput().replyTexts,
  );
  assert.equal(end.type, "end");
});

test("keeps single-reply graph identities compatible with the original composer", async () => {
  const legacy =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );
  const sequence =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({
        replyTexts: ["קיבלנו את פנייתך."],
      }),
    );

  assert.equal(legacy.success, true);
  assert.equal(sequence.success, true);
  assert.deepEqual(
    sequence.definition,
    legacy.definition,
  );
});

test("rejects empty, oversized, and extended reply sequences", async () => {
  const empty =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({ replyTexts: [] }),
    );
  const oversized =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({
        replyTexts: Array.from(
          { length: 97 },
          (_, index) => `הודעה ${index + 1}`,
        ),
      }),
    );
  const extended =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      {
        ...sequenceComposerInput(),
        tenantId: 8,
      },
    );

  assert.deepEqual(empty, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.deepEqual(oversized, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.deepEqual(extended, {
    success: false,
    issues: ["invalid-input"],
  });
});

test("compiles a deterministic button menu with one response branch per option", async () => {
  const result =
    await compileKeywordButtonMenuBotFlowComposerDraft(
      7,
      buttonMenuComposerInput(),
    );

  assert.equal(result.success, true);
  assert.equal(result.definition.blocks.length, 10);
  assert.deepEqual(
    readKeywordButtonMenuBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      introTexts: [
        "קיבלנו את פנייתך.",
        "בחרו את המחלקה המתאימה.",
      ],
      buttonText: "לאיזו מחלקה לפנות?",
      options: [
        {
          label: "מכירות",
          replyText:
            "מחלקת מכירות תחזור אליך.",
        },
        {
          label: "שירות",
          replyText:
            "מחלקת שירות תחזור אליך.",
        },
        {
          label: "כספים",
          replyText:
            "מחלקת כספים תחזור אליך.",
        },
      ],
    },
  );

  const buttonBlock =
    result.definition.blocks.find(
      (block) => block.type === "buttons",
    );

  assert.ok(buttonBlock);
  assert.equal(
    new Set(
      buttonBlock.options.map(
        (option) => option.optionKey,
      ),
    ).size,
    3,
  );
  assert.ok(
    buttonBlock.options.every((option) =>
      /^bot_option_v1_[0-9a-f]{64}$/.test(
        option.optionKey,
      ),
    ),
  );
});

test("rejects incomplete, oversized, or extended button-menu drafts", async () => {
  const cases = [
    buttonMenuComposerInput({ introTexts: [] }),
    buttonMenuComposerInput({ options: [] }),
    buttonMenuComposerInput({
      options: Array.from(
        { length: 11 },
        (_, index) => ({
          label: `אפשרות ${index + 1}`,
          replyText: `תשובה ${index + 1}`,
        }),
      ),
    }),
    buttonMenuComposerInput({
      introTexts: Array.from(
        { length: 94 },
        (_, index) => `הודעה ${index + 1}`,
      ),
      options: [
        {
          label: "ראשונה",
          replyText: "תשובה ראשונה",
        },
        {
          label: "שנייה",
          replyText: "תשובה שנייה",
        },
      ],
    }),
    buttonMenuComposerInput({
      options: [
        {
          label: "שירות",
          replyText: "נציג יחזור אליך.",
          optionKey:
            `bot_option_v1_${"a".repeat(64)}`,
        },
      ],
    }),
  ];

  for (const input of cases) {
    assert.deepEqual(
      await compileKeywordButtonMenuBotFlowComposerDraft(
        7,
        input,
      ),
      {
        success: false,
        issues: ["invalid-input"],
      },
    );
  }
});

test("compiles and reads one deterministic condition with two reply branches", async () => {
  const result =
    await compileKeywordConditionBotFlowComposerDraft(
      7,
      conditionComposerInput(),
    );

  assert.equal(result.success, true);
  assert.equal(result.definition.blocks.length, 9);
  assert.deepEqual(
    readKeywordConditionBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      introTexts: [
        "קיבלנו את פנייתך.",
        "נבדוק מהו מסלול המענה המתאים.",
      ],
      condition: {
        fact: "last-inbound-text",
        operator: "contains",
        value: "נציג",
        matchedReplyText:
          "הפנייה תועבר לטיפול נציג.",
        unmatchedReplyText:
          "הבוט ימשיך לטפל בפנייה.",
      },
    },
  );

  const condition = result.definition.blocks.find(
    (block) => block.type === "condition",
  );
  const replies = result.definition.blocks.filter(
    (block) =>
      block.type === "text" &&
      (block.blockKey === condition.matchedBlockKey ||
        block.blockKey === condition.unmatchedBlockKey),
  );

  assert.equal(replies.length, 2);
  assert.equal(
    new Set(
      replies.map((reply) => reply.nextBlockKey),
    ).size,
    1,
  );
});

test("rejects unsafe or extended condition drafts before graph persistence", async () => {
  const cases = [
    conditionComposerInput({ introTexts: [] }),
    conditionComposerInput({
      introTexts: Array.from(
        { length: 94 },
        (_, index) => `הודעה ${index + 1}`,
      ),
    }),
    conditionComposerInput({
      condition: {
        ...conditionComposerInput().condition,
        fact: "conversation-status",
        operator: "contains",
        value: "new",
      },
    }),
    conditionComposerInput({
      condition: {
        ...conditionComposerInput().condition,
        blockKey:
          `bot_block_v1_${"a".repeat(64)}`,
      },
    }),
    {
      ...conditionComposerInput(),
      tenantId: 8,
    },
  ];

  for (const input of cases) {
    const result =
      await compileKeywordConditionBotFlowComposerDraft(
        7,
        input,
      );

    assert.equal(result.success, false);
  }
});

test("fails closed when a condition graph does not retain the exact editable topology", async () => {
  const result =
    await compileKeywordConditionBotFlowComposerDraft(
      7,
      conditionComposerInput(),
    );

  assert.equal(result.success, true);
  const condition = result.definition.blocks.find(
    (block) => block.type === "condition",
  );
  const corrupted = {
    ...result.definition,
    blocks: result.definition.blocks.map((block) =>
      block.blockKey === condition.unmatchedBlockKey
        ? {
            ...block,
            nextBlockKey:
              result.definition.entryBlockKey,
          }
        : block,
    ),
  };

  assert.equal(
    readKeywordConditionBotFlowComposerDraft(
      corrupted,
    ),
    null,
  );
});
