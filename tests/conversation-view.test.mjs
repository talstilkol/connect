import assert from "node:assert/strict";
import test from "node:test";

import {
  toConversationAssignmentStateView,
  toConversationReadStateView,
  toInboxConversationThreadView,
  toInboxConversationView,
  toInboxMessageView,
} from "../server/conversations/conversationView.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const messageKey =
  `message_v1_${"b".repeat(64)}`;

function conversation(overrides = {}) {
  return {
    conversationKey,
    tenantId: 7,
    contactId: 17,
    status: "new",
    assignedExternalUserId: "private-external-user-id",
    unreadCount: 2,
    lastMessageKey: messageKey,
    lastMessageAt: "2026-07-26T08:30:00.000Z",
    version: 3,
    createdAt: "2026-07-26 08:29:00",
    updatedAt: "2026-07-26 08:30:01",
    contact: {
      phoneNumber: "+972501234567",
      firstName: "טל",
      lastName: "כהן",
    },
    lastMessage: {
      direction: "inbound",
      contentKind: "text",
      textContent: "שלום",
    },
    ...overrides,
  };
}

function message() {
  return {
    messageKey,
    conversationKey,
    tenantId: 7,
    providerMessageId: "wamid.private-provider-id",
    direction: "inbound",
    contentKind: "text",
    status: "received",
    textContent: "שלום",
    occurredAt: "2026-07-26T08:30:00.000Z",
    statusUpdatedAt: "2026-07-26T08:30:00.000Z",
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: "2026-07-26T08:31:00.000Z",
    createdAt: "2026-07-26 08:30:01",
    updatedAt: "2026-07-26 08:31:01",
  };
}

test("maps an inbox contact name with a phone fallback", () => {
  assert.equal(
    toInboxConversationView(
      conversation(),
      "private-external-user-id",
    ).contact.displayName,
    "טל כהן",
  );
  assert.equal(
    toInboxConversationView(
      conversation({
        contact: {
          phoneNumber: "+972501234567",
          firstName: null,
          lastName: null,
        },
      }),
      "private-external-user-id",
    ).contact.displayName,
    "+972501234567",
  );
});

test("removes tenant, provider, assignee, and webhook identities from browser DTOs", () => {
  const thread = toInboxConversationThreadView(
    conversation(),
    [message()],
    "private-external-user-id",
  );
  const serialized = JSON.stringify({
    thread,
    message: toInboxMessageView(message()),
    state: toConversationReadStateView({
      conversationKey,
      unreadCount: 0,
      version: 4,
    }),
  });

  assert.equal(
    thread.conversation.contact.displayName,
    "טל כהן",
  );
  assert.equal(
    thread.conversation.assignment,
    "current-user",
  );
  assert.equal(thread.messages[0].textContent, "שלום");
  assert.equal(
    toInboxConversationView(
      conversation(),
      "different-user-id",
    ).assignment,
    "other-user",
  );
  assert.equal(
    toInboxConversationView(
      conversation({
        assignedExternalUserId: null,
      }),
      "different-user-id",
    ).assignment,
    "unassigned",
  );
  assert.deepEqual(
    toConversationAssignmentStateView(
      {
        conversationKey,
        assignedExternalUserId:
          "private-external-user-id",
        version: 4,
      },
      "private-external-user-id",
    ),
    {
      conversationKey,
      assignment: "current-user",
      version: 4,
    },
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|contactId|providerMessageId|assignedExternalUserId|lastStatusEventKey|lastStatusEventAt|private-provider-id|private-external-user-id/,
  );
});
