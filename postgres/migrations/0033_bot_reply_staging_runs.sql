-- Railway-only durable ledger for authorized Bot reply staging evidence runs.

CREATE TABLE bot_reply_staging_runs (
  run_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  request_digest TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  connection_version INTEGER NOT NULL,
  policy_version INTEGER NOT NULL,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  graph_api_version TEXT NOT NULL,
  recipient_fingerprint TEXT NOT NULL,
  rate_limit_method_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  claim_version INTEGER NOT NULL DEFAULT 1,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  audit_key TEXT NOT NULL,
  receipt_json TEXT,
  receipt_digest TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_runs_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_runs_run_key_sha256
    CHECK (run_key ~ '^bot_reply_staging_run_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_request_digest_sha256
    CHECK (request_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_actor_bounded
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT bot_reply_staging_runs_versions_positive
    CHECK (connection_version >= 1 AND policy_version >= 1),
  CONSTRAINT bot_reply_staging_runs_release_id_sha256
    CHECK (release_id ~ '^connect_release_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_commit_sha
    CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
  CONSTRAINT bot_reply_staging_runs_artifact_digest_sha256
    CHECK (artifact_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_graph_version
    CHECK (graph_api_version ~ '^v[1-9][0-9]{0,2}\.0$'),
  CONSTRAINT bot_reply_staging_runs_recipient_fingerprint_sha256
    CHECK (recipient_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_method_fingerprint_sha256
    CHECK (rate_limit_method_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_status_valid
    CHECK (status IN ('running', 'completed')),
  CONSTRAINT bot_reply_staging_runs_claim_version_positive
    CHECK (claim_version >= 1),
  CONSTRAINT bot_reply_staging_runs_audit_key_sha256
    CHECK (audit_key ~ '^bot_reply_staging_audit_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_runs_receipt_bounded
    CHECK (
      receipt_json IS NULL
      OR (
        octet_length(receipt_json) BETWEEN 2 AND 48000
        AND jsonb_typeof(receipt_json::jsonb) = 'object'
      )
    ),
  CONSTRAINT bot_reply_staging_runs_receipt_digest_sha256
    CHECK (
      receipt_digest IS NULL
      OR receipt_digest ~ '^sha256:[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_runs_time_canonical
    CHECK (
      lease_expires_at = date_trunc('milliseconds', lease_expires_at)
      AND started_at = date_trunc('milliseconds', started_at)
      AND created_at = started_at
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= started_at
      AND lease_expires_at > started_at
      AND (
        completed_at IS NULL
        OR completed_at = date_trunc('milliseconds', completed_at)
      )
    ),
  CONSTRAINT bot_reply_staging_runs_state_consistent
    CHECK (
      (
        status = 'running'
        AND receipt_json IS NULL
        AND receipt_digest IS NULL
        AND completed_at IS NULL
      )
      OR (
        status = 'completed'
        AND receipt_json IS NOT NULL
        AND receipt_digest IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at BETWEEN started_at AND lease_expires_at
        AND updated_at = completed_at
      )
    )
);

CREATE UNIQUE INDEX bot_reply_staging_runs_audit_key_uq
  ON bot_reply_staging_runs (audit_key);

CREATE INDEX bot_reply_staging_runs_active_lease_idx
  ON bot_reply_staging_runs (status, lease_expires_at)
  WHERE status = 'running';

CREATE FUNCTION guard_bot_reply_staging_run_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.run_key IS DISTINCT FROM OLD.run_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.request_digest IS DISTINCT FROM OLD.request_digest
    OR NEW.actor_external_user_id IS DISTINCT FROM OLD.actor_external_user_id
    OR NEW.connection_version IS DISTINCT FROM OLD.connection_version
    OR NEW.policy_version IS DISTINCT FROM OLD.policy_version
    OR NEW.release_id IS DISTINCT FROM OLD.release_id
    OR NEW.commit_sha IS DISTINCT FROM OLD.commit_sha
    OR NEW.artifact_digest IS DISTINCT FROM OLD.artifact_digest
    OR NEW.graph_api_version IS DISTINCT FROM OLD.graph_api_version
    OR NEW.recipient_fingerprint IS DISTINCT FROM OLD.recipient_fingerprint
    OR NEW.rate_limit_method_fingerprint IS DISTINCT FROM
      OLD.rate_limit_method_fingerprint
    OR NEW.audit_key IS DISTINCT FROM OLD.audit_key
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Bot reply staging run identity is immutable';
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Completed Bot reply staging run is immutable';
  END IF;

  IF NEW.status = 'running' THEN
    IF NEW.claim_version <> OLD.claim_version + 1
      OR NEW.lease_expires_at <= OLD.lease_expires_at
      OR NEW.updated_at <= OLD.updated_at
      OR NEW.receipt_json IS NOT NULL
      OR NEW.receipt_digest IS NOT NULL
      OR NEW.completed_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'Bot reply staging lease does not advance';
    END IF;
  ELSIF NEW.status = 'completed' THEN
    IF NEW.claim_version <> OLD.claim_version
      OR NEW.lease_expires_at IS DISTINCT FROM OLD.lease_expires_at
      OR NEW.completed_at IS NULL
      OR NEW.updated_at IS DISTINCT FROM NEW.completed_at
      OR NEW.receipt_json IS NULL
      OR NEW.receipt_digest IS NULL
    THEN
      RAISE EXCEPTION 'Bot reply staging completion is invalid';
    END IF;
  ELSE
    RAISE EXCEPTION 'Bot reply staging transition is invalid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_runs_update_guard
BEFORE UPDATE ON bot_reply_staging_runs
FOR EACH ROW
EXECUTE FUNCTION guard_bot_reply_staging_run_update();

CREATE FUNCTION reject_bot_reply_staging_run_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging run cannot be deleted';
END;
$$;

CREATE TRIGGER bot_reply_staging_runs_delete_guard
BEFORE DELETE ON bot_reply_staging_runs
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_run_delete();

CREATE FUNCTION audit_bot_reply_staging_run_start()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    actor_external_user_id,
    action,
    target_type,
    target_id,
    idempotency_key,
    metadata_json,
    created_at
  ) VALUES (
    NEW.tenant_id,
    NEW.actor_external_user_id,
    'bot-reply-staging.started',
    'bot-reply-staging-run',
    NEW.run_key,
    NEW.audit_key,
    jsonb_build_object(
      'requestDigest', NEW.request_digest,
      'releaseId', NEW.release_id,
      'artifactDigest', NEW.artifact_digest
    ),
    NEW.started_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_runs_audit_start
AFTER INSERT ON bot_reply_staging_runs
FOR EACH ROW
EXECUTE FUNCTION audit_bot_reply_staging_run_start();

CREATE FUNCTION audit_bot_reply_staging_run_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'running' AND NEW.status = 'completed' THEN
    INSERT INTO audit_logs (
      tenant_id,
      actor_external_user_id,
      action,
      target_type,
      target_id,
      idempotency_key,
      metadata_json,
      created_at
    ) VALUES (
      NEW.tenant_id,
      NEW.actor_external_user_id,
      'bot-reply-staging.completed',
      'bot-reply-staging-run',
      NEW.run_key,
      NEW.audit_key,
      jsonb_build_object(
        'requestDigest', NEW.request_digest,
        'receiptDigest', NEW.receipt_digest,
        'claimVersion', NEW.claim_version
      ),
      NEW.completed_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_runs_audit_completion
AFTER UPDATE ON bot_reply_staging_runs
FOR EACH ROW
EXECUTE FUNCTION audit_bot_reply_staging_run_completion();

CREATE FUNCTION guard_bot_reply_staging_audit_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.action IN (
    'bot-reply-staging.started',
    'bot-reply-staging.completed'
  ) THEN
    RAISE EXCEPTION 'Bot reply staging audit is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_logs_bot_reply_staging_update_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION guard_bot_reply_staging_audit_immutability();
