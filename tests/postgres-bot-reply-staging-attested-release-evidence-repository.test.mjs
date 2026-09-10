import assert from "node:assert/strict";
import {
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationKeyId,
  deriveBotReplyStagingReceiptAttestationNonce,
  serializeBotReplyStagingReceiptAttestationPayload,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createPostgresBotReplyStagingAttestedReleaseEvidenceRepository,
  deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey,
  postgresBotReplyStagingAttestedReleaseEvidenceSql,
  RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
} from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts";
import {
  assembleRailwayBotReplyStagingAttestedReleaseEvidence,
  createRailwayBotReplyStagingAttestedReleaseEvidenceCore,
  deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest,
  railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
  railwayBotReplyStagingAttestedReleaseEvidenceCheckIds,
  serializeRailwayBotReplyStagingAttestedReleaseEvidence,
} from "../server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";

// Published RFC 8032 test vector 1. This deterministic key is tests-only.
const rfc8032PrivateSeed =
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const privateKey = createPrivateKey({
  key: Buffer.from(
    `302e020100300506032b657004220420${rfc8032PrivateSeed}`,
    "hex",
  ),
  format: "der",
  type: "pkcs8",
});
const publicKeySpkiBase64Url = createPublicKey(privateKey)
  .export({ format: "der", type: "spki" })
  .toString("base64url");
const keyId = deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url,
);
// Published RFC 8032 test vector 2 supplies a distinct trusted identity.
const secondaryPrivateKey = createPrivateKey({
  key: Buffer.from(
    "302e020100300506032b657004220420" +
      "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",
    "hex",
  ),
  format: "der",
  type: "pkcs8",
});
const secondaryPublicKeySpkiBase64Url = createPublicKey(secondaryPrivateKey)
  .export({ format: "der", type: "spki" })
  .toString("base64url");
const secondaryKeyId = deriveBotReplyStagingReceiptAttestationKeyId(
  secondaryPublicKeySpkiBase64Url,
);
const verifiedAt = "2026-08-25T10:00:00.000Z";
const expiresAt = "2026-08-25T10:05:00.000Z";
const releaseId = `connect_release_v1_${"1".repeat(64)}`;
const commitSha = "2".repeat(40);
const artifactDigest = `sha256:${"3".repeat(64)}`;
const runKey = `bot_reply_staging_run_v1_${"4".repeat(64)}`;
const requestDigest = `sha256:${"5".repeat(64)}`;
const attestationAuditKey =
  `bot_reply_staging_attestation_audit_v1_${"6".repeat(64)}`;
const idempotencyKey = `connect_idempotency_v1_${"7".repeat(64)}`;
const actorExternalUserId = "system-admin-primary";
const expectedV1Digest =
  `bot_reply_staging_cross_service_evidence_v1_${"8".repeat(64)}`;

const repositoryClock = Object.freeze({
  now: () => new Date("2026-08-25T10:01:00.000Z"),
});

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    runKey,
    releaseId,
    commitSha,
    artifactDigest,
    scenarioCount: 7,
    status: "passed",
    ...overrides,
  };
}

function readyReport() {
  return {
    schemaVersion: 1,
    activationVersion:
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
    status: "ready",
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
    passedCheckCount: 4,
    requiredCheckCount: 4,
    checks: railwayBotReplyStagingAttestedReleaseEvidenceCheckIds.map(
      (id) => ({ id, status: "passed" }),
    ),
  };
}

function createCore(expectedEvidenceVersion = 0) {
  return createRailwayBotReplyStagingAttestedReleaseEvidenceCore({
    report: readyReport(),
    receipt: receipt(),
    releaseId,
    commitSha,
    artifactDigest,
    runKey,
    claimVersion: 11,
    requestDigest,
    expectedEvidenceVersion,
    attestationAuditKey,
    lifetimeSeconds: 300,
  }, { now: () => new Date(verifiedAt) });
}

