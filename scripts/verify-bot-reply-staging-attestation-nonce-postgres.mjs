import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptAttestationPayloadDigest,
  deriveBotReplyStagingReceiptDigest,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createPostgresBotReplyStagingAttestationNonceRepository,
} from "../server/platform/postgresBotReplyStagingAttestationNonceRepository.ts";

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function timestamp(milliseconds) {
  return new Date(milliseconds).toISOString();
}

function buildClaim(input) {
  const binding = Object.freeze({
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    keyId:
      `bot_reply_staging_worker_key_v1_${input.character.repeat(64)}`,
    runKey: input.runKey,
    claimVersion: 1,
    requestDigest: input.requestDigest,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    artifactDigest: input.artifactDigest,
    expectedEvidenceVersion: 0,
    receiptDigest: deriveBotReplyStagingReceiptDigest(input.receipt),
    evidenceCoreDigest: digest(`core:${input.character}`),
    auditKey:
      `bot_reply_staging_attestation_audit_v1_${input.character.repeat(64)}`,
    nonceSequence: 1,
    issuedAt: input.issuedAt,
    signedAt: input.signedAt,
    expiresAt: input.expiresAt,
  });
  const nonce = deriveBotReplyStagingReceiptAttestationNonce(binding);
  const unsigned = Object.freeze({
    schemaVersion: 1,
    policyVersion: binding.policyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    ...binding,
    nonce,
  });
  return Object.freeze({
    ...binding,
    nonce,
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(unsigned),
  });
}

async function createCompletedRunFixture(
  pool,
  tenantId,
  character,
  timing = {},
) {
  const now = Date.now();
  const startedAt = timestamp(
    now + (timing.startedOffsetMilliseconds ?? -10_000),
  );
  const completedAt = timestamp(
    now + (timing.completedOffsetMilliseconds ?? -5_000),
  );
  const issuedAt = timestamp(
    now + (timing.issuedOffsetMilliseconds ?? -4_000),
  );
  const signedAt = timestamp(
    now + (timing.signedOffsetMilliseconds ?? -3_000),
  );
  const expiresAt = timestamp(
    now + (timing.expiresOffsetMilliseconds ?? 120_000),
  );
  const runKey = `bot_reply_staging_run_v1_${character.repeat(64)}`;
  const requestDigest = digest(`request:${character}`);
  const releaseId = `connect_release_v1_${character.repeat(64)}`;
  const commitSha = character.repeat(40);
  const artifactDigest = digest(`artifact:${character}`);
  const durableAuditKey =
    `bot_reply_staging_audit_v1_${character.repeat(64)}`;
  const receipt = Object.freeze({
    bounded: true,
    scenario: "nonce-ledger",
  });
  const receiptJson = JSON.stringify(receipt);
  const durableReceiptDigest = digest(receiptJson);

  await pool.query(
    `INSERT INTO bot_reply_staging_runs (
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
       $1, $2, $3, 'nonce-ledger-integration', 1, 1, $4, $5, $6,
       'v24.0', $7, $8, 'running', 1, $9, $10, NULL, NULL, $11,
       NULL, $11, $11
     )`,
    [
      runKey,
      tenantId,
      requestDigest,
      releaseId,
      commitSha,
      artifactDigest,
      digest(`recipient:${character}`),
      digest(`method:${character}`),
      timestamp(now + 600_000),
      durableAuditKey,
      startedAt,
    ],
  );
  await pool.query(
    `UPDATE bot_reply_staging_runs
     SET status = 'completed',
         receipt_json = $2,
         receipt_digest = $3,
         completed_at = $4,
         updated_at = $4
     WHERE run_key = $1`,
    [runKey, receiptJson, durableReceiptDigest, completedAt],
  );
  await pool.query(
    `INSERT INTO bot_reply_staging_release_evidence (
       release_id,
       commit_sha,
       artifact_digest,
       initialized_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $4)`,
    [releaseId, commitSha, artifactDigest, completedAt],
  );

  return buildClaim({
    artifactDigest,
    character,
    commitSha,
    expiresAt,
    issuedAt,
    receipt,
    releaseId,
    requestDigest,
    runKey,
    signedAt,
  });
}

async function readBackendPid(client) {
  const result = await client.query(
    `SELECT pg_catalog.pg_backend_pid() AS pid`,
  );
  const pid = result.rows[0]?.pid;
  assert.equal(Number.isSafeInteger(pid), true);
  return pid;
}

function createClientExecutor(client) {
  return Object.freeze({
    async query(sql, parameters) {
      const result = await client.query(sql, [...parameters]);
      return Object.freeze({
        rows: Object.freeze([...result.rows]),
        rowCount: result.rowCount,
      });
    },
  });
}

async function waitForBlockedAdvisoryLock(
  client,
  holderPid,
  consumerPid,
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await client.query(
      `SELECT $1::integer = ANY(
         pg_catalog.pg_blocking_pids($2::integer)
       ) AS waiting`,
      [holderPid, consumerPid],
    );
    if (result.rows[0]?.waiting === true) return;
    await delay(20);
  }
  throw new Error("nonce consume did not block on the advisory lock");
}

