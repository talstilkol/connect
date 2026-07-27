import assert from "node:assert/strict";
import test from "node:test";

import {
  createConversationActionHandler,
} from "../server/conversations/conversationActionHandler.ts";
import {
  ConversationServiceError,
} from "../server/conversations/conversationService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const messageKey =
  `message_v1_${"b".repeat(64)}`;
const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "agent",
};

function conversation() {
  return {
    conversationKey,
    tenantId: 7,
    contactId: 17,
    status: "new",
    assignedExternalUserId: null,
    unreadCount: 1,
    lastMessageKey: messageKey,
    lastMessageAt: "2026-07-26T08:30:00.000Z",
    version: 2,
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
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    createdAt: "2026-07-26 08:30:01",
    updatedAt: "2026-07-26 08:30:01",
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler = createConversationActionHandler({
    applicationConfigured: () =>
      options.applicationConfigured ?? true,
    async createContext() {
      calls.push("context");

      if (options.contextError) {
        throw options.contextError;
      }

      return {
        session,
        service: {
          async list() {
            throw new Error("must-not-run");
          },
          async readThread() {
            calls.push("read-thread");

            if (options.readError) {
              throw options.readError;
            }

            return {
              conversation: conversation(),
              messages: [message()],
            };
          },
          async markRead() {
            calls.push("mark-read");

            if (options.markError) {
              throw options.markError;
            }

            return {
              conversationKey,
              unreadCount: 0,
              version: 3,
            };
          },
          async changeAssignment() {
            calls.push("change-assignment");

            if (options.assignmentError) {
              throw options.assignmentError;
            }

            return {
              conversationKey,
              assignedExternalUserId:
                "external-user-id",
              version: 3,
            };
          },
          async refresh() {
            calls.push("refresh");

            if (options.refreshError) {
              throw options.refreshError;
            }

            return {
              conversations: [conversation()],
              selectedThread: {
                conversation: conversation(),
                messages: [message()],
              },
              filters: {
                searchTerm: "",
                status: "all",
                assignment: "all",
              },
            };
          },
        },
      };
    },
  });

  return { calls, handler };
}

test("stops conversation actions before context when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.loadThread(
      conversationKey,
    ),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.markRead({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.changeAssignment({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.refresh({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns a bounded browser thread without persistence identities", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.loadThread(
      conversationKey,
    );
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "loaded");
  assert.equal(
    result.thread.conversation.contact.displayName,
    "טל כהן",
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|contactId|providerMessageId|lastStatusEventKey|private-provider-id/,
  );
  assert.deepEqual(testFixture.calls, [
    "context",
    "read-thread",
  ]);
});

test("returns only the updated public unread state", async () => {
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.handler.markRead({
      conversationKey,
      expectedVersion: 2,
    }),
    {
      status: "marked-read",
      conversation: {
        conversationKey,
        unreadCount: 0,
        version: 3,
      },
    },
  );
});

test("returns only the current-user assignment state without exposing the external identity", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.changeAssignment({
      conversationKey,
      expectedVersion: 2,
      action: "assign-self",
    });

  assert.deepEqual(result, {
    status: "assignment-updated",
    conversation: {
      conversationKey,
      assignment: "current-user",
      version: 3,
    },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /external-user-id|assignedExternalUserId/,
  );
});

test("returns a bounded refresh snapshot with filters and public assignment state", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.refresh({
    filters: {
      searchTerm: "",
      status: "all",
      assignment: "all",
    },
    selectedConversationKey: conversationKey,
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "refreshed");
  assert.equal(
    result.inbox.conversations[0].assignment,
    "unassigned",
  );
  assert.deepEqual(result.inbox.filters, {
    searchTerm: "",
    status: "all",
    assignment: "all",
  });
  assert.doesNotMatch(
    serialized,
    /tenantId|contactId|providerMessageId|assignedExternalUserId/,
  );
});

test("maps every conversation service failure to a bounded public status", async () => {
  const mappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["STATE_CONFLICT", "state-conflict"],
    [
      "ASSIGNMENT_CONFLICT",
      "assignment-conflict",
    ],
    ["PERSISTENCE_FAILED", "server-error"],
  ];

  for (const [code, status] of mappings) {
    const readFixture = fixture({
      readError: new ConversationServiceError(code),
    });
    const markFixture = fixture({
      markError: new ConversationServiceError(code),
    });

    assert.deepEqual(
      await readFixture.handler.loadThread(
        conversationKey,
      ),
      { status },
    );
    assert.deepEqual(
      await markFixture.handler.markRead({}),
      { status },
    );
  }
});

test("maps tenant session failures without exposing their messages", async () => {
  const unauthenticated = fixture({
    contextError: new TenantSessionError(
      "AUTHENTICATION_REQUIRED",
      "private authentication detail",
    ),
  });
  const denied = fixture({
    contextError: new TenantSessionError(
      "PERMISSION_DENIED",
      "private permission detail",
    ),
  });

  assert.deepEqual(
    await unauthenticated.handler.loadThread(
      conversationKey,
    ),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await denied.handler.markRead({}),
    { status: "permission-denied" },
  );
});
