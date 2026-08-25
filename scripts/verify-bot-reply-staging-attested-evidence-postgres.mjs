import assert from "node:assert/strict";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";

import {
  deriveBotReplyStagingReceiptAttestationKeyId,
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  evaluateBotReplyStagingAttestedReleaseCutoverReadiness,
} from "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";
import {
  createNodePostgresQueryExecutor,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository,
} from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";
import {
  createPostgresBotReplyStagingAttestedReleaseEvidenceRepository,
} from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts";
import {
  assembleRailwayBotReplyStagingAttestedReleaseEvidence,
  createRailwayBotReplyStagingAttestedReleaseEvidenceCore,
  deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest,
  railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
  railwayBotReplyStagingAttestedReleaseEvidenceCheckIds,
} from "../server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";
import {
  createRailwayBotReplyStagingReceiptAttestationSigner,
} from "../server/platform/railwayBotReplyStagingReceiptAttestationSigner.ts";

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
const privateKeyPkcs8Base64Url = privateKey
  .export({ format: "der", type: "pkcs8" })
  .toString("base64url");
const publicKeySpkiBase64Url = createPublicKey(privateKey)
  .export({ format: "der", type: "spki" })
  .toString("base64url");
const keyId = deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url,
);
const keyValidFrom = "2020-01-01T00:00:00.000Z";
const keyValidUntil = "2100-01-01T00:00:00.000Z";
const attestedEvidenceScenarioCount = 2;

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function timestamp(milliseconds) {
  return new Date(milliseconds).toISOString();
}

