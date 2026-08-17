import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageIdentityConflictError,
} from "../db/conversationRepository.ts";
import {
  createPostgresConversationRepository,
  postgresConversationSql,
} from "../server/platform/postgresConversationRepository.ts";

const conversationKey = `conversation_v1_${"a".repeat(64)}`;
const messageKey = `message_v1_${"b".repeat(64)}`;
const providerMessageId = "wamid.inbound-1";
const occurredAt = "2026-08-17T08:00:00.000Z";
const createdAt = new Date(occurredAt);

function messageRow(overrides = {}) {
  return {
    messageKey,
    conversationKey,
    tenantId: "7",
    providerMessageId,
    direction: "inbound",
    contentKind: "text",
    status: "received",
    textContent: "שלום",
    occurredAt: createdAt,
    statusUpdatedAt: createdAt,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function inboxRow(overrides = {}) {
  return {
    conversationKey,
    tenantId: "7",
    contactId: "11",
    status: "new",
    assignedExternalUserId: null,
    unreadCount: "1",
    lastMessageKey: messageKey,
    lastMessageAt: createdAt,
    version: "2",
    createdAt,
    updatedAt: createdAt,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    lastMessageDirection: "inbound",
    lastMessageContentKind: "text",
    lastMessageTextContent: "שלום",
    ...overrides,
  };
}

function inboundInput(overrides = {}) {
  return {
    tenantId: 7,
    conversationKey,
    messageKey,
    contactId: 11,
    providerMessageId,
    contentKind: "text",
    textContent: "שלום",
    occurredAt,
    ...overrides,
  };
}

function deliveryInput(overrides = {}) {
  return {
    tenantId: 7,
    providerMessageId: "wamid.outbound-1",
    status: "delivered",
    statusEventKey: "c".repeat(64),
    statusEventAt: "2026-08-17T08:02:00.000Z",
    ...overrides,
  };
}

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];

  return {
    calls,
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      const response = remaining.shift();
      if (response instanceof Error) {
        throw response;
      }
      if (!response) {
        throw new Error("Unexpected PostgreSQL query");
      }
      return response;
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function repositoryFixture(transactionResponses = [], queryResponses = []) {
  const transactions = queryFixture(transactionResponses);
  const queries = queryFixture(queryResponses);
  const transactionCalls = [];

  return {
    transactions,
    queries,
    transactionCalls,
    repository: createPostgresConversationRepository({
      queries,
      transactions: {
        async transaction(options, execute) {
          transactionCalls.push(options);
          return execute(transactions);
        },
      },
    }),
  };
}

test("resolves an inbound contact without overwriting profile data", async () => {
  const fixture = repositoryFixture([], [{
    rows: [{ contactId: "11", tenantId: "7", phoneNumber: "+972501234567" }],
    rowCount: 1,
  }]);

  const contact = await fixture.repository.resolveInboundContact(
    7,
    "+972501234567",
  );

  assert.deepEqual(contact, {
    contactId: 11,
    tenantId: 7,
    phoneNumber: "+972501234567",
  });
  assert.deepEqual(fixture.queries.calls[0].parameters, [7, "+972501234567"]);
  assert.match(postgresConversationSql.resolveInboundContact, /ON CONFLICT/);
  assert.doesNotMatch(
    postgresConversationSql.resolveInboundContact,
    /first_name\s*=|last_name\s*=/i,
  );
});

test("records a new inbound message atomically and advances unread state once", async () => {
  const fixture = repositoryFixture([
    { rows: [{ conversationKey }], rowCount: 1 },
    { rows: [{ conversationKey }], rowCount: 1 },
    { rows: [messageRow()], rowCount: 1 },
  ]);

  const result = await fixture.repository.recordInboundMessage(inboundInput());

  assert.equal(result.outcome, "created");
  assert.equal(result.message.providerMessageId, providerMessageId);
  assert.deepEqual(fixture.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.deepEqual(
    fixture.transactions.calls.map(({ parameters }) => parameters),
    [
      [conversationKey, 7, 11],
      [7, conversationKey, messageKey, occurredAt, providerMessageId, 11],
      [
        messageKey,
        conversationKey,
        7,
        providerMessageId,
        "text",
        "שלום",
        occurredAt,
        11,
      ],
    ],
  );
  fixture.transactions.assertConsumed();
});

test("returns an exact duplicate without a second unread increment", async () => {
  const fixture = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [messageRow()], rowCount: 1 },
  ]);

  const result = await fixture.repository.recordInboundMessage(inboundInput());

  assert.equal(result.outcome, "duplicate");
  assert.match(postgresConversationSql.updateConversationForInbound, /NOT EXISTS/);
  assert.match(postgresConversationSql.updateConversationForInbound, /contact_id = \$6/);
  assert.match(postgresConversationSql.insertInboundMessage, /contact_id = \$8/);
  assert.match(postgresConversationSql.findMessageByProviderIdForUpdate, /FOR UPDATE/);
  fixture.transactions.assertConsumed();
});

