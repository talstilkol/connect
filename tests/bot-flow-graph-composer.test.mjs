import assert from "node:assert/strict";
import test from "node:test";

import {
  readKeywordGraphBotFlowComposerDraft,
} from "../shared/domain/botFlowGraphDraft.ts";
import {
  compileKeywordGraphBotFlowComposerDraft,
} from "../server/bot/botFlowGraphComposer.ts";

function graphComposerInput(overrides = {}) {
  return {
    name: "ניתוב שירות מתקדם",
    keywords: ["ניתוב"],
    matchMode: "exact",
    entryDraftNodeKey: "draft_node_v1_1",
    nodes: [
      {
        draftNodeKey: "draft_node_v1_1",
        type: "text",
        text: "נבדוק לאן לנתב את הפנייה.",
        nextDraftNodeKey: "draft_node_v1_2",
      },
      {
        draftNodeKey: "draft_node_v1_2",
        type: "condition",
        fact: "last-inbound-text",
        operator: "equals",
        value: "לקוח קיים",
        matchedDraftNodeKey: "draft_node_v1_3",
        unmatchedDraftNodeKey: "draft_node_v1_7",
      },
      {
        draftNodeKey: "draft_node_v1_3",
        type: "buttons",
        text: "באיזה נושא הפנייה?",
        options: [
          {
            draftOptionKey: "draft_option_v1_3_1",
            label: "חיוב",
            nextDraftNodeKey: "draft_node_v1_4",
          },
          {
            draftOptionKey: "draft_option_v1_3_2",
            label: "תמיכה",
            nextDraftNodeKey: "draft_node_v1_6",
          },
        ],
      },
      {
        draftNodeKey: "draft_node_v1_4",
        type: "text",
        text: "הפנייה תועבר לצוות החיוב.",
        nextDraftNodeKey: "draft_node_v1_5",
      },
      {
        draftNodeKey: "draft_node_v1_5",
        type: "end",
      },
      {
        draftNodeKey: "draft_node_v1_6",
        type: "condition",
        fact: "conversation-status",
        operator: "equals",
        value: "bot_active",
        matchedDraftNodeKey: "draft_node_v1_4",
        unmatchedDraftNodeKey: "draft_node_v1_7",
      },
      {
        draftNodeKey: "draft_node_v1_7",
        type: "handoff",
        reason: "flow-rule",
      },
    ],
    expectedFlowVersion: null,
    ...overrides,
  };
}

test("compiles every editable node type and free connection without accepting persisted identities", async () => {
  const result =
    await compileKeywordGraphBotFlowComposerDraft(
      7,
      graphComposerInput(),
    );

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.definition.blocks.length, 10);
  assert.equal(
    result.definition.blocks.filter(
      (block) => block.type === "condition",
    ).length,
    2,
  );
  assert.deepEqual(
    new Set(
      result.definition.blocks.map(
        (block) => block.type,
      ),
    ),
    new Set([
      "trigger",
      "keyword",
      "text",
      "buttons",
      "condition",
      "handoff",
      "end",
    ]),
  );
  assert.ok(
    result.definition.blocks.every((block) =>
      /^bot_block_v1_[0-9a-f]{64}$/.test(
        block.blockKey,
      ),
    ),
  );
  const buttons = result.definition.blocks.find(
    (block) => block.type === "buttons",
  );
  assert.ok(buttons);
  assert.ok(
    buttons.options.every((option) =>
      /^bot_option_v1_[0-9a-f]{64}$/.test(
        option.optionKey,
      ),
    ),
  );
});

test("reads a compiled graph back into deterministic draft references without leaking graph keys", async () => {
  const input = graphComposerInput();
  const result =
    await compileKeywordGraphBotFlowComposerDraft(
      7,
      input,
    );

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  const draft =
    readKeywordGraphBotFlowComposerDraft(
      result.definition,
    );

  assert.deepEqual(draft, {
    name: input.name,
    keywords: input.keywords,
    matchMode: input.matchMode,
    entryDraftNodeKey: input.entryDraftNodeKey,
    nodes: input.nodes,
  });
  assert.doesNotMatch(
    JSON.stringify(draft),
    /bot_(?:block|option)_v1_[0-9a-f]{64}/,
  );
});

