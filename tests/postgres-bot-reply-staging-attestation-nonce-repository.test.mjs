import assert from "node:assert/strict";
import test from "node:test";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptAttestationPayloadDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createPostgresBotReplyStagingAttestationNonceRepository,
  postgresBotReplyStagingAttestationNonceSql,
} from "../server/platform/postgresBotReplyStagingAttestationNonceRepository.ts";

const base = Object.freeze({
  policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
  keyId: `bot_reply_staging_worker_key_v1_${"1".repeat(64)}`,
  runKey: `bot_reply_staging_run_v1_${"2".repeat(64)}`,
  claimVersion: 1,
  requestDigest: `sha256:${"3".repeat(64)}`,
  releaseId: `connect_release_v1_${"4".repeat(64)}`,
  commitSha: "5".repeat(40),
  artifactDigest: `sha256:${"6".repeat(64)}`,
  expectedEvidenceVersion: 0,
  receiptDigest: `sha256:${"7".repeat(64)}`,
  evidenceCoreDigest: `sha256:${"8".repeat(64)}`,
  auditKey:
    `bot_reply_staging_attestation_audit_v1_${"9".repeat(64)}`,
  nonceSequence: 1,
  issuedAt: "2026-08-25T10:00:00.000Z",
  signedAt: "2026-08-25T10:00:01.000Z",
  expiresAt: "2026-08-25T10:10:00.000Z",
});

function claim(overrides = {}) {
  const binding = { ...base, ...overrides };
  const nonce = deriveBotReplyStagingReceiptAttestationNonce(binding);
  const unsigned = Object.freeze({
    schemaVersion: 1,
    policyVersion: binding.policyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    keyId: binding.keyId,
    runKey: binding.runKey,
    claimVersion: binding.claimVersion,
    requestDigest: binding.requestDigest,
    releaseId: binding.releaseId,
    commitSha: binding.commitSha,
    artifactDigest: binding.artifactDigest,
    expectedEvidenceVersion: binding.expectedEvidenceVersion,
    receiptDigest: binding.receiptDigest,
    evidenceCoreDigest: binding.evidenceCoreDigest,
    auditKey: binding.auditKey,
    nonce,
    nonceSequence: binding.nonceSequence,
    issuedAt: binding.issuedAt,
    signedAt: binding.signedAt,
    expiresAt: binding.expiresAt,
  });
  return Object.freeze({
    ...binding,
    nonce,
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(unsigned),
  });
}

function resultRow(input, resultStatus = "consumed") {
  if (resultStatus === "conflict") {
    return {
      resultStatus,
      nonce: null,
      receiptDigest: null,
      evidenceCoreDigest: null,
      expectedEvidenceVersion: null,
      attestationPayloadDigest: null,
    };
  }
  return {
    resultStatus,
    nonce: input.nonce,
    receiptDigest: input.receiptDigest,
    evidenceCoreDigest: input.evidenceCoreDigest,
    expectedEvidenceVersion: input.expectedEvidenceVersion,
    attestationPayloadDigest: input.attestationPayloadDigest,
  };
}

function fixture({ rows = null, status = "consumed" } = {}) {
  const calls = [];
  const repository =
    createPostgresBotReplyStagingAttestationNonceRepository();
  const transaction = {
    async query(sql, parameters) {
      calls.push({
        sql,
        parameters,
        parametersFrozen: Object.isFrozen(parameters),
        receiver: this,
      });
      const input = claim();
      const selectedRows = rows === null
        ? [resultRow(input, status)]
        : rows;
      return { rows: selectedRows, rowCount: selectedRows.length };
    },
  };
  return { calls, repository, transaction };
}

