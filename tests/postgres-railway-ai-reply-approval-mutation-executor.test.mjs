import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayAiReplyApprovalMutationExecutor,
  postgresRailwayAiReplyApprovalMutationSql,
} from "../server/platform/postgresRailwayAiReplyApprovalMutationExecutor.ts";

const outboxKey = `ai_reply_outbox_v1_${"a".repeat(64)}`;

function command(overrides = {}) {
  return {
    session: {
      tenantId: 7,
      externalUserId: "verified-user",
      displayName: "Workspace",
      status: "active",
      role: "owner",
    },
    operation: "ai.reply-approvals.decide",
    idempotencyKey: `connect_idempotency_v1_${"b".repeat(64)}`,
    requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
    payload: { outboxKey, expectedVersion: 1, decision: "approve" },
    ...overrides,
  };
}

function transactionManager(query) {
  const calls = [];
  return {
    calls,
    manager: {
      async transaction(options, execute) {
        calls.push(options);
        return execute({ query });
      },
    },
  };
}

test("replays one completed approval decision from its bounded receipt", async () => {
  const storedState = {
    outcome: "updated",
    approval: {
      outboxKey,
      status: "ready-for-delivery",
      version: 2,
    },
  };
  const queries = [];
  const fixture = transactionManager(async (sql) => {
    queries.push(sql);
    if (sql === postgresRailwayAiReplyApprovalMutationSql.claimReceipt) {
      return { rowCount: 0, rows: [] };
    }
    if (sql === postgresRailwayAiReplyApprovalMutationSql.lockReceipt) {
      return {
        rowCount: 1,
        rows: [{
          requestDigest: command().requestDigest,
          status: "completed",
          responseJson: storedState,
        }],
      };
    }
    throw new Error("unexpected query");
  });
  const result = await createPostgresRailwayAiReplyApprovalMutationExecutor(
    fixture.manager,
  ).execute(command());

  assert.deepEqual(result, {
    outcome: "replayed",
    tenantId: 7,
    state: storedState,
  });
  assert.deepEqual(fixture.calls, [{ isolationLevel: "read-committed" }]);
  assert.equal(queries.length, 2);
});

test("separates receipt digest conflicts from storage outages", async () => {
  const conflictFixture = transactionManager(async (sql) => {
    if (sql === postgresRailwayAiReplyApprovalMutationSql.claimReceipt) {
      return { rowCount: 0, rows: [] };
    }
    return {
      rowCount: 1,
      rows: [{
        requestDigest: `railway_mutation_request_v1_${"d".repeat(64)}`,
        status: "completed",
        responseJson: {},
      }],
    };
  });
  assert.deepEqual(
    await createPostgresRailwayAiReplyApprovalMutationExecutor(
      conflictFixture.manager,
    ).execute(command()),
    { outcome: "conflict", tenantId: null, state: null },
  );

  const outageFixture = transactionManager(async () => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(
    await createPostgresRailwayAiReplyApprovalMutationExecutor(
      outageFixture.manager,
    ).execute(command()),
    { outcome: "unavailable", tenantId: null, state: null },
  );
});

test("rejects malformed approval commands before opening a transaction", async () => {
  const fixture = transactionManager(async () => {
    throw new Error("must not query");
  });
  const result = await createPostgresRailwayAiReplyApprovalMutationExecutor(
    fixture.manager,
  ).execute(command({
    payload: { outboxKey, expectedVersion: 1, decision: "approve", tenantId: 7 },
  }));

  assert.deepEqual(result, {
    outcome: "unavailable",
    tenantId: null,
    state: null,
  });
  assert.equal(fixture.calls.length, 0);

  const overlongActor = command({
    session: {
      ...command().session,
      externalUserId: "x".repeat(256),
    },
  });
  assert.deepEqual(
    await createPostgresRailwayAiReplyApprovalMutationExecutor(
      fixture.manager,
    ).execute(overlongActor),
    { outcome: "unavailable", tenantId: null, state: null },
  );
  assert.equal(fixture.calls.length, 0);
});

test("freezes atomic approval receipt and audit SQL without random IDs", () => {
  assert.match(
    postgresRailwayAiReplyApprovalMutationSql.claimReceipt,
    /ON CONFLICT/,
  );
  assert.match(
    postgresRailwayAiReplyApprovalMutationSql.lockReceipt,
    /FOR UPDATE/,
  );
  assert.match(
    postgresRailwayAiReplyApprovalMutationSql.insertAudit,
    /'ai_reply_approval'/,
  );
  assert.match(
    postgresRailwayAiReplyApprovalMutationSql.completeReceipt,
    /status = 'processing'/,
  );
  assert.doesNotMatch(
    JSON.stringify(postgresRailwayAiReplyApprovalMutationSql),
    /Math\.random|randomUUID|gen_random_uuid|uuid_generate/,
  );
  assert.throws(
    () => createPostgresRailwayAiReplyApprovalMutationExecutor({}),
    /dependencies are invalid/,
  );
});
