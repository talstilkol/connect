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
  deriveBotReplyStagingReceiptDigest,
  serializeBotReplyStagingReceiptAttestationPayload,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey,
} from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts";
import {
  createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository,
  postgresBotReplyStagingAttestedReleaseEvidenceReadSql,
} from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";
import {
  assembleRailwayBotReplyStagingAttestedReleaseEvidence,
  createRailwayBotReplyStagingAttestedReleaseEvidenceCore,
  deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest,
  railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
  railwayBotReplyStagingAttestedReleaseEvidenceCheckIds,
  railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
  serializeRailwayBotReplyStagingAttestedReleaseEvidence,
} from "../server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";

// Published RFC 8032 test vector 1. This deterministic key is tests-only.
const privateKey = createPrivateKey({
  key: Buffer.from(
    "302e020100300506032b657004220420" +
      "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
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

// Published RFC 8032 test vector 2 supplies a distinct pinned identity.
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

const releaseId = `connect_release_v1_${"1".repeat(64)}`;
const commitSha = "2".repeat(40);
const artifactDigest = `sha256:${"3".repeat(64)}`;
const runKey = `bot_reply_staging_run_v1_${"4".repeat(64)}`;
const requestDigest = `sha256:${"5".repeat(64)}`;
const attestationAuditKey =
  `bot_reply_staging_attestation_audit_v1_${"6".repeat(64)}`;
const idempotencyKey = `connect_idempotency_v1_${"7".repeat(64)}`;
const expectedEvidenceDigest =
  `bot_reply_staging_cross_service_evidence_v1_${"8".repeat(64)}`;
const actorExternalUserId = "system-admin-primary";
const claimVersion = 11;
const expectedEvidenceVersion = 1;
const evidenceVersion = 2;
const verifiedAt = "2026-08-25T10:00:00.000Z";
const expiresAt = "2026-08-25T10:05:00.000Z";
const completedAt = "2026-08-25T09:59:59.000Z";
const consumedAt = "2026-08-25T10:00:01.000Z";
const databaseNow = "2026-08-25T10:01:00.000Z";
const publishOperation =
  "system-admin.bot-reply-staging.release-evidence.publish";

const exactOutputKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "evidenceDigest",
  "evidencePolicyVersion",
  "evidenceSchemaVersion",
  "evidenceVersion",
  "expiresAt",
  "releaseId",
  "replayProtected",
  "status",
  "storageMode",
  "verifiedAt",
]);

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

function createEvidence() {
  const core = createRailwayBotReplyStagingAttestedReleaseEvidenceCore({
    report: readyReport(),
    receipt: receipt(),
    releaseId,
    commitSha,
    artifactDigest,
    runKey,
    claimVersion,
    requestDigest,
    expectedEvidenceVersion,
    attestationAuditKey,
    lifetimeSeconds: 300,
  }, { now: () => new Date(verifiedAt) });
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
  return assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: {
      ...unsigned,
      signature: `ed25519:${signature}`,
    },
  });
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

function releaseIdentity(overrides = {}) {
  return {
    releaseId,
    commitSha,
    artifactDigest,
    ...overrides,
  };
}

function deriveEventKey(fields) {
  return deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey({
    release: {
      releaseId: fields.eventReleaseId,
      commitSha: fields.eventCommitSha,
      artifactDigest: fields.eventArtifactDigest,
    },
    operationId: fields.eventOperationId,
    idempotencyKey: fields.eventIdempotencyKey,
    actorExternalUserId: fields.eventActorExternalUserId,
    expectedVersion: fields.eventExpectedVersion,
    expectedEvidenceDigest: fields.eventExpectedEvidenceDigest,
    publishedVersion: fields.eventPublishedVersion,
    evidenceDigest: fields.eventEvidenceDigest,
    evidenceExpiresAt: fields.eventEvidenceExpiresAt,
    occurredAt: fields.eventOccurredAt,
  });
}

