import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  requireLocalBotReplySessionBarrierVerifierUrl,
} from "../scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs";

const verifier = readFileSync(
  new URL(
    "../scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("accepts only the dedicated loopback PostgreSQL verifier database", () => {
  assert.equal(
    requireLocalBotReplySessionBarrierVerifierUrl(
      "postgresql://127.0.0.1:55486/connect_bot_reply_pre_send_session_barrier",
    ),
    "postgresql://127.0.0.1:55486/connect_bot_reply_pre_send_session_barrier",
  );
  assert.equal(
    requireLocalBotReplySessionBarrierVerifierUrl(
      "postgres://localhost:55486/connect_bot_reply_pre_send_session_barrier",
    ),
    "postgres://localhost:55486/connect_bot_reply_pre_send_session_barrier",
  );

  for (const unsafeUrl of [
    "postgresql://127.0.0.1/connect_bot_reply_pre_send_session_barrier",
    "postgresql://operator@127.0.0.1:55486/connect_bot_reply_pre_send_session_barrier",
    "postgresql://127.0.0.1:55486/connect_bot_reply_pre_send_session_barrier?sslmode=disable",
    "postgresql://127.0.0.1:55486/connect_bot_reply_pre_send_session_barrier#fragment",
    "postgresql://127.0.0.1:55486/postgres",
    "postgresql://192.0.2.1:55486/connect_bot_reply_pre_send_session_barrier",
  ]) {
    assert.throws(
      () => requireLocalBotReplySessionBarrierVerifierUrl(unsafeUrl),
      /DEDICATED_LOCAL_DATABASE_REQUIRED/,
    );
  }
});

test("applies exactly 57 migrations with the legacy fixture before 0055", () => {
  assert.match(verifier, /assert\.equal\(files\.length, 57\)/);
  assert.match(
    verifier,
    /files\.at\(-2\)[\s\S]*permitMigrationName[\s\S]*files\.at\(-1\)[\s\S]*sessionBarrierMigrationName/,
  );
  const legacyFixtureIndex = verifier.indexOf(
    "legacySafety = await createSafetyScope",
  );
  const migrationReadIndex = verifier.indexOf(
    "const source = await readFile",
    legacyFixtureIndex,
  );
  assert.equal(legacyFixtureIndex >= 0, true);
  assert.equal(migrationReadIndex > legacyFixtureIndex, true);
  assert.match(
    verifier,
    /if \(fileName === permitMigrationName\)[\s\S]*legacy-before-0055/,
  );
});

