import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0048_bot_reply_staging_attested_evidence_atomic_publish.sql",
    import.meta.url,
  ),
  "utf8",
);

const functionMatch = migration.match(
  /CREATE FUNCTION public\.publish_bot_reply_staging_attested_evidence_with_audit\(([\s\S]*?)\)\s+RETURNS TABLE \(([\s\S]*?)\)\s+LANGUAGE plpgsql([\s\S]*?)\$\$;/,
);
assert.ok(functionMatch, "atomic attested publisher function is missing");
const [, argumentsSql, resultSql, functionSql] = functionMatch;

test("defines the exact dormant 26-argument security-definer contract", () => {
  const argumentNames = [...argumentsSql.matchAll(
    /^\s*(requested_[a-z0-9_]+)\s+(?:TEXT|INTEGER|TIMESTAMPTZ),?$/gm,
  )].map((match) => match[1]);

  assert.deepEqual(argumentNames, [
    "requested_policy_version",
    "requested_key_id",
    "requested_run_key",
    "requested_claim_version",
    "requested_request_digest",
    "requested_release_id",
    "requested_commit_sha",
    "requested_artifact_digest",
    "requested_expected_evidence_version",
    "requested_receipt_digest",
    "requested_evidence_core_digest",
    "requested_attestation_audit_key",
    "requested_nonce",
    "requested_nonce_sequence",
    "requested_issued_at",
    "requested_signed_at",
    "requested_attestation_expires_at",
    "requested_attestation_payload_digest",
    "requested_event_key",
    "requested_idempotency_key",
    "requested_actor_external_user_id",
    "requested_expected_evidence_digest",
    "requested_evidence_digest",
    "requested_evidence_json",
    "requested_occurred_at",
    "requested_evidence_expires_at",
  ]);
  assert.equal(argumentNames.length, 26);
  assert.match(
    migration,
    /CREATE FUNCTION public\.publish_bot_reply_staging_attested_evidence_with_audit\([\s\S]*?\)\s+RETURNS TABLE[\s\S]*?SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.deepEqual(
    [...migration.matchAll(/SET search_path\s*=\s*([^\n]+)/gi)]
      .map((match) => match[1].trim()),
    ["pg_catalog"],
  );

  const resultNames = [...resultSql.matchAll(
    /^\s*([a-z0-9_]+)\s+(?:TEXT|INTEGER|TIMESTAMPTZ),?$/gm,
  )].map((match) => match[1]);
  assert.deepEqual(resultNames, [
    "result_status",
    "nonce_status",
    "nonce",
    "receipt_digest",
    "evidence_core_digest",
    "attestation_payload_digest",
    "event_key",
    "release_id",
    "commit_sha",
    "artifact_digest",
    "operation_id",
    "idempotency_key",
    "actor_external_user_id",
    "expected_version",
    "expected_evidence_digest",
    "published_version",
    "evidence_digest",
    "evidence_expires_at",
    "occurred_at",
  ]);
});

test("extends checks forward-only for historical v1 and attested v2", () => {
  assert.match(
    migration,
    /ALTER TABLE public\.bot_reply_staging_release_evidence\s+DROP CONSTRAINT bot_reply_staging_release_evidence_payload_consistent[\s\S]*ADD CONSTRAINT bot_reply_staging_release_evidence_payload_consistent CHECK/,
  );
  assert.match(
    migration,
    /bot_reply_staging_cross_service_evidence_v1_\[0-9a-f\]\{64\}[\s\S]*bot_reply_staging_cross_service_evidence_v2_\[0-9a-f\]\{64\}/,
  );
  assert.match(
    migration,
    /operator_previous_digest CHECK[\s\S]*cross_service_evidence_v\[12\]/,
  );
  assert.match(
    migration,
    /operator_evidence_digest CHECK[\s\S]*cross_service_evidence_v\[12\]/,
  );
  assert.match(
    functionSql,
    /requested_evidence_digest ~\s+'\^bot_reply_staging_cross_service_evidence_v2_/,
  );
  assert.doesNotMatch(
    functionSql,
    /requested_evidence_digest ~[\s\S]{0,100}cross_service_evidence_v\[12\]/,
  );
});

test("bounds and exactly binds the v2, core, and attestation envelopes", () => {
  assert.match(
    functionSql,
    /pg_catalog\.octet_length\(requested_evidence_json\) NOT BETWEEN 2 AND 8192/,
  );
  assert.match(
    functionSql,
    /pg_catalog\.pg_input_is_valid\(requested_evidence_json, 'json'\)/,
  );
  assert.match(functionSql, /outer_key_count <> 7/);
  assert.match(functionSql, /attestation_key_count <> 22/);
  assert.match(functionSql, /core_key_count <> 16/);
  assert.match(
    functionSql,
    /connect-railway-bot-reply-staging-attested-release-evidence-v2/,
  );
  assert.match(
    functionSql,
    /evidence_payload ->> 'attestationPayloadDigest' <>\s+requested_attestation_payload_digest/,
  );
  assert.match(
    functionSql,
    /evidence_payload ->> 'evidenceCoreDigest' <>\s+requested_evidence_core_digest/,
  );
  assert.match(
    functionSql,
    /attestation_payload ->> 'signature' !~\s+'\^ed25519:/,
  );
  assert.match(
    functionSql,
    /attestation_payload ->> 'receiptDigest' <> requested_receipt_digest/,
  );
  assert.match(
    functionSql,
    /core_payload ->> 'attestationAuditKey' <>\s+requested_attestation_audit_key/,
  );
  assert.match(
    functionSql,
    /core_payload -> 'checks' -> 0 <> pg_catalog\.jsonb_build_object\(\s+'id', 'api-configuration', 'status', 'passed'[\s\S]*checks' -> 1[\s\S]*worker-activation[\s\S]*checks' -> 2[\s\S]*runtime-environment-alignment[\s\S]*checks' -> 3[\s\S]*tenant-alignment/,
  );
  assert.match(
    functionSql,
    /requested_issued_at = requested_signed_at[\s\S]*requested_signed_at = requested_occurred_at[\s\S]*requested_attestation_expires_at = requested_evidence_expires_at/,
  );
});

test("takes the five sorted locks before the completed run and composed mutations", () => {
  const orderedFragments = [
    "'nonce:'",
    "'run-claim:'",
    "'release-version:'",
    "'audit:'",
    "'payload:'",
    "ORDER BY locks.lock_key",
    "pg_catalog.pg_advisory_xact_lock",
    "FROM public.bot_reply_staging_runs",
    "FOR KEY SHARE",
    "MERGE INTO public.bot_reply_staging_release_evidence",
    "FROM public.consume_bot_reply_staging_attestation_nonce(",
    "FROM public.publish_bot_reply_staging_release_evidence_with_operator_audit(",
  ];
  let previousIndex = -1;
  for (const fragment of orderedFragments) {
    const index = functionSql.indexOf(fragment, previousIndex + 1);
    assert.ok(index > previousIndex, `${fragment} must preserve lock order`);
    previousIndex = index;
  }
  assert.match(
    functionSql,
    /stored_run\.status <> 'completed'[\s\S]*stored_run\.receipt_digest IS DISTINCT FROM requested_receipt_digest/,
  );
  const consumeIndex = functionSql.indexOf(
    "FROM public.consume_bot_reply_staging_attestation_nonce(",
  );
  assert.doesNotMatch(
    functionSql.slice(0, consumeIndex),
    /stored_release\.evidence_version|stored_release\.evidence_digest/,
  );
  assert.match(
    functionSql.slice(consumeIndex),
    /stored_release\.evidence_version <>\s+requested_expected_evidence_version \+ 1[\s\S]*stored_release\.evidence_digest <> requested_evidence_digest/,
  );
});

test("rolls back only logical conflicts and propagates every other error", () => {
  const consumeIndex = functionSql.indexOf(
    "FROM public.consume_bot_reply_staging_attestation_nonce(",
  );
  const publishIndex = functionSql.indexOf(
    "FROM public.publish_bot_reply_staging_release_evidence_with_operator_audit(",
  );
  const clockIndex = functionSql.indexOf("pg_catalog.clock_timestamp()", publishIndex);
  const claimReadbackIndex = functionSql.indexOf(
    "FROM public.bot_reply_staging_attestation_nonces",
    clockIndex,
  );
  const releaseReadbackIndex = functionSql.indexOf(
    "FROM public.bot_reply_staging_release_evidence",
    claimReadbackIndex,
  );
  const auditReadbackIndex = functionSql.indexOf(
    "FROM public.bot_reply_staging_release_evidence_operator_events",
    releaseReadbackIndex,
  );
  assert.ok(consumeIndex > 0);
  assert.ok(publishIndex > consumeIndex);
  assert.ok(clockIndex > publishIndex);
  assert.ok(claimReadbackIndex > clockIndex);
  assert.ok(releaseReadbackIndex > claimReadbackIndex);
  assert.ok(auditReadbackIndex > releaseReadbackIndex);

  assert.match(
    functionSql,
    /nonce_result\.result_status = 'consumed'[\s\S]*publish_result\.result_status <> 'stored'[\s\S]*nonce_result\.result_status = 'replayed'[\s\S]*publish_result\.result_status <> 'replayed'/,
  );
  assert.match(functionSql, /ERRCODE = 'ZB001'/);
  assert.match(functionSql, /EXCEPTION\s+WHEN SQLSTATE 'ZB001' THEN/);
  assert.doesNotMatch(functionSql, /WHEN OTHERS/i);
  assert.doesNotMatch(functionSql, /\b(?:COMMIT|ROLLBACK|SAVEPOINT)\b/i);

  const conflictResult = functionSql.match(
    /WHEN SQLSTATE 'ZB001' THEN([\s\S]*?)END;/,
  )?.[1];
  assert.ok(conflictResult);
  assert.equal((conflictResult.match(/NULL::/g) ?? []).length, 18);
  assert.match(conflictResult, /'conflict'::TEXT/);
});

test("keeps all mutation capability dormant and schema-qualified", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.publish_bot_reply_staging_attested_evidence_with_audit\([\s\S]*?\) FROM PUBLIC/,
  );
  for (const table of [
    "bot_reply_staging_attestation_nonces",
    "bot_reply_staging_release_evidence",
    "bot_reply_staging_release_evidence_operator_events",
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON TABLE(?:\\s+)?public\\.${table} FROM PUBLIC`),
    );
  }
  for (const triggerFunction of [
    "guard_bot_reply_staging_attestation_nonce_insert",
    "reject_bot_reply_staging_attestation_nonce_mutation",
    "enforce_bot_reply_staging_release_evidence_operator_insert",
    "reject_bot_reply_staging_release_evidence_operator_mutation",
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${triggerFunction}\\(\\)`),
    );
  }
  assert.doesNotMatch(migration, /^\s*GRANT\b/gm);
  assert.doesNotMatch(migration, /\bCREATE\s+(?:USER|ROLE)\b/i);
  assert.doesNotMatch(
    functionSql,
    /\b(?:FROM|UPDATE|MERGE INTO|INSERT INTO|DELETE FROM)\s+bot_reply_staging_/i,
  );
});
