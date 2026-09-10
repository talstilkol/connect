import assert from "node:assert/strict";
import test from "node:test";

import {
  postgresBusinessProfileSql,
} from "../server/platform/postgresBusinessProfileRepository.ts";
import {
  postgresClerkOrganizationBindingSql,
} from "../server/platform/postgresClerkOrganizationBindingRepository.ts";
import {
  createPostgresRailwayOnboardingBusinessProfileMutationExecutor,
  postgresRailwayOnboardingBusinessProfileMutationSql,
} from "../server/platform/postgresRailwayOnboardingBusinessProfileMutationExecutor.ts";
import {
  postgresTenantProvisioningSql,
} from "../server/platform/postgresTenantProvisioningRepository.ts";

const profile = Object.freeze({
  businessName: "Connect",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});

function command(overrides = {}) {
  return {
    identity: {
      externalUserId: "verified-user",
      externalOrganizationId: "org_verified",
    },
    session: null,
    operation: "onboarding.business-profile.save",
    idempotencyKey: `connect_idempotency_v1_${"b".repeat(64)}`,
    requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
    payload: profile,
    ...overrides,
  };
}

function transactionManager(query) {
  const calls = [];
  return {
    calls,
    manager: {
      async transaction(options, execute) {
        calls.push(options);
        return execute({ query });
      },
    },
  };
}

test("provisions and receipts an initial workspace atomically", async () => {
  const queries = [];
  const fixture = transactionManager(async (sql) => {
    queries.push(sql);
    if (
      sql ===
      postgresRailwayOnboardingBusinessProfileMutationSql
        .findTenantByProvisioningKey
    ) return { rowCount: 0, rows: [] };
    if (sql === postgresTenantProvisioningSql.insertTenant) {
      return { rowCount: 1, rows: [{ tenantId: 19 }] };
    }
    if (sql === postgresTenantProvisioningSql.lockTenant) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 19,
          tenantDisplayName: "Connect",
          tenantStatus: "trial",
        }],
      };
    }
    if (sql === postgresTenantProvisioningSql.lockOwners) {
      return { rowCount: 0, rows: [] };
    }
    if (sql === postgresTenantProvisioningSql.insertOwner) {
      return { rowCount: 1, rows: [{ tenantId: 19 }] };
    }
    if (sql === postgresTenantProvisioningSql.upsertBusinessProfile) {
      return { rowCount: 1, rows: [{ tenantId: 19 }] };
    }
    if (sql === postgresTenantProvisioningSql.insertAudit) {
      return { rowCount: 1, rows: [{ tenantId: 19 }] };
    }
    if (sql === postgresTenantProvisioningSql.loadAudit) {
      return {
        rowCount: 1,
        rows: [{ actorExternalUserId: "verified-user" }],
      };
    }
    if (sql === postgresTenantProvisioningSql.loadWorkspace) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 19,
          tenantDisplayName: "Connect",
          tenantStatus: "trial",
          ...profile,
          profileVersion: 1,
          profileCreatedAt: "2026-08-21T08:00:00.000Z",
          profileUpdatedAt: "2026-08-21T08:00:00.000Z",
        }],
      };
    }
    if (sql === postgresClerkOrganizationBindingSql.ensureBinding) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 19,
          externalOrganizationId: "org_verified",
        }],
      };
    }
    if (
      sql === postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt
    ) {
      return {
        rowCount: 1,
        rows: [{ idempotencyKey: command().idempotencyKey }],
      };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.insertAudit) {
      return { rowCount: 1, rows: [{ id: 31 }] };
    }
    if (
      sql ===
      postgresRailwayOnboardingBusinessProfileMutationSql.completeReceipt
    ) {
      return {
        rowCount: 1,
        rows: [{ idempotencyKey: command().idempotencyKey }],
      };
    }
    throw new Error("unexpected query");
  });

  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      fixture.manager,
    ).execute(command()),
    {
      outcome: "committed",
      tenantId: 19,
      state: {
        createdTenant: true,
        profile: { ...profile, version: 1 },
      },
    },
  );
  assert.deepEqual(fixture.calls, [{ isolationLevel: "read-committed" }]);
  assert.equal(
    queries.filter((sql) =>
      sql === postgresRailwayOnboardingBusinessProfileMutationSql.insertAudit
    ).length,
    1,
  );
});

