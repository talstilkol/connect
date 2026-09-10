-- An explicit owner request withdraws one recorded quarantine version.
-- Uploads, scan observations and messages remain immutable evidence.
CREATE TABLE meta_media_cleanup_jobs (
  job_key TEXT PRIMARY KEY REFERENCES meta_media_upload_jobs(job_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_external_user_id TEXT NOT NULL CHECK(length(actor_external_user_id) BETWEEN 1 AND 512),
  requested_task_version INTEGER NOT NULL CHECK(requested_task_version>0),
  object_version_id TEXT NOT NULL CHECK(length(object_version_id) BETWEEN 1 AND 1024 AND object_version_id<>'null' AND object_version_id !~ '[[:cntrl:]]'),
  idempotency_key TEXT NOT NULL CHECK(idempotency_key ~ '^connect_idempotency_v1_[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','removed','recovery-required','cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK((status='running')=(lease_expires_at IS NOT NULL)),
  UNIQUE(tenant_id,actor_external_user_id,idempotency_key)
);
CREATE INDEX meta_media_cleanup_pending ON meta_media_cleanup_jobs(next_attempt_at,job_key) WHERE status IN ('pending','running');
CREATE FUNCTION guard_meta_media_cleanup_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Media cleanup evidence is retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'pending' OR NEW.version<>1 OR NEW.attempts<>0 THEN RAISE EXCEPTION 'Invalid initial cleanup'; END IF;
    PERFORM 1 FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id
      WHERE t.id=NEW.tenant_id AND t.status IN ('active','trial','payment_failed')
        AND m.external_user_id=NEW.actor_external_user_id AND m.role='owner' AND m.status='active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup requires a current owner'; END IF;
    PERFORM 1 FROM meta_media_upload_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.job_key=NEW.job_key
      AND j.status='quarantined' AND j.object_version_id=NEW.object_version_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup requires an exact recorded version'; END IF;
    PERFORM 1 FROM meta_media_tasks WHERE tenant_id=NEW.tenant_id AND job_key=NEW.job_key
      AND kind='inspect' AND version=NEW.requested_task_version AND status IN ('blocked','recovery-required') FOR UPDATE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM meta_media_tasks WHERE job_key=NEW.job_key AND status IN ('pending','running')) THEN
      RAISE EXCEPTION 'Cleanup requires terminal media work';
    END IF;
    IF EXISTS(SELECT 1 FROM meta_media_scan_observations WHERE job_key=NEW.job_key AND object_version_id<>NEW.object_version_id) THEN
      RAISE EXCEPTION 'Cleanup cannot choose between conflicting versions';
    END IF;
  ELSE
    IF (NEW.job_key,NEW.tenant_id,NEW.actor_external_user_id,NEW.requested_task_version,NEW.object_version_id,NEW.idempotency_key,NEW.created_at)
      IS DISTINCT FROM (OLD.job_key,OLD.tenant_id,OLD.actor_external_user_id,OLD.requested_task_version,OLD.object_version_id,OLD.idempotency_key,OLD.created_at)
      OR NEW.version<>OLD.version+1 OR OLD.status NOT IN ('pending','running') THEN RAISE EXCEPTION 'Invalid cleanup transition'; END IF;
    IF NEW.status='running' THEN
      IF NEW.attempts<>OLD.attempts+1 OR (OLD.status='pending' AND OLD.next_attempt_at>clock_timestamp())
        OR (OLD.status='running' AND OLD.lease_expires_at>clock_timestamp()) OR NEW.lease_expires_at<=clock_timestamp()
        OR NEW.lease_expires_at>clock_timestamp()+INTERVAL '10 minutes' THEN RAISE EXCEPTION 'Invalid cleanup claim'; END IF;
    ELSE
      IF NEW.attempts<>OLD.attempts OR NOT ((OLD.status='running' AND OLD.lease_expires_at>clock_timestamp())
        OR (NEW.status='recovery-required' AND OLD.attempts=3 AND ((OLD.status='pending' AND OLD.next_attempt_at<=clock_timestamp())
          OR (OLD.status='running' AND OLD.lease_expires_at<=clock_timestamp())))) THEN RAISE EXCEPTION 'Invalid cleanup completion'; END IF;
      IF NEW.status='pending' AND (NEW.next_attempt_at<=clock_timestamp() OR NEW.next_attempt_at>clock_timestamp()+INTERVAL '15 minutes') THEN
        RAISE EXCEPTION 'Invalid cleanup delay';
      END IF;
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp();RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_cleanup_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_media_cleanup_jobs
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_cleanup_v1();
CREATE FUNCTION check_meta_media_cleanup_audit_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM audit_logs WHERE tenant_id=NEW.tenant_id AND actor_external_user_id=NEW.actor_external_user_id
    AND action='meta.history.media-cleanup' AND target_type='meta_media_upload_job' AND target_id=NEW.job_key
    AND metadata_json=jsonb_build_object('status',NEW.status,'version',NEW.version,'attempts',NEW.attempts)
    AND (NEW.version<>1 OR idempotency_key=NEW.idempotency_key);
  IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup audit is missing'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER meta_media_cleanup_audit AFTER INSERT OR UPDATE ON meta_media_cleanup_jobs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_meta_media_cleanup_audit_v1();
CREATE FUNCTION guard_meta_media_withdrawn_work_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM meta_media_cleanup_jobs WHERE job_key=NEW.job_key) THEN RAISE EXCEPTION 'Withdrawn media cannot resume'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_withdrawn_task_guard BEFORE INSERT OR UPDATE ON meta_media_tasks
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_withdrawn_work_v1();
CREATE TRIGGER meta_media_withdrawn_retry_guard BEFORE INSERT ON meta_media_inspection_retry_requests
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_withdrawn_work_v1();
