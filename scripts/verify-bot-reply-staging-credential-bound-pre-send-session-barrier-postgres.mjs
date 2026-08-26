import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationDirectory = join(projectRoot, "postgres", "migrations");
const environmentKey =
  "CONNECT_POSTGRES_BOT_REPLY_SESSION_BARRIER_URL";
const requiredDatabaseName =
  "connect_bot_reply_pre_send_session_barrier";
const migrationNamePattern = /^(\d{4})_[a-z0-9_]+\.sql$/;
const permitMigrationName =
  "0055_bot_reply_staging_credential_bound_pre_send_permit.sql";
const sessionBarrierMigrationName =
  "0056_bot_reply_staging_credential_bound_pre_send_session_barrier.sql";
const graphApiVersion = "v24.0";
const actorExternalUserId = "session-barrier-postgres-verifier";
const consumeFunctionName =
  "consume_bot_reply_staging_credential_bound_pre_send_permit_v1";
const finalizeFunctionName =
  "finalize_bot_reply_staging_credential_bound_pre_send_permit_v1";
const reconcileFunctionName =
  "reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1";

const claimSql = `SELECT
  outcome,
  "runKey",
  "requestDigest",
  "auditKey",
  "claimVersion",
  "leaseExpiresAt",
  "completedAt",
  "receiptDigest",
  "runBindingKey"
FROM public.claim_bot_reply_staging_run_v2(
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15
)`;

const reserveSql = `SELECT "permitKey"
FROM public.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2(
  $1, $2, $3, $4, $5, $6, $7, $8,
  $9, $10, $11, $12, $13, $14, $15, $16
)`;

const envelopeA = Object.freeze({
  keyVersion: "v1",
  initializationVector: "AAAAAAAAAAAAAAAA",
  ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAA",
});
const envelopeB = Object.freeze({
  keyVersion: "v1",
  initializationVector: "BBBBBBBBBBBBBBBB",
  ciphertext: "BBBBBBBBBBBBBBBBBBBBBBBB",
});

function fail(code) {
  throw new Error(`BOT_REPLY_SESSION_BARRIER_${code}`);
}

export function requireLocalBotReplySessionBarrierVerifierUrl(
  value,
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2_048
  ) {
    fail("URL_INVALID");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("URL_INVALID");
  }

  const port = Number(parsed.port);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(
      parsed.hostname,
    ) ||
    parsed.pathname !== `/${requiredDatabaseName}` ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    fail("DEDICATED_LOCAL_DATABASE_REQUIRED");
  }

  return parsed.toString();
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function digest(value) {
  return `sha256:${sha256Hex(value)}`;
}

function identity(prefix, tenantId, label) {
  return `${prefix}${sha256Hex(
    `d31-d1d-b-b2a2:${tenantId}:${label}`,
  )}`;
}

function metaAssetId(assetClass, tenantId) {
  const namespaces = Object.freeze({
    portfolio: "1",
    phone: "3",
    waba: "2",
  });
  const namespace = namespaces[assetClass];
  assert.notEqual(namespace, undefined);
  assert.equal(Number.isSafeInteger(tenantId), true);
  assert.equal(tenantId > 0, true);
  return `${namespace}${String(tenantId).padStart(18, "0")}`;
}

function contactPhoneE164(tenantId, label) {
  const suffix = (
    BigInt(`0x${sha256Hex(`contact:${tenantId}:${label}`).slice(0, 12)}`) %
    10_000_000_000n
  )
    .toString()
    .padStart(10, "0");
  return `+1555${suffix}`;
}

function providerAuditKey(runKey, requestDigest) {
  const value = createHash("sha256")
    .update(runKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
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
     ) AS value`,
  );
  assert.equal(result.rowCount, 1);
  return canonicalTimestamp(result.rows[0]?.value);
}

async function assertDatabaseError(promise, pattern) {
  await assert.rejects(promise, pattern);
}

async function migrationInventory() {
  const files = (await readdir(migrationDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  assert.equal(files.length, 57);
  assert.equal(files.at(-2), permitMigrationName);
  assert.equal(files.at(-1), sessionBarrierMigrationName);
  files.forEach((fileName, index) => {
    const match = migrationNamePattern.exec(fileName);
    assert.equal(match?.[1], String(index).padStart(4, "0"));
  });
  return files;
}

async function requireEmptyPublicSchema(pool) {
  const result = await pool.query(
    `SELECT (
       SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_class AS relation
       INNER JOIN pg_catalog.pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = 'public'
         AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
     ) + (
       SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_proc AS procedure
       INNER JOIN pg_catalog.pg_namespace AS namespace
         ON namespace.oid = procedure.pronamespace
       WHERE namespace.nspname = 'public'
     ) + (
       SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_type AS type_record
       INNER JOIN pg_catalog.pg_namespace AS namespace
         ON namespace.oid = type_record.typnamespace
       WHERE namespace.nspname = 'public'
         AND type_record.typrelid = 0
     ) AS count`,
  );
  assert.deepEqual(
    result.rows.map(({ count }) => ({ count: Number(count) })),
    [{ count: 0 }],
  );
}

async function cleanupDedicatedVerifierDatabase(pool) {
  const identityResult = await pool.query(
    `SELECT
       pg_catalog.current_database() AS database,
       pg_catalog.host(pg_catalog.inet_server_addr()) AS address`,
  );
  assert.equal(identityResult.rowCount, 1);
  assert.equal(identityResult.rows[0]?.database, requiredDatabaseName);
  assert.equal(
    ["127.0.0.1", "::1"].includes(identityResult.rows[0]?.address),
    true,
  );
  await pool.query("SELECT pg_catalog.pg_advisory_unlock_all()");
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
}

async function createTenant(pool, label) {
  const result = await pool.query(
    `INSERT INTO public.tenants (display_name, status)
     VALUES ($1, 'active')
     RETURNING id::integer AS id`,
    [`B2a2 verifier ${label}`],
  );
  assert.equal(result.rowCount, 1);
  const tenantId = result.rows[0]?.id;
  assert.equal(Number.isSafeInteger(tenantId), true);
  return tenantId;
}

async function storeEnvelope(pool, tenantId, envelope) {
  const result = await pool.query(
    `INSERT INTO public.meta_credential_envelopes (
       tenant_id,
       key_version,
       initialization_vector,
       ciphertext
     ) VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id) DO UPDATE SET
       key_version = EXCLUDED.key_version,
       initialization_vector = EXCLUDED.initialization_vector,
       ciphertext = EXCLUDED.ciphertext,
       updated_at = pg_catalog.date_trunc(
         'milliseconds',
         pg_catalog.clock_timestamp()
       )
     RETURNING
       credential_revision::integer AS "credentialRevision",
       envelope_digest AS "envelopeDigest"`,
    [
      tenantId,
      envelope.keyVersion,
      envelope.initializationVector,
      envelope.ciphertext,
    ],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function insertPolicy(pool, input) {
  const recordedAt = await databaseTimestamp(pool);
  const result = await pool.query(
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
       $1, $2, $3, $4, $5, 'bounded', 250, 60, $6,
       $7, $8, $9, $10, $11, $11, 1000, 100
     )
     RETURNING event_key AS "eventKey"`,
    [
      identity(
        "whatsapp_delivery_policy_event_v1_",
        input.tenantId,
        `policy:${input.policyVersion}:${input.deliveryState}`,
      ),
      input.tenantId,
      input.connectionVersion,
      input.policyVersion,
      input.deliveryState,
      graphApiVersion,
      sha256Hex(
        `policy-evidence:${input.tenantId}:${input.policyVersion}`,
      ),
      offsetTimestamp(recordedAt, -1_000),
      offsetTimestamp(recordedAt, 3_600_000),
      actorExternalUserId,
      recordedAt,
    ],
  );
  assert.equal(result.rowCount, 1);
  return Object.freeze({
    eventKey: result.rows[0]?.eventKey,
    policyVersion: input.policyVersion,
  });
}

async function disablePolicy(pool, fixture) {
  const recordedAt = await databaseTimestamp(pool);
  const eventKey = identity(
    "whatsapp_delivery_policy_event_v1_",
    fixture.safety.tenantId,
    "policy:2:disabled",
  );
  const result = await pool.query(
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
     )
     SELECT $1, tenant_id, connection_version, policy_version + 1,
       'disabled', portfolio_limit_kind, portfolio_limit_value,
       reservation_duration_seconds, meta_graph_api_version,
       evidence_digest, evidence_checked_at, evidence_expires_at,
       $2, $3, $3, phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     FROM public.whatsapp_campaign_delivery_policy_events
     WHERE event_key = $4
     RETURNING event_key AS "eventKey"`,
    [
      eventKey,
      actorExternalUserId,
      recordedAt,
      fixture.safety.policyEventKey,
    ],
  );
  assert.deepEqual(result.rows, [{ eventKey }]);
}

async function insertAuthorization(pool, input) {
  const recordedAt = await databaseTimestamp(pool);
  const approvedAt = offsetTimestamp(recordedAt, -1_000);
  const expiresAt = offsetTimestamp(recordedAt, 1_800_000);
  const returningClause = input.includeCredentialBinding
    ? `RETURNING
       event_key AS "eventKey",
       authorization_version::integer AS "authorizationVersion",
       credential_revision::integer AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey"`
    : `RETURNING
       event_key AS "eventKey",
       authorization_version::integer AS "authorizationVersion"`;
  const result = await pool.query(
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
       $1, $2, $3, $4, 'staging',
       'approved-staging-waba', $5, $6, $7, true, $8, $9,
       'tal', $8, $9, $10, $11, $12, $12
     )
     ${returningClause}`,
    [
      input.eventKey,
      input.tenantId,
      input.authorizationVersion,
      input.status,
      input.connectionVersion,
      input.policyVersion,
      input.recipientFingerprint,
      approvedAt,
      expiresAt,
      input.rateLimitMethodFingerprint,
      actorExternalUserId,
      recordedAt,
    ],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function revokeAuthorization(pool, fixture) {
  const recordedAt = await databaseTimestamp(pool);
  const eventKey = identity(
    "bot_reply_staging_authorization_v1_",
    fixture.safety.tenantId,
    "authorization:revoked:2",
  );
  const result = await pool.query(
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
     )
     SELECT $1, tenant_id, authorization_version + 1, 'revoked',
       environment, connection_mode, connection_version, policy_version,
       recipient_fingerprint, recipient_opt_in_recorded,
       recipient_opt_in_recorded_at, recipient_expires_at,
       rate_limit_approved_by, rate_limit_approved_at,
       rate_limit_expires_at, rate_limit_method_fingerprint,
       $2, $3, $3
     FROM public.bot_reply_staging_authorization_events
     WHERE event_key = $4
     RETURNING event_key AS "eventKey"`,
    [
      eventKey,
      actorExternalUserId,
      recordedAt,
      fixture.safety.authorizationEventKey,
    ],
  );
  assert.deepEqual(result.rows, [{ eventKey }]);
}

