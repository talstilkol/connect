import assert from "node:assert/strict";
import test from "node:test";

import {
  createTenantProvisioningRepository,
} from "../db/tenantProvisioningRepository.ts";

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
    return this.database.firstResult;
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.batchResult = Array.from({ length: 4 }, () => ({
      success: true,
    }));
    this.firstResult = {
      tenantId: 7,
      tenantDisplayName: "business-name",
      tenantStatus: "trial",
      businessName: "business-name",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      profileVersion: 1,
      profileCreatedAt: "created-at",
      profileUpdatedAt: "updated-at",
    };
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch(statements) {
    assert.equal(statements.length, 4);
    return this.batchResult;
  }
}

const input = {
  provisioningKey: "tenant_v1_key",
  externalUserId: "external-user-id",
  businessName: "  business-name  ",
  timezone: "  Asia/Jerusalem  ",
  interfaceLanguage: "he",
};

test("provisions tenant, owner, profile and audit in one idempotent batch", async () => {
  const database = new RecordingDatabase();
  const repository = createTenantProvisioningRepository(database);

  const workspace = await repository.provisionOwnerWorkspace(input);

  assert.equal(database.recordings.length, 5);
  assert.match(database.recordings[0].sql, /INSERT INTO tenants/);
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(provisioning_key\)/,
  );
  assert.deepEqual(database.recordings[0].values, [
    "tenant_v1_key",
    "business-name",
  ]);
  assert.match(
    database.recordings[1].sql,
    /ON CONFLICT \(tenant_id, external_user_id\) DO NOTHING/,
  );
  assert.match(database.recordings[2].sql, /INSERT INTO business_profiles/);
  assert.match(
    database.recordings[3].sql,
    /ON CONFLICT \(idempotency_key\) DO NOTHING/,
  );
  assert.deepEqual(database.recordings[3].values, [
    "tenant_v1_key",
    "external-user-id",
    "tenant.provisioned:tenant_v1_key",
  ]);
  assert.match(database.recordings[4].sql, /SELECT[\s\S]+LIMIT 1/);
  assert.deepEqual(database.recordings[4].values, [
    "tenant_v1_key",
    "external-user-id",
  ]);
  assert.deepEqual(workspace, database.firstResult);
});

test("surfaces a failed atomic provisioning batch", async () => {
  const database = new RecordingDatabase();
  database.batchResult = [
    { success: true },
    { success: true },
    { success: false, error: "profile-write-failed" },
    { success: true },
  ];
  const repository = createTenantProvisioningRepository(database);

  await assert.rejects(
    repository.provisionOwnerWorkspace(input),
    /profile-write-failed/,
  );
});

test("rejects provisioning when D1 cannot reload the workspace", async () => {
  const database = new RecordingDatabase();
  database.firstResult = null;
  const repository = createTenantProvisioningRepository(database);

  await assert.rejects(
    repository.provisionOwnerWorkspace(input),
    /did not return the provisioned workspace/,
  );
});