function createAttestation(core, signatureMutator = (value) => value) {
  const unsignedWithoutNonce = {
    schemaVersion: 1,
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    keyId,
    runKey: core.runKey,
    claimVersion: core.claimVersion,
    requestDigest: core.requestDigest,
    releaseId: core.releaseId,
    commitSha: core.commitSha,
    artifactDigest: core.artifactDigest,
    expectedEvidenceVersion: core.expectedEvidenceVersion,
    receiptDigest: core.receiptDigest,
    evidenceCoreDigest:
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core),
    auditKey: core.attestationAuditKey,
    nonceSequence: core.claimVersion,
    issuedAt: core.verifiedAt,
    signedAt: core.verifiedAt,
    expiresAt: core.expiresAt,
  };
  const nonce = deriveBotReplyStagingReceiptAttestationNonce(
    unsignedWithoutNonce,
  );
  const unsigned = { ...unsignedWithoutNonce, nonce };
  const signature = sign(
    null,
    serializeBotReplyStagingReceiptAttestationPayload(unsigned),
    privateKey,
  ).toString("base64url");
  return {
    ...unsigned,
    signature: `ed25519:${signatureMutator(signature)}`,
  };
}

function issued(expectedEvidenceVersion = 0, signatureMutator) {
  const core = createCore(expectedEvidenceVersion);
  return assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: createAttestation(core, signatureMutator),
  });
}

function expected(expectedEvidenceVersion = 0, overrides = {}) {
  return {
    trustedKeyId: keyId,
    releaseId,
    commitSha,
    artifactDigest,
    runKey,
    claimVersion: 11,
    requestDigest,
    expectedEvidenceVersion,
    attestationAuditKey,
    ...overrides,
  };
}

function trustedKeys() {
  return [
    {
      keyId,
      publicKeySpkiBase64Url,
      validFrom: "2026-08-01T00:00:00.000Z",
      validUntil: "2026-09-01T00:00:00.000Z",
    },
    {
      keyId: secondaryKeyId,
      publicKeySpkiBase64Url: secondaryPublicKeySpkiBase64Url,
      validFrom: "2026-08-01T00:00:00.000Z",
      validUntil: "2026-09-01T00:00:00.000Z",
    },
  ];
}

function command({
  expectedEvidenceVersion = 0,
  expectedEvidenceDigest = expectedEvidenceVersion === 0
    ? null
    : expectedV1Digest,
  evidence = issued(expectedEvidenceVersion),
  ...overrides
} = {}) {
  return {
    evidence,
    receipt: receipt(),
    expected: expected(expectedEvidenceVersion),
    expectedEvidenceDigest,
    actorExternalUserId,
    idempotencyKey,
    ...overrides,
  };
}

function conflictRow() {
  return {
    resultStatus: "conflict",
    nonceStatus: null,
    nonce: null,
    receiptDigest: null,
    evidenceCoreDigest: null,
    attestationPayloadDigest: null,
    eventKey: null,
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    operationId: null,
    idempotencyKey: null,
    actorExternalUserId: null,
    expectedVersion: null,
    expectedEvidenceDigest: null,
    publishedVersion: null,
    evidenceDigest: null,
    evidenceExpiresAt: null,
    occurredAt: null,
  };
}

function successRow(parameters, resultStatus = "stored") {
  return {
    resultStatus,
    nonceStatus: resultStatus === "stored" ? "consumed" : "replayed",
    nonce: parameters[12],
    receiptDigest: parameters[9],
    evidenceCoreDigest: parameters[10],
    attestationPayloadDigest: parameters[17],
    eventKey: parameters[18],
    releaseId: parameters[5],
    commitSha: parameters[6],
    artifactDigest: parameters[7],
    operationId:
      RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    idempotencyKey: parameters[19],
    actorExternalUserId: parameters[20],
    expectedVersion: parameters[8],
    expectedEvidenceDigest: parameters[21],
    publishedVersion: parameters[8] + 1,
    evidenceDigest: parameters[22],
    evidenceExpiresAt: parameters[25],
    occurredAt: parameters[24],
  };
}

function fixture({
  rowFactory = (parameters) => successRow(parameters),
  resultFactory = null,
  transactionFactory = null,
} = {}) {
  const calls = [];
  const manager = {
    async transaction(options, execute) {
      calls.push({ kind: "transaction", options, receiver: this });
      if (transactionFactory !== null) {
        return transactionFactory({ options, execute, calls });
      }
      const databaseTransaction = {
        async query(sql, parameters) {
          calls.push({
            kind: "query",
            sql,
            parameters,
            parametersFrozen: Object.isFrozen(parameters),
            receiver: this,
          });
          if (resultFactory !== null) return resultFactory(parameters);
          const rows = [rowFactory(parameters)];
          return { rows, rowCount: rows.length };
        },
      };
      return execute(databaseTransaction);
    },
  };
  const repository =
    createPostgresBotReplyStagingAttestedReleaseEvidenceRepository(
      manager,
      trustedKeys(),
      repositoryClock,
    );
  return { calls, manager, repository };
}

