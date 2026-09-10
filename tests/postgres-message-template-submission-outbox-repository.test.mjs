import assert from "node:assert/strict";
import test from "node:test";

import { MessageTemplateTransitionError } from
  "../db/messageTemplateRepository.ts";
import {
  createPostgresMessageTemplateSubmissionOutboxRepository,
  postgresMessageTemplateSubmissionOutboxSql,
} from "../server/platform/postgresMessageTemplateSubmissionOutboxRepository.ts";

const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const idempotencyKey = `connect_idempotency_v1_${"c".repeat(64)}`;
const createdAt = new Date("2026-08-17T08:00:00.000Z");
const claimedAt = new Date("2026-08-17T08:01:00.000Z");
const settledAt = new Date("2026-08-17T08:02:00.000Z");

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
    status: "submitting",
    definitionJson: definition(),
    submissionKey,
    submissionStartedAt: claimedAt,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 2,
    submittedAt: null,
    reviewedAt: null,
    createdAt,
    updatedAt: claimedAt,
    ...overrides,
  };
}

function outboxRow(status = "pending", overrides = {}) {
  const shapes = {
    pending: {
      stateVersion: 1,
      attemptCount: "0",
      lastErrorCode: null,
      metaTemplateId: null,
      claimedAt: null,
      settledAt: null,
      updatedAt: createdAt,
    },
    submitting: {
      stateVersion: 2,
      attemptCount: "1",
      lastErrorCode: null,
      metaTemplateId: null,
      claimedAt,
      settledAt: null,
      updatedAt: claimedAt,
    },
    submitted: {
      stateVersion: 3,
      attemptCount: "1",
      lastErrorCode: null,
      metaTemplateId: "400004",
      claimedAt,
      settledAt,
      updatedAt: settledAt,
    },
    rejected: {
      stateVersion: 3,
      attemptCount: "1",
      lastErrorCode: "META_TEMPLATE_REJECTED",
      metaTemplateId: null,
      claimedAt,
      settledAt,
      updatedAt: settledAt,
    },
    blocked: {
      stateVersion: 2,
      attemptCount: "0",
      lastErrorCode: "META_CONNECTION_CHANGED",
      metaTemplateId: null,
      claimedAt: null,
      settledAt,
      updatedAt: settledAt,
    },
    ambiguous: {
      stateVersion: 3,
      attemptCount: "1",
      lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN",
      metaTemplateId: null,
      claimedAt,
      settledAt: null,
      updatedAt: settledAt,
    },
  };

  return {
    submissionKey,
    tenantId: String(tenantId),
    templateKey,
    templateVersion: "2",
    metaConnectionVersion: "3",
    wabaId: "123456789",
    graphApiVersion: "v23.0",
    requestOperation: "templates.submit",
    requestIdempotencyKey: idempotencyKey,
    status,
    createdAt,
    ...shapes[status],
    ...overrides,
  };
}

function contextRow(status = "pending", overrides = {}) {
  return {
    ...outboxRow(status),
    currentConnectionVersion: "3",
    currentWabaId: "123456789",
    currentConnectionStatus: "connected",
    currentTemplateStatus: "submitting",
    currentTemplateSubmissionKey: submissionKey,
    ...overrides,
  };
}

function releasedTemplateRow(errorCode = "META_TEMPLATE_REJECTED") {
  return templateRow({
    status: "draft",
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: errorCode,
    version: 3,
    updatedAt: settledAt,
  });
}

