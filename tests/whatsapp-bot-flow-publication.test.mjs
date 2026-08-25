import assert from "node:assert/strict";
import test from "node:test";

import {
  validateWhatsappBotFlowPublication,
  WHATSAPP_REPLY_BUTTON_LABEL_MAXIMUM_LENGTH,
  WHATSAPP_REPLY_BUTTON_MAXIMUM_COUNT,
} from "../shared/validation/whatsappBotFlowPublication.ts";

const key = (prefix, character) =>
  `${prefix}${character.repeat(64)}`;
const triggerKey = key("bot_block_v1_", "a");
const buttonsKey = key("bot_block_v1_", "b");
const endKey = key("bot_block_v1_", "c");

function definition(options) {
  return {
    name: "WhatsApp publication policy",
    entryBlockKey: triggerKey,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: buttonsKey,
      },
      {
        blockKey: buttonsKey,
        type: "buttons",
        text: "Choose",
        options,
      },
      {
        blockKey: endKey,
        type: "end",
      },
    ],
  };
}

function option(index, label = `Option ${index}`) {
  return {
    optionKey: key(
      "bot_option_v1_",
      String(index),
    ),
    label,
    nextBlockKey: endKey,
  };
}

test("accepts the exact WhatsApp reply-button boundary", () => {
  assert.deepEqual(
    validateWhatsappBotFlowPublication(
      definition([
        option(1, "A".repeat(
          WHATSAPP_REPLY_BUTTON_LABEL_MAXIMUM_LENGTH,
        )),
        option(2),
        option(3),
      ]),
    ),
    { success: true },
  );
  assert.equal(
    WHATSAPP_REPLY_BUTTON_MAXIMUM_COUNT,
    3,
  );
});

test("blocks excessive button count and title length without conversion", () => {
  assert.deepEqual(
    validateWhatsappBotFlowPublication(
      definition([
        option(1, "A".repeat(21)),
        option(2),
        option(3),
        option(4),
      ]),
    ),
    {
      success: false,
      issues: [
        "whatsapp-button-count-exceeded",
        "whatsapp-button-label-too-long",
      ],
    },
  );
});
