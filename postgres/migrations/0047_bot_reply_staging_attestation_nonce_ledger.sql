-- EXPAND-ONLY: durable, payload-free replay protection for verified staging
-- receipt attestations. The function is unavailable to PUBLIC and no runtime
-- role receives access in this migration. Production use remains blocked until
-- migration-owner and runtime identities are separated and reviewed.

CREATE TABLE public.bot_reply_staging_attestation_nonces (
  nonce TEXT PRIMARY KEY,
  policy_version TEXT NOT NULL,
  key_id TEXT NOT NULL,
  run_key TEXT NOT NULL,
  claim_version INTEGER NOT NULL,
  request_digest TEXT NOT NULL,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  expected_evidence_version INTEGER NOT NULL,
  receipt_digest TEXT NOT NULL,
  evidence_core_digest TEXT NOT NULL,
  audit_key TEXT NOT NULL,
  nonce_sequence INTEGER NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attestation_payload_digest TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_attestation_run_fk
    FOREIGN KEY (run_key)
    REFERENCES public.bot_reply_staging_runs (run_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_attestation_release_fk
    FOREIGN KEY (release_id, commit_sha, artifact_digest)
    REFERENCES public.bot_reply_staging_release_evidence (
      release_id,
      commit_sha,
      artifact_digest
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_attestation_policy_v1 CHECK (
    policy_version =
      'connect-bot-reply-staging-receipt-attestation-v1'
  ),
  CONSTRAINT bot_reply_attestation_key_id_format CHECK (
    key_id ~ '^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_run_key_format CHECK (
    run_key ~ '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_claim_version_range CHECK (
    claim_version BETWEEN 1 AND 2147483647
  ),
  CONSTRAINT bot_reply_attestation_request_digest_format CHECK (
    request_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_release_id_format CHECK (
    release_id ~ '^connect_release_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_commit_sha_format CHECK (
    commit_sha ~ '^[a-f0-9]{40}$'
  ),
  CONSTRAINT bot_reply_attestation_artifact_digest_format CHECK (
    artifact_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_evidence_version_range CHECK (
    expected_evidence_version BETWEEN 0 AND 2147483646
  ),
  CONSTRAINT bot_reply_attestation_receipt_digest_format CHECK (
    receipt_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_core_digest_format CHECK (
    evidence_core_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_audit_key_format CHECK (
    audit_key ~
      '^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_nonce_format CHECK (
    nonce ~
      '^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_sequence_range CHECK (
    nonce_sequence BETWEEN 1 AND 2147483647
      AND nonce_sequence = claim_version
  ),
  CONSTRAINT bot_reply_attestation_payload_digest_format CHECK (
    attestation_payload_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_attestation_millisecond_times CHECK (
    issued_at = date_trunc('milliseconds', issued_at)
      AND signed_at = date_trunc('milliseconds', signed_at)
      AND expires_at = date_trunc('milliseconds', expires_at)
      AND consumed_at = date_trunc('milliseconds', consumed_at)
  ),
  CONSTRAINT bot_reply_attestation_time_order CHECK (
    issued_at <= signed_at
      AND signed_at <= consumed_at
      AND consumed_at < expires_at
  ),
  CONSTRAINT bot_reply_attestation_lifetime CHECK (
    expires_at >= issued_at + INTERVAL '60 seconds'
      AND expires_at <= issued_at + INTERVAL '900 seconds'
  ),
  CONSTRAINT bot_reply_attestation_run_claim_unique UNIQUE (
    run_key,
    claim_version
  ),
  CONSTRAINT bot_reply_attestation_release_version_unique UNIQUE (
    release_id,
    expected_evidence_version
  ),
  CONSTRAINT bot_reply_attestation_audit_key_unique UNIQUE (audit_key),
  CONSTRAINT bot_reply_attestation_payload_digest_unique UNIQUE (
    attestation_payload_digest
  )
);

CREATE INDEX bot_reply_attestation_expiry_idx
  ON public.bot_reply_staging_attestation_nonces (expires_at, nonce);

CREATE FUNCTION public.guard_bot_reply_staging_attestation_nonce_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  stored_run public.bot_reply_staging_runs%ROWTYPE;
BEGIN
  SELECT staging_run.*
  INTO stored_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = NEW.run_key
  FOR KEY SHARE;

  IF NOT FOUND
    OR stored_run.status <> 'completed'
    OR stored_run.claim_version <> NEW.claim_version
    OR stored_run.request_digest <> NEW.request_digest
    OR stored_run.release_id <> NEW.release_id
    OR stored_run.commit_sha <> NEW.commit_sha
    OR stored_run.artifact_digest <> NEW.artifact_digest
    OR stored_run.completed_at IS NULL
    OR NEW.issued_at < stored_run.completed_at
    OR pg_catalog.clock_timestamp() >= NEW.expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging attestation nonce lacks an exact completed run';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_attestation_nonce_insert_guard
BEFORE INSERT ON public.bot_reply_staging_attestation_nonces
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_attestation_nonce_insert();

CREATE FUNCTION public.reject_bot_reply_staging_attestation_nonce_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply staging attestation nonce claims are immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_attestation_nonce_immutable
BEFORE UPDATE OR DELETE ON public.bot_reply_staging_attestation_nonces
FOR EACH ROW
EXECUTE FUNCTION public.reject_bot_reply_staging_attestation_nonce_mutation();

CREATE FUNCTION public.consume_bot_reply_staging_attestation_nonce(
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
  requested_audit_key TEXT,
  requested_nonce TEXT,
  requested_nonce_sequence INTEGER,
  requested_issued_at TIMESTAMPTZ,
  requested_signed_at TIMESTAMPTZ,
  requested_expires_at TIMESTAMPTZ,
  requested_attestation_payload_digest TEXT
)
RETURNS TABLE (
  result_status TEXT,
  nonce TEXT,
  receipt_digest TEXT,
  evidence_core_digest TEXT,
  expected_evidence_version INTEGER,
  attestation_payload_digest TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  advisory_lock_key BIGINT;
  claim_consumed_at TIMESTAMPTZ;
  matching_claim_count BIGINT;
  stored_release public.bot_reply_staging_release_evidence%ROWTYPE;
  stored_run public.bot_reply_staging_runs%ROWTYPE;
  stored_claim public.bot_reply_staging_attestation_nonces%ROWTYPE;
BEGIN
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
    OR requested_audit_key IS NULL
    OR pg_catalog.octet_length(requested_audit_key) > 128
    OR requested_nonce IS NULL
    OR pg_catalog.octet_length(requested_nonce) > 128
    OR requested_nonce_sequence IS NULL
    OR requested_issued_at IS NULL
    OR requested_signed_at IS NULL
    OR requested_expires_at IS NULL
    OR requested_attestation_payload_digest IS NULL
    OR pg_catalog.octet_length(requested_attestation_payload_digest) > 80
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
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
    AND requested_audit_key ~
      '^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$'
    AND requested_nonce ~
      '^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$'
    AND requested_nonce_sequence BETWEEN 1 AND 2147483647
    AND requested_nonce_sequence = requested_claim_version
    AND requested_attestation_payload_digest ~ '^sha256:[a-f0-9]{64}$'
    AND pg_catalog.isfinite(requested_issued_at)
    AND pg_catalog.isfinite(requested_signed_at)
    AND pg_catalog.isfinite(requested_expires_at)
    AND requested_issued_at = date_trunc(
      'milliseconds',
      requested_issued_at
    )
    AND requested_signed_at = date_trunc(
      'milliseconds',
      requested_signed_at
    )
    AND requested_expires_at = date_trunc(
      'milliseconds',
      requested_expires_at
    )
    AND requested_issued_at <= requested_signed_at
    AND requested_signed_at < requested_expires_at
    AND requested_expires_at >=
      requested_issued_at + INTERVAL '60 seconds'
    AND requested_expires_at <=
      requested_issued_at + INTERVAL '900 seconds'
  ) IS NOT TRUE
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Lock every uniqueness domain in a stable order. A hash collision only
  -- serializes unrelated staging claims; the exact row checks remain the
  -- identity boundary.
  FOR advisory_lock_key IN
    SELECT locks.lock_key
    FROM pg_catalog.unnest(ARRAY[
      pg_catalog.hashtextextended(
        'nonce:' || COALESCE(requested_nonce, '<null>'),
        0
      ),
      pg_catalog.hashtextextended(
        'run-claim:' || COALESCE(requested_run_key, '<null>') || ':' ||
          COALESCE(requested_claim_version::TEXT, '<null>'),
        0
      ),
      pg_catalog.hashtextextended(
        'release-version:' || COALESCE(requested_release_id, '<null>') ||
          ':' || COALESCE(
            requested_expected_evidence_version::TEXT,
            '<null>'
          ),
        0
      ),
      pg_catalog.hashtextextended(
        'audit:' || COALESCE(requested_audit_key, '<null>'),
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

  claim_consumed_at := date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  IF requested_signed_at > claim_consumed_at
    OR claim_consumed_at >= requested_expires_at
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  SELECT count(*)
  INTO matching_claim_count
  FROM public.bot_reply_staging_attestation_nonces AS ledger
  WHERE ledger.nonce = requested_nonce
    OR (
      ledger.run_key = requested_run_key
      AND ledger.claim_version = requested_claim_version
    )
    OR (
      ledger.release_id = requested_release_id
      AND ledger.expected_evidence_version =
        requested_expected_evidence_version
    )
    OR ledger.audit_key = requested_audit_key
    OR ledger.attestation_payload_digest =
      requested_attestation_payload_digest;

  IF matching_claim_count > 1 THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  IF matching_claim_count = 1 THEN
    SELECT ledger.*
    INTO stored_claim
    FROM public.bot_reply_staging_attestation_nonces AS ledger
    WHERE ledger.nonce = requested_nonce
      OR (
        ledger.run_key = requested_run_key
        AND ledger.claim_version = requested_claim_version
      )
      OR (
        ledger.release_id = requested_release_id
        AND ledger.expected_evidence_version =
          requested_expected_evidence_version
      )
      OR ledger.audit_key = requested_audit_key
      OR ledger.attestation_payload_digest =
        requested_attestation_payload_digest
    LIMIT 1;

    IF stored_claim.policy_version = requested_policy_version
      AND stored_claim.key_id = requested_key_id
      AND stored_claim.run_key = requested_run_key
      AND stored_claim.claim_version = requested_claim_version
      AND stored_claim.request_digest = requested_request_digest
      AND stored_claim.release_id = requested_release_id
      AND stored_claim.commit_sha = requested_commit_sha
      AND stored_claim.artifact_digest = requested_artifact_digest
      AND stored_claim.expected_evidence_version =
        requested_expected_evidence_version
      AND stored_claim.receipt_digest = requested_receipt_digest
      AND stored_claim.evidence_core_digest = requested_evidence_core_digest
      AND stored_claim.audit_key = requested_audit_key
      AND stored_claim.nonce = requested_nonce
      AND stored_claim.nonce_sequence = requested_nonce_sequence
      AND stored_claim.issued_at = requested_issued_at
      AND stored_claim.signed_at = requested_signed_at
      AND stored_claim.expires_at = requested_expires_at
      AND stored_claim.attestation_payload_digest =
        requested_attestation_payload_digest
    THEN
      claim_consumed_at := date_trunc(
        'milliseconds',
        pg_catalog.clock_timestamp()
      );
      IF requested_signed_at > claim_consumed_at
        OR claim_consumed_at >= requested_expires_at
      THEN
        RETURN QUERY SELECT
          'conflict'::TEXT,
          NULL::TEXT,
          NULL::TEXT,
          NULL::TEXT,
          NULL::INTEGER,
          NULL::TEXT;
      ELSE
        RETURN QUERY SELECT
          'replayed'::TEXT,
          stored_claim.nonce,
          stored_claim.receipt_digest,
          stored_claim.evidence_core_digest,
          stored_claim.expected_evidence_version,
          stored_claim.attestation_payload_digest;
      END IF;
    ELSE
      RETURN QUERY SELECT
        'conflict'::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        NULL::INTEGER,
        NULL::TEXT;
    END IF;
    RETURN;
  END IF;

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
    OR stored_run.completed_at IS NULL
    OR requested_issued_at < stored_run.completed_at
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  SELECT release_evidence.*
  INTO stored_release
  FROM public.bot_reply_staging_release_evidence AS release_evidence
  WHERE release_evidence.release_id = requested_release_id
    AND release_evidence.commit_sha = requested_commit_sha
    AND release_evidence.artifact_digest = requested_artifact_digest
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  IF stored_release.evidence_version <>
    requested_expected_evidence_version
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  claim_consumed_at := date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  IF requested_signed_at > claim_consumed_at
    OR claim_consumed_at >= requested_expires_at
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;

  MERGE INTO public.bot_reply_staging_attestation_nonces AS ledger
  USING (
    VALUES (
      requested_nonce,
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
      requested_audit_key,
      requested_nonce_sequence,
      requested_issued_at,
      requested_signed_at,
      requested_expires_at,
      requested_attestation_payload_digest,
      claim_consumed_at
    )
  ) AS proposed (
    nonce,
    policy_version,
    key_id,
    run_key,
    claim_version,
    request_digest,
    release_id,
    commit_sha,
    artifact_digest,
    expected_evidence_version,
    receipt_digest,
    evidence_core_digest,
    audit_key,
    nonce_sequence,
    issued_at,
    signed_at,
    expires_at,
    attestation_payload_digest,
    consumed_at
  )
  ON ledger.nonce = proposed.nonce
  WHEN NOT MATCHED THEN
    INSERT (
      nonce,
      policy_version,
      key_id,
      run_key,
      claim_version,
      request_digest,
      release_id,
      commit_sha,
      artifact_digest,
      expected_evidence_version,
      receipt_digest,
      evidence_core_digest,
      audit_key,
      nonce_sequence,
      issued_at,
      signed_at,
      expires_at,
      attestation_payload_digest,
      consumed_at
    ) VALUES (
      proposed.nonce,
      proposed.policy_version,
      proposed.key_id,
      proposed.run_key,
      proposed.claim_version,
      proposed.request_digest,
      proposed.release_id,
      proposed.commit_sha,
      proposed.artifact_digest,
      proposed.expected_evidence_version,
      proposed.receipt_digest,
      proposed.evidence_core_digest,
      proposed.audit_key,
      proposed.nonce_sequence,
      proposed.issued_at,
      proposed.signed_at,
      proposed.expires_at,
      proposed.attestation_payload_digest,
      proposed.consumed_at
    );

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
    OR stored_claim.audit_key <> requested_audit_key
    OR stored_claim.nonce <> requested_nonce
    OR stored_claim.nonce_sequence <> requested_nonce_sequence
    OR stored_claim.issued_at <> requested_issued_at
    OR stored_claim.signed_at <> requested_signed_at
    OR stored_claim.expires_at <> requested_expires_at
    OR stored_claim.attestation_payload_digest <>
      requested_attestation_payload_digest
    OR stored_claim.consumed_at <> claim_consumed_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging attestation nonce read-back mismatch';
  END IF;

  RETURN QUERY SELECT
    'consumed'::TEXT,
    stored_claim.nonce,
    stored_claim.receipt_digest,
    stored_claim.evidence_core_digest,
    stored_claim.expected_evidence_version,
    stored_claim.attestation_payload_digest;
END;
$$;

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

REVOKE ALL ON TABLE public.bot_reply_staging_attestation_nonces FROM PUBLIC;

REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_attestation_nonce_insert()
  FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_attestation_nonce_mutation()
  FROM PUBLIC;

COMMENT ON TABLE public.bot_reply_staging_attestation_nonces IS
  'Payload-free, immutable replay evidence for verified Bot reply staging receipt attestations. Runtime use remains dormant pending distinct reviewed PostgreSQL roles.';

COMMENT ON FUNCTION public.consume_bot_reply_staging_attestation_nonce(
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
) IS
  'Atomically consumes or exactly replays one payload-free staging attestation nonce claim. PUBLIC execution and runtime activation remain blocked.';