test("publishes verified v2 evidence through one atomic 26-argument SELECT", async () => {
  const testFixture = fixture();
  const input = command();
  const result = await testFixture.repository.publishAttestedEvidence(input);

  assert.equal(result.status, "stored");
  assert.equal(result.nonceStatus, "consumed");
  assert.equal(result.version, 1);
  assert.equal(result.replayProtected, true);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.event));
  assert.ok(Object.isFrozen(result.event.release));

  const transactions = testFixture.calls.filter(
    (call) => call.kind === "transaction",
  );
  const queries = testFixture.calls.filter((call) => call.kind === "query");
  assert.equal(transactions.length, 1);
  assert.deepEqual(transactions[0].options, {
    isolationLevel: "read-committed",
  });
  assert.equal(transactions[0].receiver, testFixture.manager);
  assert.equal(queries.length, 1);
  assert.equal(
    queries[0].sql,
    postgresBotReplyStagingAttestedReleaseEvidenceSql.publishWithAudit,
  );
  assert.match(
    queries[0].sql,
    /FROM public\.publish_bot_reply_staging_attested_evidence_with_audit\(/,
  );
  assert.doesNotMatch(
    queries[0].sql,
    /\b(?:INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK)\b/i,
  );
  assert.equal(queries[0].parameters.length, 26);
  assert.equal(queries[0].parametersFrozen, true);
  assert.notEqual(queries[0].receiver, testFixture.manager);

  const evidence = input.evidence;
  const expectedEventKey =
    deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey({
      release: { releaseId, commitSha, artifactDigest },
      operationId:
        RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
      idempotencyKey,
      actorExternalUserId,
      expectedVersion: 0,
      expectedEvidenceDigest: null,
      publishedVersion: 1,
      evidenceDigest: evidence.evidenceDigest,
      evidenceExpiresAt: expiresAt,
      occurredAt: verifiedAt,
    });
  assert.deepEqual(queries[0].parameters, [
    evidence.attestation.policyVersion,
    evidence.attestation.keyId,
    runKey,
    11,
    requestDigest,
    releaseId,
    commitSha,
    artifactDigest,
    0,
    evidence.core.receiptDigest,
    evidence.evidenceCoreDigest,
    attestationAuditKey,
    evidence.attestation.nonce,
    11,
    verifiedAt,
    verifiedAt,
    expiresAt,
    evidence.attestationPayloadDigest,
    expectedEventKey,
    idempotencyKey,
    actorExternalUserId,
    null,
    evidence.evidenceDigest,
    serializeRailwayBotReplyStagingAttestedReleaseEvidence(evidence),
    verifiedAt,
    expiresAt,
  ]);
  assert.equal(result.event.eventKey, expectedEventKey);
});

test("preserves the existing v1 operator-event byte contract locally", () => {
  assert.equal(
    deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey({
      release: {
        releaseId: `connect_release_v1_${"a".repeat(64)}`,
        commitSha: "b".repeat(40),
        artifactDigest: `sha256:${"c".repeat(64)}`,
      },
      operationId:
        RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
      idempotencyKey: `connect_idempotency_v1_${"d".repeat(64)}`,
      actorExternalUserId: "operator",
      expectedVersion: 0,
      expectedEvidenceDigest: null,
      publishedVersion: 1,
      evidenceDigest:
        `bot_reply_staging_cross_service_evidence_v2_${"e".repeat(64)}`,
      evidenceExpiresAt: "2026-08-25T10:05:00.000Z",
      occurredAt: "2026-08-25T10:00:00.000Z",
    }),
    "bot_reply_staging_release_evidence_operator_event_v1_" +
      "0672643fd785cb535b0eb216ad7c990ad9d30ea880f264a5ea7562ff4fbf85ce",
  );
});

