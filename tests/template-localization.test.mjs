import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readTemplateEditorMessages,
  templateSaveResultStatuses,
  templateSubmitResultStatuses,
  templateSyncResultStatuses,
  templateViewStatuses,
} from "../features/templates/templateEditorMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(new URL(relativePath, projectRoot), "utf8");
}

test("keeps every template status and action result localized", () => {
  assert.equal(templateViewStatuses.length, 7);
  assert.equal(templateSaveResultStatuses.length, 9);
  assert.equal(templateSubmitResultStatuses.length, 18);
  assert.equal(templateSyncResultStatuses.length, 13);

  for (const language of ["he", "en", "ar"]) {
    const messages = readTemplateEditorMessages(language);

    assert.equal(
      Object.keys(messages.directory.statuses).length,
      templateViewStatuses.length,
    );
    assert.equal(
      Object.keys(messages.feedback.saveResults).length,
      templateSaveResultStatuses.length,
    );
    assert.equal(
      Object.keys(messages.feedback.submitResults).length,
      templateSubmitResultStatuses.length,
    );
    assert.equal(
      Object.keys(messages.feedback.syncResults).length,
      templateSyncResultStatuses.length - 1,
    );
    assert.ok(
      templateViewStatuses.every((status) => {
        const copy = messages.directory.statuses[status];
        return copy.label.trim().length > 0 && copy.detail.trim().length > 0;
      }),
    );
    assert.ok(
      templateSaveResultStatuses.every(
        (status) =>
          messages.feedback.saveResults[status].trim().length > 0,
      ),
    );
    assert.ok(
      templateSubmitResultStatuses.every(
        (status) =>
          messages.feedback.submitResults[status].trim().length > 0,
      ),
    );
    assert.ok(
      templateSyncResultStatuses
        .filter((status) => status !== "synced")
        .every(
          (status) =>
            messages.feedback.syncResults[status].trim().length > 0,
        ),
    );

    const summary = messages.feedback.syncSummary({
      received: 0,
      eligible: 0,
      updated: 0,
      unchanged: 0,
      stale: 0,
      unmatched: 0,
      unsupported: 0,
      observedAt: "",
    });
    assert.match(summary, /0/);
    assert.match(messages.editor.variableGuidance.found(0), /0/);
    assert.match(messages.editor.variableGuidance.missingSequence(1), /1/);
  }

  assert.equal(
    readTemplateEditorMessages("en").page.title,
    "Message templates",
  );
  assert.equal(
    readTemplateEditorMessages("ar").page.title,
    "قوالب الرسائل",
  );
});

test("passes the workspace language through the template boundary", async () => {
  const [section, editor, validation] = await Promise.all([
    readSource("features/workspace/WorkspaceSectionContent.tsx"),
    readSource("features/templates/TemplateDraftEditor.tsx"),
    readSource("shared/validation/templateVariables.ts"),
  ]);

  assert.match(
    section,
    /<Templates[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    section,
    /<TemplateDraftEditor[\s\S]{0,120}interfaceLanguage=\{language\}/,
  );
  assert.match(
    editor,
    /readTemplateEditorMessages\(interfaceLanguage\)/,
  );
  assert.match(editor, /messages\.feedback\.submitResults/);
  assert.match(editor, /messages\.feedback\.syncResults/);

  assert.doesNotMatch(editor, /[\u0590-\u05ff]/);
  assert.doesNotMatch(validation, /[\u0590-\u05ff]/);
});
