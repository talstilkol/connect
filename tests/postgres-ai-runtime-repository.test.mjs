import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresAiRuntimePersistence,
  postgresAiRuntimeSql,
} from "../server/platform/postgresAiRuntimeRepository.ts";

const tenantId = 7;
const requestKey = `ai_provider_request_v1_${"1".repeat(64)}`;
const auditKey = `ai_runtime_audit_v1_${"2".repeat(64)}`;
const conversationKey = `conversation_v1_${"3".repeat(64)}`;
const inboundMessageKey = `message_v1_${"4".repeat(64)}`;
const aiAgentKey = `ai_agent_v1_${"5".repeat(64)}`;
const aiAgentVersionKey = `ai_agent_version_v1_${"6".repeat(64)}`;
const periodStart = "2026-08-01";

function authorizationRequest(overrides = {}) {
  return {
    requestKey,
    tenantId,
    aiAgentKey,
    monthlyLimitMinorUnits: 10,
    currency: "ILS",
    ...overrides,
  };
}

function usageRequest(overrides = {}) {
  return {
    requestKey,
    tenantId,
    aiAgentKey,
    usage: {
      inputTokens: 120,
      outputTokens: 24,
      costMinorUnits: 3,
      currency: "ILS",
    },
    ...overrides,
  };
}

function authorizationRow(overrides = {}) {
  return {
    requestKey,
    tenantId: String(tenantId),
    aiAgentKey,
    periodStart,
    monthlyLimitMinorUnits: "10",
    currency: "ILS",
    ...overrides,
  };
}

function usageRow(overrides = {}) {
  return {
    requestKey,
    tenantId: String(tenantId),
    aiAgentKey,
    inputTokens: "120",
    outputTokens: "24",
    costMinorUnits: "3",
    currency: "ILS",
    withinLimit: true,
    ...overrides,
  };
}

function auditEvent(overrides = {}) {
  return {
    auditKey,
    requestKey,
    tenantId,
    conversationKey,
    inboundMessageKey,
    expectedConversationVersion: 1,
    aiAgentKey,
    aiAgentVersionKey,
    outcome: "handoff",
    reason: "customer-request",
    responseMode: "automatic",
    groundingScoreBasisPoints: null,
    inputTokens: null,
    outputTokens: null,
    costMinorUnits: null,
    currency: "ILS",
    ...overrides,
  };
}

function auditRow(event = auditEvent(), overrides = {}) {
  return {
    auditKey: event.auditKey,
    requestKey: event.requestKey,
    tenantId: String(event.tenantId),
    conversationKey: event.conversationKey,
    inboundMessageKey: event.inboundMessageKey,
    aiAgentKey: event.aiAgentKey,
    aiAgentVersionKey: event.aiAgentVersionKey,
    expectedConversationVersion: event.expectedConversationVersion,
    outcome: event.outcome,
    reason: event.reason,
    responseMode: event.responseMode,
    groundingScoreBasisPoints:
      event.groundingScoreBasisPoints === null
        ? null
        : String(event.groundingScoreBasisPoints),
    inputTokens: event.inputTokens === null ? null : String(event.inputTokens),
    outputTokens: event.outputTokens === null ? null : String(event.outputTokens),
    costMinorUnits:
      event.costMinorUnits === null ? null : String(event.costMinorUnits),
    currency: event.currency,
    ...overrides,
  };
}

