import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTenantSubscriptionRepository,
  postgresTenantSubscriptionSql,
} from "../server/platform/postgresTenantSubscriptionRepository.ts";
import {
  deriveTenantSubscriptionEventKey,
} from "../server/billing/tenantSubscriptionKey.ts";

const tenantId = 7;
const startsAt = "2026-08-01T00:00:00.000Z";
const firstEndsAt = "2026-09-01T00:00:00.000Z";
const extendedEndsAt = "2026-10-01T00:00:00.000Z";
const createdAt = new Date("2026-07-26T12:00:00.000Z");
const actorExternalUserId = "system-admin-external-id";
const createdEventKey = await deriveTenantSubscriptionEventKey(tenantId, {
  eventType: "created",
  expectedVersion: null,
  toStatus: "active",
  newEndsAt: firstEndsAt,
  actorExternalUserId,
});
const extendedEventKey = await deriveTenantSubscriptionEventKey(tenantId, {
  eventType: "extended",
  expectedVersion: 1,
  toStatus: "active",
  newEndsAt: extendedEndsAt,
  actorExternalUserId,
});
const suspendedEventKey = await deriveTenantSubscriptionEventKey(tenantId, {
  eventType: "status-changed",
  expectedVersion: 1,
  toStatus: "suspended",
  newEndsAt: firstEndsAt,
  actorExternalUserId,
});
const cancelledEventKey = await deriveTenantSubscriptionEventKey(tenantId, {
  eventType: "cancelled",
  expectedVersion: 2,
  toStatus: "cancelled",
  newEndsAt: firstEndsAt,
  actorExternalUserId,
});

function subscriptionRow(overrides = {}) {
  return {
    tenantId: String(tenantId),
    status: "active",
    startsAt: new Date(startsAt),
    endsAt: new Date(firstEndsAt),
    cancelledAt: null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function eventRow(overrides = {}) {
  return {
    eventKey: createdEventKey,
    tenantId: String(tenantId),
    eventType: "created",
    fromStatus: null,
    toStatus: "active",
    previousEndsAt: null,
    newEndsAt: new Date(firstEndsAt),
    actorExternalUserId,
    subscriptionVersion: 1,
    occurredAt: createdAt,
    ...overrides,
  };
}

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(transactionResults = [], queryResults = []) {
  const pendingTransactions = [...transactionResults];
  const pendingQueries = [...queryResults];
  const transactionCalls = [];
  const queryCalls = [];
  const repository = createPostgresTenantSubscriptionRepository({
    queries: {
      async query(sql, parameters) {
        queryCalls.push({ sql, parameters });
        const next = pendingQueries.shift();
        if (next === undefined) throw new Error("Unexpected PostgreSQL query");
        return next;
      },
    },
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            transactionCalls.push({ sql, parameters });
            const next = pendingTransactions.shift();
            if (next === undefined) {
              throw new Error("Unexpected PostgreSQL transaction query");
            }
            return next;
          },
        });
      },
    },
  });
  return {
    repository,
    transactionCalls,
    queryCalls,
    assertConsumed() {
      assert.equal(pendingTransactions.length, 0);
      assert.equal(pendingQueries.length, 0);
    },
  };
}

function createInput(overrides = {}) {
  return {
    tenantId,
    status: "active",
    startsAt,
    endsAt: firstEndsAt,
    actorExternalUserId,
    occurredAt: createdAt.toISOString(),
    ...overrides,
  };
}

test("reads tenant-scoped subscription state and immutable event history", async () => {
  const state = fixture([], [queryResult([subscriptionRow()])]);
  assert.equal(
    (await state.repository.findByTenantId(tenantId))?.endsAt,
    firstEndsAt,
  );
  assert.deepEqual(state.queryCalls[0], {
    sql: postgresTenantSubscriptionSql.findByTenantId,
    parameters: [tenantId],
  });

  const events = fixture([], [queryResult([eventRow()])]);
  assert.equal((await events.repository.listEvents(tenantId))[0].eventType, "created");
  assert.deepEqual(events.queryCalls[0].parameters, [tenantId, 100]);
});

test("creates subscription only after locking the tenant and persists one event", async () => {
  const database = fixture([
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([]),
    queryResult([subscriptionRow()]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([eventRow()]),
  ]);
  const result = await database.repository.create(createInput());

  assert.equal(result.outcome, "created");
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresTenantSubscriptionSql.lockTenant,
    postgresTenantSubscriptionSql.lockSubscription,
    postgresTenantSubscriptionSql.insertSubscription,
    postgresTenantSubscriptionSql.syncTenantStatus,
    postgresTenantSubscriptionSql.insertEvent,
  ]);
  assert.match(postgresTenantSubscriptionSql.lockTenant, /FOR UPDATE/);
  assert.match(database.transactionCalls[4].parameters[0],
    /^tenant_subscription_event_v1_[0-9a-f]{64}$/);
  database.assertConsumed();
});

test("keeps exact creation retries idempotent and rejects conflicting identity", async () => {
  const unchanged = fixture([
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([subscriptionRow()]),
  ]);
  assert.equal(
    (await unchanged.repository.create(createInput())).outcome,
    "unchanged",
  );

  const conflict = fixture([
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([subscriptionRow({ endsAt: new Date(extendedEndsAt) })]),
  ]);
  assert.equal(
    (await conflict.repository.create(createInput())).outcome,
    "conflict",
  );
});

