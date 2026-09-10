import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  requireLocalBotReplyCredentialBoundPermitVerifierUrl,
} from "../scripts/verify-bot-reply-staging-credential-bound-pre-send-permit-postgres.mjs";

const verifier = readFileSync(
  new URL(
    "../scripts/verify-bot-reply-staging-credential-bound-pre-send-permit-postgres.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("accepts only the dedicated parameter-free and userinfo-free local database", () => {
  const valid =
    "postgresql://127.0.0.1:55443/" +
    "connect_bot_reply_credential_bound_permit";
  assert.equal(
    requireLocalBotReplyCredentialBoundPermitVerifierUrl(valid),
    valid,
  );
  assert.equal(
    requireLocalBotReplyCredentialBoundPermitVerifierUrl(
      "postgres://localhost:55443/" +
        "connect_bot_reply_credential_bound_permit",
    ),
    "postgres://localhost:55443/" +
      "connect_bot_reply_credential_bound_permit",
  );

  for (const unsafe of [
    "postgresql://operator@127.0.0.1:55443/" +
      "connect_bot_reply_credential_bound_permit",
    "postgresql://operator:credential@127.0.0.1:55443/" +
      "connect_bot_reply_credential_bound_permit",
    valid + "?host=%2Ftmp%2Fpostgres",
    valid + "?options=-csearch_path%3Dpg_catalog",
    valid + "?sslmode=disable",
    valid + "#connection-override",
    "postgresql://127.0.0.1/" +
      "connect_bot_reply_credential_bound_permit",
    "postgresql://127.0.0.1:55443/%63onnect_" +
      "bot_reply_credential_bound_permit",
    "postgresql://database.example.com:55443/" +
      "connect_bot_reply_credential_bound_permit",
    "postgresql://127.0.0.1:55443/connect",
  ]) {
    assert.throws(
      () =>
        requireLocalBotReplyCredentialBoundPermitVerifierUrl(unsafe),
      /BOT_REPLY_CREDENTIAL_BOUND_PERMIT_DEDICATED_LOCAL_DATABASE_REQUIRED/,
    );
  }
});

test("applies all 57 migrations with one intentional pre-0055 legacy authorization", () => {
  assert.match(verifier, /assert\.equal\(files\.length, 57\)/);
  assert.match(
    verifier,
    /files\.at\(-3\), credentialMigrationName/,
  );
  assert.match(verifier, /files\.at\(-2\), permitMigrationName/);
  assert.match(
    verifier,
    /files\.at\(-1\), sessionBarrierMigrationName/,
  );
  assert.match(
    verifier,
    /if \(fileName === permitMigrationName\) \{\s*safety = await createLegacySafetyScope\(pool\);\s*\}[\s\S]*await pool\.query\(source\)/,
  );
  assert.match(
    verifier,
    /credentialRevision: null,[\s\S]*credentialEnvelopeDigest: null,[\s\S]*credentialEventKey: null/,
  );
});

