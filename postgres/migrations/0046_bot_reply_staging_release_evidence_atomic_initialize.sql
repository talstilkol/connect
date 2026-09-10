-- EXPAND-ONLY: compose first-release initialization with the atomic publisher
-- from migration 0044. The wrapper remains unavailable to PUBLIC and does not
-- authorize staging activation or grant any runtime database privilege.

CREATE FUNCTION public.initialize_publish_bot_reply_staging_evidence_with_audit(
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
BEGIN
  IF requested_expected_version = 0
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

  RETURN QUERY
  SELECT published.*
  FROM public.publish_bot_reply_staging_release_evidence_with_operator_audit(
    requested_event_key,
    requested_release_id,
    requested_commit_sha,
    requested_artifact_digest,
    requested_idempotency_key,
    requested_actor_external_user_id,
    requested_expected_version,
    requested_expected_evidence_digest,
    requested_evidence_digest,
    requested_evidence_json,
    requested_occurred_at,
    requested_evidence_expires_at
  ) AS published;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_publish_bot_reply_staging_evidence_with_audit(
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

COMMENT ON FUNCTION public.initialize_publish_bot_reply_staging_evidence_with_audit(
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
  'Expand-only first-release initialization plus atomic release-evidence publish and immutable operator audit. Runtime activation remains blocked until function-only role privileges are separated and reviewed.';
