import assert from "node:assert/strict";
import test from "node:test";

import {
  ConversationServiceError,
  createConversationService,
} from "../server/conversations/conversationService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const messageKey =
  `message_v1_${"b".repeat(64)}`;

function session(role = "agent") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function conversation(overrides = {}) {
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
    ...overrides,
  };
}

function message(overrides = {}) {
  return {
    messageKey,
    conversationKey,
    tenantId: 7,
    providerMessageId: "wamid.inbound-17",
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
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const repository = {
    async resolveInboundContact() {
      throw new Error("must-not-run");
    },
    async recordInboundMessage() {
      throw new Error("must-not-run");
    },
    async applyDeliveryStatus() {
      throw new Error("must-not-run");
    },
    async listFilteredByTenant(
      tenantId,
      filter,
      limit,
    ) {
      calls.push({
        operation: "list",
        tenantId,
        filter,
        limit,
      });

      if (options.listError) {
        throw options.listError;
      }

      return options.conversations ?? [
        conversation(),
      ];
    },
    async findByKey(tenantId, requestedKey) {
      calls.push({
        operation: "find",
        tenantId,
        conversationKey: requestedKey,
      });

      if (options.findError) {
        throw options.findError;
      }

      return options.found === undefined
        ? conversation()
        : options.found;
    },
    async listMessagesByConversation(
      tenantId,
      requestedKey,
      limit,
    ) {
      calls.push({
        operation: "messages",
        tenantId,
        conversationKey: requestedKey,
        limit,
      });

      if (options.messageError) {
        throw options.messageError;
      }

      return options.messages ?? [message()];
    },
    async markRead(
      tenantId,
      requestedKey,
      expectedVersion,
    ) {
      calls.push({
        operation: "mark-read",
        tenantId,
        conversationKey: requestedKey,
        expectedVersion,
      });

      if (options.markError) {
        throw options.markError;
      }

      return options.markResult ?? {
        outcome: "updated",
        state: {
          conversationKey: requestedKey,
          unreadCount: 0,
          version: expectedVersion + 1,
        },
      };
    },
    async changeAssignment(
      tenantId,
      requestedKey,
      expectedVersion,
      externalUserId,
      action,
    ) {
      calls.push({
        operation: "change-assignment",
        tenantId,
        conversationKey: requestedKey,
        expectedVersion,
        externalUserId,
        action,
      });

      if (options.assignmentError) {
        throw options.assignmentError;
      }

      return options.assignmentResult ?? {
        outcome: "updated",
        state: {
          conversationKey: requestedKey,
          assignedExternalUserId:
            action === "assign-self"
              ? externalUserId
              : null,
          version: expectedVersion + 1,
        },
      };
    },
  };

  return {
    calls,
    service: createConversationService(repository),
  };
}

test("lists the active tenant inbox with a bounded repository limit", async () => {
  const testFixture = fixture();

  const result = await testFixture.service.list(
    session("viewer"),
  );

  assert.equal(result.length, 1);
  assert.deepEqual(testFixture.calls, [
    {
      operation: "list",
      tenantId: 7,
      filter: {
        searchTerm: null,
        status: null,
        assignment: "all",
        currentExternalUserId: null,
      },
      limit: 50,
    },
  ]);
});

test("normalizes server-side inbox filters and scopes the mine filter to the current user", async () => {
  const testFixture = fixture();

  await testFixture.service.list(session("viewer"), {
    searchTerm: "  טל כהן  ",
    status: "waiting_for_agent",
    assignment: "mine",
  });

  assert.deepEqual(testFixture.calls, [
    {
      operation: "list",
      tenantId: 7,
      filter: {
        searchTerm: "טל כהן",
        status: "waiting_for_agent",
        assignment: "mine",
        currentExternalUserId:
          "external-user-id",
      },
      limit: 50,
    },
  ]);
});

test("rejects malformed or unbounded inbox filters before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.list(session(), {
      searchTerm: "a".repeat(81),
      status: "all",
      assignment: "all",
    }),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    testFixture.service.list(session(), {
      searchTerm: "טל",
      status: "unknown",
      assignment: "all",
    }),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("loads one tenant-scoped thread and its latest messages", async () => {
  const testFixture = fixture();

  const result =
    await testFixture.service.readThread(
      session(),
      conversationKey,
    );

  assert.equal(
    result.conversation.conversationKey,
    conversationKey,
  );
  assert.equal(result.messages.length, 1);
  assert.deepEqual(testFixture.calls, [
    {
      operation: "find",
      tenantId: 7,
      conversationKey,
    },
    {
      operation: "messages",
      tenantId: 7,
      conversationKey,
      limit: 100,
    },
  ]);
});

