import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository,
} from "../server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts";

const runKey = `bot_reply_staging_run_v1_${"1".repeat(64)}`;
const tenantId = 7;
const requestDigest = `sha256:${"2".repeat(64)}`;
const releaseId = `connect_release_v1_${"3".repeat(64)}`;
const commitSha = "4".repeat(40);
const artifactDigest = `sha256:${"5".repeat(64)}`;
const runLeaseExpiresAt = "2026-08-25T12:30:00.000Z";
const operationKey = `bot_reply_staging_step_v1_${"6".repeat(64)}`;
const deliveryKey = `bot_reply_delivery_v1_${"7".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"8".repeat(64)}`;
const requestedAt = "2026-08-25T12:20:00.000Z";
const providerRequestKey =
  providerRequestKeyFor({
    runKey,
    requestDigest,
    operationKey,
    deliveryKey,
    deliveryClaimVersion: 3,
    reservationKey,
  }, requestedAt);
const observationKey =
  `bot_reply_staging_observation_v1_${"a".repeat(64)}`;
const finalizedAt = "2026-08-25T12:21:00.000Z";

function auditKeyFor(currentRunKey, currentRequestDigest) {
  const value = createHash("sha256")
    .update(currentRunKey, "utf8")
    .update("\0", "utf8")
    .update(currentRequestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
}

function providerRequestKeyFor(request, timestamp) {
  const value = createHash("sha256")
    .update("connect-bot-reply-staging-provider-operation-request-v1", "utf8")
    .update("\0", "utf8")
    .update(request.runKey, "utf8")
    .update("\0", "utf8")
    .update(request.requestDigest, "utf8")
    .update("\0", "utf8")
    .update(request.operationKey, "utf8")
    .update("\0", "utf8")
    .update(request.deliveryKey, "utf8")
    .update("\0", "utf8")
    .update(String(request.deliveryClaimVersion), "utf8")
    .update("\0", "utf8")
    .update(request.reservationKey, "utf8")
    .update("\0", "utf8")
    .update(timestamp, "utf8")
    .digest("hex");
  return `bot_reply_provider_request_v1_${value}`;
}

function input(overrides = {}) {
  return {
    runKey,
    tenantId,
    requestDigest,
    auditKey: auditKeyFor(runKey, requestDigest),
    releaseId,
    commitSha,
    artifactDigest,
    runClaimVersion: 2,
    runLeaseExpiresAt,
    operationKey,
    operationKind: "text-send",
    deliveryKey,
    deliveryClaimVersion: 3,
    reservationKey,
    ...overrides,
  };
}

function reserveRow(overrides = {}) {
  return {
    outcome: "authorized",
    operationKey,
    providerRequestKey,
    state: "reserved",
    requestedAt,
    ...overrides,
  };
}

function replayBlockedRow(state = "reserved", overrides = {}) {
  return reserveRow({
    outcome: "replay-blocked",
    providerRequestKey: null,
    state,
    requestedAt: null,
    ...overrides,
  });
}

function finalizeRow(overrides = {}) {
  return {
    outcome: "finalized",
    operationKey,
    state: "completed",
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
    ...overrides,
  };
}

function pendingRow(overrides = {}) {
  return finalizeRow({
    outcome: "pending",
    state: "reserved",
    providerOutcomeKind: null,
    observationKey: null,
    finalizedAt: null,
    ...overrides,
  });
}

function queryResult(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function fixture(results) {
  const calls = [];
  const remaining = [...results];
  const committedQueries = {
    async queryCommitted(sql, parameters) {
      calls.push({ sql, parameters });
      if (remaining.length === 0) throw new Error("unexpected query");
      return remaining.shift();
    },
  };
  return {
    repository:
      createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
        committedQueries,
      }),
    committedQueries,
    calls,
    remaining,
  };
}

