import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactConsentRepository,
} from "../db/contactConsentRepository.ts";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.batchResult = [{ success: true }, { success: true }];
    this.firstResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch(statements) {
    assert.equal(statements.length, 2);
    return this.batchResult;
  }
}

const input = {
  tenantId: 7,
  contactId: 23,
  eventType: "unsubscribed",
  source: "contact-request",
  occurredAt: "2026-07-25T09:34:56.000Z",
  evidenceReference: "evidence-reference",
  actorExternalUserId: "external-user-id",
  idempotencyKey: "contact_consent_v1_key",
};

const eventRow = {
  ...input,
};

const contactRow = {
  id: 23,
  tenantId: 7,
  phoneNumber: "+972501234567",
  firstName: null,
  lastName: null,
  email: null,
  company: null,
  mailingStatus: "unsubscribed",
  consentStatus: "withdrawn",
  consentSource: "contact-request",
  consentRecordedAt: "2026-07-25T09:34:56.000Z",
  consentWithdrawnAt: "2026-07-25T09:34:56.000Z",
  consentEvidenceReference: "evidence-reference",
  version: 2,
  createdAt: "created-at",
  updatedAt: "updated-at",
};

test("records and applies only the latest consent event atomically", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(eventRow, contactRow);
  const repository = createContactConsentRepository(database);

  const result = await repository.recordEvent(input);

  assert.equal(database.recordings.length, 4);
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, idempotency_key\) DO NOTHING/,
  );
  assert.match(database.recordings[1].sql, /UPDATE contacts/);
  assert.match(
    database.recordings[1].sql,
    /NOT EXISTS \([\s\S]+newer_event\.occurred_at > matching_event\.occurred_at/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    23,
    "unsubscribed",
    "contact-request",
    "2026-07-25T09:34:56.000Z",
    "evidence-reference",
    "external-user-id",
    "contact_consent_v1_key",
  ]);
  assert.deepEqual(result, contactRow);
});

test("rejects reuse of an idempotency key with different content", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({
    ...eventRow,
    source: "different-source",
  });
  const repository = createContactConsentRepository(database);

  await assert.rejects(
    repository.recordEvent(input),
    /idempotency key conflict/,
  );
});

test("surfaces an atomic consent batch failure", async () => {
  const database = new RecordingDatabase();
  database.batchResult = [
    { success: true },
    { success: false, error: "consent-write-failed" },
  ];
  const repository = createContactConsentRepository(database);

  await assert.rejects(
    repository.recordEvent(input),
    /consent-write-failed/,
  );
});
