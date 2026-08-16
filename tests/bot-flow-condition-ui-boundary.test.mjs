import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowConditionEditor.tsx",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowComposer.ts",
  import.meta.url,
);

test("keeps the condition editor keyboard accessible and restores focus after removal", async () => {
  const [builder, editor] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(editorUrl, "utf8"),
  ]);

  assert.match(
    editor,
    /if \(focusOnMount\) \{\s*factRef\.current\?\.focus\(\)/,
  );
  assert.match(
    editor,
    /disabled=\{disabled \|\| checksConversationStatus\}/,
  );
  assert.match(
    editor,
    /<option value="" disabled>/,
  );
  assert.match(
    builder,
    /addConditionButtonRef\.current\?\.focus\(\)/,
  );
  assert.match(builder, /aria-live="polite"/);
  assert.doesNotMatch(editor, /Math\.random\(/);
  assert.doesNotMatch(
    editor,
    /crypto\.randomUUID\(/,
  );
});

test("keeps Condition, Buttons, and Handoff mutually exclusive and submits no graph identities", async () => {
  const [builder, editor, compiler] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(editorUrl, "utf8"),
    readFile(compilerUrl, "utf8"),
  ]);

  assert.match(
    builder,
    /: condition\s*\? \{/,
  );
  assert.match(
    builder,
    /introTexts: replyTexts,\s*condition,\s*expectedFlowVersion:/,
  );
  assert.match(
    builder,
    /: buttonMenu\s*\? \{/,
  );
  assert.match(
    compiler,
    /isConditionComposerInput/,
  );
  assert.match(
    compiler,
    /const legacyKeys = \[\s*"fact",\s*"operator",\s*"value",\s*"matchedReplyText",\s*"unmatchedReplyText",/,
  );
  assert.match(
    compiler,
    /const branchKeys = \[\s*\.\.\.legacyKeys,\s*"matchedHandoffReason",\s*"unmatchedHandoffReason",/,
  );
  assert.match(
    builder,
    /conditionHasHandoff[\s\S]*setReplySteps\(\[\]\)/,
  );
  assert.match(
    editor,
    /<option value="handoff">\s*העברה לנציג/,
  );
  assert.match(
    editor,
    /matchedHandoffReason === null/,
  );
  assert.match(
    compiler,
    /deriveBotFlowBlockKey\(\s*botFlowKey,\s*index \+ 1/,
  );
  assert.doesNotMatch(compiler, /Math\.random\(/);
  assert.doesNotMatch(
    compiler,
    /crypto\.randomUUID\(/,
  );
});