test("rejects an invalid thread key before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.readThread(
      session(),
      "invalid",
    ),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("maps a missing tenant-scoped thread without reading messages", async () => {
  const testFixture = fixture({ found: null });

  await assert.rejects(
    testFixture.service.readThread(
      session(),
      conversationKey,
    ),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "NOT_FOUND",
  );
  assert.equal(testFixture.calls.length, 1);
});

test("requires reply permission before mutating unread state", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.markRead(
      session("viewer"),
      {
        conversationKey,
        expectedVersion: 2,
      },
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("marks read only inside the active tenant and returns the new version", async () => {
  const testFixture = fixture();

  const result = await testFixture.service.markRead(
    session(),
    {
      conversationKey,
      expectedVersion: 2,
    },
  );

  assert.deepEqual(result, {
    conversationKey,
    unreadCount: 0,
    version: 3,
  });
  assert.deepEqual(testFixture.calls, [
    {
      operation: "mark-read",
      tenantId: 7,
      conversationKey,
      expectedVersion: 2,
    },
  ]);
});

test("maps repository conflict, not-found, and failure to bounded service errors", async () => {
  const cases = [
    ["conflict", "STATE_CONFLICT"],
    ["not-found", "NOT_FOUND"],
  ];

  for (const [outcome, code] of cases) {
    const testFixture = fixture({
      markResult: { outcome },
    });

    await assert.rejects(
      testFixture.service.markRead(session(), {
        conversationKey,
        expectedVersion: 2,
      }),
      (error) =>
        error instanceof ConversationServiceError &&
        error.code === code,
    );
  }

  const failed = fixture({
    listError: new Error("private database detail"),
  });

  await assert.rejects(
    failed.service.list(session()),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "PERSISTENCE_FAILED" &&
      !error.message.includes("private"),
  );
});

test("changes only the current agent assignment and maps a foreign lock", async () => {
  const testFixture = fixture();

  const result =
    await testFixture.service.changeAssignment(
      session(),
      {
        conversationKey,
        expectedVersion: 2,
        action: "assign-self",
      },
    );

  assert.deepEqual(result, {
    conversationKey,
    assignedExternalUserId:
      "external-user-id",
    version: 3,
  });
  assert.deepEqual(testFixture.calls, [
    {
      operation: "change-assignment",
      tenantId: 7,
      conversationKey,
      expectedVersion: 2,
      externalUserId: "external-user-id",
      action: "assign-self",
    },
  ]);

  const locked = fixture({
    assignmentResult: { outcome: "locked" },
  });

  await assert.rejects(
    locked.service.changeAssignment(session(), {
      conversationKey,
      expectedVersion: 2,
      action: "assign-self",
    }),
    (error) =>
      error instanceof ConversationServiceError &&
      error.code === "ASSIGNMENT_CONFLICT",
  );
});

test("requires reply permission before changing assignment", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.changeAssignment(
      session("viewer"),
      {
        conversationKey,
        expectedVersion: 2,
        action: "assign-self",
      },
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("refreshes a bounded filtered snapshot while preserving an available selection", async () => {
  const selectedKey =
    `conversation_v1_${"c".repeat(64)}`;
  const selectedConversation = conversation({
    conversationKey: selectedKey,
  });
  const testFixture = fixture({
    conversations: [selectedConversation],
    found: selectedConversation,
  });

  const result = await testFixture.service.refresh(
    session("viewer"),
    {
      filters: {
        searchTerm: "טל",
        status: "all",
        assignment: "unassigned",
      },
      selectedConversationKey: selectedKey,
    },
  );

  assert.equal(
    result.selectedThread.conversation
      .conversationKey,
    selectedKey,
  );
  assert.deepEqual(result.filters, {
    searchTerm: "טל",
    status: "all",
    assignment: "unassigned",
  });
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["list", "find", "messages"],
  );
});
