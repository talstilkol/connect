import assert from "node:assert/strict";
import test from "node:test";

import {
  createTenantMembershipRepository,
} from "../db/tenantMembershipRepository.ts";

class MembershipStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recording = {
      sql: this.sql,
      values,
    };
    return this;
  }

  async all() {
    return this.database.result;
  }

  async first() {
    return null;
  }

  async run() {
    return { success: true };
  }
}

class MembershipDatabase {
  constructor(result) {
    this.result = result;
    this.recording = null;
  }

  prepare(sql) {
    return new MembershipStatement(this, sql);
  }

  async batch() {
    return [];
  }
}

test("loads active memberships with deterministic tenant ordering", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: [
      {
        tenantId: 7,
        tenantDisplayName: "tenant-name",
        tenantStatus: "active",
        externalUserId: "external-user-id",
        role: "manager",
        version: 1,
      },
    ],
  });
  const repository = createTenantMembershipRepository(database);

  const memberships = await repository.findActiveByExternalUserId(
    "external-user-id",
  );

  assert.equal(memberships.length, 1);
  assert.equal(memberships[0].tenantId, 7);
  assert.equal(memberships[0].role, "manager");
  assert.equal(memberships[0].version, 1);
  assert.match(
    database.recording.sql,
    /tenant_memberships\.external_user_id = \?/,
  );
  assert.match(
    database.recording.sql,
    /tenant_memberships\.status = 'active'/,
  );
  assert.match(
    database.recording.sql,
    /ORDER BY tenant_memberships\.tenant_id ASC/,
  );
  assert.deepEqual(database.recording.values, ["external-user-id"]);
});

test("rejects blank external user scope before D1 access", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: [],
  });
  const repository = createTenantMembershipRepository(database);

  await assert.rejects(
    repository.findActiveByExternalUserId(" "),
    /externalUserId must not be blank/,
  );
  assert.equal(database.recording, null);
});

test("rejects invalid role data returned by D1", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: [
      {
        tenantId: 7,
        tenantDisplayName: "tenant-name",
        tenantStatus: "active",
        externalUserId: "external-user-id",
        role: "unsupported-role",
        version: 1,
      },
    ],
  });
  const repository = createTenantMembershipRepository(database);

  await assert.rejects(
    repository.findActiveByExternalUserId("external-user-id"),
    /unsupported tenant role/,
  );
});

test("surfaces a failed D1 membership read", async () => {
  const database = new MembershipDatabase({
    success: false,
    error: "membership-read-failed",
  });
  const repository = createTenantMembershipRepository(database);

  await assert.rejects(
    repository.findActiveByExternalUserId("external-user-id"),
    /membership-read-failed/,
  );
});

test("rejects an invalid membership version returned by D1", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: [
      {
        tenantId: 7,
        tenantDisplayName:
          "tenant-name",
        tenantStatus: "active",
        externalUserId:
          "external-user-id",
        role: "manager",
        version: 0,
      },
    ],
  });
  const repository =
    createTenantMembershipRepository(
      database,
    );

  await assert.rejects(
    repository.findActiveByExternalUserId(
      "external-user-id",
    ),
    /invalid tenant membership version/,
  );
});

test("loads a bounded active team directory inside one tenant", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: [
      {
        tenantId: 7,
        tenantDisplayName:
          "tenant-name",
        tenantStatus: "active",
        externalUserId:
          "external-user-id",
        role: "owner",
        version: 1,
      },
      {
        tenantId: 7,
        tenantDisplayName:
          "tenant-name",
        tenantStatus: "active",
        externalUserId:
          "second-user-id",
        role: "agent",
        version: 1,
      },
    ],
  });
  const repository =
    createTenantMembershipRepository(
      database,
    );
  const members =
    await repository
      .findActiveByTenantId(7);

  assert.equal(members.length, 2);
  assert.match(
    database.recording.sql,
    /tenant_memberships\.tenant_id = \?1/,
  );
  assert.match(
    database.recording.sql,
    /tenant_memberships\.status = 'active'/,
  );
  assert.match(
    database.recording.sql,
    /LIMIT 101/,
  );
  assert.deepEqual(
    database.recording.values,
    [7],
  );
});

test("rejects invalid and oversized team directory reads", async () => {
  const database = new MembershipDatabase({
    success: true,
    results: Array.from(
      {
        length: 101,
      },
      (_, index) => ({
        tenantId: 7,
        tenantDisplayName:
          "tenant-name",
        tenantStatus: "active",
        externalUserId:
          `external-user-${index}`,
        role: "viewer",
        version: 1,
      }),
    ),
  });
  const repository =
    createTenantMembershipRepository(
      database,
    );

  await assert.rejects(
    repository.findActiveByTenantId(
      7,
    ),
    /exceeds the safe limit/,
  );
  database.recording = null;
  await assert.rejects(
    repository.findActiveByTenantId(
      0,
    ),
    /tenantId must be a positive integer/,
  );
  assert.equal(
    database.recording,
    null,
  );
});