function validRow(overrides = {}) {
  const evidence = createEvidence();
  const row = {
    releaseId,
    commitSha,
    artifactDigest,
    evidenceVersion,
    evidenceDigest: evidence.evidenceDigest,
    evidenceJson:
      serializeRailwayBotReplyStagingAttestedReleaseEvidence(evidence),
    evidenceVerifiedAt: verifiedAt,
    evidenceExpiresAt: expiresAt,
    runStatus: "completed",
    runRunKey: runKey,
    runClaimVersion: claimVersion,
    runRequestDigest: requestDigest,
    runReleaseId: releaseId,
    runCommitSha: commitSha,
    runArtifactDigest: artifactDigest,
    runReceiptJson: JSON.stringify(receipt()),
    runReceiptDigest: deriveBotReplyStagingReceiptDigest(receipt()),
    runCompletedAt: completedAt,
    noncePolicyVersion: evidence.attestation.policyVersion,
    nonceKeyId: keyId,
    nonceRunKey: runKey,
    nonceClaimVersion: claimVersion,
    nonceRequestDigest: requestDigest,
    nonceReleaseId: releaseId,
    nonceCommitSha: commitSha,
    nonceArtifactDigest: artifactDigest,
    nonceExpectedEvidenceVersion: expectedEvidenceVersion,
    nonceReceiptDigest: evidence.core.receiptDigest,
    nonceEvidenceCoreDigest: evidence.evidenceCoreDigest,
    nonceAuditKey: attestationAuditKey,
    nonceNonce: evidence.attestation.nonce,
    nonceSequence: claimVersion,
    nonceIssuedAt: verifiedAt,
    nonceSignedAt: verifiedAt,
    nonceExpiresAt: expiresAt,
    nonceAttestationPayloadDigest: evidence.attestationPayloadDigest,
    nonceConsumedAt: consumedAt,
    eventKey: "",
    eventReleaseId: releaseId,
    eventCommitSha: commitSha,
    eventArtifactDigest: artifactDigest,
    eventOperationId: publishOperation,
    eventIdempotencyKey: idempotencyKey,
    eventActorExternalUserId: actorExternalUserId,
    eventExpectedVersion: expectedEvidenceVersion,
    eventExpectedEvidenceDigest: expectedEvidenceDigest,
    eventPublishedVersion: evidenceVersion,
    eventEvidenceDigest: evidence.evidenceDigest,
    eventEvidenceExpiresAt: expiresAt,
    eventOccurredAt: verifiedAt,
    databaseNow,
  };
  row.eventKey = deriveEventKey(row);
  return { ...row, ...overrides };
}

function unavailableResult() {
  return {
    status: "unavailable",
    storageMode: "postgresql",
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    evidenceSchemaVersion: null,
    evidencePolicyVersion: null,
    evidenceVersion: null,
    evidenceDigest: null,
    verifiedAt: null,
    expiresAt: null,
    replayProtected: false,
  };
}

function queryFixture({
  rows = [validRow()],
  rowCount = rows.length,
  selectedKeyId = keyId,
  keys = trustedKeys(),
  identity = releaseIdentity(),
  queryImplementation,
} = {}) {
  const calls = [];
  let receiverMatched = false;
  const queries = {
    async query(sql, parameters) {
      receiverMatched = this === queries;
      calls.push({ sql, parameters });
      if (queryImplementation !== undefined) {
        return queryImplementation.call(this, sql, parameters);
      }
      return { rows, rowCount };
    },
  };
  const repository =
    createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository(
      queries,
      identity,
      selectedKeyId,
      keys,
    );
  return {
    calls,
    queries,
    repository,
    receiverMatched: () => receiverMatched,
  };
}

async function expectUnavailable(options) {
  const fixture = queryFixture(options);
  const result = await fixture.repository.readVerified();
  assert.deepEqual(result, unavailableResult());
  assert.deepEqual(Object.keys(result).sort(), exactOutputKeys);
  assert.ok(Object.isFrozen(result));
  assert.equal(fixture.calls.length, 1);
}

test("returns one bounded v2 replay-protected proof from one read-only SELECT", async () => {
  const row = validRow();
  const fixture = queryFixture({ rows: [row] });

  const result = await fixture.repository.readVerified();

  assert.deepEqual(result, {
    status: "verified",
    storageMode: "postgresql",
    releaseId,
    commitSha,
    artifactDigest,
    evidenceSchemaVersion: 2,
    evidencePolicyVersion:
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
    evidenceVersion,
    evidenceDigest: row.evidenceDigest,
    verifiedAt,
    expiresAt,
    replayProtected: true,
  });
  assert.deepEqual(Object.keys(result).sort(), exactOutputKeys);
  assert.ok(Object.isFrozen(result));
  assert.equal(fixture.calls.length, 1);
  assert.equal(
    fixture.calls[0].sql,
    postgresBotReplyStagingAttestedReleaseEvidenceReadSql.readVerified,
  );
  assert.deepEqual(fixture.calls[0].parameters, [
    releaseId,
    commitSha,
    artifactDigest,
  ]);
  assert.ok(Object.isFrozen(fixture.calls[0].parameters));
  assert.equal(fixture.receiverMatched(), true);

  const sql = fixture.calls[0].sql;
  assert.match(sql, /^\s*SELECT\b/i);
  assert.match(sql, /public\.bot_reply_staging_release_evidence\b/);
  assert.match(sql, /public\.bot_reply_staging_runs\b/);
  assert.match(sql, /public\.bot_reply_staging_attestation_nonces\b/);
  assert.match(
    sql,
    /public\.bot_reply_staging_release_evidence_operator_events\b/,
  );
  assert.match(sql, /pg_catalog\.clock_timestamp\(\)/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|CALL)\b/i);
  assert.doesNotMatch(
    sql,
    /publish_bot_reply_staging_attested_evidence_with_audit/i,
  );

  const publicPayload = JSON.stringify(result);
  assert.doesNotMatch(
    publicPayload,
    /receipt|actor|tenant|runKey|nonce|eventKey|evidenceJson/i,
  );
});