test("rejects a provider identity conflict inside the transaction", async () => {
  const fixture = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [messageRow({ messageKey: `message_v1_${"d".repeat(64)}` })], rowCount: 1 },
  ]);

  await assert.rejects(
    fixture.repository.recordInboundMessage(inboundInput()),
    (error) => error instanceof MessageIdentityConflictError,
  );
  fixture.transactions.assertConsumed();
});

test("classifies applied, duplicate, stale, and missing delivery status events", async () => {
  const statusEventAt = new Date("2026-08-17T08:02:00.000Z");
  const outbound = messageRow({
    providerMessageId: "wamid.outbound-1",
    direction: "outbound",
    status: "delivered",
    occurredAt: createdAt,
    statusUpdatedAt: statusEventAt,
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: statusEventAt,
    updatedAt: statusEventAt,
  });

  const applied = repositoryFixture([
    { rows: [outbound], rowCount: 1 },
  ]);
  assert.equal(
    (await applied.repository.applyDeliveryStatus(deliveryInput())).outcome,
    "applied",
  );

  const duplicate = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [outbound], rowCount: 1 },
  ]);
  assert.equal(
    (await duplicate.repository.applyDeliveryStatus(deliveryInput())).outcome,
    "duplicate",
  );

  const stale = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [outbound], rowCount: 1 },
  ]);
  assert.equal(
    (await stale.repository.applyDeliveryStatus(
      deliveryInput({ statusEventKey: "e".repeat(64) }),
    )).outcome,
    "stale",
  );

  const missing = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await missing.repository.applyDeliveryStatus(deliveryInput())).outcome,
    "not-found",
  );

  assert.match(postgresConversationSql.applyDeliveryStatus, /IS DISTINCT FROM/);
  assert.match(postgresConversationSql.applyDeliveryStatus, /CASE \$3::text/);
});

