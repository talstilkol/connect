import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayCampaignMutationExecutor,
  postgresRailwayCampaignMutationSql,
} from "../server/platform/postgresRailwayCampaignMutationExecutor.ts";

const campaignKey = `campaign_v1_${"a".repeat(64)}`;

function command(overrides = {}) {
  return {
    session: {
      tenantId: 7,
      externalUserId: "verified-user",
      displayName: "Workspace",
      status: "active",
      role: "owner",
    },
    operation: "campaigns.activate",
    idempotencyKey: `connect_idempotency_v1_${"b".repeat(64)}`,
    requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
    payload: { campaignKey, expectedVersion: 1 },
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

test("blocks a new activation when campaign delivery is not configured", async () => {
  const queries = [];
  const fixture = transactionManager(async (sql, parameters) => {
    queries.push({ sql, parameters });
    if (sql === postgresRailwayCampaignMutationSql.claimReceipt) {
      return {
        rowCount: 1,
        rows: [{ idempotencyKey: command().idempotencyKey }],
      };
    }
    throw new Error("unexpected query");
  });
  const executor = createPostgresRailwayCampaignMutationExecutor(
    fixture.manager,
    () => false,
  );

  assert.deepEqual(await executor.execute(command()), {
    outcome: "delivery-configuration-required",
    tenantId: null,
    state: null,
  });
  assert.deepEqual(fixture.calls, [{ isolationLevel: "read-committed" }]);
  assert.equal(queries.length, 1);
});

test("replays a completed activation even after delivery is disabled", async () => {
  const storedState = {
    outcome: "activated",
    campaign: {
      campaignKey,
      status: "scheduled",
      version: 2,
      activatedAt: "2026-08-21T10:00:00.000Z",
      startedAt: null,
    },
  };
  let queryCount = 0;
  const fixture = transactionManager(async (sql) => {
    queryCount += 1;
    if (sql === postgresRailwayCampaignMutationSql.claimReceipt) {
      return { rowCount: 0, rows: [] };
    }
    if (sql === postgresRailwayCampaignMutationSql.lockReceipt) {
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
  const result = await createPostgresRailwayCampaignMutationExecutor(
    fixture.manager,
    () => false,
  ).execute(command());

  assert.deepEqual(result, {
    outcome: "replayed",
    tenantId: 7,
    state: storedState,
  });
  assert.equal(queryCount, 2);
});

test("separates receipt digest conflicts from storage outages", async () => {
  const conflictFixture = transactionManager(async (sql) => {
    if (sql === postgresRailwayCampaignMutationSql.claimReceipt) {
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
  const conflict = await createPostgresRailwayCampaignMutationExecutor(
    conflictFixture.manager,
    () => true,
  ).execute(command());
  assert.deepEqual(conflict, {
    outcome: "conflict",
    tenantId: null,
    state: null,
  });

  const unavailableFixture = transactionManager(async () => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(
    await createPostgresRailwayCampaignMutationExecutor(
      unavailableFixture.manager,
      () => true,
    ).execute(command()),
    { outcome: "unavailable", tenantId: null, state: null },
  );
});

test("rejects malformed campaign commands before opening a transaction", async () => {
  const fixture = transactionManager(async () => {
    throw new Error("must not query");
  });
  const result = await createPostgresRailwayCampaignMutationExecutor(
    fixture.manager,
    () => true,
  ).execute(command({
    payload: { campaignKey, expectedVersion: 1, tenantId: 7 },
  }));

  assert.deepEqual(result, {
    outcome: "unavailable",
    tenantId: null,
    state: null,
  });
  assert.equal(fixture.calls.length, 0);
});

test("freezes atomic receipt and audit SQL without randomized identifiers", () => {
  assert.match(postgresRailwayCampaignMutationSql.claimReceipt, /ON CONFLICT/);
  assert.match(postgresRailwayCampaignMutationSql.lockReceipt, /FOR UPDATE/);
  assert.match(postgresRailwayCampaignMutationSql.insertAudit, /'campaign'/);
  assert.match(
    postgresRailwayCampaignMutationSql.completeReceipt,
    /status = 'processing'/,
  );
  assert.doesNotMatch(
    JSON.stringify(postgresRailwayCampaignMutationSql),
    /Math\.random|randomUUID|gen_random_uuid|uuid_generate/,
  );
  assert.throws(
    () => createPostgresRailwayCampaignMutationExecutor({}, () => true),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createPostgresRailwayCampaignMutationExecutor(
      { transaction() {} },
      null,
    ),
    /dependencies are invalid/,
  );
});