test("updates an existing profile in the same receipt transaction", async () => {
  const existing = command({
    session: {
      tenantId: 7,
      externalUserId: "verified-user",
      displayName: "Workspace",
      status: "active",
      role: "owner",
    },
  });
  const fixture = transactionManager(async (sql) => {
    if (sql === postgresClerkOrganizationBindingSql.ensureBinding) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 7,
          externalOrganizationId: "org_verified",
        }],
      };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt) {
      return {
        rowCount: 1,
        rows: [{ idempotencyKey: existing.idempotencyKey }],
      };
    }
    if (sql === postgresBusinessProfileSql.updateTenantDisplayName) {
      return { rowCount: 1, rows: [{ id: 7 }] };
    }
    if (sql === postgresBusinessProfileSql.upsert) {
      return { rowCount: 1, rows: [{ tenantId: 7 }] };
    }
    if (sql === postgresBusinessProfileSql.findByTenantId) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 7,
          ...profile,
          version: 3,
          createdAt: "2026-08-21T08:00:00.000Z",
          updatedAt: "2026-08-21T09:00:00.000Z",
        }],
      };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.insertAudit) {
      return { rowCount: 1, rows: [{ id: 32 }] };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.completeReceipt) {
      return {
        rowCount: 1,
        rows: [{ idempotencyKey: existing.idempotencyKey }],
      };
    }
    throw new Error("unexpected query");
  });
  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      fixture.manager,
    ).execute(existing),
    {
      outcome: "committed",
      tenantId: 7,
      state: {
        createdTenant: false,
        profile: { ...profile, version: 3 },
      },
    },
  );
});

test("replays without a second profile or audit write", async () => {
  const storedState = {
    createdTenant: true,
    profile: { ...profile, version: 1 },
  };
  const queries = [];
  const fixture = transactionManager(async (sql) => {
    queries.push(sql);
    if (
      sql ===
      postgresRailwayOnboardingBusinessProfileMutationSql
        .findTenantByProvisioningKey
    ) return { rowCount: 1, rows: [{ tenantId: 19 }] };
    if (sql === postgresClerkOrganizationBindingSql.ensureBinding) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 19,
          externalOrganizationId: "org_verified",
        }],
      };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt) {
      return { rowCount: 0, rows: [] };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.lockReceipt) {
      return {
        rowCount: 1,
        rows: [{
          requestDigest: command().requestDigest,
          status: "completed",
          responseJson: storedState,
        }],
      };
    }
    throw new Error("unexpected query");
  });
  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      fixture.manager,
    ).execute(command()),
    {
      outcome: "replayed",
      tenantId: 19,
      state: storedState,
    },
  );
  assert.equal(queries.length, 4);
  assert.equal(
    queries.includes(
      postgresRailwayOnboardingBusinessProfileMutationSql.insertAudit,
    ),
    false,
  );
});

test("separates digest conflicts from outages and rejects malformed commands", async () => {
  const conflict = transactionManager(async (sql) => {
    if (
      sql ===
      postgresRailwayOnboardingBusinessProfileMutationSql
        .findTenantByProvisioningKey
    ) return { rowCount: 1, rows: [{ tenantId: 19 }] };
    if (sql === postgresClerkOrganizationBindingSql.ensureBinding) {
      return {
        rowCount: 1,
        rows: [{
          tenantId: 19,
          externalOrganizationId: "org_verified",
        }],
      };
    }
    if (sql === postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt) {
      return { rowCount: 0, rows: [] };
    }
    return {
      rowCount: 1,
      rows: [{
        requestDigest: `railway_mutation_request_v1_${"d".repeat(64)}`,
        status: "completed",
        responseJson: {},
      }],
    };
  });
  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      conflict.manager,
    ).execute(command()),
    { outcome: "conflict", tenantId: null, state: null },
  );

  const outage = transactionManager(async () => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      outage.manager,
    ).execute(command()),
    { outcome: "unavailable", tenantId: null, state: null },
  );
  assert.deepEqual(
    await createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
      outage.manager,
    ).execute(command({ payload: { ...profile, tenantId: 7 } })),
    { outcome: "unavailable", tenantId: null, state: null },
  );
  assert.equal(outage.calls.length, 1);
});

test("freezes deterministic transactional SQL", () => {
  assert.match(
    postgresRailwayOnboardingBusinessProfileMutationSql
      .findTenantByProvisioningKey,
    /FOR UPDATE/,
  );
  assert.match(
    postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt,
    /ON CONFLICT/,
  );
  assert.match(
    postgresRailwayOnboardingBusinessProfileMutationSql.completeReceipt,
    /status = 'processing'/,
  );
  assert.doesNotMatch(
    JSON.stringify(postgresRailwayOnboardingBusinessProfileMutationSql),
    /Math\.random|randomUUID|gen_random_uuid|uuid_generate/,
  );
  assert.throws(
    () => createPostgresRailwayOnboardingBusinessProfileMutationExecutor({}),
    /dependencies are invalid/,
  );
});
