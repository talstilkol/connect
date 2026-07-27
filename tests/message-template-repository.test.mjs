import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateRepository,
  MessageTemplateIdentityConflictError,
  MessageTemplateLockedError,
} from "../db/messageTemplateRepository.ts";

const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey =
  `template_submission_v1_${"b".repeat(64)}`;

function definition() {
  return {
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: {
      1: "שם איש קשר",
    },
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

function row(overrides = {}) {
  return {
    templateKey,
    tenantId: 7,
    metaTemplateId: null,
    name: "service_update",
    language: "he",
    category: "UTILITY",
    status: "draft",
    definitionJson: JSON.stringify(definition()),
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
    ...overrides,
  };
}

function saveInput() {
  return {
    templateKey,
    tenantId: 7,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    ...definition(),
  };
}

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({
      sql: this.sql,
      values,
    });
    return this;
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return (
      this.database.allResults.shift() ?? {
        success: true,
        results: [],
      }
    );
  }

  async run() {
    return { success: true };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.firstResults = [];
    this.allResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }
}

test("upserts and returns a tenant-scoped draft definition", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(row());
  const repository = createMessageTemplateRepository(
    database,
  );

  const saved = await repository.saveDraft(saveInput());

  assert.equal(saved.templateKey, templateKey);
  assert.equal(saved.tenantId, 7);
  assert.equal(saved.status, "draft");
  assert.equal(saved.body, "שלום {{1}}");
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO message_templates/,
  );
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, name, language\)/,
  );
  assert.match(
    database.recordings[0].sql,
    /message_templates\.status = 'draft'/,
  );
  assert.match(
    database.recordings[0].sql,
    /last_submission_error_code = null/,
  );
  assert.deepEqual(
    database.recordings[0].values.slice(0, 5),
    [
      templateKey,
      7,
      "service_update",
      "he",
      "UTILITY",
    ],
  );
});

test("returns an unchanged draft after a no-op upsert", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(null, row());
  const repository = createMessageTemplateRepository(
    database,
  );

  const saved = await repository.saveDraft(saveInput());

  assert.equal(saved.version, 1);
  assert.match(
    database.recordings[1].sql,
    /WHERE tenant_id = \?1[\s\S]+template_key = \?2/,
  );
  assert.deepEqual(database.recordings[1].values, [
    7,
    templateKey,
  ]);
});

test("does not overwrite a template after submission", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    null,
    row({
      metaTemplateId: "123456789",
      status: "approved",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:00:30",
      submittedAt: "2026-07-25 10:01:00",
      reviewedAt: "2026-07-25 10:02:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  await assert.rejects(
    repository.saveDraft(saveInput()),
    (error) => error instanceof MessageTemplateLockedError,
  );
});

test("lists templates only inside the requested tenant scope", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [row()],
  });
  const repository = createMessageTemplateRepository(
    database,
  );

  const templates = await repository.listByTenant(7, 100);

  assert.equal(templates.length, 1);
  assert.deepEqual(database.recordings[0].values, [7, 100]);
  assert.match(
    database.recordings[0].sql,
    /WHERE tenant_id = \?1/,
  );
  assert.match(
    database.recordings[0].sql,
    /ORDER BY updated_at DESC, template_key ASC/,
  );
});

test("rejects malformed stored definitions", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    row({
      definitionJson: "{\"body\":",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  await assert.rejects(
    repository.findByKey(7, templateKey),
    /invalid message template definition/,
  );
});

test("claims a specific draft version before external submission", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    row({
      status: "submitting",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:01:00",
      version: 2,
      updatedAt: "2026-07-25 10:01:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  const claimed = await repository.claimSubmission(
    7,
    templateKey,
    1,
    submissionKey,
  );

  assert.equal(claimed.status, "submitting");
  assert.equal(claimed.submissionKey, submissionKey);
  assert.deepEqual(database.recordings[0].values, [
    7,
    templateKey,
    1,
    submissionKey,
  ]);
  assert.match(
    database.recordings[0].sql,
    /status = 'draft'[\s\S]+version = \?3/,
  );
});

test("completes only the claimed submission as pending review", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    row({
      metaTemplateId: "123456789",
      status: "pending_review",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:01:00",
      version: 3,
      submittedAt: "2026-07-25 10:02:00",
      updatedAt: "2026-07-25 10:02:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  const completed = await repository.completeSubmission(
    7,
    templateKey,
    submissionKey,
    "123456789",
  );

  assert.equal(completed.status, "pending_review");
  assert.equal(completed.metaTemplateId, "123456789");
  assert.deepEqual(database.recordings[0].values, [
    7,
    templateKey,
    submissionKey,
    "123456789",
  ]);
  assert.match(
    database.recordings[0].sql,
    /status = 'submitting'[\s\S]+submission_key = \?3/,
  );
});

test("releases a known rejection back to an editable draft", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    row({
      lastSubmissionErrorCode: "META_TEMPLATE_REJECTED",
      version: 3,
      updatedAt: "2026-07-25 10:02:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  const released = await repository.releaseSubmission(
    7,
    templateKey,
    submissionKey,
    "META_TEMPLATE_REJECTED",
  );

  assert.equal(released.status, "draft");
  assert.equal(
    released.lastSubmissionErrorCode,
    "META_TEMPLATE_REJECTED",
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    templateKey,
    submissionKey,
    "META_TEMPLATE_REJECTED",
  ]);
  assert.match(
    database.recordings[0].sql,
    /submission_key = null[\s\S]+status = 'submitting'/,
  );
});

