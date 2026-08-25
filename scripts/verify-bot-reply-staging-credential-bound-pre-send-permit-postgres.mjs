import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationDirectory = join(projectRoot, "postgres", "migrations");
const environmentKey =
  "CONNECT_POSTGRES_BOT_REPLY_CREDENTIAL_BOUND_PERMIT_URL";
const requiredDatabaseName =
  "connect_bot_reply_credential_bound_permit";
const migrationNamePattern = /^(\d{4})_[a-z0-9_]+\.sql$/;
const credentialMigrationName =
  "0054_meta_credential_revision_ledger.sql";
const permitMigrationName =
  "0055_bot_reply_staging_credential_bound_pre_send_permit.sql";
const graphApiVersion = "v24.0";
const actorExternalUserId = "credential-bound-permit-verifier";

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
  throw new Error(`BOT_REPLY_CREDENTIAL_BOUND_PERMIT_${code}`);
}

export function requireLocalBotReplyCredentialBoundPermitVerifierUrl(
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
    `d31-d1d-b-b2a1:${tenantId}:${label}`,
  )}`;
}

function providerAuditKey(runKey, requestDigest) {
  const value = createHash("sha256")
    .update(runKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
}

function inputOnlyPermitKey(input) {
  const value = createHash("sha256")
    .update(
      "connect-bot-reply-staging-credential-bound-permit-v1",
      "utf8",
    )
    .update("\0", "utf8")
    .update(input.runBindingKey, "utf8")
    .update("\0", "utf8")
    .update(input.admissionBindingKey, "utf8")
    .update("\0", "utf8")
    .update(input.requestDigest, "utf8")
    .update("\0", "utf8")
    .update(input.operationKey, "utf8")
    .update("\0", "utf8")
    .update(input.deliveryKey, "utf8")
    .update("\0", "utf8")
    .update(String(input.deliveryClaimVersion), "utf8")
    .update("\0", "utf8")
    .update(input.reservationKey, "utf8")
    .digest("hex");
  return `bot_reply_staging_pre_send_permit_v1_${value}`;
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

async function migrationInventory() {
  const files = (await readdir(migrationDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  assert.equal(files.length, 56);
  assert.equal(files.at(-2), credentialMigrationName);
  assert.equal(files.at(-1), permitMigrationName);
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
  assert.equal(
    identityResult.rows[0]?.database,
    requiredDatabaseName,
  );
  assert.equal(
    ["127.0.0.1", "::1"].includes(
      identityResult.rows[0]?.address,
    ),
    true,
  );
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await requireEmptyPublicSchema(pool);
}

async function assertDatabaseError(promise, pattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof Error, true);
    assert.match(error.message, pattern);
    return true;
  });
}

async function createTenant(pool) {
  const result = await pool.query(
    `INSERT INTO public.tenants (display_name, status)
     VALUES ('B2a1 PostgreSQL verifier', 'active')
     RETURNING id::integer AS id`,
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

async function createLegacySafetyScope(pool) {
  const tenantId = await createTenant(pool);
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
      `portfolio-${tenantId}`,
      `waba-${tenantId}`,
      `phone-number-${tenantId}`,
      connectedAt,
      connectionCreatedAt,
    ],
  );

  const credential = await storeEnvelope(
    pool,
    tenantId,
    envelopeA,
  );
  assert.equal(credential.credentialRevision, 1);

  const recordedAt = await databaseTimestamp(pool);
  const evidenceCheckedAt = offsetTimestamp(recordedAt, -1_000);
  const evidenceExpiresAt = offsetTimestamp(recordedAt, 3_600_000);
  const policyEventKey = identity(
    "whatsapp_delivery_policy_event_v1_",
    tenantId,
    "policy:1",
  );
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
       $1, $2, 1, 1, 'enabled', 'bounded', 250, 60, $3,
       $4, $5, $6, $7, $8, $8, 1000, 100
     )`,
    [
      policyEventKey,
      tenantId,
      graphApiVersion,
      sha256Hex(`policy-evidence:${tenantId}`),
      evidenceCheckedAt,
      evidenceExpiresAt,
      actorExternalUserId,
      recordedAt,
    ],
  );

  const recipientFingerprint = digest(
    `recipient:${tenantId}`,
  );
  const rateLimitMethodFingerprint = digest(
    `rate-limit-method:${tenantId}`,
  );
  const legacyAuthorizationEventKey = identity(
    "bot_reply_staging_authorization_v1_",
    tenantId,
    "authorization:legacy",
  );
  await insertAuthorization(pool, {
    authorizationVersion: 1,
    eventKey: legacyAuthorizationEventKey,
    includeCredentialBinding: false,
    policyVersion: 1,
    rateLimitMethodFingerprint,
    recipientFingerprint,
    tenantId,
  });

  return Object.freeze({
    connectionVersion: 1,
    credential,
    evidenceCheckedAt,
    evidenceExpiresAt,
    legacyAuthorizationEventKey,
    policyEventKey,
    policyVersion: 1,
    rateLimitMethodFingerprint,
    recipientFingerprint,
    tenantId,
  });
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
       $1, $2, $3, 'approved', 'staging',
       'approved-staging-waba', 1, $4, $5, true, $6, $7,
       'tal', $6, $7, $8, $9, $10, $10
     )
     ${returningClause}`,
    [
      input.eventKey,
      input.tenantId,
      input.authorizationVersion,
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

async function applyAllMigrationsWithLegacyAuthorization(pool) {
  const files = await migrationInventory();
  let safety = null;

  for (const fileName of files) {
    if (fileName === permitMigrationName) {
      safety = await createLegacySafetyScope(pool);
    }
    const source = await readFile(
      join(migrationDirectory, fileName),
      "utf8",
    );
    await pool.query(source);
  }

  assert.notEqual(safety, null);
  return Object.freeze({ files, safety });
}

function createClaimInput(safety, label, authorizationEventKey) {
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
    artifactDigest: digest(
      `artifact:${safety.tenantId}:${label}`,
    ),
    auditKey: providerAuditKey(runKey, requestDigest),
    authorizationEventKey,
    commitSha: sha256Hex(
      `commit:${safety.tenantId}:${label}`,
    ).slice(0, 40),
    connectionVersion: safety.connectionVersion,
    graphApiVersion,
    leaseDurationSeconds: 60,
    policyVersion: safety.policyVersion,
    rateLimitMethodFingerprint:
      safety.rateLimitMethodFingerprint,
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

async function createDeliverySource(pool, safety) {
  const now = await databaseTimestamp(pool);
  const contactResult = await pool.query(
    `INSERT INTO public.contacts (
       tenant_id,
       phone_e164,
       mailing_status,
       consent_status
     ) VALUES ($1, $2, 'unsubscribed', 'unknown')
     RETURNING id::integer AS id`,
    [safety.tenantId, `+1555000${String(safety.tenantId).padStart(4, "0")}`],
  );
  const contactId = contactResult.rows[0]?.id;
  assert.equal(Number.isSafeInteger(contactId), true);

  const conversationKey = identity(
    "conversation_v1_",
    safety.tenantId,
    "conversation",
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
    "inbound-message",
  );
  const occurredAt = offsetTimestamp(now, -60_000);
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
      `inbound-provider-${safety.tenantId}`,
      occurredAt,
    ],
  );

  const botFlowKey = identity(
    "bot_flow_v1_",
    safety.tenantId,
    "flow",
  );
  const botFlowVersionKey = identity(
    "bot_flow_version_v1_",
    safety.tenantId,
    "flow-version",
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
) {
  const runBindingResult = await pool.query(
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
  assert.equal(runBindingResult.rowCount, 1);
  const runBinding = runBindingResult.rows[0];
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
  assert.match(
    runBinding.credentialEnvelopeDigest,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.match(
    runBinding.credentialEventKey,
    /^meta_credential_revision_v1_[a-f0-9]{64}$/,
  );

  const databaseNow = await databaseTimestamp(pool);
  const deliveryKey = identity(
    "bot_reply_delivery_v1_",
    safety.tenantId,
    `${label}:delivery`,
  );
  const replyIndexResult = await pool.query(
    `SELECT coalesce(pg_catalog.max(reply_index), 0)::integer + 1
       AS "replyIndex"
     FROM public.bot_reply_deliveries
     WHERE tenant_id = $1
       AND inbound_message_key = $2`,
    [safety.tenantId, source.inboundMessageKey],
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
       $1, $2, $3, $4, $5, $6, $7, '+15550123456',
       $8::jsonb, 'sending', 1, NULL, NULL, NULL, $9, $9,
       $10, 1, NULL, NULL, NULL
     )`,
    [
      deliveryKey,
      safety.tenantId,
      source.conversationKey,
      source.inboundMessageKey,
      source.botFlowKey,
      source.botFlowVersionKey,
      replyIndex,
      JSON.stringify({ type: "text", text: "Verifier reply" }),
      databaseNow,
      `phone-number-${safety.tenantId}`,
    ],
  );

  const reservationKey = identity(
    "whatsapp_rate_reservation_v1_",
    safety.tenantId,
    `${label}:reservation`,
  );
  const reservedAt = databaseNow;
  const pairReservedUntil = offsetTimestamp(reservedAt, 6_000);
  const reservationLifetimeMilliseconds = label.endsWith(
    "reservation-expired",
  )
    ? 6_000
    : 120_000;
  const reservationExpiresAt = offsetTimestamp(
    databaseNow,
    reservationLifetimeMilliseconds,
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
       $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
       $21, $22, $22
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
      1,
      reservationKey,
      senderKey,
      recipientKey,
      safety.policyEventKey,
      1000,
      100,
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
    reservationKey,
    runBinding,
  });
}

