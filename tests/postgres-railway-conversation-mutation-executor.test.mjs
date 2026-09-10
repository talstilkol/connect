import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayConversationMutationExecutor,
  postgresRailwayConversationMutationSql,
} from "../server/platform/postgresRailwayConversationMutationExecutor.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const idempotencyKey =
  `connect_idempotency_v1_${"b".repeat(64)}`;
const requestDigest =
  `railway_mutation_request_v1_${"c".repeat(64)}`;
const session = {
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "agent",
};

function command(operation, payload, overrides = {}) {
  return {
    session,
    operation,
    idempotencyKey,
    requestDigest,
    payload,
    ...overrides,
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function transactionFixture(results) {
  const queue = [...results];
  const calls = {
    options: [],
    queries: [],
    committed: 0,
    rolledBack: 0,
  };
  const manager = {
    async transaction(options, execute) {
      calls.options.push(options);
      try {
        const value = await execute({
          async query(sql, parameters) {
            calls.queries.push({ sql, parameters });
            const next = queue.shift();

            if (next instanceof Error) throw next;
            if (next === undefined) throw new Error("unexpected query");
            return next;
          },
        });
        calls.committed += 1;
        return value;
      } catch (error) {
        calls.rolledBack += 1;
        throw error;
      }
    },
  };

  return { calls, manager, queue };
}

test("marks a conversation read with audit and receipt in one transaction", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([{
      conversationKey,
      tenantId: "7",
      unreadCount: "0",
      version: "4",
    }]),
    result([{ id: "91" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayConversationMutationExecutor(
    fixture.manager,
  ).execute(command(
    "conversations.mark-read",
    { conversationKey, expectedVersion: 3 },
  ));

  assert.deepEqual(saved, {
    outcome: "committed",
    tenantId: 7,
    state: { conversationKey, unreadCount: 0, version: 4 },
  });
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.deepEqual(fixture.calls.queries[0].parameters, [
    7,
    "conversations.mark-read",
    idempotencyKey,
    requestDigest,
    "verified-user",
  ]);
  assert.deepEqual(fixture.calls.queries[1].parameters, [
    7,
    conversationKey,
    3,
  ]);
  assert.deepEqual(fixture.calls.queries[2].parameters.slice(0, 5), [
    7,
    "verified-user",
    "conversations.mark-read",
    conversationKey,
    idempotencyKey,
  ]);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[3].parameters[4]),
    saved.state,
  );
  assert.equal(fixture.queue.length, 0);
});

test("changes self-assignment without exposing the stored external identity", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([{
      conversationKey,
      tenantId: "7",
      assignedExternalUserId: "verified-user",
      version: "5",
    }]),
    result([{ id: "92" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayConversationMutationExecutor(
    fixture.manager,
  ).execute(command(
    "conversations.assignment.change",
    { conversationKey, expectedVersion: 4, action: "assign-self" },
  ));

  assert.deepEqual(saved, {
    outcome: "committed",
    tenantId: 7,
    state: {
      conversationKey,
      assignment: "current-user",
      version: 5,
    },
  });
  assert.doesNotMatch(
    JSON.stringify(saved.state),
    /assignedExternalUserId|verified-user/,
  );
  assert.deepEqual(fixture.calls.queries[1].parameters, [
    7,
    conversationKey,
    4,
    "verified-user",
  ]);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[2].parameters[5]),
    {
      requestDigest,
      expectedVersion: 4,
      resultingVersion: 5,
      action: "assign-self",
    },
  );
});

test("replays an exact bounded state without another domain write", async () => {
  const stored = { conversationKey, unreadCount: 0, version: 4 };
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(stored),
    }]),
  ]);
  const replayed = await createPostgresRailwayConversationMutationExecutor(
    fixture.manager,
  ).execute(command(
    "conversations.mark-read",
    { conversationKey, expectedVersion: 3 },
  ));

  assert.deepEqual(replayed, {
    outcome: "replayed",
    tenantId: 7,
    state: stored,
  });
  assert.equal(fixture.calls.queries.length, 2);
  assert.equal(
    fixture.calls.queries[1].sql,
    postgresRailwayConversationMutationSql.lockReceipt,
  );
});

test("separates digest conflicts, state conflicts, missing rows, and outages", async () => {
  const digestConflict = transactionFixture([
    result([], 0),
    result([{
      requestDigest: `railway_mutation_request_v1_${"d".repeat(64)}`,
      status: "completed",
      responseJson: null,
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayConversationMutationExecutor(
      digestConflict.manager,
    ).execute(command(
      "conversations.mark-read",
      { conversationKey, expectedVersion: 3 },
    )),
    { outcome: "conflict", tenantId: null, state: null },
  );

  const stateConflict = transactionFixture([
    result([{ idempotencyKey }]),
    result([], 0),
    result([{
      conversationKey,
      tenantId: "7",
      unreadCount: "2",
      version: "9",
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayConversationMutationExecutor(
      stateConflict.manager,
    ).execute(command(
      "conversations.mark-read",
      { conversationKey, expectedVersion: 3 },
    )),
    { outcome: "conflict", tenantId: null, state: null },
  );
  assert.equal(stateConflict.calls.rolledBack, 1);

  const missing = transactionFixture([
    result([{ idempotencyKey }]),
    result([], 0),
    result([], 0),
  ]);
  assert.deepEqual(
    await createPostgresRailwayConversationMutationExecutor(
      missing.manager,
    ).execute(command(
      "conversations.mark-read",
      { conversationKey, expectedVersion: 3 },
    )),
    { outcome: "not-found", tenantId: null, state: null },
  );

  const outage = transactionFixture([new Error("private database detail")]);
  assert.deepEqual(
    await createPostgresRailwayConversationMutationExecutor(
      outage.manager,
    ).execute(command(
      "conversations.mark-read",
      { conversationKey, expectedVersion: 3 },
    )),
    { outcome: "unavailable", tenantId: null, state: null },
  );
});

test("rejects malformed commands before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayConversationMutationExecutor(
    fixture.manager,
  );
  const invalid = [
    command("conversations.mark-read", {
      conversationKey: "invalid",
      expectedVersion: 3,
    }),
    command("conversations.mark-read", {
      conversationKey,
      expectedVersion: 0,
    }),
    command("conversations.mark-read", {
      conversationKey,
      expectedVersion: 3,
      action: "assign-self",
    }),
    command("conversations.assignment.change", {
      conversationKey,
      expectedVersion: 3,
      action: "assign-other",
    }),
    command("conversations.mark-read", {
      conversationKey,
      expectedVersion: 3,
    }, { idempotencyKey: "invalid" }),
  ];

  for (const candidate of invalid) {
    assert.deepEqual(await executor.execute(candidate), {
      outcome: "unavailable",
      tenantId: null,
      state: null,
    });
  }
  assert.deepEqual(fixture.calls.options, []);
});

test("freezes receipt and audit SQL without randomized identifiers", () => {
  assert.equal(
    Object.isFrozen(postgresRailwayConversationMutationSql),
    true,
  );
  assert.match(
    postgresRailwayConversationMutationSql.claimReceipt,
    /ON CONFLICT \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(
    postgresRailwayConversationMutationSql.lockReceipt,
    /FOR UPDATE/,
  );
  assert.match(
    postgresRailwayConversationMutationSql.insertAudit,
    /audit_logs/,
  );
  assert.doesNotMatch(
    Object.values(postgresRailwayConversationMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
});

test("rejects a missing PostgreSQL transaction manager", () => {
  assert.throws(
    () => createPostgresRailwayConversationMutationExecutor({}),
    /transaction manager is invalid/,
  );
});
