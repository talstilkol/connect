import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createPostgresBotReplyStagingRunRepository,
  postgresBotReplyStagingRunSql,
} from "../server/platform/postgresBotReplyStagingRunRepository.ts";

const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;
const claimedAt = "2026-08-21T13:30:00.000Z";
const leaseExpiresAt = "2026-08-21T14:00:00.000Z";
const completedAt = "2026-08-21T13:40:00.000Z";

function run(overrides = {}) {
  return {
    runKey,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt: "2026-08-21T13:25:00.000Z",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
    ...overrides,
  };
}

function claimInput(overrides = {}) {
  const { run: runOverride, ...remainingOverrides } = overrides;
  const value = run(runOverride);
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(value);
  return {
    run: value,
    requestDigest,
    auditKey: deriveBotReplyStagingDurableAuditKey(runKey, requestDigest),
    claimedAt,
    leaseExpiresAt,
    ...remainingOverrides,
  };
}

function receipt(value = { bounded: true }) {
  const serialized = JSON.stringify(value);
  return {
    value,
    serialized,
    digest: deriveBotReplyStagingReceiptDigest(value),
  };
}

function row(overrides = {}) {
  const input = claimInput();
  return {
    runKey,
    tenantId: 7,
    requestDigest: input.requestDigest,
    actorExternalUserId: "system-admin-primary",
    connectionVersion: 3,
    policyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    status: "running",
    claimVersion: 1,
    leaseExpiresAt,
    auditKey: input.auditKey,
    receiptJson: null,
    receiptDigest: null,
    startedAt: claimedAt,
    completedAt: null,
    createdAt: claimedAt,
    updatedAt: claimedAt,
    ...overrides,
  };
}

function completedRow(overrides = {}) {
  const evidence = receipt();
  return row({
    status: "completed",
    receiptJson: evidence.serialized,
    receiptDigest: evidence.digest,
    completedAt,
    updatedAt: completedAt,
    ...overrides,
  });
}

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(results) {
  const calls = [];
  const remaining = [...results];
  const repository = createPostgresBotReplyStagingRunRepository({
    async transaction(options, execute) {
      calls.push({ kind: "transaction", options });
      return execute({
        async query(sql, parameters) {
          calls.push({ kind: "query", sql, parameters });
          if (remaining.length === 0) {
            throw new Error("unexpected query");
          }
          return remaining.shift();
        },
      });
    },
  });
  return { repository, calls, remaining };
}

test("inserts one run and relies on the database audit trigger", async () => {
  const testFixture = fixture([queryResult([row()])]);
  const result = await testFixture.repository.claim(claimInput());

  assert.deepEqual(result, {
    outcome: "claimed",
    runKey,
    auditKey: claimInput().auditKey,
    claimVersion: 1,
    leaseExpiresAt,
  });
  assert.deepEqual(testFixture.calls[0], {
    kind: "transaction",
    options: { isolationLevel: "read-committed" },
  });
  assert.equal(testFixture.calls[1].sql, postgresBotReplyStagingRunSql.insert);
  assert.match(testFixture.calls[1].sql, /ON CONFLICT DO NOTHING/);
  assert.equal(testFixture.calls[1].parameters.length, 15);
  assert.equal(testFixture.remaining.length, 0);
});

test("reads the exact running fence without taking an update lock", async () => {
  const testFixture = fixture([queryResult([row()])]);
  const result = await testFixture.repository.read({
    runKey,
    requestDigest: claimInput().requestDigest,
  });

  assert.deepEqual(result, {
    outcome: "running",
    runKey,
    auditKey: claimInput().auditKey,
    claimVersion: 1,
    leaseExpiresAt,
  });
  assert.equal(testFixture.calls[1].sql, postgresBotReplyStagingRunSql.find);
  assert.doesNotMatch(testFixture.calls[1].sql, /FOR UPDATE/);
});

test("reads one completed receipt and hides missing or conflicting identity", async () => {
  const completed = fixture([queryResult([completedRow()])]);
  const completedResult = await completed.repository.read({
    runKey,
    requestDigest: claimInput().requestDigest,
  });
  assert.equal(completedResult.outcome, "completed");
  assert.equal(completedResult.claimVersion, 1);
  assert.equal(completedResult.completedAt, completedAt);
  assert.deepEqual(completedResult.receipt, { bounded: true });

  const missing = fixture([queryResult([])]);
  assert.deepEqual(await missing.repository.read({
    runKey,
    requestDigest: claimInput().requestDigest,
  }), { outcome: "missing-or-conflict", runKey });

  const conflicting = fixture([queryResult([row()])]);
  assert.deepEqual(await conflicting.repository.read({
    runKey,
    requestDigest: `sha256:${"0".repeat(64)}`,
  }), { outcome: "missing-or-conflict", runKey });
});

test("returns in-progress or conflict without changing an active run", async () => {
  const active = fixture([
    queryResult([]),
    queryResult([row()]),
  ]);
  assert.deepEqual(await active.repository.claim(claimInput()), {
    outcome: "in-progress",
    runKey,
  });
  assert.equal(active.calls.filter(({ kind }) => kind === "query").length, 2);

  const conflictingInput = claimInput({
    run: { actorExternalUserId: "system-admin-backup" },
  });
  const conflict = fixture([
    queryResult([]),
    queryResult([row()]),
  ]);
  assert.deepEqual(await conflict.repository.claim(conflictingInput), {
    outcome: "conflict",
    runKey,
  });
});