function identity(prefix, character) {
  return `${prefix}${character.repeat(64)}`;
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

async function databaseClock(pool) {
  const result = await pool.query(
    `SELECT pg_catalog.date_trunc(
       'milliseconds',
       pg_catalog.clock_timestamp()
     ) AS "verifiedAt"`,
  );
  const value = result.rows[0]?.verifiedAt;
  assert.equal(value instanceof Date, true);
  return new Date(value.getTime());
}

async function verifyPostgres16(pool) {
  const result = await pool.query(
    `SELECT pg_catalog.current_setting('server_version') AS version`,
  );
  assert.match(result.rows[0]?.version, /^16\./);
}

async function createCompletedRunFixture(
  pool,
  tenantId,
  runCharacter,
  releaseCharacter,
) {
  const verifiedAt = await databaseClock(pool);
  const verifiedAtMilliseconds = verifiedAt.getTime();
  const startedAt = timestamp(verifiedAtMilliseconds - 2_000);
  const completedAt = timestamp(verifiedAtMilliseconds - 1_000);
  const leaseExpiresAt = timestamp(verifiedAtMilliseconds + 600_000);
  const runKey = identity("bot_reply_staging_run_v1_", runCharacter);
  const releaseId = identity("connect_release_v1_", releaseCharacter);
  const commitSha = releaseCharacter.repeat(40);
  const artifactDigest = digest(`artifact:${releaseCharacter}`);
  const requestDigest = digest(`request:${runCharacter}`);
  const receipt = Object.freeze({
    artifactDigest,
    commitSha,
    releaseId,
    runKey,
    scenarioCount: attestedEvidenceScenarioCount,
    schemaVersion: 1,
    status: "passed",
  });
  const receiptJson = JSON.stringify(receipt);
  const receiptDigest = deriveBotReplyStagingReceiptDigest(receipt);

  // The fixture stores the same canonical bytes whose digest is attested.
  assert.equal(receiptDigest, digest(receiptJson));

  await pool.query(
    `INSERT INTO public.bot_reply_staging_runs (
       run_key,
       tenant_id,
       request_digest,
       actor_external_user_id,
       connection_version,
       policy_version,
       release_id,
       commit_sha,
       artifact_digest,
       graph_api_version,
       recipient_fingerprint,
       rate_limit_method_fingerprint,
       status,
       claim_version,
       lease_expires_at,
       audit_key,
       receipt_json,
       receipt_digest,
       started_at,
       completed_at,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, 'attested-evidence-postgres-verifier', 1, 1,
       $4, $5, $6, 'v24.0', $7, $8, 'running', 1, $9, $10,
       NULL, NULL, $11, NULL, $11, $11
     )`,
    [
      runKey,
      tenantId,
      requestDigest,
      releaseId,
      commitSha,
      artifactDigest,
      digest(`recipient:${runCharacter}`),
      digest(`method:${runCharacter}`),
      leaseExpiresAt,
      identity("bot_reply_staging_audit_v1_", runCharacter),
      startedAt,
    ],
  );
  await pool.query(
    `UPDATE public.bot_reply_staging_runs
     SET status = 'completed',
         receipt_json = $2,
         receipt_digest = $3,
         completed_at = $4,
         updated_at = $4
     WHERE run_key = $1`,
    [runKey, receiptJson, receiptDigest, completedAt],
  );

  return Object.freeze({
    artifactDigest,
    claimVersion: 1,
    commitSha,
    receipt,
    receiptDigest,
    releaseId,
    requestDigest,
    runKey,
    verifiedAt: verifiedAt.toISOString(),
  });
}

function issueEvidence(
  fixture,
  auditCharacter,
  expectedEvidenceVersion = 0,
) {
  const attestationAuditKey = identity(
    "bot_reply_staging_attestation_audit_v1_",
    auditCharacter,
  );
  const evidenceClock = Object.freeze({
    now: () => new Date(fixture.verifiedAt),
  });
  const core = createRailwayBotReplyStagingAttestedReleaseEvidenceCore({
    report: readyReport(),
    receipt: fixture.receipt,
    releaseId: fixture.releaseId,
    commitSha: fixture.commitSha,
    artifactDigest: fixture.artifactDigest,
    runKey: fixture.runKey,
    claimVersion: fixture.claimVersion,
    requestDigest: fixture.requestDigest,
    expectedEvidenceVersion,
    attestationAuditKey,
    lifetimeSeconds: 300,
  }, evidenceClock);
  const signer = createRailwayBotReplyStagingReceiptAttestationSigner({
    privateKeyPkcs8Base64Url,
    expectedKeyId: keyId,
    keyValidFrom,
    keyValidUntil,
    clock: evidenceClock,
  });
  const attestation = signer.sign({
    receipt: fixture.receipt,
    runKey: fixture.runKey,
    claimVersion: fixture.claimVersion,
    requestDigest: fixture.requestDigest,
    releaseId: fixture.releaseId,
    commitSha: fixture.commitSha,
    artifactDigest: fixture.artifactDigest,
    expectedEvidenceVersion,
    evidenceCoreDigest:
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core),
    auditKey: attestationAuditKey,
    lifetimeSeconds: 300,
  });
  const evidence =
    assembleRailwayBotReplyStagingAttestedReleaseEvidence({
      core,
      attestation,
    });
  const expected = Object.freeze({
    trustedKeyId: keyId,
    releaseId: fixture.releaseId,
    commitSha: fixture.commitSha,
    artifactDigest: fixture.artifactDigest,
    runKey: fixture.runKey,
    claimVersion: fixture.claimVersion,
    requestDigest: fixture.requestDigest,
    expectedEvidenceVersion,
    attestationAuditKey,
  });
  return Object.freeze({ evidence, expected });
}

function publishCommand(
  fixture,
  issued,
  idempotencyCharacter,
  expectedEvidenceDigest = null,
) {
  return Object.freeze({
    evidence: issued.evidence,
    receipt: fixture.receipt,
    expected: issued.expected,
    expectedEvidenceDigest,
    actorExternalUserId: "attested-evidence-postgres-verifier",
    idempotencyKey: identity(
      "connect_idempotency_v1_",
      idempotencyCharacter,
    ),
  });
}

