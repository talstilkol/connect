-- Operator requests grant one additional read-only inspection attempt each.
-- The original actor, upload dispatch and cumulative attempt count are retained.
ALTER TABLE meta_media_tasks ADD COLUMN operator_retry_count INTEGER NOT NULL DEFAULT 0
  CHECK (operator_retry_count BETWEEN 0 AND CASE WHEN kind='inspect' THEN 3 ELSE 0 END);
ALTER TABLE meta_media_tasks DROP CONSTRAINT meta_media_tasks_check;
ALTER TABLE meta_media_tasks ADD CONSTRAINT meta_media_tasks_attempts_check
  CHECK (attempts BETWEEN 0 AND CASE WHEN kind='upload' THEN 3 ELSE 12+operator_retry_count END);

CREATE TABLE meta_media_inspection_retry_requests (
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  job_key TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'inspect' CHECK (kind='inspect'),
  requested_task_version INTEGER NOT NULL CHECK (requested_task_version>0),
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512),
  retry_number INTEGER NOT NULL CHECK (retry_number BETWEEN 1 AND 3),
  idempotency_key TEXT NOT NULL CHECK (idempotency_key ~ '^connect_idempotency_v1_[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(tenant_id,job_key,requested_task_version),
  UNIQUE(job_key,retry_number),
  UNIQUE(tenant_id,actor_external_user_id,idempotency_key),
  FOREIGN KEY(job_key,kind) REFERENCES meta_media_tasks(job_key,kind) ON DELETE RESTRICT
);

