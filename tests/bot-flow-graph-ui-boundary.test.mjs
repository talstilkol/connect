import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const editorUrl = new URL(
  "../features/bot/BotFlowGraphEditor.tsx",
  import.meta.url,
);
const previewUrl = new URL(
  "../features/bot/BotFlowDraftPreview.tsx",
  import.meta.url,
);

test("keeps Graph creation, ordering, connections, and deletion keyboard accessible", async () => {
  const editor = await readFile(editorUrl, "utf8");

  assert.match(
    editor,
    /aria-label=\{messages\.moveNodeUp\(index \+ 1\)\}/,
  );
  assert.match(
    editor,
    /aria-label=\{messages\.moveNodeDown\(index \+ 1\)\}/,
  );
  assert.match(
    editor,
    /aria-label=\{messages\.moveOptionUp\(index \+ 1\)\}/,
  );
  assert.match(
    editor,
    /<NodeTargetSelect/,
  );
  assert.match(
    editor,
    /countBotFlowGraphNodeReferences/,
  );
  assert.match(
    editor,
    /draggable=\{/,
  );
  assert.match(
    editor,
    /moveBotFlowGraphNodeToPosition/,
  );
  assert.match(
    editor,
    /querySelector<HTMLElement>/,
  );
  assert.match(editor, /\?\.focus\(\)/);
  assert.doesNotMatch(editor, /Math\.random\(/);
  assert.doesNotMatch(editor, /crypto\.randomUUID\(/);
});

test("submits temporary Graph references and keeps persisted identities behind the server", async () => {
  const builder = await readFile(builderUrl, "utf8");

  assert.match(
    builder,
    /entryDraftNodeKey:\s*graphDraft\.entryDraftNodeKey,\s*nodes:\s*graphDraft\.nodes/,
  );
  assert.match(
    builder,
    /readKeywordGraphBotFlowComposerDraft/,
  );
  assert.match(
    builder,
    /<BotFlowGraphEditor/,
  );
  assert.match(
    builder,
    /isBotFlowGraphEditorDraftComplete\(graphDraft\)/,
  );
  assert.doesNotMatch(
    builder,
    /entryBlockKey:\s*graphDraft/,
  );
  assert.doesNotMatch(
    builder,
    /blockKey:\s*node\.draftNodeKey/,
  );
});

test("describes every free Graph connection semantically and hides the duplicate visual canvas", async () => {
  const preview = await readFile(previewUrl, "utf8");

  assert.match(preview, /messages\.graphEntry/);
  assert.match(preview, /graphNodeTargetSummary/);
  assert.match(
    preview,
    /graphDraft\.nodes\.map/,
  );
  assert.match(
    preview,
    /className="canvas-grid bot-flow-preview"\s+aria-hidden="true"/,
  );
});
