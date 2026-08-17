import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresWorkerSchedulerLeaseRepository,
  postgresWorkerSchedulerLeaseSql,
} from "../server/platform/postgresWorkerSchedulerLeaseRepository.ts";
import {
  railwayWorkerSchedulerId,
} from "../shared/domain/workerScheduler.ts";

const ownerKey = `scheduler_owner_v1_${"a".repeat(64)}`;
const currentTick = "2026-08-17T10:00:00.000Z";
const observedAt = "2026-08-17T10:00:15.000Z";

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];

  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const response = remaining.shift();
        if (!response) {
          throw new Error("Unexpected PostgreSQL query");
        }
        return response;
      },
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function claimRow(overrides = {}) {
  return {
    schedulerId: railwayWorkerSchedulerId,
    ownerKey,
    fencingToken: "1",
    tick: new Date(currentTick),
    claimedAt: new Date(observedAt),
    leaseExpiresAt: new Date("2026-08-17T10:02:15.000Z"),
    ...overrides,
  };
}

function claimCommand(overrides = {}) {
  return {
    schedulerId: railwayWorkerSchedulerId,
    ownerKey,
    currentTick,
    observedAt,
    leaseSeconds: 120,
    maximumCatchUpTicks: 5,
    ...overrides,
  };
}

test("claims one bounded tick and completes it with the exact fencing token", async () => {
  const fixture = queryFixture([
    { rows: [claimRow()], rowCount: 1 },
    {
      rows: [{ completedTick: new Date(currentTick) }],
      rowCount: 1,
    },
  ]);
  const repository = createPostgresWorkerSchedulerLeaseRepository(
    fixture.queries,
  );

  assert.deepEqual(await repository.claimNext(claimCommand()), {
    outcome: "claimed",
    claim: {
      schedulerId: railwayWorkerSchedulerId,
      ownerKey,
      fencingToken: 1,
      tick: currentTick,
      claimedAt: observedAt,
      leaseExpiresAt: "2026-08-17T10:02:15.000Z",
    },
  });
  assert.deepEqual(fixture.calls[0].parameters, [
    railwayWorkerSchedulerId,
    ownerKey,
    currentTick,
    observedAt,
    120,
    5,
  ]);

  assert.deepEqual(
    await repository.complete({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey,
      fencingToken: 1,
      tick: currentTick,
      completedAt: "2026-08-17T10:00:20.000Z",
    }),
    { outcome: "completed", completedTick: currentTick },
  );
  assert.deepEqual(fixture.calls[1].parameters, [
    railwayWorkerSchedulerId,
    ownerKey,
    1,
    currentTick,
    "2026-08-17T10:00:20.000Z",
  ]);
  fixture.assertConsumed();
});

test("returns bounded no-claim and claim-lost outcomes", async () => {
  const fixture = queryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  const repository = createPostgresWorkerSchedulerLeaseRepository(
    fixture.queries,
  );

  assert.deepEqual(await repository.claimNext(claimCommand()), {
    outcome: "not-claimed",
    claim: null,
  });
  assert.deepEqual(
    await repository.complete({
      schedulerId: railwayWorkerSchedulerId,
      ownerKey,
      fencingToken: 7,
      tick: currentTick,
      completedAt: "2026-08-17T10:00:20.000Z",
    }),
    { outcome: "claim-lost", completedTick: null },
  );
});

test("serializes claims, retries expired work, and bounds catch-up in SQL", () => {
  assert.match(
    postgresWorkerSchedulerLeaseSql.claimNext,
    /ON CONFLICT \(scheduler_id\) DO NOTHING[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresWorkerSchedulerLeaseSql.claimNext,
    /lease_expires_at <= input\.observed_at[\s\S]*GREATEST\([\s\S]*minimum_tick/,
  );
  assert.match(
    postgresWorkerSchedulerLeaseSql.claimNext,
    /fencing_token = leases\.fencing_token \+ 1/,
  );
  assert.match(
    postgresWorkerSchedulerLeaseSql.complete,
    /owner_key = \$2[\s\S]*fencing_token = \$3[\s\S]*current_tick = \$4::timestamptz[\s\S]*state = 'claimed'/,
  );
});

test("rejects invalid commands and malformed PostgreSQL evidence", async () => {
  const never = createPostgresWorkerSchedulerLeaseRepository({
    async query() {
      throw new Error("must not query");
    },
  });

  await assert.rejects(
    never.claimNext(claimCommand({ ownerKey: "plain-owner" })),
    /owner key is invalid/,
  );
  await assert.rejects(
    never.claimNext(
      claimCommand({ currentTick: "2026-08-17T10:00:01.000Z" }),
    ),
    /tick is invalid/,
  );
  await assert.rejects(
    never.claimNext(claimCommand({ observedAt: "2026-08-17T10:01:00.000Z" })),
    /outside its tick/,
  );
  await assert.rejects(
    never.claimNext(claimCommand({ maximumCatchUpTicks: 6 })),
    /catch-up limit is invalid/,
  );

  const malformed = createPostgresWorkerSchedulerLeaseRepository({
    async query() {
      return {
        rows: [claimRow({ ownerKey: `scheduler_owner_v1_${"b".repeat(64)}` })],
        rowCount: 1,
      };
    },
  });
  await assert.rejects(
    malformed.claimNext(claimCommand()),
    /mismatched worker scheduler claim/,
  );
});
