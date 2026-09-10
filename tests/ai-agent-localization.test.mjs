import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  aiAgentStatuses,
  aiAgentVersionStatuses,
  knowledgeSourceStatuses,
} from "../shared/domain/aiAgent.ts";
import {
  readAiAgentMessages,
} from "../features/ai/aiAgentMessages.ts";
import {
  readAiAgentPageMessages,
} from "../features/ai/aiAgentPageMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

const directoryStatuses = [
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
];

const actionStatuses = [
  ...directoryStatuses,
  "validation-error",
  "invalid-input",
  "not-found",
  "state-conflict",
  "invalid-state",
];

const activationIssues = [
  "provider-required",
  "billing-policy-required",
  "handoff-policy-required",
  "audit-sink-required",
  "response-mode-required",
  "grounding-threshold-required",
  "cost-limit-required",
  "knowledge-source-required",
  "knowledge-source-not-ready",
];

test("localizes every AI agent, knowledge, and readiness state", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readAiAgentMessages(language);

    assert.deepEqual(
      Object.keys(messages.directoryStatuses).sort(),
      directoryStatuses.toSorted(),
    );
    assert.deepEqual(
      Object.keys(messages.actionStatuses).sort(),
      actionStatuses.toSorted(),
    );
    assert.deepEqual(
      Object.keys(messages.activationIssues).sort(),
      activationIssues.toSorted(),
    );
    assert.deepEqual(
      Object.keys(messages.labels.agentStatuses).sort(),
      [...aiAgentStatuses].sort(),
    );
    assert.deepEqual(
      Object.keys(messages.labels.versionStatuses).sort(),
      [...aiAgentVersionStatuses].sort(),
    );
    assert.deepEqual(
      Object.keys(messages.labels.sourceStatuses).sort(),
      [...knowledgeSourceStatuses].sort(),
    );
    assert.ok(
      Object.values(messages.actionStatuses).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.match(messages.directory.version(2), /2/);
    assert.match(messages.readiness.version(2), /2/);
  }

  assert.equal(
    readAiAgentPageMessages("en").title,
    "AI agent",
  );
  assert.equal(
    readAiAgentPageMessages("ar").title,
    "وكيل AI",
  );
});

test("passes language through the lazy AI agent boundary", async () => {
  const [section, editor] = await Promise.all([
    readSource(
      "features/workspace/WorkspaceSectionContent.tsx",
    ),
    readSource("features/ai/AiAgentEditor.tsx"),
  ]);

  assert.match(
    section,
    /<AiAgent[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(section, /const AiAgentEditor = lazy/);
  assert.match(
    section,
    /<AiAgentEditor[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(editor, /readAiAgentMessages\(language\)/);
  assert.match(
    editor,
    /aria-describedby="ai-knowledge-upload-boundary"/,
  );
  assert.doesNotMatch(editor, /[\u0590-\u05ff]/);
});