test("returns bounded signature and binding blocks before any transaction", async () => {
  const valid = issued();
  const invalidSignature = issued(0, (signature) =>
    `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`);
  for (const [input, expectedCode, expectedAttestationCode] of [
    [
      command({ evidence: invalidSignature }),
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_ATTESTATION_REJECTED",
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_INVALID",
    ],
    [
      command({ expected: expected(0, { runKey: `bot_reply_staging_run_v1_${"9".repeat(64)}` }) }),
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
      null,
    ],
    [
      command({ expected: expected(0, { trustedKeyId: secondaryKeyId }) }),
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
      null,
    ],
    [
      command({ evidence: valid, receipt: receipt({ scenarioCount: 8 }) }),
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
      null,
    ],
  ]) {
    const testFixture = fixture();
    const result = await testFixture.repository.publishAttestedEvidence(input);
    assert.equal(result.status, "blocked");
    assert.equal(result.code, expectedCode);
    assert.equal(result.attestationCode, expectedAttestationCode);
    assert.equal(result.evidence, null);
    assert.equal(result.replayProtected, false);
    assert.equal(testFixture.calls.length, 0);
  }
});

test("passes an existing v1 digest for a versioned v2 compare-and-set", async () => {
  const testFixture = fixture();
  const result = await testFixture.repository.publishAttestedEvidence(
    command({ expectedEvidenceVersion: 1 }),
  );
  assert.equal(result.status, "stored");
  const query = testFixture.calls.find((call) => call.kind === "query");
  assert.equal(query.parameters[8], 1);
  assert.equal(query.parameters[21], expectedV1Digest);
  assert.equal(result.version, 2);
  assert.equal(result.event.expectedEvidenceDigest, expectedV1Digest);
});

test("accepts only exact stored/consumed and replayed/replayed pairs", async () => {
  for (const [resultStatus, expectedNonceStatus] of [
    ["stored", "consumed"],
    ["replayed", "replayed"],
  ]) {
    const testFixture = fixture({
      rowFactory: (parameters) => successRow(parameters, resultStatus),
    });
    const result = await testFixture.repository.publishAttestedEvidence(
      command(),
    );
    assert.equal(result.status, resultStatus);
    assert.equal(result.nonceStatus, expectedNonceStatus);
    assert.equal(result.replayProtected, true);
  }

  for (const [resultStatus, nonceStatus] of [
    ["stored", "replayed"],
    ["replayed", "consumed"],
    ["stored", null],
    ["unknown", "consumed"],
  ]) {
    const testFixture = fixture({
      rowFactory(parameters) {
        return { ...successRow(parameters), resultStatus, nonceStatus };
      },
    });
    await assert.rejects(
      testFixture.repository.publishAttestedEvidence(command()),
      /invalid attested publish pairing/,
    );
  }
});

test("returns only an exact 18-null atomic conflict", async () => {
  const testFixture = fixture({ rowFactory: () => conflictRow() });
  assert.deepEqual(
    await testFixture.repository.publishAttestedEvidence(command()),
    {
      status: "conflict",
      nonceStatus: null,
      version: null,
      event: null,
      replayProtected: false,
    },
  );

  for (const key of [
    "nonceStatus",
    "nonce",
    "receiptDigest",
    "eventKey",
    "publishedVersion",
    "occurredAt",
  ]) {
    const invalid = { ...conflictRow(), [key]: "unexpected" };
    const invalidFixture = fixture({ rowFactory: () => invalid });
    await assert.rejects(
      invalidFixture.repository.publishAttestedEvidence(command()),
      /invalid attested conflict/,
    );
  }
});