test("produces one canonical definition when the browser reorders the same connected nodes", async () => {
  const input = graphComposerInput();
  const [ordered, reversed] = await Promise.all([
    compileKeywordGraphBotFlowComposerDraft(
      7,
      input,
    ),
    compileKeywordGraphBotFlowComposerDraft(
      7,
      {
        ...input,
        nodes: [...input.nodes].reverse(),
      },
    ),
  ]);

  assert.equal(ordered.success, true);
  assert.equal(reversed.success, true);

  if (!ordered.success || !reversed.success) {
    return;
  }

  assert.deepEqual(
    reversed.definition,
    ordered.definition,
  );
});

test("rejects forged identities, invalid references, duplicates, cycles, and disconnected nodes", async () => {
  const input = graphComposerInput();
  const cases = [
    {
      ...input,
      blockKey: "bot_block_v1_" + "a".repeat(64),
    },
    {
      ...input,
      entryDraftNodeKey: "draft_node_v1_99",
    },
    {
      ...input,
      nodes: [
        ...input.nodes,
        input.nodes[0],
      ],
    },
    {
      ...input,
      nodes: input.nodes.map((node) =>
        node.type === "text" &&
        node.draftNodeKey === "draft_node_v1_1"
          ? {
              ...node,
              blockKey:
                "bot_block_v1_" +
                "b".repeat(64),
            }
          : node,
      ),
    },
    {
      ...input,
      nodes: input.nodes.map((node) =>
        node.type === "buttons"
          ? {
              ...node,
              options: [
                node.options[0],
                {
                  ...node.options[1],
                  draftOptionKey:
                    node.options[0].draftOptionKey,
                },
              ],
            }
          : node,
      ),
    },
    {
      ...input,
      nodes: input.nodes.map((node) =>
        node.type === "text" &&
        node.draftNodeKey === "draft_node_v1_4"
          ? {
              ...node,
              nextDraftNodeKey:
                "draft_node_v1_1",
            }
          : node,
      ),
    },
    {
      ...input,
      nodes: input.nodes.map((node) =>
        node.type === "condition"
          ? {
              ...node,
              unmatchedDraftNodeKey:
                "draft_node_v1_3",
            }
          : node,
      ),
    },
    {
      ...input,
      nodes: input.nodes.map((node) =>
        node.type === "handoff"
          ? { ...node, reason: "no-match" }
          : node,
      ),
    },
  ];

  for (
    let index = 0;
    index < cases.length;
    index += 1
  ) {
    const result =
      await compileKeywordGraphBotFlowComposerDraft(
        7,
        cases[index],
      );

    assert.equal(
      result.success,
      false,
      `case ${index + 1} must fail closed`,
    );
  }
});

test("does not project a graph that routes an editable node into the reserved no-match handoff", async () => {
  const result =
    await compileKeywordGraphBotFlowComposerDraft(
      7,
      graphComposerInput(),
    );

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  const keyword = result.definition.blocks.find(
    (block) => block.type === "keyword",
  );
  const text = result.definition.blocks.find(
    (block) => block.type === "text",
  );
  assert.ok(keyword);
  assert.ok(text);
  const unsafeDefinition = {
    ...result.definition,
    blocks: result.definition.blocks.map((block) =>
      block.blockKey === text.blockKey
        ? {
            ...block,
            nextBlockKey: keyword.unmatchedBlockKey,
          }
        : block,
    ),
  };

  assert.equal(
    readKeywordGraphBotFlowComposerDraft(
      unsafeDefinition,
    ),
    null,
  );
});
