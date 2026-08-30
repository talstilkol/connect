import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayConversationHandler,
} from "../server/conversations/railwayConversationHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const messageKey = `message_v1_${"b".repeat(64)}`;

function conversation(overrides = {}) {
  return {
    conversationKey,
    status: "waiting_for_agent",
    contact: {
      displayName: "Tal",
      phoneNumber: "+972501234567",
    },
    unreadCount: 2,
    assignment: "current-user",
    lastMessage: {
      direction: "inbound",
      contentKind: "text",
      textContent: "Help",
      occurredAt: "2026-08-21T10:00:00.000Z",
    },
    version: 3,
    ...overrides,
  };
}

function thread() {
  return {
    conversation: conversation(),
    messages: [{
      messageKey,
      direction: "inbound",
      contentKind: "text",
      status: "received",
      textContent: "Help",
      occurredAt: "2026-08-21T10:00:00.000Z",
      statusUpdatedAt: "2026-08-21T10:00:00.000Z",
    }],
  };
}

function fixture(options = {}) {
  const calls = {
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwayConversationHandler({
    applicationConfigured: () => options.applicationConfigured ?? true,
    inspectConfiguration: () => options.configuration ?? {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin: "https://railway.example.com",
        deploymentEnvironment: "production",
      },
    },
    async resolveIdentity() {
      calls.identities += 1;
      if (options.identityError) throw options.identityError;
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc.token.value",
        userSessionToken: "user.token.value",
      };
    },
    createClient(configuration) {
      calls.clientConfigurations.push(configuration);
      return {
        async call(request) {
          calls.requests.push(request);
          if (options.response) return options.response(request);

          if (request.operation === "conversations.list") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: { conversations: [conversation()], canReply: true },
            };
          }
          if (request.operation === "conversations.thread.read") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: { thread: thread() },
            };
          }
          if (request.operation === "conversations.mark-read") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: {
                replayed: false,
                conversation: {
                  conversationKey,
                  unreadCount: 0,
                  version: 4,
                },
              },
            };
          }
          return {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: {
              replayed: false,
              conversation: {
                conversationKey,
                assignment: "unassigned",
                version: 4,
              },
            },
          };
        },
      };
    },
  });

  return { calls, handler };
}

test("reads the initial inbox through one Railway identity and bounded responses", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.readCurrent();

  assert.equal(result.status, "ready");
  assert.equal(result.inbox.conversations.length, 1);
  assert.equal(result.inbox.selectedThread.messages[0].messageKey, messageKey);
  assert.equal(testFixture.calls.identities, 1);
  assert.deepEqual(
    testFixture.calls.requests.map(({ operation }) => operation),
    ["conversations.list", "conversations.thread.read"],
  );
  assert.deepEqual(testFixture.calls.requests[0].payload, {
    searchTerm: "",
    status: "all",
    assignment: "all",
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|assignedExternalUserId|providerMessageId|oidc\.token|user\.token/,
  );
});

test("loads and refreshes conversations while preserving a valid selection", async () => {
  const testFixture = fixture();
  const loaded = await testFixture.handler.loadThread(conversationKey);
  const refreshed = await testFixture.handler.refresh({
    filters: {
      searchTerm: "Tal",
      status: "waiting_for_agent",
      assignment: "mine",
    },
    selectedConversationKey: conversationKey,
  });

  assert.equal(loaded.status, "loaded");
  assert.equal(refreshed.status, "refreshed");
  assert.equal(
    refreshed.inbox.selectedThread.conversation.conversationKey,
    conversationKey,
  );
  assert.deepEqual(refreshed.inbox.filters, {
    searchTerm: "Tal",
    status: "waiting_for_agent",
    assignment: "mine",
  });
});

test("derives deterministic mutation keys and maps bounded public states", async () => {
  const testFixture = fixture();
  const markPayload = { conversationKey, expectedVersion: 3 };
  const assignmentPayload = {
    conversationKey,
    expectedVersion: 3,
    action: "unassign-self",
  };
  const marked = await testFixture.handler.markRead(markPayload);
  const assigned = await testFixture.handler.changeAssignment(
    assignmentPayload,
  );

  assert.deepEqual(marked, {
    status: "marked-read",
    conversation: { conversationKey, unreadCount: 0, version: 4 },
  });
  assert.deepEqual(assigned, {
    status: "assignment-updated",
    conversation: {
      conversationKey,
      assignment: "unassigned",
      version: 4,
    },
  });
  const expectedKeys = await Promise.all([
    deriveRailwayApiDeterministicIdempotencyKey(
      "conversations.mark-read",
      markPayload,
    ),
    deriveRailwayApiDeterministicIdempotencyKey(
      "conversations.assignment.change",
      assignmentPayload,
    ),
  ]);
  assert.deepEqual(
    testFixture.calls.requests.map(({ idempotencyKey }) => idempotencyKey),
    expectedKeys,
  );
});

test("fails closed for configuration, identity, conflict, and malformed responses", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.markRead({}), {
    status: "configuration-required",
  });
  assert.equal(disabled.calls.identities, 0);

  const unauthenticated = fixture({
    identity: {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  assert.deepEqual(
    await unauthenticated.handler.loadThread(conversationKey),
    { status: "unauthenticated" },
  );

  const conflict = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code: "CONFLICT",
      };
    },
  });
  assert.deepEqual(
    await conflict.handler.changeAssignment({
      conversationKey,
      expectedVersion: 3,
      action: "assign-self",
    }),
    { status: "assignment-conflict" },
  );

  const malformed = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          thread: {
            ...thread(),
            tenantId: 7,
          },
        },
      };
    },
  });
  assert.deepEqual(
    await malformed.handler.loadThread(conversationKey),
    { status: "server-error" },
  );
});

test("rejects invalid inputs before Railway calls once configuration is available", async () => {
  const testFixture = fixture();
  assert.deepEqual(
    await testFixture.handler.loadThread("invalid"),
    { status: "invalid-input" },
  );
  assert.deepEqual(
    await testFixture.handler.markRead({
      conversationKey,
      expectedVersion: 0,
    }),
    { status: "invalid-input" },
  );
  assert.deepEqual(testFixture.calls.requests, []);
});

test("rejects malformed dependencies", () => {
  assert.throws(
    () => createRailwayConversationHandler({}),
    /conversation dependencies are invalid/,
  );
});
