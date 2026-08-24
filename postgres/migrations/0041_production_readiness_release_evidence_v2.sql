-- Candidate-first Production Readiness v2 evidence for one exact release.
--
-- A candidate is immutable and never becomes visible to runtime readers until
-- an explicit compare-and-set head update and its matching append-only event
-- commit together. This migration is intentionally independent of the v1
-- staging-release evidence schema.

CREATE TABLE production_readiness_release_heads_v2 (
  environment TEXT NOT NULL,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  registry_version INTEGER NOT NULL,
  registry_digest TEXT NOT NULL,
  release_manifest_digest TEXT NOT NULL,
  railway_api_artifact_digest TEXT NOT NULL,
  railway_worker_artifact_digest TEXT NOT NULL,
  vercel_web_artifact_digest TEXT NOT NULL,
  active_version INTEGER NOT NULL DEFAULT 0,
  active_candidate_digest TEXT,
  initialized_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (environment, release_id),
  CONSTRAINT production_readiness_heads_v2_environment_valid
    CHECK (
      environment IN (
        'development',
        'preview',
        'production',
        'staging'
      )
    ),
  CONSTRAINT production_readiness_heads_v2_release_id_sha256
    CHECK (release_id ~ '^connect_release_v1_[0-9a-f]{64}$'),
  CONSTRAINT production_readiness_heads_v2_commit_sha
    CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
  CONSTRAINT production_readiness_heads_v2_registry_version
    CHECK (registry_version = 2),
  CONSTRAINT production_readiness_heads_v2_registry_digest
    CHECK (
      registry_digest ~
        '^production_readiness_registry_v2_[0-9a-f]{64}$'
    ),
  CONSTRAINT production_readiness_heads_v2_release_manifest_digest
    CHECK (release_manifest_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT production_readiness_heads_v2_artifact_digests
    CHECK (
      railway_api_artifact_digest ~ '^sha256:[0-9a-f]{64}$'
      AND railway_worker_artifact_digest ~ '^sha256:[0-9a-f]{64}$'
      AND vercel_web_artifact_digest ~ '^sha256:[0-9a-f]{64}$'
      AND railway_api_artifact_digest <> railway_worker_artifact_digest
      AND railway_api_artifact_digest <> vercel_web_artifact_digest
      AND railway_worker_artifact_digest <> vercel_web_artifact_digest
    ),
  CONSTRAINT production_readiness_heads_v2_active_version
    CHECK (active_version BETWEEN 0 AND 2147483647),
  CONSTRAINT production_readiness_heads_v2_active_state
    CHECK (
      (
        active_version = 0
        AND active_candidate_digest IS NULL
      )
      OR
      (
        active_version > 0
        AND active_candidate_digest ~
          '^production_readiness_candidate_v2_[0-9a-f]{64}$'
      )
    ),
  CONSTRAINT production_readiness_heads_v2_timestamps
    CHECK (
      initialized_at = date_trunc('milliseconds', initialized_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= initialized_at
    )
);

CREATE TABLE production_readiness_release_candidates_v2 (
  environment TEXT NOT NULL,
  release_id TEXT NOT NULL,
  candidate_digest TEXT NOT NULL,
  evidence_set_json TEXT NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  staged_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (environment, release_id, candidate_digest),
  CONSTRAINT production_readiness_candidates_v2_head_fk
    FOREIGN KEY (environment, release_id)
    REFERENCES production_readiness_release_heads_v2 (
      environment,
      release_id
    )
    ON DELETE RESTRICT,
  CONSTRAINT production_readiness_candidates_v2_digest
    CHECK (
      candidate_digest ~
        '^production_readiness_candidate_v2_[0-9a-f]{64}$'
    ),
  CONSTRAINT production_readiness_candidates_v2_evidence_bytes
    CHECK (octet_length(evidence_set_json) BETWEEN 2 AND 49159),
  CONSTRAINT production_readiness_candidates_v2_exact_envelope_count
    CHECK (
      jsonb_typeof(evidence_set_json::jsonb) = 'array'
      AND jsonb_array_length(evidence_set_json::jsonb) = 6
    ),
  CONSTRAINT production_readiness_candidates_v2_timestamps
    CHECK (
      staged_at = date_trunc('milliseconds', staged_at)
      AND valid_until = date_trunc('milliseconds', valid_until)
      AND valid_until > staged_at
      AND valid_until <= staged_at + INTERVAL '900 seconds'
    )
);

CREATE TABLE production_readiness_release_activation_events_v2 (
  environment TEXT NOT NULL,
  release_id TEXT NOT NULL,
  active_version INTEGER NOT NULL,
  previous_candidate_digest TEXT,
  activated_candidate_digest TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (environment, release_id, active_version),
  CONSTRAINT production_readiness_activation_events_v2_head_fk
    FOREIGN KEY (environment, release_id)
    REFERENCES production_readiness_release_heads_v2 (
      environment,
      release_id
    )
    ON DELETE RESTRICT,
  CONSTRAINT production_readiness_activation_events_v2_previous_fk
    FOREIGN KEY (
      environment,
      release_id,
      previous_candidate_digest
    )
    REFERENCES production_readiness_release_candidates_v2 (
      environment,
      release_id,
      candidate_digest
    )
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT production_readiness_activation_events_v2_activated_fk
    FOREIGN KEY (
      environment,
      release_id,
      activated_candidate_digest
    )
    REFERENCES production_readiness_release_candidates_v2 (
      environment,
      release_id,
      candidate_digest
    )
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT production_readiness_activation_events_v2_version
    CHECK (active_version BETWEEN 1 AND 2147483647),
  CONSTRAINT production_readiness_activation_events_v2_digest_state
    CHECK (
      activated_candidate_digest ~
        '^production_readiness_candidate_v2_[0-9a-f]{64}$'
      AND (
        (
          active_version = 1
          AND previous_candidate_digest IS NULL
        )
        OR
        (
          active_version > 1
          AND previous_candidate_digest ~
            '^production_readiness_candidate_v2_[0-9a-f]{64}$'
          AND previous_candidate_digest <> activated_candidate_digest
        )
      )
    ),
  CONSTRAINT production_readiness_activation_events_v2_timestamp
    CHECK (
      activated_at = date_trunc('milliseconds', activated_at)
    )
);

ALTER TABLE production_readiness_release_heads_v2
  ADD CONSTRAINT production_readiness_heads_v2_active_candidate_fk
  FOREIGN KEY (
    environment,
    release_id,
    active_candidate_digest
  )
  REFERENCES production_readiness_release_candidates_v2 (
    environment,
    release_id,
    candidate_digest
  )
  ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX production_readiness_candidates_v2_expiry_idx
  ON production_readiness_release_candidates_v2 (
    environment,
    valid_until,
    release_id,
    candidate_digest
  );

CREATE INDEX production_readiness_activation_events_v2_time_idx
  ON production_readiness_release_activation_events_v2 (
    environment,
    activated_at,
    release_id,
    active_version
  );

CREATE FUNCTION enforce_production_readiness_head_v2_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.active_version <> 0
    OR NEW.active_candidate_digest IS NOT NULL
    OR NEW.initialized_at <> NEW.updated_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 head must initialize without active evidence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_readiness_heads_v2_insert_guard
BEFORE INSERT ON production_readiness_release_heads_v2
FOR EACH ROW
EXECUTE FUNCTION enforce_production_readiness_head_v2_insert();

CREATE FUNCTION enforce_production_readiness_candidate_v2_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  release_head production_readiness_release_heads_v2%ROWTYPE;
  evidence_set JSONB;
  envelope JSONB;
  envelope_check_id TEXT;
  envelope_issuer TEXT;
  envelope_artifact_digest TEXT;
  envelope_observed_at TIMESTAMPTZ;
  envelope_expires_at TIMESTAMPTZ;
  earliest_expiry TIMESTAMPTZ;
  seen_check_ids TEXT[] := ARRAY[]::TEXT[];
  expected_keys CONSTANT TEXT[] := ARRAY[
    'artifactDigest',
    'checkId',
    'commitSha',
    'environment',
    'evidence',
    'evidenceDigest',
    'expiresAt',
    'issuer',
    'observedAt',
    'outcome',
    'registryDigest',
    'registryVersion',
    'releaseId',
    'releaseManifestDigest',
    'schemaVersion'
  ];
BEGIN
  SELECT *
  INTO release_head
  FROM production_readiness_release_heads_v2
  WHERE environment = NEW.environment
    AND release_id = NEW.release_id
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Production readiness v2 candidate lacks its release head';
  END IF;

  IF NEW.staged_at < release_head.initialized_at THEN
    RAISE EXCEPTION
      'Production readiness v2 candidate predates its release head';
  END IF;

  BEGIN
    evidence_set := NEW.evidence_set_json::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION
        'Production readiness v2 candidate evidence is invalid JSON';
  END;

  IF jsonb_typeof(evidence_set) <> 'array'
    OR jsonb_array_length(evidence_set) <> 6
  THEN
    RAISE EXCEPTION
      'Production readiness v2 candidate requires exactly six envelopes';
  END IF;

  FOR envelope IN
    SELECT value
    FROM jsonb_array_elements(evidence_set)
  LOOP
    IF jsonb_typeof(envelope) <> 'object'
      OR (
        SELECT count(*)
        FROM jsonb_object_keys(envelope)
      ) <> cardinality(expected_keys)
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(envelope) AS envelope_key(key)
        WHERE NOT envelope_key.key = ANY(expected_keys)
      )
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope keys are invalid';
    END IF;

    IF jsonb_typeof(envelope -> 'schemaVersion') <> 'number'
      OR envelope ->> 'schemaVersion' <> '2'
      OR jsonb_typeof(envelope -> 'registryVersion') <> 'number'
      OR envelope ->> 'registryVersion' <> '2'
      OR jsonb_typeof(envelope -> 'registryDigest') <> 'string'
      OR envelope ->> 'registryDigest' <> release_head.registry_digest
      OR jsonb_typeof(envelope -> 'environment') <> 'string'
      OR envelope ->> 'environment' <> release_head.environment
      OR jsonb_typeof(envelope -> 'releaseId') <> 'string'
      OR envelope ->> 'releaseId' <> release_head.release_id
      OR jsonb_typeof(envelope -> 'commitSha') <> 'string'
      OR envelope ->> 'commitSha' <> release_head.commit_sha
      OR jsonb_typeof(envelope -> 'releaseManifestDigest') <> 'string'
      OR envelope ->> 'releaseManifestDigest' <>
        release_head.release_manifest_digest
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope release identity is invalid';
    END IF;

    IF jsonb_typeof(envelope -> 'checkId') <> 'string'
      OR jsonb_typeof(envelope -> 'issuer') <> 'string'
      OR jsonb_typeof(envelope -> 'artifactDigest') <> 'string'
      OR jsonb_typeof(envelope -> 'observedAt') <> 'string'
      OR jsonb_typeof(envelope -> 'expiresAt') <> 'string'
      OR jsonb_typeof(envelope -> 'outcome') <> 'string'
      OR jsonb_typeof(envelope -> 'evidenceDigest') <> 'string'
      OR jsonb_typeof(envelope -> 'evidence') <> 'array'
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope value types are invalid';
    END IF;

    envelope_check_id := envelope ->> 'checkId';
    envelope_issuer := envelope ->> 'issuer';
    envelope_artifact_digest := envelope ->> 'artifactDigest';

    IF envelope_check_id NOT IN (
      'queue.redis-bullmq',
      'runtime.railway-api',
      'runtime.railway-worker',
      'runtime.vercel-web',
      'storage.object',
      'storage.postgresql'
    )
      OR envelope_check_id = ANY(seen_check_ids)
    THEN
      RAISE EXCEPTION
        'Production readiness v2 candidate check inventory is invalid';
    END IF;
    seen_check_ids := array_append(seen_check_ids, envelope_check_id);

    IF envelope_issuer NOT IN (
      'railway-api',
      'railway-worker',
      'vercel-web'
    )
      OR envelope_artifact_digest <> (
        CASE envelope_issuer
          WHEN 'railway-api' THEN
            release_head.railway_api_artifact_digest
          WHEN 'railway-worker' THEN
            release_head.railway_worker_artifact_digest
          WHEN 'vercel-web' THEN
            release_head.vercel_web_artifact_digest
          ELSE NULL
        END
      )
      OR (
        CASE envelope_check_id
        WHEN 'queue.redis-bullmq' THEN
          envelope_issuer IN ('railway-api', 'railway-worker')
        WHEN 'runtime.railway-api' THEN
          envelope_issuer = 'railway-api'
        WHEN 'runtime.railway-worker' THEN
          envelope_issuer = 'railway-worker'
        WHEN 'runtime.vercel-web' THEN
          envelope_issuer = 'vercel-web'
        WHEN 'storage.object' THEN
          envelope_issuer = 'railway-worker'
        WHEN 'storage.postgresql' THEN
          envelope_issuer IN ('railway-api', 'railway-worker')
        ELSE FALSE
        END
      ) IS NOT TRUE
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope issuer is invalid';
    END IF;

    IF (
      CASE envelope_check_id
      WHEN 'queue.redis-bullmq' THEN
        envelope -> 'evidence' =
          '["redis-connectivity", "redis-durability"]'::jsonb
      WHEN 'runtime.railway-api' THEN
        envelope -> 'evidence' = '["railway-api-release"]'::jsonb
      WHEN 'runtime.railway-worker' THEN
        envelope -> 'evidence' =
          '["railway-worker-heartbeat"]'::jsonb
      WHEN 'runtime.vercel-web' THEN
        envelope -> 'evidence' =
          '["vercel-deployment-provenance", "vercel-railway-auth"]'::jsonb
      WHEN 'storage.object' THEN
        envelope -> 'evidence' =
          '["object-canary-integrity", "object-provider-policy"]'::jsonb
      WHEN 'storage.postgresql' THEN
        envelope -> 'evidence' =
          '["postgres-connectivity", "postgres-schema"]'::jsonb
      ELSE FALSE
      END
    ) IS NOT TRUE
      OR envelope ->> 'outcome' <> 'passed'
      OR envelope ->> 'evidenceDigest' !~
        '^production_readiness_evidence_v2_[0-9a-f]{64}$'
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope result is invalid';
    END IF;

    IF envelope ->> 'observedAt' !~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      OR envelope ->> 'expiresAt' !~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope timestamps are not canonical';
    END IF;

    BEGIN
      envelope_observed_at :=
        (envelope ->> 'observedAt')::timestamptz;
      envelope_expires_at :=
        (envelope ->> 'expiresAt')::timestamptz;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION
          'Production readiness v2 envelope timestamps are invalid';
    END;

    IF envelope_observed_at < release_head.initialized_at
      OR envelope_observed_at > NEW.staged_at + INTERVAL '30 seconds'
      OR envelope_expires_at <= envelope_observed_at
      OR envelope_expires_at <= NEW.staged_at
      OR envelope_expires_at - envelope_observed_at > (
        CASE envelope_check_id
          WHEN 'runtime.railway-worker' THEN INTERVAL '180 seconds'
          WHEN 'runtime.vercel-web' THEN INTERVAL '600 seconds'
          WHEN 'storage.object' THEN INTERVAL '300 seconds'
          ELSE INTERVAL '120 seconds'
        END
      )
    THEN
      RAISE EXCEPTION
        'Production readiness v2 envelope validity window is invalid';
    END IF;

    IF earliest_expiry IS NULL
      OR envelope_expires_at < earliest_expiry
    THEN
      earliest_expiry := envelope_expires_at;
    END IF;
  END LOOP;

  IF cardinality(seen_check_ids) <> 6
    OR NOT (
      seen_check_ids @> ARRAY[
      'queue.redis-bullmq',
      'runtime.railway-api',
      'runtime.railway-worker',
      'runtime.vercel-web',
      'storage.object',
      'storage.postgresql'
      ]::TEXT[]
    )
    OR NEW.valid_until <> earliest_expiry
  THEN
    RAISE EXCEPTION
      'Production readiness v2 candidate aggregate is invalid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_readiness_candidates_v2_insert_guard
BEFORE INSERT ON production_readiness_release_candidates_v2
FOR EACH ROW
EXECUTE FUNCTION enforce_production_readiness_candidate_v2_insert();

CREATE FUNCTION enforce_production_readiness_head_v2_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_candidate production_readiness_release_candidates_v2%ROWTYPE;
BEGIN
  IF NEW.environment IS DISTINCT FROM OLD.environment
    OR NEW.release_id IS DISTINCT FROM OLD.release_id
    OR NEW.commit_sha IS DISTINCT FROM OLD.commit_sha
    OR NEW.registry_version IS DISTINCT FROM OLD.registry_version
    OR NEW.registry_digest IS DISTINCT FROM OLD.registry_digest
    OR NEW.release_manifest_digest IS DISTINCT FROM
      OLD.release_manifest_digest
    OR NEW.railway_api_artifact_digest IS DISTINCT FROM
      OLD.railway_api_artifact_digest
    OR NEW.railway_worker_artifact_digest IS DISTINCT FROM
      OLD.railway_worker_artifact_digest
    OR NEW.vercel_web_artifact_digest IS DISTINCT FROM
      OLD.vercel_web_artifact_digest
    OR NEW.initialized_at IS DISTINCT FROM OLD.initialized_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 release identity is immutable';
  END IF;

  IF NEW.active_version <> OLD.active_version + 1
    OR NEW.active_candidate_digest IS NULL
    OR NEW.active_candidate_digest IS NOT DISTINCT FROM
      OLD.active_candidate_digest
    OR NEW.updated_at <= OLD.updated_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 activation compare-and-set is invalid';
  END IF;

  SELECT *
  INTO active_candidate
  FROM production_readiness_release_candidates_v2
  WHERE environment = NEW.environment
    AND release_id = NEW.release_id
    AND candidate_digest = NEW.active_candidate_digest
  FOR KEY SHARE;

  IF NOT FOUND
    OR active_candidate.staged_at > NEW.updated_at
    OR active_candidate.valid_until <= NEW.updated_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 active candidate is unavailable or expired';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_readiness_heads_v2_activation_guard
BEFORE UPDATE ON production_readiness_release_heads_v2
FOR EACH ROW
EXECUTE FUNCTION enforce_production_readiness_head_v2_activation();

CREATE FUNCTION require_production_readiness_head_v2_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM production_readiness_release_activation_events_v2 AS event
    WHERE event.environment = NEW.environment
      AND event.release_id = NEW.release_id
      AND event.active_version = NEW.active_version
      AND event.previous_candidate_digest IS NOT DISTINCT FROM
        OLD.active_candidate_digest
      AND event.activated_candidate_digest =
        NEW.active_candidate_digest
      AND event.activated_at = NEW.updated_at
  ) THEN
    RAISE EXCEPTION
      'Production readiness v2 head activation lacks its event';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER production_readiness_heads_v2_event_guard
