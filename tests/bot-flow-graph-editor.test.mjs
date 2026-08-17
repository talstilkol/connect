import assert from "node:assert/strict";
import test from "node:test";

import {
  appendBotFlowGraphButtonOption,
  appendBotFlowGraphNode,
  countBotFlowGraphNodeReferences,
  createBotFlowGraphEditorDraft,
  isBotFlowGraphEditorDraftComplete,
  moveBotFlowGraphButtonOption,
  moveBotFlowGraphNode,
  removeBotFlowGraphButtonOption,
  removeBotFlowGraphNode,
  updateBotFlowGraphButtonOption,
  updateBotFlowGraphEntry,
  updateBotFlowGraphNode,
} from "../shared/domain/botFlowGraphEditor.ts";

function completeTextDraft() {
  const draft = createBotFlowGraphEditorDraft();
  const text = draft.nodes[0];

  assert.equal(text.type, "text");

  return updateBotFlowGraphNode(draft, {
    ...text,
    text: "הפנייה התקבלה ותטופל.",
  });
}

test("creates one deterministic blank Text-to-End graph and validates only complete content", () => {
  const draft = createBotFlowGraphEditorDraft();

  assert.deepEqual(draft, {
    entryDraftNodeKey: "draft_node_v1_1",
    nodes: [
      {
        draftNodeKey: "draft_node_v1_1",
        type: "text",
        text: "",
        nextDraftNodeKey: "draft_node_v1_2",
      },
      {
        draftNodeKey: "draft_node_v1_2",
        type: "end",
      },
    ],
  });
  assert.equal(
    isBotFlowGraphEditorDraftComplete(draft),
    false,
  );
  assert.equal(
    isBotFlowGraphEditorDraftComplete(
      completeTextDraft(),
    ),
    true,
  );
});

test("adds and connects Conditions, Buttons, Handoff, and End without persistent keys", () => {
  let draft = completeTextDraft();
  draft = appendBotFlowGraphNode(
    draft,
    "condition",
  );
  draft = appendBotFlowGraphNode(draft, "buttons");
  draft = appendBotFlowGraphNode(draft, "handoff");
  const text = draft.nodes.find(
    (node) => node.type === "text",
  );
  const condition = draft.nodes.find(
    (node) => node.type === "condition",
  );
  const buttons = draft.nodes.find(
    (node) => node.type === "buttons",
  );
  const handoff = draft.nodes.find(
    (node) => node.type === "handoff",
  );
  const end = draft.nodes.find(
    (node) => node.type === "end",
  );

  assert.ok(text && text.type === "text");
  assert.ok(condition && condition.type === "condition");
  assert.ok(buttons && buttons.type === "buttons");
  assert.ok(handoff && handoff.type === "handoff");
  assert.ok(end && end.type === "end");

  draft = updateBotFlowGraphNode(draft, {
    ...text,
    nextDraftNodeKey: condition.draftNodeKey,
  });
  draft = updateBotFlowGraphNode(draft, {
    ...condition,
    value: "חיוב",
    matchedDraftNodeKey: buttons.draftNodeKey,
    unmatchedDraftNodeKey: handoff.draftNodeKey,
  });
  draft = updateBotFlowGraphNode(draft, {
    ...buttons,
    text: "כיצד להמשיך?",
    options: [
      {
        ...buttons.options[0],
        label: "סיום",
        nextDraftNodeKey: end.draftNodeKey,
      },
    ],
  });

  assert.equal(
    isBotFlowGraphEditorDraftComplete(draft),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(draft),
    /bot_(?:block|option)_v1_[0-9a-f]{64}/,
  );
});

test("blocks removal of the entry or a referenced node and removes an unreferenced node", () => {
  let draft = completeTextDraft();
  draft = appendBotFlowGraphNode(draft, "handoff");
  const entryKey = draft.entryDraftNodeKey;
  const end = draft.nodes.find(
    (node) => node.type === "end",
  );
  const handoff = draft.nodes.find(
    (node) => node.type === "handoff",
  );

  assert.ok(end);
  assert.ok(handoff);
  assert.equal(
    countBotFlowGraphNodeReferences(
      draft,
      end.draftNodeKey,
    ),
    1,
  );
  assert.equal(
    removeBotFlowGraphNode(draft, entryKey),
    draft,
  );
  assert.equal(
    removeBotFlowGraphNode(
      draft,
      end.draftNodeKey,
    ),
    draft,
  );

  const withoutHandoff = removeBotFlowGraphNode(
    draft,
    handoff.draftNodeKey,
  );
  assert.equal(withoutHandoff.nodes.length, 2);
});

test("reorders node cards without changing connections and changes the entry only to an existing node", () => {
  let draft = completeTextDraft();
  draft = appendBotFlowGraphNode(draft, "handoff");
  const handoff = draft.nodes.at(-1);

  assert.ok(handoff);
  const moved = moveBotFlowGraphNode(
    draft,
    handoff.draftNodeKey,
    "up",
  );
  assert.equal(
    moved.nodes.at(-2)?.draftNodeKey,
    handoff.draftNodeKey,
  );
  assert.equal(
    moved.entryDraftNodeKey,
    draft.entryDraftNodeKey,
  );
  assert.equal(
    updateBotFlowGraphEntry(
      moved,
      "draft_node_v1_99",
    ),
    moved,
  );
  assert.equal(
    updateBotFlowGraphEntry(
      moved,
      handoff.draftNodeKey,
    ).entryDraftNodeKey,
    handoff.draftNodeKey,
  );
});

test("adds, edits, moves, and removes bounded button connections", () => {
  let draft = appendBotFlowGraphNode(
    completeTextDraft(),
    "buttons",
  );
  const buttons = draft.nodes.find(
    (node) => node.type === "buttons",
  );
  const end = draft.nodes.find(
    (node) => node.type === "end",
  );

  assert.ok(buttons && buttons.type === "buttons");
  assert.ok(end);
  let nextButtons = appendBotFlowGraphButtonOption(
    buttons,
    end.draftNodeKey,
  );
  nextButtons = updateBotFlowGraphButtonOption(
    nextButtons,
    {
      ...nextButtons.options[1],
      label: "נציג",
    },
  );
  nextButtons = moveBotFlowGraphButtonOption(
    nextButtons,
    nextButtons.options[1].draftOptionKey,
    "up",
  );

  assert.equal(nextButtons.options[0].label, "נציג");
  nextButtons = removeBotFlowGraphButtonOption(
    nextButtons,
    nextButtons.options[0].draftOptionKey,
  );
  assert.equal(nextButtons.options.length, 1);

  draft = updateBotFlowGraphNode(
    draft,
    nextButtons,
  );
  assert.equal(
    draft.nodes.find(
      (node) => node.type === "buttons",
    )?.type,
    "buttons",
  );
});

test("rejects cycles and disconnected nodes before save", () => {
  let draft = completeTextDraft();
  draft = appendBotFlowGraphNode(draft, "text");
  const first = draft.nodes[0];
  const disconnected = draft.nodes.at(-1);

  assert.ok(first.type === "text");
  assert.ok(disconnected?.type === "text");
  assert.equal(
    isBotFlowGraphEditorDraftComplete(draft),
    false,
  );

  draft = updateBotFlowGraphNode(draft, {
    ...first,
    nextDraftNodeKey: disconnected.draftNodeKey,
  });
  draft = updateBotFlowGraphNode(draft, {
    ...disconnected,
    text: "המשך טיפול.",
    nextDraftNodeKey: first.draftNodeKey,
  });
  assert.equal(
    isBotFlowGraphEditorDraftComplete(draft),
    false,
  );
});