test("rejects mismatched and malformed PostgreSQL readback", async () => {
  const mismatches = [
    (row) => ({ ...row, nonce: `bot_reply_staging_attestation_nonce_v1_${"a".repeat(64)}` }),
    (row) => ({ ...row, receiptDigest: `sha256:${"b".repeat(64)}` }),
    (row) => ({ ...row, eventKey: `bot_reply_staging_release_evidence_operator_event_v1_${"c".repeat(64)}` }),
    (row) => ({ ...row, actorExternalUserId: "different-actor" }),
    (row) => ({ ...row, publishedVersion: 2 }),
    (row) => ({ ...row, evidenceExpiresAt: "2026-08-25T10:06:00.000Z" }),
  ];
  for (const mutate of mismatches) {
    const testFixture = fixture({
      rowFactory: (parameters) => mutate(successRow(parameters)),
    });
    await assert.rejects(
      testFixture.repository.publishAttestedEvidence(command()),
      /mismatched attested publish evidence|invalid attested operator key/,
    );
  }

  const valid = successRow(new Array(26).fill(null));
  const rowAccessor = { ...valid };
  let rowGetterReads = 0;
  Object.defineProperty(rowAccessor, "nonce", {
    enumerable: true,
    get() {
      rowGetterReads += 1;
      return valid.nonce;
    },
  });
  const rowWithSymbol = { ...valid };
  rowWithSymbol[Symbol("extension")] = true;
  const rowWithHiddenKey = { ...valid };
  Object.defineProperty(rowWithHiddenKey, "nonce", {
    enumerable: false,
    value: valid.nonce,
  });
  for (const rows of [
    [],
    [valid, valid],
    [{ ...valid, extension: true }],
    [new Proxy(valid, {})],
    [rowAccessor],
    [rowWithSymbol],
    [rowWithHiddenKey],
  ]) {
    const testFixture = fixture({
      resultFactory: () => ({ rows, rowCount: rows.length }),
    });
    await assert.rejects(
      testFixture.repository.publishAttestedEvidence(command()),
    );
  }
  assert.equal(rowGetterReads, 0);

  let rowsGetterReads = 0;
  const resultAccessor = { rowCount: 1 };
  Object.defineProperty(resultAccessor, "rows", {
    enumerable: true,
    get() {
      rowsGetterReads += 1;
      return [valid];
    },
  });
  const resultWithSymbol = { rows: [valid], rowCount: 1 };
  resultWithSymbol[Symbol("extension")] = true;
  const rowsWithAccessor = [];
  Object.defineProperty(rowsWithAccessor, "0", {
    enumerable: true,
    get() {
      return valid;
    },
  });
  for (const result of [
    new Proxy({ rows: [valid], rowCount: 1 }, {}),
    resultAccessor,
    resultWithSymbol,
    { rows: new Proxy([valid], {}), rowCount: 1 },
    { rows: rowsWithAccessor, rowCount: 1 },
    { rows: new Array(1), rowCount: 1 },
  ]) {
    const testFixture = fixture({ resultFactory: () => result });
    await assert.rejects(
      testFixture.repository.publishAttestedEvidence(command()),
    );
  }
  assert.equal(rowsGetterReads, 0);
});

test("blocks proxy, accessor, symbol and inconsistent command input with zero SQL", async () => {
  const valid = command();
  const unpinnedExpected = Object.fromEntries(
    Object.entries(valid.expected).filter(([field]) =>
      field !== "trustedKeyId"),
  );
  let commandGetterReads = 0;
  const commandAccessor = { ...valid };
  Object.defineProperty(commandAccessor, "evidence", {
    enumerable: true,
    get() {
      commandGetterReads += 1;
      return valid.evidence;
    },
  });
  const commandWithSymbol = { ...valid };
  commandWithSymbol[Symbol("extension")] = true;
  const expectedAccessor = { ...valid.expected };
  Object.defineProperty(expectedAccessor, "runKey", {
    enumerable: true,
    get() {
      commandGetterReads += 1;
      return runKey;
    },
  });
  const expectedWithSymbol = { ...valid.expected };
  expectedWithSymbol[Symbol("extension")] = true;
  for (const invalid of [
    new Proxy(valid, {}),
    commandAccessor,
    commandWithSymbol,
    { ...valid, extension: true },
    { ...valid, expected: new Proxy(valid.expected, {}) },
    { ...valid, expected: unpinnedExpected },
    { ...valid, expected: expectedAccessor },
    { ...valid, expected: expectedWithSymbol },
    { ...valid, expectedEvidenceDigest: expectedV1Digest },
    {
      ...command({ expectedEvidenceVersion: 1 }),
      expectedEvidenceDigest: null,
    },
    { ...valid, actorExternalUserId: " actor " },
    { ...valid, idempotencyKey: "invalid" },
    { ...valid, evidence: new Proxy(valid.evidence, {}) },
  ]) {
    const testFixture = fixture();
    const result = await testFixture.repository.publishAttestedEvidence(
      invalid,
    );
    assert.equal(result.status, "blocked");
    assert.equal(
      result.code,
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID",
    );
    assert.equal(testFixture.calls.length, 0);
  }
  assert.equal(commandGetterReads, 0);
});