async function verifyExpiryDuringAdvisoryLockWait(
  pool,
  tenantId,
  repository,
) {
  const expiringClaim = await createCompletedRunFixture(
    pool,
    tenantId,
    "d",
    {
      startedOffsetMilliseconds: -70_000,
      completedOffsetMilliseconds: -61_000,
      issuedOffsetMilliseconds: -60_000,
      signedOffsetMilliseconds: -1_000,
      expiresOffsetMilliseconds: 5_000,
    },
  );
  const lockClient = await pool.connect();
  const consumerClient = await pool.connect();
  let consumePromise;
  let lockHeld = false;
  let transactionOpen = false;
  try {
    const holderPid = await readBackendPid(lockClient);
    const consumerPid = await readBackendPid(consumerClient);
    await lockClient.query(
      `SELECT pg_catalog.pg_advisory_lock(
         pg_catalog.hashtextextended('nonce:' || $1, 0)
       )`,
      [expiringClaim.nonce],
    );
    lockHeld = true;
    await consumerClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    transactionOpen = true;
    consumePromise = repository.consumeNonce(
      createClientExecutor(consumerClient),
      expiringClaim,
    );
    consumePromise.catch(() => undefined);
    await waitForBlockedAdvisoryLock(
      lockClient,
      holderPid,
      consumerPid,
    );
    await delay(Math.max(
      0,
      Date.parse(expiringClaim.expiresAt) - Date.now() + 100,
    ));
    const expiryResult = await lockClient.query(
      `SELECT pg_catalog.clock_timestamp() >= $1::timestamptz AS expired`,
      [expiringClaim.expiresAt],
    );
    assert.deepEqual(expiryResult.rows, [{ expired: true }]);
    const unlockResult = await lockClient.query(
      `SELECT pg_catalog.pg_advisory_unlock(
         pg_catalog.hashtextextended('nonce:' || $1, 0)
       ) AS unlocked`,
      [expiringClaim.nonce],
    );
    assert.deepEqual(unlockResult.rows, [{ unlocked: true }]);
    lockHeld = false;

    assert.deepEqual(await consumePromise, { status: "conflict" });
    await consumerClient.query("COMMIT");
    transactionOpen = false;
    const count = await pool.query(
      `SELECT count(*)::integer AS count
       FROM bot_reply_staging_attestation_nonces
       WHERE nonce = $1`,
      [expiringClaim.nonce],
    );
    assert.deepEqual(count.rows, [{ count: 0 }]);
  } finally {
    if (lockHeld) {
      await lockClient.query(
        `SELECT pg_catalog.pg_advisory_unlock(
           pg_catalog.hashtextextended('nonce:' || $1, 0)
         )`,
        [expiringClaim.nonce],
      );
    }
    if (consumePromise !== undefined) {
      await consumePromise.catch(() => undefined);
    }
    if (transactionOpen) {
      await consumerClient.query("ROLLBACK");
    }
    consumerClient.release();
    lockClient.release();
  }
}

async function verifyReplayExpiryDuringLedgerWait(
  pool,
  transactions,
  tenantId,
  repository,
) {
  const replayClaim = await createCompletedRunFixture(
    pool,
    tenantId,
    "c",
    {
      startedOffsetMilliseconds: -70_000,
      completedOffsetMilliseconds: -61_000,
      issuedOffsetMilliseconds: -60_000,
      signedOffsetMilliseconds: -1_000,
      expiresOffsetMilliseconds: 10_000,
    },
  );
  const consumed = await transactions.transaction(
    { isolationLevel: "read-committed" },
    (transaction) => repository.consumeNonce(transaction, replayClaim),
  );
  assert.equal(consumed.status, "consumed");

  const lockClient = await pool.connect();
  const consumerClient = await pool.connect();
  let consumePromise;
  let holderTransactionOpen = false;
  let consumerTransactionOpen = false;
  try {
    const holderPid = await readBackendPid(lockClient);
    const consumerPid = await readBackendPid(consumerClient);
    await lockClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    holderTransactionOpen = true;
    await lockClient.query(
      `LOCK TABLE public.bot_reply_staging_attestation_nonces
       IN ACCESS EXCLUSIVE MODE`,
    );
    await consumerClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    consumerTransactionOpen = true;
    consumePromise = repository.consumeNonce(
      createClientExecutor(consumerClient),
      replayClaim,
    );
    consumePromise.catch(() => undefined);
    await waitForBlockedAdvisoryLock(
      lockClient,
      holderPid,
      consumerPid,
    );
    await delay(Math.max(
      0,
      Date.parse(replayClaim.expiresAt) - Date.now() + 100,
    ));
    const expiryResult = await lockClient.query(
      `SELECT pg_catalog.clock_timestamp() >= $1::timestamptz AS expired`,
      [replayClaim.expiresAt],
    );
    assert.deepEqual(expiryResult.rows, [{ expired: true }]);
    await lockClient.query("COMMIT");
    holderTransactionOpen = false;

    assert.deepEqual(await consumePromise, { status: "conflict" });
    await consumerClient.query("COMMIT");
    consumerTransactionOpen = false;
    const count = await pool.query(
      `SELECT count(*)::integer AS count
       FROM public.bot_reply_staging_attestation_nonces
       WHERE nonce = $1`,
      [replayClaim.nonce],
    );
    assert.deepEqual(count.rows, [{ count: 1 }]);
  } finally {
    if (holderTransactionOpen) {
      await lockClient.query("ROLLBACK");
    }
    if (consumePromise !== undefined) {
      await consumePromise.catch(() => undefined);
    }
    if (consumerTransactionOpen) {
      await consumerClient.query("ROLLBACK");
    }
    consumerClient.release();
    lockClient.release();
  }
}