function result(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(transactionResults = [], queryResults = []) {
  const transactionCalls = [];
  const queryCalls = [];
  const pendingTransactions = [...transactionResults];
  const pendingQueries = [...queryResults];
  const persistence = createPostgresAiRuntimePersistence(
    {
      queries: {
        async query(sql, parameters) {
          queryCalls.push({ sql, parameters });
          const next = pendingQueries.shift();
          if (next === undefined) {
            throw new Error("Unexpected PostgreSQL query");
          }
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
    },
    { now: () => new Date("2026-08-19T10:00:00.000Z") },
  );
  return {
    persistence,
    transactionCalls,
    queryCalls,
    assertConsumed() {
      assert.equal(pendingTransactions.length, 0);
      assert.equal(pendingQueries.length, 0);
    },
  };
}

test("authorizes active agents behind a row lock and preserves exact replay", async () => {
  const database = fixture([
    result([]),
    result([{ aiAgentKey, status: "active" }]),
    result([]),
    result([{ costMinorUnits: "7" }]),
    result([authorizationRow()]),
  ]);

  assert.deepEqual(
    await database.persistence.costGate.authorize(authorizationRequest()),
    { outcome: "authorized" },
  );
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresAiRuntimeSql.findAuthorizationForUpdate,
    postgresAiRuntimeSql.lockAgent,
    postgresAiRuntimeSql.findAuthorizationForUpdate,
    postgresAiRuntimeSql.sumUsage,
    postgresAiRuntimeSql.insertAuthorization,
  ]);
  assert.deepEqual(database.transactionCalls[4].parameters, [
    requestKey,
    tenantId,
    aiAgentKey,
    periodStart,
    10,
    "ILS",
  ]);
  database.assertConsumed();

  const replay = fixture([result([authorizationRow()])]);
  assert.deepEqual(
    await replay.persistence.costGate.authorize(authorizationRequest()),
    { outcome: "authorized" },
  );
  assert.equal(replay.transactionCalls.length, 1);
});

test("fails closed for inactive agents, exhausted budgets, and conflicting authorization replay", async () => {
  const inactive = fixture([
    result([]),
    result([{ aiAgentKey, status: "inactive" }]),
  ]);
  assert.deepEqual(
    await inactive.persistence.costGate.authorize(authorizationRequest()),
    { outcome: "unavailable" },
  );

  const exhausted = fixture([
    result([]),
    result([{ aiAgentKey, status: "active" }]),
    result([]),
    result([{ costMinorUnits: "10" }]),
  ]);
  assert.deepEqual(
    await exhausted.persistence.costGate.authorize(authorizationRequest()),
    { outcome: "exhausted" },
  );

  const conflict = fixture([
    result([authorizationRow({ monthlyLimitMinorUnits: "11" })]),
  ]);
  await assert.rejects(
    conflict.persistence.costGate.authorize(authorizationRequest()),
    /conflicting AI cost authorization/,
  );
});

test("records usage under the shared agent lock and retains the first result", async () => {
  const database = fixture([
    result([]),
    result([{ aiAgentKey, status: "active" }]),
    result([]),
    result([authorizationRow()]),
    result([{ costMinorUnits: "7" }]),
    result([usageRow({ withinLimit: true })]),
  ]);
  assert.deepEqual(
    await database.persistence.costGate.recordUsage(usageRequest()),
    { outcome: "recorded", withinLimit: true },
  );
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresAiRuntimeSql.findUsageForUpdate,
    postgresAiRuntimeSql.lockAgent,
    postgresAiRuntimeSql.findUsageForUpdate,
    postgresAiRuntimeSql.findAuthorizationForUpdate,
    postgresAiRuntimeSql.sumUsage,
    postgresAiRuntimeSql.insertUsage,
  ]);
  database.assertConsumed();

  const replay = fixture([result([usageRow({ withinLimit: false })])]);
  assert.deepEqual(
    await replay.persistence.costGate.recordUsage(usageRequest()),
    { outcome: "recorded", withinLimit: false },
  );
  assert.equal(replay.transactionCalls.length, 1);
});

test("rejects conflicting usage and unavailable authorization scope", async () => {
  const conflict = fixture([
    result([usageRow({ costMinorUnits: "4" })]),
  ]);
  await assert.rejects(
    conflict.persistence.costGate.recordUsage(usageRequest()),
    /conflicting AI usage/,
  );

  const unavailable = fixture([
    result([]),
    result([{ aiAgentKey, status: "inactive" }]),
    result([]),
    result([]),
  ]);
  assert.deepEqual(
    await unavailable.persistence.costGate.recordUsage(usageRequest()),
    { outcome: "unavailable" },
  );
});

