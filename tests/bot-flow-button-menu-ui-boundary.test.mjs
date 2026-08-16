import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowButtonMenuEditor.tsx",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowComposer.ts",
  import.meta.url,
);
const runtimeRepositoryUrl = new URL(
  "../db/botRuntimeRepository.ts",
  import.meta.url,
);

test("keeps button options operable by keyboard and restores focus after structural edits", async () => {
  const source = await readFile(editorUrl, "utf8");

  assert.match(
    source,
    /aria-label={`העבר את אפשרות \$\{position\} למעלה`}/,
  );
  assert.match(
    source,
    /aria-label={`העבר את אפשרות \$\{position\} למטה`}/,
  );
  assert.match(
    source,
    /aria-label={`מחק את אפשרות \$\{position\}`}/,
  );
  assert.match(
    source,
    /if \(focusOnMount\) \{\s*promptRef\.current\?\.focus\(\)/,
  );
  assert.match(
    source,
    /querySelector<HTMLInputElement>/,
  );
  assert.match(source, /\?\.focus\(\)/);
  assert.match(
    source,
    /draggable=\{\s*!disabled && draft\.options\.length > 1\s*\}/,
  );
  assert.match(
    source,
    /onMoveOptionToPosition\(\s*sourceKey,\s*index,\s*\)/,
  );
  assert.match(source, /event\.dataTransfer\.dropEffect = "move"/);
  assert.doesNotMatch(source, /Math\.random\(/);
  assert.doesNotMatch(
    source,
    /crypto\.randomUUID\(/,
  );
});

test("submits only labels and replies while deriving persisted option identities on the server", async () => {
  const [builder, compiler] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(compilerUrl, "utf8"),
  ]);

  assert.match(
    builder,
    /const buttonOptions =\s*buttonMenu\s*\? readBotFlowButtonOptions/,
  );
  assert.match(
    builder,
    /buttonText: buttonMenu\.buttonText,\s*options: buttonOptions/,
  );
  assert.match(
    builder,
    /onMoveOptionToPosition=\{\s*moveButtonOptionToPosition\s*\}/,
  );
  assert.match(
    compiler,
    /deriveBotFlowOptionKey\(\s*buttonKey,\s*index \+ 1/,
  );
  assert.match(compiler, /hasExactKeys\(candidate, \[/);
  assert.doesNotMatch(compiler, /Math\.random\(/);
  assert.doesNotMatch(
    compiler,
    /crypto\.randomUUID\(/,
  );
});

test("resumes only from a recent accepted button reply to the immediately previous inbound message", async () => {
  const source = await readFile(
    runtimeRepositoryUrl,
    "utf8",
  );

  assert.match(
    source,
    /previous\.rowid < current_inbound\.currentRowId/,
  );
  assert.match(
    source,
    /delivery\.status = 'accepted'/,
  );
  assert.match(
    source,
    /unixepoch\('now', '-24 hours'\)/,
  );
  assert.match(
    source,
    /json_extract\(delivery\.reply_json, '\$\.kind'\)/,
  );
});