test("extends an eligible subscription behind one row lock", async () => {
  const occurredAt = "2026-08-15T08:00:00.000Z";
  const extendedRow = subscriptionRow({
    endsAt: new Date(extendedEndsAt),
    version: 2,
    updatedAt: new Date(occurredAt),
  });
  const database = fixture([
    queryResult([subscriptionRow()]),
    queryResult([extendedRow]),
    queryResult([eventRow({
      eventKey: extendedEventKey,
      eventType: "extended",
      fromStatus: "active",
      previousEndsAt: new Date(firstEndsAt),
      newEndsAt: new Date(extendedEndsAt),
      subscriptionVersion: 2,
      occurredAt: new Date(occurredAt),
    })]),
  ]);
  const result = await database.repository.extend({
    tenantId,
    expectedVersion: 1,
    newEndsAt: extendedEndsAt,
    actorExternalUserId,
    occurredAt,
  });

  assert.equal(result.outcome, "updated");
  assert.equal(result.subscription.version, 2);
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresTenantSubscriptionSql.lockSubscription,
    postgresTenantSubscriptionSql.extendSubscription,
    postgresTenantSubscriptionSql.insertEvent,
  ]);
});

test("changes status and cancellation together with tenant state and events", async () => {
  const suspendedAt = "2026-08-20T08:00:00.000Z";
  const suspended = subscriptionRow({
    status: "suspended",
    version: 2,
    updatedAt: new Date(suspendedAt),
  });
  const statusDatabase = fixture([
    queryResult([subscriptionRow()]),
    queryResult([suspended]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([eventRow({
      eventKey: suspendedEventKey,
      eventType: "status-changed",
      fromStatus: "active",
      toStatus: "suspended",
      previousEndsAt: new Date(firstEndsAt),
      subscriptionVersion: 2,
      occurredAt: new Date(suspendedAt),
    })]),
  ]);
  assert.equal(
    (await statusDatabase.repository.changeStatus({
      tenantId,
      expectedVersion: 1,
      status: "suspended",
      actorExternalUserId,
      occurredAt: suspendedAt,
    })).outcome,
    "updated",
  );

  const cancelledAt = "2026-08-21T08:00:00.000Z";
  const cancelDatabase = fixture([
    queryResult([suspended]),
    queryResult([subscriptionRow({
      status: "cancelled",
      cancelledAt: new Date(cancelledAt),
      version: 3,
      updatedAt: new Date(cancelledAt),
    })]),
    queryResult([{ tenantId: String(tenantId) }]),
    queryResult([eventRow({
      eventKey: cancelledEventKey,
      eventType: "cancelled",
      fromStatus: "suspended",
      toStatus: "cancelled",
      previousEndsAt: new Date(firstEndsAt),
      subscriptionVersion: 3,
      occurredAt: new Date(cancelledAt),
    })]),
  ]);
  const cancelled = await cancelDatabase.repository.cancel({
    tenantId,
    expectedVersion: 2,
    actorExternalUserId,
    occurredAt: cancelledAt,
  });
  assert.equal(cancelled.outcome, "updated");
  assert.equal(cancelled.subscription.cancelledAt, cancelledAt);
});

test("classifies missing, stale, unchanged, and invalid transitions before writes", async () => {
  const missing = fixture([queryResult([])]);
  assert.equal(
    (await missing.repository.extend({
      tenantId,
      expectedVersion: 1,
      newEndsAt: extendedEndsAt,
      actorExternalUserId,
      occurredAt: "2026-08-15T08:00:00.000Z",
    })).outcome,
    "not-found",
  );

  const stale = fixture([queryResult([subscriptionRow({ version: 2 })])]);
  assert.equal(
    (await stale.repository.changeStatus({
      tenantId,
      expectedVersion: 1,
      status: "blocked",
      actorExternalUserId,
      occurredAt: "2026-08-15T08:00:00.000Z",
    })).outcome,
    "conflict",
  );

  const unchanged = fixture([queryResult([subscriptionRow()])]);
  assert.equal(
    (await unchanged.repository.changeStatus({
      tenantId,
      expectedVersion: 1,
      status: "active",
      actorExternalUserId,
      occurredAt: "2026-08-15T08:00:00.000Z",
    })).outcome,
    "unchanged",
  );

  const invalid = fixture([queryResult([subscriptionRow()])]);
  assert.equal(
    (await invalid.repository.extend({
      tenantId,
      expectedVersion: 1,
      newEndsAt: "2026-08-15T00:00:00.000Z",
      actorExternalUserId,
      occurredAt: "2026-08-02T00:00:00.000Z",
    })).outcome,
    "invalid-transition",
  );
});

test("fails closed for malformed input, rows, and dependencies", async () => {
  const database = fixture();
  await assert.rejects(
    database.repository.create(createInput({ tenantId: 0 })),
    /tenantId must be a positive safe integer/,
  );

  const malformed = fixture([], [queryResult([
    subscriptionRow({ status: "unknown" }),
  ])]);
  await assert.rejects(
    malformed.repository.findByTenantId(tenantId),
    /invalid subscription status/,
  );

  assert.throws(
    () => createPostgresTenantSubscriptionRepository({}),
    /dependencies are invalid/,
  );
});
