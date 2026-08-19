import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotRuntimeRepository,
  postgresBotRuntimeSql,
} from "../server/platform/postgresBotRuntimeRepository.ts";

const tenantId = 7;
const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const currentInboundMessageKey = `message_v1_${"2".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"3".repeat(64)}`;
const acceptedAt = new Date("2026-08-19T12:00:00.000Z");
const replyJson = JSON.stringify({
  kind: "buttons",
  text: "בחר מחלקה",
  options: [{
    optionKey: `bot_option_v1_${"4".repeat(64)}`,
    label: "שירות",
  }],
});

function conversationRow(overrides = {}) {
  return {
    conversationKey,
    tenantId: String(tenantId),
    status: "bot_active",
    assignedExternalUserId: null,
    version: 3,
    ...overrides,
  };
}

function continuationRow(overrides = {}) {
  return {
    currentMessageKey: currentInboundMessageKey,
    botFlowVersionKey,
    replyJson,
    acceptedAt,
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
  const repository = createPostgresBotRuntimeRepository({
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
    queryCalls,
    transactionCalls,
    assertConsumed() {
      assert.equal(pendingTransactions.length, 0);
      assert.equal(pendingQueries.length, 0);
    },
  };
}

test("reads exact tenant-scoped bot conversation state", async () => {
  const database = fixture([], [queryResult([conversationRow()])]);
  const state = await database.repository.findConversationState(
    tenantId,
    conversationKey,
  );

  assert.deepEqual(state, {
    conversationKey,
    tenantId,
    status: "bot_active",
    assignedExternalUserId: null,
    version: 3,
  });
  assert.deepEqual(database.queryCalls, [{
    sql: postgresBotRuntimeSql.findConversationState,
    parameters: [tenantId, conversationKey],
  }]);
  database.assertConsumed();
});

test("finds only recent accepted button evidence for the immediate previous inbound", async () => {
  const database = fixture([], [queryResult([continuationRow()])]);
  const result = await database.repository.findAcceptedButtonContinuation(
    tenantId,
    conversationKey,
    currentInboundMessageKey,
  );

  assert.deepEqual(result, {
    outcome: "found",
    evidence: {
      botFlowVersionKey,
      replyJson,
      acceptedAt: acceptedAt.toISOString(),
    },
  });
  assert.match(
    postgresBotRuntimeSql.findAcceptedButtonContinuation,
    /\(\s*previous\.occurred_at,\s*previous\.message_key\s*\)\s*</,
  );
  assert.match(
    postgresBotRuntimeSql.findAcceptedButtonContinuation,
    /delivery\.accepted_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'/,
  );
  assert.match(
    postgresBotRuntimeSql.findAcceptedButtonContinuation,
    /delivery\.reply_json ->> 'kind' = 'buttons'/,
  );
  database.assertConsumed();
});

test("classifies absent, unmatched, and ambiguous continuation evidence", async () => {
  const missing = fixture([], [queryResult([])]);
  assert.deepEqual(
    await missing.repository.findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      currentInboundMessageKey,
    ),
    { outcome: "current-message-not-found" },
  );

  const none = fixture([], [queryResult([continuationRow({
    botFlowVersionKey: null,
    replyJson: null,
    acceptedAt: null,
  })])]);
  assert.deepEqual(
    await none.repository.findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      currentInboundMessageKey,
    ),
    { outcome: "none" },
  );

  const ambiguous = fixture([], [queryResult([
    continuationRow(),
    continuationRow(),
  ])]);
  assert.deepEqual(
    await ambiguous.repository.findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      currentInboundMessageKey,
    ),
    { outcome: "ambiguous" },
  );
});

test("applies handoff behind a row lock and returns the exact advanced state", async () => {
  const database = fixture([
    queryResult([conversationRow()]),
    queryResult([conversationRow({
      status: "waiting_for_agent",
      version: 4,
    })]),
  ]);
  const result = await database.repository.applyHandoff(
    tenantId,
    conversationKey,
    3,
  );

  assert.equal(result.outcome, "updated");
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresBotRuntimeSql.lockConversation,
    postgresBotRuntimeSql.applyHandoff,
  ]);
  assert.match(postgresBotRuntimeSql.lockConversation, /FOR UPDATE/);
  assert.match(
    postgresBotRuntimeSql.applyHandoff,
    /assigned_external_user_id IS NULL[\s\S]*status IN \('new', 'bot_active'\)/,
  );
  database.assertConsumed();
});

test("classifies idempotent retry, assignment lock, stale version, and invalid state", async () => {
  const retry = fixture([queryResult([conversationRow({
    status: "waiting_for_agent",
    version: 4,
  })])]);
  assert.equal(
    (await retry.repository.applyHandoff(tenantId, conversationKey, 3)).outcome,
    "unchanged",
  );

  const locked = fixture([queryResult([conversationRow({
    assignedExternalUserId: "agent-one",
  })])]);
  assert.equal(
    (await locked.repository.applyHandoff(tenantId, conversationKey, 3)).outcome,
    "locked",
  );

  const conflict = fixture([queryResult([conversationRow({ version: 5 })])]);
  assert.equal(
    (await conflict.repository.applyHandoff(tenantId, conversationKey, 3)).outcome,
    "conflict",
  );

  const invalid = fixture([queryResult([conversationRow({ status: "closed" })])]);
  assert.equal(
    (await invalid.repository.applyHandoff(tenantId, conversationKey, 3)).outcome,
    "invalid-state",
  );

  const missing = fixture([queryResult([])]);
  assert.equal(
    (await missing.repository.applyHandoff(tenantId, conversationKey, 3)).outcome,
    "not-found",
  );
});

test("fails closed for invalid inputs, malformed rows, and dependencies", async () => {
  const database = fixture();
  await assert.rejects(
    database.repository.findConversationState(0, conversationKey),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    database.repository.findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      "message-invalid",
    ),
    /currentInboundMessageKey is invalid/,
  );

  const malformedConversation = fixture([], [queryResult([
    conversationRow({ status: "unknown" }),
  ])]);
  await assert.rejects(
    malformedConversation.repository.findConversationState(
      tenantId,
      conversationKey,
    ),
    /invalid bot runtime conversation/,
  );

  const malformedContinuation = fixture([], [queryResult([
    continuationRow({ replyJson: '{"kind":"text"}' }),
  ])]);
  await assert.rejects(
    malformedContinuation.repository.findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      currentInboundMessageKey,
    ),
    /invalid bot continuation evidence/,
  );

  assert.throws(
    () => createPostgresBotRuntimeRepository({}),
    /dependencies are invalid/,
  );
});
