import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageTemplateIdentityConflictError,
  MessageTemplateLockedError,
  MessageTemplateTransitionError,
} from "../db/messageTemplateRepository.ts";
import {
  createPostgresMessageTemplateRepository,
  postgresMessageTemplateSql,
} from "../server/platform/postgresMessageTemplateRepository.ts";

const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const statusEventKey = "c".repeat(64);

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
    tenantId: "7",
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
    createdAt: new Date("2026-08-17T08:00:00.000Z"),
    updatedAt: new Date("2026-08-17T08:00:00.000Z"),
    ...overrides,
  };
}

function submittingRow(overrides = {}) {
  return templateRow({
    status: "submitting",
    submissionKey,
    submissionStartedAt: new Date("2026-08-17T08:01:00.000Z"),
    version: 2,
    updatedAt: new Date("2026-08-17T08:01:00.000Z"),
    ...overrides,
  });
}

function pendingRow(overrides = {}) {
  return submittingRow({
    metaTemplateId: "400004",
    status: "pending_review",
    submittedAt: new Date("2026-08-17T08:02:00.000Z"),
    version: 3,
    updatedAt: new Date("2026-08-17T08:02:00.000Z"),
    ...overrides,
  });
}

function approvedRow(overrides = {}) {
  return pendingRow({
    status: "approved",
    lastStatusEventKey: statusEventKey,
    lastStatusEventAt: new Date("2026-08-17T08:03:00.000Z"),
    reviewedAt: new Date("2026-08-17T08:03:00.000Z"),
    version: 4,
    updatedAt: new Date("2026-08-17T08:03:00.000Z"),
    ...overrides,
  });
}

function saveInput(overrides = {}) {
  return {
    templateKey,
    tenantId: 7,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    ...definition(),
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
    repository: createPostgresMessageTemplateRepository({
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

test("writes a normalized draft in one transaction", async () => {
  const fixture = repositoryFixture([
    { rows: [templateRow()], rowCount: 1 },
  ]);

  const saved = await fixture.repository.saveDraft(saveInput());

  assert.equal(saved.templateKey, templateKey);
  assert.equal(saved.status, "draft");
  assert.deepEqual(fixture.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.deepEqual(
    fixture.transactions.calls[0].parameters.slice(0, 5),
    [templateKey, 7, "service_update", "he", "UTILITY"],
  );
  assert.deepEqual(
    JSON.parse(fixture.transactions.calls[0].parameters[5]),
    definition(),
  );
  fixture.transactions.assertConsumed();
});

test("returns an exact no-op replay and rejects locked or mismatched drafts", async () => {
  const replay = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [templateRow()], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.saveDraft(saveInput())).version,
    1,
  );

  const locked = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [approvedRow()], rowCount: 1 },
  ]);
  await assert.rejects(
    locked.repository.saveDraft(saveInput()),
    (error) => error instanceof MessageTemplateLockedError,
  );

  const mismatched = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [templateRow({ category: "MARKETING" })], rowCount: 1 },
  ]);
  await assert.rejects(
    mismatched.repository.saveDraft(saveInput()),
    /draft conflicts/,
  );
});

test("reads bounded tenant-scoped templates and validates rows", async () => {
  const fixture = repositoryFixture([], [
    { rows: [templateRow()], rowCount: 1 },
    { rows: [approvedRow()], rowCount: 1 },
    { rows: [templateRow()], rowCount: 1 },
  ]);

  assert.equal(
    (await fixture.repository.findByKey(7, templateKey))?.tenantId,
    7,
  );
  assert.equal(
    (await fixture.repository.findByMetaId(7, "400004"))?.status,
    "approved",
  );
  assert.equal((await fixture.repository.listByTenant(7, 100)).length, 1);
  assert.deepEqual(fixture.queries.calls.map(({ parameters }) => parameters), [
    [7, templateKey],
    [7, "400004"],
    [7, 100],
  ]);

  const malformed = repositoryFixture([], [{
    rows: [templateRow({ definitionJson: { unknown: true } })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, templateKey),
    /invalid message template/,
  );
});

test("performs the three submission transitions with exact guards", async () => {
  const fixture = repositoryFixture([], [
    { rows: [submittingRow()], rowCount: 1 },
    { rows: [pendingRow()], rowCount: 1 },
    {
      rows: [templateRow({
        lastSubmissionErrorCode: "META_TEMPLATE_REJECTED",
        version: 3,
      })],
      rowCount: 1,
    },
  ]);

  assert.equal(
    (await fixture.repository.claimSubmission(
      7,
      templateKey,
      1,
      submissionKey,
    )).status,
    "submitting",
  );
  assert.equal(
    (await fixture.repository.completeSubmission(
      7,
      templateKey,
      submissionKey,
      "400004",
    )).status,
    "pending_review",
  );
  assert.equal(
    (await fixture.repository.releaseSubmission(
      7,
      templateKey,
      submissionKey,
      "META_TEMPLATE_REJECTED",
    )).status,
    "draft",
  );
  assert.deepEqual(fixture.queries.calls.map(({ parameters }) => parameters), [
    [7, templateKey, 1, submissionKey],
    [7, templateKey, submissionKey, "400004"],
    [7, templateKey, submissionKey, "META_TEMPLATE_REJECTED"],
  ]);
});

test("fails closed when a submission transition loses its race", async () => {
  const fixture = repositoryFixture([], [
    { rows: [], rowCount: 0 },
  ]);

  await assert.rejects(
    fixture.repository.claimSubmission(7, templateKey, 1, submissionKey),
    (error) => error instanceof MessageTemplateTransitionError,
  );
});

test("applies a newer status event atomically", async () => {
  const fixture = repositoryFixture([
    { rows: [approvedRow()], rowCount: 1 },
  ]);

  const result = await fixture.repository.applyStatusEvent({
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    category: "UTILITY",
    status: "approved",
    statusEventKey,
    statusEventAt: "2026-08-17T08:03:00.000Z",
  });

  assert.equal(result.outcome, "applied");
  assert.equal(result.template.status, "approved");
  assert.deepEqual(fixture.transactions.calls[0].parameters, [
    7,
    "400004",
    "service_update",
    "he",
    "UTILITY",
    "approved",
    statusEventKey,
    "2026-08-17T08:03:00.000Z",
  ]);
});

test("classifies duplicate and stale status events under a row lock", async () => {
  const stored = approvedRow();
  const fixture = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [stored], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [stored], rowCount: 1 },
  ]);
  const base = {
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    status: "approved",
    statusEventAt: "2026-08-17T08:03:00.000Z",
  };

  assert.equal(
    (await fixture.repository.applyStatusEvent({
      ...base,
      statusEventKey,
    })).outcome,
    "duplicate",
  );
  assert.equal(
    (await fixture.repository.applyStatusEvent({
      ...base,
      status: "rejected",
      statusEventKey: "d".repeat(64),
      statusEventAt: "2026-08-17T08:02:00.000Z",
    })).outcome,
    "stale",
  );
  assert.equal(fixture.transactionCalls.length, 2);
});

