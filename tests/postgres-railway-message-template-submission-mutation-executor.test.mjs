import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayMessageTemplateSubmissionMutationExecutor,
  postgresRailwayMessageTemplateSubmissionMutationSql,
} from "../server/platform/postgresRailwayMessageTemplateSubmissionMutationExecutor.ts";
import {
  postgresMessageTemplateSubmissionOutboxSql,
} from "../server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
} from "../server/platform/railwayMessageTemplateSubmissionMutationExecutor.ts";

const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const idempotencyKey = `connect_idempotency_v1_${"b".repeat(64)}`;
const requestDigest = `railway_mutation_request_v1_${"c".repeat(64)}`;
const occurredAt = "2026-08-21T11:00:00.000Z";

function definition() {
  return {
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: { 1: "שם איש קשר" },
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  };
}

function templateRow(overrides = {}) {
  return {
    templateKey,
    tenantId: String(tenantId),
    metaTemplateId: null,
    name: "service_update",
    language: "he",
    category: "UTILITY",
    status: "draft",
    definitionJson: definition(),
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: new Date("2026-08-21T10:00:00.000Z"),
    updatedAt: new Date("2026-08-21T10:00:00.000Z"),
    ...overrides,
  };
}

function command(overrides = {}) {
  return {
    session: {
      externalUserId: "verified-user",
      tenantId,
      displayName: "Verified workspace",
      status: "active",
      role: "owner",
    },
    operation: RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    idempotencyKey,
    requestDigest,
    payload: { templateKey },
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
      if (typeof response === "function") {
        return response(sql, parameters);
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

function executorFixture(responses) {
  const transaction = queryFixture(responses);
  const transactionCalls = [];
  const executor = createPostgresRailwayMessageTemplateSubmissionMutationExecutor(
    {
      async transaction(options, execute) {
        transactionCalls.push(options);
        return execute(transaction);
      },
    },
    "v23.0",
    () => occurredAt,
  );

  return { executor, transaction, transactionCalls };
}

test("atomically claims template, stages outbox/event/audit, and completes receipt", async () => {
  let derivedSubmissionKey = null;
  const fixture = executorFixture([
    { rows: [{ idempotencyKey }], rowCount: 1 },
    {
      rows: [{ version: "3", wabaId: "123456789", status: "connected" }],
      rowCount: 1,
    },
    { rows: [templateRow()], rowCount: 1 },
    (_sql, parameters) => {
      derivedSubmissionKey = parameters[3];
      return {
        rows: [templateRow({
          status: "submitting",
          submissionKey: derivedSubmissionKey,
          submissionStartedAt: new Date(occurredAt),
          version: 2,
          updatedAt: new Date(occurredAt),
        })],
        rowCount: 1,
      };
    },
    (_sql, parameters) => ({
      rows: [{ submissionKey: parameters[0] }],
      rowCount: 1,
    }),
    (_sql, parameters) => ({
      rows: [{ eventKey: parameters[0] }],
      rowCount: 1,
    }),
    { rows: [{ id: "91" }], rowCount: 1 },
    { rows: [{ idempotencyKey }], rowCount: 1 },
  ]);

  const result = await fixture.executor.execute(command());

  assert.equal(result.outcome, "committed");
  assert.equal(result.tenantId, tenantId);
  assert.equal(result.queueMessage.submissionKey, derivedSubmissionKey);
  assert.match(derivedSubmissionKey, /^template_submission_v1_[0-9a-f]{64}$/);
  assert.deepEqual(fixture.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.deepEqual(fixture.transaction.calls[4].parameters, [
    derivedSubmissionKey,
    tenantId,
    templateKey,
    2,
    3,
    "123456789",
    "v23.0",
    "templates.submit",
    idempotencyKey,
  ]);
  assert.equal(
    fixture.transaction.calls[5].sql,
    postgresMessageTemplateSubmissionOutboxSql.insertEvent,
  );
  assert.deepEqual(fixture.transaction.calls[5].parameters.slice(4, 12), [
    "staged",
    null,
    "pending",
    0,
    1,
    "user",
    "verified-user",
    idempotencyKey,
  ]);
  assert.equal(
    fixture.transaction.calls[7].sql,
    postgresRailwayMessageTemplateSubmissionMutationSql.completeReceipt,
  );
  assert.deepEqual(
    JSON.parse(fixture.transaction.calls[7].parameters[4]),
    result.queueMessage,
  );
  fixture.transaction.assertConsumed();
});

test("replays the exact queue identity without touching template or Meta state", async () => {
  const submissionKey = `template_submission_v1_${"d".repeat(64)}`;
  const queueMessage = { version: 1, tenantId, submissionKey };
  const fixture = executorFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [{
        requestDigest,
        status: "completed",
        responseJson: JSON.stringify(queueMessage),
      }],
      rowCount: 1,
    },
  ]);

  assert.deepEqual(await fixture.executor.execute(command()), {
    outcome: "replayed",
    tenantId,
    queueMessage,
  });
  assert.equal(fixture.transaction.calls.length, 2);
});

test("returns bounded conflict and lifecycle outcomes", async () => {
  const conflict = executorFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [{
        requestDigest: `railway_mutation_request_v1_${"e".repeat(64)}`,
        status: "completed",
        responseJson: null,
      }],
      rowCount: 1,
    },
  ]);
  assert.deepEqual(await conflict.executor.execute(command()), {
    outcome: "conflict",
    tenantId: null,
    queueMessage: null,
  });

  const noMeta = executorFixture([
    { rows: [{ idempotencyKey }], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.deepEqual(await noMeta.executor.execute(command()), {
    outcome: "meta-not-connected",
    tenantId: null,
    queueMessage: null,
  });

  const notFound = executorFixture([
    { rows: [{ idempotencyKey }], rowCount: 1 },
    {
      rows: [{ version: 3, wabaId: "123456789", status: "connected" }],
      rowCount: 1,
    },
    { rows: [], rowCount: 0 },
  ]);
  assert.deepEqual(await notFound.executor.execute(command()), {
    outcome: "not-found",
    tenantId: null,
    queueMessage: null,
  });

  const notEditable = executorFixture([
    { rows: [{ idempotencyKey }], rowCount: 1 },
    {
      rows: [{ version: 3, wabaId: "123456789", status: "connected" }],
      rowCount: 1,
    },
    {
      rows: [templateRow({
        status: "submitting",
        submissionKey: `template_submission_v1_${"f".repeat(64)}`,
        submissionStartedAt: new Date(occurredAt),
        version: 2,
        updatedAt: new Date(occurredAt),
      })],
      rowCount: 1,
    },
  ]);
  assert.deepEqual(await notEditable.executor.execute(command()), {
    outcome: "not-editable",
    tenantId: null,
    queueMessage: null,
  });
});

test("fails closed before SQL for malformed commands and after storage faults", async () => {
  const malformed = executorFixture([]);
  assert.deepEqual(
    await malformed.executor.execute(command({ payload: { templateKey, extra: true } })),
    { outcome: "unavailable", tenantId: null, queueMessage: null },
  );
  assert.equal(malformed.transactionCalls.length, 0);

  const failed = executorFixture([new Error("private database detail")]);
  assert.deepEqual(await failed.executor.execute(command()), {
    outcome: "unavailable",
    tenantId: null,
    queueMessage: null,
  });
});