AFTER UPDATE ON production_readiness_release_heads_v2
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION require_production_readiness_head_v2_event();

CREATE FUNCTION require_production_readiness_activation_v2_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  release_head production_readiness_release_heads_v2%ROWTYPE;
  activated_candidate production_readiness_release_candidates_v2%ROWTYPE;
  prior_event production_readiness_release_activation_events_v2%ROWTYPE;
BEGIN
  SELECT *
  INTO release_head
  FROM production_readiness_release_heads_v2
  WHERE environment = NEW.environment
    AND release_id = NEW.release_id
  FOR KEY SHARE;

  IF NOT FOUND
    OR release_head.active_version <> NEW.active_version
    OR release_head.active_candidate_digest <>
      NEW.activated_candidate_digest
    OR release_head.updated_at <> NEW.activated_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 activation event lacks its CAS head';
  END IF;

  SELECT *
  INTO activated_candidate
  FROM production_readiness_release_candidates_v2
  WHERE environment = NEW.environment
    AND release_id = NEW.release_id
    AND candidate_digest = NEW.activated_candidate_digest;

  IF NOT FOUND
    OR activated_candidate.staged_at > NEW.activated_at
    OR activated_candidate.valid_until <= NEW.activated_at
  THEN
    RAISE EXCEPTION
      'Production readiness v2 activation event candidate is invalid';
  END IF;

  IF NEW.active_version = 1 THEN
    IF NEW.previous_candidate_digest IS NOT NULL THEN
      RAISE EXCEPTION
        'Production readiness v2 first activation predecessor is invalid';
    END IF;
  ELSE
    SELECT *
    INTO prior_event
    FROM production_readiness_release_activation_events_v2
    WHERE environment = NEW.environment
      AND release_id = NEW.release_id
      AND active_version = NEW.active_version - 1;

    IF NOT FOUND
      OR prior_event.activated_candidate_digest <>
        NEW.previous_candidate_digest
      OR prior_event.activated_at >= NEW.activated_at
    THEN
      RAISE EXCEPTION
        'Production readiness v2 activation event chain is invalid';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER production_readiness_activation_events_v2_head_guard