function assertFrozenExact(value, keys) {
  assert.equal(Object.isFrozen(value), true);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

function accessorClone(value, key) {
  const clone = { ...value };
  const stored = clone[key];
  Object.defineProperty(clone, key, {
    enumerable: true,
    configurable: true,
    get() {
      return stored;
    },
  });
  return clone;
}

test("exposes one exact frozen Worker-only provider-fence capability", () => {
  const { repository } = fixture([]);

  assertFrozenExact(repository, ["reserve", "finalize"]);
  assert.equal("claim" in repository, false);
  assert.equal("read" in repository, false);
  assert.equal("complete" in repository, false);
});

test("uses only two fixed bounded SELECT calls to the provider fence wrappers", async () => {
  const testFixture = fixture([
    queryResult([reserveRow()]),
    queryResult([finalizeRow()]),
  ]);
  await testFixture.repository.reserve(input());
  await testFixture.repository.finalize(input());

  const combined = testFixture.calls.map(({ sql }) => sql).join("\n");
  assert.equal((combined.match(/\bSELECT\b/g) ?? []).length, 2);
  assert.equal((combined.match(/\bLIMIT 2\b/g) ?? []).length, 2);
  assert.match(
    combined,
    /public\.reserve_bot_reply_staging_provider_operation_v1\(/,
  );
  assert.match(
    combined,
    /public\.finalize_bot_reply_staging_provider_operation_v1\(/,
  );
  assert.doesNotMatch(
    combined,
    /\b(?:INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|GRANT|CREATE ROLE|FOR UPDATE)\b/i,
  );
  assert.equal(testFixture.calls[0].parameters.length, 14);
  assert.deepEqual(
    testFixture.calls[1].parameters,
    testFixture.calls[0].parameters,
  );

  const source = await readFile(
    new URL(
      "../server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /process\.env|DATABASE_URL|new Pool|createPool|BullMQ|Math\.random|crypto\.randomUUID|fetch\s*\(|Graph API|providerRequestJson|start(?:up|Server)|listen\s*\(/,
  );
  assert.doesNotMatch(
    source,
    /export\s+(?:const|interface|type|class)\s+PostgresBotReplyStagingProviderFenceCapability(?:Sql|Repository)/,
  );
});

test("reserves once with all 14 exact identity parameters", async () => {
  const request = input();
  const testFixture = fixture([queryResult([reserveRow()])]);
  const result = await testFixture.repository.reserve(request);

  assert.equal(
    providerRequestKey,
    "bot_reply_provider_request_v1_013aadd3439fe9cfba353be40840e73928e5a56c339e5f2df151119fe772b469",
  );

  assert.deepEqual(result, {
    outcome: "authorized",
    operationKey,
    providerRequestKey,
    state: "reserved",
    requestedAt,
  });
  assertFrozenExact(result, [
    "outcome",
    "operationKey",
    "providerRequestKey",
    "state",
    "requestedAt",
  ]);
  assert.deepEqual(testFixture.calls[0].parameters, [
    request.runKey,
    request.tenantId,
    request.requestDigest,
    request.auditKey,
    request.releaseId,
    request.commitSha,
    request.artifactDigest,
    request.runClaimVersion,
    request.runLeaseExpiresAt,
    request.operationKey,
    request.operationKind,
    request.deliveryKey,
    request.deliveryClaimVersion,
    request.reservationKey,
  ]);
  assert.equal(testFixture.remaining.length, 0);
});

test("never exposes reusable capability material on a reserve replay", async () => {
  for (const state of ["reserved", "completed", "indeterminate"]) {
    const testFixture = fixture([
      queryResult([replayBlockedRow(state)]),
    ]);
    const result = await testFixture.repository.reserve(input());
    assert.deepEqual(result, {
      outcome: "replay-blocked",
      operationKey,
      state,
    });
    assertFrozenExact(result, ["outcome", "operationKey", "state"]);
    assert.equal("providerRequestKey" in result, false);
    assert.equal("requestedAt" in result, false);
  }
});

test("normalizes pending, completed, indeterminate, and replayed finalization", async () => {
  const pending = fixture([queryResult([pendingRow()])]);
  const pendingResult = await pending.repository.finalize(input());
  assert.deepEqual(pendingResult, {
    outcome: "pending",
    operationKey,
    state: "reserved",
  });
  assertFrozenExact(pendingResult, ["outcome", "operationKey", "state"]);

  for (const providerOutcomeKind of [
    "accepted",
    "sender-deferred",
    "pair-deferred",
    "service-window-rejected",
  ]) {
    for (const outcome of ["finalized", "replayed"]) {
      const testFixture = fixture([queryResult([finalizeRow({
        outcome,
        providerOutcomeKind,
      })])]);
      const result = await testFixture.repository.finalize(input());
      assert.deepEqual(result, {
        outcome,
        operationKey,
        state: "completed",
        providerOutcomeKind,
        observationKey,
        finalizedAt,
      });
      assertFrozenExact(result, [
        "outcome",
        "operationKey",
        "state",
        "providerOutcomeKind",
        "observationKey",
        "finalizedAt",
      ]);
    }
  }

  for (const providerOutcomeKind of [
    "ambiguous",
    "lease-expired-without-outcome",
  ]) {
    const testFixture = fixture([queryResult([finalizeRow({
      state: "indeterminate",
      providerOutcomeKind,
    })])]);
    const result = await testFixture.repository.finalize(input());
    assert.deepEqual(result, {
      outcome: "finalized",
      operationKey,
      state: "indeterminate",
      providerOutcomeKind,
      observationKey,
      finalizedAt,
    });
  }
});

test("rejects row-count drift, row-shape drift, and crossed identities", async () => {
  for (const result of [
    queryResult([]),
    queryResult([reserveRow(), reserveRow()], 2),
    queryResult([reserveRow()], 0),
  ]) {
    await assert.rejects(
      () => fixture([result]).repository.reserve(input()),
      /PostgreSQL (?:staging provider capability returned no row|returned an invalid result)/,
    );
  }

  const extra = reserveRow({ unexpected: true });
  await assert.rejects(
    () => fixture([queryResult([extra])]).repository.reserve(input()),
    /staging provider capability row is invalid/,
  );
  const missing = reserveRow();
  delete missing.state;
  await assert.rejects(
    () => fixture([queryResult([missing])]).repository.reserve(input()),
    /staging provider capability row is invalid/,
  );
  await assert.rejects(
    () => fixture([queryResult([reserveRow({
      operationKey: `bot_reply_staging_step_v1_${"f".repeat(64)}`,
    })])]).repository.reserve(input()),
    /inconsistent staging provider operation identity/,
  );
});

test("enforces every reserve and finalize null/state matrix", async () => {
  const cases = [
    {
      method: "reserve",
      row: reserveRow({ state: "completed" }),
      pattern: /invalid staging provider reserve state/,
    },
    {
      method: "reserve",
      row: replayBlockedRow("reserved", { providerRequestKey }),
      pattern: /null matrix is invalid/,
    },
    {
      method: "reserve",
      row: replayBlockedRow("unknown"),
      pattern: /invalid staging provider reserve state/,
    },
    {
      method: "finalize",
      row: pendingRow({ observationKey }),
      pattern: /null matrix is invalid/,
    },
    {
      method: "finalize",
      row: finalizeRow({
        state: "completed",
        providerOutcomeKind: "ambiguous",
      }),
      pattern: /invalid staging provider terminal matrix/,
    },
    {
      method: "finalize",
      row: finalizeRow({
        state: "indeterminate",
        providerOutcomeKind: "accepted",
      }),
      pattern: /invalid staging provider terminal matrix/,
    },
    {
      method: "reserve",
      row: reserveRow({ outcome: "unknown" }),
      pattern: /invalid staging provider reserve outcome/,
    },
    {
      method: "finalize",
      row: finalizeRow({ outcome: "unknown" }),
      pattern: /invalid staging provider finalize outcome/,
    },
  ];
  for (const current of cases) {
    await assert.rejects(
      () => fixture([queryResult([current.row])])
        .repository[current.method](input()),
      current.pattern,
    );
  }
});

test("rejects hostile result containers and hostile rows", async () => {
  const rowsProxy = new Proxy([reserveRow()], {});
  const sparseRows = [];
  sparseRows.length = 1;
  const accessorRows = [];
  Object.defineProperty(accessorRows, "0", {
    enumerable: true,
    configurable: true,
    get() {
      return reserveRow();
    },
  });
  const symbolRows = [reserveRow()];
  symbolRows[Symbol.for("unexpected-row-metadata")] = true;
  const customRows = [reserveRow()];
  Object.setPrototypeOf(customRows, Object.create(Array.prototype));
  const accessorResult = { rowCount: 1 };
  Object.defineProperty(accessorResult, "rows", {
    enumerable: true,
    configurable: true,
    get() {
      return [reserveRow()];
    },
  });
  const symbolResult = queryResult([reserveRow()]);
  symbolResult[Symbol.for("unexpected-result-metadata")] = true;

  for (const result of [
    new Proxy(queryResult([reserveRow()]), {}),
    { rows: rowsProxy, rowCount: 1 },
    { rows: sparseRows, rowCount: 1 },
    { rows: accessorRows, rowCount: 1 },
    { rows: symbolRows, rowCount: 1 },
    { rows: customRows, rowCount: 1 },
    accessorResult,
    symbolResult,
  ]) {
    await assert.rejects(
      () => fixture([result]).repository.reserve(input()),
      /PostgreSQL returned an invalid result/,
    );
  }

  for (const row of [
    new Proxy(reserveRow(), {}),
    accessorClone(reserveRow(), "outcome"),
  ]) {
    await assert.rejects(
      () => fixture([queryResult([row])]).repository.reserve(input()),
      /staging provider capability row is invalid/,
    );
  }
});

test("validates exact hostile inputs and scalar boundaries before querying", async () => {
  const valid = input();
  const missing = { ...valid };
  delete missing.operationKey;
  const invalidInputs = [
    missing,
    { ...valid, unexpected: true },
    new Proxy(valid, {}),
    accessorClone(valid, "runKey"),
    input({ runClaimVersion: 0 }),
    input({ runClaimVersion: 2_147_483_648 }),
    input({ deliveryClaimVersion: 0 }),
    input({ deliveryClaimVersion: 2_147_483_648 }),
    input({ operationKind: "button-reply" }),
    input({ runLeaseExpiresAt: "2026-08-25T12:30:00Z" }),
    input({ reservationKey: `whatsapp_rate_reservation_v1_${"G".repeat(64)}` }),
  ];
  for (const method of ["reserve", "finalize"]) {
    for (const invalid of invalidInputs) {
      const testFixture = fixture([]);
      await assert.rejects(
        () => testFixture.repository[method](invalid),
        /input is invalid|runClaimVersion is invalid|deliveryClaimVersion is invalid|operationKind is invalid|runLeaseExpiresAt is invalid|reservationKey is invalid/,
      );
      assert.equal(testFixture.calls.length, 0);
    }
  }
});

test("rejects forged run audit identity and invalid output evidence", async () => {
  const forged = input({
    auditKey: `bot_reply_staging_audit_v1_${"0".repeat(64)}`,
  });
  await assert.rejects(
    () => fixture([]).repository.reserve(forged),
    /reserve input identity is invalid/,
  );

  await assert.rejects(
    () => fixture([queryResult([reserveRow({
      providerRequestKey: `bot_reply_provider_request_v1_${"G".repeat(64)}`,
    })])]).repository.reserve(input()),
    /providerRequestKey is invalid/,
  );
  await assert.rejects(
    () => fixture([queryResult([reserveRow({
      providerRequestKey: `bot_reply_provider_request_v1_${"0".repeat(64)}`,
    })])]).repository.reserve(input()),
    /inconsistent staging provider request identity/,
  );
  await assert.rejects(
    () => fixture([queryResult([reserveRow({
      requestedAt: runLeaseExpiresAt,
    })])]).repository.reserve(input()),
    /authorization outside its lease/,
  );
  await assert.rejects(
    () => fixture([queryResult([finalizeRow({
      observationKey: `bot_reply_staging_observation_v1_${"G".repeat(64)}`,
    })])]).repository.finalize(input()),
    /observationKey is invalid/,
  );
  await assert.rejects(
    () => fixture([queryResult([finalizeRow({ finalizedAt: "not-a-time" })])])
      .repository.finalize(input()),
    /invalid timestamp/,
  );
});

test("normalizes native PostgreSQL Date values without invoking overrides", async () => {
  const reserve = fixture([queryResult([reserveRow({
    requestedAt: new Date(requestedAt),
  })])]);
  assert.equal((await reserve.repository.reserve(input())).requestedAt, requestedAt);

  const finalize = fixture([queryResult([finalizeRow({
    finalizedAt: new Date(finalizedAt),
  })])]);
  assert.equal(
    (await finalize.repository.finalize(input())).finalizedAt,
    finalizedAt,
  );
});

test("rejects Date subclasses, proxies, and own timestamp accessors", async () => {
  class HostileDate extends Date {
    toISOString() {
      return requestedAt;
    }
  }
  const accessorDate = new Date(requestedAt);
  Object.defineProperty(accessorDate, "toISOString", {
    configurable: true,
    get() {
      throw new Error("timestamp getter must not execute");
    },
  });
  const hostileValues = [
    new HostileDate(requestedAt),
    new Proxy(new Date(requestedAt), {}),
    accessorDate,
  ];

  for (const value of hostileValues) {
    await assert.rejects(
      () => fixture([queryResult([reserveRow({ requestedAt: value })])])
        .repository.reserve(input()),
      /PostgreSQL returned an invalid timestamp/,
    );
    await assert.rejects(
      () => fixture([queryResult([finalizeRow({ finalizedAt: value })])])
        .repository.finalize(input()),
      /PostgreSQL returned an invalid timestamp/,
    );
  }
});

test("captures the exact reviewed query function at factory creation", async () => {
  const testFixture = fixture([
    queryResult([reserveRow()]),
    queryResult([finalizeRow()]),
  ]);
  testFixture.committedQueries.queryCommitted = async () => {
    throw new Error("mutated query must not execute");
  };

  assert.equal(
    (await testFixture.repository.reserve(input())).outcome,
    "authorized",
  );
  assert.equal(
    (await testFixture.repository.finalize(input())).outcome,
    "finalized",
  );
  assert.equal(testFixture.calls.length, 2);
});

test("rejects proxy, accessor, missing, and extra factory dependencies", () => {
  const committedQueries = { async queryCommitted() {} };
  const transactionShaped = { async query() {} };
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository(
      new Proxy({ committedQueries }, {}),
    ),
    /staging provider capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository(
      {},
    ),
    /staging provider capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
      queries: transactionShaped,
    }),
    /staging provider capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
      committedQueries: transactionShaped,
    }),
    /staging provider committed queries is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
      committedQueries: {
        ...committedQueries,
        query: transactionShaped.query,
      },
    }),
    /staging provider committed queries is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
      committedQueries,
      unexpected: true,
    }),
    /staging provider capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository(
      accessorClone({ committedQueries }, "committedQueries"),
    ),
    /staging provider capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
      committedQueries: accessorClone(
        committedQueries,
        "queryCommitted",
      ),
    }),
    /staging provider committed queries is invalid/,
  );
});
