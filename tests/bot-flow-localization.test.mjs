import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  botFlowActionStatuses,
  botFlowDirectoryStatuses,
  readBotFlowMessages,
} from "../features/bot/botFlowMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("localizes every bot-flow status and dynamic label", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readBotFlowMessages(language);

    assert.deepEqual(
      Object.keys(messages.directoryStatuses).sort(),
      [...botFlowDirectoryStatuses].sort(),
    );
    assert.deepEqual(
      Object.keys(messages.actionStatuses).sort(),
      [...botFlowActionStatuses].sort(),
    );
    assert.ok(
      Object.values(messages.directoryStatuses).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.ok(
      Object.values(messages.actionStatuses).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.match(messages.directory.version(2), /2/);
    assert.match(messages.graph.nodeDeleted(3), /3/);
    assert.match(messages.preview.keywordCount(4), /4/);
  }

  assert.equal(
    readBotFlowMessages("en").page.title,
    "Bot flow builder",
  );
  assert.equal(
    readBotFlowMessages("ar").page.title,
    "منشئ مسارات البوت",
  );
});

test("passes workspace language through the lazy bot-flow boundary", async () => {
  const section = await readSource(
    "features/workspace/WorkspaceSectionContent.tsx",
  );
  const builder = await readSource(
    "features/bot/BotFlowBuilder.tsx",
  );

  assert.match(section, /const BotFlowBuilder = lazy/);
  assert.match(
    section,
    /<Bot[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    section,
    /<BotFlowBuilder[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(builder, /readBotFlowMessages\(language\)/);
});

test("keeps localized bot-flow components free of embedded Hebrew UI", async () => {
  const sources = await Promise.all(
    [
      "BotFlowBuilder.tsx",
      "BotFlowButtonMenuEditor.tsx",
      "BotFlowConditionEditor.tsx",
      "BotFlowDraftPreview.tsx",
      "BotFlowGraphEditor.tsx",
      "BotFlowHandoffEditor.tsx",
      "BotFlowReplySequenceEditor.tsx",
      "BotFlowTwoStepButtonMenuEditor.tsx",
    ].map((fileName) =>
      readSource(`features/bot/${fileName}`),
    ),
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