test("proves pinned session ownership without reentry or residual locks", () => {
  assert.match(verifier, /readBackendPid\(actor\)/);
  assert.match(
    verifier,
    /assertBarrierProof\(actor, fixture\.permitKey, actorPid\)/,
  );
  assert.match(verifier, /"held"/);
  assert.match(verifier, /"backendPid"/);
  assert.match(verifier, /"sendBefore"/);
  assert.match(verifier, /"busy"/);
  assert.match(verifier, /"blocked-unresolved"/);
  assert.match(verifier, /"reconciliation-required"/);
  assert.match(
    verifier,
    /derive_bot_reply_staging_reconciliation_marker_key_v1/,
  );
  assert.match(verifier, /readAdvisoryLockCount\(actor\), 2/);
  assert.match(verifier, /BEGIN ISOLATION LEVEL READ COMMITTED/);
  assert.match(verifier, /await actor\.query\("COMMIT"\)/);
  assert.match(verifier, /await actor\.query\("ROLLBACK"\)/);
  assert.match(verifier, /actor\.release\(true\)/);
  assert.match(verifier, /session barrier client is contaminated/);
  assert.match(verifier, /pg_advisory_xact_lock/);
  assert.match(verifier, /proof lacks exact barrier/);
  assert.match(verifier, /providerBoundaryEligible/);
  assert.match(verifier, /pg_advisory_lock\(/);
  assert.match(verifier, /outcome: "lock-leaked"/);
  assert.match(verifier, /releasedCount: 2/);
  assert.match(verifier, /releasedCount: 1/);
  assert.match(verifier, /verifyNoResidualDatabaseLocks/);
});

test("proves atomic visibility, rollback retry and replay without capability", () => {
  assert.match(
    verifier,
    /verifyAtomicCommitReplayAndDurableFinalization/,
  );
  assert.match(verifier, /readCapabilityCounts\(pool, fixture\)/);
  assert.match(verifier, /emptyCapabilityCounts\(\)/);
  assert.match(verifier, /releasedCapabilityCounts\(\)/);
  assert.match(verifier, /CAPABILITY_ALREADY_RELEASED/);
  assert.match(verifier, /verifyRollbackAndRetry/);
  assert.match(
    verifier,
    /ROLLBACK[\s\S]*proof lacks committed released chain/,
  );
  assert.doesNotMatch(verifier, /providerRequestKey/);
  assert.doesNotMatch(verifier, /preparedAt/);
  assert.doesNotMatch(
    verifier,
    /process\.stdout\.write\([\s\S]{0,900}provider_request_key/i,
  );
  assert.match(verifier, /readBoundaryClaimEvidence/);
  assert.match(verifier, /provider boundary proof already consumed/);
  assert.match(verifier, /bot_reply_staging_provider_boundary_claims/);
});

test("covers only text and button authorization plus four kind denials", () => {
  assert.match(verifier, /button-authorized/);
  for (const deniedKind of [
    "customer-window-expired",
    "provider-retry",
    "pair-limit",
    "duplicate-safety",
  ]) {
    assert.equal(verifier.includes(`"${deniedKind}"`), true);
  }
  assert.match(verifier, /OPERATION_KIND_NOT_RELEASABLE/);
});

test("covers current safety races and durable 0053 reconciliation", () => {
  for (const reasonCode of [
    "PERMIT_EXPIRED",
    "CREDENTIAL_CHANGED",
    "AUTHORIZATION_STALE",
    "CONNECTION_CHANGED",
    "POLICY_DISABLED",
    "SERVICE_WINDOW_CLOSED",
    "PROVIDER_COOLDOWN_ACTIVE",
  ]) {
    assert.equal(verifier.includes(reasonCode), true);
  }
  assert.match(verifier, /insertKillSwitchFact/);
  assert.match(verifier, /insertAcceptedProviderFact/);
  assert.match(verifier, /verifyIndeterminateReconciliation/);
  assert.match(verifier, /manual-reconciliation-required/);
  assert.match(verifier, /provider-response-ambiguous/);
  assert.match(verifier, /verifyLeaseExpiryUncertainty/);
  assert.match(verifier, /lease-expired-without-outcome/);
  assert.match(verifier, /readUncertaintyEvidence/);
});

test("verifies exact catalog, MATCH SIMPLE FKs, ACL and immutability", () => {
  assert.match(verifier, /pg_catalog\.pg_constraint/);
  assert.match(verifier, /confmatchtype AS "matchType"/);
  assert.match(verifier, /confdeltype AS "deleteType"/);
  assert.match(verifier, /matchType: "s"/);
  assert.match(verifier, /deleteType: "r"/);
  assert.match(verifier, /pg_catalog\.aclexplode/);
  assert.match(verifier, /securityDefiner/);
  assert.match(verifier, /UPDATE public\.bot_reply_staging_credential_provider_request_bindings/);
  assert.match(verifier, /DELETE FROM public\.bot_reply_staging_credential_provider_request_bindings/);
  assert.match(verifier, /TRUNCATE public\.bot_reply_staging_credential_provider_request_bindings/);
  assert.match(
    verifier,
    /bot_reply_staging_uncertainty_binding_fk/,
  );
  assert.match(
    verifier,
    /TRUNCATE public\.bot_reply_staging_provider_uncertainty_events/,
  );
  assert.match(
    verifier,
    /bot_reply_staging_boundary_claims_binding_fk/,
  );
  assert.match(
    verifier,
    /TRUNCATE public\.bot_reply_staging_provider_boundary_claims/,
  );
  assert.match(verifier, /meta_connections_business_portfolio_uq/);
  assert.match(verifier, /metaAssetId/);
  assert.doesNotMatch(
    verifier,
    /`(?:portfolio|waba|phone-number)-\$\{tenantId\}`/,
  );
});

test("is deterministic and labels lost-ACK evidence and activation honestly", () => {
  assert.doesNotMatch(
    verifier,
    /Math\.random|randomUUID|gen_random_uuid|uuid_generate|\brandom\s*\(/,
  );
  assert.match(verifier, /simulated lost acknowledgement/i);
  assert.match(verifier, /not[\s\S]*real network-level lost-ACK proof/i);
  assert.match(verifier, /lostAcknowledgementEvidence: "simulated-only"/);
  assert.match(
    verifier,
    /sharedMetaAssetCrossTenantCooldownEvidence:[\s\S]*schema-exclusivity-proven-runtime-subject-derivation-not-proven/,
  );
  assert.match(verifier, /shared-Meta cross-tenant cooldown/);
  assert.match(verifier, /activation: "NO-GO"/);
});
