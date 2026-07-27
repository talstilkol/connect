import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactImportRepository,
} from "../db/contactImportRepository.ts";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    this.database.recordings.push({
      sql: this.sql,
      values,
    });
    return this;
  }

  async run() {
    return this.database.runResults.shift() ?? { success: true };
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return {
      success: true,
      results: [],
    };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.batches = [];
    this.runResults = [];
    this.firstResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements);
    return statements.map(() => ({ success: true }));
  }
}

const jobRow = {
  id: 31,
  tenantId: 7,
  idempotencyKey: "contact_import_v1_key",
  fileName: "contacts.csv",
  totalRows: 3,
  processedRows: 0,
  createdRows: 0,
  updatedRows: 0,
  unchangedRows: 0,
  rejectedRows: 0,
  duplicateRows: 0,
  status: "processing",
  createdByExternalUserId: "external-user-id",
  createdAt: "created-at",
  updatedAt: "updated-at",
  completedAt: null,
};

test("starts or reloads an import through a tenant-scoped idempotency key", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(jobRow);
  const repository = createContactImportRepository(database);

  const result = await repository.startOrFind({
    tenantId: 7,
    idempotencyKey: "contact_import_v1_key",
    fileName: "contacts.csv",
    totalRows: 3,
    createdByExternalUserId: "external-user-id",
  });

  assert.deepEqual(result, jobRow);
  assert.match(database.recordings[0].sql, /ON CONFLICT.*DO NOTHING/s);
  assert.deepEqual(database.recordings[0].values, [
    7,
    "contact_import_v1_key",
    "contacts.csv",
    3,
    "external-user-id",
  ]);
  assert.match(
    database.recordings[1].sql,
    /WHERE tenant_id = \?1[\s\S]+idempotency_key = \?2/,
  );
});

test("writes a profile and accepted row in one batch without consent fields", async () => {
  const database = new RecordingDatabase();
  const repository = createContactImportRepository(database);

  await repository.recordAccepted({
    tenantId: 7,
    jobId: 31,
    sourceRowNumber: 2,
    phoneFingerprint: "f".repeat(64),
    status: "created",
    profile: {
      phoneNumber: "+972501234567",
      firstName: "contact-name",
      lastName: null,
      email: null,
      company: null,
    },
  });

  assert.equal(database.batches.length, 1);
  assert.equal(database.batches[0].length, 2);
  assert.match(database.recordings[0].sql, /INSERT INTO contacts/);
  assert.doesNotMatch(
    database.recordings[0].sql,
    /mailing_status|consent_status/,
  );
  assert.match(
    database.recordings[1].sql,
    /INSERT INTO contact_import_rows/,
  );
  assert.deepEqual(database.recordings[1].values, [
    7,
    31,
    2,
    "f".repeat(64),
    "created",
    "+972501234567",
  ]);
});

test("refreshes counters from stored row outcomes and reloads tenant scope", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({
    ...jobRow,
    processedRows: 3,
    createdRows: 1,
    rejectedRows: 1,
    duplicateRows: 1,
    status: "completed",
    completedAt: "completed-at",
  });
  const repository = createContactImportRepository(database);

  const result = await repository.refreshJob(7, 31);

  assert.equal(result.status, "completed");
  assert.match(database.recordings[0].sql, /processed_rows =/);
  assert.match(database.recordings[0].sql, /status = CASE/);
  assert.deepEqual(database.recordings[0].values, [7, 31]);
  assert.deepEqual(database.recordings[1].values, [7, 31]);
});
