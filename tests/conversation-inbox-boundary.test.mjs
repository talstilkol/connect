import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("keeps thread list rendering behind the conversation list boundary", async () => {
  const [inboxSource, threadListSource, presentationSource] =
    await Promise.all([
      readSource(
        "features/conversations/ConversationInbox.tsx",
      ),
      readSource(
        "features/conversations/ConversationThreadList.tsx",
      ),
      readSource(
        "features/conversations/conversationPresentation.ts",
      ),
    ]);

  assert.match(
    inboxSource,
    /<ConversationThreadList/,
  );
  assert.doesNotMatch(
    inboxSource,
    /className="conversation-list"|className="inbox-filters"/,
  );
  assert.match(
    threadListSource,
    /export function ConversationThreadList/,
  );
  assert.match(
    threadListSource,
    /aria-label="רשימת שיחות"/,
  );
  assert.match(
    presentationSource,
    /export const conversationAssignmentLabels/,
  );
  assert.match(
    presentationSource,
    /export function hasActiveInboxFilters/,
  );
});

test("keeps message rendering behind the conversation message boundary", async () => {
  const [inboxSource, messageViewSource] =
    await Promise.all([
      readSource(
        "features/conversations/ConversationInbox.tsx",
      ),
      readSource(
        "features/conversations/ConversationMessageView.tsx",
      ),
    ]);

  assert.match(
    inboxSource,
    /<ConversationMessageView/,
  );
  assert.doesNotMatch(
    inboxSource,
    /className="conversation-stage"|className="message-stream"/,
  );
  assert.match(
    messageViewSource,
    /export function ConversationMessageView/,
  );
  assert.match(
    messageViewSource,
    /aria-label="תוכן השיחה"/,
  );
  assert.match(
    messageViewSource,
    /className="message-stream"/,
  );
  assert.match(
    messageViewSource,
    /changeSelectedAssignment|markSelectedRead|decideAiApproval/,
  );
});
