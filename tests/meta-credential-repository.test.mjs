import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialRepository,
} from "../db/metaCredentialRepository.ts";

const initializationVector = "AQIDBAUGBwgJCgsM";
const ciphertext = "AQIDBAUGBwgJCgsMDQ4PEA==";

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

  async run() {
    return this.database.runResults.shift() ?? {
      success: true,
    };
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return { success: true, results: [] };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.runResults = [];
    this.firstResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch() {
    return [];
  }
}

function envelope(overrides = {}) {
  return {
    tenantId: 7,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
    ...overrides,
  };
}

test("upserts only an encrypted Meta credential envelope in tenant scope", async () => {
  const database = new RecordingDatabase();
  const repository = createMetaCredentialRepository(database);

  await repository.store({
    tenantId: 7,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
  });

  assert.equal(database.recordings.length, 1);
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO meta_credential_envelopes/,
  );
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id\) DO UPDATE/,
  );
  assert.doesNotMatch(
    database.recordings[0].sql,
    /access_token|plaintext|provider_payload/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    "v1",
    initializationVector,
    ciphertext,
  ]);
});

test("loads and validates an envelope only by tenant ID", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(envelope());
  const repository = createMetaCredentialRepository(database);

  assert.deepEqual(
    await repository.findByTenantId(7),
    envelope(),
  );
  assert.match(
    database.recordings[0].sql,
    /WHERE tenant_id = \?1/,
  );
  assert.deepEqual(database.recordings[0].values, [7]);
});

test("rejects malformed envelopes before storing or returning them", async () => {
  const database = new RecordingDatabase();
  const repository = createMetaCredentialRepository(database);

  await assert.rejects(
    repository.store({
      tenantId: 0,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /tenantId/,
  );
  await assert.rejects(
    repository.store({
      tenantId: 7,
      keyVersion: "v2",
      initializationVector,
      ciphertext,
    }),
    /key version/,
  );
  await assert.rejects(
    repository.store({
      tenantId: 7,
      keyVersion: "v1",
      initializationVector: "invalid",
      ciphertext,
    }),
    /initialization vector/,
  );
  assert.equal(database.recordings.length, 0);

  database.firstResults.push(
    envelope({
      ciphertext: "not-base64",
    }),
  );

  await assert.rejects(
    repository.findByTenantId(7),
    /ciphertext/,
  );
});

test("surfaces a failed encrypted write without storing a fallback", async () => {
  const database = new RecordingDatabase();
  database.runResults.push({
    success: false,
    error: "database failure",
  });
  const repository = createMetaCredentialRepository(database);

  await assert.rejects(
    repository.store({
      tenantId: 7,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /database failure/,
  );
  assert.equal(database.recordings.length, 1);
});