async function createSafetyScope(pool, label, options = {}) {
  const tenantId = await createTenant(pool, label);
  const connectionCreatedAt = offsetTimestamp(
    await databaseTimestamp(pool),
    -10_000,
  );
  const connectedAt = offsetTimestamp(connectionCreatedAt, 1_000);
  await pool.query(
    `INSERT INTO public.meta_connections (
       tenant_id,
       business_portfolio_id,
       waba_id,
       phone_number_id,
       status,
       webhook_subscribed_at,
       connected_at,
       version,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, 'connected', $5, $5, 1, $6, $5
     )`,
    [
      tenantId,
      metaAssetId("portfolio", tenantId),
      metaAssetId("waba", tenantId),
      metaAssetId("phone", tenantId),
      connectedAt,
      connectionCreatedAt,
    ],
  );

  const credential = await storeEnvelope(pool, tenantId, envelopeA);
  assert.equal(credential.credentialRevision, 1);
  const policy = await insertPolicy(pool, {
    connectionVersion: 1,
    deliveryState: "enabled",
    policyVersion: 1,
    tenantId,
  });
  const recipientFingerprint = digest(`recipient:${tenantId}`);
  const rateLimitMethodFingerprint = digest(
    `rate-limit-method:${tenantId}`,
  );
  const authorizationEventKey = identity(
    "bot_reply_staging_authorization_v1_",
    tenantId,
    options.legacy ? "authorization:legacy" : "authorization:bound:1",
  );
  const authorization = await insertAuthorization(pool, {
    authorizationVersion: 1,
    connectionVersion: 1,
    eventKey: authorizationEventKey,
    includeCredentialBinding: !options.legacy,
    policyVersion: 1,
    rateLimitMethodFingerprint,
    recipientFingerprint,
    status: "approved",
    tenantId,
  });

  return Object.freeze({
    authorization,
    authorizationEventKey,
    connectionVersion: 1,
    credential,
    policyEventKey: policy.eventKey,
    policyVersion: 1,
    rateLimitMethodFingerprint,
    recipientFingerprint,
    tenantId,
  });
}

async function applyAllMigrationsWithLegacyFixture(pool) {
  const files = await migrationInventory();
  let legacySafety = null;

  for (const fileName of files) {
    if (fileName === permitMigrationName) {
      legacySafety = await createSafetyScope(
        pool,
        "legacy-before-0055",
        { legacy: true },
      );
    }
    const source = await readFile(
      join(migrationDirectory, fileName),
      "utf8",
    );
    try {
      await pool.query(source);
    } catch (error) {
      error.message = `${fileName}: ${error.message}`;
      throw error;
    }
  }

  assert.notEqual(legacySafety, null);
  const legacyResult = await pool.query(
    `SELECT
       credential_revision AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey"
     FROM public.bot_reply_staging_authorization_events
     WHERE event_key = $1`,
    [legacySafety.authorizationEventKey],
  );
  assert.deepEqual(legacyResult.rows, [
    {
      credentialRevision: null,
      credentialEnvelopeDigest: null,
      credentialEventKey: null,
    },
  ]);
  return Object.freeze({ files, legacySafety });
}

function createClaimInput(safety, label, options = {}) {
  const runKey = identity(
    "bot_reply_staging_run_v1_",
    safety.tenantId,
    `${label}:run`,
  );
  const requestDigest = digest(
    `request:${safety.tenantId}:${label}`,
  );
  return Object.freeze({
    actorExternalUserId,
    artifactDigest: digest(`artifact:${safety.tenantId}:${label}`),
    auditKey: providerAuditKey(runKey, requestDigest),
    authorizationEventKey: safety.authorizationEventKey,
    commitSha: sha256Hex(`commit:${safety.tenantId}:${label}`).slice(
      0,
      40,
    ),
    connectionVersion: safety.connectionVersion,
    graphApiVersion,
    leaseDurationSeconds: options.leaseDurationSeconds ?? 600,
    policyVersion: safety.policyVersion,
    rateLimitMethodFingerprint: safety.rateLimitMethodFingerprint,
    recipientFingerprint: safety.recipientFingerprint,
    releaseId: identity(
      "connect_release_v1_",
      safety.tenantId,
      `${label}:release`,
    ),
    requestDigest,
    runKey,
    tenantId: safety.tenantId,
  });
}

function claimArguments(input) {
  return [
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
    input.authorizationEventKey,
  ];
}

async function claim(client, input) {
  const result = await client.query(claimSql, claimArguments(input));
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function createDeliverySource(pool, safety, label, options = {}) {
  const now = await databaseTimestamp(pool);
  const contactResult = await pool.query(
    `INSERT INTO public.contacts (
       tenant_id,
       phone_e164,
       mailing_status,
       consent_status
     ) VALUES ($1, $2, 'unsubscribed', 'unknown')
     RETURNING id::integer AS id`,
    [
      safety.tenantId,
      contactPhoneE164(safety.tenantId, label),
    ],
  );
  const contactId = contactResult.rows[0]?.id;
  assert.equal(Number.isSafeInteger(contactId), true);

  const conversationKey = identity(
    "conversation_v1_",
    safety.tenantId,
    `${label}:conversation`,
  );
  await pool.query(
    `INSERT INTO public.conversations (
       conversation_key,
       tenant_id,
       contact_id,
       status,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, 'bot_active', $4, $4)`,
    [conversationKey, safety.tenantId, contactId, now],
  );

  const inboundMessageKey = identity(
    "message_v1_",
    safety.tenantId,
    `${label}:inbound-message`,
  );
  const occurredAt = offsetTimestamp(
    now,
    -(options.inboundAgeMilliseconds ?? 60_000),
  );
  await pool.query(
    `INSERT INTO public.messages (
       message_key,
       conversation_key,
       tenant_id,
       provider_message_id,
       direction,
       content_kind,
       status,
       text_content,
       occurred_at,
       status_updated_at,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, 'inbound', 'text', 'received',
       'Verifier inbound message', $5, $5, $5, $5
     )`,
    [
      inboundMessageKey,
      conversationKey,
      safety.tenantId,
      `inbound-provider-${safety.tenantId}-${label}`,
      occurredAt,
    ],
  );

  const botFlowKey = identity(
    "bot_flow_v1_",
    safety.tenantId,
    `${label}:flow`,
  );
  const botFlowVersionKey = identity(
    "bot_flow_version_v1_",
    safety.tenantId,
    `${label}:flow-version`,
  );
  await pool.query(
    `INSERT INTO public.bot_flows (
       bot_flow_key,
       tenant_id,
       name,
       status,
       latest_version_key,
       latest_version_number,
       active_version_key,
       version,
       created_at,
       updated_at
     ) VALUES ($1, $2, 'Verifier flow', 'active', $3, 1, $3, 1, $4, $4)`,
    [botFlowKey, safety.tenantId, botFlowVersionKey, now],
  );
  await pool.query(
    `INSERT INTO public.bot_flow_versions (
       bot_flow_version_key,
       bot_flow_key,
       tenant_id,
       version_number,
       status,
       definition_json,
       published_at,
       created_at
     ) VALUES ($1, $2, $3, 1, 'published', $4::jsonb, $5, $5)`,
    [
      botFlowVersionKey,
      botFlowKey,
      safety.tenantId,
      JSON.stringify({ blocks: [] }),
      now,
    ],
  );

  return Object.freeze({
    botFlowKey,
    botFlowVersionKey,
    conversationKey,
    inboundMessageKey,
  });
}

async function createDeliveryAndReservation(
  pool,
  safety,
  source,
  label,
  claimInput,
  claimedRun,
  options = {},
) {
  const bindingResult = await pool.query(
    `SELECT
       binding_key AS "runBindingKey",
       run_key AS "runKey",
       tenant_id::integer AS "tenantId",
       run_claim_version::integer AS "runClaimVersion",
       authorization_event_key AS "authorizationEventKey",
       authorization_version::integer AS "authorizationVersion",
       credential_revision::integer AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey"
     FROM public.bot_reply_staging_run_credential_bindings
     WHERE binding_key = $1`,
    [claimedRun.runBindingKey],
  );
  assert.equal(bindingResult.rowCount, 1);
  const runBinding = bindingResult.rows[0];
  assert.deepEqual(
    {
      authorizationEventKey: runBinding.authorizationEventKey,
      runBindingKey: runBinding.runBindingKey,
      runClaimVersion: runBinding.runClaimVersion,
      runKey: runBinding.runKey,
      tenantId: runBinding.tenantId,
    },
    {
      authorizationEventKey: claimInput.authorizationEventKey,
      runBindingKey: claimedRun.runBindingKey,
      runClaimVersion: claimedRun.claimVersion,
      runKey: claimInput.runKey,
      tenantId: safety.tenantId,
    },
  );

  const databaseNow = await databaseTimestamp(pool);
  const deliveryKey = identity(
    "bot_reply_delivery_v1_",
    safety.tenantId,
    `${label}:delivery`,
  );
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
       $1, $2, $3, $4, $5, $6, 1, '+15550123456',
       $7::jsonb, 'sending', 1, NULL, NULL, NULL, $8, $8,
       $9, 1, NULL, NULL, NULL
     )`,
    [
      deliveryKey,
      safety.tenantId,
      source.conversationKey,
      source.inboundMessageKey,
      source.botFlowKey,
      source.botFlowVersionKey,
      JSON.stringify({ type: "text", text: "Verifier reply" }),
      databaseNow,
      metaAssetId("phone", safety.tenantId),
    ],
  );

  const reservationKey = identity(
    "whatsapp_rate_reservation_v1_",
    safety.tenantId,
    `${label}:reservation`,
  );
  const reservedAt = databaseNow;
  const pairReservedUntil = offsetTimestamp(reservedAt, 6_000);
  const reservationExpiresAt = offsetTimestamp(
    reservedAt,
    options.reservationLifetimeMilliseconds ?? 120_000,
  );
  const portfolioKey = identity(
    "whatsapp_portfolio_v1_",
    safety.tenantId,
    `${label}:portfolio`,
  );
  const senderKey = identity(
    "whatsapp_sender_v1_",
    safety.tenantId,
    `${label}:sender`,
  );
  const recipientKey = identity(
    "whatsapp_recipient_v1_",
    safety.tenantId,
    `${label}:recipient`,
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
      safety.tenantId,
      portfolioKey,
      senderKey,
      recipientKey,
      reservedAt,
      pairReservedUntil,
      reservationExpiresAt,
      safety.policyEventKey,
    ],
  );

  const admissionBindingKey = identity(
    "bot_reply_staging_admission_binding_v1_",
    safety.tenantId,
    `${label}:admission-binding`,
  );
  const boundAt = await databaseTimestamp(pool);
  await pool.query(
    `INSERT INTO public.bot_reply_staging_pre_send_admission_bindings (
       admission_binding_key,
       run_binding_key,
       run_key,
       tenant_id,
       run_claim_version,
       authorization_event_key,
       authorization_version,
       credential_revision,
       credential_envelope_digest,
       credential_event_key,
       delivery_key,
       delivery_claim_version,
       reservation_key,
       sender_key,
       recipient_key,
       policy_event_key,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second,
       reservation_reserved_at,
       pair_reserved_until,
       reservation_expires_at,
       bound_at,
       created_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, 1, $12, $13, $14, $15, 1000, 100, $16, $17,
       $18, $19, $19
     )`,
    [
      admissionBindingKey,
      runBinding.runBindingKey,
      runBinding.runKey,
      runBinding.tenantId,
      runBinding.runClaimVersion,
      runBinding.authorizationEventKey,
      runBinding.authorizationVersion,
      runBinding.credentialRevision,
      runBinding.credentialEnvelopeDigest,
      runBinding.credentialEventKey,
      deliveryKey,
      reservationKey,
      senderKey,
      recipientKey,
      safety.policyEventKey,
      reservedAt,
      pairReservedUntil,
      reservationExpiresAt,
      boundAt,
    ],
  );

  return Object.freeze({
    admissionBindingKey,
    deliveryClaimVersion: 1,
    deliveryKey,
    pairReservedUntil,
    recipientKey,
    reservationExpiresAt,
    reservationKey,
    reservedAt,
    runBinding,
    senderKey,
  });
}

function createReserveInput(
  safety,
  label,
  claimInput,
  claimedRun,
  delivery,
  operationKind,
) {
  return Object.freeze({
    admissionBindingKey: delivery.admissionBindingKey,
    artifactDigest: claimInput.artifactDigest,
    auditKey: claimInput.auditKey,
    commitSha: claimInput.commitSha,
    deliveryClaimVersion: delivery.deliveryClaimVersion,
    deliveryKey: delivery.deliveryKey,
    operationKey: identity(
      "bot_reply_staging_step_v1_",
      safety.tenantId,
      `${label}:operation`,
    ),
    operationKind,
    releaseId: claimInput.releaseId,
    requestDigest: claimInput.requestDigest,
    reservationKey: delivery.reservationKey,
    runBindingKey: claimedRun.runBindingKey,
    runClaimVersion: claimedRun.claimVersion,
    runKey: claimInput.runKey,
    runLeaseExpiresAt: canonicalTimestamp(claimedRun.leaseExpiresAt),
    tenantId: safety.tenantId,
  });
}

function reserveArguments(input) {
  return [
    input.runKey,
    input.tenantId,
    input.requestDigest,
    input.auditKey,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.runClaimVersion,
    input.runLeaseExpiresAt,
    input.runBindingKey,
    input.admissionBindingKey,
    input.operationKey,
    input.operationKind,
    input.deliveryKey,
    input.deliveryClaimVersion,
    input.reservationKey,
  ];
}

async function reserve(client, input) {
  const result = await client.query(reserveSql, reserveArguments(input));
  assert.equal(result.rowCount, 1);
  return result.rows[0]?.permitKey ?? null;
}

async function createPermitFixture(
  pool,
  safety,
  label,
  options = {},
) {
  const source = await createDeliverySource(
    pool,
    safety,
    label,
    options,
  );
  const claimInput = createClaimInput(safety, label, options);
  const claimedRun = await claim(pool, claimInput);
  assert.equal(claimedRun.outcome, "claimed");
  assert.match(
    claimedRun.runBindingKey,
    /^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$/,
  );
  const delivery = await createDeliveryAndReservation(
    pool,
    safety,
    source,
    label,
    claimInput,
    claimedRun,
    options,
  );
  const reserveInput = createReserveInput(
    safety,
    label,
    claimInput,
    claimedRun,
    delivery,
    options.operationKind ?? "text-send",
  );
  const permitKey = await reserve(pool, reserveInput);
  assert.match(
    permitKey,
    /^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$/,
  );
  assert.equal(await reserve(pool, reserveInput), null);
  return Object.freeze({
    claimInput,
    claimedRun,
    delivery,
    permitKey,
    reserveInput,
    safety,
    source,
  });
}

async function acquireBarrier(client, permitKey) {
  const result = await client.query(
    `SELECT outcome
     FROM public.acquire_bot_reply_staging_pre_send_session_barrier_v1($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0]?.outcome;
}

