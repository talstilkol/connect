import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTenantProvisioningRepository,
  postgresTenantProvisioningSql,
} from "../server/platform/postgresTenantProvisioningRepository.ts";

const provisioningKey = `tenant_v1_${"a".repeat(64)}`;
const tenantId = 7;
const externalUserId = "clerk|tenant-owner";
const createdAt = new Date("2026-08-19T12:00:00.000Z");

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function tenantRow(overrides = {}) {
  return {
    tenantId: String(tenantId),
    tenantDisplayName: "Connect Business",
    tenantStatus: "trial",
    ...overrides,
  };
}

function workspaceRow(overrides = {}) {
  return {
    tenantId: String(tenantId),
    tenantDisplayName: "Connect Business",
    tenantStatus: "trial",
    businessName: "Connect Business",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    profileVersion: 1,
    profileCreatedAt: createdAt,
    profileUpdatedAt: createdAt,
    ...overrides,
  };
}

function provisionInput(overrides = {}) {
  return {
    provisioningKey,
    externalUserId,
    businessName: "  Connect Business  ",
    timezone: "  Asia/Jerusalem  ",
    interfaceLanguage: "he",
    ...overrides,
  };
}

function fixture(transactionResults = [], queryResults = []) {
  const pendingTransactions = [...transactionResults];
  const pendingQueries = [...queryResults];
  const transactionCalls = [];
  const queryCalls = [];
  const repository = createPostgresTenantProvisioningRepository({
    queries: {
      async query(sql, parameters) {
        queryCalls.push({ sql, parameters });
        const result = pendingQueries.shift();
        if (result === undefined) throw new Error("Unexpected direct query");
        return result;
      },
    },
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            transactionCalls.push({ sql, parameters });
            const result = pendingTransactions.shift();
            if (result === undefined) {
              throw new Error("Unexpected transaction query");
            }
            return result;
          },
        });
      },
    },
  });
  return {
    repository,
    queryCalls,
    transactionCalls,
    assertConsumed() {
      assert.equal(pendingTransactions.length, 0);
      assert.equal(pendingQueries.length, 0);
    },
  };
}

test("provisions tenant, owner, profile, and audit in one transaction", async () => {
  const database = fixture([
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([tenantRow()]),
    queryResult([]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([{ actorExternalUserId: externalUserId }]),
    queryResult([workspaceRow()]),
  ]);

  const workspace = await database.repository.provisionOwnerWorkspace(
    provisionInput(),
  );

  assert.equal(workspace.tenantId, tenantId);
  assert.equal(workspace.profileCreatedAt, createdAt.toISOString());
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresTenantProvisioningSql.insertTenant,
    postgresTenantProvisioningSql.lockTenant,
    postgresTenantProvisioningSql.lockOwners,
    postgresTenantProvisioningSql.insertOwner,
    postgresTenantProvisioningSql.upsertBusinessProfile,
    postgresTenantProvisioningSql.insertAudit,
    postgresTenantProvisioningSql.loadAudit,
    postgresTenantProvisioningSql.loadWorkspace,
  ]);
  assert.match(postgresTenantProvisioningSql.lockTenant, /FOR UPDATE/);
  assert.deepEqual(database.transactionCalls[4].parameters, [
    tenantId,
    "Connect Business",
    "Asia/Jerusalem",
    "he",
  ]);
  database.assertConsumed();
});

test("keeps an exact provisioning retry idempotent", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([tenantRow()]),
    queryResult([{ externalUserId }]),
    queryResult([]),
    queryResult([]),
    queryResult([{ actorExternalUserId: externalUserId }]),
    queryResult([workspaceRow()]),
  ]);

  const workspace = await database.repository.provisionOwnerWorkspace(
    provisionInput(),
  );

  assert.equal(workspace.profileVersion, 1);
  assert.equal(
    database.transactionCalls.some(
      ({ sql }) => sql === postgresTenantProvisioningSql.insertOwner,
    ),
    false,
  );
  database.assertConsumed();
});

test("updates changed display and profile data behind the tenant lock", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([tenantRow({ tenantDisplayName: "Old Business" })]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([{ externalUserId }]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([]),
    queryResult([{ actorExternalUserId: externalUserId }]),
    queryResult([workspaceRow({ profileVersion: 2 })]),
  ]);

  const workspace = await database.repository.provisionOwnerWorkspace(
    provisionInput(),
  );

  assert.equal(workspace.profileVersion, 2);
  assert.equal(
    database.transactionCalls[2].sql,
    postgresTenantProvisioningSql.updateTenantDisplayName,
  );
  database.assertConsumed();
});

test("fails closed when one provisioning key reaches a different owner", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([tenantRow()]),
    queryResult([{ externalUserId: "clerk|different-owner" }]),
  ]);

  await assert.rejects(
    database.repository.provisionOwnerWorkspace(provisionInput()),
    /provisioning identity conflict/,
  );
  assert.equal(database.transactionCalls.length, 3);
  database.assertConsumed();
});

test("rejects ambiguous ownership and mismatched audit evidence", async () => {
  const ambiguous = fixture([
    queryResult([]),
    queryResult([tenantRow()]),
    queryResult([
      { externalUserId },
      { externalUserId: "clerk|second-owner" },
    ]),
  ]);
  await assert.rejects(
    ambiguous.repository.provisionOwnerWorkspace(provisionInput()),
    /ambiguous tenant ownership/,
  );

  const auditConflict = fixture([
    queryResult([]),
    queryResult([tenantRow()]),
    queryResult([{ externalUserId }]),
    queryResult([]),
    queryResult([]),
    queryResult([{ actorExternalUserId: "clerk|different-owner" }]),
  ]);
  await assert.rejects(
    auditConflict.repository.provisionOwnerWorkspace(provisionInput()),
    /audit identity conflict/,
  );
});

test("rejects malformed input, rows, and dependencies before success", async () => {
  const database = fixture();
  await assert.rejects(
    database.repository.provisionOwnerWorkspace(
      provisionInput({ provisioningKey: "tenant_v1_invalid" }),
    ),
    /provisioningKey is invalid/,
  );
  await assert.rejects(
    database.repository.provisionOwnerWorkspace(
      provisionInput({ externalUserId: "clerk|owner\nforged" }),
    ),
    /externalUserId is invalid/,
  );

  const malformed = fixture([
    queryResult([]),
    queryResult([tenantRow({ tenantStatus: "unknown" })]),
  ]);
  await assert.rejects(
    malformed.repository.provisionOwnerWorkspace(provisionInput()),
    /invalid tenant status/,
  );

  assert.throws(
    () => createPostgresTenantProvisioningRepository({}),
    /dependencies are invalid/,
  );
});
