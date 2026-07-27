import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactRepository,
} from "../db/contactRepository.ts";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({ sql: this.sql, values });
    return this;
  }

  async run() {
    return this.database.runResult;
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return this.database.allResult;
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.runResult = { success: true };
    this.firstResults = [];
    this.allResult = {
      success: true,
      results: [],
    };
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }
}

const contactRow = {
  id: 23,
  tenantId: 7,
  phoneNumber: "+972501234567",
  firstName: "first-name",
  lastName: null,
  email: null,
  company: "company-name",
  mailingStatus: "unsubscribed",
  consentStatus: "unknown",
  consentSource: null,
  consentRecordedAt: null,
  consentWithdrawnAt: null,
  consentEvidenceReference: null,
  version: 1,
  createdAt: "created-at",
  updatedAt: "updated-at",
};

test("upserts profile fields without changing consent state", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(contactRow);
  const repository = createContactRepository(database);

  const result = await repository.saveProfile({
    tenantId: 7,
    phoneNumber: "+972501234567",
    firstName: "first-name",
    lastName: null,
    email: null,
    company: "company-name",
  });

  assert.equal(database.recordings.length, 2);
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, phone_e164\)/,
  );
  assert.doesNotMatch(database.recordings[0].sql, /mailing_status\s*=/);
  assert.doesNotMatch(database.recordings[0].sql, /consent_status\s*=/);
  assert.deepEqual(database.recordings[0].values, [
    7,
    "+972501234567",
    "first-name",
    null,
    null,
    "company-name",
  ]);
  assert.match(
    database.recordings[1].sql,
    /WHERE tenant_id = \?1[\s\S]+phone_e164 = \?2/,
  );
  assert.deepEqual(result, contactRow);
});

test("reads a contact through tenant and contact ID scope", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(contactRow);
  const repository = createContactRepository(database);

  const result = await repository.findByTenantAndId(7, 23);

  assert.deepEqual(database.recordings[0].values, [7, 23]);
  assert.match(
    database.recordings[0].sql,
    /WHERE tenant_id = \?1[\s\S]+id = \?2/,
  );
  assert.deepEqual(result, contactRow);
});

test("reads a contact through tenant and normalized phone scope", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(contactRow);
  const repository = createContactRepository(database);

  const result = await repository.findByTenantAndPhone(
    7,
    "+972501234567",
  );

  assert.deepEqual(database.recordings[0].values, [
    7,
    "+972501234567",
  ]);
  assert.match(
    database.recordings[0].sql,
    /WHERE tenant_id = \?1[\s\S]+phone_e164 = \?2/,
  );
  assert.deepEqual(result, contactRow);
});

test("surfaces a failed contact write", async () => {
  const database = new RecordingDatabase();
  database.runResult = {
    success: false,
    error: "contact-write-failed",
  };
  const repository = createContactRepository(database);

  await assert.rejects(
    repository.saveProfile({
      tenantId: 7,
      phoneNumber: "+972501234567",
      firstName: null,
      lastName: null,
      email: null,
      company: null,
    }),
    /contact-write-failed/,
  );
});

test("lists only the requested tenant with a bounded deterministic query", async () => {
  const database = new RecordingDatabase();
  database.allResult = {
    success: true,
    results: [contactRow],
  };
  const repository = createContactRepository(database);

  const result = await repository.listByTenant(7, 50);

  assert.deepEqual(result, [contactRow]);
  assert.deepEqual(database.recordings[0].values, [7, null, 50]);
  assert.match(database.recordings[0].sql, /WHERE tenant_id = \?1/);
  assert.match(
    database.recordings[0].sql,
    /\(\?2 IS NULL OR id < \?2\)/,
  );
  assert.match(database.recordings[0].sql, /ORDER BY id DESC/);
  assert.match(database.recordings[0].sql, /LIMIT \?3/);
  await assert.rejects(
    repository.listByTenant(7, 101),
    /limit must not exceed 100/,
  );
});

test("uses a tenant-scoped keyset cursor for older contacts", async () => {
  const database = new RecordingDatabase();
  database.allResult = {
    success: true,
    results: [contactRow],
  };
  const repository = createContactRepository(database);

  const result = await repository.listPageByTenant(7, 24, 51);

  assert.deepEqual(result, [contactRow]);
  assert.deepEqual(database.recordings[0].values, [7, 24, 51]);
  assert.match(database.recordings[0].sql, /id < \?2/);
  await assert.rejects(
    repository.listPageByTenant(7, 0, 51),
    /beforeContactId must be a positive integer/,
  );
});

test("surfaces a failed contact list read", async () => {
  const database = new RecordingDatabase();
  database.allResult = {
    success: false,
    error: "contact-list-failed",
  };
  const repository = createContactRepository(database);

  await assert.rejects(
    repository.listByTenant(7, 50),
    /contact-list-failed/,
  );
});