test("writes audit and handoff atomically behind the conversation lock", async () => {
  const event = auditEvent();
  const database = fixture([
    result([]),
    result([{
      status: "bot_active",
      assignedExternalUserId: null,
      version: 1,
    }]),
    result([]),
    result([auditRow(event)]),
    result([{
      status: "waiting_for_agent",
      assignedExternalUserId: null,
      version: 2,
    }]),
  ]);
  assert.deepEqual(
    await database.persistence.auditSink.record(event),
    { outcome: "recorded" },
  );
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresAiRuntimeSql.findAuditForUpdate,
    postgresAiRuntimeSql.lockConversation,
    postgresAiRuntimeSql.findAuditForUpdate,
    postgresAiRuntimeSql.insertAudit,
    postgresAiRuntimeSql.applyHandoff,
  ]);
  assert.match(postgresAiRuntimeSql.insertAudit, /messages\.direction = 'inbound'/);
  assert.match(postgresAiRuntimeSql.insertAudit, /ai_agents\.status = 'active'/);
  assert.doesNotMatch(
    postgresAiRuntimeSql.insertAudit,
    /customer_message|system_prompt|passage_content/,
  );
  database.assertConsumed();
});

test("classifies exact audit replay and stale conversation without another write", async () => {
  const event = auditEvent();
  const replay = fixture([
    result([auditRow(event)]),
    result([{
      status: "waiting_for_agent",
      assignedExternalUserId: null,
      version: 2,
    }]),
  ]);
  assert.deepEqual(
    await replay.persistence.auditSink.record(event),
    { outcome: "recorded" },
  );
  assert.equal(replay.transactionCalls.length, 2);

  const stale = fixture([
    result([]),
    result([{
      status: "bot_active",
      assignedExternalUserId: null,
      version: 2,
    }]),
    result([]),
  ]);
  assert.deepEqual(
    await stale.persistence.auditSink.record(event),
    { outcome: "unavailable" },
  );
  assert.equal(stale.transactionCalls.length, 3);
});

test("records reply-plan audit without mutating the conversation", async () => {
  const event = auditEvent({
    outcome: "reply-planned",
    reason: null,
    groundingScoreBasisPoints: 9_000,
    inputTokens: 120,
    outputTokens: 24,
    costMinorUnits: 3,
  });
  const database = fixture([
    result([]),
    result([{
      status: "bot_active",
      assignedExternalUserId: null,
      version: 1,
    }]),
    result([]),
    result([auditRow(event)]),
  ]);
  assert.deepEqual(
    await database.persistence.auditSink.record(event),
    { outcome: "recorded" },
  );
  assert.equal(
    database.transactionCalls.some(
      ({ sql }) => sql === postgresAiRuntimeSql.applyHandoff,
    ),
    false,
  );
});

test("throws after an impossible handoff transition so the transaction can roll back", async () => {
  const event = auditEvent();
  const database = fixture([
    result([]),
    result([{
      status: "bot_active",
      assignedExternalUserId: null,
      version: 1,
    }]),
    result([]),
    result([auditRow(event)]),
    result([]),
  ]);
  await assert.rejects(
    database.persistence.auditSink.record(event),
    /AI runtime handoff failed/,
  );
});

test("rejects invalid input, malformed rows, and invalid dependencies", async () => {
  const database = fixture();
  await assert.rejects(
    database.persistence.costGate.authorize(
      authorizationRequest({ currency: "ils" }),
    ),
    /currency is invalid/,
  );
  await assert.rejects(
    database.persistence.costGate.recordUsage(
      usageRequest({
        usage: {
          inputTokens: 1,
          outputTokens: 0,
          costMinorUnits: 0,
          currency: "ILS",
        },
      }),
    ),
    /outputTokens must be a positive safe integer/,
  );

  const malformed = fixture([result([usageRow({ tenantId: "8" })])]);
  await assert.rejects(
    malformed.persistence.costGate.recordUsage(usageRequest()),
    /conflicting AI usage/,
  );

  assert.throws(
    () => createPostgresAiRuntimePersistence({}),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createPostgresAiRuntimePersistence(
      {
        queries: { query() {} },
        transactions: { transaction() {} },
      },
      { now: "invalid" },
    ),
    /dependencies are invalid/,
  );
});