async function releaseMutationCounts(pool, fixture) {
  const result = await pool.query(
    `SELECT
       (
         SELECT count(*)::integer
         FROM public.bot_reply_staging_attestation_nonces
         WHERE release_id = $1
       ) AS "nonceCount",
       (
         SELECT count(*)::integer
         FROM public.bot_reply_staging_release_evidence
         WHERE release_id = $1
       ) AS "releaseCount",
       (
         SELECT count(*)::integer
         FROM public.bot_reply_staging_release_evidence_operator_events
         WHERE release_id = $1
       ) AS "eventCount",
       (
         SELECT evidence_version
         FROM public.bot_reply_staging_release_evidence
         WHERE release_id = $1
       ) AS "evidenceVersion"`,
    [fixture.releaseId],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function verifyReadOnlyCutoverRemainsBlocked(
  pool,
  fixture,
  issued,
) {
  const readRepository =
    createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository(
      createNodePostgresQueryExecutor(pool),
      {
        releaseId: fixture.releaseId,
        commitSha: fixture.commitSha,
        artifactDigest: fixture.artifactDigest,
      },
      keyId,
      [{
        keyId,
        publicKeySpkiBase64Url,
        validFrom: keyValidFrom,
        validUntil: keyValidUntil,
      }],
    );
  const verifiedEvidence = await readRepository.readVerified();
  assert.deepEqual(verifiedEvidence, {
    status: "verified",
    storageMode: "postgresql",
    releaseId: fixture.releaseId,
    commitSha: fixture.commitSha,
    artifactDigest: fixture.artifactDigest,
    evidenceSchemaVersion: 2,
    evidencePolicyVersion: issued.evidence.policyVersion,
    evidenceVersion: 1,
    evidenceDigest: issued.evidence.evidenceDigest,
    verifiedAt: issued.evidence.core.verifiedAt,
    expiresAt: issued.evidence.core.expiresAt,
    replayProtected: true,
  });

  const readiness =
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(
      verifiedEvidence,
    );
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.code, "CAPABILITY_ROLES_REQUIRED");
  assert.equal(readiness.evidenceStatus, "verified");
  assert.equal(readiness.evidenceDigest, issued.evidence.evidenceDigest);
  assert.equal(readiness.replayProtected, true);
  assert.equal(readiness.activationAllowed, false);
  assert.equal(Object.isFrozen(readiness), true);
}

async function verifyExactRaceAndConflict(
  pool,
  repository,
  tenantId,
) {
  const fixture = await createCompletedRunFixture(
    pool,
    tenantId,
    "1",
    "2",
  );
  const issued = issueEvidence(fixture, "3");
  const command = publishCommand(fixture, issued, "4");
  const raced = await Promise.all([
    repository.publishAttestedEvidence(command),
    repository.publishAttestedEvidence(command),
  ]);
  assert.deepEqual(
    raced.map(({ status }) => status).sort(),
    ["replayed", "stored"],
  );
  assert.deepEqual(
    raced.map(({ nonceStatus }) => nonceStatus).sort(),
    ["consumed", "replayed"],
  );
  assert.ok(raced.every(({ replayProtected }) => replayProtected === true));

  const replay = await repository.publishAttestedEvidence(command);
  assert.equal(replay.status, "replayed");
  assert.equal(replay.nonceStatus, "replayed");
  assert.equal(replay.replayProtected, true);

  await verifyReadOnlyCutoverRemainsBlocked(pool, fixture, issued);

  assert.deepEqual(await releaseMutationCounts(pool, fixture), {
    nonceCount: 1,
    releaseCount: 1,
    eventCount: 1,
    evidenceVersion: 1,
  });

  const changedIssued = issueEvidence(fixture, "5");
  const changedCommand = publishCommand(fixture, changedIssued, "4");
  const conflict = await repository.publishAttestedEvidence(changedCommand);
  assert.deepEqual(conflict, {
    status: "conflict",
    nonceStatus: null,
    version: null,
    event: null,
    replayProtected: false,
  });
  assert.deepEqual(await releaseMutationCounts(pool, fixture), {
    nonceCount: 1,
    releaseCount: 1,
    eventCount: 1,
    evidenceVersion: 1,
  });
  const changedNonce = await pool.query(
    `SELECT count(*)::integer AS count
     FROM public.bot_reply_staging_attestation_nonces
     WHERE nonce = $1`,
    [changedIssued.evidence.attestation.nonce],
  );
  assert.deepEqual(changedNonce.rows, [{ count: 0 }]);
}

async function installForcedPublisherConflict(pool) {
  await pool.query(
    `CREATE FUNCTION public.connect_verify_0048_force_conflict()
     RETURNS trigger
     LANGUAGE plpgsql
     SET search_path = pg_catalog
     AS $function$
     BEGIN
       RETURN NULL;
     END;
     $function$`,
  );
  await pool.query(
    `REVOKE ALL ON FUNCTION
       public.connect_verify_0048_force_conflict()
     FROM PUBLIC`,
  );
  await pool.query(
    `CREATE TRIGGER aa_connect_verify_0048_force_conflict
     BEFORE UPDATE ON public.bot_reply_staging_release_evidence
     FOR EACH ROW
     EXECUTE FUNCTION public.connect_verify_0048_force_conflict()`,
  );
}

async function removeForcedPublisherConflict(pool) {
  await pool.query(
    `DROP TRIGGER IF EXISTS aa_connect_verify_0048_force_conflict
     ON public.bot_reply_staging_release_evidence`,
  );
  await pool.query(
    `DROP FUNCTION IF EXISTS public.connect_verify_0048_force_conflict()`,
  );
}

async function verifyAtomicRollback(pool, repository, tenantId) {
  const fixture = await createCompletedRunFixture(
    pool,
    tenantId,
    "6",
    "7",
  );
  const issued = issueEvidence(fixture, "8");
  const command = publishCommand(fixture, issued, "9");

  await removeForcedPublisherConflict(pool);
  try {
    await installForcedPublisherConflict(pool);
    const result = await repository.publishAttestedEvidence(command);
    assert.deepEqual(result, {
      status: "conflict",
      nonceStatus: null,
      version: null,
      event: null,
      replayProtected: false,
    });
  } finally {
    await removeForcedPublisherConflict(pool);
  }

  assert.deepEqual(await releaseMutationCounts(pool, fixture), {
    nonceCount: 0,
    releaseCount: 0,
    eventCount: 0,
    evidenceVersion: null,
  });
}

async function seedVersionOneEvidence(pool, fixture) {
  const verifiedAt = fixture.verifiedAt;
  const expiresAt = timestamp(Date.parse(verifiedAt) + 300_000);
  const initializedAt = timestamp(Date.parse(verifiedAt) - 2_000);
  const evidenceDigest = identity(
    "bot_reply_staging_cross_service_evidence_v1_",
    "e",
  );
  const evidenceJson = JSON.stringify({
    artifactDigest: fixture.artifactDigest,
    commitSha: fixture.commitSha,
    evidenceDigest,
    expiresAt,
    releaseId: fixture.releaseId,
    verifiedAt,
  });

  await pool.query(
    `INSERT INTO public.bot_reply_staging_release_evidence (
       release_id,
       commit_sha,
       artifact_digest,
       evidence_version,
       evidence_digest,
       evidence_json,
       verified_at,
       expires_at,
       initialized_at,
       updated_at
     ) VALUES (
       $1, $2, $3, 1, $4, $5, $6::timestamptz, $7::timestamptz,
       $8::timestamptz, $6::timestamptz
     )`,
    [
      fixture.releaseId,
      fixture.commitSha,
      fixture.artifactDigest,
      evidenceDigest,
      evidenceJson,
      verifiedAt,
      expiresAt,
      initializedAt,
    ],
  );
  return evidenceDigest;
}

async function verifyVersionOneUpgrade(pool, repository, tenantId) {
  const fixture = await createCompletedRunFixture(
    pool,
    tenantId,
    "a",
    "b",
  );
  const versionOneDigest = await seedVersionOneEvidence(pool, fixture);
  const issued = issueEvidence(fixture, "0", 1);
  const command = publishCommand(
    fixture,
    issued,
    "d",
    versionOneDigest,
  );

  const stored = await repository.publishAttestedEvidence(command);
  assert.equal(stored.status, "stored");
  assert.equal(stored.nonceStatus, "consumed");
  assert.equal(stored.version, 2);
  assert.equal(stored.event?.expectedVersion, 1);
  assert.equal(stored.event?.expectedEvidenceDigest, versionOneDigest);
  assert.equal(stored.event?.publishedVersion, 2);

  const replay = await repository.publishAttestedEvidence(command);
  assert.equal(replay.status, "replayed");
  assert.equal(replay.nonceStatus, "replayed");
  assert.equal(replay.version, 2);
  assert.deepEqual(replay.event, stored.event);

  const state = await pool.query(
    `SELECT
       release_evidence.evidence_version AS "evidenceVersion",
       release_evidence.evidence_digest AS "evidenceDigest",
       (
         SELECT count(*)::integer
         FROM public.bot_reply_staging_attestation_nonces
         WHERE release_id = $1
       ) AS "nonceCount",
       (
         SELECT count(*)::integer
         FROM public.bot_reply_staging_release_evidence_operator_events
         WHERE release_id = $1
           AND expected_version = 1
           AND expected_evidence_digest = $2
           AND published_version = 2
       ) AS "eventCount"
     FROM public.bot_reply_staging_release_evidence AS release_evidence
     WHERE release_evidence.release_id = $1`,
    [fixture.releaseId, versionOneDigest],
  );
  assert.deepEqual(state.rows, [{
    evidenceVersion: 2,
    evidenceDigest: issued.evidence.evidenceDigest,
    nonceCount: 1,
    eventCount: 1,
  }]);
}

async function verifyPublicCannotExecute(pool) {
  const result = await pool.query(
    `SELECT
       has_function_privilege(
         'public',
         'public.publish_bot_reply_staging_attested_evidence_with_audit(text,text,text,integer,text,text,text,text,integer,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,text,text,text,text,text,text,text,timestamptz,timestamptz)',
         'EXECUTE'
       ) AS "outerExecute",
       has_function_privilege(
         'public',
         'public.consume_bot_reply_staging_attestation_nonce(text,text,text,integer,text,text,text,text,integer,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,text)',
         'EXECUTE'
       ) AS "nonceExecute",
       has_function_privilege(
         'public',
         'public.publish_bot_reply_staging_release_evidence_with_operator_audit(text,text,text,text,text,text,integer,text,text,text,timestamptz,timestamptz)',
         'EXECUTE'
       ) AS "publisherExecute",
       has_table_privilege(
         'public',
         'public.bot_reply_staging_attestation_nonces',
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
       ) OR has_table_privilege(
         'public',
         'public.bot_reply_staging_release_evidence',
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
       ) OR has_table_privilege(
         'public',
         'public.bot_reply_staging_release_evidence_operator_events',
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
       ) AS "protectedTableAccess"`,
  );
  assert.deepEqual(result.rows, [{
    outerExecute: false,
    nonceExecute: false,
    publisherExecute: false,
    protectedTableAccess: false,
  }]);
}

export async function verifyBotReplyStagingAttestedEvidencePostgres(
  pool,
  transactions,
  tenantId,
) {
  await verifyPostgres16(pool);
  const repository =
    createPostgresBotReplyStagingAttestedReleaseEvidenceRepository(
      transactions,
      [{
        keyId,
        publicKeySpkiBase64Url,
        validFrom: keyValidFrom,
        validUntil: keyValidUntil,
      }],
      { now: () => new Date() },
    );

  await verifyExactRaceAndConflict(pool, repository, tenantId);
  await verifyAtomicRollback(pool, repository, tenantId);
  await verifyVersionOneUpgrade(pool, repository, tenantId);
  await verifyPublicCannotExecute(pool);

  return attestedEvidenceScenarioCount;
}
