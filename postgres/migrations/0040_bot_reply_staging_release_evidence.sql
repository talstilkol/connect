-- Short-lived, byte-exact cross-service activation evidence per Railway release.
-- The release identity is immutable; only the evidence payload advances by CAS.

CREATE TABLE bot_reply_staging_release_evidence (
  release_id TEXT PRIMARY KEY,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  evidence_version INTEGER NOT NULL DEFAULT 0,
  evidence_digest TEXT,
  evidence_json TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  initialized_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_release_evidence_release_id_sha256
    CHECK (release_id ~ '^connect_release_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_release_evidence_commit_sha
    CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
  CONSTRAINT bot_reply_staging_release_evidence_artifact_digest
    CHECK (artifact_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_release_evidence_version_valid
    CHECK (evidence_version BETWEEN 0 AND 2147483647),
  CONSTRAINT bot_reply_staging_release_evidence_payload_consistent
    CHECK (
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
        AND evidence_digest ~
          '^bot_reply_staging_cross_service_evidence_v1_[0-9a-f]{64}$'
        AND evidence_json IS NOT NULL
        AND octet_length(evidence_json) BETWEEN 2 AND 8192
        AND verified_at IS NOT NULL
        AND expires_at IS NOT NULL
        AND jsonb_typeof(evidence_json::jsonb) = 'object'
        AND evidence_json::jsonb ->> 'releaseId' = release_id
        AND evidence_json::jsonb ->> 'commitSha' = commit_sha
        AND evidence_json::jsonb ->> 'artifactDigest' = artifact_digest
        AND evidence_json::jsonb ->> 'evidenceDigest' = evidence_digest
        AND (evidence_json::jsonb ->> 'verifiedAt')::timestamptz = verified_at
        AND (evidence_json::jsonb ->> 'expiresAt')::timestamptz = expires_at
        AND expires_at >= verified_at + INTERVAL '60 seconds'
        AND expires_at <= verified_at + INTERVAL '900 seconds'
      )
    ),
  CONSTRAINT bot_reply_staging_release_evidence_timestamps_valid
    CHECK (
      initialized_at = date_trunc('milliseconds', initialized_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= initialized_at
      AND (
        verified_at IS NULL
        OR (
          verified_at = date_trunc('milliseconds', verified_at)
          AND expires_at = date_trunc('milliseconds', expires_at)
        )
      )
    )
);

CREATE UNIQUE INDEX bot_reply_staging_release_evidence_identity_uq
  ON bot_reply_staging_release_evidence (
    release_id,
    commit_sha,
    artifact_digest
  );

CREATE INDEX bot_reply_staging_release_evidence_expiry_idx
  ON bot_reply_staging_release_evidence (
    expires_at,
    release_id
  )
  WHERE evidence_digest IS NOT NULL;
