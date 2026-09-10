-- FORWARD-ONLY: compose one verified receipt-attestation nonce with one v2
-- release-evidence CAS and its immutable operator event. This capability is
-- deliberately dormant: the migration grants no role and keeps every
-- SECURITY DEFINER entry point unavailable to PUBLIC.

-- Preserve historical v1 rows while allowing only the explicitly bound v2
-- envelope added by this migration for future attested publication.
ALTER TABLE public.bot_reply_staging_release_evidence
  DROP CONSTRAINT bot_reply_staging_release_evidence_payload_consistent;

ALTER TABLE public.bot_reply_staging_release_evidence
  ADD CONSTRAINT bot_reply_staging_release_evidence_payload_consistent CHECK (
    (
      evidence_version = 0
      AND evidence_digest IS NULL
      AND evidence_json IS NULL
      AND verified_at IS NULL
      AND expires_at IS NULL
    )
    OR
    (
      evidence_version > 0
      AND evidence_digest IS NOT NULL
      AND evidence_json IS NOT NULL
      AND pg_catalog.octet_length(evidence_json) BETWEEN 2 AND 8192
      AND pg_catalog.jsonb_typeof(evidence_json::JSONB) = 'object'
      AND verified_at IS NOT NULL
      AND expires_at IS NOT NULL
      AND expires_at >= verified_at + INTERVAL '60 seconds'
      AND expires_at <= verified_at + INTERVAL '900 seconds'
      AND (
        (
          evidence_digest ~
            '^bot_reply_staging_cross_service_evidence_v1_[0-9a-f]{64}$'
          AND evidence_json::JSONB ->> 'releaseId' = release_id
          AND evidence_json::JSONB ->> 'commitSha' = commit_sha
          AND evidence_json::JSONB ->> 'artifactDigest' = artifact_digest
          AND evidence_json::JSONB ->> 'evidenceDigest' = evidence_digest
          AND (evidence_json::JSONB ->> 'verifiedAt')::TIMESTAMPTZ =
            verified_at
          AND (evidence_json::JSONB ->> 'expiresAt')::TIMESTAMPTZ =
            expires_at
        ) IS TRUE
        OR
        (
          evidence_digest ~
            '^bot_reply_staging_cross_service_evidence_v2_[0-9a-f]{64}$'
          AND evidence_json::JSONB ?& ARRAY[
            'attestation',
            'attestationPayloadDigest',
            'core',
            'evidenceCoreDigest',
            'evidenceDigest',
            'policyVersion',
            'schemaVersion'
          ]
          AND evidence_json::JSONB - ARRAY[
            'attestation',
            'attestationPayloadDigest',
            'core',
            'evidenceCoreDigest',
            'evidenceDigest',
            'policyVersion',
            'schemaVersion'
          ]::TEXT[] = '{}'::JSONB
          AND evidence_json::JSONB -> 'schemaVersion' = '2'::JSONB
          AND evidence_json::JSONB ->> 'policyVersion' =
            'connect-railway-bot-reply-staging-attested-release-evidence-v2'
          AND evidence_json::JSONB ->> 'evidenceDigest' = evidence_digest
          AND evidence_json::JSONB ->> 'attestationPayloadDigest' ~
            '^sha256:[0-9a-f]{64}$'
          AND evidence_json::JSONB ->> 'evidenceCoreDigest' ~
            '^sha256:[0-9a-f]{64}$'
          AND pg_catalog.jsonb_typeof(
            evidence_json::JSONB -> 'attestation'
          ) = 'object'
          AND pg_catalog.jsonb_typeof(
            evidence_json::JSONB -> 'core'
          ) = 'object'
          AND (evidence_json::JSONB -> 'core') ?& ARRAY[
            'activationVersion',
            'artifactDigest',
            'attestationAuditKey',
            'checkCount',
            'checks',
            'claimVersion',
            'commitSha',
            'environment',
            'expiresAt',
            'expectedEvidenceVersion',
            'releaseId',
            'requestDigest',
            'receiptDigest',
            'runKey',
            'source',
            'verifiedAt'
          ]
          AND (evidence_json::JSONB -> 'core') - ARRAY[
            'activationVersion',
            'artifactDigest',
            'attestationAuditKey',
            'checkCount',
            'checks',
            'claimVersion',
            'commitSha',
            'environment',
            'expiresAt',
            'expectedEvidenceVersion',
            'releaseId',
            'requestDigest',
            'receiptDigest',
            'runKey',
            'source',
            'verifiedAt'
          ]::TEXT[] = '{}'::JSONB
          AND (evidence_json::JSONB -> 'core') ->> 'releaseId' = release_id
          AND (evidence_json::JSONB -> 'core') ->> 'commitSha' = commit_sha
          AND (evidence_json::JSONB -> 'core') ->> 'artifactDigest' =
            artifact_digest
          AND (
            (evidence_json::JSONB -> 'core') ->> 'expectedEvidenceVersion'
          )::INTEGER = evidence_version - 1
          AND ((evidence_json::JSONB -> 'core') ->> 'verifiedAt')::TIMESTAMPTZ =
            verified_at
          AND ((evidence_json::JSONB -> 'core') ->> 'expiresAt')::TIMESTAMPTZ =
            expires_at
          AND (evidence_json::JSONB -> 'core') ->> 'receiptDigest' ~
            '^sha256:[0-9a-f]{64}$'
          AND (evidence_json::JSONB -> 'core') ->> 'requestDigest' ~
            '^sha256:[0-9a-f]{64}$'
          AND (evidence_json::JSONB -> 'core') ->> 'runKey' ~
            '^bot_reply_staging_run_v1_[0-9a-f]{64}$'
        ) IS TRUE
      )
    )
  );