test("rejects a stale or conflicting lifecycle transition", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(null);
  const repository = createMessageTemplateRepository(
    database,
  );

  await assert.rejects(
    repository.claimSubmission(
      7,
      templateKey,
      1,
      submissionKey,
    ),
    (error) => error.code === "STATE_CONFLICT",
  );
});

test("applies a tenant-scoped status event and records its deterministic identity", async () => {
  const database = new RecordingDatabase();
  const statusEventKey = "c".repeat(64);
  const statusEventAt = "2026-07-25T10:03:00.000Z";
  database.firstResults.push(
    row({
      metaTemplateId: "123456789",
      status: "approved",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:01:00",
      lastStatusEventKey: statusEventKey,
      lastStatusEventAt: statusEventAt,
      version: 4,
      submittedAt: "2026-07-25 10:02:00",
      reviewedAt: statusEventAt,
      updatedAt: "2026-07-25 10:03:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  const result = await repository.applyStatusEvent({
    tenantId: 7,
    metaTemplateId: "123456789",
    name: "service_update",
    language: "he",
    category: "UTILITY",
    status: "approved",
    statusEventKey,
    statusEventAt,
  });

  assert.equal(result.outcome, "applied");
  assert.equal(result.template.status, "approved");
  assert.deepEqual(database.recordings[0].values, [
    7,
    "123456789",
    "service_update",
    "he",
    "UTILITY",
    "approved",
    statusEventKey,
    statusEventAt,
  ]);
  assert.match(
    database.recordings[0].sql,
    /last_status_event_at < \?8[\s\S]+last_status_event_key < \?7/,
  );
  assert.match(
    database.recordings[0].sql,
    /meta_template_id = coalesce\(meta_template_id, \?2\)/,
  );
});

test("returns duplicate or stale without applying a second status transition", async () => {
  const database = new RecordingDatabase();
  const existingEventKey = "d".repeat(64);
  const existingEventAt = "2026-07-25T10:03:00.000Z";
  const existing = row({
    metaTemplateId: "123456789",
    status: "approved",
    submissionKey,
    submissionStartedAt: "2026-07-25 10:01:00",
    lastStatusEventKey: existingEventKey,
    lastStatusEventAt: existingEventAt,
    version: 4,
    submittedAt: "2026-07-25 10:02:00",
    reviewedAt: existingEventAt,
  });
  database.firstResults.push(null, existing, null, existing);
  const repository = createMessageTemplateRepository(
    database,
  );

  const duplicate = await repository.applyStatusEvent({
    tenantId: 7,
    metaTemplateId: "123456789",
    name: "service_update",
    language: "he",
    status: "approved",
    statusEventKey: existingEventKey,
    statusEventAt: existingEventAt,
  });
  const stale = await repository.applyStatusEvent({
    tenantId: 7,
    metaTemplateId: "123456789",
    name: "service_update",
    language: "he",
    status: "rejected",
    statusEventKey: "e".repeat(64),
    statusEventAt: "2026-07-25T10:02:30.000Z",
  });

  assert.equal(duplicate.outcome, "duplicate");
  assert.equal(stale.outcome, "stale");
  assert.equal(stale.template.status, "approved");
});

test("ignores an unlinked draft but rejects a conflicting Meta identity", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    null,
    row(),
    null,
    null,
    null,
    row({
      metaTemplateId: "987654321",
      status: "pending_review",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:01:00",
      submittedAt: "2026-07-25 10:02:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );
  const input = {
    tenantId: 7,
    metaTemplateId: "123456789",
    name: "service_update",
    language: "he",
    status: "approved",
    statusEventKey: "f".repeat(64),
    statusEventAt: "2026-07-25T10:03:00.000Z",
  };

  const unlinked = await repository.applyStatusEvent(input);

  assert.deepEqual(unlinked, { outcome: "not-found" });
  await assert.rejects(
    repository.applyStatusEvent({
      ...input,
      name: "different_template",
    }),
    (error) =>
      error instanceof
      MessageTemplateIdentityConflictError,
  );
});

test("rejects a provider category that conflicts with the stored identity", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    null,
    row({
      metaTemplateId: "123456789",
      status: "pending_review",
      submissionKey,
      submissionStartedAt: "2026-07-25 10:01:00",
      submittedAt: "2026-07-25 10:02:00",
    }),
  );
  const repository = createMessageTemplateRepository(
    database,
  );

  await assert.rejects(
    repository.applyStatusEvent({
      tenantId: 7,
      metaTemplateId: "123456789",
      name: "service_update",
      language: "he",
      category: "MARKETING",
      status: "approved",
      statusEventKey: "9".repeat(64),
      statusEventAt: "2026-07-25T10:03:00.000Z",
    }),
    (error) =>
      error instanceof
      MessageTemplateIdentityConflictError,
  );
  assert.match(
    database.recordings[0].sql,
    /\(\?5 IS null OR category = \?5\)/,
  );
});