test("proves DB-owned credential binding, exact claim and rotation invalidation", () => {
  for (const token of [
    "legacyAuthorizationIneligible: true",
    "credentialBinding: true",
    "rotationInvalidation: true",
    "claimReplayConflict: true",
    "credential-bound claim lacks current safety evidence",
    "permit credential changed",
    "credential identity is DB-derived",
    "meta_credential_revision_events",
    "bot_reply_staging_run_credential_bindings",
  ]) {
    assert.equal(verifier.includes(token), true, token);
  }
  assert.match(
    verifier,
    /\{ outcome: "in-progress", runBindingKey: null \}/,
  );
  assert.match(
    verifier,
    /\{ outcome: "conflict", runBindingKey: null \}/,
  );
  assert.match(
    verifier,
    /const claimedRun = await claim\(pool, claimInput\)[\s\S]*createDeliveryAndReservation\([\s\S]*claimInput,[\s\S]*claimedRun/,
  );
  for (const exactAdmissionIdentity of [
    "run_binding_key",
    "run_claim_version",
    "authorization_event_key",
    "authorization_version",
    "credential_revision",
    "credential_envelope_digest",
    "credential_event_key",
  ]) {
    assert.equal(
      verifier.includes(exactAdmissionIdentity),
      true,
      exactAdmissionIdentity,
    );
  }
});

test("proves a one-shot inert permit without releasing a provider capability", () => {
  assert.match(
    verifier,
    /const permitKey = await reserve\(pool, fixture\.reserveInput\)[\s\S]*const replay = await reserve\(pool, fixture\.reserveInput\)[\s\S]*assert\.equal\(replay, null\)/,
  );
  assert.match(
    verifier,
    /providerRequests: 0,[\s\S]*consumptions: 0,[\s\S]*resolutions: 0/,
  );
  assert.match(
    verifier,
    /inputOnlyPermitKeyRejected: true/,
  );
  assert.match(
    verifier,
    /assert\.notEqual\(\s*successfulPermit\.permitKey,\s*successfulPermit\.inputOnlyDerivedKey/,
  );
  assert.equal(
    verifier.includes(
      "derive_bot_reply_staging_pre_send_permit_key_v1",
    ),
    true,
  );
  for (const persistedMaterial of [
    "persisted_credential_envelope_digest",
    "persisted_credential_event_key",
    "persisted_admission_binding_key",
    "persisted_reserved_at",
  ]) {
    assert.equal(verifier.includes(persistedMaterial), true);
  }
  assert.doesNotMatch(
    verifier,
    /\b(?:Math\.random|crypto\.randomUUID|gen_random_uuid|uuid_generate_v[1-5])\b/,
  );
});

test("covers every negative pre-send fence against database state", () => {
  for (const label of [
    "expired-run",
    "kill-switch",
    "service-window",
    "connection",
    "policy",
    "delivery",
    "reservation-expired",
    "reservation-settled",
  ]) {
    assert.equal(verifier.includes(`\"${label}\"`), true, label);
  }
  for (const pattern of [
    "permit lacks exact active run",
    "permit policy is disabled",
    "permit service window is closed",
    "permit connection changed",
    "permit delivery is stale",
    "permit reservation is stale",
  ]) {
    assert.equal(verifier.includes(pattern), true, pattern);
  }
  assert.match(verifier, /failureFenceCount: 8/);
  assert.match(verifier, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(
    verifier,
    /BEGIN ISOLATION LEVEL REPEATABLE READ/,
  );
  assert.match(verifier, /claim requires read committed isolation/);
  assert.match(verifier, /permit requires read committed isolation/);
  assert.match(verifier, /permit run binding conflicts/);
  assert.match(
    verifier,
    /const runBindingMismatchInput = Object\.freeze\(\{\s*\.\.\.firstScope\.reserveInput,[\s\S]*runKey: secondScope\.reserveInput\.runKey/,
  );
  assert.match(
    verifier,
    /readPermitSideEffectCounts\([\s\S]*runBindingMismatchInput[\s\S]*permits: 0,[\s\S]*providerRequests: 0,[\s\S]*consumptions: 0,[\s\S]*resolutions: 0/,
  );
  assert.match(verifier, /pg_catalog\.pg_advisory_lock\(/);
  assert.match(
    verifier,
    /SET LOCAL statement_timeout = '1500ms'/,
  );
  assert.match(verifier, /pg_catalog\.pg_advisory_unlock\(/);
  assert.match(verifier, /permit admission binding conflicts/);
  assert.match(
    verifier,
    /const fullMixInput = Object\.freeze\(\{\s*\.\.\.firstScope\.reserveInput,\s*\.\.\.secondScopeProviderInputs/,
  );
  for (const secondScopeInput of [
    "admissionBindingKey",
    "deliveryClaimVersion",
    "deliveryKey",
    "operationKey",
    "operationKind",
    "reservationKey",
  ]) {
    assert.match(
      verifier,
      new RegExp(
        `${secondScopeInput}:\\s*` +
          `secondScope\\.reserveInput\\.${secondScopeInput}`,
      ),
      secondScopeInput,
    );
  }
  assert.match(
    verifier,
    /readPermitSideEffectCounts\(pool, fullMixInput\)[\s\S]*permits: 0,[\s\S]*providerRequests: 0,[\s\S]*consumptions: 0,[\s\S]*resolutions: 0/,
  );
  assert.match(verifier, /claim tenant conflicts/);
  assert.match(verifier, /permit tenant conflicts/);
  assert.match(verifier, /isolationAndScopeDenial: true/);
});

test("checks exact triggers, invoker rights, ACLs, FKs and forbidden functions", () => {
  assert.match(verifier, /const expectedTriggers = \[/);
  assert.match(verifier, /assert\.deepEqual\(triggerResult\.rows, expectedTriggers\)/);
  assert.match(verifier, /procedure\.prosecdef AS "securityDefiner"/);
  assert.match(verifier, /privilege\.grantee <> relation\.relowner/);
  assert.match(verifier, /privilege\.grantee <> procedure\.proowner/);
  assert.match(
    verifier,
    /\^\(consume\|release\|finalize\|reconcile\)_bot_reply_staging_credential_bound_pre_send_permit/,
  );
  assert.match(
    verifier,
    /FOREIGN KEY \\\(permit_key, tenant_id, credential_revision, credential_envelope_digest, credential_event_key, operation_key, delivery_key, delivery_claim_version, reservation_key/,
  );
  assert.match(
    verifier,
    /TRUNCATE TABLE public\.\$\{tableName\}/,
  );
  assert.match(verifier, /const expectedAdmissionColumns = \[/);
  assert.match(verifier, /const exactRunIdentityColumns = \[/);
  assert.match(verifier, /const exactAdmissionIdentityColumns = \[/);
  for (const exactConstraint of [
    "bot_reply_staging_pre_send_admission_exact_identity_uq",
    "bot_reply_staging_pre_send_admission_run_binding_fk",
    "bot_reply_staging_pre_send_permits_admission_fk",
    "bot_reply_staging_run_bindings_exact_identity_uq",
  ]) {
    assert.equal(verifier.includes(exactConstraint), true);
  }
  assert.match(
    verifier,
    /assert\.deepEqual\(exactIdentityConstraintResult\.rows/,
  );
  assert.match(
    verifier,
    /constraint_record\.confmatchtype AS "matchType"/,
  );
  assert.match(verifier, /const consumptionRequestColumns = \[/);
  assert.match(
    verifier,
    /const releasedResolutionConsumptionColumns = \[/,
  );
  for (const chainedForeignKey of [
    "bot_reply_staging_pre_send_consumptions_request_fk",
    "bot_reply_staging_pre_send_resolutions_consumption_fk",
  ]) {
    assert.equal(verifier.includes(chainedForeignKey), true);
  }
  assert.match(
    verifier,
    /assert\.deepEqual\(chainedForeignKeyResult\.rows,[\s\S]*matchType: "s"/,
  );
  assert.match(
    verifier,
    /runBindingMismatchIndex < tenantBarrierIndex/,
  );
});

test("limits destructive cleanup to a validated empty dedicated local database", () => {
  assert.match(
    verifier,
    /await requireEmptyPublicSchema\(pool\);\s*cleanupAuthorized = true/,
  );
  assert.match(
    verifier,
    /current_database\(\) AS database,[\s\S]*host\(pg_catalog\.inet_server_addr\(\)\) AS address/,
  );
  assert.match(
    verifier,
    /if \(cleanupAuthorized\) \{[\s\S]*cleanupDedicatedVerifierDatabase\(pool\)/,
  );
  assert.match(
    verifier,
    /DROP SCHEMA public CASCADE[\s\S]*CREATE SCHEMA public/,
  );
});