async function proveBarrier(client, permitKey) {
  const result = await client.query(
    `SELECT outcome, "backendPid", "sendBefore"
     FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  assert.deepEqual(Object.keys(result.rows[0]).sort(), [
    "backendPid",
    "outcome",
    "sendBefore",
  ]);
  return result.rows[0];
}

async function assertBarrierProof(client, permitKey, pinnedBackendPid) {
  const proof = await proveBarrier(client, permitKey);
  assert.equal(proof.outcome, "held");
  assert.equal(proof.backendPid, pinnedBackendPid);
  assert.equal(proof.sendBefore instanceof Date, true);
  const databaseNow = await databaseTimestamp(client);
  assert.equal(
    Date.parse(canonicalTimestamp(proof.sendBefore)) >
      Date.parse(databaseNow),
    true,
  );
  return proof;
}

async function releaseBarrier(client, permitKey) {
  const result = await client.query(
    `SELECT outcome, "releasedCount"
     FROM public.release_bot_reply_staging_pre_send_session_barrier_v1($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function consumePermit(client, permitKey) {
  const result = await client.query(
    `SELECT outcome, "reasonCode"
     FROM public.${consumeFunctionName}($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  assert.deepEqual(Object.keys(result.rows[0]).sort(), [
    "outcome",
    "reasonCode",
  ]);
  return result.rows[0];
}

async function finalizePermit(client, permitKey) {
  const result = await client.query(
    `SELECT outcome, state, "providerOutcomeKind", "observationKey",
       "finalizedAt"
     FROM public.${finalizeFunctionName}($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function reconcilePermit(client, permitKey) {
  const result = await client.query(
    `SELECT outcome, state, "providerOutcomeKind", "observationKey",
       "finalizedAt"
     FROM public.${reconcileFunctionName}($1)`,
    [permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function readBackendPid(client) {
  const result = await client.query(
    "SELECT pg_catalog.pg_backend_pid()::integer AS pid",
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0]?.pid;
}

async function readAdvisoryLockCount(client) {
  const result = await client.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_locks
     WHERE pid = pg_catalog.pg_backend_pid()
       AND locktype = 'advisory'
       AND granted`,
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0]?.count;
}

async function readCapabilityCounts(client, fixture) {
  const result = await client.query(
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
         FROM public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
         WHERE permit_key = $4
       ) AS consumptions,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_credential_provider_request_bindings
         WHERE permit_key = $4
       ) AS bindings,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
         WHERE permit_key = $4
       ) AS resolutions,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_provider_operation_outcomes
         WHERE operation_key = $1
       ) AS outcomes`,
    [
      fixture.reserveInput.operationKey,
      fixture.delivery.deliveryKey,
      fixture.delivery.reservationKey,
      fixture.permitKey,
    ],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function readUncertaintyEvidence(client, fixture) {
  const result = await client.query(
    `SELECT pg_catalog.count(*)::integer AS count,
       COALESCE(
         pg_catalog.array_agg(uncertainty_kind ORDER BY uncertainty_kind),
         ARRAY[]::TEXT[]
       ) AS kinds
     FROM public.bot_reply_staging_provider_uncertainty_events
     WHERE permit_key = $1`,
    [fixture.permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function readBoundaryClaimEvidence(client, fixture) {
  const result = await client.query(
    `SELECT pg_catalog.count(*)::integer AS count,
       pg_catalog.min(backend_pid)::integer AS "backendPid",
       pg_catalog.min(proved_at) AS "provedAt",
       pg_catalog.min(send_before) AS "sendBefore",
       pg_catalog.bool_and(created_at = proved_at) AS "createdAtMatches"
     FROM public.bot_reply_staging_provider_boundary_claims
     WHERE permit_key = $1`,
    [fixture.permitKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

function emptyCapabilityCounts() {
  return {
    bindings: 0,
    consumptions: 0,
    operations: 0,
    outcomes: 0,
    requests: 0,
    resolutions: 0,
  };
}

function releasedCapabilityCounts(options = {}) {
  return {
    bindings: 1,
    consumptions: 1,
    operations: 1,
    outcomes: options.outcomes ?? 0,
    requests: 1,
    resolutions: 1,
  };
}

async function verifyBarrierSemantics(pool, fixture) {
  const actor = await pool.connect();
  const contender = await pool.connect();
  let actorReleased = false;
  try {
    const actorPid = await readBackendPid(actor);
    const syntacticallyValidMissingPermit = identity(
      "bot_reply_staging_pre_send_permit_v1_",
      fixture.safety.tenantId,
      "missing-permit",
    );
    await assertDatabaseError(
      acquireBarrier(actor, "not-a-permit"),
      /session barrier input is invalid/,
    );
    await assertDatabaseError(
      acquireBarrier(actor, syntacticallyValidMissingPermit),
      /session barrier lacks permit/,
    );
    assert.equal(await readAdvisoryLockCount(actor), 0);

    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    assert.equal(await readBackendPid(actor), actorPid);
    await actor.query("COMMIT");
    assert.equal(await readAdvisoryLockCount(actor), 1);
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /proof lacks committed released chain/,
    );
    assert.equal(await readBackendPid(actor), actorPid);
    assert.equal(await readAdvisoryLockCount(actor), 1);
    await assertDatabaseError(
      acquireBarrier(actor, fixture.permitKey),
      /session barrier client is contaminated/,
    );
    assert.equal(
      await acquireBarrier(contender, fixture.permitKey),
      "busy",
    );
    assert.equal(await readAdvisoryLockCount(contender), 0);

    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await actor.query("SELECT 1");
    await actor.query("ROLLBACK");
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /proof lacks committed released chain/,
    );
    assert.equal(await readAdvisoryLockCount(actor), 1);

    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
    assert.equal(await readAdvisoryLockCount(actor), 0);
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "not-held",
      releasedCount: 0,
    });

    await actor.query("SELECT pg_catalog.pg_advisory_lock(42::BIGINT)");
    await assertDatabaseError(
      acquireBarrier(actor, fixture.permitKey),
      /session barrier client is contaminated/,
    );
    assert.equal(await readAdvisoryLockCount(actor), 1);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock(42::BIGINT)");
    assert.equal(await readAdvisoryLockCount(actor), 0);

    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await actor.query(
      `SELECT pg_catalog.pg_advisory_xact_lock(
         public.derive_bot_reply_staging_tenant_barrier_key_v1(
           permit.tenant_id
         )
       )
       FROM public.bot_reply_staging_credential_bound_pre_send_permits
         AS permit
       WHERE permit.permit_key = $1`,
      [fixture.permitKey],
    );
    await assertDatabaseError(
      acquireBarrier(actor, fixture.permitKey),
      /session barrier client is contaminated/,
    );
    await actor.query("ROLLBACK");
    assert.equal(await readAdvisoryLockCount(actor), 0);

    // A forged transaction-scoped hold can satisfy pg_locks during consume,
    // but it disappears at COMMIT. The mandatory post-COMMIT proof therefore
    // fails, so this committed ledger is never eligible for provider I/O.
    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await actor.query(
      `SELECT pg_catalog.pg_advisory_xact_lock(
         public.derive_bot_reply_staging_tenant_barrier_key_v1(
           permit.tenant_id
         )
       )
       FROM public.bot_reply_staging_credential_bound_pre_send_permits
         AS permit
       WHERE permit.permit_key = $1`,
      [fixture.permitKey],
    );
    assert.deepEqual(await consumePermit(actor, fixture.permitKey), {
      outcome: "authorized",
      reasonCode: "CAPABILITY_RELEASED",
    });
    await actor.query("COMMIT");
    assert.equal(await readAdvisoryLockCount(actor), 0);
    let providerBoundaryEligible = false;
    try {
      await assertBarrierProof(actor, fixture.permitKey, actorPid);
      providerBoundaryEligible = true;
    } catch (error) {
      assert.match(String(error?.message), /proof lacks exact barrier/);
    }
    assert.equal(providerBoundaryEligible, false);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );

    const otherPermit = await createPermitFixture(
      pool,
      fixture.safety,
      "barrier-other-unresolved",
    );
    assert.equal(
      await acquireBarrier(actor, otherPermit.permitKey),
      "blocked-unresolved",
    );
    assert.equal(await readAdvisoryLockCount(actor), 0);
    assert.deepEqual(
      await readCapabilityCounts(pool, otherPermit),
      emptyCapabilityCounts(),
    );

    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "reconciliation-required",
    );
    assert.equal(await readAdvisoryLockCount(actor), 2);
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /proof lacks exact barrier/,
    );
    await assertDatabaseError(
      consumePermit(actor, fixture.permitKey),
      /consumption lacks session barrier/,
    );
    assert.deepEqual(await finalizePermit(actor, fixture.permitKey), {
      finalizedAt: null,
      observationKey: null,
      outcome: "pending",
      providerOutcomeKind: null,
      state: "reserved",
    });
    await actor.query(
      `SELECT pg_catalog.pg_advisory_lock(
         public.derive_bot_reply_staging_tenant_barrier_key_v1(
           permit.tenant_id
         )
       )
       FROM public.bot_reply_staging_credential_bound_pre_send_permits
         AS permit
       WHERE permit.permit_key = $1`,
      [fixture.permitKey],
    );
    assert.equal(await readAdvisoryLockCount(actor), 2);
    await assertDatabaseError(
      acquireBarrier(actor, fixture.permitKey),
      /session barrier client is contaminated/,
    );
    assert.equal(await readAdvisoryLockCount(actor), 2);
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "lock-leaked",
      releasedCount: 2,
    });
    assert.equal(await readAdvisoryLockCount(actor), 1);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );
    actor.release(true);
    actorReleased = true;

    let acquiredAfterDisconnect = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const outcome = await acquireBarrier(contender, fixture.permitKey);
      if (outcome === "reconciliation-required") {
        acquiredAfterDisconnect = true;
        break;
      }
      assert.equal(outcome, "busy");
      await delay(25);
    }
    assert.equal(acquiredAfterDisconnect, true);
    assert.deepEqual(
      await releaseBarrier(contender, fixture.permitKey),
      { outcome: "released", releasedCount: 2 },
    );
    assert.equal(await readAdvisoryLockCount(contender), 0);
  } finally {
    if (!actorReleased) {
      await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
      actor.release();
    }
    await contender.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    contender.release();
  }
}

async function insertAcceptedProviderFact(pool, fixture) {
  const acceptedAt = await databaseTimestamp(pool);
  const providerMessageId =
    `b2a2.${sha256Hex(`provider-message:${fixture.permitKey}`)}`;
  await pool.query(
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
      fixture.delivery.deliveryKey,
      providerMessageId,
      fixture.delivery.reservationKey,
      acceptedAt,
    ],
  );
}

async function verifyAtomicCommitReplayAndDurableFinalization(
  pool,
  fixture,
) {
  const actor = await pool.connect();
  try {
    const actorPid = await readBackendPid(actor);
    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const prepared = await consumePermit(actor, fixture.permitKey);
    assert.deepEqual(prepared, {
      outcome: "authorized",
      reasonCode: "CAPABILITY_RELEASED",
    });
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      emptyCapabilityCounts(),
    );
    assert.equal(
      (await readBoundaryClaimEvidence(pool, fixture)).count,
      0,
    );

    await actor.query("COMMIT");
    // This is a simulated lost acknowledgement: the one-shot proof result is
    // intentionally discarded after its INSERT statement receives an
    // acknowledged local commit. This is not real network-level lost-ACK proof.
    await assertBarrierProof(actor, fixture.permitKey, actorPid);
    const boundaryClaim = await readBoundaryClaimEvidence(
      pool,
      fixture,
    );
    assert.equal(boundaryClaim.count, 1);
    assert.equal(boundaryClaim.backendPid, actorPid);
    assert.equal(boundaryClaim.createdAtMatches, true);
    assert.equal(boundaryClaim.provedAt instanceof Date, true);
    assert.equal(boundaryClaim.sendBefore instanceof Date, true);
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /provider boundary proof already consumed/,
    );
    assert.deepEqual(
      await readBoundaryClaimEvidence(pool, fixture),
      boundaryClaim,
    );
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );

    const simulatedLostAcknowledgementReplay = await consumePermit(
      actor,
      fixture.permitKey,
    );
    assert.deepEqual(simulatedLostAcknowledgementReplay, {
      outcome: "replay-blocked",
      reasonCode: "CAPABILITY_ALREADY_RELEASED",
    });
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );

    const pending = await finalizePermit(actor, fixture.permitKey);
    assert.deepEqual(pending, {
      finalizedAt: null,
      observationKey: null,
      outcome: "pending",
      providerOutcomeKind: null,
      state: "reserved",
    });

    await insertAcceptedProviderFact(pool, fixture);
    const finalized = await finalizePermit(actor, fixture.permitKey);
    assert.equal(finalized.outcome, "finalized");
    assert.equal(finalized.state, "completed");
    assert.equal(finalized.providerOutcomeKind, "accepted");
    assert.match(
      finalized.observationKey,
      /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/,
    );
    assert.equal(finalized.finalizedAt instanceof Date, true);
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /proof follows terminal outcome/,
    );

    const reconciled = await reconcilePermit(actor, fixture.permitKey);
    assert.equal(reconciled.outcome, "replayed");
    assert.equal(reconciled.state, "completed");
    assert.equal(reconciled.providerOutcomeKind, "accepted");
    assert.equal(reconciled.observationKey, finalized.observationKey);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts({ outcomes: 1 }),
    );

    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
    assert.equal(await readAdvisoryLockCount(actor), 0);
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function verifyRollbackAndRetry(pool, fixture) {
  const actor = await pool.connect();
  try {
    const actorPid = await readBackendPid(actor);
    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const rolledBack = await consumePermit(actor, fixture.permitKey);
    assert.equal(rolledBack.outcome, "authorized");
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      emptyCapabilityCounts(),
    );
    await actor.query("ROLLBACK");
    await assertDatabaseError(
      proveBarrier(actor, fixture.permitKey),
      /proof lacks committed released chain/,
    );
    assert.equal(await readBackendPid(actor), actorPid);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      emptyCapabilityCounts(),
    );

    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const retry = await consumePermit(actor, fixture.permitKey);
    assert.equal(retry.outcome, "authorized");
    await actor.query("COMMIT");
    await assertBarrierProof(actor, fixture.permitKey, actorPid);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function verifyIndeterminateReconciliation(pool, fixture) {
  const actor = await pool.connect();
  try {
    const actorPid = await readBackendPid(actor);
    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    assert.equal(
      (await consumePermit(actor, fixture.permitKey)).outcome,
      "authorized",
    );
    await actor.query("COMMIT");
    await assertBarrierProof(actor, fixture.permitKey, actorPid);
    const observedAt = await databaseTimestamp(pool);
    await pool.query(
      `UPDATE public.bot_reply_deliveries
       SET status = 'ambiguous',
         last_error_code = 'DELIVERY_OUTCOME_UNKNOWN',
         updated_at = $2
       WHERE delivery_key = $1`,
      [fixture.delivery.deliveryKey, observedAt],
    );
    const reconciled = await reconcilePermit(actor, fixture.permitKey);
    assert.deepEqual(reconciled, {
      finalizedAt: null,
      observationKey: null,
      outcome: "manual-reconciliation-required",
      providerOutcomeKind: null,
      state: "ambiguous",
    });
    const uncertainty = await readUncertaintyEvidence(
      pool,
      fixture,
    );
    assert.equal(uncertainty.count, 1);
    assert.deepEqual(uncertainty.kinds, [
      "provider-response-ambiguous",
    ]);
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );
    assert.deepEqual(
      await reconcilePermit(actor, fixture.permitKey),
      reconciled,
    );
    assert.deepEqual(
      await readUncertaintyEvidence(pool, fixture),
      uncertainty,
    );
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function waitUntilRunLeaseExpires(pool, leaseExpiresAt) {
  assert.equal(leaseExpiresAt instanceof Date, true);
  for (let attempt = 0; attempt < 700; attempt += 1) {
    const result = await pool.query(
      `SELECT pg_catalog.clock_timestamp() >= $1::TIMESTAMPTZ AS reached`,
      [canonicalTimestamp(leaseExpiresAt)],
    );
    assert.equal(result.rowCount, 1);
    if (result.rows[0]?.reached) return;
    await delay(100);
  }
  fail("RUN_LEASE_EXPIRY_TIMEOUT");
}

async function verifyLeaseExpiryUncertainty(pool) {
  const fixture = await createIsolatedPermit(
    pool,
    "lease-expiry-uncertainty",
    {
      leaseDurationSeconds: 60,
      reservationLifetimeMilliseconds: 120_000,
    },
  );
  const actor = await pool.connect();
  try {
    const actorPid = await readBackendPid(actor);
    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    await actor.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    assert.deepEqual(await consumePermit(actor, fixture.permitKey), {
      outcome: "authorized",
      reasonCode: "CAPABILITY_RELEASED",
    });
    await actor.query("COMMIT");
    await assertBarrierProof(actor, fixture.permitKey, actorPid);

    await waitUntilRunLeaseExpires(
      pool,
      fixture.claimedRun.leaseExpiresAt,
    );
    const unresolved = await finalizePermit(actor, fixture.permitKey);
    assert.deepEqual(unresolved, {
      finalizedAt: null,
      observationKey: null,
      outcome: "manual-reconciliation-required",
      providerOutcomeKind: null,
      state: "lease-expired-without-outcome",
    });
    const uncertainty = await readUncertaintyEvidence(
      pool,
      fixture,
    );
    assert.equal(uncertainty.count, 1);
    assert.deepEqual(uncertainty.kinds, [
      "lease-expired-without-outcome",
    ]);
    assert.deepEqual(
      await finalizePermit(actor, fixture.permitKey),
      unresolved,
    );
    assert.deepEqual(
      await readUncertaintyEvidence(pool, fixture),
      uncertainty,
    );
    assert.deepEqual(
      await readCapabilityCounts(pool, fixture),
      releasedCapabilityCounts(),
    );
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function consumeAndCommit(client, fixture) {
  const pinnedBackendPid = await readBackendPid(client);
  assert.equal(
    await acquireBarrier(client, fixture.permitKey),
    "acquired",
  );
  await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
  const result = await consumePermit(client, fixture.permitKey);
  await client.query("COMMIT");
  if (result.outcome === "authorized") {
    await assertBarrierProof(
      client,
      fixture.permitKey,
      pinnedBackendPid,
    );
  } else {
    await assertDatabaseError(
      proveBarrier(client, fixture.permitKey),
      /proof lacks committed released chain/,
    );
  }
  const release = await releaseBarrier(client, fixture.permitKey);
  assert.deepEqual(release, {
    outcome: "released",
    releasedCount: 1,
  });
  return result;
}

async function verifyOperationKindMatrix(pool) {
  const actor = await pool.connect();
  try {
    const button = await createIsolatedPermit(
      pool,
      "button-authorized",
      { operationKind: "button-send" },
    );
    const buttonResult = await consumeAndCommit(actor, button);
    assert.equal(buttonResult.outcome, "authorized");
    assert.deepEqual(
      await readCapabilityCounts(pool, button),
      releasedCapabilityCounts(),
    );

    const deniedKinds = [
      "customer-window-expired",
      "provider-retry",
      "pair-limit",
      "duplicate-safety",
    ];
    for (const operationKind of deniedKinds) {
      const fixture = await createIsolatedPermit(
        pool,
        `denied-kind-${operationKind}`,
        { operationKind },
      );
      const result = await consumeAndCommit(actor, fixture);
      assert.deepEqual(result, {
        outcome: "denied",
        reasonCode: "OPERATION_KIND_NOT_RELEASABLE",
      });
      assert.deepEqual(await readCapabilityCounts(pool, fixture), {
        ...emptyCapabilityCounts(),
        resolutions: 1,
      });
      const denial = await pool.query(
        `SELECT outcome, reason_code AS "reasonCode",
           provider_request_key IS NULL AS "capabilityAbsent"
         FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
         WHERE permit_key = $1`,
        [fixture.permitKey],
      );
      assert.deepEqual(denial.rows, [
        {
          capabilityAbsent: true,
          outcome: "denied",
          reasonCode: "OPERATION_KIND_NOT_RELEASABLE",
        },
      ]);
    }
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function expectDurableDenial(
  pool,
  fixture,
  mutate,
  expectedReason,
) {
  await mutate(fixture);
  const actor = await pool.connect();
  try {
    const first = await consumeAndCommit(actor, fixture);
    assert.deepEqual(first, {
      outcome: "denied",
      reasonCode: expectedReason,
    });
    assert.deepEqual(await readCapabilityCounts(pool, fixture), {
      ...emptyCapabilityCounts(),
      resolutions: 1,
    });

    assert.equal(
      await acquireBarrier(actor, fixture.permitKey),
      "acquired",
    );
    const replay = await consumePermit(actor, fixture.permitKey);
    assert.deepEqual(replay, {
      outcome: "replay-blocked",
      reasonCode: expectedReason,
    });
    assert.deepEqual(await releaseBarrier(actor, fixture.permitKey), {
      outcome: "released",
      releasedCount: 1,
    });
  } finally {
    await actor.query("ROLLBACK").catch(() => undefined);
    await actor.query("SELECT pg_catalog.pg_advisory_unlock_all()");
    actor.release();
  }
}

async function createIsolatedPermit(pool, label, options = {}) {
  const safety = await createSafetyScope(pool, label);
  return createPermitFixture(pool, safety, label, options);
}

async function insertKillSwitchFact(pool, fixture) {
  const observedAt = await databaseTimestamp(pool);
  await pool.query(
    `INSERT INTO public.bot_reply_staging_observation_events (
       event_key,
       run_key,
       claim_version,
       operation_key,
       delivery_key,
       subject_delivery_key,
       case_name,
       fact_kind,
       scenario,
       provider_error_code,
       dispatch_outcome,
       first_dispatch_outcome,
       second_dispatch_outcome,
       retry_after_seconds,
       cooldown_scope,
       backoff_policy,
       queue_delivery_count,
       provider_request_count,
       disabled_policy_version,
       policy_state,
       recipient_fingerprint,
       observed_at,
       created_at
     ) VALUES (
       $1, $2, $3, $4, $5, $5, 'kill-switch', 'kill-switch',
       NULL, NULL, 'rejected', NULL, NULL, NULL, NULL, NULL,
       NULL, 0, 2, 'disabled', $6, $7, $7
     )`,
    [
      identity(
        "bot_reply_staging_observation_v1_",
        fixture.safety.tenantId,
        "kill-switch",
      ),
      fixture.claimInput.runKey,
      fixture.claimedRun.claimVersion,
      fixture.reserveInput.operationKey,
      fixture.delivery.deliveryKey,
      fixture.safety.recipientFingerprint,
      observedAt,
    ],
  );
}

async function insertSenderCooldown(pool, fixture) {
  const now = await databaseTimestamp(pool);
  const cooldownReservationKey = identity(
    "whatsapp_rate_reservation_v1_",
    fixture.safety.tenantId,
    "cooldown-source:reservation",
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
      cooldownReservationKey,
      fixture.safety.tenantId,
      identity(
        "whatsapp_portfolio_v1_",
        fixture.safety.tenantId,
        "cooldown-source:portfolio",
      ),
      fixture.delivery.senderKey,
      identity(
        "whatsapp_recipient_v1_",
        fixture.safety.tenantId,
        "cooldown-source:recipient",
      ),
      now,
      offsetTimestamp(now, 6_000),
      offsetTimestamp(now, 120_000),
      fixture.safety.policyEventKey,
    ],
  );
  await pool.query(
    `INSERT INTO public.whatsapp_rate_limit_settlements (
       reservation_key,
       outcome,
       settled_at,
       created_at
     ) VALUES ($1, 'provider-failed', $2, $2)`,
    [cooldownReservationKey, now],
  );
  await pool.query(
    `INSERT INTO public.whatsapp_provider_cooldown_events (
       reservation_key,
       scope,
       provider_error_code,
       observed_at,
       blocked_until,
       created_at
     ) VALUES ($1, 'sender', 130429, $2, $3, $2)`,
    [cooldownReservationKey, now, offsetTimestamp(now, 60_000)],
  );
}

async function waitUntilPermitEntersSafetyCutoff(pool, permitKey) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await pool.query(
      `SELECT
         pg_catalog.date_trunc(
           'milliseconds',
           pg_catalog.clock_timestamp()
         ) + INTERVAL '15 seconds' >= permit_expires_at AS reached
       FROM public.bot_reply_staging_credential_bound_pre_send_permits
       WHERE permit_key = $1`,
      [permitKey],
    );
    assert.equal(result.rowCount, 1);
    if (result.rows[0]?.reached) return;
    await delay(100);
  }
  fail("PERMIT_SAFETY_CUTOFF_TIMEOUT");
}

async function verifyDynamicSafetyDenials(pool) {
  const rotated = await createIsolatedPermit(
    pool,
    "credential-rotation",
  );
  await expectDurableDenial(
    pool,
    rotated,
    async (fixture) => {
      const credential = await storeEnvelope(
        pool,
        fixture.safety.tenantId,
        envelopeB,
      );
      assert.equal(credential.credentialRevision, 2);
    },
    "CREDENTIAL_CHANGED",
  );

  const revoked = await createIsolatedPermit(
    pool,
    "authorization-revocation",
  );
  await expectDurableDenial(
    pool,
    revoked,
    async (fixture) => {
      await revokeAuthorization(pool, fixture);
    },
    "AUTHORIZATION_STALE",
  );

  const connectionChanged = await createIsolatedPermit(
    pool,
    "connection-change",
  );
  await expectDurableDenial(
    pool,
    connectionChanged,
    async (fixture) => {
      const now = await databaseTimestamp(pool);
      await pool.query(
        `UPDATE public.meta_connections
         SET status = 'revoked',
           version = 2,
           updated_at = $2
         WHERE tenant_id = $1`,
        [fixture.safety.tenantId, now],
      );
    },
    "CONNECTION_CHANGED",
  );

  const policyDisabled = await createIsolatedPermit(
    pool,
    "policy-disable",
  );
  await expectDurableDenial(
    pool,
    policyDisabled,
    async (fixture) => {
      await disablePolicy(pool, fixture);
    },
    "POLICY_DISABLED",
  );

  const killSwitch = await createIsolatedPermit(pool, "kill-switch");
  await expectDurableDenial(
    pool,
    killSwitch,
    async (fixture) => insertKillSwitchFact(pool, fixture),
    "POLICY_DISABLED",
  );

  const cooldown = await createIsolatedPermit(
    pool,
    "provider-cooldown",
  );
  await expectDurableDenial(
    pool,
    cooldown,
    async (fixture) => insertSenderCooldown(pool, fixture),
    "PROVIDER_COOLDOWN_ACTIVE",
  );

  const permitCountBeforeClosedWindow = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_credential_bound_pre_send_permits`,
  );
  await assertDatabaseError(
    createIsolatedPermit(pool, "service-window-closed", {
      inboundAgeMilliseconds: 25 * 60 * 60 * 1_000,
    }),
    /permit service window is closed/,
  );
  const permitCountAfterClosedWindow = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_credential_bound_pre_send_permits`,
  );
  assert.deepEqual(
    permitCountAfterClosedWindow.rows,
    permitCountBeforeClosedWindow.rows,
  );
  // Contract label SERVICE_WINDOW_CLOSED is enforced at reserve-v2, before
  // any permit exists to consume.

  const expired = await createIsolatedPermit(
    pool,
    "permit-expired",
    { reservationLifetimeMilliseconds: 17_000 },
  );
  await expectDurableDenial(
    pool,
    expired,
    async (fixture) => {
      await waitUntilPermitEntersSafetyCutoff(pool, fixture.permitKey);
    },
    "PERMIT_EXPIRED",
  );
}

async function verifyBindingLedgerImmutability(pool, fixture) {
  await assertDatabaseError(
    pool.query(
      `UPDATE public.bot_reply_staging_credential_provider_request_bindings
       SET created_at = created_at
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      `DELETE FROM public.bot_reply_staging_credential_provider_request_bindings
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      "TRUNCATE public.bot_reply_staging_credential_provider_request_bindings",
    ),
    /credential-bound pre-send evidence is immutable|cannot truncate a table referenced in a foreign key constraint/,
  );
  assert.deepEqual(
    await readCapabilityCounts(pool, fixture),
    releasedCapabilityCounts({ outcomes: 1 }),
  );
}

async function verifyUncertaintyCatalogAndImmutability(
  pool,
  fixture,
) {
  const columnResult = await pool.query(
    `SELECT attribute.attname AS name,
       pg_catalog.format_type(
         attribute.atttypid,
         attribute.atttypmod
       ) AS type,
       attribute.attnotnull AS "notNull"
     FROM pg_catalog.pg_attribute AS attribute
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = attribute.attrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_uncertainty_events'
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped
     ORDER BY attribute.attnum`,
  );
  assert.deepEqual(columnResult.rows, [
    { name: "event_key", notNull: true, type: "text" },
    { name: "permit_key", notNull: true, type: "text" },
    { name: "operation_key", notNull: true, type: "text" },
    { name: "run_key", notNull: true, type: "text" },
    { name: "tenant_id", notNull: true, type: "bigint" },
    { name: "delivery_key", notNull: true, type: "text" },
    { name: "reservation_key", notNull: true, type: "text" },
    { name: "provider_request_key", notNull: true, type: "text" },
    {
      name: "requested_at",
      notNull: true,
      type: "timestamp with time zone",
    },
    { name: "uncertainty_kind", notNull: true, type: "text" },
    {
      name: "detected_at",
      notNull: true,
      type: "timestamp with time zone",
    },
    {
      name: "created_at",
      notNull: true,
      type: "timestamp with time zone",
    },
  ]);

  const uncertaintyIdentityResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.contype AS type,
       constraint_record.convalidated AS validated,
       ARRAY(
         SELECT attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS attribute
           ON attribute.attrelid = constraint_record.conrelid
          AND attribute.attnum = key.attnum
         ORDER BY key.position
       ) AS columns
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_credential_provider_request_bindings'
       AND constraint_record.conname =
         'bot_reply_staging_request_bindings_uncertainty_exact_uq'`,
  );
  assert.deepEqual(uncertaintyIdentityResult.rows, [
    {
      columns: [
        "permit_key",
        "operation_key",
        "run_key",
        "tenant_id",
        "delivery_key",
        "reservation_key",
        "provider_request_key",
        "bound_at",
      ],
      name: "bot_reply_staging_request_bindings_uncertainty_exact_uq",
      type: "u",
      validated: true,
    },
  ]);

  const foreignKeyResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.confmatchtype AS "matchType",
       constraint_record.confdeltype AS "deleteType",
       constraint_record.confupdtype AS "updateType",
       parent.relname AS "parentTable",
       ARRAY(
         SELECT child_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS child_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS child_attribute
           ON child_attribute.attrelid = constraint_record.conrelid
          AND child_attribute.attnum = child_key.attnum
         ORDER BY child_key.position
       ) AS "childColumns",
       ARRAY(
         SELECT parent_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.confkey)
           WITH ORDINALITY AS parent_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS parent_attribute
           ON parent_attribute.attrelid = constraint_record.confrelid
          AND parent_attribute.attnum = parent_key.attnum
         ORDER BY parent_key.position
       ) AS "parentColumns"
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS child
       ON child.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_class AS parent
       ON parent.oid = constraint_record.confrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = child.relnamespace
     WHERE namespace.nspname = 'public'
       AND child.relname =
         'bot_reply_staging_provider_uncertainty_events'
       AND constraint_record.contype = 'f'`,
  );
  assert.deepEqual(foreignKeyResult.rows, [
    {
      childColumns: [
        "permit_key",
        "operation_key",
        "run_key",
        "tenant_id",
        "delivery_key",
        "reservation_key",
        "provider_request_key",
        "requested_at",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_uncertainty_binding_fk",
      parentColumns: [
        "permit_key",
        "operation_key",
        "run_key",
        "tenant_id",
        "delivery_key",
        "reservation_key",
        "provider_request_key",
        "bound_at",
      ],
      parentTable:
        "bot_reply_staging_credential_provider_request_bindings",
      updateType: "a",
    },
  ]);

  const localConstraintResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.contype AS type,
       constraint_record.convalidated AS validated,
       ARRAY(
         SELECT attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS attribute
           ON attribute.attrelid = constraint_record.conrelid
          AND attribute.attnum = key.attnum
         ORDER BY key.position
       ) AS columns,
       pg_catalog.pg_get_constraintdef(
         constraint_record.oid,
         true
       ) AS definition
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_uncertainty_events'
       AND constraint_record.conname = ANY($1::TEXT[])
     ORDER BY constraint_record.conname`,
    [[
      "bot_reply_staging_provider_uncertainty_events_pkey",
      "bot_reply_staging_uncertainty_keys_valid",
      "bot_reply_staging_uncertainty_operation_kind_uq",
      "bot_reply_staging_uncertainty_values_valid",
    ]],
  );
  assert.equal(localConstraintResult.rowCount, 4);
  const localByName = new Map(
    localConstraintResult.rows.map((row) => [row.name, row]),
  );
  assert.deepEqual(
    localByName.get(
      "bot_reply_staging_provider_uncertainty_events_pkey",
    ),
    {
      columns: ["event_key"],
      definition: "PRIMARY KEY (event_key)",
      name: "bot_reply_staging_provider_uncertainty_events_pkey",
      type: "p",
      validated: true,
    },
  );
  assert.deepEqual(
    localByName.get("bot_reply_staging_uncertainty_operation_kind_uq"),
    {
      columns: ["operation_key", "uncertainty_kind"],
      definition: "UNIQUE (operation_key, uncertainty_kind)",
      name: "bot_reply_staging_uncertainty_operation_kind_uq",
      type: "u",
      validated: true,
    },
  );
  for (const name of [
    "bot_reply_staging_uncertainty_keys_valid",
    "bot_reply_staging_uncertainty_values_valid",
  ]) {
    const row = localByName.get(name);
    assert.equal(row?.type, "c");
    assert.equal(row?.validated, true);
    assert.match(row?.definition ?? "", /^CHECK \(/);
  }

  const protectionResult = await pool.query(
    `SELECT
       NOT EXISTS (
         SELECT 1
         FROM pg_catalog.aclexplode(
           COALESCE(
             relation.relacl,
             pg_catalog.acldefault('r', relation.relowner)
           )
         ) AS privilege
         WHERE privilege.grantee <> relation.relowner
       ) AS protected,
       ARRAY(
         SELECT trigger.tgname::pg_catalog.text
         FROM pg_catalog.pg_trigger AS trigger
         WHERE trigger.tgrelid = relation.oid
           AND NOT trigger.tgisinternal
         ORDER BY trigger.tgname
       ) AS triggers
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_uncertainty_events'`,
  );
  assert.deepEqual(protectionResult.rows, [
    {
      protected: true,
      triggers: [
        "bot_reply_staging_uncertainty_mutation_guard",
        "bot_reply_staging_uncertainty_truncate_guard",
      ],
    },
  ]);

  await assertDatabaseError(
    pool.query(
      `UPDATE public.bot_reply_staging_provider_uncertainty_events
       SET detected_at = detected_at
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      `DELETE FROM public.bot_reply_staging_provider_uncertainty_events
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      "TRUNCATE public.bot_reply_staging_provider_uncertainty_events",
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  assert.deepEqual(await readUncertaintyEvidence(pool, fixture), {
    count: 1,
    kinds: ["provider-response-ambiguous"],
  });
}

async function verifyBoundaryClaimCatalogAndImmutability(
  pool,
  fixture,
) {
  const columnResult = await pool.query(
    `SELECT attribute.attname AS name,
       pg_catalog.format_type(
         attribute.atttypid,
         attribute.atttypmod
       ) AS type,
       attribute.attnotnull AS "notNull"
     FROM pg_catalog.pg_attribute AS attribute
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = attribute.attrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_boundary_claims'
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped
     ORDER BY attribute.attnum`,
  );
  assert.deepEqual(columnResult.rows, [
    { name: "claim_key", notNull: true, type: "text" },
    { name: "permit_key", notNull: true, type: "text" },
    { name: "operation_key", notNull: true, type: "text" },
    { name: "run_key", notNull: true, type: "text" },
    { name: "tenant_id", notNull: true, type: "bigint" },
    { name: "delivery_key", notNull: true, type: "text" },
    { name: "reservation_key", notNull: true, type: "text" },
    { name: "provider_request_key", notNull: true, type: "text" },
    {
      name: "requested_at",
      notNull: true,
      type: "timestamp with time zone",
    },
    { name: "backend_pid", notNull: true, type: "integer" },
    {
      name: "proved_at",
      notNull: true,
      type: "timestamp with time zone",
    },
    {
      name: "send_before",
      notNull: true,
      type: "timestamp with time zone",
    },
    {
      name: "created_at",
      notNull: true,
      type: "timestamp with time zone",
    },
  ]);

  const foreignKeyResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.confmatchtype AS "matchType",
       constraint_record.confdeltype AS "deleteType",
       constraint_record.confupdtype AS "updateType",
       parent.relname AS "parentTable",
       ARRAY(
         SELECT child_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS child_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS child_attribute
           ON child_attribute.attrelid = constraint_record.conrelid
          AND child_attribute.attnum = child_key.attnum
         ORDER BY child_key.position
       ) AS "childColumns",
       ARRAY(
         SELECT parent_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.confkey)
           WITH ORDINALITY AS parent_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS parent_attribute
           ON parent_attribute.attrelid = constraint_record.confrelid
          AND parent_attribute.attnum = parent_key.attnum
         ORDER BY parent_key.position
       ) AS "parentColumns"
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS child
       ON child.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_class AS parent
       ON parent.oid = constraint_record.confrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = child.relnamespace
     WHERE namespace.nspname = 'public'
       AND child.relname =
         'bot_reply_staging_provider_boundary_claims'
       AND constraint_record.contype = 'f'`,
  );
  assert.deepEqual(foreignKeyResult.rows, [
    {
      childColumns: [
        "permit_key",
        "operation_key",
        "run_key",
        "tenant_id",
        "delivery_key",
        "reservation_key",
        "provider_request_key",
        "requested_at",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_boundary_claims_binding_fk",
      parentColumns: [
        "permit_key",
        "operation_key",
        "run_key",
        "tenant_id",
        "delivery_key",
        "reservation_key",
        "provider_request_key",
        "bound_at",
      ],
      parentTable:
        "bot_reply_staging_credential_provider_request_bindings",
      updateType: "a",
    },
  ]);

  const uniqueResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.contype AS type,
       constraint_record.convalidated AS validated,
       ARRAY(
         SELECT attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS attribute
           ON attribute.attrelid = constraint_record.conrelid
          AND attribute.attnum = key.attnum
         ORDER BY key.position
       ) AS columns
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_boundary_claims'
       AND constraint_record.contype IN ('p', 'u')
     ORDER BY constraint_record.conname`,
  );
  assert.deepEqual(uniqueResult.rows, [
    {
      columns: ["operation_key"],
      name: "bot_reply_staging_boundary_claims_operation_uq",
      type: "u",
      validated: true,
    },
    {
      columns: ["permit_key"],
      name: "bot_reply_staging_boundary_claims_permit_uq",
      type: "u",
      validated: true,
    },
    {
      columns: ["provider_request_key"],
      name: "bot_reply_staging_boundary_claims_request_uq",
      type: "u",
      validated: true,
    },
    {
      columns: ["claim_key"],
      name: "bot_reply_staging_provider_boundary_claims_pkey",
      type: "p",
      validated: true,
    },
  ]);

  const protectionResult = await pool.query(
    `SELECT
       NOT EXISTS (
         SELECT 1
         FROM pg_catalog.aclexplode(
           COALESCE(
             relation.relacl,
             pg_catalog.acldefault('r', relation.relowner)
           )
         ) AS privilege
         WHERE privilege.grantee <> relation.relowner
       ) AS protected,
       ARRAY(
         SELECT trigger.tgname::pg_catalog.text
         FROM pg_catalog.pg_trigger AS trigger
         WHERE trigger.tgrelid = relation.oid
           AND NOT trigger.tgisinternal
         ORDER BY trigger.tgname
       ) AS triggers
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_provider_boundary_claims'`,
  );
  assert.deepEqual(protectionResult.rows, [
    {
      protected: true,
      triggers: [
        "bot_reply_staging_boundary_claims_mutation_guard",
        "bot_reply_staging_boundary_claims_truncate_guard",
      ],
    },
  ]);

  await assertDatabaseError(
    pool.query(
      `UPDATE public.bot_reply_staging_provider_boundary_claims
       SET proved_at = proved_at
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      `DELETE FROM public.bot_reply_staging_provider_boundary_claims
       WHERE permit_key = $1`,
      [fixture.permitKey],
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  await assertDatabaseError(
    pool.query(
      "TRUNCATE public.bot_reply_staging_provider_boundary_claims",
    ),
    /credential-bound pre-send evidence is immutable/,
  );
  assert.equal(
    (await readBoundaryClaimEvidence(pool, fixture)).count,
    1,
  );
}

async function verifyMetaAssetExclusivityCatalog(pool) {
  const constraintResult = await pool.query(
    `SELECT constraint_record.conname AS name,
       constraint_record.contype AS type,
       constraint_record.convalidated AS validated,
       pg_catalog.pg_get_constraintdef(
         constraint_record.oid,
         true
       ) AS definition
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname = 'meta_connections'
       AND constraint_record.conname = ANY($1::TEXT[])
     ORDER BY constraint_record.conname`,
    [[
      "meta_connections_business_portfolio_id_canonical",
      "meta_connections_business_portfolio_uq",
      "meta_connections_phone_number_id_canonical",
      "meta_connections_waba_id_canonical",
    ]],
  );
  assert.equal(constraintResult.rowCount, 4);
  const byName = new Map(
    constraintResult.rows.map((row) => [row.name, row]),
  );
  assert.deepEqual(
    byName.get("meta_connections_business_portfolio_uq"),
    {
      definition: "UNIQUE (business_portfolio_id)",
      name: "meta_connections_business_portfolio_uq",
      type: "u",
      validated: true,
    },
  );
  for (const name of [
    "meta_connections_business_portfolio_id_canonical",
    "meta_connections_phone_number_id_canonical",
    "meta_connections_waba_id_canonical",
  ]) {
    const row = byName.get(name);
    assert.equal(row?.type, "c");
    assert.equal(row?.validated, true);
    assert.match(row?.definition ?? "", /\^\[1-9\]\[0-9\]\{0,63\}\$/);
  }

  const existing = await pool.query(
    `SELECT business_portfolio_id AS portfolio
     FROM public.meta_connections
     ORDER BY tenant_id
     LIMIT 1`,
  );
  assert.equal(existing.rowCount, 1);
  const duplicateTenantId = await createTenant(
    pool,
    "duplicate-meta-portfolio-negative",
  );
  const now = await databaseTimestamp(pool);
  await assertDatabaseError(
    pool.query(
      `INSERT INTO public.meta_connections (
         tenant_id,
         business_portfolio_id,
         waba_id,
         phone_number_id,
         status,
         webhook_subscribed_at,
         connected_at,
         version,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, 'connected', $5, $5, 1, $5, $5)`,
      [
        duplicateTenantId,
        existing.rows[0]?.portfolio,
        metaAssetId("waba", duplicateTenantId),
        metaAssetId("phone", duplicateTenantId),
        now,
      ],
    ),
    /meta_connections_business_portfolio_uq/,
  );

  const invalidTenantId = await createTenant(
    pool,
    "invalid-meta-asset-negative",
  );
  await assertDatabaseError(
    pool.query(
      `INSERT INTO public.meta_connections (
         tenant_id,
         business_portfolio_id,
         waba_id,
         phone_number_id,
         status,
         webhook_subscribed_at,
         connected_at,
         version,
         created_at,
         updated_at
       ) VALUES ($1, 'not-numeric', $2, $3, 'connected',
         $4, $4, 1, $4, $4)`,
      [
        invalidTenantId,
        metaAssetId("waba", invalidTenantId),
        metaAssetId("phone", invalidTenantId),
        now,
      ],
    ),
    /meta_connections_business_portfolio_id_canonical/,
  );
}

async function verifyFunctionCatalogAndAcl(pool) {
  const result = await pool.query(
    `SELECT
       procedure.proname AS name,
       pg_catalog.oidvectortypes(procedure.proargtypes) AS arguments,
       pg_catalog.pg_get_function_result(procedure.oid) AS result,
       procedure.provolatile AS volatility,
       procedure.proparallel AS parallel,
       procedure.prosecdef AS "securityDefiner",
       procedure.proconfig AS configuration,
       NOT EXISTS (
         SELECT 1
         FROM pg_catalog.aclexplode(
           COALESCE(
             procedure.proacl,
             pg_catalog.acldefault('f', procedure.proowner)
           )
         ) AS privilege
         WHERE privilege.grantee <> procedure.proowner
       ) AS protected
     FROM pg_catalog.pg_proc AS procedure
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = procedure.pronamespace
     WHERE namespace.nspname = 'public'
       AND procedure.proname = ANY($1::TEXT[])
     ORDER BY procedure.proname`,
    [[
      "derive_bot_reply_staging_tenant_barrier_key_v1",
      "derive_bot_reply_staging_reconciliation_marker_key_v1",
      "acquire_bot_reply_staging_pre_send_session_barrier_v1",
      "prove_bot_reply_staging_pre_send_session_barrier_v1",
      "release_bot_reply_staging_pre_send_session_barrier_v1",
      consumeFunctionName,
      finalizeFunctionName,
      reconcileFunctionName,
    ]],
  );
  assert.equal(result.rowCount, 8);
  const byName = new Map(result.rows.map((row) => [row.name, row]));
  const immutable = byName.get(
    "derive_bot_reply_staging_tenant_barrier_key_v1",
  );
  assert.equal(immutable?.arguments, "bigint");
  assert.equal(immutable?.result, "bigint");
  assert.equal(immutable?.volatility, "i");
  assert.equal(immutable?.parallel, "s");

  const marker = byName.get(
    "derive_bot_reply_staging_reconciliation_marker_key_v1",
  );
  assert.equal(marker?.arguments, "bigint, text");
  assert.equal(marker?.result, "bigint");
  assert.equal(marker?.volatility, "i");
  assert.equal(marker?.parallel, "s");

  assert.equal(
    byName.get(
      "acquire_bot_reply_staging_pre_send_session_barrier_v1",
    )?.result,
    "TABLE(outcome text)",
  );
  assert.equal(
    byName.get(
      "prove_bot_reply_staging_pre_send_session_barrier_v1",
    )?.result,
    'TABLE(outcome text, "backendPid" integer, "sendBefore" timestamp with time zone)',
  );
  assert.equal(
    byName.get(
      "release_bot_reply_staging_pre_send_session_barrier_v1",
    )?.result,
    'TABLE(outcome text, "releasedCount" integer)',
  );
  assert.equal(
    byName.get(consumeFunctionName)?.result,
    'TABLE(outcome text, "reasonCode" text)',
  );
  for (const name of [finalizeFunctionName, reconcileFunctionName]) {
    assert.equal(
      byName.get(name)?.result,
      'TABLE(outcome text, state text, "providerOutcomeKind" text, "observationKey" text, "finalizedAt" timestamp with time zone)',
    );
  }

  for (const name of [
    "acquire_bot_reply_staging_pre_send_session_barrier_v1",
    "prove_bot_reply_staging_pre_send_session_barrier_v1",
    "release_bot_reply_staging_pre_send_session_barrier_v1",
    consumeFunctionName,
    finalizeFunctionName,
    reconcileFunctionName,
  ]) {
    const row = byName.get(name);
    assert.equal(row?.arguments, "text");
    assert.equal(row?.volatility, "v");
    assert.equal(row?.parallel, "u");
  }
  for (const row of result.rows) {
    assert.equal(row.securityDefiner, false);
    assert.deepEqual(row.configuration, [
      "search_path=pg_catalog, pg_temp",
    ]);
    assert.equal(row.protected, true);
  }
  assert.doesNotMatch(
    byName.get(consumeFunctionName)?.result ?? "",
    /provider.?request/i,
  );
}

async function verifyBindingCatalog(pool) {
  const columnResult = await pool.query(
    `SELECT
       attribute.attname AS name,
       pg_catalog.format_type(
         attribute.atttypid,
         attribute.atttypmod
       ) AS type,
       attribute.attnotnull AS "notNull"
     FROM pg_catalog.pg_attribute AS attribute
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = attribute.attrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_credential_provider_request_bindings'
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped
     ORDER BY attribute.attnum`,
  );
  assert.deepEqual(columnResult.rows, [
    { name: "binding_key", notNull: true, type: "text" },
    { name: "permit_key", notNull: true, type: "text" },
    { name: "consumption_key", notNull: true, type: "text" },
    { name: "run_key", notNull: true, type: "text" },
    { name: "tenant_id", notNull: true, type: "bigint" },
    { name: "run_claim_version", notNull: true, type: "integer" },
    {
      name: "credential_revision",
      notNull: true,
      type: "bigint",
    },
    {
      name: "credential_envelope_digest",
      notNull: true,
      type: "text",
    },
    { name: "credential_event_key", notNull: true, type: "text" },
    { name: "operation_key", notNull: true, type: "text" },
    { name: "operation_kind", notNull: true, type: "text" },
    { name: "delivery_key", notNull: true, type: "text" },
    {
      name: "delivery_claim_version",
      notNull: true,
      type: "integer",
    },
    { name: "reservation_key", notNull: true, type: "text" },
    {
      name: "provider_request_key",
      notNull: true,
      type: "text",
    },
    {
      name: "bound_at",
      notNull: true,
      type: "timestamp with time zone",
    },
    {
      name: "created_at",
      notNull: true,
      type: "timestamp with time zone",
    },
  ]);

  const foreignKeyResult = await pool.query(
    `SELECT
       constraint_record.conname AS name,
       constraint_record.confmatchtype AS "matchType",
       constraint_record.confdeltype AS "deleteType",
       parent.relname AS "parentTable",
       ARRAY(
         SELECT child_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.conkey)
           WITH ORDINALITY AS child_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS child_attribute
           ON child_attribute.attrelid = constraint_record.conrelid
          AND child_attribute.attnum = child_key.attnum
         ORDER BY child_key.position
       ) AS "childColumns",
       ARRAY(
         SELECT parent_attribute.attname::pg_catalog.text
         FROM pg_catalog.unnest(constraint_record.confkey)
           WITH ORDINALITY AS parent_key(attnum, position)
         INNER JOIN pg_catalog.pg_attribute AS parent_attribute
           ON parent_attribute.attrelid = constraint_record.confrelid
          AND parent_attribute.attnum = parent_key.attnum
         ORDER BY parent_key.position
       ) AS "parentColumns"
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS child
       ON child.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_class AS parent
       ON parent.oid = constraint_record.confrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = child.relnamespace
     WHERE namespace.nspname = 'public'
       AND child.relname =
         'bot_reply_staging_credential_provider_request_bindings'
       AND constraint_record.contype = 'f'
     ORDER BY constraint_record.conname`,
  );
  const expectedForeignKeys = [
    {
      childColumns: [
        "consumption_key",
        "permit_key",
        "tenant_id",
        "credential_revision",
        "credential_envelope_digest",
        "credential_event_key",
        "provider_request_key",
        "operation_key",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
        "bound_at",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_request_bindings_consumption_fk",
      parentColumns: [
        "consumption_key",
        "permit_key",
        "tenant_id",
        "credential_revision",
        "credential_envelope_digest",
        "credential_event_key",
        "provider_request_key",
        "operation_key",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
        "consumed_at",
      ],
      parentTable:
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    },
    {
      childColumns: [
        "operation_key",
        "run_key",
        "tenant_id",
        "run_claim_version",
        "operation_kind",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
        "provider_request_key",
        "bound_at",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_request_bindings_operation_fk",
      parentColumns: [
        "operation_key",
        "run_key",
        "tenant_id",
        "run_claim_version",
        "operation_kind",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
        "provider_request_key",
        "requested_at",
      ],
      parentTable: "bot_reply_staging_provider_operations",
    },
    {
      childColumns: [
        "permit_key",
        "tenant_id",
        "credential_revision",
        "credential_envelope_digest",
        "credential_event_key",
        "operation_key",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_request_bindings_permit_fk",
      parentColumns: [
        "permit_key",
        "tenant_id",
        "credential_revision",
        "credential_envelope_digest",
        "credential_event_key",
        "operation_key",
        "delivery_key",
        "delivery_claim_version",
        "reservation_key",
      ],
      parentTable:
        "bot_reply_staging_credential_bound_pre_send_permits",
    },
    {
      childColumns: [
        "provider_request_key",
        "delivery_key",
        "tenant_id",
        "delivery_claim_version",
        "reservation_key",
        "bound_at",
      ],
      deleteType: "r",
      matchType: "s",
      name: "bot_reply_staging_request_bindings_request_fk",
      parentColumns: [
        "request_key",
        "delivery_key",
        "tenant_id",
        "claim_version",
        "reservation_key",
        "requested_at",
      ],
      parentTable: "bot_reply_provider_request_claims",
    },
  ];
  assert.deepEqual(foreignKeyResult.rows, expectedForeignKeys);

  const protectionResult = await pool.query(
    `SELECT
       NOT EXISTS (
         SELECT 1
         FROM pg_catalog.aclexplode(
           COALESCE(
             relation.relacl,
             pg_catalog.acldefault('r', relation.relowner)
           )
         ) AS privilege
         WHERE privilege.grantee <> relation.relowner
       ) AS protected,
       ARRAY(
         SELECT trigger.tgname::pg_catalog.text
         FROM pg_catalog.pg_trigger AS trigger
         WHERE trigger.tgrelid = relation.oid
           AND NOT trigger.tgisinternal
         ORDER BY trigger.tgname
       ) AS triggers
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname =
         'bot_reply_staging_credential_provider_request_bindings'`,
  );
  assert.deepEqual(protectionResult.rows, [
    {
      protected: true,
      triggers: [
        "bot_reply_staging_request_bindings_mutation_guard",
        "bot_reply_staging_request_bindings_truncate_guard",
      ],
    },
  ]);

  const addedConstraintResult = await pool.query(
    `SELECT relation.relname AS table, constraint_record.conname AS name,
       constraint_record.contype AS type
     FROM pg_catalog.pg_constraint AS constraint_record
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = constraint_record.conrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND constraint_record.conname = ANY($1::TEXT[])
     ORDER BY constraint_record.conname`,
    [[
      "bot_reply_provider_requests_prepared_exact_uq",
      "bot_reply_staging_consumptions_request_binding_uq",
      "bot_reply_staging_pre_send_resolutions_outcome_valid",
      "bot_reply_staging_provider_ops_credential_exact_uq",
    ]],
  );
  assert.deepEqual(addedConstraintResult.rows, [
    {
      name: "bot_reply_provider_requests_prepared_exact_uq",
      table: "bot_reply_provider_request_claims",
      type: "u",
    },
    {
      name: "bot_reply_staging_consumptions_request_binding_uq",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
      type: "u",
    },
    {
      name: "bot_reply_staging_pre_send_resolutions_outcome_valid",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
      type: "c",
    },
    {
      name: "bot_reply_staging_provider_ops_credential_exact_uq",
      table: "bot_reply_staging_provider_operations",
      type: "u",
    },
  ]);
}

async function verifyNoResidualDatabaseLocks(pool) {
  const result = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_locks AS lock
     WHERE lock.locktype = 'advisory'
       AND lock.database = (
         SELECT database_record.oid
         FROM pg_catalog.pg_database AS database_record
         WHERE database_record.datname = pg_catalog.current_database()
       )`,
  );
  assert.deepEqual(result.rows, [{ count: 0 }]);
}

