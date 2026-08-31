import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import {
  createNodePostgresBotReplyStagingProviderFenceWorkerCapability,
} from "../server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts";

const reserveSql = `SELECT
  outcome,
  "operationKey",
  "providerRequestKey",
  state,
  "requestedAt"
FROM public.reserve_bot_reply_staging_provider_operation_v1(
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13, $14
)`;

const finalizeSql = `SELECT
  outcome,
  "operationKey",
  state,
  "providerOutcomeKind",
  "observationKey",
  "finalizedAt"
FROM public.finalize_bot_reply_staging_provider_operation_v1(
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13, $14
)`;

const providerOperationFencePostgresScenarioCount = 9;

function hexDigest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digest(value) {
  return `sha256:${hexDigest(value)}`;
}

function providerAuditKey(runKey, requestDigest) {
  const value = createHash("sha256")
    .update(runKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
}

function identity(prefix, tenantId, label) {
  return `${prefix}${hexDigest(
    `d31-d1d-a-provider-operation:${tenantId}:${label}`,
  )}`;
}

function canonicalTimestamp(value) {
  assert.equal(value instanceof Date, true);
  return value.toISOString();
}

function offsetTimestamp(value, milliseconds) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

async function databaseTimestamp(client) {
  const result = await client.query(
    `SELECT pg_catalog.date_trunc(
       'milliseconds',
       pg_catalog.clock_timestamp()
     ) AS "databaseNow"`,
  );
  assert.equal(result.rowCount, 1);
  return canonicalTimestamp(result.rows[0]?.databaseNow);
}

async function readBackendPid(client) {
  const result = await client.query(
    `SELECT pg_catalog.pg_backend_pid() AS pid`,
  );
  const pid = result.rows[0]?.pid;
  assert.equal(Number.isSafeInteger(pid), true);
  return pid;
}

async function waitUntilBlocked(
  observer,
  blockedPid,
  blockingPid,
) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const result = await observer.query(
      `SELECT $1::integer = ANY(
         pg_catalog.pg_blocking_pids($2::integer)
       ) AS blocked`,
      [blockingPid, blockedPid],
    );
    if (result.rows[0]?.blocked === true) {
      return;
    }
    await delay(20);
  }
  assert.fail(
    `PostgreSQL backend ${blockedPid} did not block on ${blockingPid}`,
  );
}

async function waitPastDatabaseTimestamp(observer, timestamp) {
  for (let attempt = 0; attempt < 750; attempt += 1) {
    const result = await observer.query(
      `SELECT pg_catalog.clock_timestamp() >= $1::timestamptz AS expired`,
      [timestamp],
    );
    if (result.rows[0]?.expired === true) {
      return;
    }
    await delay(20);
  }
  assert.fail(`Database clock did not pass ${timestamp}`);
}

function tracked(promise) {
  return promise.then(
    (value) => ({ outcome: "fulfilled", value }),
    (reason) => ({ outcome: "rejected", reason }),
  );
}

function assertRejected(result, pattern) {
  assert.equal(result.outcome, "rejected");
  assert.equal(result.reason instanceof Error, true);
  assert.equal(result.reason.code, "P0001");
  assert.match(result.reason.message, pattern);
}

async function rollbackIfOpen(client, transactionOpen) {
  if (!transactionOpen) {
    return;
  }
  try {
    await client.query("ROLLBACK");
  } catch {
    // The original assertion remains the useful failure.
  }
}

