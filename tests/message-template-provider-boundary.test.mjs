import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readTemplateEditorMessages } from "../features/templates/templateEditorMessages.ts";

const editorSource = await readFile(
  new URL("../features/templates/TemplateDraftEditor.tsx", import.meta.url),
  "utf8",
);
const actionSource = await readFile(
  new URL("../server/templates/messageTemplateActions.ts", import.meta.url),
  "utf8",
);
const providerRuntimeSource = await readFile(
  new URL(
    "../server/platform/railwayMessageTemplateProviderRuntime.ts",
    import.meta.url,
  ),
  "utf8",
);

test("uses server submission capability and keeps legacy synchronization inaccessible", () => {
  assert.match(editorSource, /canSubmit = false/);
  assert.match(editorSource, /submitMessageTemplateAction\(templateKey, template.version\)/);
  assert.match(actionSource, /createCurrentRailwayMessageTemplateSubmissionHandler/);
  assert.doesNotMatch(actionSource, /cloudflare:workers|requireRuntimeDatabase|createMessageTemplateSyncRuntime/);
  const sync = actionSource.slice(actionSource.indexOf("export async function syncMessageTemplatesAction"));
  assert.match(sync, /return \{ status: "meta-configuration-required" \}/);
});

test("keeps the Railway credential runtime server-only and provider bounded", () => {
  assert.match(providerRuntimeSource, /createMetaCredentialVault/);
  assert.match(
    providerRuntimeSource,
    /createMessageTemplateSubmissionRuntime/,
  );
  assert.match(
    providerRuntimeSource,
    /createMessageTemplateSyncRuntime/,
  );
  assert.doesNotMatch(
    providerRuntimeSource,
    /cloudflare:workers|requireRuntimeDatabase|createMetaCredentialRepository\(/,
  );
});

test("explains both disabled provider actions through one accessible status", () => {
  assert.match(
    editorSource,
    /id="message-template-provider-actions-boundary"[\s\S]*?role="status"/,
  );
  assert.equal(
    editorSource.match(
      /aria-describedby="message-template-provider-actions-boundary"/g,
    )?.length,
    2,
  );
  assert.match(
    editorSource,
    /!canSubmit \|\|[\s\S]*?isSubmitting/,
  );
  assert.match(
    editorSource,
    /!railwayMetaTemplateSyncReady \|\|[\s\S]*?isSyncing/,
  );
});

test("localizes the migration boundary without claiming D1 persistence", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readTemplateEditorMessages(language);

    assert.ok(messages.directory.providerActionsUnavailable.trim().length > 0);
    assert.match(
      `${messages.editor.preview.persistentNotice} ${messages.feedback.saveResults.saved}`,
      /PostgreSQL/,
    );
    assert.doesNotMatch(JSON.stringify(messages), /D1/);
  }
});
