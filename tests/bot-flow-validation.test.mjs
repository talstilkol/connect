import assert from "node:assert/strict";
import test from "node:test";

import {
  validateBotFlowDefinition,
} from "../shared/validation/botFlowDefinition.ts";

const blockKey = (character) =>
  `bot_block_v1_${character.repeat(64)}`;
const optionKey = (character) =>
  `bot_option_v1_${character.repeat(64)}`;

function validDefinition() {
  return {
    name: "  מענה ראשוני ללקוחות  ",
    blocks: [
      {
        blockKey: blockKey("a"),
        type: "trigger",
        nextBlockKey: blockKey("b"),
      },
      {
        blockKey: blockKey("b"),
        type: "keyword",
        keywords: ["  תמיכה  ", "שירות"],
        matchMode: "contains",
        matchedBlockKey: blockKey("c"),
        unmatchedBlockKey: blockKey("d"),
      },
      {
        blockKey: blockKey("c"),
        type: "text",
        text: "  כיצד אפשר לעזור?  ",
        nextBlockKey: blockKey("f"),
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
      {
        blockKey: blockKey("f"),
        type: "buttons",
        text: "  בחרו אפשרות  ",
        options: [
          {
            optionKey: optionKey("1"),
            label: "סיום",
            nextBlockKey: blockKey("e"),
          },
          {
            optionKey: optionKey("2"),
            label: "בדיקת מצב",
            nextBlockKey: blockKey("7"),
          },
        ],
      },
      {
        blockKey: blockKey("7"),
        type: "condition",
        fact: "conversation-status",
        operator: "equals",
        value: "bot_active",
        matchedBlockKey: blockKey("e"),
        unmatchedBlockKey: blockKey("d"),
      },
    ],
  };
}

test("normalizes one bounded connected MVP bot graph", () => {
  const result = validateBotFlowDefinition(
    validDefinition(),
  );

  assert.equal(result.success, true);
  assert.equal(
    result.value.name,
    "מענה ראשוני ללקוחות",
  );
  assert.equal(
    result.value.entryBlockKey,
    blockKey("a"),
  );
  assert.deepEqual(
    result.value.blocks.find(
      (block) => block.type === "keyword",
    ).keywords,
    ["שירות", "תמיכה"],
  );
  assert.equal(
    result.value.blocks.find(
      (block) => block.type === "text",
    ).text,
    "כיצד אפשר לעזור?",
  );
  assert.deepEqual(
    validateBotFlowDefinition(result.value),
    result,
  );
});

test("rejects duplicate identities, missing targets, disconnected blocks, and cycles", () => {
  const duplicate = validDefinition();
  duplicate.blocks.find(
    (block) => block.type === "end",
  ).blockKey = blockKey("d");
  duplicate.blocks.find(
    (block) => block.type === "buttons",
  ).options[0].nextBlockKey = blockKey("d");
  duplicate.blocks.find(
    (block) => block.type === "condition",
  ).matchedBlockKey = blockKey("d");

  assert.deepEqual(
    validateBotFlowDefinition(duplicate),
    {
      success: false,
      issues: ["duplicate-block-key"],
    },
  );

  const missingTarget = validDefinition();
  missingTarget.blocks[0].nextBlockKey =
    blockKey("9");

  assert.deepEqual(
    validateBotFlowDefinition(missingTarget),
    {
      success: false,
      issues: ["invalid-reference"],
    },
  );

  const disconnected = validDefinition();
  disconnected.blocks.push({
    blockKey: blockKey("8"),
    type: "end",
  });

  assert.deepEqual(
    validateBotFlowDefinition(disconnected),
    {
      success: false,
      issues: ["disconnected-block"],
    },
  );

  const cyclic = validDefinition();
  cyclic.blocks.find(
    (block) => block.type === "text",
  ).nextBlockKey = blockKey("b");

  assert.deepEqual(
    validateBotFlowDefinition(cyclic),
    {
      success: false,
      issues: [
        "disconnected-block",
        "cycle-detected",
      ],
    },
  );
});

test("requires exactly one trigger and rejects unsupported execution blocks", () => {
  const missingTrigger = validDefinition();
  missingTrigger.blocks =
    missingTrigger.blocks.filter(
      (block) => block.type !== "trigger",
    );

  assert.deepEqual(
    validateBotFlowDefinition(missingTrigger),
    {
      success: false,
      issues: ["invalid-trigger"],
    },
  );

  const unsupported = validDefinition();
  unsupported.blocks[2] = {
    blockKey: blockKey("c"),
    type: "ai",
    prompt: "אסור בשלב זה",
  };

  assert.deepEqual(
    validateBotFlowDefinition(unsupported),
    {
      success: false,
      issues: ["invalid-block"],
    },
  );
});

test("rejects unsafe keyword, button, and condition configuration", () => {
  const duplicateKeyword = validDefinition();
  duplicateKeyword.blocks.find(
    (block) => block.type === "keyword",
  ).keywords = ["שירות", " שירות "];

  assert.deepEqual(
    validateBotFlowDefinition(duplicateKeyword),
    {
      success: false,
      issues: ["invalid-block"],
    },
  );

  const duplicateButton = validDefinition();
  const buttons = duplicateButton.blocks.find(
    (block) => block.type === "buttons",
  );
  buttons.options[1].label = " סיום ";

  assert.deepEqual(
    validateBotFlowDefinition(duplicateButton),
    {
      success: false,
      issues: ["invalid-block"],
    },
  );

  const invalidCondition = validDefinition();
  invalidCondition.blocks.find(
    (block) => block.type === "condition",
  ).operator = "contains";

  assert.deepEqual(
    validateBotFlowDefinition(invalidCondition),
    {
      success: false,
      issues: ["invalid-block"],
    },
  );
});

test("rejects extended objects and unbounded definitions", () => {
  assert.deepEqual(
    validateBotFlowDefinition({
      ...validDefinition(),
      tenantId: 7,
    }),
    {
      success: false,
      issues: ["invalid-input"],
    },
  );

  const tooLarge = validDefinition();
  tooLarge.blocks = Array.from(
    { length: 101 },
    (_, index) => ({
      blockKey: blockKey(
        (index % 10).toString(),
      ),
      type: "end",
    }),
  );

  assert.deepEqual(
    validateBotFlowDefinition(tooLarge),
    {
      success: false,
      issues: ["invalid-block-count"],
    },
  );
});