test("consumes one validated nonce through the caller transaction", async () => {
  const testFixture = fixture();
  const input = claim();
  const result = await testFixture.repository.consumeNonce(
    testFixture.transaction,
    input,
  );

  assert.deepEqual(result, {
    status: "consumed",
    attestationPayloadDigest: input.attestationPayloadDigest,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(testFixture.calls.length, 1);
  assert.equal(
    testFixture.calls[0].sql,
    postgresBotReplyStagingAttestationNonceSql.consume,
  );
  assert.deepEqual(testFixture.calls[0].parameters, [
    input.policyVersion,
    input.keyId,
    input.runKey,
    input.claimVersion,
    input.requestDigest,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.expectedEvidenceVersion,
    input.receiptDigest,
    input.evidenceCoreDigest,
    input.auditKey,
    input.nonce,
    input.nonceSequence,
    input.issuedAt,
    input.signedAt,
    input.expiresAt,
    input.attestationPayloadDigest,
  ]);
  assert.equal(testFixture.calls[0].parametersFrozen, true);
  assert.equal(testFixture.calls[0].receiver, testFixture.transaction);
  assert.doesNotMatch(
    testFixture.calls[0].sql,
    /\b(?:BEGIN|COMMIT|ROLLBACK|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i,
  );
});

test("returns the exact frozen replay evidence", async () => {
  const testFixture = fixture({ status: "replayed" });
  const input = claim();
  const result = await testFixture.repository.consumeNonce(
    testFixture.transaction,
    input,
  );

  assert.deepEqual(result, {
    status: "replayed",
    nonce: input.nonce,
    receiptDigest: input.receiptDigest,
    evidenceCoreDigest: input.evidenceCoreDigest,
    expectedEvidenceVersion: input.expectedEvidenceVersion,
    attestationPayloadDigest: input.attestationPayloadDigest,
  });
  assert.equal(Object.isFrozen(result), true);
});

test("returns only a conflict when PostgreSQL returns null evidence", async () => {
  const testFixture = fixture({ status: "conflict" });
  const result = await testFixture.repository.consumeNonce(
    testFixture.transaction,
    claim(),
  );
  assert.deepEqual(result, { status: "conflict" });
  assert.equal(Object.isFrozen(result), true);
});

test("rejects malformed and forged claims before SQL", async () => {
  const valid = claim();
  const accessor = { ...valid };
  Object.defineProperty(accessor, "nonce", {
    enumerable: true,
    get() {
      return valid.nonce;
    },
  });
  const withSymbol = { ...valid };
  withSymbol[Symbol("extension")] = true;
  const withHiddenExtension = { ...valid };
  Object.defineProperty(withHiddenExtension, "extension", {
    enumerable: false,
    value: true,
  });
  const withHiddenNonce = { ...valid };
  Object.defineProperty(withHiddenNonce, "nonce", {
    enumerable: false,
    value: valid.nonce,
  });
  const invalidClaims = [
    { ...valid, extension: true },
    { ...valid, policyVersion: "invalid" },
    { ...valid, nonceSequence: 2 },
    { ...valid, nonce: `bot_reply_staging_attestation_nonce_v1_${"a".repeat(64)}` },
    { ...valid, attestationPayloadDigest: `sha256:${"b".repeat(64)}` },
    { ...valid, issuedAt: "2026-08-25T10:00:00Z" },
    { ...valid, expiresAt: "2026-08-25T10:00:30.000Z" },
    { ...valid, expectedEvidenceVersion: 2_147_483_647 },
    new Proxy(valid, {}),
    accessor,
    withSymbol,
    withHiddenExtension,
    withHiddenNonce,
  ];

  for (const invalid of invalidClaims) {
    const testFixture = fixture();
    await assert.rejects(
      testFixture.repository.consumeNonce(testFixture.transaction, invalid),
    );
    assert.equal(testFixture.calls.length, 0);
  }
});

test("rejects invalid transactions and malformed PostgreSQL results", async () => {
  const repository =
    createPostgresBotReplyStagingAttestationNonceRepository();
  await assert.rejects(
    repository.consumeNonce({}, claim()),
    /transaction is invalid/,
  );
  await assert.rejects(
    repository.consumeNonce(new Proxy({
      async query() {
        return { rows: [], rowCount: 0 };
      },
    }, {}), claim()),
    /transaction is invalid/,
  );

  let queryGetterReads = 0;
  const queryAccessor = {};
  Object.defineProperty(queryAccessor, "query", {
    enumerable: true,
    get() {
      queryGetterReads += 1;
      return async () => ({ rows: [], rowCount: 0 });
    },
  });
  const nonenumerableQuery = {};
  Object.defineProperty(nonenumerableQuery, "query", {
    enumerable: false,
    value: async () => ({ rows: [], rowCount: 0 }),
  });
  const transactionWithSymbol = {
    async query() {
      return { rows: [], rowCount: 0 };
    },
  };
  transactionWithSymbol[Symbol("extension")] = true;
  const proxiedQuery = {
    query: new Proxy(
      async () => ({ rows: [], rowCount: 0 }),
      {},
    ),
  };
  for (const invalidTransaction of [
    queryAccessor,
    nonenumerableQuery,
    transactionWithSymbol,
    proxiedQuery,
  ]) {
    await assert.rejects(
      repository.consumeNonce(invalidTransaction, claim()),
      /transaction is invalid/,
    );
  }
  assert.equal(queryGetterReads, 0);

  const valid = claim();
  const rowAccessor = resultRow(valid);
  Object.defineProperty(rowAccessor, "nonce", {
    enumerable: true,
    get() {
      return valid.nonce;
    },
  });
  const rowWithSymbol = resultRow(valid);
  rowWithSymbol[Symbol("extension")] = true;
  const rowWithNonenumerableKey = resultRow(valid);
  Object.defineProperty(rowWithNonenumerableKey, "nonce", {
    enumerable: false,
    value: valid.nonce,
  });
  const malformedCases = [
    [],
    [resultRow(valid), resultRow(valid)],
    [{ ...resultRow(valid), extension: true }],
    [new Proxy(resultRow(valid), {})],
    [rowAccessor],
    [rowWithSymbol],
    [rowWithNonenumerableKey],
    [{ ...resultRow(valid), resultStatus: "unknown" }],
    [{ ...resultRow(valid), nonce: `bot_reply_staging_attestation_nonce_v1_${"f".repeat(64)}` }],
    [{ ...resultRow(valid, "conflict"), receiptDigest: valid.receiptDigest }],
  ];
  for (const rows of malformedCases) {
    const testFixture = fixture({ rows });
    await assert.rejects(
      testFixture.repository.consumeNonce(
        testFixture.transaction,
        valid,
      ),
    );
  }

  const proxiedRowsFixture = fixture({
    rows: new Proxy([resultRow(valid)], {}),
  });
  await assert.rejects(
    proxiedRowsFixture.repository.consumeNonce(
      proxiedRowsFixture.transaction,
      valid,
    ),
    /invalid nonce rows/,
  );

  let resultGetterReads = 0;
  const resultAccessor = { rowCount: 1 };
  Object.defineProperty(resultAccessor, "rows", {
    enumerable: true,
    get() {
      resultGetterReads += 1;
      return [resultRow(valid)];
    },
  });
  const resultWithSymbol = {
    rows: [resultRow(valid)],
    rowCount: 1,
  };
  resultWithSymbol[Symbol("extension")] = true;
  const resultWithHiddenRowCount = {
    rows: [resultRow(valid)],
  };
  Object.defineProperty(resultWithHiddenRowCount, "rowCount", {
    enumerable: false,
    value: 1,
  });
  const indexAccessorRows = [];
  Object.defineProperty(indexAccessorRows, "0", {
    enumerable: true,
    get() {
      return resultRow(valid);
    },
  });
  const rowsWithSymbol = [resultRow(valid)];
  rowsWithSymbol[Symbol("extension")] = true;
  const rowsWithHiddenIndex = [];
  Object.defineProperty(rowsWithHiddenIndex, "0", {
    enumerable: false,
    value: resultRow(valid),
  });

  const malformedResults = [
    new Proxy({ rows: [resultRow(valid)], rowCount: 1 }, {}),
    resultAccessor,
    resultWithSymbol,
    resultWithHiddenRowCount,
    { rows: [resultRow(valid)], rowCount: 1, extension: true },
    { rows: indexAccessorRows, rowCount: 1 },
    { rows: rowsWithSymbol, rowCount: 1 },
    { rows: new Array(1), rowCount: 1 },
    { rows: rowsWithHiddenIndex, rowCount: 1 },
  ];
  for (const malformedResult of malformedResults) {
    await assert.rejects(
      repository.consumeNonce({
        async query() {
          return malformedResult;
        },
      }, valid),
    );
  }
  assert.equal(resultGetterReads, 0);
});