test("preserves the query receiver and rejects unsafe transaction executors", async () => {
  let databaseTransaction;
  const testFixture = fixture({
    transactionFactory: async ({ execute, calls }) => {
      databaseTransaction = {
        async query(sql, parameters) {
          assert.equal(this, databaseTransaction);
          calls.push({ kind: "query", sql, parameters, receiver: this });
          return { rows: [successRow(parameters)], rowCount: 1 };
        },
      };
      return execute(databaseTransaction);
    },
  });
  assert.equal(
    (await testFixture.repository.publishAttestedEvidence(command())).status,
    "stored",
  );
  assert.equal(
    testFixture.calls.find((call) => call.kind === "query").receiver,
    databaseTransaction,
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
  const queryWithSymbol = {
    async query() {
      return { rows: [], rowCount: 0 };
    },
  };
  queryWithSymbol[Symbol("extension")] = true;
  for (const invalidTransaction of [
    new Proxy({
      async query() {
        return { rows: [], rowCount: 0 };
      },
    }, {}),
    queryAccessor,
    queryWithSymbol,
    {
      query: new Proxy(
        async () => ({ rows: [], rowCount: 0 }),
        {},
      ),
    },
  ]) {
    const invalidFixture = fixture({
      transactionFactory: ({ execute }) => execute(invalidTransaction),
    });
    await assert.rejects(
      invalidFixture.repository.publishAttestedEvidence(command()),
      /transaction is invalid/,
    );
  }
  assert.equal(queryGetterReads, 0);
});

test("requires the manager to return the one callback result unchanged", async () => {
  const skipped = fixture({
    transactionFactory: async () => ({ status: "stored" }),
  });
  await assert.rejects(
    skipped.repository.publishAttestedEvidence(command()),
    /invalid attested transaction result/,
  );

  const replaced = fixture({
    transactionFactory: async ({ execute }) => {
      await execute({
        async query(_sql, parameters) {
          return { rows: [successRow(parameters)], rowCount: 1 };
        },
      });
      return Object.freeze({ status: "stored" });
    },
  });
  await assert.rejects(
    replaced.repository.publishAttestedEvidence(command()),
    /invalid attested transaction result/,
  );

  const repeated = fixture({
    transactionFactory: async ({ execute }) => {
      const transaction = {
        async query(_sql, parameters) {
          return { rows: [successRow(parameters)], rowCount: 1 };
        },
      };
      await execute(transaction);
      return execute(transaction);
    },
  });
  await assert.rejects(
    repeated.repository.publishAttestedEvidence(command()),
    /invoked the attested publish transaction twice/,
  );
});

test("rejects unsafe factory dependencies without invoking accessors", () => {
  let dependencyGetterReads = 0;
  const transactionAccessor = {};
  Object.defineProperty(transactionAccessor, "transaction", {
    enumerable: true,
    get() {
      dependencyGetterReads += 1;
      return async () => null;
    },
  });
  const clockAccessor = {};
  Object.defineProperty(clockAccessor, "now", {
    enumerable: true,
    get() {
      dependencyGetterReads += 1;
      return () => new Date(verifiedAt);
    },
  });
  const keyAccessor = { ...trustedKeys()[0] };
  Object.defineProperty(keyAccessor, "keyId", {
    enumerable: true,
    get() {
      dependencyGetterReads += 1;
      return keyId;
    },
  });
  const validManager = {
    async transaction() {
      return null;
    },
  };
  for (const [manager, keys, clock] of [
    [new Proxy(validManager, {}), trustedKeys(), repositoryClock],
    [transactionAccessor, trustedKeys(), repositoryClock],
    [validManager, new Proxy(trustedKeys(), {}), repositoryClock],
    [validManager, [keyAccessor], repositoryClock],
    [validManager, trustedKeys(), new Proxy(repositoryClock, {})],
    [validManager, trustedKeys(), clockAccessor],
  ]) {
    assert.throws(() =>
      createPostgresBotReplyStagingAttestedReleaseEvidenceRepository(
        manager,
        keys,
        clock,
      ));
  }
  assert.equal(dependencyGetterReads, 0);
});

test("stays dependency-closed from the untracked legacy operator chain", async () => {
  const source = await readFile(new URL(
    "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts",
    import.meta.url,
  ), "utf8");
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*postgresBotReplyStagingReleaseEvidenceOperatorRepository\.ts["']/,
  );
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*railwayBotReplyStagingCrossServiceEvidence\.ts["']/,
  );
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
});
