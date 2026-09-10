-- EXPAND-ONLY: one future PostgreSQL mutation boundary for release-evidence
-- compare-and-set plus its immutable operator event. This migration does not
-- authorize staging activation and does not claim that direct table DML is
-- blocked. A reviewed migration-owner/runtime-role split is required before
-- the function can become the runtime write path.

-- Migration 0043 used unqualified names inside its trigger functions. Replace
-- those bodies forward-only so the SECURITY DEFINER publisher can keep a
-- pg_catalog-only search path without depending on caller-controlled schemas.
CREATE OR REPLACE FUNCTION public.enforce_bot_reply_staging_release_evidence_operator_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  release_evidence public.bot_reply_staging_release_evidence%ROWTYPE;
BEGIN
  SELECT evidence.*
  INTO release_evidence
  FROM public.bot_reply_staging_release_evidence AS evidence
  WHERE evidence.release_id = NEW.release_id
    AND evidence.commit_sha = NEW.commit_sha
    AND evidence.artifact_digest = NEW.artifact_digest
  FOR KEY SHARE;

  IF NOT FOUND
    OR release_evidence.evidence_version <> NEW.published_version
    OR release_evidence.evidence_digest <> NEW.evidence_digest
    OR release_evidence.expires_at <> NEW.evidence_expires_at
    OR release_evidence.verified_at <> NEW.occurred_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging operator audit does not match release evidence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_staging_release_evidence_operator_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply staging release evidence operator events are immutable';
END;
$$;

