import assert from "node:assert/strict";
import test from "node:test";

import {
  createBusinessProfileRepository,
} from "../db/businessProfileRepository.ts";
import { requireDatabase } from "../db/d1.ts";

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

  async first() {
    return this.database.firstResult;
  }

  async run() {
    return this.database.runResult;
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.firstResult = null;
    this.batchResult = null;
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch(statements) {
    return (
      this.batchResult ??
      statements.map(() => ({
        success: true,
      }))
    );
  }
}

test("requires the configured DB binding", () => {
  const database = new RecordingDatabase();

  assert.equal(requireDatabase({ DB: database }), database);
  assert.throws(
    () => requireDatabase({}),
    /Missing required D1 binding: DB/,
  );
});

test("reads a business profile through a tenant-scoped prepared statement", async () => {
  const database = new RecordingDatabase();
  database.firstResult = {
    tenantId: 7,
    businessName: "business-name",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    version: 1,
    createdAt: "created-at",
    updatedAt: "updated-at",
  };

  const repository = createBusinessProfileRepository(database);
  const result = await repository.findByTenantId(7);

  assert.equal(result, database.firstResult);
  assert.equal(database.recordings.length, 1);
  assert.match(database.recordings[0].sql, /WHERE tenant_id = \?/);
  assert.deepEqual(database.recordings[0].values, [7]);
});

test("writes a trimmed profile through two statements in one atomic batch", async () => {
  const database = new RecordingDatabase();
  const repository = createBusinessProfileRepository(database);

  await repository.save({
    tenantId: 7,
    businessName: "  business-name  ",
    timezone: "  Asia/Jerusalem  ",
    interfaceLanguage: "he",
  });

  assert.equal(database.recordings.length, 2);
  assert.match(database.recordings[0].sql, /UPDATE tenants/);
  assert.deepEqual(database.recordings[0].values, [7, "business-name"]);
  assert.match(database.recordings[1].sql, /ON CONFLICT \(tenant_id\)/);
  assert.match(
    database.recordings[1].sql,
    /version = business_profiles\.version \+ 1/,
  );
  assert.match(
    database.recordings[1].sql,
    /WHERE business_profiles\.business_name IS NOT excluded\.business_name/,
  );
  assert.deepEqual(database.recordings[1].values, [
    7,
    "business-name",
    "Asia/Jerusalem",
    "he",
  ]);
});

test("rejects invalid tenant scope and blank profile fields before D1 access", async () => {
  const database = new RecordingDatabase();
  const repository = createBusinessProfileRepository(database);

  await assert.rejects(
    repository.findByTenantId(0),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    repository.save({
      tenantId: 7,
      businessName: " ",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    /businessName must not be blank/,
  );

  assert.equal(database.recordings.length, 0);
});

test("surfaces a failed D1 write", async () => {
  const database = new RecordingDatabase();
  database.batchResult = [
    { success: true },
    {
      success: false,
      error: "write-failed",
    },
  ];
  const repository = createBusinessProfileRepository(database);

  await assert.rejects(
    repository.save({
      tenantId: 7,
      businessName: "business-name",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    /write-failed/,
  );
});
