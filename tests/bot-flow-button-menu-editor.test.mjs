import assert from "node:assert/strict";
import test from "node:test";

import {
  appendBotFlowButtonOption,
  createBotFlowButtonMenuDraft,
  moveBotFlowButtonOption,
  moveBotFlowButtonOptionToPosition,
  readBotFlowButtonOptions,
  removeBotFlowButtonOption,
  updateBotFlowButtonOption,
  updateBotFlowButtonText,
} from "../shared/domain/botFlowButtonMenuEditor.ts";

test("creates one deterministic button option without accepting a persisted identity", () => {
  const draft = createBotFlowButtonMenuDraft(
    "בחרו מחלקה",
    [],
  );

  assert.deepEqual(draft, {
    buttonText: "בחרו מחלקה",
    options: [
      {
        draftOptionKey:
          "bot_button_option_draft_v1_1",
        label: "",
        replyText: "",
      },
    ],
  });
});

test("adds, edits, and reorders options without mutating prior state", () => {
  const initial = createBotFlowButtonMenuDraft(
    "בחרו מחלקה",
    [
      {
        label: "מכירות",
        replyText: "נעביר למכירות.",
      },
    ],
  );
  const withPrompt = updateBotFlowButtonText(
    initial,
    "באיזו מחלקה לבחור?",
  );
  const appended = appendBotFlowButtonOption(
    withPrompt,
    10,
  );
  const withLabel = updateBotFlowButtonOption(
    appended,
    "bot_button_option_draft_v1_2",
    "label",
    "שירות",
  );
  const updated = updateBotFlowButtonOption(
    withLabel,
    "bot_button_option_draft_v1_2",
    "replyText",
    "נעביר לשירות.",
  );
  const reordered = moveBotFlowButtonOption(
    updated,
    "bot_button_option_draft_v1_2",
    "up",
  );

  assert.equal(initial.buttonText, "בחרו מחלקה");
  assert.equal(
    initial.options[0].label,
    "מכירות",
  );
  assert.equal(
    reordered.buttonText,
    "באיזו מחלקה לבחור?",
  );
  assert.deepEqual(
    readBotFlowButtonOptions(reordered),
    [
      {
        label: "שירות",
        replyText: "נעביר לשירות.",
      },
      {
        label: "מכירות",
        replyText: "נעביר למכירות.",
      },
    ],
  );
});

test("moves a dragged option directly to a deterministic target position", () => {
  const initial = createBotFlowButtonMenuDraft(
    "בחרו",
    [
      { label: "א", replyText: "תשובה א" },
      { label: "ב", replyText: "תשובה ב" },
      { label: "ג", replyText: "תשובה ג" },
      { label: "ד", replyText: "תשובה ד" },
    ],
  );
  const moved = moveBotFlowButtonOptionToPosition(
    initial,
    "bot_button_option_draft_v1_1",
    3,
  );

  assert.deepEqual(
    readBotFlowButtonOptions(initial).map(
      (option) => option.label,
    ),
    ["א", "ב", "ג", "ד"],
  );
  assert.deepEqual(
    readBotFlowButtonOptions(moved).map(
      (option) => option.label,
    ),
    ["ב", "ג", "ד", "א"],
  );
  assert.equal(
    moveBotFlowButtonOptionToPosition(
      moved,
      "bot_button_option_draft_v1_3",
      1,
    ),
    moved,
  );
  assert.equal(
    moveBotFlowButtonOptionToPosition(
      moved,
      "bot_button_option_draft_v1_3",
      -1,
    ),
    moved,
  );
});

test("keeps one required option and respects the supplied graph capacity", () => {
  const single = createBotFlowButtonMenuDraft(
    "בחרו",
    [{ label: "שירות", replyText: "נציג" }],
  );

  assert.equal(
    removeBotFlowButtonOption(
      single,
      single.options[0].draftOptionKey,
    ),
    single,
  );
  assert.equal(
    appendBotFlowButtonOption(single, 1),
    single,
  );
  assert.equal(
    moveBotFlowButtonOption(
      single,
      single.options[0].draftOptionKey,
      "up",
    ),
    single,
  );
});

test("removes only the selected option and never reuses its draft key", () => {
  const first = createBotFlowButtonMenuDraft(
    "בחרו",
    [{ label: "א", replyText: "א" }],
  );
  const second = appendBotFlowButtonOption(
    first,
    10,
  );
  const third = appendBotFlowButtonOption(
    second,
    10,
  );
  const removed = removeBotFlowButtonOption(
    third,
    "bot_button_option_draft_v1_2",
  );
  const appended = appendBotFlowButtonOption(
    removed,
    10,
  );

  assert.deepEqual(
    appended.options.map(
      (option) => option.draftOptionKey,
    ),
    [
      "bot_button_option_draft_v1_1",
      "bot_button_option_draft_v1_3",
      "bot_button_option_draft_v1_4",
    ],
  );
});
