import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBotFlowStatusTransition,
  resolveBotFlowTerminalEffect,
} from "../server/bot/botFlowLifecycle.ts";

const blockKey =
  `bot_block_v1_${"a".repeat(64)}`;

test("allows only explicit bot flow lifecycle transitions", () => {
  assert.equal(
    resolveBotFlowStatusTransition(
      "draft",
      "publish",
    ),
    "active",
  );
  assert.equal(
    resolveBotFlowStatusTransition(
      "active",
      "deactivate",
    ),
    "inactive",
  );
  assert.equal(
    resolveBotFlowStatusTransition(
      "inactive",
      "activate",
    ),
    "active",
  );
  assert.equal(
    resolveBotFlowStatusTransition(
      "draft",
      "activate",
    ),
    null,
  );
  assert.equal(
    resolveBotFlowStatusTransition(
      "active",
      "publish",
    ),
    null,
  );
});

test("stops bot execution for handoff without selecting or replacing an agent", () => {
  assert.deepEqual(
    resolveBotFlowTerminalEffect({
      blockKey,
      type: "handoff",
      reason: "customer-request",
    }),
    {
      outcome: "handoff",
      stopExecution: true,
      conversationStatus:
        "waiting_for_agent",
      assignmentAction: "none",
      reason: "customer-request",
    },
  );
});

test("ends only the bot execution without closing the conversation implicitly", () => {
  assert.deepEqual(
    resolveBotFlowTerminalEffect({
      blockKey,
      type: "end",
    }),
    {
      outcome: "end",
      stopExecution: true,
      conversationStatus: null,
      assignmentAction: "none",
    },
  );
});
