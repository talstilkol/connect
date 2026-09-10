import assert from "node:assert/strict";
import test from "node:test";

import {
  appendBotFlowTwoStepBranch,
  createBotFlowTwoStepButtonMenuDraft,
  moveBotFlowTwoStepBranch,
  readBotFlowTwoStepButtonBranches,
  removeBotFlowTwoStepBranch,
  updateBotFlowTwoStepBranchLabel,
  updateBotFlowTwoStepFirstButtonText,
} from "../shared/domain/botFlowTwoStepButtonMenuEditor.ts";

test("creates and reads deterministic two-step button branches", () => {
  const draft = createBotFlowTwoStepButtonMenuDraft(
    "שאלה ראשונה",
    [
      {
        label: "כן",
        buttonText: "שאלה שנייה",
        options: [
          {
            label: "מכירות",
            replyText: "המשך למכירות",
          },
        ],
      },
    ],
  );

  assert.equal(
    draft.branches[0].draftBranchKey,
    "bot_two_step_branch_draft_v1_1",
  );
  assert.equal(
    draft.branches[0].menu.options[0]
      .draftOptionKey,
    "bot_button_option_draft_v1_1",
  );
  assert.deepEqual(
    readBotFlowTwoStepButtonBranches(draft),
    [
      {
        label: "כן",
        buttonText: "שאלה שנייה",
        options: [
          {
            label: "מכירות",
            replyText: "המשך למכירות",
          },
        ],
      },
    ],
  );
});

test("adds, edits, moves, and removes branches with deterministic draft keys", () => {
  const initial =
    createBotFlowTwoStepButtonMenuDraft("", []);
  const firstKey =
    initial.branches[0].draftBranchKey;
  const withSecond = appendBotFlowTwoStepBranch(
    updateBotFlowTwoStepBranchLabel(
      updateBotFlowTwoStepFirstButtonText(
        initial,
        "שאלה ראשונה",
      ),
      firstKey,
      "כן",
    ),
  );
  const secondKey =
    withSecond.branches[1].draftBranchKey;
  const reordered = moveBotFlowTwoStepBranch(
    withSecond,
    secondKey,
    "up",
  );
  const removed = removeBotFlowTwoStepBranch(
    reordered,
    secondKey,
  );
  const appendedAgain = appendBotFlowTwoStepBranch(
    removed,
  );

  assert.equal(
    reordered.branches[0].draftBranchKey,
    secondKey,
  );
  assert.equal(removed.branches.length, 1);
  assert.equal(
    appendedAgain.branches[1].draftBranchKey,
    "bot_two_step_branch_draft_v1_2",
  );
  assert.equal(
    appendedAgain.firstButtonText,
    "שאלה ראשונה",
  );
});

test("keeps one required branch and caps the first question at ten branches", () => {
  const initial =
    createBotFlowTwoStepButtonMenuDraft("", []);
  const unchanged = removeBotFlowTwoStepBranch(
    initial,
    initial.branches[0].draftBranchKey,
  );
  let bounded = initial;

  for (let index = 0; index < 12; index += 1) {
    bounded = appendBotFlowTwoStepBranch(
      bounded,
    );
  }

  assert.equal(unchanged, initial);
  assert.equal(bounded.branches.length, 10);
  assert.equal(
    new Set(
      bounded.branches.map(
        (branch) => branch.draftBranchKey,
      ),
    ).size,
    10,
  );
});