test("reclaims only an expired lease and advances the fence", async () => {
  const expired = row({
    claimVersion: 2,
    leaseExpiresAt: "2026-08-21T13:29:00.000Z",
    updatedAt: "2026-08-21T13:00:00.000Z",
  });
  const reclaimed = row({ claimVersion: 3 });
  const testFixture = fixture([
    queryResult([]),
    queryResult([expired]),
    queryResult([reclaimed]),
  ]);

  assert.deepEqual(await testFixture.repository.claim(claimInput()), {
    outcome: "claimed",
    runKey,
    auditKey: claimInput().auditKey,
    claimVersion: 3,
    leaseExpiresAt,
  });
  assert.equal(testFixture.calls[3].sql, postgresBotReplyStagingRunSql.reclaim);
  assert.deepEqual(testFixture.calls[3].parameters.slice(3), [
    leaseExpiresAt,
    2,
  ]);
});

test("replays an immutable completed receipt without a write", async () => {
  const testFixture = fixture([
    queryResult([]),
    queryResult([completedRow()]),
  ]);
  const result = await testFixture.repository.claim(claimInput());

  assert.equal(result.outcome, "replayed");
  assert.deepEqual(result.receipt, { bounded: true });
  assert.equal(result.completedAt, completedAt);
  assert.equal(testFixture.calls.filter(({ kind }) => kind === "query").length, 2);
});

test("completes only the current claim with an exact receipt digest", async () => {
  const evidence = receipt();
  const testFixture = fixture([
    queryResult([row()]),
    queryResult([completedRow()]),
  ]);
  const result = await testFixture.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: evidence.value,
    receiptDigest: evidence.digest,
    completedAt,
  });

  assert.equal(result.outcome, "completed");
  assert.deepEqual(result.receipt, evidence.value);
  assert.equal(testFixture.calls[2].sql, postgresBotReplyStagingRunSql.complete);
  assert.deepEqual(testFixture.calls[0], {
    kind: "transaction",
    options: { isolationLevel: "read-committed" },
  });
  assert.deepEqual(testFixture.calls[2].parameters, [
    runKey,
    claimInput().requestDigest,
    1,
    evidence.serialized,
    evidence.digest,
    completedAt,
  ]);
});

test("replays an identical completion and rejects conflicting receipt", async () => {
  const evidence = receipt();
  const replay = fixture([queryResult([completedRow()])]);
  assert.equal((await replay.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: evidence.value,
    receiptDigest: evidence.digest,
    completedAt,
  })).outcome, "replayed");

  const other = receipt({ bounded: false });
  const conflict = fixture([queryResult([completedRow()])]);
  assert.deepEqual(await conflict.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: other.value,
    receiptDigest: other.digest,
    completedAt,
  }), { outcome: "conflict", runKey });
});

test("binds receipt identity to canonical JSON instead of insertion order", async () => {
  const stored = receipt({ zeta: "last", alpha: "first" });
  const retried = receipt({ alpha: "first", zeta: "last" });
  assert.notEqual(stored.serialized, retried.serialized);
  assert.equal(stored.digest, retried.digest);

  const replay = fixture([queryResult([completedRow({
    receiptJson: stored.serialized,
    receiptDigest: stored.digest,
  })])]);
  const result = await replay.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: retried.value,
    receiptDigest: retried.digest,
    completedAt,
  });

  assert.equal(result.outcome, "replayed");
  assert.deepEqual(result.receipt, stored.value);
});

test("rejects a stale fence and a completion outside its lease", async () => {
  const evidence = receipt();
  const stale = fixture([queryResult([row({ claimVersion: 2 })])]);
  assert.deepEqual(await stale.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: evidence.value,
    receiptDigest: evidence.digest,
    completedAt,
  }), { outcome: "conflict", runKey });

  const expired = fixture([queryResult([row()])]);
  assert.deepEqual(await expired.repository.complete({
    runKey,
    requestDigest: claimInput().requestDigest,
    expectedClaimVersion: 1,
    receipt: evidence.value,
    receiptDigest: evidence.digest,
    completedAt: "2026-08-21T14:00:00.001Z",
  }), { outcome: "lease-expired", runKey });
});

test("rejects forged identity, unsafe receipts and corrupt database rows", async () => {
  const forged = claimInput({ requestDigest: `sha256:${"0".repeat(64)}` });
  await assert.rejects(
    () => fixture([]).repository.claim(forged),
    /claim identity is invalid/,
  );

  const evidence = receipt();
  await assert.rejects(
    () => fixture([]).repository.complete({
      runKey,
      requestDigest: claimInput().requestDigest,
      expectedClaimVersion: 1,
      receipt: evidence.value,
      receiptDigest: `sha256:${"0".repeat(64)}`,
      completedAt,
    }),
    /receiptDigest is invalid/,
  );

  await assert.rejects(
    () => fixture([queryResult([row({ auditKey: "invalid" })])])
      .repository.claim(claimInput()),
    /auditKey is invalid/,
  );
});

test("rejects an invalid transaction manager", () => {
  assert.throws(
    () => createPostgresBotReplyStagingRunRepository({}),
    /transactions are invalid/,
  );
});
