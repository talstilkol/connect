import assert from "node:assert/strict";
import test from "node:test";

import {
  AiReplyOutboxIdentityConflictError,
} from "../db/aiReplyOutboxRepository.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../server/ai/aiRuntimeKey.ts";
import {
  createPostgresAiReplyOutboxRepository,
  postgresAiReplyOutboxSql,
} from "../server/platform/postgresAiReplyOutboxRepository.ts";

const tenantId = 7;
const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
const aiAgentKey = `ai_agent_v1_${"3".repeat(64)}`;
const aiAgentVersionKey = `ai_agent_version_v1_${"4".repeat(64)}`;
const sourceKey = `knowledge_source_v1_${"5".repeat(64)}`;
const identity = { conversationKey, inboundMessageKey, aiAgentVersionKey };
const requestKey = await deriveAiProviderRequestKey(tenantId, identity);
const auditKey = await deriveAiRuntimeAuditKey(tenantId, identity);
const outboxKey = await deriveAiReplyOutboxKey(tenantId, requestKey);
const createdAt = new Date("2026-08-19T12:00:00.000Z");
const decidedAt = "2026-08-19T12:05:00.000Z";

function stageInput(overrides = {}) {
  return {
    outboxKey,
    requestKey,
    auditKey,
    tenantId,
    conversationKey,
    inboundMessageKey,
    aiAgentKey,
    aiAgentVersionKey,
    expectedConversationVersion: 2,
    recipientPhoneNumber: "+972501234567",
    responseMode: "agent-approval",
    replyText: "ניתן לבצע את הפעולה לפי המקור המאושר.",
    groundedSourceKeys: [sourceKey],
    groundingScoreBasisPoints: 9_000,
    ...overrides,
  };
}

function outboxRow(overrides = {}) {
  return {
    outboxKey,
    requestKey,
    auditKey,
    tenantId: String(tenantId),
    conversationKey,
    inboundMessageKey,
    aiAgentKey,
    aiAgentVersionKey,
    expectedConversationVersion: 2,
    recipientPhoneNumber: "+972501234567",
    responseMode: "agent-approval",
    replyText: "ניתן לבצע את הפעולה לפי המקור המאושר.",
    groundedSourceKeysJson: [sourceKey],
    groundingScoreBasisPoints: 9_000,
    status: "awaiting-approval",
    decidedByExternalUserId: null,
    decidedAt: null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(transactionResults = [], queryResults = []) {
  const pendingTransactions = [...transactionResults];
  const pendingQueries = [...queryResults];
  const transactionCalls = [];
  const queryCalls = [];
  const repository = createPostgresAiReplyOutboxRepository({
    queries: {
      async query(sql, parameters) {
        queryCalls.push({ sql, parameters });
        const next = pendingQueries.shift();
        if (next === undefined) throw new Error("Unexpected PostgreSQL query");
        return next;
      },
    },
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            transactionCalls.push({ sql, parameters });
            const next = pendingTransactions.shift();
            if (next === undefined) {
              throw new Error("Unexpected PostgreSQL transaction query");
            }
            return next;
          },
        });
      },
    },
  });
  return {
    repository,
    transactionCalls,
    queryCalls,
    assertConsumed() {
      assert.equal(pendingTransactions.length, 0);
      assert.equal(pendingQueries.length, 0);
    },
  };
}

test("stages one approval reply after locked relational prerequisites", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([{
      status: "bot_active",
      lastMessageKey: inboundMessageKey,
      version: 2,
    }]),
    queryResult([]),
    queryResult([outboxRow()]),
  ]);
  const result = await database.repository.stage(stageInput());

  assert.equal(result.outcome, "created");
  assert.equal(result.item.status, "awaiting-approval");
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresAiReplyOutboxSql.findCollisionForUpdate,
    postgresAiReplyOutboxSql.lockConversation,
    postgresAiReplyOutboxSql.findCollisionForUpdate,
    postgresAiReplyOutboxSql.insert,
  ]);
  assert.match(
    postgresAiReplyOutboxSql.insert,
    /audit\.outcome = 'reply-planned'[\s\S]*conversation\.last_message_key = \$6/,
  );
  assert.match(
    postgresAiReplyOutboxSql.insert,
    /jsonb_array_elements_text[\s\S]*source\.status = 'ready'/,
  );
  database.assertConsumed();
});

test("stages automatic replies as ready and returns exact concurrent replay", async () => {
  const automaticInput = stageInput({ responseMode: "automatic" });
  const automaticRow = outboxRow({
    responseMode: "automatic",
    status: "ready-for-delivery",
  });
  const created = fixture([
    queryResult([]),
    queryResult([{
      status: "bot_active",
      lastMessageKey: inboundMessageKey,
      version: 2,
    }]),
    queryResult([]),
    queryResult([automaticRow]),
  ]);
  assert.equal(
    (await created.repository.stage(automaticInput)).item.status,
    "ready-for-delivery",
  );

  const replay = fixture([queryResult([automaticRow])]);
  assert.equal(
    (await replay.repository.stage(automaticInput)).outcome,
    "unchanged",
  );
  assert.equal(replay.transactionCalls.length, 1);
});

