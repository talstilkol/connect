import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTenantMembershipRepository,
  postgresTenantMembershipSql,
} from "../server/platform/postgresTenantMembershipRepository.ts";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function membershipRow(overrides = {}) {
  return {
    tenantId: "7",
    tenantDisplayName: "Primary workspace",
    tenantStatus: "active",
    externalUserId: "verified-user",
    role: "owner",
    version: 1,
    ...overrides,
  };
}

function databaseReturning(rows) {
  const calls = [];

  return {
    calls,
    database: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return queryResult(rows);
      },
    },
  };
}

test("loads bounded active memberships for the exact external user", async () => {
  const fixture = databaseReturning([
    membershipRow(),
    membershipRow({
      tenantId: 11,
      tenantDisplayName: "Secondary workspace",
      tenantStatus: "payment_failed",
      role: "viewer",
      version: "3",
    }),
  ]);
  const repository = createPostgresTenantMembershipRepository(
    fixture.database,
  );
  const memberships = await repository.findActiveByExternalUserId(
    "verified-user",
  );

  assert.deepEqual(memberships, [
    {
      tenantId: 7,
      tenantDisplayName: "Primary workspace",
      tenantStatus: "active",
      externalUserId: "verified-user",
      role: "owner",
      version: 1,
    },
    {
      tenantId: 11,
      tenantDisplayName: "Secondary workspace",
      tenantStatus: "payment_failed",
      externalUserId: "verified-user",
      role: "viewer",
      version: 3,
    },
  ]);
  assert.deepEqual(fixture.calls[0].parameters, ["verified-user"]);
  assert.match(fixture.calls[0].sql, /status = 'active'/);
  assert.match(fixture.calls[0].sql, /ORDER BY tenant_memberships\.tenant_id ASC/);
  assert.match(fixture.calls[0].sql, /LIMIT 101/);
  assert.equal(Object.isFrozen(memberships), true);
  assert.equal(Object.isFrozen(memberships[0]), true);
});

test("orders a tenant directory by role and rejects cross-tenant rows", async () => {
  const validFixture = databaseReturning([
    membershipRow({ externalUserId: "tenant-owner" }),
  ]);
  const validRepository = createPostgresTenantMembershipRepository(
    validFixture.database,
  );

  await validRepository.findActiveByTenantId(7);
  assert.deepEqual(validFixture.calls[0].parameters, [7]);
  assert.match(validFixture.calls[0].sql, /WHEN 'owner' THEN 1/);

  const invalidRepository = createPostgresTenantMembershipRepository(
    databaseReturning([
      membershipRow({ tenantId: 11 }),
    ]).database,
  );

  await assert.rejects(
    invalidRepository.findActiveByTenantId(7),
    /cross-tenant membership/,
  );
});

test("rejects cross-user, malformed, and oversized membership results", async () => {
  const crossUserRepository = createPostgresTenantMembershipRepository(
    databaseReturning([
      membershipRow({ externalUserId: "another-user" }),
    ]).database,
  );
  await assert.rejects(
    crossUserRepository.findActiveByExternalUserId("verified-user"),
    /cross-user membership/,
  );

  const malformedRepository = createPostgresTenantMembershipRepository(
    databaseReturning([
      membershipRow({ role: "unsupported" }),
    ]).database,
  );
  await assert.rejects(
    malformedRepository.findActiveByExternalUserId("verified-user"),
    /invalid membership/,
  );

  const oversizedRepository = createPostgresTenantMembershipRepository(
    databaseReturning(
      Array.from({ length: 101 }, () => membershipRow()),
    ).database,
  );
  await assert.rejects(
    oversizedRepository.findActiveByExternalUserId("verified-user"),
    /exceeds the safe limit/,
  );
});

test("rejects invalid lookup input before PostgreSQL access", async () => {
  const fixture = databaseReturning([]);
  const repository = createPostgresTenantMembershipRepository(
    fixture.database,
  );

  await assert.rejects(
    repository.findActiveByExternalUserId("   "),
    /externalUserId is invalid/,
  );
  await assert.rejects(
    repository.findActiveByTenantId(0),
    /tenantId must be a positive integer/,
  );
  assert.equal(fixture.calls.length, 0);
});

test("freezes parameterized PostgreSQL membership SQL", () => {
  assert.match(
    postgresTenantMembershipSql.findActiveByExternalUserId,
    /external_user_id = \$1/,
  );
  assert.match(
    postgresTenantMembershipSql.findActiveByTenantId,
    /tenant_id = \$1/,
  );
  assert.doesNotMatch(
    Object.values(postgresTenantMembershipSql).join("\n"),
    /\?/,
  );
});

test("rejects a missing PostgreSQL query dependency", () => {
  assert.throws(
    () => createPostgresTenantMembershipRepository({}),
    /database is invalid/,
  );
});