function createReserveInput(
  safety,
  label,
  claimInput,
  claimedRun,
  delivery,
) {
  return Object.freeze({
    artifactDigest: claimInput.artifactDigest,
    admissionBindingKey: delivery.admissionBindingKey,
    auditKey: claimInput.auditKey,
    commitSha: claimInput.commitSha,
    deliveryClaimVersion: delivery.deliveryClaimVersion,
    deliveryKey: delivery.deliveryKey,
    operationKey: identity(
      "bot_reply_staging_step_v1_",
      safety.tenantId,
      `${label}:operation`,
    ),
    operationKind: "text-send",
    releaseId: claimInput.releaseId,
    requestDigest: claimInput.requestDigest,
    reservationKey: delivery.reservationKey,
    runBindingKey: claimedRun.runBindingKey,
    runClaimVersion: claimedRun.claimVersion,
    runKey: claimInput.runKey,
    runLeaseExpiresAt: canonicalTimestamp(
      claimedRun.leaseExpiresAt,
    ),
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
  const result = await client.query(
    reserveSql,
    reserveArguments(input),
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0]?.permitKey ?? null;
}

async function createPermitFixture(
  pool,
  safety,
  source,
  authorizationEventKey,
  label,
) {
  const claimInput = createClaimInput(
    safety,
    label,
    authorizationEventKey,
  );
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
  );
  const reserveInput = createReserveInput(
    safety,
    label,
    claimInput,
    claimedRun,
    delivery,
  );
  return Object.freeze({
    claimInput,
    claimedRun,
    delivery,
    reserveInput,
  });
}

async function verifyLegacyAndCredentialBinding(pool, safety) {
  const legacyResult = await pool.query(
    `SELECT
       credential_revision AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey"
     FROM public.bot_reply_staging_authorization_events
     WHERE event_key = $1`,
    [safety.legacyAuthorizationEventKey],
  );
  assert.deepEqual(legacyResult.rows, [
    {
      credentialRevision: null,
      credentialEnvelopeDigest: null,
      credentialEventKey: null,
    },
  ]);

  const legacyClaimInput = createClaimInput(
    safety,
    "legacy-ineligible",
    safety.legacyAuthorizationEventKey,
  );
  await assertDatabaseError(
    claim(pool, legacyClaimInput),
    /credential-bound claim lacks current safety evidence/,
  );
  const rolledBackLegacyRun = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_runs
     WHERE run_key = $1`,
    [legacyClaimInput.runKey],
  );
  assert.deepEqual(rolledBackLegacyRun.rows, [{ count: 0 }]);

  const boundAuthorizationEventKey = identity(
    "bot_reply_staging_authorization_v1_",
    safety.tenantId,
    "authorization:bound:1",
  );
  const bound = await insertAuthorization(pool, {
    authorizationVersion: 2,
    eventKey: boundAuthorizationEventKey,
    includeCredentialBinding: true,
    policyVersion: safety.policyVersion,
    rateLimitMethodFingerprint:
      safety.rateLimitMethodFingerprint,
    recipientFingerprint: safety.recipientFingerprint,
    tenantId: safety.tenantId,
  });
  assert.equal(
    bound.credentialRevision,
    safety.credential.credentialRevision,
  );
  assert.equal(
    bound.credentialEnvelopeDigest,
    safety.credential.envelopeDigest,
  );
  assert.match(
    bound.credentialEventKey,
    /^meta_credential_revision_v1_[a-f0-9]{64}$/,
  );

  const exactEventResult = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.meta_credential_revision_events
     WHERE event_key = $1
       AND tenant_id = $2
       AND credential_revision = $3
       AND envelope_digest = $4`,
    [
      bound.credentialEventKey,
      safety.tenantId,
      bound.credentialRevision,
      bound.credentialEnvelopeDigest,
    ],
  );
  assert.deepEqual(exactEventResult.rows, [{ count: 1 }]);

  const spoofedEventKey = identity(
    "bot_reply_staging_authorization_v1_",
    safety.tenantId,
    "authorization:spoofed",
  );
  await assertDatabaseError(
    pool.query(
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
         created_at,
         credential_revision,
         credential_envelope_digest,
         credential_event_key
       ) SELECT
         $1, tenant_id, 3, status, environment, connection_mode,
         connection_version, policy_version, recipient_fingerprint,
         recipient_opt_in_recorded, recipient_opt_in_recorded_at,
         recipient_expires_at, rate_limit_approved_by,
         rate_limit_approved_at, rate_limit_expires_at,
         rate_limit_method_fingerprint, actor_external_user_id,
         pg_catalog.date_trunc(
           'milliseconds',
           pg_catalog.clock_timestamp()
         ),
         pg_catalog.date_trunc(
           'milliseconds',
           pg_catalog.clock_timestamp()
         ),
         credential_revision,
         credential_envelope_digest,
         credential_event_key
       FROM public.bot_reply_staging_authorization_events
       WHERE event_key = $2`,
      [spoofedEventKey, boundAuthorizationEventKey],
    ),
    /credential identity is DB-derived/,
  );

  return Object.freeze({
    authorizationEventKey: boundAuthorizationEventKey,
    authorizationVersion: 2,
    credentialEventKey: bound.credentialEventKey,
  });
}

async function verifyClaimContract(
  pool,
  safety,
  authorizationEventKey,
) {
  const input = createClaimInput(
    safety,
    "claim-contract",
    authorizationEventKey,
  );
  const before = await databaseTimestamp(pool);
  const first = await claim(pool, input);
  const after = await databaseTimestamp(pool);
  assert.equal(first.outcome, "claimed");
  assert.equal(first.runKey, input.runKey);
  assert.equal(first.requestDigest, input.requestDigest);
  assert.equal(first.auditKey, input.auditKey);
  assert.equal(first.claimVersion, 1);
  assert.match(
    first.runBindingKey,
    /^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$/,
  );
  const leaseExpiresAt = canonicalTimestamp(first.leaseExpiresAt);
  assert.equal(
    Date.parse(leaseExpiresAt) >= Date.parse(before) + 60_000,
    true,
  );
  assert.equal(
    Date.parse(leaseExpiresAt) <= Date.parse(after) + 60_000,
    true,
  );

  const bindingResult = await pool.query(
    `SELECT
       run_key AS "runKey",
       run_claim_version::integer AS "runClaimVersion",
       authorization_event_key AS "authorizationEventKey",
       credential_revision::integer AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey",
       bound_at AS "boundAt"
     FROM public.bot_reply_staging_run_credential_bindings
     WHERE binding_key = $1`,
    [first.runBindingKey],
  );
  assert.equal(bindingResult.rowCount, 1);
  const binding = bindingResult.rows[0];
  assert.equal(binding.runKey, input.runKey);
  assert.equal(binding.runClaimVersion, 1);
  assert.equal(binding.authorizationEventKey, authorizationEventKey);
  assert.equal(
    Date.parse(canonicalTimestamp(binding.boundAt)) >=
      Date.parse(before),
    true,
  );
  assert.equal(
    Date.parse(canonicalTimestamp(binding.boundAt)) <=
      Date.parse(after),
    true,
  );

  const replay = await claim(pool, input);
  assert.deepEqual(
    {
      outcome: replay.outcome,
      runBindingKey: replay.runBindingKey,
    },
    { outcome: "in-progress", runBindingKey: null },
  );

  const conflictingRequestDigest = digest(
    `request:${safety.tenantId}:claim-conflict`,
  );
  const conflictInput = Object.freeze({
    ...input,
    auditKey: providerAuditKey(
      input.runKey,
      conflictingRequestDigest,
    ),
    requestDigest: conflictingRequestDigest,
  });
  const conflict = await claim(pool, conflictInput);
  assert.deepEqual(
    {
      outcome: conflict.outcome,
      runBindingKey: conflict.runBindingKey,
    },
    { outcome: "conflict", runBindingKey: null },
  );

  return Object.freeze({ binding, first, input });
}

async function verifyRotationInvalidation(
  pool,
  safety,
  source,
  oldAuthorizationEventKey,
  oldClaim,
) {
  const delivery = await createDeliveryAndReservation(
    pool,
    safety,
    source,
    "rotation-old-run",
    oldClaim.input,
    oldClaim.first,
  );
  const oldReserveInput = createReserveInput(
    safety,
    "rotation-old-run",
    oldClaim.input,
    oldClaim.first,
    delivery,
  );
  const rotatedCredential = await storeEnvelope(
    pool,
    safety.tenantId,
    envelopeB,
  );
  assert.equal(rotatedCredential.credentialRevision, 2);
  assert.notEqual(
    rotatedCredential.envelopeDigest,
    safety.credential.envelopeDigest,
  );

  await assertDatabaseError(
    reserve(pool, oldReserveInput),
    /permit credential changed/,
  );
  const permitCount = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_credential_bound_pre_send_permits
     WHERE operation_key = $1`,
    [oldReserveInput.operationKey],
  );
  assert.deepEqual(permitCount.rows, [{ count: 0 }]);

  const oldAuthorizationClaim = createClaimInput(
    safety,
    "rotation-old-authorization",
    oldAuthorizationEventKey,
  );
  await assertDatabaseError(
    claim(pool, oldAuthorizationClaim),
    /credential-bound claim lacks current safety evidence/,
  );

  const currentAuthorizationEventKey = identity(
    "bot_reply_staging_authorization_v1_",
    safety.tenantId,
    "authorization:bound:2",
  );
  const currentAuthorization = await insertAuthorization(pool, {
    authorizationVersion: 3,
    eventKey: currentAuthorizationEventKey,
    includeCredentialBinding: true,
    policyVersion: safety.policyVersion,
    rateLimitMethodFingerprint:
      safety.rateLimitMethodFingerprint,
    recipientFingerprint: safety.recipientFingerprint,
    tenantId: safety.tenantId,
  });
  assert.equal(currentAuthorization.credentialRevision, 2);
  assert.equal(
    currentAuthorization.credentialEnvelopeDigest,
    rotatedCredential.envelopeDigest,
  );
  assert.notEqual(
    currentAuthorization.credentialEventKey,
    oldClaim.binding.credentialEventKey,
  );

  return Object.freeze({
    authorizationEventKey: currentAuthorizationEventKey,
    authorizationVersion: 3,
    credential: rotatedCredential,
  });
}

