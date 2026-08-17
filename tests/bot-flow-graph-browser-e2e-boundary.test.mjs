import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const packageUrl = new URL(
  "../package.json",
  import.meta.url,
);
const runnerUrl = new URL(
  "../scripts/run-bot-flow-graph-browser-e2e.mjs",
  import.meta.url,
);
const harnessUrl = new URL(
  "../scripts/bot-flow-graph-browser-harness.tsx",
  import.meta.url,
);

test("registers a local real-browser Graph acceptance command", async () => {
  const [packageSource, runner] =
    await Promise.all([
      readFile(packageUrl, "utf8"),
      readFile(runnerUrl, "utf8"),
    ]);
  const packageDefinition = JSON.parse(
    packageSource,
  );

  assert.equal(
    packageDefinition.scripts[
      "e2e:bot-flow-graph-browser"
    ],
    "node scripts/run-bot-flow-graph-browser-e2e.mjs",
  );
  assert.match(runner, /chromium\.launch\(/);
  assert.match(runner, /createServer\(/);
  assert.match(runner, /headless: true/);
  assert.doesNotMatch(runner, /Math\.random\(/);
  assert.doesNotMatch(
    runner,
    /crypto\.randomUUID\(/,
  );
});

test("drives every Graph node type through keyboard and drag-and-drop", async () => {
  const runner = await readFile(runnerUrl, "utf8");

  for (const nodeType of [
    "Buttons",
    "Condition",
    "Handoff",
    "Text",
    "End",
  ]) {
    assert.match(
      runner,
      new RegExp(
        `addNode\\(\\s*page,\\s*"${nodeType}",?\\s*\\)`,
      ),
    );
  }

  assert.match(runner, /keyboard\.press\("Enter"\)/);
  assert.match(
    runner,
    /textCard\.dragTo\(conditionCard\)/,
  );
  assert.match(runner, /selectOption\(handoff\.draftNodeKey\)/);
  assert.match(runner, /getByRole\("status"\)/);
});

test("mounts the production editor and preview without persisted identities", async () => {
  const harness = await readFile(
    harnessUrl,
    "utf8",
  );

  assert.match(harness, /<BotFlowGraphEditor/);
  assert.match(harness, /<BotFlowDraftPreview/);
  assert.match(
    harness,
    /createBotFlowGraphEditorDraft\(\)/,
  );
  assert.match(
    harness,
    /isBotFlowGraphEditorDraftComplete\(draft\)/,
  );
  assert.doesNotMatch(
    harness,
    /botFlowKey|botFlowVersionKey|tenantKey|blockKey|optionKey/,
  );
  assert.doesNotMatch(harness, /Math\.random\(/);
  assert.doesNotMatch(
    harness,
    /crypto\.randomUUID\(/,
  );
});
