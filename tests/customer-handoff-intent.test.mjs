import assert from "node:assert/strict";
import test from "node:test";

import {
  customerRequestedHuman,
} from "../server/automation/customerHandoffIntent.ts";

test("recognizes only bounded exact handoff commands", () => {
  for (const message of [
    "נציג",
    " נציג   אנושי ",
    "העבר לנציג",
    "אני רוצה נציג",
    "AGENT",
    "Human Agent",
  ]) {
    assert.equal(
      customerRequestedHuman(message),
      true,
    );
  }
});

test("does not guess handoff intent from free-form text", () => {
  for (const message of [
    null,
    "",
    "מה עושה נציג שירות?",
    "agent pricing",
    "אפשר לקבל עזרה?",
    "נציג בבקשה",
  ]) {
    assert.equal(
      customerRequestedHuman(message),
      false,
    );
  }
});

test("fails closed for an oversized value", () => {
  assert.equal(
    customerRequestedHuman(
      "נציג".repeat(1_025),
    ),
    false,
  );
});
