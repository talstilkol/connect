import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveBotReplyStagingReceiptDigest,
  serializeCanonicalBotReplyStagingReceipt,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createPostgresBotReplyStagingRunCapabilityRepository,
  postgresBotReplyStagingRunCapabilitySql,
} from "../server/platform/postgresBotReplyStagingRunCapabilityRepository.ts";

const runKey = `bot_reply_staging_run_v1_${"1".repeat(64)}`;
const tenantId = 7;
const releaseId = `connect_release_v1_${"2".repeat(64)}`;
const commitSha = "3".repeat(40);
const artifactDigest = `sha256:${"4".repeat(64)}`;
const recipientFingerprint = `sha256:${"5".repeat(64)}`;
const rateLimitMethodFingerprint = `sha256:${"6".repeat(64)}`;
const leaseExpiresAt = "2026-08-25T12:30:00.000Z";
const completedAt = "2026-08-25T12:20:00.000Z";

function digest(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function auditKeyFor(currentRunKey, requestDigest) {
  const value = createHash("sha256")
    .update(currentRunKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
}

function claimInput(overrides = {}) {
  const fields = {
    runKey,
    tenantId,
    actorExternalUserId: "system-admin-primary",
    connectionVersion: 3,
    policyVersion: 4,
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion: "v24.0",
    recipientFingerprint,
    rateLimitMethodFingerprint,
    leaseDurationSeconds: 1_800,
    ...overrides,
  };
  const requestDigest = overrides.requestDigest ?? digest("d31-d1c-a-request");
  const auditKey = overrides.auditKey ??
    auditKeyFor(fields.runKey, requestDigest);
  return { ...fields, requestDigest, auditKey };
}

function readInput(overrides = {}) {
  const claim = claimInput();
  return {
    tenantId,
    runKey,
    requestDigest: claim.requestDigest,
    auditKey: claim.auditKey,
    releaseId,
    commitSha,
    artifactDigest,
    claimVersion: 2,
    ...overrides,
  };
}

function completionInput(overrides = {}) {
  return {
    ...readInput(),
    leaseExpiresAt,
    receipt: { zeta: "last", alpha: "first" },
    ...overrides,
  };
}

function capabilityRow(overrides = {}) {
  const claim = claimInput();
  return {
    outcome: "claimed",
    runKey,
    requestDigest: claim.requestDigest,
    auditKey: claim.auditKey,
    claimVersion: 2,
    leaseExpiresAt,
    completedAt: null,
    receiptJson: null,
    receiptDigest: null,
    ...overrides,
  };
}

function receiptFields(value = { alpha: "first", zeta: "last" }) {
  return {
    receiptJson: serializeCanonicalBotReplyStagingReceipt(value),
    receiptDigest: deriveBotReplyStagingReceiptDigest(value),
  };
}

function terminalRow(outcome = "completed", overrides = {}) {
  return capabilityRow({
    outcome,
    claimVersion: null,
    leaseExpiresAt: null,
    completedAt,
    ...receiptFields(),
    ...overrides,
  });
}

function blockedRow(outcome, overrides = {}) {
  return capabilityRow({
    outcome,
    auditKey: null,
    claimVersion: null,
    leaseExpiresAt: null,
    completedAt: null,
    receiptJson: null,
    receiptDigest: null,
    ...overrides,
  });
}

function queryResult(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function fixture(results) {
  const calls = [];
  const remaining = [...results];
  const queries = {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (remaining.length === 0) throw new Error("unexpected query");
      return remaining.shift();
    },
  };
  return {
    repository: createPostgresBotReplyStagingRunCapabilityRepository({
      queries,
    }),
    calls,
    remaining,
  };
}

function assertFrozenExact(result, keys) {
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(Object.keys(result).sort(), [...keys].sort());
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

test("exposes only three bounded SELECT calls to the 0051 wrappers", async () => {
  assert.deepEqual(
    Object.keys(postgresBotReplyStagingRunCapabilitySql).sort(),
    ["claim", "complete", "read"],
  );
  const combined = Object.values(
    postgresBotReplyStagingRunCapabilitySql,
  ).join("\n");
  assert.equal((combined.match(/\bSELECT\b/g) ?? []).length, 3);
  assert.equal((combined.match(/\bLIMIT 2\b/g) ?? []).length, 3);
  assert.match(combined, /public\.claim_bot_reply_staging_run_v1\(/);
  assert.match(combined, /public\.read_bot_reply_staging_run_v1\(/);
  assert.match(combined, /public\.complete_bot_reply_staging_run_v1\(/);
  assert.doesNotMatch(
    combined,
    /\b(?:INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|GRANT|CREATE ROLE)\b/i,
  );

  const source = await readFile(
    new URL(
      "../server/platform/postgresBotReplyStagingRunCapabilityRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /process\.env|DATABASE_URL|new Pool|createPool|BullMQ|Math\.random|crypto\.randomUUID|start(?:up|Server)|listen\s*\(/,
  );
});

test("claims through one wrapper call with all 14 parameters", async () => {
  const input = claimInput();
  const testFixture = fixture([queryResult([capabilityRow()])]);
  const result = await testFixture.repository.claim(input);

  assert.deepEqual(result, {
    outcome: "claimed",
    runKey,
    auditKey: input.auditKey,
    claimVersion: 2,
    leaseExpiresAt,
  });
  assertFrozenExact(result, [
    "outcome",
    "runKey",
    "auditKey",
    "claimVersion",
    "leaseExpiresAt",
  ]);
  assert.equal(testFixture.calls.length, 1);
  assert.equal(
    testFixture.calls[0].sql,
    postgresBotReplyStagingRunCapabilitySql.claim,
  );
  assert.deepEqual(testFixture.calls[0].parameters, [
    input.runKey,
    input.tenantId,
    input.requestDigest,
    input.actorExternalUserId,
    input.connectionVersion,
    input.policyVersion,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.graphApiVersion,
    input.recipientFingerprint,
    input.rateLimitMethodFingerprint,
    input.leaseDurationSeconds,
    input.auditKey,
  ]);
  assert.equal(testFixture.remaining.length, 0);
});

test("normalizes every non-claimed claim outcome", async () => {
  for (const outcome of ["conflict", "in-progress"]) {
    const testFixture = fixture([queryResult([blockedRow(outcome)])]);
    const result = await testFixture.repository.claim(claimInput());
    assert.deepEqual(result, { outcome, runKey });
    assertFrozenExact(result, ["outcome", "runKey"]);
  }

  const replay = fixture([queryResult([terminalRow("replayed")])]);
  const result = await replay.repository.claim(claimInput());
  assert.deepEqual(result, {
    outcome: "replayed",
    runKey,
    auditKey: claimInput().auditKey,
    completedAt,
    receipt: { alpha: "first", zeta: "last" },
  });
  assertFrozenExact(result, [
    "outcome",
    "runKey",
    "auditKey",
    "completedAt",
    "receipt",
  ]);
  assert.equal(Object.isFrozen(result.receipt), true);
});

test("reads running, completed, expired, and hidden-conflict outcomes", async () => {
  const input = readInput();
  const running = fixture([queryResult([capabilityRow({ outcome: "running" })])]);
  const runningResult = await running.repository.read(input);
  assert.deepEqual(runningResult, {
    outcome: "running",
    runKey,
    auditKey: input.auditKey,
    claimVersion: 2,
    leaseExpiresAt,
  });
  assertFrozenExact(runningResult, [
    "outcome",
    "runKey",
    "auditKey",
    "claimVersion",
    "leaseExpiresAt",
  ]);
  assert.deepEqual(running.calls[0].parameters, [
    input.tenantId,
    input.runKey,
    input.requestDigest,
    input.auditKey,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.claimVersion,
  ]);

  const completed = fixture([queryResult([terminalRow("completed", {
    claimVersion: 2,
  })])]);
  const completedResult = await completed.repository.read(input);
  assert.deepEqual(completedResult, {
    outcome: "completed",
    runKey,
    auditKey: input.auditKey,
    claimVersion: 2,
    completedAt,
    receipt: { alpha: "first", zeta: "last" },
  });
  assertFrozenExact(completedResult, [
    "outcome",
    "runKey",
    "auditKey",
    "claimVersion",
    "completedAt",
    "receipt",
  ]);

  for (const outcome of ["expired", "missing-or-conflict"]) {
    const hidden = fixture([queryResult([blockedRow(outcome)])]);
    const hiddenResult = await hidden.repository.read(input);
    assert.deepEqual(hiddenResult, { outcome, runKey });
    assertFrozenExact(hiddenResult, ["outcome", "runKey"]);
  }
});

test("completes with adapter-derived canonical bytes and digest", async () => {
  const input = completionInput();
  const canonicalReceiptJson = serializeCanonicalBotReplyStagingReceipt(
    input.receipt,
  );
  const receiptDigest = deriveBotReplyStagingReceiptDigest(input.receipt);
  const testFixture = fixture([queryResult([terminalRow("completed")])]);
  const result = await testFixture.repository.complete(input);

  assert.deepEqual(result, {
    outcome: "completed",
    runKey,
    auditKey: input.auditKey,
    completedAt,
    receipt: { alpha: "first", zeta: "last" },
  });
  assertFrozenExact(result, [
    "outcome",
    "runKey",
    "auditKey",
    "completedAt",
    "receipt",
  ]);
  assert.equal(testFixture.calls.length, 1);
  assert.equal(
    testFixture.calls[0].sql,
    postgresBotReplyStagingRunCapabilitySql.complete,
  );
  assert.deepEqual(testFixture.calls[0].parameters, [
    input.tenantId,
    input.runKey,
    input.requestDigest,
    input.auditKey,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.claimVersion,
    input.leaseExpiresAt,
    canonicalReceiptJson,
    receiptDigest,
  ]);
});

test("normalizes replay and both blocked completion outcomes", async () => {
  const replay = fixture([queryResult([terminalRow("replayed")])]);
  const replayResult = await replay.repository.complete(completionInput());
  assert.equal(replayResult.outcome, "replayed");
  assertFrozenExact(replayResult, [
    "outcome",
    "runKey",
    "auditKey",
    "completedAt",
    "receipt",
  ]);

  for (const outcome of ["conflict", "lease-expired"]) {
    const blocked = fixture([queryResult([blockedRow(outcome)])]);
    const result = await blocked.repository.complete(completionInput());
    assert.deepEqual(result, { outcome, runKey });
    assertFrozenExact(result, ["outcome", "runKey"]);
  }
});

test("requires exactly one result row and an exact inert row shape", async () => {
  for (const result of [
    queryResult([]),
    queryResult([capabilityRow(), capabilityRow()], 2),
    queryResult([capabilityRow()], 0),
  ]) {
    await assert.rejects(
      () => fixture([result]).repository.claim(claimInput()),
      /PostgreSQL (?:staging capability returned no row|returned an invalid result)/,
    );
  }

  const extra = capabilityRow({ unexpected: true });
  await assert.rejects(
    () => fixture([queryResult([extra])]).repository.claim(claimInput()),
    /staging capability row is invalid/,
  );
  const missing = capabilityRow();
  delete missing.receiptDigest;
  await assert.rejects(
    () => fixture([queryResult([missing])]).repository.claim(claimInput()),
    /staging capability row is invalid/,
  );
  await assert.rejects(
    () => fixture([queryResult([new Proxy(capabilityRow(), {})])])
      .repository.claim(claimInput()),
    /staging capability row is invalid/,
  );
  await assert.rejects(
    () => fixture([queryResult([
      accessorClone(capabilityRow(), "outcome"),
    ])]).repository.claim(claimInput()),
    /staging capability row is invalid/,
  );
});

test("rejects hostile result containers but accepts node-postgres-style extras", async () => {
  const resultProxy = new Proxy(queryResult([capabilityRow()]), {});
  const rowsProxy = new Proxy([capabilityRow()], {});
  const sparseRows = [];
  sparseRows.length = 1;
  const accessorRows = [];
  Object.defineProperty(accessorRows, "0", {
    enumerable: true,
    configurable: true,
    get() {
      return capabilityRow();
    },
  });
  const symbolRows = [capabilityRow()];
  symbolRows[Symbol.for("unexpected-row-metadata")] = true;
  const customRows = [capabilityRow()];
  Object.setPrototypeOf(customRows, Object.create(Array.prototype));
  const accessorResult = { rowCount: 1 };
  Object.defineProperty(accessorResult, "rows", {
    enumerable: true,
    configurable: true,
    get() {
      return [capabilityRow()];
    },
  });
  const symbolResult = queryResult([capabilityRow()]);
  symbolResult[Symbol.for("unexpected-result-metadata")] = true;

  for (const result of [
    resultProxy,
    { rows: rowsProxy, rowCount: 1 },
    { rows: sparseRows, rowCount: 1 },
    { rows: accessorRows, rowCount: 1 },
    { rows: symbolRows, rowCount: 1 },
    { rows: customRows, rowCount: 1 },
    accessorResult,
    symbolResult,
  ]) {
    await assert.rejects(
      () => fixture([result]).repository.claim(claimInput()),
      /PostgreSQL returned an invalid result/,
    );
  }

  class NodePostgresStyleResult {
    constructor() {
      this.command = "SELECT";
      this.rowCount = 1;
      this.oid = null;
      this.rows = [capabilityRow()];
      this.fields = [];
    }
  }
  const compatible = fixture([new NodePostgresStyleResult()]);
  assert.equal((await compatible.repository.claim(claimInput())).outcome, "claimed");
});

test("captures the reviewed query function at factory creation", async () => {
  const calls = [];
  const queries = {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return queryResult([capabilityRow()]);
    },
  };
  const repository = createPostgresBotReplyStagingRunCapabilityRepository({
    queries,
  });
  queries.query = async () => {
    throw new Error("mutated query must not execute");
  };

  assert.equal((await repository.claim(claimInput())).outcome, "claimed");
  assert.equal(calls.length, 1);
});

test("rejects unknown outcomes, crossed identities, and crossed claim fences", async () => {
  for (const row of [
    capabilityRow({ outcome: "unknown" }),
    capabilityRow({ runKey: `bot_reply_staging_run_v1_${"9".repeat(64)}` }),
    capabilityRow({ requestDigest: `sha256:${"8".repeat(64)}` }),
    capabilityRow({ auditKey: `bot_reply_staging_audit_v1_${"7".repeat(64)}` }),
  ]) {
    await assert.rejects(
      () => fixture([queryResult([row])]).repository.claim(claimInput()),
      /invalid staging claim outcome|inconsistent staging (?:identity|audit identity)/,
    );
  }

  await assert.rejects(
    () => fixture([queryResult([capabilityRow({
      outcome: "running",
      claimVersion: 3,
    })])]).repository.read(readInput()),
    /inconsistent staging claim fence/,
  );
});

test("enforces the exact null matrix for every outcome family", async () => {
  const cases = [
    {
      invoke: (repository) => repository.claim(claimInput()),
      row: capabilityRow({ completedAt }),
    },
    {
      invoke: (repository) => repository.claim(claimInput()),
      row: terminalRow("replayed", { claimVersion: 2 }),
    },
    {
      invoke: (repository) => repository.claim(claimInput()),
      row: blockedRow("conflict", { auditKey: claimInput().auditKey }),
    },
    {
      invoke: (repository) => repository.read(readInput()),
      row: capabilityRow({
        outcome: "running",
        receiptJson: receiptFields().receiptJson,
      }),
    },
    {
      invoke: (repository) => repository.read(readInput()),
      row: terminalRow("completed", {
        claimVersion: 2,
        leaseExpiresAt,
      }),
    },
    {
      invoke: (repository) => repository.complete(completionInput()),
      row: terminalRow("completed", { claimVersion: 2 }),
    },
    {
      invoke: (repository) => repository.complete(completionInput()),
      row: blockedRow("lease-expired", { completedAt }),
    },
  ];
  for (const current of cases) {
    const testFixture = fixture([queryResult([current.row])]);
    await assert.rejects(
      () => current.invoke(testFixture.repository),
      /null matrix is invalid/,
    );
  }
});

test("validates database timestamps and the half-open completion lease", async () => {
  await assert.rejects(
    () => fixture([queryResult([capabilityRow({
      leaseExpiresAt: "not-a-time",
    })])]).repository.claim(claimInput()),
    /invalid timestamp/,
  );
  await assert.rejects(
    () => fixture([queryResult([terminalRow("completed", {
      completedAt: leaseExpiresAt,
    })])]).repository.complete(completionInput()),
    /completion outside its lease/,
  );
  await assert.rejects(
    () => fixture([]).repository.complete(completionInput({
      leaseExpiresAt: "2026-08-25T12:30:00Z",
    })),
    /leaseExpiresAt is invalid/,
  );
});

test("rejects noncanonical, malformed, and digest-mismatched receipt evidence", async () => {
  const semanticallyEqualButNoncanonical = JSON.stringify({
    zeta: "last",
    alpha: "first",
  });
  const digest = deriveBotReplyStagingReceiptDigest({
    alpha: "first",
    zeta: "last",
  });
  await assert.rejects(
    () => fixture([queryResult([terminalRow("completed", {
      receiptJson: semanticallyEqualButNoncanonical,
      receiptDigest: digest,
    })])]).repository.complete(completionInput()),
    /(?:different|inconsistent) staging receipt/,
  );
  await assert.rejects(
    () => fixture([queryResult([terminalRow("completed", {
      receiptDigest: `sha256:${"0".repeat(64)}`,
    })])]).repository.complete(completionInput()),
    /(?:different|inconsistent) staging receipt/,
  );
  await assert.rejects(
    () => fixture([queryResult([terminalRow("completed", {
      receiptJson: "{",
    })])]).repository.complete(completionInput()),
    /(?:different|inconsistent) staging receipt/,
  );

  const cyclic = {};
  cyclic.self = cyclic;
  for (const invalidReceipt of [null, [], cyclic, new Proxy({}, {})]) {
    await assert.rejects(
      () => fixture([]).repository.complete(completionInput({
        receipt: invalidReceipt,
      })),
      /receipt is invalid/,
    );
  }
});

test("returns a deep-frozen canonical receipt snapshot", async () => {
  const receipt = {
    nested: {
      entries: [{ passed: true }],
    },
  };
  const testFixture = fixture([queryResult([terminalRow("completed", {
    ...receiptFields(receipt),
  })])]);
  const result = await testFixture.repository.complete(completionInput({
    receipt,
  }));

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.receipt), true);
  assert.equal(Object.isFrozen(result.receipt.nested), true);
  assert.equal(Object.isFrozen(result.receipt.nested.entries), true);
  assert.equal(Object.isFrozen(result.receipt.nested.entries[0]), true);
});

test("rejects missing, extra, proxy, and accessor inputs before querying", async () => {
  const methods = [
    ["claim", claimInput()],
    ["read", readInput()],
    ["complete", completionInput()],
  ];
  for (const [method, input] of methods) {
    const missing = { ...input };
    delete missing.runKey;
    const invalidInputs = [
      missing,
      { ...input, unexpected: true },
      new Proxy(input, {}),
      accessorClone(input, "runKey"),
    ];
    for (const invalid of invalidInputs) {
      const testFixture = fixture([]);
      await assert.rejects(
        () => testFixture.repository[method](invalid),
        /input is invalid/,
      );
      assert.equal(testFixture.calls.length, 0);
    }
  }
});

test("rejects forged claim identities and invalid scalar boundaries", async () => {
  const validClaim = claimInput();
  const invalidClaims = [
    claimInput({
      requestDigest: `sha256:${"0".repeat(64)}`,
      auditKey: validClaim.auditKey,
    }),
    claimInput({ auditKey: `bot_reply_staging_audit_v1_${"0".repeat(64)}` }),
    claimInput({ leaseDurationSeconds: 59 }),
    claimInput({ leaseDurationSeconds: 3_601 }),
    claimInput({ actorExternalUserId: " system-admin-primary" }),
    claimInput({ tenantId: 0 }),
    claimInput({ connectionVersion: 2_147_483_648 }),
    claimInput({ policyVersion: 2_147_483_648 }),
  ];
  for (const input of invalidClaims) {
    const testFixture = fixture([]);
    await assert.rejects(
      () => testFixture.repository.claim(input),
      /claim identity is invalid|leaseDurationSeconds is invalid|actorExternalUserId is invalid|tenantId is invalid|connectionVersion is invalid|policyVersion is invalid/,
    );
    assert.equal(testFixture.calls.length, 0);
  }

  await assert.rejects(
    () => fixture([]).repository.read(readInput({ claimVersion: 0 })),
    /claimVersion is invalid/,
  );
  await assert.rejects(
    () => fixture([]).repository.read(readInput({
      claimVersion: 2_147_483_648,
    })),
    /claimVersion is invalid/,
  );
  await assert.rejects(
    () => fixture([]).repository.read(readInput({
      auditKey: `bot_reply_staging_audit_v1_${"0".repeat(64)}`,
    })),
    /read input identity is invalid/,
  );
  await assert.rejects(
    () => fixture([]).repository.complete(completionInput({
      auditKey: `bot_reply_staging_audit_v1_${"0".repeat(64)}`,
    })),
    /complete input identity is invalid/,
  );
});

test("rejects claim versions outside the PostgreSQL INTEGER range", async () => {
  for (const claimVersion of [2_147_483_648, "2147483648"]) {
    const testFixture = fixture([
      queryResult([capabilityRow({ claimVersion })]),
    ]);
    await assert.rejects(
      () => testFixture.repository.claim(claimInput()),
      /invalid staging capability version/,
    );
    assert.equal(testFixture.calls.length, 1);
  }
});

test("rejects proxy, accessor, missing, and extra factory dependencies", () => {
  const queries = { async query() {} };
  assert.throws(
    () => createPostgresBotReplyStagingRunCapabilityRepository(
      new Proxy({ queries }, {}),
    ),
    /staging capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingRunCapabilityRepository({}),
    /staging capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingRunCapabilityRepository({
      queries,
      unexpected: true,
    }),
    /staging capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingRunCapabilityRepository(
      accessorClone({ queries }, "queries"),
    ),
    /staging capability dependencies is invalid/,
  );
  assert.throws(
    () => createPostgresBotReplyStagingRunCapabilityRepository({
      queries: accessorClone(queries, "query"),
    }),
    /staging capability queries is invalid/,
  );
});