test("fails closed for missing, duplicate, malformed, and historical v1 rows", async () => {
  await expectUnavailable({ rows: [], rowCount: 0 });
  await expectUnavailable({ rows: [validRow(), validRow()], rowCount: 2 });
  await expectUnavailable({ rows: [validRow()], rowCount: 0 });

  const v1Digest =
    `bot_reply_staging_cross_service_evidence_v1_${"9".repeat(64)}`;
  await expectUnavailable({
    rows: [validRow({
      evidenceVersion: 1,
      evidenceDigest: v1Digest,
      eventPublishedVersion: 1,
      eventEvidenceDigest: v1Digest,
    })],
  });

  const extraColumn = validRow();
  extraColumn.unexpected = "forbidden";
  await expectUnavailable({ rows: [extraColumn] });
});

test("uses the database clock and blocks expired or invalid time relations", async () => {
  for (const overrides of [
    { databaseNow: expiresAt },
    { databaseNow: "2026-08-25T10:05:00.001Z" },
    { nonceConsumedAt: "2026-08-25T10:05:00.000Z" },
    { nonceConsumedAt: "2026-08-25T10:01:00.001Z" },
    { runCompletedAt: "2026-08-25T10:00:00.001Z" },
    { nonceSignedAt: "2026-08-25T10:00:02.000Z" },
  ]) {
    await expectUnavailable({ rows: [validRow(overrides)] });
  }
});

test("blocks tampered or non-canonical evidence and completed-run receipts", async () => {
  const tamperedEvidence = validRow();
  const evidenceDocument = JSON.parse(tamperedEvidence.evidenceJson);
  evidenceDocument.core.requestDigest = `sha256:${"a".repeat(64)}`;
  tamperedEvidence.evidenceJson = JSON.stringify(evidenceDocument);
  await expectUnavailable({ rows: [tamperedEvidence] });

  const tamperedReceipt = validRow();
  const receiptDocument = JSON.parse(tamperedReceipt.runReceiptJson);
  receiptDocument.scenarioCount = 8;
  tamperedReceipt.runReceiptJson = JSON.stringify(receiptDocument);
  await expectUnavailable({ rows: [tamperedReceipt] });

  const nonCanonicalEvidence = validRow();
  nonCanonicalEvidence.evidenceJson = ` ${nonCanonicalEvidence.evidenceJson}`;
  await expectUnavailable({ rows: [nonCanonicalEvidence] });

  const nonCanonicalReceipt = validRow();
  nonCanonicalReceipt.runReceiptJson = `${nonCanonicalReceipt.runReceiptJson}\n`;
  await expectUnavailable({ rows: [nonCanonicalReceipt] });
});

test("pins the external release and trusted Ed25519 key", async () => {
  await expectUnavailable({
    rows: [validRow({ releaseId: `connect_release_v1_${"a".repeat(64)}` })],
  });
  await expectUnavailable({
    rows: [validRow({ nonceKeyId: secondaryKeyId })],
  });
  await expectUnavailable({
    selectedKeyId: secondaryKeyId,
    keys: trustedKeys(),
  });
  await expectUnavailable({
    keys: trustedKeys().slice(1),
  });
});

