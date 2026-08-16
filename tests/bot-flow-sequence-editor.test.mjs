import assert from "node:assert/strict";
import test from "node:test";

import {
  appendBotFlowReplyStep,
  createBotFlowReplySteps,
  moveBotFlowReplyStep,
  readBotFlowReplyTexts,
  removeBotFlowReplyStep,
  updateBotFlowReplyStep,
} from "../shared/domain/botFlowSequenceEditor.ts";

test("creates one deterministic reply step without using a client identity", () => {
  const steps = createBotFlowReplySteps([]);

  assert.deepEqual(steps, [
    {
      draftStepKey: "bot_reply_step_draft_v1_1",
      text: "",
    },
  ]);
});

test("adds, edits, and reorders reply steps without mutating prior state", () => {
  const initial = createBotFlowReplySteps([
    "נבדוק את פנייתך.",
  ]);
  const appended = appendBotFlowReplyStep(initial);
  const updated = updateBotFlowReplyStep(
    appended,
    "bot_reply_step_draft_v1_2",
    "נציג יחזור אליך בהקדם.",
  );
  const reordered = moveBotFlowReplyStep(
    updated,
    "bot_reply_step_draft_v1_2",
    "up",
  );

  assert.deepEqual(readBotFlowReplyTexts(initial), [
    "נבדוק את פנייתך.",
  ]);
  assert.deepEqual(
    readBotFlowReplyTexts(reordered),
    [
      "נציג יחזור אליך בהקדם.",
      "נבדוק את פנייתך.",
    ],
  );
  assert.deepEqual(
    reordered.map((step) => step.draftStepKey),
    [
      "bot_reply_step_draft_v1_2",
      "bot_reply_step_draft_v1_1",
    ],
  );
});

test("keeps one required reply and ignores missing or out-of-range edits", () => {
  const single = createBotFlowReplySteps([
    "נשמח לעזור.",
  ]);

  assert.equal(
    removeBotFlowReplyStep(
      single,
      single[0].draftStepKey,
    ),
    single,
  );
  assert.equal(
    moveBotFlowReplyStep(
      single,
      single[0].draftStepKey,
      "up",
    ),
    single,
  );
  assert.deepEqual(
    updateBotFlowReplyStep(
      single,
      "bot_reply_step_draft_v1_9",
      "לא נשמר",
    ),
    single,
  );
});

test("removes only the requested step and keeps draft keys collision-free", () => {
  const threeSteps = appendBotFlowReplyStep(
    appendBotFlowReplyStep(
      createBotFlowReplySteps(["ראשונה"]),
    ),
  );
  const removed = removeBotFlowReplyStep(
    threeSteps,
    "bot_reply_step_draft_v1_2",
  );
  const appended = appendBotFlowReplyStep(removed);

  assert.deepEqual(
    appended.map((step) => step.draftStepKey),
    [
      "bot_reply_step_draft_v1_1",
      "bot_reply_step_draft_v1_3",
      "bot_reply_step_draft_v1_4",
    ],
  );
});