async function readPermitSideEffectCounts(pool, reserveInput) {
  const result = await pool.query(
    `SELECT
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_credential_bound_pre_send_permits
         WHERE operation_key = $1
       ) AS permits,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_provider_request_claims
         WHERE delivery_key = $2
           OR reservation_key = $3
       ) AS "providerRequests",
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
       ) AS consumptions,
       (
         SELECT pg_catalog.count(*)::integer
         FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
       ) AS resolutions`,
    [
      reserveInput.operationKey,
      reserveInput.deliveryKey,
      reserveInput.reservationKey,
    ],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function verifyOneShotPermit(
  pool,
  safety,
  source,
  authorizationEventKey,
) {
  const fixture = await createPermitFixture(
    pool,
    safety,
    source,
    authorizationEventKey,
    "one-shot",
  );
  const before = await databaseTimestamp(pool);
  const permitKey = await reserve(pool, fixture.reserveInput);
  const after = await databaseTimestamp(pool);
  assert.match(
    permitKey,
    /^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$/,
  );
  const replay = await reserve(pool, fixture.reserveInput);
  assert.equal(replay, null);

  const permitResult = await pool.query(
    `SELECT
       permit_key AS "permitKey",
       credential_revision::integer AS "credentialRevision",
       credential_envelope_digest AS "credentialEnvelopeDigest",
       credential_event_key AS "credentialEventKey",
       reserved_at AS "reservedAt",
       permit_expires_at AS "permitExpiresAt"
     FROM public.bot_reply_staging_credential_bound_pre_send_permits
     WHERE permit_key = $1`,
    [permitKey],
  );
  assert.equal(permitResult.rowCount, 1);
  const permit = permitResult.rows[0];
  const reservedAt = canonicalTimestamp(permit.reservedAt);
  const permitExpiresAt = canonicalTimestamp(permit.permitExpiresAt);
  assert.equal(Date.parse(reservedAt) >= Date.parse(before), true);
  assert.equal(Date.parse(reservedAt) <= Date.parse(after), true);
  assert.equal(Date.parse(permitExpiresAt) > Date.parse(reservedAt), true);
  assert.equal(
    Date.parse(permitExpiresAt) <= Date.parse(reservedAt) + 30_000,
    true,
  );

  assert.deepEqual(
    await readPermitSideEffectCounts(pool, fixture.reserveInput),
    {
      permits: 1,
      providerRequests: 0,
      consumptions: 0,
      resolutions: 0,
    },
  );

  return Object.freeze({
    fixture,
    inputOnlyDerivedKey: inputOnlyPermitKey(
      fixture.reserveInput,
    ),
    permit,
    permitKey,
  });
}

async function expectReserveFailure(
  pool,
  safety,
  source,
  authorizationEventKey,
  label,
  mutate,
  pattern,
) {
  const fixture = await createPermitFixture(
    pool,
    safety,
    source,
    authorizationEventKey,
    `failure:${label}`,
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await mutate(client, fixture);
    await assertDatabaseError(
      reserve(client, fixture.reserveInput),
      pattern,
    );
  } finally {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  const count = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_credential_bound_pre_send_permits
     WHERE operation_key = $1`,
    [fixture.reserveInput.operationKey],
  );
  assert.deepEqual(count.rows, [{ count: 0 }]);
}

async function verifyFailureFences(
  pool,
  safety,
  source,
  authorizationEventKey,
) {
  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "expired-run",
    async (client, fixture) => {
      const now = await databaseTimestamp(client);
      await client.query(
        `ALTER TABLE public.bot_reply_staging_runs
         DISABLE TRIGGER bot_reply_staging_runs_update_guard`,
      );
      await client.query(
        `UPDATE public.bot_reply_staging_runs
         SET lease_expires_at = $2,
             updated_at = $3
         WHERE run_key = $1`,
        [
          fixture.claimInput.runKey,
          offsetTimestamp(now, -1),
          now,
        ],
      );
      await client.query(
        `ALTER TABLE public.bot_reply_staging_runs
         ENABLE TRIGGER bot_reply_staging_runs_update_guard`,
      );
    },
    /permit lacks exact active run/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "kill-switch",
    async (client, fixture) => {
      const observedAt = await databaseTimestamp(client);
      await client.query(
        `INSERT INTO public.bot_reply_staging_observation_events (
           event_key,
           run_key,
           claim_version,
           operation_key,
           delivery_key,
           subject_delivery_key,
           case_name,
           fact_kind,
           dispatch_outcome,
           provider_request_count,
           disabled_policy_version,
           policy_state,
           recipient_fingerprint,
           observed_at,
           created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $5, 'kill-switch', 'kill-switch',
           'rejected', 0, $6, 'disabled', $7, $8, $8
         )`,
        [
          identity(
            "bot_reply_staging_observation_v1_",
            safety.tenantId,
            "failure:kill-switch:observation",
          ),
          fixture.claimInput.runKey,
          fixture.claimedRun.claimVersion,
          identity(
            "bot_reply_staging_step_v1_",
            safety.tenantId,
            "failure:kill-switch:observation-operation",
          ),
          fixture.delivery.deliveryKey,
          safety.policyVersion + 1,
          safety.recipientFingerprint,
          observedAt,
        ],
      );
    },
    /permit policy is disabled/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "service-window",
    async (client) => {
      const now = await databaseTimestamp(client);
      await client.query(
        `UPDATE public.messages
         SET occurred_at = $2,
             status_updated_at = $2
         WHERE tenant_id = $1
           AND message_key = $3`,
        [
          safety.tenantId,
          offsetTimestamp(now, -86_400_001),
          source.inboundMessageKey,
        ],
      );
    },
    /permit service window is closed/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "connection",
    async (client) => {
      const now = await databaseTimestamp(client);
      await client.query(
        `UPDATE public.meta_connections
         SET status = 'restricted',
             version = version + 1,
             updated_at = $2
         WHERE tenant_id = $1`,
        [safety.tenantId, now],
      );
    },
    /permit connection changed/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "policy",
    async (client) => {
      const recordedAt = await databaseTimestamp(client);
      await client.query(
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
         ) SELECT
           $1,
           tenant_id,
           connection_version,
           2,
           'disabled',
           portfolio_limit_kind,
           portfolio_limit_value,
           reservation_duration_seconds,
           meta_graph_api_version,
           evidence_digest,
           evidence_checked_at,
           evidence_expires_at,
           $2,
           $3,
           $3,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         FROM public.whatsapp_campaign_delivery_policy_events
         WHERE event_key = $4`,
        [
          identity(
            "whatsapp_delivery_policy_event_v1_",
            safety.tenantId,
            "failure:policy:disable",
          ),
          actorExternalUserId,
          recordedAt,
          safety.policyEventKey,
        ],
      );
    },
    /permit policy is disabled/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "delivery",
    async (client, fixture) => {
      const now = await databaseTimestamp(client);
      await client.query(
        `UPDATE public.bot_reply_deliveries
         SET status = 'pending',
             attempt_count = 0,
             next_attempt_at = $2,
             deferred_at = $3,
             last_deferral_reason_code = 'VERIFIER_DEFERRED',
             updated_at = $3
         WHERE delivery_key = $1`,
        [
          fixture.delivery.deliveryKey,
          offsetTimestamp(now, 10_000),
          now,
        ],
      );
    },
    /permit delivery is stale/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "reservation-expired",
    async (client, fixture) => {
      await client.query(
        `SELECT pg_catalog.pg_sleep(
           GREATEST(
             0,
             EXTRACT(
               epoch FROM pair_reserved_until -
                 pg_catalog.clock_timestamp()
             ) + 0.01
           )
         )
         FROM public.whatsapp_rate_limit_reservations
         WHERE reservation_key = $1`,
        [fixture.delivery.reservationKey],
      );
      const expiryResult = await client.query(
        `SELECT reservation_expires_at <=
           pg_catalog.clock_timestamp() AS expired
         FROM public.whatsapp_rate_limit_reservations
         WHERE reservation_key = $1`,
        [fixture.delivery.reservationKey],
      );
      assert.deepEqual(expiryResult.rows, [{ expired: true }]);
    },
    /permit reservation is stale/,
  );

  await expectReserveFailure(
    pool,
    safety,
    source,
    authorizationEventKey,
    "reservation-settled",
    async (client, fixture) => {
      const now = await databaseTimestamp(client);
      await client.query(
        `INSERT INTO public.whatsapp_rate_limit_settlements (
           reservation_key,
           outcome,
           settled_at,
           created_at
         ) VALUES ($1, 'cancelled-before-submit', $2, $2)`,
        [fixture.delivery.reservationKey, now],
      );
    },
    /permit reservation is stale/,
  );
}