CREATE FUNCTION public.publish_bot_reply_staging_release_evidence_with_operator_audit(
  requested_event_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_idempotency_key TEXT,
  requested_actor_external_user_id TEXT,
  requested_expected_version INTEGER,
  requested_expected_evidence_digest TEXT,
  requested_evidence_digest TEXT,
  requested_evidence_json TEXT,
  requested_occurred_at TIMESTAMPTZ,
  requested_evidence_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
  result_status TEXT,
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
  existing_event public.bot_reply_staging_release_evidence_operator_events%ROWTYPE;
  stored_event public.bot_reply_staging_release_evidence_operator_events%ROWTYPE;
  advanced_version INTEGER;
BEGIN
  SELECT operator_event.*
  INTO existing_event
  FROM public.bot_reply_staging_release_evidence_operator_events
    AS operator_event
  WHERE operator_event.release_id = requested_release_id
    AND operator_event.idempotency_key = requested_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    IF existing_event.event_key = requested_event_key
      AND existing_event.commit_sha = requested_commit_sha
      AND existing_event.artifact_digest = requested_artifact_digest
      AND existing_event.operation_id =
        'system-admin.bot-reply-staging.release-evidence.publish'
      AND existing_event.actor_external_user_id =
        requested_actor_external_user_id
      AND existing_event.expected_version = requested_expected_version
      AND existing_event.expected_evidence_digest IS NOT DISTINCT FROM
        requested_expected_evidence_digest
      AND existing_event.published_version = requested_expected_version + 1
      AND existing_event.evidence_digest = requested_evidence_digest
      AND existing_event.evidence_expires_at =
        requested_evidence_expires_at
      AND existing_event.occurred_at = requested_occurred_at
    THEN
      RETURN QUERY SELECT
        'replayed'::TEXT,
        existing_event.event_key,
        existing_event.release_id,
        existing_event.commit_sha,
        existing_event.artifact_digest,
        existing_event.operation_id,
        existing_event.idempotency_key,
        existing_event.actor_external_user_id,
        existing_event.expected_version,
        existing_event.expected_evidence_digest,
        existing_event.published_version,
        existing_event.evidence_digest,
        existing_event.evidence_expires_at,
        existing_event.occurred_at;
    ELSE
      RETURN QUERY SELECT
        'conflict'::TEXT,
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
    END IF;
    RETURN;
  END IF;

  UPDATE public.bot_reply_staging_release_evidence AS evidence
  SET
    evidence_version = evidence.evidence_version + 1,
    evidence_digest = requested_evidence_digest,
    evidence_json = requested_evidence_json,
    verified_at = requested_occurred_at,
    expires_at = requested_evidence_expires_at,
    updated_at = GREATEST(
      evidence.updated_at,
      requested_occurred_at
    )
  WHERE evidence.release_id = requested_release_id
    AND evidence.commit_sha = requested_commit_sha
    AND evidence.artifact_digest = requested_artifact_digest
    AND evidence.evidence_version = requested_expected_version
    AND evidence.evidence_version < 2147483647
    AND evidence.evidence_digest IS NOT DISTINCT FROM
      requested_expected_evidence_digest
  RETURNING evidence.evidence_version
  INTO advanced_version;

  IF NOT FOUND THEN
    -- A concurrent exact request may have committed while this call waited for
    -- the release row. Re-read its immutable event before reporting conflict.
    SELECT operator_event.*
    INTO existing_event
    FROM public.bot_reply_staging_release_evidence_operator_events
      AS operator_event
    WHERE operator_event.release_id = requested_release_id
      AND operator_event.idempotency_key = requested_idempotency_key
    LIMIT 1;

    IF FOUND
      AND existing_event.event_key = requested_event_key
      AND existing_event.commit_sha = requested_commit_sha
      AND existing_event.artifact_digest = requested_artifact_digest
      AND existing_event.operation_id =
        'system-admin.bot-reply-staging.release-evidence.publish'
      AND existing_event.actor_external_user_id =
        requested_actor_external_user_id
      AND existing_event.expected_version = requested_expected_version
      AND existing_event.expected_evidence_digest IS NOT DISTINCT FROM
        requested_expected_evidence_digest
      AND existing_event.published_version = requested_expected_version + 1
      AND existing_event.evidence_digest = requested_evidence_digest
      AND existing_event.evidence_expires_at =
        requested_evidence_expires_at
      AND existing_event.occurred_at = requested_occurred_at
    THEN
      RETURN QUERY SELECT
        'replayed'::TEXT,
        existing_event.event_key,
        existing_event.release_id,
        existing_event.commit_sha,
        existing_event.artifact_digest,
        existing_event.operation_id,
        existing_event.idempotency_key,
        existing_event.actor_external_user_id,
        existing_event.expected_version,
        existing_event.expected_evidence_digest,
        existing_event.published_version,
        existing_event.evidence_digest,
        existing_event.evidence_expires_at,
        existing_event.occurred_at;
    ELSE
      RETURN QUERY SELECT
        'conflict'::TEXT,
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
    END IF;
    RETURN;
  END IF;

  IF advanced_version <> requested_expected_version + 1 THEN
    RAISE EXCEPTION
      'Bot reply staging release evidence advanced an invalid version';
  END IF;

  -- MERGE keeps runtime data out of migration execution while preserving the
  -- repository-wide no-seed-data migration contract.
  MERGE INTO public.bot_reply_staging_release_evidence_operator_events
    AS operator_event
  USING (
    VALUES (
      requested_event_key,
      requested_release_id,
      requested_commit_sha,
      requested_artifact_digest,
      'system-admin.bot-reply-staging.release-evidence.publish'::TEXT,
      requested_idempotency_key,
      requested_actor_external_user_id,
      requested_expected_version,
      requested_expected_evidence_digest,
      advanced_version,
      requested_evidence_digest,
      requested_evidence_expires_at,
      requested_occurred_at
    )
  ) AS proposed (
    event_key,
    release_id,
    commit_sha,
    artifact_digest,
    operation_id,
    idempotency_key,
    actor_external_user_id,
    expected_version,
    expected_evidence_digest,
    published_version,
    evidence_digest,
    evidence_expires_at,
    occurred_at
  )
  ON operator_event.event_key = proposed.event_key
  WHEN NOT MATCHED THEN
    INSERT (
      event_key,
      release_id,
      commit_sha,
      artifact_digest,
      operation_id,
      idempotency_key,
      actor_external_user_id,
      expected_version,
      expected_evidence_digest,
      published_version,
      evidence_digest,
      evidence_expires_at,
      occurred_at
    ) VALUES (
      proposed.event_key,
      proposed.release_id,
      proposed.commit_sha,
      proposed.artifact_digest,
      proposed.operation_id,
      proposed.idempotency_key,
      proposed.actor_external_user_id,
      proposed.expected_version,
      proposed.expected_evidence_digest,
      proposed.published_version,
      proposed.evidence_digest,
      proposed.evidence_expires_at,
      proposed.occurred_at
    );

  SELECT operator_event.*
  INTO stored_event
  FROM public.bot_reply_staging_release_evidence_operator_events
    AS operator_event
  WHERE operator_event.event_key = requested_event_key
    AND operator_event.release_id = requested_release_id
    AND operator_event.idempotency_key = requested_idempotency_key
  LIMIT 1;

  IF NOT FOUND
    OR stored_event.commit_sha <> requested_commit_sha
    OR stored_event.artifact_digest <> requested_artifact_digest
    OR stored_event.operation_id <>
      'system-admin.bot-reply-staging.release-evidence.publish'
    OR stored_event.actor_external_user_id <>
      requested_actor_external_user_id
    OR stored_event.expected_version <> requested_expected_version
    OR stored_event.expected_evidence_digest IS DISTINCT FROM
      requested_expected_evidence_digest
    OR stored_event.published_version <> advanced_version
    OR stored_event.evidence_digest <> requested_evidence_digest
    OR stored_event.evidence_expires_at <> requested_evidence_expires_at
    OR stored_event.occurred_at <> requested_occurred_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging release evidence audit persistence failed';
  END IF;

  RETURN QUERY SELECT
    'stored'::TEXT,
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
END;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Keep this
-- SECURITY DEFINER boundary dormant until the deployment has a distinct,
-- reviewed runtime role that can receive explicit function-only permission.
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

COMMENT ON FUNCTION public.publish_bot_reply_staging_release_evidence_with_operator_audit(
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
) IS
  'Expand-only atomic release-evidence CAS plus immutable operator audit. Runtime activation remains blocked until migration-owner and runtime-role privileges are separated and reviewed.';