AFTER INSERT ON production_readiness_release_activation_events_v2
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION require_production_readiness_activation_v2_head();

CREATE FUNCTION reject_production_readiness_candidate_v2_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Production readiness v2 candidates are immutable';
END;
$$;

CREATE TRIGGER production_readiness_candidates_v2_update_guard
BEFORE UPDATE ON production_readiness_release_candidates_v2
FOR EACH ROW
EXECUTE FUNCTION reject_production_readiness_candidate_v2_mutation();

CREATE TRIGGER production_readiness_candidates_v2_delete_guard
BEFORE DELETE ON production_readiness_release_candidates_v2
FOR EACH ROW
EXECUTE FUNCTION reject_production_readiness_candidate_v2_mutation();

CREATE FUNCTION reject_production_readiness_activation_event_v2_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Production readiness v2 activation events are append-only';
END;
$$;

CREATE TRIGGER production_readiness_activation_events_v2_update_guard
BEFORE UPDATE ON production_readiness_release_activation_events_v2
FOR EACH ROW
EXECUTE FUNCTION reject_production_readiness_activation_event_v2_mutation();

CREATE TRIGGER production_readiness_activation_events_v2_delete_guard
BEFORE DELETE ON production_readiness_release_activation_events_v2
FOR EACH ROW
EXECUTE FUNCTION reject_production_readiness_activation_event_v2_mutation();

CREATE FUNCTION reject_production_readiness_head_v2_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Production readiness v2 release heads cannot be deleted';
END;
$$;

CREATE TRIGGER production_readiness_heads_v2_delete_guard
BEFORE DELETE ON production_readiness_release_heads_v2
FOR EACH ROW
EXECUTE FUNCTION reject_production_readiness_head_v2_delete();
