import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveProductionDecisionEventKey,
} from "../server/operations/productionDecisionKey.ts";

const identity = {
  checkId: "ai.provider",
  expectedVersion: 0,
  selection:
    "Provider choice approved",
  rationale:
    "The approved decision satisfies product and security review.",
  actorExternalUserId:
    "system-admin-external-id",
};

test("derives a stable purpose-specific production decision event key", async () => {
  const first =
    await deriveProductionDecisionEventKey(
      identity,
    );
  const second =
    await deriveProductionDecisionEventKey({
      ...identity,
    });

  assert.equal(first, second);
  assert.match(
    first,
    /^production_decision_event_v1_[0-9a-f]{64}$/,
  );
});

test("separates decision events by content, version, and actor", async () => {
  const baseline =
    await deriveProductionDecisionEventKey(
      identity,
    );
  const variants = await Promise.all([
    deriveProductionDecisionEventKey({
      ...identity,
      expectedVersion: 1,
    }),
    deriveProductionDecisionEventKey({
      ...identity,
      selection:
        "Different approved choice",
    }),
    deriveProductionDecisionEventKey({
      ...identity,
      rationale:
        "A different approved rationale.",
    }),
    deriveProductionDecisionEventKey({
      ...identity,
      actorExternalUserId:
        "another-system-admin",
    }),
  ]);

  for (const variant of variants) {
    assert.notEqual(variant, baseline);
  }
});

test("rejects unknown checks and malformed bounded values before hashing", async () => {
  for (const invalid of [
    {
      ...identity,
      checkId: "unknown.check",
    },
    {
      ...identity,
      expectedVersion: -1,
    },
    {
      ...identity,
      selection: " ",
    },
    {
      ...identity,
      rationale: "invalid\u0000value",
    },
    {
      ...identity,
      actorExternalUserId:
        " external-user",
    },
  ]) {
    await assert.rejects(
      deriveProductionDecisionEventKey(
        invalid,
      ),
    );
  }
});