function submittedTemplateRow() {
  return templateRow({
    metaTemplateId: "400004",
    status: "pending_review",
    version: 3,
    submittedAt: settledAt,
    updatedAt: settledAt,
  });
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

function confirmedEvent(_sql, parameters) {
  return { rows: [{ eventKey: parameters[0] }], rowCount: 1 };
}

function repositoryFixture(transactionResponses = [], queryResponses = []) {
  const transaction = queryFixture(transactionResponses);
  const queries = queryFixture(queryResponses);
  const transactionCalls = [];

  return {
    transaction,
    queries,
    transactionCalls,
    repository: createPostgresMessageTemplateSubmissionOutboxRepository({
      queries,
      transactions: {
        async transaction(options, execute) {
          transactionCalls.push(options);
          return execute(transaction);
        },
      },
    }),
  };
}

test("reads one exact tenant-scoped outbox row and rejects malformed rows", async () => {
  const fixture = repositoryFixture([], [
    { rows: [outboxRow()], rowCount: 1 },
  ]);

  const found = await fixture.repository.find(tenantId, submissionKey);
  assert.equal(found?.tenantId, tenantId);
  assert.equal(found?.status, "pending");
  assert.deepEqual(fixture.queries.calls[0], {
    sql: postgresMessageTemplateSubmissionOutboxSql.find,
    parameters: [tenantId, submissionKey],
  });

  const malformed = repositoryFixture([], [{
    rows: [{ ...outboxRow(), unexpected: true }],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.find(tenantId, submissionKey),
    /invalid row shape/,
  );
});

test("lists bounded pending and ambiguous scheduler candidates deterministically", async () => {
  const pendingCutoff = "2026-08-17T08:00:30.000Z";
  const ambiguousCutoff = "2026-08-17T08:02:30.000Z";
  const fixture = repositoryFixture([], [
    { rows: [outboxRow("pending")], rowCount: 1 },
    { rows: [outboxRow("ambiguous")], rowCount: 1 },
  ]);

  const pending = await fixture.repository.listPendingBefore(pendingCutoff, 10);
  const ambiguous = await fixture.repository.listAmbiguousBefore(
    ambiguousCutoff,
    10,
  );

  assert.deepEqual(pending.map(({ status }) => status), ["pending"]);
  assert.deepEqual(ambiguous.map(({ status }) => status), ["ambiguous"]);
  assert.deepEqual(fixture.queries.calls, [
    {
      sql: postgresMessageTemplateSubmissionOutboxSql.listPendingBefore,
      parameters: [pendingCutoff, 10],
    },
    {
      sql: postgresMessageTemplateSubmissionOutboxSql.listAmbiguousBefore,
      parameters: [ambiguousCutoff, 10],
    },
  ]);
  fixture.queries.assertConsumed();
});

test("candidate scans reject invalid bounds and cross-state rows", async () => {
  const fixture = repositoryFixture([], [
    { rows: [outboxRow("submitted")], rowCount: 1 },
  ]);

  for (const limit of [0, 101, 1.5]) {
    await assert.rejects(
      fixture.repository.listPendingBefore(claimedAt.toISOString(), limit),
      /candidate limit is invalid/,
    );
  }
  await assert.rejects(
    fixture.repository.listPendingBefore("invalid", 10),
    /timestamp is invalid/,
  );
  await assert.rejects(
    fixture.repository.listPendingBefore(settledAt.toISOString(), 10),
    /invalid submission candidate/,
  );
  fixture.queries.assertConsumed();
});

test("claims a pending submission and returns the exact prepared template", async () => {
  const fixture = repositoryFixture([
    { rows: [contextRow()], rowCount: 1 },
    { rows: [outboxRow("submitting")], rowCount: 1 },
    confirmedEvent,
    { rows: [templateRow()], rowCount: 1 },
  ]);

  const result = await fixture.repository.claim(
    tenantId,
    submissionKey,
    "v23.0",
    claimedAt.toISOString(),
  );

  assert.equal(result.outcome, "claimed");
  assert.equal(result.prepared.outbox.status, "submitting");
  assert.equal(result.prepared.template.status, "submitting");
  assert.deepEqual(fixture.transactionCalls, [
    { isolationLevel: "repeatable-read" },
  ]);
  assert.deepEqual(
    fixture.transaction.calls.slice(0, 3).map(({ sql }) => sql),
    [
      postgresMessageTemplateSubmissionOutboxSql.lockContext,
      postgresMessageTemplateSubmissionOutboxSql.claim,
      postgresMessageTemplateSubmissionOutboxSql.insertEvent,
    ],
  );
  assert.match(
    fixture.transaction.calls[3].sql,
    /FROM message_templates AS templates/,
  );
  assert.equal(
    fixture.transaction.calls[2].parameters[4],
    "claimed",
  );
  fixture.transaction.assertConsumed();
});

test("blocks a pending item when the live Meta connection changed", async () => {
  const fixture = repositoryFixture([
    {
      rows: [contextRow("pending", { currentConnectionVersion: "4" })],
      rowCount: 1,
    },
    { rows: [outboxRow("blocked")], rowCount: 1 },
    { rows: [releasedTemplateRow("META_CONNECTION_CHANGED")], rowCount: 1 },
    confirmedEvent,
  ]);

  const result = await fixture.repository.claim(
    tenantId,
    submissionKey,
    "v23.0",
    settledAt.toISOString(),
  );

  assert.equal(result.outcome, "blocked");
  assert.equal(result.outbox.lastErrorCode, "META_CONNECTION_CHANGED");
  assert.equal(fixture.transaction.calls[1].parameters[2], "META_CONNECTION_CHANGED");
  assert.equal(fixture.transaction.calls[2].parameters[3], "META_CONNECTION_CHANGED");
  assert.equal(fixture.transaction.calls[3].parameters[4], "blocked");
  fixture.transaction.assertConsumed();
});

test("turns a second claim into ambiguous instead of retrying the provider", async () => {
  const fixture = repositoryFixture([
    { rows: [contextRow("submitting")], rowCount: 1 },
    { rows: [outboxRow("ambiguous")], rowCount: 1 },
    confirmedEvent,
  ]);

  const result = await fixture.repository.claim(
    tenantId,
    submissionKey,
    "v23.0",
    settledAt.toISOString(),
  );

  assert.equal(result.outcome, "ambiguous");
  assert.equal(result.outbox.lastErrorCode, "PROVIDER_OUTCOME_UNKNOWN");
  assert.equal(fixture.transaction.calls[1].parameters[2], "PROVIDER_OUTCOME_UNKNOWN");
  assert.equal(fixture.transaction.calls[2].parameters[4], "ambiguous");
  fixture.transaction.assertConsumed();
});

test("settles provider success with template state and event in one transaction", async () => {
  const fixture = repositoryFixture([
    { rows: [contextRow("submitting")], rowCount: 1 },
    { rows: [outboxRow("submitted")], rowCount: 1 },
    { rows: [submittedTemplateRow()], rowCount: 1 },
    confirmedEvent,
  ]);

  const settled = await fixture.repository.markSubmitted(
    tenantId,
    submissionKey,
    "400004",
    settledAt.toISOString(),
  );

  assert.equal(settled.status, "submitted");
  assert.equal(settled.metaTemplateId, "400004");
  assert.deepEqual(fixture.transaction.calls[2].parameters, [
    tenantId,
    templateKey,
    submissionKey,
    "400004",
  ]);
  assert.equal(fixture.transaction.calls[3].parameters[4], "submitted");
  fixture.transaction.assertConsumed();
});

test("releases a rejected submission and reconciles ambiguous success", async () => {
  const rejected = repositoryFixture([
    { rows: [contextRow("submitting")], rowCount: 1 },
    { rows: [outboxRow("rejected")], rowCount: 1 },
    { rows: [releasedTemplateRow()], rowCount: 1 },
    confirmedEvent,
  ]);
  assert.equal(
    (await rejected.repository.markRejected(
      tenantId,
      submissionKey,
      "META_TEMPLATE_REJECTED",
      settledAt.toISOString(),
    )).status,
    "rejected",
  );
  assert.equal(rejected.transaction.calls[3].parameters[4], "rejected");

  const reconciled = repositoryFixture([
    { rows: [contextRow("ambiguous")], rowCount: 1 },
    {
      rows: [outboxRow("submitted", { stateVersion: 4 })],
      rowCount: 1,
    },
    { rows: [submittedTemplateRow()], rowCount: 1 },
    confirmedEvent,
  ]);
  const result = await reconciled.repository.reconcileSubmitted(
    tenantId,
    submissionKey,
    "400004",
    settledAt.toISOString(),
  );
  assert.equal(result.stateVersion, 4);
  assert.equal(
    reconciled.transaction.calls[3].parameters[4],
    "reconciled-submitted",
  );
});

test("fails closed on invalid input and impossible transitions", async () => {
  const fixture = repositoryFixture();
  assert.throws(
    () => fixture.repository.claim(
      tenantId,
      submissionKey,
      "latest",
      claimedAt.toISOString(),
    ),
    /Graph API version is invalid/,
  );
  assert.throws(
    () => fixture.repository.markSubmitted(
      tenantId,
      submissionKey,
      "not-a-meta-id",
      settledAt.toISOString(),
    ),
    /Meta template ID is invalid/,
  );

  const transition = repositoryFixture([
    { rows: [contextRow("submitting")], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    transition.repository.markSubmitted(
      tenantId,
      submissionKey,
      "400004",
      settledAt.toISOString(),
    ),
    (error) => error instanceof MessageTemplateTransitionError,
  );
});