function claimWithChangedSignedAt(claim) {
  const signedAt = timestamp(Date.parse(claim.signedAt) + 1);
  const unsigned = Object.freeze({
    schemaVersion: 1,
    policyVersion: claim.policyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    keyId: claim.keyId,
    runKey: claim.runKey,
    claimVersion: claim.claimVersion,
    requestDigest: claim.requestDigest,
    releaseId: claim.releaseId,
    commitSha: claim.commitSha,
    artifactDigest: claim.artifactDigest,
    expectedEvidenceVersion: claim.expectedEvidenceVersion,
    receiptDigest: claim.receiptDigest,
    evidenceCoreDigest: claim.evidenceCoreDigest,
    auditKey: claim.auditKey,
    nonce: claim.nonce,
    nonceSequence: claim.nonceSequence,
    issuedAt: claim.issuedAt,
    signedAt,
    expiresAt: claim.expiresAt,
  });
  return Object.freeze({
    ...claim,
    signedAt,
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(unsigned),
  });
}

export async function verifyBotReplyStagingAttestationNoncePostgres(
  pool,
  transactions,
  tenantId,
) {
  const repository =
    createPostgresBotReplyStagingAttestationNonceRepository();
  const claim = await createCompletedRunFixture(
    pool,
    tenantId,
    "e",
  );
  const results = await Promise.all([
    transactions.transaction(
      { isolationLevel: "read-committed" },
      (transaction) => repository.consumeNonce(transaction, claim),
    ),
    transactions.transaction(
      { isolationLevel: "read-committed" },
      (transaction) => repository.consumeNonce(transaction, claim),
    ),
  ]);
  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["consumed", "replayed"],
  );

  const conflict = await transactions.transaction(
    { isolationLevel: "read-committed" },
    (transaction) => repository.consumeNonce(
      transaction,
      claimWithChangedSignedAt(claim),
    ),
  );
  assert.deepEqual(conflict, { status: "conflict" });

  const count = await pool.query(
    `SELECT count(*)::integer AS count
     FROM bot_reply_staging_attestation_nonces
     WHERE run_key = $1`,
    [claim.runKey],
  );
  assert.deepEqual(count.rows, [{ count: 1 }]);

  await assert.rejects(
    pool.query(
      `UPDATE bot_reply_staging_attestation_nonces
       SET consumed_at = consumed_at
       WHERE nonce = $1`,
      [claim.nonce],
    ),
    /immutable/,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM bot_reply_staging_attestation_nonces
       WHERE nonce = $1`,
      [claim.nonce],
    ),
    /immutable/,
  );

  const rollbackClaim = await createCompletedRunFixture(
    pool,
    tenantId,
    "f",
  );
  await assert.rejects(
    transactions.transaction(
      { isolationLevel: "read-committed" },
      async (transaction) => {
        const consumed = await repository.consumeNonce(
          transaction,
          rollbackClaim,
        );
        assert.equal(consumed.status, "consumed");
        throw new Error("intentional nonce rollback proof");
      },
    ),
    /intentional nonce rollback proof/,
  );
  const rollbackCount = await pool.query(
    `SELECT count(*)::integer AS count
     FROM bot_reply_staging_attestation_nonces
     WHERE nonce = $1`,
    [rollbackClaim.nonce],
  );
  assert.deepEqual(rollbackCount.rows, [{ count: 0 }]);

  await verifyExpiryDuringAdvisoryLockWait(
    pool,
    tenantId,
    repository,
  );
  await verifyReplayExpiryDuringLedgerWait(
    pool,
    transactions,
    tenantId,
    repository,
  );

  const privileges = await pool.query(
    `SELECT
       has_table_privilege(
         'public',
         'public.bot_reply_staging_attestation_nonces',
         'SELECT,INSERT,UPDATE,DELETE'
       ) AS "publicTableAccess",
       has_function_privilege(
         'public',
         'public.consume_bot_reply_staging_attestation_nonce(text,text,text,integer,text,text,text,text,integer,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,text)',
         'EXECUTE'
       ) AS "publicExecute"`,
  );
  assert.deepEqual(privileges.rows, [{
    publicTableAccess: false,
    publicExecute: false,
  }]);

  return Object.freeze({
    exactRace: "consumed+replayed",
    expiryDuringLockWait: "conflict-without-row",
    replayExpiryDuringLedgerWait: "conflict-with-existing-row",
    conflict: "time-bound-payload",
    immutable: true,
    rollback: true,
    publicAccess: false,
  });
}