async function verifyIsolationAndScopeDenial(
  pool,
  safety,
  source,
  authorizationEventKey,
) {
  const isolationClaimInput = createClaimInput(
    safety,
    "isolation:claim",
    authorizationEventKey,
  );
  const claimClient = await pool.connect();
  try {
    await claimClient.query(
      "BEGIN ISOLATION LEVEL REPEATABLE READ",
    );
    await assertDatabaseError(
      claim(claimClient, isolationClaimInput),
      /claim requires read committed isolation/,
    );
  } finally {
    try {
      await claimClient.query("ROLLBACK");
    } finally {
      claimClient.release();
    }
  }
  const isolationClaimCount = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.bot_reply_staging_runs
     WHERE run_key = $1`,
    [isolationClaimInput.runKey],
  );
  assert.deepEqual(isolationClaimCount.rows, [{ count: 0 }]);

  const isolationPermit = await createPermitFixture(
    pool,
    safety,
    source,
    authorizationEventKey,
    "isolation:permit",
  );
  const reserveClient = await pool.connect();
  try {
    await reserveClient.query(
      "BEGIN ISOLATION LEVEL REPEATABLE READ",
    );
    await assertDatabaseError(
      reserve(reserveClient, isolationPermit.reserveInput),
      /permit requires read committed isolation/,
    );
  } finally {
    try {
      await reserveClient.query("ROLLBACK");
    } finally {
      reserveClient.release();
    }
  }

  const firstScope = await createPermitFixture(
    pool,
    safety,
    source,
    authorizationEventKey,
    "scope:first",
  );
  const secondScope = await createPermitFixture(
    pool,
    safety,
    source,
    authorizationEventKey,
    "scope:second",
  );
  const runBindingMismatchInput = Object.freeze({
    ...firstScope.reserveInput,
    runClaimVersion: secondScope.reserveInput.runClaimVersion,
    runKey: secondScope.reserveInput.runKey,
  });
  assert.equal(
    runBindingMismatchInput.runBindingKey,
    firstScope.reserveInput.runBindingKey,
  );
  assert.notEqual(
    runBindingMismatchInput.runKey,
    firstScope.reserveInput.runKey,
  );
  assert.equal(
    runBindingMismatchInput.runKey,
    secondScope.reserveInput.runKey,
  );
  const tenantBarrierHolder = await pool.connect();
  const runMismatchClient = await pool.connect();
  let tenantBarrierHeld = false;
  try {
    await tenantBarrierHolder.query(
      `SELECT pg_catalog.pg_advisory_lock(
         pg_catalog.hashtextextended(
           'connect-bot-reply-tenant-barrier-v1:' ||
             $1::pg_catalog.TEXT,
           0
         )
       )`,
      [safety.tenantId],
    );
    tenantBarrierHeld = true;
    await runMismatchClient.query("BEGIN");
    try {
      await runMismatchClient.query(
        "SET LOCAL statement_timeout = '1500ms'",
      );
      await assertDatabaseError(
        reserve(runMismatchClient, runBindingMismatchInput),
        /permit run binding conflicts/,
      );
    } finally {
      await runMismatchClient.query("ROLLBACK");
    }
  } finally {
    try {
      if (tenantBarrierHeld) {
        const unlockResult = await tenantBarrierHolder.query(
          `SELECT pg_catalog.pg_advisory_unlock(
             pg_catalog.hashtextextended(
               'connect-bot-reply-tenant-barrier-v1:' ||
                 $1::pg_catalog.TEXT,
               0
             )
           ) AS unlocked`,
          [safety.tenantId],
        );
        assert.deepEqual(unlockResult.rows, [{ unlocked: true }]);
      }
    } finally {
      runMismatchClient.release();
      tenantBarrierHolder.release();
    }
  }
  assert.deepEqual(
    await readPermitSideEffectCounts(
      pool,
      runBindingMismatchInput,
    ),
    {
      permits: 0,
      providerRequests: 0,
      consumptions: 0,
      resolutions: 0,
    },
  );

  const secondScopeProviderInputs = Object.freeze({
    admissionBindingKey:
      secondScope.reserveInput.admissionBindingKey,
    deliveryClaimVersion:
      secondScope.reserveInput.deliveryClaimVersion,
    deliveryKey: secondScope.reserveInput.deliveryKey,
    operationKey: secondScope.reserveInput.operationKey,
    operationKind: secondScope.reserveInput.operationKind,
    reservationKey: secondScope.reserveInput.reservationKey,
  });
  const fullMixInput = Object.freeze({
    ...firstScope.reserveInput,
    ...secondScopeProviderInputs,
  });
  assert.deepEqual(
    {
      admissionBindingKey: fullMixInput.admissionBindingKey,
      deliveryClaimVersion: fullMixInput.deliveryClaimVersion,
      deliveryKey: fullMixInput.deliveryKey,
      operationKey: fullMixInput.operationKey,
      operationKind: fullMixInput.operationKind,
      reservationKey: fullMixInput.reservationKey,
    },
    secondScopeProviderInputs,
  );
  assert.equal(
    fullMixInput.runBindingKey,
    firstScope.reserveInput.runBindingKey,
  );
  assert.equal(
    fullMixInput.runKey,
    firstScope.reserveInput.runKey,
  );
  for (const distinctProviderIdentity of [
    "admissionBindingKey",
    "deliveryKey",
    "operationKey",
    "reservationKey",
  ]) {
    assert.notEqual(
      firstScope.reserveInput[distinctProviderIdentity],
      fullMixInput[distinctProviderIdentity],
      distinctProviderIdentity,
    );
  }
  await assertDatabaseError(
    reserve(pool, fullMixInput),
    /permit admission binding conflicts/,
  );
  assert.deepEqual(
    await readPermitSideEffectCounts(pool, fullMixInput),
    {
      permits: 0,
      providerRequests: 0,
      consumptions: 0,
      resolutions: 0,
    },
  );

  await assertDatabaseError(
    claim(pool, {
      ...createClaimInput(
        safety,
        "scope:tenant-claim",
        authorizationEventKey,
      ),
      tenantId: safety.tenantId + 1,
    }),
    /claim tenant conflicts/,
  );
  await assertDatabaseError(
    reserve(pool, {
      ...firstScope.reserveInput,
      tenantId: safety.tenantId + 1,
    }),
    /permit tenant conflicts/,
  );
}

async function verifyDirectMutationDenial(pool, successfulPermit) {
  const { fixture, permitKey } = successfulPermit;
  for (const statement of [
    {
      sql: `UPDATE public.bot_reply_staging_pre_send_admission_bindings
            SET bound_at = bound_at
            WHERE admission_binding_key = $1`,
      values: [fixture.delivery.admissionBindingKey],
    },
    {
      sql: `DELETE FROM public.bot_reply_staging_pre_send_admission_bindings
            WHERE admission_binding_key = $1`,
      values: [fixture.delivery.admissionBindingKey],
    },
    {
      sql: `UPDATE public.bot_reply_staging_run_credential_bindings
            SET bound_at = bound_at
            WHERE binding_key = $1`,
      values: [fixture.claimedRun.runBindingKey],
    },
    {
      sql: `DELETE FROM public.bot_reply_staging_run_credential_bindings
            WHERE binding_key = $1`,
      values: [fixture.claimedRun.runBindingKey],
    },
    {
      sql: `UPDATE public.bot_reply_staging_credential_bound_pre_send_permits
            SET reserved_at = reserved_at
            WHERE permit_key = $1`,
      values: [permitKey],
    },
    {
      sql: `DELETE FROM public.bot_reply_staging_credential_bound_pre_send_permits
            WHERE permit_key = $1`,
      values: [permitKey],
    },
  ]) {
    await assertDatabaseError(
      pool.query(statement.sql, statement.values),
      /credential-bound pre-send evidence is immutable/,
    );
  }

  for (const tableName of [
    "bot_reply_staging_pre_send_admission_bindings",
    "bot_reply_staging_run_credential_bindings",
    "bot_reply_staging_credential_bound_pre_send_permits",
    "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
  ]) {
    await assertDatabaseError(
      pool.query(`TRUNCATE TABLE public.${tableName} CASCADE`),
      /credential-bound pre-send evidence is immutable/,
    );
  }
}

async function verifyCatalogAclAndUnforgeableKey(
  pool,
  successfulPermit,
) {
  const relationNames = [
    "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
    "bot_reply_staging_credential_bound_pre_send_permits",
    "bot_reply_staging_pre_send_admission_bindings",
    "bot_reply_staging_run_credential_bindings",
  ];
  const relationResult = await pool.query(
    `SELECT relation.relname AS name, relation.relkind AS kind
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname = ANY($1::text[])
     ORDER BY relation.relname`,
    [relationNames],
  );
  assert.deepEqual(
    relationResult.rows,
    relationNames.map((name) => ({ kind: "r", name })),
  );

  const admissionColumnResult = await pool.query(
    `SELECT
       attribute.attname AS name,
       pg_catalog.format_type(
         attribute.atttypid,
         attribute.atttypmod
       ) AS type,
       attribute.attnotnull AS "notNull"
     FROM pg_catalog.pg_attribute AS attribute
     WHERE attribute.attrelid =
       'public.bot_reply_staging_pre_send_admission_bindings'::pg_catalog.regclass
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped
     ORDER BY attribute.attnum`,
  );
  const expectedAdmissionColumns = [
    ["admission_binding_key", "text"],
    ["run_binding_key", "text"],
    ["run_key", "text"],
    ["tenant_id", "bigint"],
    ["run_claim_version", "integer"],
    ["authorization_event_key", "text"],
    ["authorization_version", "integer"],
    ["credential_revision", "bigint"],
    ["credential_envelope_digest", "text"],
    ["credential_event_key", "text"],
    ["delivery_key", "text"],
    ["delivery_claim_version", "integer"],
    ["reservation_key", "text"],
    ["sender_key", "text"],
    ["recipient_key", "text"],
    ["policy_event_key", "text"],
    ["phone_throughput_messages_per_second", "integer"],
    ["maximum_outbound_messages_per_second", "integer"],
    ["reservation_reserved_at", "timestamp with time zone"],
    ["pair_reserved_until", "timestamp with time zone"],
    ["reservation_expires_at", "timestamp with time zone"],
    ["bound_at", "timestamp with time zone"],
    ["created_at", "timestamp with time zone"],
  ].map(([name, type]) => ({ name, notNull: true, type }));
  assert.deepEqual(
    admissionColumnResult.rows,
    expectedAdmissionColumns,
  );

  const expectedTriggers = [
    {
      function: "bind_bot_reply_staging_authorization_credential_v1",
      table: "bot_reply_staging_authorization_events",
      trigger:
        "bot_reply_staging_authorizations_credential_binding_guard",
      type: 7,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
      trigger:
        "bot_reply_staging_pre_send_consumptions_mutation_guard",
      type: 27,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
      trigger:
        "bot_reply_staging_pre_send_consumptions_truncate_guard",
      type: 34,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
      trigger:
        "bot_reply_staging_pre_send_resolutions_mutation_guard",
      type: 27,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
      trigger:
        "bot_reply_staging_pre_send_resolutions_truncate_guard",
      type: 34,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_credential_bound_pre_send_permits",
      trigger: "bot_reply_staging_pre_send_permits_mutation_guard",
      type: 27,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_credential_bound_pre_send_permits",
      trigger: "bot_reply_staging_pre_send_permits_truncate_guard",
      type: 34,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_pre_send_admission_bindings",
      trigger: "bot_reply_staging_pre_send_admission_mutation_guard",
      type: 27,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_pre_send_admission_bindings",
      trigger: "bot_reply_staging_pre_send_admission_truncate_guard",
      type: 34,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_run_credential_bindings",
      trigger: "bot_reply_staging_run_bindings_mutation_guard",
      type: 27,
    },
    {
      function: "reject_bot_reply_staging_pre_send_ledger_mutation",
      table: "bot_reply_staging_run_credential_bindings",
      trigger: "bot_reply_staging_run_bindings_truncate_guard",
      type: 34,
    },
  ];
  const triggerResult = await pool.query(
    `SELECT
       relation.relname AS table,
       trigger.tgname AS trigger,
       procedure.proname AS function,
       trigger.tgtype::integer AS type
     FROM pg_catalog.pg_trigger AS trigger
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = trigger.tgrelid
     INNER JOIN pg_catalog.pg_namespace AS relation_namespace
       ON relation_namespace.oid = relation.relnamespace
     INNER JOIN pg_catalog.pg_proc AS procedure
       ON procedure.oid = trigger.tgfoid
     INNER JOIN pg_catalog.pg_namespace AS procedure_namespace
       ON procedure_namespace.oid = procedure.pronamespace
     WHERE relation_namespace.nspname = 'public'
       AND procedure_namespace.nspname = 'public'
       AND NOT trigger.tgisinternal
       AND (
         trigger.tgname =
           'bot_reply_staging_authorizations_credential_binding_guard'
         OR relation.relname = ANY($1::text[])
       )
     ORDER BY relation.relname, trigger.tgname`,
    [relationNames],
  );
  assert.deepEqual(triggerResult.rows, expectedTriggers);

  const functionNames = [
    "bind_bot_reply_staging_authorization_credential_v1",
    "claim_bot_reply_staging_run_v2",
    "derive_bot_reply_staging_pre_send_permit_key_v1",
    "reject_bot_reply_staging_pre_send_ledger_mutation",
    "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
  ];
  const functionResult = await pool.query(
    `SELECT
       procedure.proname AS name,
       procedure.prosecdef AS "securityDefiner",
       procedure.proconfig AS config,
       procedure.provolatile AS volatility,
       procedure.proparallel AS parallel,
       procedure.proretset AS "returnsSet",
       language.lanname AS language,
       ARRAY(
         SELECT pg_catalog.format_type(argument.oid, NULL)
         FROM pg_catalog.unnest(
           procedure.proargtypes::pg_catalog.oid[]
         ) WITH ORDINALITY AS argument(oid, position)
         ORDER BY argument.position
       ) AS "argumentTypes",
       pg_catalog.pg_get_function_identity_arguments(procedure.oid)
         AS arguments,
       pg_catalog.pg_get_function_result(procedure.oid) AS result,
       procedure.prosrc AS source
     FROM pg_catalog.pg_proc AS procedure
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = procedure.pronamespace
     INNER JOIN pg_catalog.pg_language AS language
       ON language.oid = procedure.prolang
     WHERE namespace.nspname = 'public'
       AND procedure.proname = ANY($1::text[])
     ORDER BY procedure.proname`,
    [functionNames],
  );
  assert.deepEqual(
    functionResult.rows.map((row) => row.name),
    functionNames,
  );
  for (const procedure of functionResult.rows) {
    assert.equal(procedure.securityDefiner, false);
    assert.deepEqual(procedure.config, [
      "search_path=pg_catalog, pg_temp",
    ]);
    if (
      procedure.name ===
      "derive_bot_reply_staging_pre_send_permit_key_v1"
    ) {
      assert.equal(procedure.language, "sql");
      assert.equal(procedure.volatility, "i");
      assert.equal(procedure.parallel, "s");
      assert.equal(procedure.returnsSet, false);
    } else {
      assert.equal(procedure.language, "plpgsql");
      assert.equal(procedure.volatility, "v");
      assert.equal(procedure.parallel, "u");
    }
  }

  const functionsByName = new Map(
    functionResult.rows.map((procedure) => [
      procedure.name,
      procedure,
    ]),
  );
  assert.deepEqual(
    functionsByName.get(
      "bind_bot_reply_staging_authorization_credential_v1",
    )?.argumentTypes,
    [],
  );
  assert.deepEqual(
    functionsByName.get(
      "reject_bot_reply_staging_pre_send_ledger_mutation",
    )?.argumentTypes,
    [],
  );
  assert.deepEqual(
    functionsByName.get("claim_bot_reply_staging_run_v2")
      ?.argumentTypes,
    [
      "text",
      "bigint",
      "text",
      "text",
      "integer",
      "integer",
      "text",
      "text",
      "text",
      "text",
      "text",
      "text",
      "integer",
      "text",
      "text",
    ],
  );
  assert.deepEqual(
    functionsByName.get(
      "derive_bot_reply_staging_pre_send_permit_key_v1",
    )?.argumentTypes,
    [
      "bigint",
      "text",
      "bigint",
      "text",
      "text",
      "text",
      "text",
      "text",
      "text",
      "integer",
      "integer",
      "text",
      "text",
      "text",
      "integer",
      "text",
      "timestamp with time zone",
      "timestamp with time zone",
      "timestamp with time zone",
      "timestamp with time zone",
    ],
  );
  assert.deepEqual(
    functionsByName.get(
      "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
    )?.argumentTypes,
    [
      "text",
      "bigint",
      "text",
      "text",
      "text",
      "text",
      "text",
      "integer",
      "timestamp with time zone",
      "text",
      "text",
      "text",
      "text",
      "text",
      "integer",
      "text",
    ],
  );
  assert.equal(
    functionsByName.get("claim_bot_reply_staging_run_v2")
      ?.returnsSet,
    true,
  );
  assert.equal(
    functionsByName.get(
      "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
    )?.returnsSet,
    true,
  );
  assert.doesNotMatch(
    functionsByName.get("claim_bot_reply_staging_run_v2")
      ?.result ?? "",
    /receiptJson/,
  );
  assert.equal(
    functionsByName.get(
      "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
    )?.result,
    'TABLE("permitKey" text)',
  );

  const reserveProcedure = functionResult.rows.find(
    ({ name }) =>
      name ===
      "reserve_bot_reply_staging_credential_bound_pre_send_permit_v2",
  );
  assert.equal(typeof reserveProcedure?.source, "string");
  const runBindingMismatchIndex = reserveProcedure.source.indexOf(
    "initial_binding.run_key <> requested_run_key",
  );
  const tenantBarrierIndex = reserveProcedure.source.indexOf(
    "PERFORM pg_catalog.pg_advisory_xact_lock",
  );
  assert.notEqual(runBindingMismatchIndex, -1);
  assert.notEqual(tenantBarrierIndex, -1);
  assert.equal(runBindingMismatchIndex < tenantBarrierIndex, true);
  const deriveProcedure = functionResult.rows.find(
    ({ name }) =>
      name ===
      "derive_bot_reply_staging_pre_send_permit_key_v1",
  );
  assert.equal(typeof deriveProcedure?.source, "string");
  for (const persistedMaterial of [
    "persisted_credential_envelope_digest",
    "persisted_credential_event_key",
    "persisted_admission_binding_key",
    "persisted_reservation_reserved_at",
    "persisted_reserved_at",
  ]) {
    assert.equal(
      deriveProcedure.source.includes(persistedMaterial),
      true,
      persistedMaterial,
    );
  }
  assert.match(
    reserveProcedure.source,
    /derived_permit_key :=[\s\S]*derive_bot_reply_staging_pre_send_permit_key_v1/,
  );
  assert.doesNotMatch(
    reserveProcedure.source,
    /INSERT INTO public\.bot_reply_provider_request_claims|INSERT INTO public\.bot_reply_staging_credential_bound_pre_send_permit_(?:consumptions|resolutions)/i,
  );
  assert.notEqual(
    successfulPermit.permitKey,
    successfulPermit.inputOnlyDerivedKey,
  );

  const forbiddenFunctionResult = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_proc AS procedure
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = procedure.pronamespace
     WHERE namespace.nspname = 'public'
       AND procedure.proname OPERATOR(pg_catalog.~)
         '^(consume|release|finalize|reconcile)_bot_reply_staging_credential_bound_pre_send_permit'`,
  );
  assert.deepEqual(forbiddenFunctionResult.rows, [{ count: 0 }]);

  const relationAclResult = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(
         relation.relacl,
         pg_catalog.acldefault('r', relation.relowner)
       )
     ) AS privilege
     WHERE namespace.nspname = 'public'
       AND relation.relname = ANY($1::text[])
       AND privilege.grantee <> relation.relowner`,
    [relationNames],
  );
  assert.deepEqual(relationAclResult.rows, [{ count: 0 }]);

  const functionAclResult = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_proc AS procedure
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = procedure.pronamespace
     CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(
         procedure.proacl,
         pg_catalog.acldefault('f', procedure.proowner)
       )
     ) AS privilege
     WHERE namespace.nspname = 'public'
       AND procedure.proname = ANY($1::text[])
       AND privilege.grantee <> procedure.proowner`,
    [functionNames],
  );
  assert.deepEqual(functionAclResult.rows, [{ count: 0 }]);

  const foreignKeyResult = await pool.query(
    `SELECT
       relation.relname AS table,
       constraint_record.conname AS name,
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
       AND relation.relname IN (
         'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
         'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
       )
       AND constraint_record.contype = 'f'
       AND constraint_record.confrelid =
         'public.bot_reply_staging_credential_bound_pre_send_permits'::pg_catalog.regclass
     ORDER BY relation.relname`,
  );
  assert.equal(foreignKeyResult.rowCount, 2);
  for (const foreignKey of foreignKeyResult.rows) {
    assert.match(
      foreignKey.definition,
      /FOREIGN KEY \(permit_key, tenant_id, credential_revision, credential_envelope_digest, credential_event_key, operation_key, delivery_key, delivery_claim_version, reservation_key\)/,
    );
    assert.match(
      foreignKey.definition,
      /REFERENCES bot_reply_staging_credential_bound_pre_send_permits\(permit_key, tenant_id, credential_revision, credential_envelope_digest, credential_event_key, operation_key, delivery_key, delivery_claim_version, reservation_key\)/,
    );
  }

  const exactRunIdentityColumns = [
    "run_binding_key",
    "run_key",
    "tenant_id",
    "run_claim_version",
    "authorization_event_key",
    "authorization_version",
    "credential_revision",
    "credential_envelope_digest",
    "credential_event_key",
  ];
  const exactRunBindingColumns = [
    "binding_key",
    ...exactRunIdentityColumns.slice(1),
  ];
  const exactAdmissionIdentityColumns = [
    "admission_binding_key",
    ...exactRunIdentityColumns,
    "delivery_key",
    "delivery_claim_version",
    "reservation_key",
    "sender_key",
    "recipient_key",
    "policy_event_key",
    "phone_throughput_messages_per_second",
    "maximum_outbound_messages_per_second",
    "reservation_reserved_at",
    "pair_reserved_until",
    "reservation_expires_at",
  ];
  const exactIdentityConstraintResult = await pool.query(
    `SELECT
       relation.relname AS table,
       constraint_record.conname AS name,
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
       AND constraint_record.conname = ANY($1::text[])
     ORDER BY constraint_record.conname`,
    [[
      "bot_reply_staging_pre_send_admission_exact_identity_uq",
      "bot_reply_staging_pre_send_admission_run_binding_fk",
      "bot_reply_staging_pre_send_permits_admission_fk",
      "bot_reply_staging_run_bindings_exact_identity_uq",
    ]],
  );
  assert.deepEqual(exactIdentityConstraintResult.rows, [
    {
      definition:
        `UNIQUE (${exactAdmissionIdentityColumns.join(", ")})`,
      name:
        "bot_reply_staging_pre_send_admission_exact_identity_uq",
      table: "bot_reply_staging_pre_send_admission_bindings",
    },
    {
      definition:
        `FOREIGN KEY (${exactRunIdentityColumns.join(", ")}) ` +
        "REFERENCES bot_reply_staging_run_credential_bindings" +
        `(${exactRunBindingColumns.join(", ")}) ON DELETE RESTRICT`,
      name:
        "bot_reply_staging_pre_send_admission_run_binding_fk",
      table: "bot_reply_staging_pre_send_admission_bindings",
    },
    {
      definition:
        `FOREIGN KEY (${exactAdmissionIdentityColumns.join(", ")}) ` +
        "REFERENCES bot_reply_staging_pre_send_admission_bindings" +
        `(${exactAdmissionIdentityColumns.join(", ")}) ` +
        "ON DELETE RESTRICT",
      name: "bot_reply_staging_pre_send_permits_admission_fk",
      table:
        "bot_reply_staging_credential_bound_pre_send_permits",
    },
    {
      definition:
        `UNIQUE (${exactRunBindingColumns.join(", ")})`,
      name: "bot_reply_staging_run_bindings_exact_identity_uq",
      table: "bot_reply_staging_run_credential_bindings",
    },
  ]);

  const chainedForeignKeyResult = await pool.query(
    `SELECT
       relation.relname AS table,
       constraint_record.conname AS name,
       constraint_record.confmatchtype AS "matchType",
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
       AND constraint_record.contype = 'f'
       AND constraint_record.conname = ANY($1::text[])
     ORDER BY constraint_record.conname`,
    [[
      "bot_reply_staging_pre_send_consumptions_request_fk",
      "bot_reply_staging_pre_send_resolutions_consumption_fk",
    ]],
  );
  const consumptionRequestColumns = [
    "provider_request_key",
    "delivery_key",
    "tenant_id",
    "delivery_claim_version",
    "reservation_key",
  ];
  const providerRequestColumns = [
    "request_key",
    "delivery_key",
    "tenant_id",
    "claim_version",
    "reservation_key",
  ];
  const releasedResolutionConsumptionColumns = [
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
  ];
  assert.deepEqual(chainedForeignKeyResult.rows, [
    {
      definition:
        `FOREIGN KEY (${consumptionRequestColumns.join(", ")}) ` +
        "REFERENCES bot_reply_provider_request_claims" +
        `(${providerRequestColumns.join(", ")}) ON DELETE RESTRICT`,
      matchType: "s",
      name: "bot_reply_staging_pre_send_consumptions_request_fk",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    },
    {
      definition:
        "FOREIGN KEY " +
        `(${releasedResolutionConsumptionColumns.join(", ")}) ` +
        "REFERENCES " +
        "bot_reply_staging_credential_bound_pre_send_permit_consumptions" +
        `(${releasedResolutionConsumptionColumns.join(", ")}) ` +
        "ON DELETE RESTRICT",
      matchType: "s",
      name:
        "bot_reply_staging_pre_send_resolutions_consumption_fk",
      table:
        "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
    },
  ]);
}