export async function verifyBotReplySessionBarrierPostgres(
  connectionString,
) {
  const checkedUrl = requireLocalBotReplySessionBarrierVerifierUrl(
    connectionString,
  );
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
    max: 8,
  });
  let cleanupAuthorized = false;

  try {
    const identityResult = await pool.query(
      `SELECT
         pg_catalog.current_database() AS database,
         pg_catalog.current_setting('server_version') AS version`,
    );
    assert.deepEqual(
      identityResult.rows.map(({ database }) => database),
      [requiredDatabaseName],
    );
    assert.match(identityResult.rows[0]?.version, /^16\./);
    await requireEmptyPublicSchema(pool);
    cleanupAuthorized = true;

    const { files } = await applyAllMigrationsWithLegacyFixture(pool);

    const barrierFixture = await createIsolatedPermit(
      pool,
      "barrier-semantics",
    );
    await verifyBarrierSemantics(pool, barrierFixture);

    const committedFixture = await createIsolatedPermit(
      pool,
      "atomic-commit-lost-ack",
    );
    await verifyAtomicCommitReplayAndDurableFinalization(
      pool,
      committedFixture,
    );

    const rollbackFixture = await createIsolatedPermit(
      pool,
      "rollback-retry",
    );
    await verifyRollbackAndRetry(pool, rollbackFixture);

    const indeterminateFixture = await createIsolatedPermit(
      pool,
      "indeterminate-reconciliation",
    );
    await verifyIndeterminateReconciliation(
      pool,
      indeterminateFixture,
    );
    await verifyOperationKindMatrix(pool);
    await verifyDynamicSafetyDenials(pool);
    await verifyBindingLedgerImmutability(pool, committedFixture);
    await verifyBoundaryClaimCatalogAndImmutability(
      pool,
      committedFixture,
    );
    await verifyUncertaintyCatalogAndImmutability(
      pool,
      indeterminateFixture,
    );
    await verifyMetaAssetExclusivityCatalog(pool);
    await verifyFunctionCatalogAndAcl(pool);
    await verifyBindingCatalog(pool);
    await verifyLeaseExpiryUncertainty(pool);
    await verifyNoResidualDatabaseLocks(pool);

    return Object.freeze({
      activation: "NO-GO",
      aclAndCatalogVerified: true,
      atomicCommitAndVisibility: true,
      barrierSemantics: true,
      durableFinalizationAndReconciliation: true,
      dynamicSafetyDenialCount: 8,
      lostAcknowledgementEvidence: "simulated-only",
      migrationCount: files.length,
      nonterminalUncertaintyEvidence: true,
      operationKindMatrix: true,
      repeatabilityCleanup: true,
      rollbackRetry: true,
      sharedMetaAssetCrossTenantCooldownEvidence:
        "schema-exclusivity-proven-runtime-subject-derivation-not-proven",
    });
  } finally {
    try {
      if (cleanupAuthorized) {
        await cleanupDedicatedVerifierDatabase(pool);
      }
    } finally {
      await pool.end();
    }
  }
}

async function main() {
  const connectionString = process.env[environmentKey];
  if (!connectionString) fail("URL_MISSING");
  const result = await verifyBotReplySessionBarrierPostgres(
    connectionString,
  );
  process.stdout.write(
    "PostgreSQL credential-bound pre-send session barrier: PASS (" +
      `${result.migrationCount} migrations; pinned session lock, atomic ` +
      "commit/rollback, replay without capability, durable finalization, " +
      "safety denials, immutability and exact ACL/catalog verified; " +
      "lost ACK is simulated only; shared-Meta cross-tenant cooldown " +
      "schema exclusivity is proven but runtime subject derivation " +
      "remains an activation blocker; activation NO-GO)\n",
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";
if (import.meta.url === invokedPath) {
  await main();
}
