import assert from "node:assert/strict";
import test from "node:test";

import {
  canMarkConversationRead,
  conversationStatusLabels,
  formatInboxTimestamp,
  inboxDirectoryFailureMessages,
  messageBody,
  messageStatusLabels,
  replaceInboxConversation,
} from "../features/conversations/conversationPresentation.ts";

const occurredAt = "2026-07-26T08:30:00.000Z";

function message(overrides = {}) {
  return {
    messageKey: `message_v1_${"a".repeat(64)}`,
    direction: "inbound",
    contentKind: "text",
    status: "received",
    textContent: "שלום",
    occurredAt,
    statusUpdatedAt: occurredAt,
    ...overrides,
  };
}

function conversation(keyCharacter = "b", overrides = {}) {
  return {
    conversationKey:
      `conversation_v1_${keyCharacter.repeat(64)}`,
    status: "new",
    contact: {
      displayName: "טל כהן",
      phoneNumber: "+972501234567",
    },
    unreadCount: 2,
    assignment: "unassigned",
    lastMessage: {
      direction: "inbound",
      contentKind: "text",
      textContent: "שלום",
      occurredAt,
    },
    version: 3,
    ...overrides,
  };
}

test("presents every inbox directory boundary without fallback records", () => {
  assert.deepEqual(
    Object.keys(inboxDirectoryFailureMessages).sort(),
    [
      "configuration-required",
      "onboarding-required",
      "permission-denied",
      "server-error",
      "tenant-selection-required",
      "unauthenticated",
    ],
  );
  assert.match(
    inboxDirectoryFailureMessages[
      "configuration-required"
    ],
    /לא נוצרים נתוני תצוגה חלופיים/,
  );
});

test("uses stored text and explicit non-text boundaries", () => {
  assert.equal(messageBody(message()), "שלום");
  assert.equal(
    messageBody(
      message({
        contentKind: "image",
        textContent: null,
      }),
    ),
    "התקבלה תמונה. תוכן המדיה עדיין אינו נשמר.",
  );
  assert.equal(
    messageBody(
      message({
        contentKind: "unsupported",
        textContent: null,
      }),
    ),
    "התקבל סוג הודעה שעדיין אינו נתמך.",
  );
});

test("labels the complete conversation and message lifecycles", () => {
  assert.equal(
    conversationStatusLabels.waiting_for_agent,
    "ממתינה לנציג",
  );
  assert.equal(
    conversationStatusLabels.closed,
    "סגורה",
  );
  assert.equal(messageStatusLabels.received, "התקבלה");
  assert.equal(messageStatusLabels.read, "נקראה");
  assert.equal(messageStatusLabels.failed, "נכשלה");
});

test("formats timestamps through an explicit UTC boundary", () => {
  const formatted = formatInboxTimestamp(occurredAt);

  assert.equal(
    formatted,
    formatInboxTimestamp(occurredAt),
  );
  assert.match(formatted, /26/);
  assert.match(formatted, /08|8/);
  assert.match(formatted, /30/);
});

test("replaces only the matching conversation with the server-approved state", () => {
  const first = conversation("b");
  const second = conversation("c");
  const replacement = conversation("b", {
    unreadCount: 0,
    version: 4,
  });

  const result = replaceInboxConversation(
    [first, second],
    replacement,
  );

  assert.equal(result[0], replacement);
  assert.equal(result[1], second);
});

test("allows mark-read only for an unread thread with reply permission", () => {
  const readableThread = {
    conversation: conversation(),
    messages: [],
  };

  assert.equal(
    canMarkConversationRead(
      readableThread,
      true,
      false,
    ),
    true,
  );
  assert.equal(
    canMarkConversationRead(
      readableThread,
      false,
      false,
    ),
    false,
  );
  assert.equal(
    canMarkConversationRead(
      {
        ...readableThread,
        conversation: conversation("b", {
          unreadCount: 0,
        }),
      },
      true,
      false,
    ),
    false,
  );
  assert.equal(
    canMarkConversationRead(
      readableThread,
      true,
      true,
    ),
    false,
  );
});
