import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowOptionKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";

async function definition(tenantId = 7) {
  const name = "מענה ראשוני ללקוחות";
  const flowKey = await deriveBotFlowKey(
    tenantId,
    name,
  );
  const triggerKey =
    await deriveBotFlowBlockKey(flowKey, 1);
  const textKey =
    await deriveBotFlowBlockKey(flowKey, 2);
  const endKey =
    await deriveBotFlowBlockKey(flowKey, 3);

  return {
    flowKey,
    value: {
      name,
      blocks: [
        {
          blockKey: triggerKey,
          type: "trigger",
          nextBlockKey: textKey,
        },
        {
          blockKey: textKey,
          type: "text",
          text: "כיצד אפשר לעזור?",
          nextBlockKey: endKey,
        },
        {
          blockKey: endKey,
          type: "end",
        },
      ],
    },
  };
}

test("derives one tenant-scoped flow identity from the normalized name", async () => {
  const first = await deriveBotFlowKey(
    7,
    "  מענה ראשוני ללקוחות  ",
  );
  const repeated = await deriveBotFlowKey(
    7,
    "מענה ראשוני ללקוחות",
  );
  const anotherTenant = await deriveBotFlowKey(
    8,
    "מענה ראשוני ללקוחות",
  );

  assert.match(
    first,
    /^bot_flow_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, anotherTenant);
});

test("derives deterministic block and option identities from explicit ordinals", async () => {
  const flowKey = await deriveBotFlowKey(
    7,
    "מענה ראשוני ללקוחות",
  );
  const firstBlock =
    await deriveBotFlowBlockKey(flowKey, 1);
  const repeatedBlock =
    await deriveBotFlowBlockKey(flowKey, 1);
  const secondBlock =
    await deriveBotFlowBlockKey(flowKey, 2);
  const firstOption =
    await deriveBotFlowOptionKey(firstBlock, 1);

  assert.match(
    firstBlock,
    /^bot_block_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    firstOption,
    /^bot_option_v1_[0-9a-f]{64}$/,
  );
  assert.equal(firstBlock, repeatedBlock);
  assert.notEqual(firstBlock, secondBlock);
});

test("derives a canonical version identity independent of block array order", async () => {
  const current = await definition();
  const first = await deriveBotFlowVersionKey(
    7,
    current.flowKey,
    1,
    current.value,
  );
  const reordered = await deriveBotFlowVersionKey(
    7,
    current.flowKey,
    1,
    {
      ...current.value,
      blocks: [...current.value.blocks].reverse(),
    },
  );
  const nextVersion =
    await deriveBotFlowVersionKey(
      7,
      current.flowKey,
      2,
      current.value,
    );

  assert.match(
    first,
    /^bot_flow_version_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, reordered);
  assert.notEqual(first, nextVersion);
});

test("rejects invalid scope, ordinals, definitions, and mismatched flow identity", async () => {
  const current = await definition();
  const anotherFlowKey = await deriveBotFlowKey(
    7,
    "תהליך אחר",
  );

  await assert.rejects(
    deriveBotFlowKey(0, "תהליך"),
    /tenantId/,
  );
  await assert.rejects(
    deriveBotFlowBlockKey(
      current.flowKey,
      0,
    ),
    /ordinal/,
  );
  await assert.rejects(
    deriveBotFlowVersionKey(
      7,
      anotherFlowKey,
      1,
      current.value,
    ),
    /does not match/,
  );
  await assert.rejects(
    deriveBotFlowVersionKey(
      7,
      current.flowKey,
      1,
      {
        name: "מענה ראשוני ללקוחות",
        blocks: [],
      },
    ),
    /definition is invalid/,
  );
});
