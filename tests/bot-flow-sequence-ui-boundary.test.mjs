import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowReplySequenceEditor.tsx",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowComposer.ts",
  import.meta.url,
);

test("keeps reply ordering operable through explicit keyboard buttons", async () => {
  const source = await readFile(editorUrl, "utf8");

  assert.match(
    source,
    /<fieldset\s+ref=\{fieldsetRef\}\s+className="bot-flow-reply-sequence"/,
  );
  assert.match(
    source,
    /aria-label={`העבר את הודעת הטקסט \$\{position\} למעלה`}/,
  );
  assert.match(
    source,
    /aria-label={`העבר את הודעת הטקסט \$\{position\} למטה`}/,
  );
  assert.match(
    source,
    /aria-label={`מחק את הודעת הטקסט \$\{position\}`}/,
  );
  assert.ok(
    (source.match(/type="button"/g) ?? []).length >=
      4,
  );
  assert.match(source, /disabled=\{disabled \|\| index === 0\}/);
  assert.match(
    source,
    /steps\.length >= maximumSteps/,
  );
  assert.match(
    source,
    /querySelector<HTMLTextAreaElement>/,
  );
  assert.match(source, /\?\.focus\(\)/);
});

test("announces sequence changes and submits only ordered text values", async () => {
  const source = await readFile(builderUrl, "utf8");

  assert.match(
    source,
    /<BotFlowReplySequenceEditor/,
  );
  assert.match(source, /aria-live="polite"/);
  assert.match(
    source,
    /replyTexts,\s*expectedFlowVersion:/,
  );
  assert.match(
    source,
    /const replyTexts = readBotFlowReplyTexts\(/,
  );
});

test("derives every persisted block key on the server from ordered positions", async () => {
  const source = await readFile(compilerUrl, "utf8");

  assert.match(
    source,
    /deriveBotFlowBlockKey\(\s*botFlowKey,\s*index \+ 1/,
  );
  assert.match(
    source,
    /isSequenceComposerInput/,
  );
  assert.doesNotMatch(source, /Math\.random\(/);
  assert.doesNotMatch(source, /crypto\.randomUUID\(/);
});