test("rejects any unique-identity collision with different reply content", async () => {
  const database = fixture([
    queryResult([outboxRow({ replyText: "תשובה אחרת" })]),
  ]);
  await assert.rejects(
    database.repository.stage(stageInput()),
    (error) => error instanceof AiReplyOutboxIdentityConflictError,
  );
});

test("reads exact tenant scope and lists only fresh approvals", async () => {
  const byKey = fixture([], [queryResult([outboxRow()])]);
  assert.equal(
    (await byKey.repository.findByKey(tenantId, outboxKey))?.outboxKey,
    outboxKey,
  );
  assert.deepEqual(byKey.queryCalls[0], {
    sql: postgresAiReplyOutboxSql.findByKey,
    parameters: [tenantId, outboxKey],
  });

  const byInbound = fixture([], [queryResult([outboxRow()])]);
  assert.equal(
    (
      await byInbound.repository.findByInboundMessage(
        tenantId,
        inboundMessageKey,
      )
    )?.outboxKey,
    outboxKey,
  );

  const listed = fixture([], [queryResult([outboxRow()])]);
  assert.equal(
    (await listed.repository.listAwaitingApproval(tenantId, 10)).length,
    1,
  );
  assert.match(
    postgresAiReplyOutboxSql.listAwaitingApproval,
    /conversation\.last_message_key = outbox\.inbound_message_key/,
  );
});

test("approves behind outbox and conversation locks and preserves the first decision", async () => {
  const approvedRow = outboxRow({
    status: "ready-for-delivery",
    decidedByExternalUserId: "clerk-user-one",
    decidedAt: new Date(decidedAt),
    version: 2,
    updatedAt: new Date(decidedAt),
  });
  const decision = {
    tenantId,
    outboxKey,
    expectedVersion: 1,
    decidedByExternalUserId: "clerk-user-one",
    decision: "approve",
    decidedAt,
  };
  const database = fixture([
    queryResult([outboxRow()]),
    queryResult([{
      status: "bot_active",
      lastMessageKey: inboundMessageKey,
      version: 2,
    }]),
    queryResult([approvedRow]),
  ]);
  const result = await database.repository.decide(decision);
  assert.equal(result.outcome, "updated");
  assert.equal(result.item.status, "ready-for-delivery");
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresAiReplyOutboxSql.findCollisionForUpdate,
    postgresAiReplyOutboxSql.lockConversation,
    postgresAiReplyOutboxSql.decide,
  ]);

  const replay = fixture([queryResult([approvedRow])]);
  const retried = await replay.repository.decide({
    ...decision,
    decidedAt: "2026-08-19T12:06:00.000Z",
  });
  assert.equal(retried.outcome, "unchanged");
  assert.equal(retried.item.decidedAt, decidedAt);
});

test("rejects approval after a newer inbound message and classifies stale versions", async () => {
  const staleConversation = fixture([
    queryResult([outboxRow()]),
    queryResult([{
      status: "bot_active",
      lastMessageKey: `message_v1_${"9".repeat(64)}`,
      version: 3,
    }]),
  ]);
  assert.deepEqual(
    await staleConversation.repository.decide({
      tenantId,
      outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId: "clerk-user-one",
      decision: "approve",
      decidedAt,
    }),
    { outcome: "invalid-state" },
  );

  const versionConflict = fixture([
    queryResult([outboxRow({
      status: "ready-for-delivery",
      decidedByExternalUserId: "clerk-user-two",
      decidedAt: new Date(decidedAt),
      version: 2,
      updatedAt: new Date(decidedAt),
    })]),
  ]);
  assert.deepEqual(
    await versionConflict.repository.decide({
      tenantId,
      outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId: "clerk-user-one",
      decision: "reject",
      decidedAt,
    }),
    { outcome: "conflict" },
  );
});

test("fails closed for invalid identity, malformed rows, and dependencies", async () => {
  const database = fixture();
  await assert.rejects(
    database.repository.stage(stageInput({ replyText: " " })),
    /stage input is invalid/,
  );
  await assert.rejects(
    database.repository.decide({
      tenantId,
      outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId: " ",
      decision: "approve",
      decidedAt,
    }),
    /decidedByExternalUserId is invalid/,
  );

  const malformed = fixture([], [
    queryResult([outboxRow({ groundedSourceKeysJson: [] })]),
  ]);
  await assert.rejects(
    malformed.repository.findByKey(tenantId, outboxKey),
    /invalid AI reply outbox item/,
  );
  assert.throws(
    () => createPostgresAiReplyOutboxRepository({}),
    /dependencies are invalid/,
  );
});