test("separates an unlinked draft from an identity conflict", async () => {
  const unlinked = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [templateRow()], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  const input = {
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    status: "approved",
    statusEventKey,
    statusEventAt: "2026-08-17T08:03:00.000Z",
  };
  assert.deepEqual(
    await unlinked.repository.applyStatusEvent(input),
    { outcome: "not-found" },
  );

  const conflicting = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [approvedRow({ metaTemplateId: "500005" })], rowCount: 1 },
  ]);
  await assert.rejects(
    conflicting.repository.applyStatusEvent(input),
    (error) => error instanceof MessageTemplateIdentityConflictError,
  );
});

test("maps a PostgreSQL Meta identity collision to a bounded conflict", async () => {
  const collision = new Error("duplicate key value");
  collision.code = "23505";
  const fixture = repositoryFixture([collision]);

  await assert.rejects(
    fixture.repository.applyStatusEvent({
      tenantId: 7,
      metaTemplateId: "400004",
      name: "service_update",
      language: "he",
      status: "approved",
      statusEventKey,
      statusEventAt: "2026-08-17T08:03:00.000Z",
    }),
    (error) => error instanceof MessageTemplateIdentityConflictError,
  );
});

test("uses tenant locks, millisecond timestamps, and deterministic event order", () => {
  assert.match(
    postgresMessageTemplateSql.insertDraft,
    /ON CONFLICT DO NOTHING/,
  );
  assert.match(
    postgresMessageTemplateSql.updateDraft,
    /template_key = \$1[\s\S]*tenant_id = \$2[\s\S]*name = \$3[\s\S]*language = \$4/,
  );
  assert.match(
    postgresMessageTemplateSql.findByIdentityForUpdate,
    /tenant_id = \$1[\s\S]*name = \$2[\s\S]*language = \$3[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresMessageTemplateSql.applyStatusEvent,
    /last_status_event_key IS DISTINCT FROM \$7[\s\S]*last_status_event_at < \$8::timestamptz/,
  );
  for (const sql of [
    postgresMessageTemplateSql.updateDraft,
    postgresMessageTemplateSql.claimSubmission,
    postgresMessageTemplateSql.completeSubmission,
    postgresMessageTemplateSql.releaseSubmission,
    postgresMessageTemplateSql.applyStatusEvent,
  ]) {
    assert.match(sql, /date_trunc\('milliseconds', CURRENT_TIMESTAMP\)/);
  }
});

test("validates all input before database access and rejects missing dependencies", async () => {
  const fixture = repositoryFixture();

  await assert.rejects(
    fixture.repository.saveDraft(saveInput({ templateKey: "plain-key" })),
    /templateKey is invalid/,
  );
  await assert.rejects(
    fixture.repository.listByTenant(7, 101),
    /limit must not exceed 100/,
  );
  await assert.rejects(
    fixture.repository.applyStatusEvent({
      tenantId: 7,
      metaTemplateId: "400004",
      name: "service_update",
      language: "he",
      status: "draft",
      statusEventKey,
      statusEventAt: "2026-08-17T08:03:00.000Z",
    }),
    /status event target is invalid/,
  );
  assert.equal(fixture.transactions.calls.length, 0);
  assert.equal(fixture.queries.calls.length, 0);
  assert.throws(
    () => createPostgresMessageTemplateRepository({}),
    /dependencies are invalid/,
  );
});