async function prepareSafetyScope(pool, tenantId) {
  const recordedAt = await databaseTimestamp(pool);
  const connectionResult = await pool.query(
    `SELECT version, status
     FROM public.meta_connections
     WHERE tenant_id = $1`,
    [tenantId],
  );
  assert.equal(connectionResult.rowCount, 1);
  const connection = connectionResult.rows[0];
  assert.equal(connection.status, "connected");

  const policyVersionResult = await pool.query(
    `SELECT coalesce(pg_catalog.max(policy_version), 0)::integer + 1
       AS "policyVersion"
     FROM public.whatsapp_campaign_delivery_policy_events
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const policyVersion = policyVersionResult.rows[0]?.policyVersion;
  assert.equal(Number.isSafeInteger(policyVersion), true);
  const policyEventKey = identity(
    "whatsapp_delivery_policy_event_v1_",
    tenantId,
    "behavioral-policy",
  );
  const evidenceCheckedAt = offsetTimestamp(recordedAt, -1_000);
  const evidenceExpiresAt = offsetTimestamp(recordedAt, 600_000);
  await pool.query(
    `INSERT INTO public.whatsapp_campaign_delivery_policy_events (
       event_key,
       tenant_id,
       connection_version,
       policy_version,
       delivery_state,
       portfolio_limit_kind,
       portfolio_limit_value,
       reservation_duration_seconds,
       meta_graph_api_version,
       evidence_digest,
       evidence_checked_at,
       evidence_expires_at,
       actor_external_user_id,
       recorded_at,
       created_at,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES (
       $1, $2, $3, $4, 'enabled', 'bounded', 250, 60, 'v24.0',
       $5, $6, $7, 'driver-integration-owner', $8, $8, 1000, 100
     )`,
    [
      policyEventKey,
      tenantId,
      connection.version,
      policyVersion,
      hexDigest(`d31-d1d-a-policy-evidence:${tenantId}`),
      evidenceCheckedAt,
      evidenceExpiresAt,
      recordedAt,
    ],
  );

  const authorizationVersionResult = await pool.query(
    `SELECT coalesce(
       pg_catalog.max(authorization_version),
       0
     )::integer + 1 AS "authorizationVersion"
     FROM public.bot_reply_staging_authorization_events
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const authorizationVersion =
    authorizationVersionResult.rows[0]?.authorizationVersion;
  assert.equal(Number.isSafeInteger(authorizationVersion), true);
  const recipientFingerprint = digest(
    `d31-d1d-a-recipient:${tenantId}`,
  );
  const rateLimitMethodFingerprint = digest(
    `d31-d1d-a-rate-limit-method:${tenantId}`,
  );
  await pool.query(
    `INSERT INTO public.bot_reply_staging_authorization_events (
       event_key,
       tenant_id,
       authorization_version,
       status,
       environment,
       connection_mode,
       connection_version,
       policy_version,
       recipient_fingerprint,
       recipient_opt_in_recorded,
       recipient_opt_in_recorded_at,
       recipient_expires_at,
       rate_limit_approved_by,
       rate_limit_approved_at,
       rate_limit_expires_at,
       rate_limit_method_fingerprint,
       actor_external_user_id,
       recorded_at,
       created_at
     ) VALUES (
       $1, $2, $3, 'approved', 'staging', 'approved-staging-waba',
       $4, $5, $6, true, $7, $8, 'tal', $7, $8, $9,
       'driver-integration-owner', $10, $10
     )`,
    [
      identity(
        "bot_reply_staging_authorization_v1_",
        tenantId,
        "behavioral-authorization",
      ),
      tenantId,
      authorizationVersion,
      connection.version,
      policyVersion,
      recipientFingerprint,
      evidenceCheckedAt,
      evidenceExpiresAt,
      rateLimitMethodFingerprint,
      recordedAt,
    ],
  );

  const deliverySourceResult = await pool.query(
    `SELECT
       conversation_key AS "conversationKey",
       inbound_message_key AS "inboundMessageKey",
       bot_flow_key AS "botFlowKey",
       bot_flow_version_key AS "botFlowVersionKey",
       recipient_phone_e164 AS "recipientPhoneNumber",
       reply_json AS "replyJson",
       sender_phone_number_id AS "senderPhoneNumberId"
     FROM public.bot_reply_deliveries
     WHERE tenant_id = $1
       AND sender_phone_number_id IS NOT NULL
     ORDER BY created_at, delivery_key
     LIMIT 1`,
    [tenantId],
  );
  assert.equal(deliverySourceResult.rowCount, 1);

  return Object.freeze({
    authorizationVersion,
    connectionVersion: connection.version,
    deliverySource: Object.freeze(deliverySourceResult.rows[0]),
    evidenceExpiresAt,
    graphApiVersion: "v24.0",
    policyEventKey,
    policyVersion,
    rateLimitMethodFingerprint,
    recipientFingerprint,
  });
}

async function createFixture(
  pool,
  tenantId,
  safety,
  label,
  options = {},
) {
  const databaseNow = await databaseTimestamp(pool);
  const leaseMilliseconds = options.leaseMilliseconds ?? 30_000;
  const reservationMilliseconds =
    options.reservationMilliseconds ?? 60_000;
  assert.equal(reservationMilliseconds >= 6_000, true);
  const startedAt = offsetTimestamp(databaseNow, -100);
  const leaseExpiresAt = offsetTimestamp(
    databaseNow,
    leaseMilliseconds,
  );
  const deliveryKey = identity(
    "bot_reply_delivery_v1_",
    tenantId,
    `${label}:delivery`,
  );
  const reservationKey = identity(
    "whatsapp_rate_reservation_v1_",
    tenantId,
    `${label}:reservation`,
  );
  const runKey = identity(
    "bot_reply_staging_run_v1_",
    tenantId,
    `${label}:run`,
  );
  const operationKey = identity(
    "bot_reply_staging_step_v1_",
    tenantId,
    `${label}:operation`,
  );
  const requestDigest = digest(
    `d31-d1d-a-request:${tenantId}:${label}`,
  );
  const auditKey = providerAuditKey(runKey, requestDigest);
  const releaseId = identity(
    "connect_release_v1_",
    tenantId,
    `${label}:release`,
  );
  const commitSha = hexDigest(
    `d31-d1d-a-commit:${tenantId}:${label}`,
  ).slice(0, 40);
  const artifactDigest = digest(
    `d31-d1d-a-artifact:${tenantId}:${label}`,
  );

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
       $1, $2, $3, 'driver-integration-owner', $4, $5, $6, $7, $8,
       $9, $10, $11, 'running', 1, $12, $13, NULL, NULL, $14,
       NULL, $14, $14
     )`,
    [
      runKey,
      tenantId,
      requestDigest,
      safety.connectionVersion,
      safety.policyVersion,
      releaseId,
      commitSha,
      artifactDigest,
      safety.graphApiVersion,
      safety.recipientFingerprint,
      safety.rateLimitMethodFingerprint,
      leaseExpiresAt,
      auditKey,
      startedAt,
    ],
  );

  const replyIndexResult = await pool.query(
    `SELECT coalesce(pg_catalog.max(reply_index), 0)::integer + 1
       AS "replyIndex"
     FROM public.bot_reply_deliveries
     WHERE tenant_id = $1
       AND inbound_message_key = $2`,
    [tenantId, safety.deliverySource.inboundMessageKey],
  );
  const replyIndex = replyIndexResult.rows[0]?.replyIndex;
  assert.equal(Number.isSafeInteger(replyIndex), true);
  await pool.query(
    `INSERT INTO public.bot_reply_deliveries (
       delivery_key,
       tenant_id,
       conversation_key,
       inbound_message_key,
       bot_flow_key,
       bot_flow_version_key,
       reply_index,
       recipient_phone_e164,
       reply_json,
       status,
       attempt_count,
       provider_message_id,
       last_error_code,
       accepted_at,
       created_at,
       updated_at,
       sender_phone_number_id,
       claim_version,
       next_attempt_at,
       deferred_at,
       last_deferral_reason_code
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'sending', 1,
       NULL, NULL, NULL, $10, $10, $11, 1, NULL, NULL, NULL
     )`,
    [
      deliveryKey,
      tenantId,
      safety.deliverySource.conversationKey,
      safety.deliverySource.inboundMessageKey,
      safety.deliverySource.botFlowKey,
      safety.deliverySource.botFlowVersionKey,
      replyIndex,
      safety.deliverySource.recipientPhoneNumber,
      JSON.stringify(safety.deliverySource.replyJson),
      databaseNow,
      safety.deliverySource.senderPhoneNumberId,
    ],
  );

  await pool.query(
    `INSERT INTO public.whatsapp_rate_limit_reservations (
       reservation_key,
       tenant_id,
       portfolio_key,
       sender_key,
       recipient_key,
       template_category,
       portfolio_limit_kind,
       portfolio_limit_value,
       reserved_at,
       pair_reserved_until,
       reservation_expires_at,
       created_at,
       policy_event_key,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second,
       reservation_class
     ) VALUES (
       $1, $2, $3, $4, $5, NULL, 'bounded', 250, $6,
       $7, $8, $6, $9, 1000, 100, 'service-reply'
     )`,
    [
      reservationKey,
      tenantId,
      identity(
        "whatsapp_portfolio_v1_",
        tenantId,
        `${label}:portfolio`,
      ),
      identity("whatsapp_sender_v1_", tenantId, `${label}:sender`),
      identity(
        "whatsapp_recipient_v1_",
        tenantId,
        `${label}:recipient`,
      ),
      databaseNow,
      offsetTimestamp(databaseNow, 6_000),
      offsetTimestamp(databaseNow, reservationMilliseconds),
      safety.policyEventKey,
    ],
  );

  const argumentsList = Object.freeze([
    runKey,
    tenantId,
    requestDigest,
    auditKey,
    releaseId,
    commitSha,
    artifactDigest,
    1,
    leaseExpiresAt,
    operationKey,
    options.operationKind ?? "text-send",
    deliveryKey,
    1,
    reservationKey,
  ]);

  return Object.freeze({
    argumentsList,
    deliveryKey,
    leaseExpiresAt,
    operationKey,
    reservationExpiresAt: offsetTimestamp(
      databaseNow,
      reservationMilliseconds,
    ),
    reservationKey,
    runKey,
  });
}

async function reserve(client, fixture) {
  const result = await client.query(reserveSql, fixture.argumentsList);
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

function providerFenceInput(fixture) {
  const [
    runKey,
    tenantId,
    requestDigest,
    auditKey,
    releaseId,
    commitSha,
    artifactDigest,
    runClaimVersion,
    runLeaseExpiresAt,
    operationKey,
    operationKind,
    deliveryKey,
    deliveryClaimVersion,
    reservationKey,
  ] = fixture.argumentsList;
  return Object.freeze({
    runKey,
    tenantId,
    requestDigest,
    auditKey,
    releaseId,
    commitSha,
    artifactDigest,
    runClaimVersion,
    runLeaseExpiresAt,
    operationKey,
    operationKind,
    deliveryKey,
    deliveryClaimVersion,
    reservationKey,
  });
}

async function finalize(client, fixture) {
  const result = await client.query(finalizeSql, fixture.argumentsList);
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function readFenceCounts(pool, fixture) {
  const result = await pool.query(
    `SELECT
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_provider_operations
         WHERE operation_key = $1
       ) AS operations,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_provider_request_claims
         WHERE delivery_key = $2
           AND reservation_key = $3
       ) AS requests,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_provider_operation_outcomes
         WHERE operation_key = $1
       ) AS outcomes,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.whatsapp_rate_limit_settlements
         WHERE reservation_key = $3
       ) AS settlements`,
    [
      fixture.operationKey,
      fixture.deliveryKey,
      fixture.reservationKey,
    ],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function verifyConcurrentReserveReplay(pool, tenantId, safety) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "concurrent-replay",
  );
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({ pool });
  const input = providerFenceInput(fixture);
  const results = await Promise.all([
    capability.reserve(input),
    capability.reserve(input),
  ]);
  assert.deepEqual(
    results.map(({ outcome }) => outcome).sort(),
    ["authorized", "replay-blocked"],
  );
  const authorized = results.find(({ outcome }) => (
    outcome === "authorized"
  ));
  const replayed = results.find(({ outcome }) => (
    outcome === "replay-blocked"
  ));
  assert.match(
    authorized.providerRequestKey,
    /^bot_reply_provider_request_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    authorized.requestedAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  assert.equal("providerRequestKey" in replayed, false);
  assert.equal("requestedAt" in replayed, false);
  assert.equal(replayed.state, "reserved");
  assert.deepEqual(await readFenceCounts(pool, fixture), {
    operations: 1,
    requests: 1,
    outcomes: 0,
    settlements: 0,
  });
}

async function verifyRollbackHasNoDurableToken(pool, tenantId, safety) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "rollback",
  );
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    transactionOpen = true;
    const reserved = await reserve(client, fixture);
    assert.equal(reserved.outcome, "authorized");
    assert.match(
      reserved.providerRequestKey,
      /^bot_reply_provider_request_v1_[0-9a-f]{64}$/,
    );
    assert.deepEqual(await readFenceCounts(client, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 0,
      settlements: 0,
    });
    await client.query("ROLLBACK");
    transactionOpen = false;
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 0,
    });

    const capability =
      createNodePostgresBotReplyStagingProviderFenceWorkerCapability({ pool });
    const committed = await capability.reserve(providerFenceInput(fixture));
    assert.equal(committed.outcome, "authorized");
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(client, transactionOpen);
    client.release();
  }

  await verifyImplicitCommitFailureExposesNoToken(pool, tenantId, safety);
}

async function verifyImplicitCommitFailureExposesNoToken(
  pool,
  tenantId,
  safety,
) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "implicit-commit-failure",
  );
  const capability =
    createNodePostgresBotReplyStagingProviderFenceWorkerCapability({ pool });
  let providerRequestKey;

  const proofObjectCount = async () => {
    const result = await pool.query(`
      SELECT (
        (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_class AS relation
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relname IN (
              'd31d1db_commit_failure_trigger_calls',
              'd31d1db_commit_failure_targets'
            )
            AND relation.relkind IN ('r', 'S')
        ) + (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_proc AS procedure
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = procedure.pronamespace
          WHERE namespace.nspname = 'public'
            AND procedure.proname =
              'reject_d31d1db_provider_request_at_commit'
        ) + (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_trigger AS trigger
          WHERE trigger.tgname =
            'd31d1db_provider_request_commit_guard'
            AND trigger.tgisinternal = false
        )
      )::integer AS count
    `);
    assert.equal(result.rowCount, 1);
    return result.rows[0]?.count;
  };

  assert.equal(await proofObjectCount(), 0);

  try {
    await pool.query(`
      CREATE SEQUENCE public.d31d1db_commit_failure_trigger_calls;

      CREATE TABLE public.d31d1db_commit_failure_targets (
        delivery_key TEXT PRIMARY KEY
      );

      CREATE FUNCTION public.reject_d31d1db_provider_request_at_commit()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = pg_catalog, pg_temp
      AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM public.d31d1db_commit_failure_targets AS target
          WHERE target.delivery_key = NEW.delivery_key
        ) THEN
          PERFORM pg_catalog.nextval(
            'public.d31d1db_commit_failure_trigger_calls'::pg_catalog.regclass
          );
          RAISE EXCEPTION 'D31-D1d-B implicit commit rejected';
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE CONSTRAINT TRIGGER d31d1db_provider_request_commit_guard
      AFTER INSERT ON public.bot_reply_provider_request_claims
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION public.reject_d31d1db_provider_request_at_commit();
    `);
    assert.equal(await proofObjectCount(), 4);
    const triggerContract = await pool.query(`
      SELECT
        trigger.tgconstraint <> 0 AS "isConstraint",
        trigger.tgdeferrable AS "isDeferrable",
        trigger.tginitdeferred AS "isInitiallyDeferred",
        procedure.proname AS "functionName"
      FROM pg_catalog.pg_trigger AS trigger
      INNER JOIN pg_catalog.pg_proc AS procedure
        ON procedure.oid = trigger.tgfoid
      WHERE trigger.tgname = 'd31d1db_provider_request_commit_guard'
        AND trigger.tgisinternal = false
    `);
    assert.deepEqual(triggerContract.rows, [{
      isConstraint: true,
      isDeferrable: true,
      isInitiallyDeferred: true,
      functionName: "reject_d31d1db_provider_request_at_commit",
    }]);

    await pool.query(
      `INSERT INTO public.d31d1db_commit_failure_targets (delivery_key)
       VALUES ($1)`,
      [fixture.deliveryKey],
    );
    await assert.rejects(
      capability.reserve(providerFenceInput(fixture)).then((result) => {
        providerRequestKey = result.providerRequestKey;
        return result;
      }),
      /node-postgres staging provider capability failed: committed-query-failed/,
    );
    assert.equal(providerRequestKey, undefined);
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 0,
    });
    const triggerEvidence = await pool.query(
      `SELECT last_value AS "lastValue", is_called AS "isCalled"
       FROM public.d31d1db_commit_failure_trigger_calls`,
    );
    assert.equal(triggerEvidence.rowCount, 1);
    assert.equal(triggerEvidence.rows[0]?.isCalled, true);
    assert.equal(triggerEvidence.rows[0]?.lastValue, "1");

    await pool.query(
      `DELETE FROM public.d31d1db_commit_failure_targets
       WHERE delivery_key = $1`,
      [fixture.deliveryKey],
    );
    const committed = await capability.reserve(providerFenceInput(fixture));
    assert.equal(committed.outcome, "authorized");
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await pool.query(`
      DROP TRIGGER IF EXISTS d31d1db_provider_request_commit_guard
        ON public.bot_reply_provider_request_claims;
      DROP FUNCTION IF EXISTS
        public.reject_d31d1db_provider_request_at_commit();
      DROP TABLE IF EXISTS public.d31d1db_commit_failure_targets;
      DROP SEQUENCE IF EXISTS
        public.d31d1db_commit_failure_trigger_calls;
    `);
    assert.equal(await proofObjectCount(), 0);
  }
}

async function verifyIsolationRejections(pool, tenantId, safety) {
  const reserveFixture = await createFixture(
    pool,
    tenantId,
    safety,
    "isolation-reserve",
  );
  const reserveClient = await pool.connect();
  let reserveTransactionOpen = false;
  try {
    await reserveClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    reserveTransactionOpen = true;
    await assert.rejects(
      reserve(reserveClient, reserveFixture),
      (error) => (
        error?.code === "P0001" &&
        /requires read committed isolation/.test(error.message)
      ),
    );
    await reserveClient.query("ROLLBACK");
    reserveTransactionOpen = false;
    assert.deepEqual(await readFenceCounts(pool, reserveFixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(reserveClient, reserveTransactionOpen);
    reserveClient.release();
  }

  const finalizeFixture = await createFixture(
    pool,
    tenantId,
    safety,
    "isolation-finalize",
  );
  assert.equal(
    (await reserve(pool, finalizeFixture)).outcome,
    "authorized",
  );
  const finalizeClient = await pool.connect();
  let finalizeTransactionOpen = false;
  try {
    await finalizeClient.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    finalizeTransactionOpen = true;
    await assert.rejects(
      finalize(finalizeClient, finalizeFixture),
      (error) => (
        error?.code === "P0001" &&
        /requires read committed isolation/.test(error.message)
      ),
    );
    await finalizeClient.query("ROLLBACK");
    finalizeTransactionOpen = false;
    assert.equal(
      (await readFenceCounts(pool, finalizeFixture)).outcomes,
      0,
    );
  } finally {
    await rollbackIfOpen(finalizeClient, finalizeTransactionOpen);
    finalizeClient.release();
  }
}

async function verifyRunExpiryAfterLockWait(pool, tenantId, safety) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "run-expiry-after-lock",
    { leaseMilliseconds: 1_500 },
  );
  const lockClient = await pool.connect();
  const reserveClient = await pool.connect();
  let lockTransactionOpen = false;
  try {
    await lockClient.query("BEGIN");
    lockTransactionOpen = true;
    await lockClient.query(
      `SELECT run_key
       FROM public.bot_reply_staging_runs
       WHERE run_key = $1
       FOR UPDATE`,
      [fixture.runKey],
    );
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(lockClient),
      readBackendPid(reserveClient),
    ]);
    const reserveResult = tracked(reserve(reserveClient, fixture));
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await waitPastDatabaseTimestamp(pool, fixture.leaseExpiresAt);
    await lockClient.query("COMMIT");
    lockTransactionOpen = false;
    assertRejected(
      await reserveResult,
      /lacks an exact active run/,
    );
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(lockClient, lockTransactionOpen);
    lockClient.release();
    reserveClient.release();
  }
}

async function verifyReservationExpiryAfterLockWait(
  pool,
  tenantId,
  safety,
) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "reservation-expiry-after-lock",
    { leaseMilliseconds: 30_000, reservationMilliseconds: 6_500 },
  );
  const lockClient = await pool.connect();
  const reserveClient = await pool.connect();
  let lockTransactionOpen = false;
  try {
    await lockClient.query("BEGIN");
    lockTransactionOpen = true;
    await lockClient.query(
      `SELECT reservation_key
       FROM public.whatsapp_rate_limit_reservations
       WHERE reservation_key = $1
       FOR UPDATE`,
      [fixture.reservationKey],
    );
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(lockClient),
      readBackendPid(reserveClient),
    ]);
    const reserveResult = tracked(reserve(reserveClient, fixture));
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await waitPastDatabaseTimestamp(pool, fixture.reservationExpiresAt);
    await lockClient.query("COMMIT");
    lockTransactionOpen = false;
    assertRejected(
      await reserveResult,
      /lacks exact delivery admission/,
    );
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(lockClient, lockTransactionOpen);
    lockClient.release();
    reserveClient.release();
  }
}

async function insertCancellation(client, fixture) {
  const settledAt = await databaseTimestamp(client);
  return client.query(
    `INSERT INTO public.whatsapp_rate_limit_settlements (
       reservation_key,
       outcome,
       settled_at,
       created_at
     ) VALUES ($1, 'cancelled-before-submit', $2, $2)`,
    [fixture.reservationKey, settledAt],
  );
}

async function verifyCancellationWinsBeforeReserve(pool, tenantId, safety) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "cancellation-first",
  );
  const settlementClient = await pool.connect();
  const reserveClient = await pool.connect();
  let settlementTransactionOpen = false;
  try {
    await settlementClient.query("BEGIN");
    settlementTransactionOpen = true;
    await insertCancellation(settlementClient, fixture);
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(settlementClient),
      readBackendPid(reserveClient),
    ]);
    const reserveResult = tracked(reserve(reserveClient, fixture));
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await settlementClient.query("COMMIT");
    settlementTransactionOpen = false;
    assertRejected(
      await reserveResult,
      /lacks exact delivery admission/,
    );
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 0,
      requests: 0,
      outcomes: 0,
      settlements: 1,
    });
  } finally {
    await rollbackIfOpen(settlementClient, settlementTransactionOpen);
    settlementClient.release();
    reserveClient.release();
  }
}

async function verifyReserveWinsBeforeCancellation(pool, tenantId, safety) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "reserve-first",
  );
  const reserveClient = await pool.connect();
  const settlementClient = await pool.connect();
  let reserveTransactionOpen = false;
  let settlementTransactionOpen = false;
  try {
    await reserveClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    reserveTransactionOpen = true;
    assert.equal((await reserve(reserveClient, fixture)).outcome, "authorized");
    await settlementClient.query("BEGIN");
    settlementTransactionOpen = true;
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(reserveClient),
      readBackendPid(settlementClient),
    ]);
    const settlementResult = tracked(
      insertCancellation(settlementClient, fixture),
    );
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await reserveClient.query("COMMIT");
    reserveTransactionOpen = false;
    assertRejected(
      await settlementResult,
      /cancellation follows a reserved staging provider operation/,
    );
    await settlementClient.query("ROLLBACK");
    settlementTransactionOpen = false;
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 0,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(reserveClient, reserveTransactionOpen);
    await rollbackIfOpen(settlementClient, settlementTransactionOpen);
    reserveClient.release();
    settlementClient.release();
  }
}

async function insertAcceptedFact(client, fixture, acceptedAt) {
  const providerMessageId =
    `d31d1da.${hexDigest(`provider-message:${fixture.deliveryKey}`)}`;
  await client.query(
    `INSERT INTO public.bot_reply_delivery_provider_links (
       delivery_key,
       tenant_id,
       provider_message_id,
       reservation_key,
       provider_status,
       last_status_event_key,
       last_status_event_at,
       terminal_outcome,
       terminal_settled_at,
       accepted_at,
       created_at,
       updated_at
     ) SELECT
       $1, tenant_id, $2, $3, 'accepted', NULL, NULL, NULL, NULL,
       $4, $4, $4
     FROM public.bot_reply_deliveries
     WHERE delivery_key = $1`,
    [
      fixture.deliveryKey,
      providerMessageId,
      fixture.reservationKey,
      acceptedAt,
    ],
  );
}

async function verifyAcceptedFactWinsAfterLeaseExpiry(
  pool,
  tenantId,
  safety,
) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "accepted-fact-before-expiry",
    { leaseMilliseconds: 5_000 },
  );
  assert.equal((await reserve(pool, fixture)).outcome, "authorized");
  const producerClient = await pool.connect();
  const finalizeClient = await pool.connect();
  let producerTransactionOpen = false;
  try {
    await producerClient.query("BEGIN");
    producerTransactionOpen = true;
    const acceptedAt = await databaseTimestamp(producerClient);
    assert.equal(
      Date.parse(acceptedAt) < Date.parse(fixture.leaseExpiresAt),
      true,
    );
    await insertAcceptedFact(producerClient, fixture, acceptedAt);
    await waitPastDatabaseTimestamp(pool, fixture.leaseExpiresAt);
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(producerClient),
      readBackendPid(finalizeClient),
    ]);
    const finalizeResult = tracked(finalize(finalizeClient, fixture));
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await producerClient.query("COMMIT");
    producerTransactionOpen = false;
    const result = await finalizeResult;
    assert.equal(result.outcome, "fulfilled");
    assert.equal(result.value.outcome, "finalized");
    assert.equal(result.value.state, "completed");
    assert.equal(result.value.providerOutcomeKind, "accepted");
    assert.match(
      result.value.observationKey,
      /^bot_reply_staging_observation_v1_[0-9a-f]{64}$/,
    );

    const replayed = await finalize(pool, fixture);
    assert.equal(replayed.outcome, "replayed");
    assert.equal(replayed.state, "completed");
    assert.equal(replayed.providerOutcomeKind, "accepted");
    assert.equal(replayed.observationKey, result.value.observationKey);
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 1,
      settlements: 0,
    });
  } finally {
    await rollbackIfOpen(producerClient, producerTransactionOpen);
    producerClient.release();
    finalizeClient.release();
  }
}

async function verifyFinalizeExpiryAndLateFactsBlocked(
  pool,
  tenantId,
  safety,
) {
  const fixture = await createFixture(
    pool,
    tenantId,
    safety,
    "finalize-expiry",
    { leaseMilliseconds: 1_500 },
  );
  assert.equal((await reserve(pool, fixture)).outcome, "authorized");
  const lockClient = await pool.connect();
  const finalizeClient = await pool.connect();
  let lockTransactionOpen = false;
  try {
    await lockClient.query("BEGIN");
    lockTransactionOpen = true;
    await lockClient.query(
      `SELECT delivery_key
       FROM public.bot_reply_deliveries
       WHERE delivery_key = $1
       FOR UPDATE`,
      [fixture.deliveryKey],
    );
    const [blockingPid, blockedPid] = await Promise.all([
      readBackendPid(lockClient),
      readBackendPid(finalizeClient),
    ]);
    const finalizeResult = tracked(finalize(finalizeClient, fixture));
    await waitUntilBlocked(pool, blockedPid, blockingPid);
    await waitPastDatabaseTimestamp(pool, fixture.leaseExpiresAt);
    await lockClient.query("COMMIT");
    lockTransactionOpen = false;
    const result = await finalizeResult;
    assert.equal(result.outcome, "fulfilled");
    assert.equal(result.value.outcome, "finalized");
    assert.equal(result.value.state, "indeterminate");
    assert.equal(
      result.value.providerOutcomeKind,
      "lease-expired-without-outcome",
    );
    assert.deepEqual(await readFenceCounts(pool, fixture), {
      operations: 1,
      requests: 1,
      outcomes: 1,
      settlements: 0,
    });

    const lateAcceptedAt = await databaseTimestamp(pool);
    await assert.rejects(
      insertAcceptedFact(pool, fixture, lateAcceptedAt),
      /follows a finalized staging operation/,
    );
    await assert.rejects(
      insertCancellation(pool, fixture),
      /follows an indeterminate staging operation/,
    );
    const renewedAt = await databaseTimestamp(pool);
    await assert.rejects(
      pool.query(
        `UPDATE public.bot_reply_staging_runs
         SET claim_version = claim_version + 1,
             lease_expires_at = $2,
             updated_at = $3
         WHERE run_key = $1`,
        [
          fixture.runKey,
          offsetTimestamp(renewedAt, 60_000),
          renewedAt,
        ],
      ),
      /requires reconciliation/,
    );
  } finally {
    await rollbackIfOpen(lockClient, lockTransactionOpen);
    lockClient.release();
    finalizeClient.release();
  }
}

export async function verifyBotReplyStagingProviderOperationFencePostgres(
  pool,
  tenantId,
) {
  const version = await pool.query(
    `SELECT pg_catalog.current_setting('server_version') AS version`,
  );
  assert.match(version.rows[0]?.version, /^16\./);
  const safety = await prepareSafetyScope(pool, tenantId);

  await verifyConcurrentReserveReplay(pool, tenantId, safety);
  await verifyRollbackHasNoDurableToken(pool, tenantId, safety);
  await verifyIsolationRejections(pool, tenantId, safety);
  await verifyRunExpiryAfterLockWait(pool, tenantId, safety);
  await verifyReservationExpiryAfterLockWait(pool, tenantId, safety);
  await verifyCancellationWinsBeforeReserve(pool, tenantId, safety);
  await verifyReserveWinsBeforeCancellation(pool, tenantId, safety);
  await verifyAcceptedFactWinsAfterLeaseExpiry(pool, tenantId, safety);
  await verifyFinalizeExpiryAndLateFactsBlocked(pool, tenantId, safety);

  return providerOperationFencePostgresScenarioCount;
}