ALTER TABLE public.bot_reply_staging_release_evidence_operator_events
  DROP CONSTRAINT
    bot_reply_staging_release_evidence_operator_previous_digest;

ALTER TABLE public.bot_reply_staging_release_evidence_operator_events
  ADD CONSTRAINT
    bot_reply_staging_release_evidence_operator_previous_digest CHECK (
      (
        expected_version = 0
        AND expected_evidence_digest IS NULL
      )
      OR
      (
        expected_version > 0
        AND expected_evidence_digest IS NOT NULL
        AND expected_evidence_digest ~
          '^bot_reply_staging_cross_service_evidence_v[12]_[0-9a-f]{64}$'
      )
    );

ALTER TABLE public.bot_reply_staging_release_evidence_operator_events
  DROP CONSTRAINT
    bot_reply_staging_release_evidence_operator_evidence_digest;

ALTER TABLE public.bot_reply_staging_release_evidence_operator_events
  ADD CONSTRAINT
    bot_reply_staging_release_evidence_operator_evidence_digest CHECK (
      evidence_digest ~
        '^bot_reply_staging_cross_service_evidence_v[12]_[0-9a-f]{64}$'
    );

CREATE FUNCTION public.publish_bot_reply_staging_attested_evidence_with_audit(
  requested_policy_version TEXT,
  requested_key_id TEXT,
  requested_run_key TEXT,
  requested_claim_version INTEGER,
  requested_request_digest TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_expected_evidence_version INTEGER,
  requested_receipt_digest TEXT,
  requested_evidence_core_digest TEXT,
  requested_attestation_audit_key TEXT,
  requested_nonce TEXT,
  requested_nonce_sequence INTEGER,
  requested_issued_at TIMESTAMPTZ,
  requested_signed_at TIMESTAMPTZ,
  requested_attestation_expires_at TIMESTAMPTZ,
  requested_attestation_payload_digest TEXT,
  requested_event_key TEXT,
  requested_idempotency_key TEXT,
  requested_actor_external_user_id TEXT,
  requested_expected_evidence_digest TEXT,
  requested_evidence_digest TEXT,
  requested_evidence_json TEXT,
  requested_occurred_at TIMESTAMPTZ,
  requested_evidence_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
  result_status TEXT,
  nonce_status TEXT,
  nonce TEXT,
  receipt_digest TEXT,
  evidence_core_digest TEXT,
  attestation_payload_digest TEXT,
  event_key TEXT,
  release_id TEXT,
  commit_sha TEXT,
  artifact_digest TEXT,
  operation_id TEXT,
  idempotency_key TEXT,
  actor_external_user_id TEXT,
  expected_version INTEGER,
  expected_evidence_digest TEXT,
  published_version INTEGER,
  evidence_digest TEXT,
  evidence_expires_at TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  advisory_lock_key BIGINT;
  attestation_document JSON;
  attestation_payload JSONB;
  core_document JSON;
  core_payload JSONB;
  evidence_document JSON;
  evidence_payload JSONB;
  outer_key_count BIGINT;
  attestation_key_count BIGINT;
  core_key_count BIGINT;
  final_checked_at TIMESTAMPTZ;
  nonce_result RECORD;
  publish_result RECORD;
  stored_run public.bot_reply_staging_runs%ROWTYPE;
  stored_release public.bot_reply_staging_release_evidence%ROWTYPE;
  stored_claim public.bot_reply_staging_attestation_nonces%ROWTYPE;
  stored_event
    public.bot_reply_staging_release_evidence_operator_events%ROWTYPE;
BEGIN
  -- Reject oversized or malformed scalar inputs before parsing JSON, hashing
  -- lock identities, or touching any row.
  IF requested_policy_version IS NULL
    OR pg_catalog.octet_length(requested_policy_version) > 64
    OR requested_key_id IS NULL
    OR pg_catalog.octet_length(requested_key_id) > 128
    OR requested_run_key IS NULL
    OR pg_catalog.octet_length(requested_run_key) > 128
    OR requested_claim_version IS NULL
    OR requested_request_digest IS NULL
    OR pg_catalog.octet_length(requested_request_digest) > 80
    OR requested_release_id IS NULL
    OR pg_catalog.octet_length(requested_release_id) > 128
    OR requested_commit_sha IS NULL
    OR pg_catalog.octet_length(requested_commit_sha) > 64
    OR requested_artifact_digest IS NULL
    OR pg_catalog.octet_length(requested_artifact_digest) > 80
    OR requested_expected_evidence_version IS NULL
    OR requested_receipt_digest IS NULL
    OR pg_catalog.octet_length(requested_receipt_digest) > 80
    OR requested_evidence_core_digest IS NULL
    OR pg_catalog.octet_length(requested_evidence_core_digest) > 80
    OR requested_attestation_audit_key IS NULL
    OR pg_catalog.octet_length(requested_attestation_audit_key) > 128
    OR requested_nonce IS NULL
    OR pg_catalog.octet_length(requested_nonce) > 128
    OR requested_nonce_sequence IS NULL
    OR requested_issued_at IS NULL
    OR requested_signed_at IS NULL
    OR requested_attestation_expires_at IS NULL
    OR requested_attestation_payload_digest IS NULL
    OR pg_catalog.octet_length(requested_attestation_payload_digest) > 80
    OR requested_event_key IS NULL
    OR pg_catalog.octet_length(requested_event_key) > 128
    OR requested_idempotency_key IS NULL
    OR pg_catalog.octet_length(requested_idempotency_key) > 128
    OR requested_actor_external_user_id IS NULL
    OR pg_catalog.octet_length(requested_actor_external_user_id) > 1020
    OR requested_expected_evidence_digest IS NOT NULL
      AND pg_catalog.octet_length(requested_expected_evidence_digest) > 128
    OR requested_evidence_digest IS NULL
    OR pg_catalog.octet_length(requested_evidence_digest) > 128
    OR requested_evidence_json IS NULL
    OR pg_catalog.octet_length(requested_evidence_json) NOT BETWEEN 2 AND 8192
    OR requested_occurred_at IS NULL
    OR requested_evidence_expires_at IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attested evidence input is invalid';
  END IF;

  IF (
    requested_policy_version =
      'connect-bot-reply-staging-receipt-attestation-v1'
    AND requested_key_id ~
      '^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$'
    AND requested_run_key ~
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    AND requested_claim_version BETWEEN 1 AND 2147483647
    AND requested_request_digest ~ '^sha256:[a-f0-9]{64}$'
    AND requested_release_id ~ '^connect_release_v1_[a-f0-9]{64}$'
    AND requested_commit_sha ~ '^[a-f0-9]{40}$'
    AND requested_artifact_digest ~ '^sha256:[a-f0-9]{64}$'
    AND requested_expected_evidence_version BETWEEN 0 AND 2147483646
    AND requested_receipt_digest ~ '^sha256:[a-f0-9]{64}$'
    AND requested_evidence_core_digest ~ '^sha256:[a-f0-9]{64}$'
    AND requested_attestation_audit_key ~
      '^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$'
    AND requested_nonce ~
      '^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$'
    AND requested_nonce_sequence BETWEEN 1 AND 2147483647
    AND requested_nonce_sequence = requested_claim_version
    AND requested_attestation_payload_digest ~ '^sha256:[a-f0-9]{64}$'
    AND requested_event_key ~
      '^bot_reply_staging_release_evidence_operator_event_v1_[a-f0-9]{64}$'
    AND requested_idempotency_key ~
      '^connect_idempotency_v1_[a-f0-9]{64}$'
    AND pg_catalog.length(requested_actor_external_user_id) BETWEEN 1 AND 255
    AND pg_catalog.btrim(requested_actor_external_user_id) =
      requested_actor_external_user_id
    AND requested_actor_external_user_id !~ '[[:cntrl:]]'
    AND (
      (
        requested_expected_evidence_version = 0
        AND requested_expected_evidence_digest IS NULL
      )
      OR
      (
        requested_expected_evidence_version > 0
        AND requested_expected_evidence_digest ~
          '^bot_reply_staging_cross_service_evidence_v[12]_[a-f0-9]{64}$'
      )
    )
    AND requested_evidence_digest ~
      '^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$'
    AND pg_catalog.isfinite(requested_issued_at)
    AND pg_catalog.isfinite(requested_signed_at)
    AND pg_catalog.isfinite(requested_attestation_expires_at)
    AND pg_catalog.isfinite(requested_occurred_at)
    AND pg_catalog.isfinite(requested_evidence_expires_at)
    AND requested_issued_at = pg_catalog.date_trunc(
      'milliseconds',
      requested_issued_at
    )
    AND requested_signed_at = pg_catalog.date_trunc(
      'milliseconds',
      requested_signed_at
    )
    AND requested_attestation_expires_at = pg_catalog.date_trunc(
      'milliseconds',
      requested_attestation_expires_at
    )
    AND requested_occurred_at = pg_catalog.date_trunc(
      'milliseconds',
      requested_occurred_at
    )
    AND requested_evidence_expires_at = pg_catalog.date_trunc(
      'milliseconds',
      requested_evidence_expires_at
    )
    AND requested_issued_at = requested_signed_at
    AND requested_signed_at = requested_occurred_at
    AND requested_attestation_expires_at = requested_evidence_expires_at
    AND requested_evidence_expires_at >=
      requested_occurred_at + INTERVAL '60 seconds'
    AND requested_evidence_expires_at <=
      requested_occurred_at + INTERVAL '900 seconds'
  ) IS NOT TRUE
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attested evidence binding is invalid';
  END IF;

  IF pg_catalog.pg_input_is_valid(requested_evidence_json, 'json') IS NOT TRUE
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attested evidence JSON is invalid';
  END IF;

  evidence_document := requested_evidence_json::JSON;
  evidence_payload := requested_evidence_json::JSONB;
  IF pg_catalog.json_typeof(evidence_document) <> 'object' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging evidence envelope is invalid';
  END IF;

  SELECT pg_catalog.count(*)
  INTO outer_key_count
  FROM pg_catalog.json_object_keys(evidence_document);

  IF (
    outer_key_count <> 7
    OR evidence_payload ?& ARRAY[
      'attestation',
      'attestationPayloadDigest',
      'core',
      'evidenceCoreDigest',
      'evidenceDigest',
      'policyVersion',
      'schemaVersion'
    ] IS NOT TRUE
    OR evidence_payload - ARRAY[
      'attestation',
      'attestationPayloadDigest',
      'core',
      'evidenceCoreDigest',
      'evidenceDigest',
      'policyVersion',
      'schemaVersion'
    ]::TEXT[] <> '{}'::JSONB
    OR evidence_payload -> 'schemaVersion' <> '2'::JSONB
    OR evidence_payload ->> 'policyVersion' <>
      'connect-railway-bot-reply-staging-attested-release-evidence-v2'
    OR evidence_payload ->> 'attestationPayloadDigest' <>
      requested_attestation_payload_digest
    OR evidence_payload ->> 'evidenceCoreDigest' <>
      requested_evidence_core_digest
    OR evidence_payload ->> 'evidenceDigest' <> requested_evidence_digest
    OR pg_catalog.json_typeof(evidence_document -> 'attestation') <>
      'object'
    OR pg_catalog.json_typeof(evidence_document -> 'core') <> 'object'
  ) IS NOT FALSE
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging evidence envelope is not exact';
  END IF;

  attestation_document := evidence_document -> 'attestation';
  attestation_payload := evidence_payload -> 'attestation';
  core_document := evidence_document -> 'core';
  core_payload := evidence_payload -> 'core';

  SELECT pg_catalog.count(*)
  INTO attestation_key_count
  FROM pg_catalog.json_object_keys(attestation_document);

  IF (
    attestation_key_count <> 22
    OR attestation_payload ?& ARRAY[
      'algorithm',
      'artifactDigest',
      'auditKey',
      'audience',
      'commitSha',
      'claimVersion',
      'environment',
      'evidenceCoreDigest',
      'expectedEvidenceVersion',
      'expiresAt',
      'issuedAt',
      'keyId',
      'nonce',
      'nonceSequence',
      'policyVersion',
      'receiptDigest',
      'releaseId',
      'requestDigest',
      'runKey',
      'schemaVersion',
      'signature',
      'signedAt'
    ] IS NOT TRUE
    OR attestation_payload - ARRAY[
      'algorithm',
      'artifactDigest',
      'auditKey',
      'audience',
      'commitSha',
      'claimVersion',
      'environment',
      'evidenceCoreDigest',
      'expectedEvidenceVersion',
      'expiresAt',
      'issuedAt',
      'keyId',
      'nonce',
      'nonceSequence',
      'policyVersion',
      'receiptDigest',
      'releaseId',
      'requestDigest',
      'runKey',
      'schemaVersion',
      'signature',
      'signedAt'
    ]::TEXT[] <> '{}'::JSONB
    OR attestation_payload -> 'schemaVersion' <> '1'::JSONB
    OR attestation_payload ->> 'policyVersion' <> requested_policy_version
    OR attestation_payload ->> 'algorithm' <> 'Ed25519'
    OR attestation_payload ->> 'audience' <>
      'connect-release-evidence-builder'
    OR attestation_payload ->> 'environment' <> 'staging'
    OR attestation_payload ->> 'keyId' <> requested_key_id
    OR attestation_payload ->> 'runKey' <> requested_run_key
    OR attestation_payload -> 'claimVersion' <>
      pg_catalog.to_jsonb(requested_claim_version)
    OR attestation_payload ->> 'requestDigest' <> requested_request_digest
    OR attestation_payload ->> 'releaseId' <> requested_release_id
    OR attestation_payload ->> 'commitSha' <> requested_commit_sha
    OR attestation_payload ->> 'artifactDigest' <> requested_artifact_digest
    OR attestation_payload -> 'expectedEvidenceVersion' <>
      pg_catalog.to_jsonb(requested_expected_evidence_version)
    OR attestation_payload ->> 'receiptDigest' <> requested_receipt_digest
    OR attestation_payload ->> 'evidenceCoreDigest' <>
      requested_evidence_core_digest
    OR attestation_payload ->> 'auditKey' <>
      requested_attestation_audit_key
    OR attestation_payload ->> 'nonce' <> requested_nonce
    OR attestation_payload -> 'nonceSequence' <>
      pg_catalog.to_jsonb(requested_nonce_sequence)
    OR attestation_payload ->> 'issuedAt' <>
      pg_catalog.to_char(
        requested_issued_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    OR attestation_payload ->> 'signedAt' <>
      pg_catalog.to_char(
        requested_signed_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    OR attestation_payload ->> 'expiresAt' <>
      pg_catalog.to_char(
        requested_attestation_expires_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    OR attestation_payload ->> 'signature' !~
      '^ed25519:[A-Za-z0-9_-]{86}$'
  ) IS NOT FALSE
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attestation envelope is not exact';
  END IF;

  SELECT pg_catalog.count(*)
  INTO core_key_count
  FROM pg_catalog.json_object_keys(core_document);

  IF (
    core_key_count <> 16
    OR core_payload ?& ARRAY[
      'activationVersion',
      'artifactDigest',
      'attestationAuditKey',
      'checkCount',
      'checks',
      'claimVersion',
      'commitSha',
      'environment',
      'expiresAt',
      'expectedEvidenceVersion',
      'releaseId',
      'requestDigest',
      'receiptDigest',
      'runKey',
      'source',
      'verifiedAt'
    ] IS NOT TRUE
    OR core_payload - ARRAY[
      'activationVersion',
      'artifactDigest',
      'attestationAuditKey',
      'checkCount',
      'checks',
      'claimVersion',
      'commitSha',
      'environment',
      'expiresAt',
      'expectedEvidenceVersion',
      'releaseId',
      'requestDigest',
      'receiptDigest',
      'runKey',
      'source',
      'verifiedAt'
    ]::TEXT[] <> '{}'::JSONB
    OR core_payload ->> 'activationVersion' <>
      'connect-railway-bot-reply-staging-cross-service-activation-v1'
    OR core_payload ->> 'artifactDigest' <> requested_artifact_digest
    OR core_payload ->> 'attestationAuditKey' <>
      requested_attestation_audit_key
    OR core_payload -> 'checkCount' <> '4'::JSONB
    OR core_payload -> 'claimVersion' <>
      pg_catalog.to_jsonb(requested_claim_version)
    OR core_payload ->> 'commitSha' <> requested_commit_sha
    OR core_payload ->> 'environment' <> 'staging'
    OR core_payload ->> 'expiresAt' <>
      pg_catalog.to_char(
        requested_evidence_expires_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    OR core_payload -> 'expectedEvidenceVersion' <>
      pg_catalog.to_jsonb(requested_expected_evidence_version)
    OR core_payload ->> 'releaseId' <> requested_release_id
    OR core_payload ->> 'requestDigest' <> requested_request_digest
    OR core_payload ->> 'receiptDigest' <> requested_receipt_digest
    OR core_payload ->> 'runKey' <> requested_run_key
    OR core_payload ->> 'source' <>
      'railway-api-worker-cross-service-preflight'
    OR core_payload ->> 'verifiedAt' <>
      pg_catalog.to_char(
        requested_occurred_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    OR pg_catalog.jsonb_typeof(core_payload -> 'checks') <> 'array'
    OR pg_catalog.jsonb_array_length(core_payload -> 'checks') <> 4
    OR core_payload -> 'checks' -> 0 <> pg_catalog.jsonb_build_object(
      'id', 'api-configuration', 'status', 'passed'
    )
    OR core_payload -> 'checks' -> 1 <> pg_catalog.jsonb_build_object(
      'id', 'worker-activation', 'status', 'passed'
    )
    OR core_payload -> 'checks' -> 2 <> pg_catalog.jsonb_build_object(
      'id', 'runtime-environment-alignment', 'status', 'passed'
    )
    OR core_payload -> 'checks' -> 3 <> pg_catalog.jsonb_build_object(
      'id', 'tenant-alignment', 'status', 'passed'
    )
  ) IS NOT FALSE
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging evidence core is not exact';
  END IF;

  -- Serialize the five nonce-ledger collision domains before taking row locks.
  FOR advisory_lock_key IN
    SELECT locks.lock_key
    FROM pg_catalog.unnest(ARRAY[
      pg_catalog.hashtextextended(
        'nonce:' || COALESCE(requested_nonce, '<null>'),
        0
      ),
      pg_catalog.hashtextextended(
        'run-claim:' || COALESCE(requested_run_key, '<null>') ||
          ':' || COALESCE(
            requested_claim_version::TEXT,
            '<null>'
          ),
        0
      ),
      pg_catalog.hashtextextended(
        'release-version:' ||
          COALESCE(requested_release_id, '<null>') || ':' ||
          COALESCE(
            requested_expected_evidence_version::TEXT,
            '<null>'
          ),
        0
      ),
      pg_catalog.hashtextextended(
        'audit:' ||
          COALESCE(requested_attestation_audit_key, '<null>'),
        0
      ),
      pg_catalog.hashtextextended(
        'payload:' || COALESCE(
          requested_attestation_payload_digest,
          '<null>'
        ),
        0
      )
    ]::BIGINT[]) AS locks(lock_key)
    ORDER BY locks.lock_key
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(advisory_lock_key);
  END LOOP;

  SELECT staging_run.*
  INTO stored_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
  FOR KEY SHARE;

  IF NOT FOUND
    OR stored_run.status <> 'completed'
    OR stored_run.claim_version <> requested_claim_version
    OR stored_run.request_digest <> requested_request_digest
    OR stored_run.release_id <> requested_release_id
    OR stored_run.commit_sha <> requested_commit_sha
    OR stored_run.artifact_digest <> requested_artifact_digest
    OR stored_run.receipt_digest IS DISTINCT FROM requested_receipt_digest
    OR stored_run.completed_at IS NULL
    OR requested_issued_at < stored_run.completed_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attestation lacks an exact completed run';
  END IF;

  -- This block is a PostgreSQL subtransaction because it has an exception
  -- handler. A logical conflict unwinds release initialization, nonce
  -- consumption, evidence CAS, and operator audit together.
  IF requested_expected_evidence_version = 0
    AND requested_expected_evidence_digest IS NULL
  THEN
    MERGE INTO public.bot_reply_staging_release_evidence AS evidence
    USING (
      VALUES (
        requested_release_id,
        requested_commit_sha,
        requested_artifact_digest,
        requested_occurred_at
      )
    ) AS proposed (
      release_id,
      commit_sha,
      artifact_digest,
      initialized_at
    )
    ON evidence.release_id = proposed.release_id
    WHEN NOT MATCHED THEN
      INSERT (
        release_id,
        commit_sha,
        artifact_digest,
        initialized_at,
        updated_at
      ) VALUES (
        proposed.release_id,
        proposed.commit_sha,
        proposed.artifact_digest,
        proposed.initialized_at,
        proposed.initialized_at
      );
  END IF;

  -- Do not pre-check the release version here. An exact retry necessarily
  -- observes expected + 1, and both composed primitives must be allowed to
  -- return their exact replay result. A new or mismatched claim is still
  -- fail-closed: the nonce consumer and publisher validate their own
  -- preconditions, and any conflict rolls their writes back together.
  SELECT consumed.*
  INTO nonce_result
  FROM public.consume_bot_reply_staging_attestation_nonce(
    requested_policy_version,
    requested_key_id,
    requested_run_key,
    requested_claim_version,
    requested_request_digest,
    requested_release_id,
    requested_commit_sha,
    requested_artifact_digest,
    requested_expected_evidence_version,
    requested_receipt_digest,
    requested_evidence_core_digest,
    requested_attestation_audit_key,
    requested_nonce,
    requested_nonce_sequence,
    requested_issued_at,
    requested_signed_at,
    requested_attestation_expires_at,
    requested_attestation_payload_digest
  ) AS consumed;

  IF NOT FOUND OR nonce_result.result_status = 'conflict' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attestation nonce conflicted';
  END IF;

  SELECT published.*
  INTO publish_result
  FROM public.publish_bot_reply_staging_release_evidence_with_operator_audit(
    requested_event_key,
    requested_release_id,
    requested_commit_sha,
    requested_artifact_digest,
    requested_idempotency_key,
    requested_actor_external_user_id,
    requested_expected_evidence_version,
    requested_expected_evidence_digest,
    requested_evidence_digest,
    requested_evidence_json,
    requested_occurred_at,
    requested_evidence_expires_at
  ) AS published;

  IF NOT FOUND OR publish_result.result_status = 'conflict'
    OR (
      nonce_result.result_status = 'consumed'
      AND publish_result.result_status <> 'stored'
    )
    OR (
      nonce_result.result_status = 'replayed'
      AND publish_result.result_status <> 'replayed'
    )
    OR nonce_result.result_status NOT IN ('consumed', 'replayed')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attested publish pairing conflicted';
  END IF;

  final_checked_at := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  IF requested_signed_at > final_checked_at
    OR final_checked_at >= requested_attestation_expires_at
    OR requested_occurred_at > final_checked_at
    OR final_checked_at >= requested_evidence_expires_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'ZB001',
      MESSAGE = 'Bot reply staging attested evidence expired during publish';
  END IF;

  SELECT ledger.*
  INTO stored_claim
  FROM public.bot_reply_staging_attestation_nonces AS ledger
  WHERE ledger.nonce = requested_nonce;

  IF NOT FOUND
    OR stored_claim.policy_version <> requested_policy_version
    OR stored_claim.key_id <> requested_key_id
    OR stored_claim.run_key <> requested_run_key
    OR stored_claim.claim_version <> requested_claim_version
    OR stored_claim.request_digest <> requested_request_digest
    OR stored_claim.release_id <> requested_release_id
    OR stored_claim.commit_sha <> requested_commit_sha
    OR stored_claim.artifact_digest <> requested_artifact_digest
    OR stored_claim.expected_evidence_version <>
      requested_expected_evidence_version
    OR stored_claim.receipt_digest <> requested_receipt_digest
    OR stored_claim.evidence_core_digest <> requested_evidence_core_digest
    OR stored_claim.audit_key <> requested_attestation_audit_key
    OR stored_claim.nonce_sequence <> requested_nonce_sequence
    OR stored_claim.issued_at <> requested_issued_at
    OR stored_claim.signed_at <> requested_signed_at
    OR stored_claim.expires_at <> requested_attestation_expires_at
    OR stored_claim.attestation_payload_digest <>
      requested_attestation_payload_digest
  THEN
    RAISE EXCEPTION
      'Bot reply staging attestation nonce final read-back failed';
  END IF;

  SELECT release_evidence.*
  INTO stored_release
  FROM public.bot_reply_staging_release_evidence AS release_evidence
  WHERE release_evidence.release_id = requested_release_id
    AND release_evidence.commit_sha = requested_commit_sha
    AND release_evidence.artifact_digest = requested_artifact_digest;

  IF NOT FOUND
    OR stored_release.evidence_version <>
      requested_expected_evidence_version + 1
    OR stored_release.evidence_digest <> requested_evidence_digest
    OR stored_release.evidence_json <> requested_evidence_json
    OR stored_release.verified_at <> requested_occurred_at
    OR stored_release.expires_at <> requested_evidence_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging release evidence final read-back failed';
  END IF;

  SELECT operator_event.*
  INTO stored_event
  FROM public.bot_reply_staging_release_evidence_operator_events
    AS operator_event
  WHERE operator_event.event_key = requested_event_key
    AND operator_event.release_id = requested_release_id
    AND operator_event.idempotency_key = requested_idempotency_key;

  IF NOT FOUND
    OR stored_event.commit_sha <> requested_commit_sha
    OR stored_event.artifact_digest <> requested_artifact_digest
    OR stored_event.operation_id <>
      'system-admin.bot-reply-staging.release-evidence.publish'
    OR stored_event.actor_external_user_id <>
      requested_actor_external_user_id
    OR stored_event.expected_version <>
      requested_expected_evidence_version
    OR stored_event.expected_evidence_digest IS DISTINCT FROM
      requested_expected_evidence_digest
    OR stored_event.published_version <>
      requested_expected_evidence_version + 1
    OR stored_event.evidence_digest <> requested_evidence_digest
    OR stored_event.evidence_expires_at <> requested_evidence_expires_at
    OR stored_event.occurred_at <> requested_occurred_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging operator audit final read-back failed';
  END IF;

  RETURN QUERY SELECT
    publish_result.result_status::TEXT,
    nonce_result.result_status::TEXT,
    stored_claim.nonce,
    stored_claim.receipt_digest,
    stored_claim.evidence_core_digest,
    stored_claim.attestation_payload_digest,
    stored_event.event_key,
    stored_event.release_id,
    stored_event.commit_sha,
    stored_event.artifact_digest,
    stored_event.operation_id,
    stored_event.idempotency_key,
    stored_event.actor_external_user_id,
    stored_event.expected_version,
    stored_event.expected_evidence_digest,
    stored_event.published_version,
    stored_event.evidence_digest,
    stored_event.evidence_expires_at,
    stored_event.occurred_at;
EXCEPTION
  WHEN SQLSTATE 'ZB001' THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ;
END;
$$;

-- Defence in depth: keep both composed primitives, their protected tables,
-- and every trigger guard unavailable to PUBLIC. Capability-role grants must
-- be introduced only by a separately reviewed activation migration.
REVOKE ALL ON FUNCTION public.publish_bot_reply_staging_attested_evidence_with_audit(
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.consume_bot_reply_staging_attestation_nonce(
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.publish_bot_reply_staging_release_evidence_with_operator_audit(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ
) FROM PUBLIC;

REVOKE ALL ON TABLE public.bot_reply_staging_attestation_nonces FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_staging_release_evidence FROM PUBLIC;
REVOKE ALL ON TABLE
  public.bot_reply_staging_release_evidence_operator_events FROM PUBLIC;

REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_attestation_nonce_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_attestation_nonce_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_staging_release_evidence_operator_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_release_evidence_operator_mutation()
  FROM PUBLIC;

COMMENT ON FUNCTION public.publish_bot_reply_staging_attested_evidence_with_audit(
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ
) IS
  'Dormant atomic boundary for exact completed-run receipt binding, attestation nonce consumption, v2 release evidence CAS, and immutable operator audit. No runtime role is granted access.';
