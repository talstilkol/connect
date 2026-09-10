import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresProductionDecisionRepository,
  postgresProductionDecisionSql,
} from "../server/platform/postgresProductionDecisionRepository.ts";
import {
  deriveProductionDecisionEventKey,
} from "../server/operations/productionDecisionKey.ts";

const actorExternalUserId = "system-admin-external-id";
const firstOccurredAt = "2026-08-19T12:00:00.000Z";
const secondOccurredAt = "2026-08-19T12:05:00.000Z";
const initialSelection = "Provider choice approved";
const initialRationale =
  "The approved decision satisfies product and security review.";
const updatedSelection = "Provider and fallback policy approved";
const updatedRationale =
  "The revised decision includes a bounded fallback policy.";
const initialEventKey = await deriveProductionDecisionEventKey({
  checkId: "ai.provider",
  expectedVersion: 0,
  selection: initialSelection,
  rationale: initialRationale,
  actorExternalUserId,
});
const updatedEventKey = await deriveProductionDecisionEventKey({
  checkId: "ai.provider",
  expectedVersion: 1,
  selection: updatedSelection,
  rationale: updatedRationale,
  actorExternalUserId,
});

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function recordRow(overrides = {}) {
  return {
    checkId: "ai.provider",
    selection: initialSelection,
    rationale: initialRationale,
    version: 1,
    lastEventKey: initialEventKey,
    decidedByExternalUserId: actorExternalUserId,
    decidedAt: new Date(firstOccurredAt),
    updatedAt: new Date(firstOccurredAt),
    ...overrides,
  };
}

function command(overrides = {}) {
  return {
    checkId: "ai.provider",
    expectedVersion: 0,
    selection: initialSelection,
    rationale: initialRationale,
    actorExternalUserId,
    occurredAt: firstOccurredAt,
    ...overrides,
  };
}

function fixture(transactionResults = [], queryResults = []) {
  const pendingTransactions = [...transactionResults];
  const pendingQueries = [...queryResults];
  const transactionCalls = [];
  const queryCalls = [];
  const repository = createPostgresProductionDecisionRepository({
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

test("lists and reads only registered production decisions", async () => {
  const listed = fixture([], [queryResult([recordRow()])]);
  const records = await listed.repository.list();
  assert.deepEqual(records.map(({ checkId }) => checkId), ["ai.provider"]);
  assert.deepEqual(listed.queryCalls[0], {
    sql: postgresProductionDecisionSql.list,
    parameters: [12],
  });

  const found = fixture([], [queryResult([recordRow()])]);
  assert.equal(
    (await found.repository.findByCheckId("ai.provider"))?.version,
    1,
  );
  assert.equal(found.queryCalls[0].sql, postgresProductionDecisionSql.findByCheckId);
});

test("creates one decision behind the transactional check", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([recordRow()]),
  ]);
  const result = await database.repository.save(command());

  assert.equal(result.outcome, "created");
  assert.equal(result.record.lastEventKey, initialEventKey);
  assert.deepEqual(database.transactionCalls.map(({ sql }) => sql), [
    postgresProductionDecisionSql.lockByCheckId,
    postgresProductionDecisionSql.insert,
  ]);
  database.assertConsumed();
});

test("classifies a raced identical creation as unchanged", async () => {
  const database = fixture([
    queryResult([]),
    queryResult([]),
    queryResult([recordRow()]),
  ]);
  const result = await database.repository.save(command());

  assert.equal(result.outcome, "unchanged");
  assert.equal(result.record.version, 1);
  database.assertConsumed();
});

test("updates one locked decision to the exact next version", async () => {
  const updatedRow = recordRow({
    selection: updatedSelection,
    rationale: updatedRationale,
    version: 2,
    lastEventKey: updatedEventKey,
    decidedAt: new Date(secondOccurredAt),
    updatedAt: new Date(secondOccurredAt),
  });
  const database = fixture([
    queryResult([recordRow()]),
    queryResult([updatedRow]),
  ]);
  const result = await database.repository.save(command({
    expectedVersion: 1,
    selection: updatedSelection,
    rationale: updatedRationale,
    occurredAt: secondOccurredAt,
  }));

  assert.equal(result.outcome, "updated");
  assert.equal(result.record.version, 2);
  assert.equal(database.transactionCalls[1].sql, postgresProductionDecisionSql.update);
  database.assertConsumed();
});

test("keeps exact retries idempotent and rejects stale conflicting content", async () => {
  const updatedRow = recordRow({
    selection: updatedSelection,
    rationale: updatedRationale,
    version: 2,
    lastEventKey: updatedEventKey,
    decidedAt: new Date(secondOccurredAt),
    updatedAt: new Date(secondOccurredAt),
  });
  const retry = fixture([queryResult([updatedRow])]);
  assert.equal(
    (await retry.repository.save(command({
      expectedVersion: 1,
      selection: updatedSelection,
      rationale: updatedRationale,
      occurredAt: "2026-08-19T12:06:00.000Z",
    }))).outcome,
    "unchanged",
  );

  const stale = fixture([queryResult([updatedRow])]);
  const conflict = await stale.repository.save(command({
    expectedVersion: 1,
    selection: "Conflicting stale selection",
    occurredAt: "2026-08-19T12:06:00.000Z",
  }));
  assert.equal(conflict.outcome, "conflict");
  assert.equal(conflict.record?.version, 2);
});

test("rejects malformed identities, result shapes, and dependencies", async () => {
  const database = fixture();
  await assert.rejects(
    database.repository.save(command({ checkId: "unknown.check" })),
    /check ID is invalid/,
  );

  const malformed = fixture([], [queryResult([
    recordRow({ updatedAt: new Date(secondOccurredAt) }),
  ])]);
  await assert.rejects(
    malformed.repository.findByCheckId("ai.provider"),
    /inconsistent production decision time/,
  );

  assert.throws(
    () => createPostgresProductionDecisionRepository({}),
    /dependencies are invalid/,
  );
});
