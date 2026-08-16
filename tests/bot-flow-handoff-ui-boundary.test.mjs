import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowHandoffEditor.tsx",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowComposer.ts",
  import.meta.url,
);

test("keeps keyword handoff explicit, keyboard accessible, and reversible", async () => {
  const [builder, editor] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(editorUrl, "utf8"),
  ]);

  assert.match(
    editor,
    /if \(focusOnMount\) \{\s*reasonRef\.current\?\.focus\(\)/,
  );
  assert.match(
    editor,
    /במצב זה לא תישלח הודעת Bot/,
  );
  assert.match(
    editor,
    /<option value="" disabled>/,
  );
  assert.match(
    builder,
    /addHandoffButtonRef\.current\?\.focus\(\)/,
  );
  assert.match(
    builder,
    /handoffEnabled \? \(\s*<BotFlowHandoffEditor/,
  );
  assert.match(
    builder,
    /handoffEnabled\s*\? handoffReason !== ""/,
  );
  assert.match(
    builder,
    /סיום ללא שינוי בשיחה/,
  );
  assert.doesNotMatch(editor, /Math\.random\(/);
  assert.doesNotMatch(
    editor,
    /crypto\.randomUUID\(/,
  );
});

test("submits only a bounded handoff reason and derives the four graph identities on the server", async () => {
  const [builder, compiler] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(compilerUrl, "utf8"),
  ]);

  assert.match(
    builder,
    /const draftInput = handoffEnabled\s*\? \{/,
  );
  assert.match(
    builder,
    /matchMode,\s*handoffReason,\s*expectedFlowVersion:/,
  );
  assert.match(
    compiler,
    /hasExactKeys\(input, \[\s*"name",\s*"keywords",\s*"matchMode",\s*"handoffReason",\s*"expectedFlowVersion",/,
  );
  assert.match(
    compiler,
    /Array\.from\(\{ length: 4 \}/,
  );
  assert.match(
    compiler,
    /matchedBlockKey: handoffKey,\s*unmatchedBlockKey: endKey/,
  );
  assert.doesNotMatch(compiler, /Math\.random\(/);
  assert.doesNotMatch(
    compiler,
    /crypto\.randomUUID\(/,
  );
});
