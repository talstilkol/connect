import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const builderUrl = new URL(
  "../features/bot/BotFlowBuilder.tsx",
  import.meta.url,
);
const previewUrl = new URL(
  "../features/bot/BotFlowDraftPreview.tsx",
  import.meta.url,
);

test("keeps the visual draft canvas outside the mutation-heavy builder", async () => {
  const builderSource = await readFile(
    builderUrl,
    "utf8",
  );

  assert.match(
    builderSource,
    /import \{\s+BotFlowDraftPreview,\s+\} from "\.\/BotFlowDraftPreview"/,
  );
  assert.match(
    builderSource,
    /<BotFlowDraftPreview[\s\S]*keywords=\{keywords\}[\s\S]*matchMode=\{matchMode\}[\s\S]*handoffReason=\{handoffReason\}/,
  );
  assert.doesNotMatch(
    builderSource,
    /canvas-grid bot-flow-preview/,
  );
});

test("exposes one semantic topology and hides the duplicate visual topology", async () => {
  const previewSource = await readFile(
    previewUrl,
    "utf8",
  );

  assert.match(
    previewSource,
    /aria-labelledby=\{PREVIEW_TITLE_ID\}/,
  );
  assert.match(
    previewSource,
    /<h3 id=\{PREVIEW_TITLE_ID\}>/,
  );
  assert.match(
    previewSource,
    /<div className="sr-only">[\s\S]*<ol>/,
  );
  assert.match(
    previewSource,
    /className="canvas-grid bot-flow-preview"\s+aria-hidden="true"/,
  );
  assert.doesNotMatch(
    previewSource,
    /aria-live=/,
  );
});

test("describes trigger outcomes, condition branches, buttons, handoff, and end states", async () => {
  const previewSource = await readFile(
    previewUrl,
    "utf8",
  );

  for (const expectedText of [
    "נקודת התחלה: הודעה נכנסת",
    "ענף יש התאמה",
    "ענף אין התאמה",
    "שאלת Buttons",
    "התנאי מתקיים",
    "התנאי אינו מתקיים",
    "Handoff לנציג",
    "סיום התהליך",
  ]) {
    assert.match(
      previewSource,
      new RegExp(expectedText),
    );
  }
});