export async function verifyBotReplyCredentialBoundPermitPostgres(
  connectionString,
) {
  const checkedUrl =
    requireLocalBotReplyCredentialBoundPermitVerifierUrl(
      connectionString,
    );
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 4,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
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

    const { files, safety } =
      await applyAllMigrationsWithLegacyAuthorization(pool);
    const firstBinding = await verifyLegacyAndCredentialBinding(
      pool,
      safety,
    );
    const source = await createDeliverySource(pool, safety);
    const firstClaim = await verifyClaimContract(
      pool,
      safety,
      firstBinding.authorizationEventKey,
    );
    const currentBinding = await verifyRotationInvalidation(
      pool,
      safety,
      source,
      firstBinding.authorizationEventKey,
      firstClaim,
    );
    const successfulPermit = await verifyOneShotPermit(
      pool,
      safety,
      source,
      currentBinding.authorizationEventKey,
    );
    await verifyIsolationAndScopeDenial(
      pool,
      safety,
      source,
      currentBinding.authorizationEventKey,
    );
    await verifyFailureFences(
      pool,
      safety,
      source,
      currentBinding.authorizationEventKey,
    );
    await verifyDirectMutationDenial(pool, successfulPermit);
    await verifyCatalogAclAndUnforgeableKey(
      pool,
      successfulPermit,
    );

    return Object.freeze({
      migrationCount: files.length,
      legacyAuthorizationIneligible: true,
      credentialBinding: true,
      rotationInvalidation: true,
      claimReplayConflict: true,
      oneShotPermit: true,
      providerRequestAbsent: true,
      inertLedgersEmpty: true,
      failureFenceCount: 8,
      isolationAndScopeDenial: true,
      databaseClock: true,
      directMutationBlocked: true,
      catalogVerified: true,
      aclVerified: true,
      inputOnlyPermitKeyRejected: true,
      repeatabilityCleanup: true,
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
  const result = await verifyBotReplyCredentialBoundPermitPostgres(
    connectionString,
  );
  process.stdout.write(
    "PostgreSQL credential-bound pre-send permit: PASS (" +
      `${result.migrationCount} migrations, legacy denial, credential ` +
      "rotation, claim replay/conflict, one-shot reservation, eight " +
      "negative fences, isolation/scope denial, DB clock, " +
      "immutability, ACL/catalog and repeatability cleanup verified)\n",
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";
if (import.meta.url === invokedPath) {
  await main();
}