CREATE FUNCTION guard_meta_media_inspection_retry_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task meta_media_tasks%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Inspection retry requests are retained'; END IF;
  SELECT * INTO task FROM meta_media_tasks WHERE tenant_id=NEW.tenant_id AND job_key=NEW.job_key AND kind='inspect' FOR UPDATE;
  IF NOT FOUND OR task.version<>NEW.requested_task_version OR task.status<>'recovery-required'
    OR task.attempts<>12+task.operator_retry_count OR task.operator_retry_count>=3
    OR NEW.retry_number<>task.operator_retry_count+1 THEN RAISE EXCEPTION 'Inspection task is not retryable'; END IF;
  PERFORM 1 FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id
    WHERE t.id=NEW.tenant_id AND t.status IN ('active','trial','payment_failed') AND m.status='active'
      AND m.role='owner' AND m.external_user_id=NEW.actor_external_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection retry requires a current owner'; END IF;
  PERFORM 1 FROM meta_media_upload_jobs j JOIN tenant_memberships m ON m.tenant_id=j.tenant_id
    AND m.external_user_id=j.actor_external_user_id AND m.status='active' AND m.role='owner'
    WHERE j.tenant_id=task.tenant_id AND j.job_key=task.job_key AND j.actor_external_user_id=task.actor_external_user_id
      AND j.message_key=task.message_key AND j.source_sha256=task.source_sha256 AND j.connection_version=task.connection_version
      AND (j.status IN ('quarantined','reconciliation-required') OR (j.status='dispatching' AND j.lease_expires_at<=clock_timestamp()));
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection retry requires its dispatched upload and original actor'; END IF;
  IF (SELECT COUNT(DISTINCT object_version_id)>1 OR COALESCE(bool_or(result IN ('THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),FALSE)
    FROM meta_media_scan_observations WHERE tenant_id=NEW.tenant_id AND job_key=NEW.job_key) THEN
    RAISE EXCEPTION 'Inspection retry cannot bypass blocking evidence';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_inspection_retry_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_media_inspection_retry_requests
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_inspection_retry_v1();

CREATE OR REPLACE FUNCTION guard_meta_media_task_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Media tasks are retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'pending' OR NEW.version<>1 OR NEW.attempts<>0 OR NEW.operator_retry_count<>0 THEN RAISE EXCEPTION 'Invalid initial media task'; END IF;
    PERFORM 1 FROM meta_history_inbox_messages AS message
      JOIN meta_history_media_bindings AS binding ON binding.tenant_id=message.tenant_id AND binding.provider_message_id=message.provider_message_id
      WHERE message.tenant_id=NEW.tenant_id AND message.message_key=NEW.message_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'Media task requires a bound source'; END IF;
    IF NEW.kind='inspect' THEN
      PERFORM 1 FROM meta_media_upload_jobs WHERE job_key=NEW.job_key AND tenant_id=NEW.tenant_id
        AND actor_external_user_id=NEW.actor_external_user_id AND message_key=NEW.message_key
        AND connection_version=NEW.connection_version AND source_sha256=NEW.source_sha256
        AND status IN ('dispatching','reconciliation-required','quarantined') FOR SHARE;
    ELSE
      PERFORM 1 FROM meta_data_sync_onboardings AS onboarding
        JOIN meta_history_sync_sessions AS session ON session.tenant_id=onboarding.tenant_id AND session.started_at=onboarding.started_at
        WHERE onboarding.tenant_id=NEW.tenant_id AND session.connection_version=NEW.connection_version
          AND (onboarding.actor_external_user_id=NEW.actor_external_user_id OR EXISTS (
            SELECT 1 FROM meta_media_upload_jobs WHERE job_key=NEW.job_key AND tenant_id=NEW.tenant_id
              AND actor_external_user_id=NEW.actor_external_user_id AND message_key=NEW.message_key
              AND connection_version=NEW.connection_version AND source_sha256=NEW.source_sha256));
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Media task requires its original actor and source'; END IF;
  ELSE
    IF (NEW.job_key,NEW.kind,NEW.tenant_id,NEW.actor_external_user_id,NEW.message_key,NEW.connection_version,NEW.source_sha256,NEW.created_at)
      IS DISTINCT FROM (OLD.job_key,OLD.kind,OLD.tenant_id,OLD.actor_external_user_id,OLD.message_key,OLD.connection_version,OLD.source_sha256,OLD.created_at)
      OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid media task identity or version'; END IF;
    IF NEW.operator_retry_count IS DISTINCT FROM OLD.operator_retry_count THEN
      IF OLD.kind<>'inspect' OR OLD.status<>'recovery-required' OR OLD.attempts<>12+OLD.operator_retry_count
        OR OLD.operator_retry_count>=3 OR NEW.operator_retry_count<>OLD.operator_retry_count+1
        OR NEW.status<>'pending' OR NEW.attempts<>OLD.attempts OR NEW.lease_expires_at IS NOT NULL
        OR NEW.next_attempt_at>clock_timestamp()+INTERVAL '1 second' THEN
        RAISE EXCEPTION 'Invalid operator inspection retry';
      END IF;
      PERFORM 1 FROM meta_media_inspection_retry_requests WHERE tenant_id=OLD.tenant_id AND job_key=OLD.job_key
        AND requested_task_version=OLD.version AND retry_number=NEW.operator_retry_count;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inspection retry requires an immutable request'; END IF;
      NEW.updated_at:=clock_timestamp(); RETURN NEW;
    END IF;
    IF OLD.status NOT IN ('pending','running') THEN RAISE EXCEPTION 'Terminal media task is retained'; END IF;
    IF NEW.status='running' THEN
      IF (OLD.status='running' AND OLD.lease_expires_at>clock_timestamp()) OR (OLD.status='pending' AND OLD.next_attempt_at>clock_timestamp())
        OR NEW.attempts<>OLD.attempts+1 OR NEW.lease_expires_at<=clock_timestamp()
        OR NEW.lease_expires_at>clock_timestamp()+INTERVAL '10 minutes' THEN RAISE EXCEPTION 'Invalid media task claim'; END IF;
    ELSE
      IF NEW.attempts<>OLD.attempts OR NOT (
        (OLD.status='running' AND OLD.lease_expires_at>clock_timestamp()) OR
        (NEW.status='recovery-required' AND OLD.attempts=CASE WHEN OLD.kind='upload' THEN 3 ELSE 12+OLD.operator_retry_count END
          AND ((OLD.status='pending' AND OLD.next_attempt_at<=clock_timestamp()) OR (OLD.status='running' AND OLD.lease_expires_at<=clock_timestamp())))) THEN
        RAISE EXCEPTION 'Invalid media task completion';
      END IF;
      IF NEW.status='pending' AND (NEW.next_attempt_at<=clock_timestamp() OR NEW.next_attempt_at>clock_timestamp()+INTERVAL '15 minutes') THEN
        RAISE EXCEPTION 'Invalid media task delay';
      END IF;
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp(); RETURN NEW;
END;
$$;

-- A request cannot commit independently of its queue transition and audit.
CREATE FUNCTION check_meta_media_inspection_retry_commit_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM meta_media_tasks WHERE tenant_id=NEW.tenant_id AND job_key=NEW.job_key AND kind='inspect'
    AND version>NEW.requested_task_version AND operator_retry_count>=NEW.retry_number;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection retry queue transition is missing'; END IF;
  PERFORM 1 FROM audit_logs WHERE tenant_id=NEW.tenant_id AND actor_external_user_id=NEW.actor_external_user_id
    AND action='meta.history.media-inspection-retry' AND target_type='meta_media_upload_job' AND target_id=NEW.job_key
    AND idempotency_key=NEW.idempotency_key
    AND metadata_json=jsonb_build_object('requestedTaskVersion',NEW.requested_task_version,'retryNumber',NEW.retry_number);
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection retry audit is missing'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER meta_media_inspection_retry_commit AFTER INSERT ON meta_media_inspection_retry_requests
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_meta_media_inspection_retry_commit_v1();