test("requires exact nonce-ledger and immutable operator-event bindings", async () => {
  const wrongNonce =
    `bot_reply_staging_attestation_nonce_v1_${"b".repeat(64)}`;
  const wrongDigest = `sha256:${"c".repeat(64)}`;
  const wrongV2Digest =
    `bot_reply_staging_cross_service_evidence_v2_${"d".repeat(64)}`;
  const wrongEventKey =
    `bot_reply_staging_release_evidence_operator_event_v1_${"e".repeat(64)}`;
  for (const overrides of [
    { nonceNonce: wrongNonce },
    { nonceReceiptDigest: wrongDigest },
    { nonceEvidenceCoreDigest: wrongDigest },
    { nonceAttestationPayloadDigest: wrongDigest },
    { nonceExpectedEvidenceVersion: 0 },
    { nonceClaimVersion: claimVersion + 1 },
    { eventEvidenceDigest: wrongV2Digest },
    { eventKey: wrongEventKey },
    { eventExpectedVersion: 0 },
    { eventExpectedEvidenceDigest: null },
    { eventOccurredAt: consumedAt },
    { eventOperationId: `${publishOperation}.other` },
  ]) {
    await expectUnavailable({ rows: [validRow(overrides)] });
  }
});

test("validates event digest primitives before hashing without Proxy traps", async () => {
  let trapCalls = 0;
  const hostileExpectedDigest = new Proxy({}, {
    get() {
      trapCalls += 1;
      throw new Error("nested Proxy trap must not run");
    },
    ownKeys() {
      trapCalls += 1;
      throw new Error("nested Proxy trap must not run");
    },
  });

  await expectUnavailable({
    rows: [validRow({
      eventExpectedEvidenceDigest: hostileExpectedDigest,
    })],
  });
  assert.equal(trapCalls, 0);
});

test("rejects nested timestamp Proxies before instanceof can invoke traps", async () => {
  let trapCalls = 0;
  const hostileTimestamp = new Proxy(new Date(verifiedAt), {
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("nested timestamp Proxy trap must not run");
    },
  });

  await expectUnavailable({
    rows: [validRow({ databaseNow: hostileTimestamp })],
  });
  assert.equal(trapCalls, 0);
});

test("rejects proxy, accessor, symbol, and query-failure inputs without leaking", async () => {
  let getterCalls = 0;
  const accessorRow = validRow();
  Object.defineProperty(accessorRow, "evidenceJson", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "{}";
    },
  });
  await expectUnavailable({ rows: [accessorRow] });
  assert.equal(getterCalls, 0);

  const symbolRow = validRow();
  symbolRow[Symbol("forbidden")] = true;
  await expectUnavailable({ rows: [symbolRow] });

  const proxiedRow = new Proxy(validRow(), {
    ownKeys() {
      throw new Error("proxy traps must not run");
    },
  });
  await expectUnavailable({ rows: [proxiedRow] });

  const revokedRow = Proxy.revocable(validRow(), {});
  revokedRow.revoke();
  await expectUnavailable({ rows: [revokedRow.proxy] });

  await expectUnavailable({
    queryImplementation() {
      throw new Error("database unavailable with sensitive context");
    },
  });

  const accessorExecutor = {};
  Object.defineProperty(accessorExecutor, "query", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => ({ rows: [], rowCount: 0 });
    },
  });
  assert.throws(
    () => createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository(
      accessorExecutor,
      releaseIdentity(),
      keyId,
      trustedKeys(),
    ),
    TypeError,
  );
  assert.equal(getterCalls, 0);

  const proxiedExecutor = new Proxy({}, {
    ownKeys() {
      throw new Error("proxy traps must not run");
    },
  });
  assert.throws(
    () => createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository(
      proxiedExecutor,
      releaseIdentity(),
      keyId,
      trustedKeys(),
    ),
    TypeError,
  );
});

test("remains a dormant read boundary with no mutation or runtime wiring", async () => {
  const source = await readFile(
    new URL(
      "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /postgresBotReplyStagingReleaseEvidenceOperatorRepository/,
  );
  assert.doesNotMatch(
    source,
    /postgresBotReplyStagingAttestedReleaseEvidenceRepository/,
  );
  assert.doesNotMatch(
    source,
    /publish_bot_reply_staging_attested_evidence_with_audit/,
  );
  assert.doesNotMatch(
    source,
    /botReplyDeliveryAdapter|currentProductionReadiness|productionReadiness/,
  );
  assert.doesNotMatch(source, /Math\.random|randomUUID|createPrivateKey|\bsign\s*\(/);
  assert.match(
    source,
    /inspectRailwayBotReplyStagingAttestedReleaseEvidence/,
  );
  assert.match(source, /trustedKeyId/);
  assert.match(source, /pg_catalog\.clock_timestamp\(\)/);
  assert.equal((source.match(/\bSELECT\b/g) ?? []).length, 1);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|CALL)\b/);
});
