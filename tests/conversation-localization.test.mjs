import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readConversationMessages,
} from "../features/conversations/conversationMessages.ts";
import {
  readConversationPageMessages,
} from "../features/conversations/conversationPageMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

const conversationStatuses = [
  "new",
  "bot_active",
  "waiting_for_agent",
  "agent_active",
  "waiting_for_contact",
  "closed",
];

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
  "invalid-input",
  "not-found",
  "state-conflict",
  "assignment-conflict",
];

const aiApprovalStatuses = [
  ...directoryStatuses,
  "invalid-input",
  "not-found",
  "state-conflict",
  "invalid-state",
];

test("localizes every inbox and AI approval boundary", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readConversationMessages(language);

    assert.deepEqual(
      Object.keys(messages.directoryFailures).sort(),
      directoryStatuses.toSorted(),
    );
    assert.deepEqual(
      Object.keys(messages.actionFailures).sort(),
      actionStatuses.toSorted(),
    );
    assert.deepEqual(
      Object.keys(messages.aiApprovalFailures).sort(),
      aiApprovalStatuses.toSorted(),
    );
    assert.deepEqual(
      Object.keys(
        messages.labels.conversationStatuses,
      ).sort(),
      conversationStatuses.toSorted(),
    );
    assert.ok(
      Object.values(messages.directoryFailures).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.ok(
      Object.values(messages.actionFailures).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.ok(
      Object.values(messages.aiApprovalFailures).every(
        (message) => message.trim().length > 0,
      ),
    );
    assert.match(messages.threadList.unreadLabel(2), /2/);
    assert.match(
      messages.assignmentControls.unread(2),
      /2/,
    );
  }

  assert.equal(
    readConversationPageMessages("en").title,
    "Conversation inbox",
  );
  assert.equal(
    readConversationPageMessages("ar").title,
    "صندوق المحادثات",
  );
});

test("passes language through every conversation presentation boundary", async () => {
  const paths = [
    "features/conversations/ConversationInbox.tsx",
    "features/conversations/ConversationThreadList.tsx",
    "features/conversations/ConversationMessageView.tsx",
    "features/conversations/ConversationAssignmentControls.tsx",
    "features/conversations/ConversationComposerBoundary.tsx",
  ];
  const [section, ...sources] = await Promise.all([
    readSource(
      "features/workspace/WorkspaceSectionContent.tsx",
    ),
    ...paths.map(readSource),
  ]);

  assert.match(
    section,
    /<Inbox[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(section, /const ConversationInbox = lazy/);
  assert.match(
    section,
    /<ConversationInbox[\s\S]{0,160}language=\{language\}/,
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
