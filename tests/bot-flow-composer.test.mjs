import assert from "node:assert/strict";
import test from "node:test";

import {
  readKeywordBotFlowComposerDraft,
} from "../shared/domain/botFlowComposer.ts";
import {
  compileKeywordBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";
import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
} from "../server/bot/botFlowKey.ts";

function composerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    replyText: "קיבלנו את פנייתך.",
    expectedFlowVersion: null,
    ...overrides,
  };
}

test("compiles the bounded composer input into the deterministic MVP graph", async () => {
  const result =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(result.success, true);

  const flowKey = await deriveBotFlowKey(
    7,
    "מענה לפניות שירות",
  );
  const expectedBlockKeys =
    await Promise.all(
      [1, 2, 3, 4, 5].map((ordinal) =>
        deriveBotFlowBlockKey(
          flowKey,
          ordinal,
        ),
      ),
    );

  assert.equal(
    result.definition.entryBlockKey,
    expectedBlockKeys[0],
  );
  assert.deepEqual(
    new Set(
      result.definition.blocks.map(
        (block) => block.blockKey,
      ),
    ),
    new Set(expectedBlockKeys),
  );
  assert.deepEqual(
    readKeywordBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      replyText: "קיבלנו את פנייתך.",
    },
  );
});

test("produces the same graph for the same tenant and normalized content", async () => {
  const first =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );
  const repeated =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(first.success, true);
  assert.equal(repeated.success, true);
  assert.deepEqual(
    first.definition,
    repeated.definition,
  );
});

test("rejects extended or invalid composer input before graph persistence", async () => {
  const extended =
    await compileKeywordBotFlowComposerDraft(
      7,
      {
        ...composerInput(),
        tenantId: 8,
      },
    );
  const duplicateKeywords =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput({
        keywords: ["שירות", "שירות"],
      }),
    );

  assert.deepEqual(extended, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.equal(
    duplicateKeywords.success,
    false,
  );
  assert.ok(
    duplicateKeywords.issues.includes(
      "invalid-block",
    ),
  );
});

test("does not project advanced graphs into the bounded composer", async () => {
  const compiled =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );

  assert.equal(compiled.success, true);

  const advancedDefinition = {
    ...compiled.definition,
    blocks:
      compiled.definition.blocks.filter(
        (block) => block.type !== "handoff",
      ),
  };

  assert.equal(
    readKeywordBotFlowComposerDraft(
      advancedDefinition,
    ),
    null,
  );
});
