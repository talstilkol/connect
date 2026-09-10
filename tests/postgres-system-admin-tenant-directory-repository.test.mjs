import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresSystemAdminTenantDirectoryRepository,
  postgresSystemAdminTenantDirectorySql,
} from "../server/platform/postgresSystemAdminTenantDirectoryRepository.ts";

const createdAt = new Date("2026-08-19T10:00:00.000Z");
const updatedAt = new Date("2026-08-19T10:05:00.000Z");

function query(overrides = {}) {
  return {
    search: "",
    tenantStatus: "all",
    subscription: "all",
    afterTenantId: null,
    ...overrides,
  };
}

function directoryRow(tenantId, overrides = {}) {
  return {
    tenantId: String(tenantId),
    displayName: `tenant-${tenantId}`,
    tenantStatus: "trial",
    businessProfileTenantId: null,
    businessName: null,
    businessTimezone: null,
    businessInterfaceLanguage: null,
    businessProfileVersion: null,
    businessProfileCreatedAt: null,
    businessProfileUpdatedAt: null,
    subscriptionTenantId: null,
    subscriptionStatus: null,
    startsAt: null,
    endsAt: null,
    cancelledAt: null,
    subscriptionVersion: null,
    subscriptionCreatedAt: null,
    subscriptionUpdatedAt: null,
    ...overrides,
  };
}

function fixture(rows) {
  const calls = [];
  return {
    calls,
    repository: createPostgresSystemAdminTenantDirectoryRepository({
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows, rowCount: rows.length };
      },
    }),
  };
}

test("returns one bounded keyset page with an opaque next tenant cursor", async () => {
  const rows = Array.from(
    { length: 51 },
    (_, index) => directoryRow(index + 1),
  );
  const database = fixture(rows);
  const page = await database.repository.listPage(query());

  assert.equal(page.tenants.length, 50);
  assert.equal(page.tenants[0]?.tenantId, 1);
  assert.equal(page.nextCursor, 50);
  assert.deepEqual(database.calls, [{
    sql: postgresSystemAdminTenantDirectorySql.listPage,
    parameters: [null, "", "all", "all", 51],
  }]);
});

test("parses a synchronized profile and subscription without losing timestamps", async () => {
  const database = fixture([directoryRow(7, {
    displayName: "Connected Business",
    tenantStatus: "active",
    businessProfileTenantId: "7",
    businessName: "Connected Business",
    businessTimezone: "Asia/Jerusalem",
    businessInterfaceLanguage: "he",
    businessProfileVersion: 3,
    businessProfileCreatedAt: createdAt,
    businessProfileUpdatedAt: updatedAt,
    subscriptionTenantId: "7",
    subscriptionStatus: "active",
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-09-01T00:00:00.000Z"),
    subscriptionVersion: 2,
    subscriptionCreatedAt: createdAt,
    subscriptionUpdatedAt: updatedAt,
  })]);
  const page = await database.repository.listPage(query({
    search: "connected",
    tenantStatus: "active",
    subscription: "with-subscription",
    afterTenantId: 6,
  }));

  assert.deepEqual(page, {
    tenants: [{
      tenantId: 7,
      displayName: "Connected Business",
      tenantStatus: "active",
      businessProfile: {
        businessName: "Connected Business",
        timezone: "Asia/Jerusalem",
        interfaceLanguage: "he",
        version: 3,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
      subscription: {
        status: "active",
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-09-01T00:00:00.000Z",
        cancelledAt: null,
        version: 2,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    }],
    nextCursor: null,
  });
});

test("rejects malformed filters, ordering, and cross-tenant joined state", async () => {
  const database = fixture([]);
  await assert.rejects(
    database.repository.listPage(query({ search: "UPPER" })),
    /query is invalid/,
  );

  const unordered = fixture([directoryRow(2), directoryRow(1)]);
  await assert.rejects(
    unordered.repository.listPage(query()),
    /ordering is invalid/,
  );

  const crossTenant = fixture([directoryRow(7, {
    displayName: "Connected Business",
    businessProfileTenantId: "8",
    businessName: "Connected Business",
    businessTimezone: "Asia/Jerusalem",
    businessInterfaceLanguage: "he",
    businessProfileVersion: 1,
    businessProfileCreatedAt: createdAt,
    businessProfileUpdatedAt: updatedAt,
  })]);
  await assert.rejects(
    crossTenant.repository.listPage(query()),
    /invalid business profile/,
  );

  assert.throws(
    () => createPostgresSystemAdminTenantDirectoryRepository({}),
    /dependency is invalid/,
  );
});