test("lists tenant-scoped inbox rows with literal search semantics", async () => {
  const fixture = repositoryFixture([], [
    { rows: [inboxRow()], rowCount: 1 },
    { rows: [inboxRow()], rowCount: 1 },
  ]);

  const listed = await fixture.repository.listFilteredByTenant(
    7,
    {
      searchTerm: "%_",
      status: "new",
      assignment: "mine",
      currentExternalUserId: "auth0|agent-1",
    },
    25,
  );
  const defaultList = await fixture.repository.listByTenant(7, 25);

  assert.equal(listed.length, 1);
  assert.equal(defaultList.length, 1);
  assert.deepEqual(fixture.queries.calls[0].parameters, [
    7,
    "%_",
    "new",
    "mine",
    "auth0|agent-1",
    25,
  ]);
  assert.match(postgresConversationSql.listInboxConversations, /position\(/);
  assert.doesNotMatch(postgresConversationSql.listInboxConversations, /\bLIKE\b/i);
});

test("finds one conversation and returns messages in chronological order", async () => {
  const later = new Date("2026-08-17T08:01:00.000Z");
  const fixture = repositoryFixture([], [
    { rows: [inboxRow()], rowCount: 1 },
    {
      rows: [
        messageRow({
          messageKey: `message_v1_${"c".repeat(64)}`,
          providerMessageId: "wamid.inbound-2",
          occurredAt: later,
          statusUpdatedAt: later,
          createdAt: later,
          updatedAt: later,
        }),
        messageRow(),
      ],
      rowCount: 2,
    },
  ]);

  assert.equal(
    (await fixture.repository.findByKey(7, conversationKey))?.conversationKey,
    conversationKey,
  );
  const messages = await fixture.repository.listMessagesByConversation(
    7,
    conversationKey,
    50,
  );
  assert.deepEqual(messages.map(({ providerMessageId: id }) => id), [
    providerMessageId,
    "wamid.inbound-2",
  ]);
});

test("classifies read updates using versioned row locks", async () => {
  const updated = repositoryFixture([
    {
      rows: [{
        conversationKey,
        tenantId: "7",
        unreadCount: "0",
        version: "3",
      }],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await updated.repository.markRead(7, conversationKey, 2)).outcome,
    "updated",
  );

  const unchanged = repositoryFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [{
        conversationKey,
        tenantId: "7",
        unreadCount: "0",
        version: "2",
      }],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await unchanged.repository.markRead(7, conversationKey, 2)).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [{
        conversationKey,
        tenantId: "7",
        unreadCount: "0",
        version: "3",
      }],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await conflict.repository.markRead(7, conversationKey, 2)).outcome,
    "conflict",
  );
  assert.match(postgresConversationSql.findReadStateForUpdate, /FOR UPDATE/);
});

test("classifies assignment updates, no-ops, locks, and version conflicts", async () => {
  const updated = repositoryFixture([
    {
      rows: [{
        conversationKey,
        tenantId: "7",
        assignedExternalUserId: "auth0|agent-1",
        version: "3",
      }],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await updated.repository.changeAssignment(
      7,
      conversationKey,
      2,
      "auth0|agent-1",
      "assign-self",
    )).outcome,
    "updated",
  );

  const classificationRow = (assignedExternalUserId, version = "2") => ({
    rows: [{
      conversationKey,
      tenantId: "7",
      assignedExternalUserId,
      version,
    }],
    rowCount: 1,
  });
  const cases = [
    ["auth0|agent-1", "2", "unchanged"],
    ["auth0|agent-2", "2", "locked"],
    [null, "3", "conflict"],
  ];
  for (const [assignee, version, expected] of cases) {
    const fixture = repositoryFixture([
      { rows: [], rowCount: 0 },
      classificationRow(assignee, version),
    ]);
    const result = await fixture.repository.changeAssignment(
      7,
      conversationKey,
      2,
      "auth0|agent-1",
      "assign-self",
    );
    assert.equal(result.outcome, expected);
  }
  assert.match(
    postgresConversationSql.findAssignmentStateForUpdate,
    /FOR UPDATE/,
  );
});

test("fails closed on invalid input, malformed rows, and dependencies", async () => {
  const noQueries = repositoryFixture();
  await assert.rejects(
    noQueries.repository.recordInboundMessage(
      inboundInput({ conversationKey: "bad" }),
    ),
    /conversationKey is invalid/,
  );
  await assert.rejects(
    noQueries.repository.applyDeliveryStatus(
      deliveryInput({ statusEventAt: "not-a-time" }),
    ),
    /statusEventAt is invalid/,
  );
  await assert.rejects(
    noQueries.repository.listFilteredByTenant(
      7,
      {
        searchTerm: null,
        status: null,
        assignment: "mine",
        currentExternalUserId: null,
      },
      25,
    ),
    /filter is invalid/,
  );

  const malformed = repositoryFixture([], [{
    rows: [inboxRow({ tenantId: "8" })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, conversationKey),
    /outside the scope/,
  );

  assert.throws(
    () => createPostgresConversationRepository({}),
    /dependencies are invalid/,
  );
  assert.match(
    postgresConversationSql.insertConversation,
    /ON CONFLICT DO NOTHING/,
  );
  assert.match(
    postgresConversationSql.markRead,
    /date_trunc\('milliseconds', CURRENT_TIMESTAMP\)/,
  );
});
