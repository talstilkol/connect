-- Forward-only immutable operator evidence for each audited release-evidence CAS.
-- Migration 0040 remains unchanged because release migrations are immutable.

CREATE TABLE bot_reply_staging_release_evidence_operator_events (
  event_key TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  expected_evidence_digest TEXT,
  published_version INTEGER NOT NULL,
  evidence_digest TEXT NOT NULL,
  evidence_expires_at TIMESTAMPTZ NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_release_evidence_operator_release_fk
    FOREIGN KEY (release_id, commit_sha, artifact_digest)
    REFERENCES bot_reply_staging_release_evidence (
      release_id,
      commit_sha,
      artifact_digest
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_release_evidence_operator_event_key
    CHECK (
      event_key ~
        '^bot_reply_staging_release_evidence_operator_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_operation
    CHECK (
      operation_id =
        'system-admin.bot-reply-staging.release-evidence.publish'
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_idempotency
    CHECK (idempotency_key ~ '^connect_idempotency_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_release_evidence_operator_actor
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND btrim(actor_external_user_id) = actor_external_user_id
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_versions
    CHECK (
      expected_version BETWEEN 0 AND 2147483646
      AND published_version = expected_version + 1
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_previous_digest
    CHECK (
      (
        expected_version = 0
        AND expected_evidence_digest IS NULL
      )
      OR
      (
        expected_version > 0
        AND expected_evidence_digest ~
          '^bot_reply_staging_cross_service_evidence_v1_[0-9a-f]{64}$'
      )
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_evidence_digest
    CHECK (
      evidence_digest ~
        '^bot_reply_staging_cross_service_evidence_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_timestamps
    CHECK (
      occurred_at = date_trunc('milliseconds', occurred_at)
      AND evidence_expires_at =
        date_trunc('milliseconds', evidence_expires_at)
      AND evidence_expires_at >= occurred_at + INTERVAL '60 seconds'
      AND evidence_expires_at <= occurred_at + INTERVAL '900 seconds'
    ),
  CONSTRAINT bot_reply_staging_release_evidence_operator_request_uq
    UNIQUE (release_id, idempotency_key),
  CONSTRAINT bot_reply_staging_release_evidence_operator_version_uq
    UNIQUE (release_id, published_version)
);

CREATE INDEX bot_reply_staging_release_evidence_operator_actor_time_idx
  ON bot_reply_staging_release_evidence_operator_events (
    actor_external_user_id,
    occurred_at,
    release_id
  );

CREATE FUNCTION enforce_bot_reply_staging_release_evidence_operator_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  release_evidence bot_reply_staging_release_evidence%ROWTYPE;
BEGIN
  SELECT *
  INTO release_evidence
  FROM bot_reply_staging_release_evidence
  WHERE release_id = NEW.release_id
    AND commit_sha = NEW.commit_sha
    AND artifact_digest = NEW.artifact_digest
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

CREATE TRIGGER bot_reply_staging_release_evidence_operator_insert_guard
BEFORE INSERT
ON bot_reply_staging_release_evidence_operator_events
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_staging_release_evidence_operator_insert();

CREATE FUNCTION reject_bot_reply_staging_release_evidence_operator_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply staging release evidence operator events are immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_release_evidence_operator_immutable
BEFORE UPDATE OR DELETE
ON bot_reply_staging_release_evidence_operator_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_release_evidence_operator_mutation();
