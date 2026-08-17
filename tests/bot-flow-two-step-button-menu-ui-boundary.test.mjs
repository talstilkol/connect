import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowTwoStepButtonMenuEditor.tsx",
  import.meta.url,
);
const previewUrl = new URL(
  "../features/bot/BotFlowDraftPreview.tsx",
  import.meta.url,
);
const compilerUrl = new URL(
  "../server/bot/botFlowComposer.ts",
  import.meta.url,
);

test("keeps both button-question levels keyboard operable and restores focus after branch edits", async () => {
  const [builder, editor] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(editorUrl, "utf8"),
  ]);

  assert.match(
    editor,
    /aria-label={`העבר את ענף \$\{position\} למעלה`}/,
  );
  assert.match(
    editor,
    /aria-label={`העבר את ענף \$\{position\} למטה`}/,
  );
  assert.match(
    editor,
    /<BotFlowButtonMenuEditor/,
  );
  assert.match(
    editor,
    /querySelector<HTMLInputElement>/,
  );
  assert.match(editor, /\?\.focus\(\)/);
  assert.match(
    builder,
    /addTwoStepButtonRef\.current\?\.focus\(\)/,
  );
  assert.doesNotMatch(editor, /Math\.random\(/);
  assert.doesNotMatch(editor, /crypto\.randomUUID\(/);
});

test("submits only two-step content while the server derives blocks and option identities", async () => {
  const [builder, compiler] = await Promise.all([
    readFile(builderUrl, "utf8"),
    readFile(compilerUrl, "utf8"),
  ]);

  assert.match(
    builder,
    /firstButtonText:\s*twoStepButtonMenu\.firstButtonText,\s*branches:\s*twoStepButtonBranches/,
  );
  assert.match(
    compiler,
    /!isTwoStepButtonMenuComposerInput\(input\)/,
  );
  assert.match(
    compiler,
    /deriveBotFlowOptionKey\(\s*firstButtonKey,\s*index \+ 1/,
  );
  assert.match(
    compiler,
    /deriveBotFlowOptionKey\(\s*layout\.buttonKey,\s*index \+ 1/,
  );
  assert.doesNotMatch(compiler, /Math\.random\(/);
  assert.doesNotMatch(compiler, /crypto\.randomUUID\(/);
});

test("describes both button levels in one semantic topology and hides the visual duplicate", async () => {
  const preview = await readFile(previewUrl, "utf8");

  assert.match(
    preview,
    /twoStepButtonMenu\.firstButtonText/,
  );
  assert.match(
    preview,
    /שאלת Buttons ראשונה/,
  );
  assert.match(
    preview,
    /שאלת Buttons שנייה/,
  );
  assert.match(
    preview,
    /className="canvas-grid bot-flow-preview"\s+aria-hidden="true"/,
  );
});
