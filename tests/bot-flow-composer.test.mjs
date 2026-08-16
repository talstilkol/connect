import assert from "node:assert/strict";
import test from "node:test";

import {
  readKeywordBotFlowComposerDraft,
  readKeywordSequenceBotFlowComposerDraft,
} from "../shared/domain/botFlowComposer.ts";
import {
  compileKeywordBotFlowComposerDraft,
  compileKeywordSequenceBotFlowComposerDraft,
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

function sequenceComposerInput(overrides = {}) {
  return {
    name: "מענה לפניות שירות",
    keywords: ["עזרה", "שירות"],
    matchMode: "exact",
    replyTexts: [
      "קיבלנו את פנייתך.",
      "נציג יחזור אליך בהקדם.",
      "אין צורך לשלוח הודעה נוספת.",
    ],
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

test("compiles an ordered text sequence into one deterministic acyclic graph", async () => {
  const result =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput(),
    );

  assert.equal(result.success, true);
  assert.equal(result.definition.blocks.length, 7);
  assert.deepEqual(
    readKeywordSequenceBotFlowComposerDraft(
      result.definition,
    ),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      replyTexts: [
        "קיבלנו את פנייתך.",
        "נציג יחזור אליך בהקדם.",
        "אין צורך לשלוח הודעה נוספת.",
      ],
    },
  );
  assert.equal(
    readKeywordBotFlowComposerDraft(
      result.definition,
    ),
    null,
  );

  const blocksByKey = new Map(
    result.definition.blocks.map((block) => [
      block.blockKey,
      block,
    ]),
  );
  const trigger = blocksByKey.get(
    result.definition.entryBlockKey,
  );
  const keyword = blocksByKey.get(
    trigger.nextBlockKey,
  );
  const firstReply = blocksByKey.get(
    keyword.matchedBlockKey,
  );
  const secondReply = blocksByKey.get(
    firstReply.nextBlockKey,
  );
  const thirdReply = blocksByKey.get(
    secondReply.nextBlockKey,
  );
  const end = blocksByKey.get(
    thirdReply.nextBlockKey,
  );

  assert.deepEqual(
    [
      firstReply.text,
      secondReply.text,
      thirdReply.text,
    ],
    sequenceComposerInput().replyTexts,
  );
  assert.equal(end.type, "end");
});

test("keeps single-reply graph identities compatible with the original composer", async () => {
  const legacy =
    await compileKeywordBotFlowComposerDraft(
      7,
      composerInput(),
    );
  const sequence =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({
        replyTexts: ["קיבלנו את פנייתך."],
      }),
    );

  assert.equal(legacy.success, true);
  assert.equal(sequence.success, true);
  assert.deepEqual(
    sequence.definition,
    legacy.definition,
  );
});

test("rejects empty, oversized, and extended reply sequences", async () => {
  const empty =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({ replyTexts: [] }),
    );
  const oversized =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      sequenceComposerInput({
        replyTexts: Array.from(
          { length: 97 },
          (_, index) => `הודעה ${index + 1}`,
        ),
      }),
    );
  const extended =
    await compileKeywordSequenceBotFlowComposerDraft(
      7,
      {
        ...sequenceComposerInput(),
        tenantId: 8,
      },
    );

  assert.deepEqual(empty, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.deepEqual(oversized, {
    success: false,
    issues: ["invalid-input"],
  });
  assert.deepEqual(extended, {
    success: false,
    issues: ["invalid-input"],
  });
});
