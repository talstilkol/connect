-- Private exact-version media retirement, including ambiguous upload receipts.
-- Uses the conservative database-owned tenant closure clock introduced in 0085.
CREATE TABLE meta_media_retention_grants (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL CHECK (isfinite(expires_at)),
  PRIMARY KEY(database_role,tenant_id),
  CHECK (database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
REVOKE ALL ON meta_media_retention_grants FROM PUBLIC;
CREATE FUNCTION meta_media_retention_authorize_v1(requested_tenant BIGINT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
  SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.meta_media_retention_grants WHERE database_role=session_user AND tenant_id=requested_tenant
    AND expires_at>public.knowledge_retention_now_v1() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Media retention authority required'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION meta_media_retention_authorize_v1(BIGINT) FROM PUBLIC;
CREATE TABLE meta_media_retention_reviews (
  tenant_id BIGINT PRIMARY KEY REFERENCES tenants(id) ON DELETE RESTRICT,
  version BIGINT NOT NULL CHECK (version>0),
  legal_hold BOOLEAN NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
  operator_role NAME NOT NULL DEFAULT session_user,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT public.knowledge_retention_now_v1()
);
CREATE TABLE meta_media_retention_jobs (
  job_key TEXT NOT NULL REFERENCES meta_media_upload_jobs(job_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  object_version_id TEXT NOT NULL CHECK (object_version_id<>'null' AND length(object_version_id) BETWEEN 1 AND 1024 AND object_version_id !~ '[[:cntrl:][:space:]]'),
  version BIGINT NOT NULL DEFAULT 1 CHECK(version>0),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','unknown','blocked','removed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  lease_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT public.knowledge_retention_now_v1(),
  basis_at TIMESTAMPTZ NOT NULL,
  policy_trigger TEXT NOT NULL CHECK(policy_trigger IN ('record-created','tenant-closed')),
  review_version BIGINT NOT NULL CHECK(review_version>0),
  approval_digest TEXT NOT NULL CHECK(approval_digest ~ '^[a-f0-9]{64}$'),
  policy_digest TEXT NOT NULL CHECK(policy_digest ~ '^[a-f0-9]{64}$'),
  retain_days INTEGER NOT NULL CHECK(retain_days BETWEEN 1 AND 100000000),
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  operator_role NAME NOT NULL DEFAULT session_user,
  error_code TEXT CHECK(error_code ~ '^[A-Z_]{1,100}$'),
  PRIMARY KEY(job_key,object_version_id),
  CHECK ((state='running')=(lease_expires_at IS NOT NULL))
);
CREATE TABLE meta_media_retention_events (
  job_key TEXT NOT NULL,
  object_version_id TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  version BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('review','pending','running','unknown','blocked','removed')),
  operator_role NAME NOT NULL DEFAULT session_user,
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  details JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT public.knowledge_retention_now_v1(),
  PRIMARY KEY(tenant_id,job_key,object_version_id,version,event_type)
);
REVOKE ALL ON meta_media_retention_reviews,meta_media_retention_jobs,meta_media_retention_events FROM PUBLIC;
CREATE FUNCTION reject_meta_media_retention_mutation_v1() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Media retention evidence cannot be removed or rewritten'; END;
$$;
CREATE TRIGGER meta_media_retention_events_immutable BEFORE UPDATE OR DELETE ON meta_media_retention_events FOR EACH ROW EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();
CREATE TRIGGER meta_media_retention_events_no_truncate BEFORE TRUNCATE ON meta_media_retention_events FOR EACH STATEMENT EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();
CREATE TRIGGER meta_media_retention_jobs_no_delete BEFORE DELETE ON meta_media_retention_jobs FOR EACH ROW EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();
CREATE TRIGGER meta_media_retention_jobs_no_truncate BEFORE TRUNCATE ON meta_media_retention_jobs FOR EACH STATEMENT EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();
CREATE TRIGGER meta_media_retention_reviews_no_truncate BEFORE TRUNCATE ON meta_media_retention_reviews FOR EACH STATEMENT EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();
CREATE TRIGGER meta_media_retention_reviews_no_delete BEFORE DELETE ON meta_media_retention_reviews FOR EACH ROW EXECUTE FUNCTION reject_meta_media_retention_mutation_v1();

CREATE FUNCTION guard_meta_media_retention_review_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_RELID<>'public.meta_media_retention_reviews'::regclass THEN RAISE EXCEPTION 'Unexpected retention trigger relation'; END IF;
  PERFORM public.meta_media_retention_authorize_v1(NEW.tenant_id);
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
  IF TG_OP='UPDATE' AND (OLD.tenant_id<>NEW.tenant_id OR NEW.version<>OLD.version+1) THEN RAISE EXCEPTION 'Stale retention review'; END IF;
  IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial retention review'; END IF;
  NEW.operator_role := session_user; NEW.reviewed_at := public.knowledge_retention_now_v1();
  INSERT INTO public.meta_media_retention_events(tenant_id,job_key,object_version_id,version,event_type,evidence_digest,details)
    VALUES(NEW.tenant_id,'tenant-review','tenant-review',NEW.version,'review',NEW.evidence_digest,jsonb_build_object('legalHold',NEW.legal_hold));
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_retention_review_guard BEFORE INSERT OR UPDATE ON meta_media_retention_reviews FOR EACH ROW EXECUTE FUNCTION guard_meta_media_retention_review_v1();
CREATE FUNCTION guard_meta_media_retention_job_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE initial_or_resumed BOOLEAN := TG_OP='INSERT';
BEGIN
  IF TG_RELID<>'public.meta_media_retention_jobs'::regclass THEN RAISE EXCEPTION 'Unexpected retention trigger relation'; END IF;
  IF TG_OP='UPDATE' THEN
    initial_or_resumed := OLD.state='blocked' AND NEW.state='pending';
    IF (OLD.tenant_id,OLD.job_key,OLD.object_version_id) IS DISTINCT FROM (NEW.tenant_id,NEW.job_key,NEW.object_version_id)
      OR NEW.version<>OLD.version+1 OR OLD.state='removed'
      OR (OLD.state,NEW.state) NOT IN (('pending','running'),('pending','blocked'),('unknown','running'),('unknown','blocked'),('running','running'),('running','unknown'),('running','blocked'),('running','removed'),('blocked','pending'))
      THEN RAISE EXCEPTION 'Invalid retention identity or transition'; END IF;
    IF NOT initial_or_resumed AND (OLD.approval_digest,OLD.basis_at,OLD.policy_trigger,OLD.review_version,OLD.policy_digest,OLD.retain_days,OLD.evidence_digest,OLD.operator_role)
      IS DISTINCT FROM (NEW.approval_digest,NEW.basis_at,NEW.policy_trigger,NEW.review_version,NEW.policy_digest,NEW.retain_days,NEW.evidence_digest,NEW.operator_role)
      THEN RAISE EXCEPTION 'Retention approval is immutable during an attempt'; END IF;
    IF NOT initial_or_resumed AND OLD.operator_role<>session_user THEN RAISE EXCEPTION 'Deletion claim belongs to another operator'; END IF;
  ELSE
    IF NEW.version<>1 OR NEW.state<>'pending' OR NEW.attempts<>0 THEN RAISE EXCEPTION 'Retention must start pending'; END IF;
  END IF;
  IF initial_or_resumed THEN
    PERFORM public.meta_media_retention_authorize_v1(NEW.tenant_id);
    NEW.operator_role := session_user;
    IF NEW.attempts<>0 THEN RAISE EXCEPTION 'New approval must reset bounded attempt count'; END IF;
  END IF;
  IF initial_or_resumed OR NEW.state='running' THEN
    PERFORM public.meta_media_retention_authorize_v1(NEW.tenant_id);
    PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
    IF NOT EXISTS(SELECT 1 FROM public.tenants t JOIN public.meta_media_retention_reviews r ON r.tenant_id=t.id
      JOIN public.meta_media_upload_jobs i ON i.tenant_id=t.id AND i.job_key=NEW.job_key
      WHERE t.id=NEW.tenant_id
        AND ((NEW.policy_trigger='tenant-closed' AND t.status='cancelled' AND t.knowledge_retention_closed_at=NEW.basis_at)
          OR (NEW.policy_trigger='record-created' AND i.created_at=NEW.basis_at))
        AND NEW.basis_at+(NEW.retain_days::double precision*INTERVAL '1 day')<=public.knowledge_retention_now_v1()
        AND r.version=NEW.review_version AND NOT r.legal_hold AND r.reviewed_at>=NEW.basis_at
        AND i.status IN ('dispatching','reconciliation-required','quarantined','rejected')
        AND (i.lease_expires_at IS NULL OR i.lease_expires_at<=clock_timestamp())
        AND NOT EXISTS(SELECT 1 FROM public.meta_media_tasks task WHERE task.job_key=i.job_key AND task.status='running' AND task.lease_expires_at>clock_timestamp())
        AND NOT EXISTS(SELECT 1 FROM public.meta_media_cleanup_jobs c WHERE c.job_key=i.job_key AND c.status IN ('pending','running')))
      THEN RAISE EXCEPTION 'Retention candidate no longer eligible'; END IF;
    IF NEW.state='running' AND (NEW.attempts<>OLD.attempts+1 OR NEW.lease_expires_at<=public.knowledge_retention_now_v1() OR NEW.lease_expires_at>public.knowledge_retention_now_v1()+INTERVAL '10 minutes' OR (OLD.state='running' AND OLD.lease_expires_at>public.knowledge_retention_now_v1()) OR (OLD.state IN ('pending','unknown') AND OLD.next_attempt_at>public.knowledge_retention_now_v1())) THEN RAISE EXCEPTION 'Invalid deletion claim'; END IF;
  ELSIF TG_OP='UPDATE' AND NEW.attempts<>OLD.attempts THEN RAISE EXCEPTION 'Invalid attempt accounting';
  END IF;
  INSERT INTO public.meta_media_retention_events(tenant_id,job_key,object_version_id,version,event_type,evidence_digest,details)
    VALUES(NEW.tenant_id,NEW.job_key,NEW.object_version_id,NEW.version,NEW.state,NEW.evidence_digest,
      jsonb_build_object('objectVersionId',NEW.object_version_id,'attempts',NEW.attempts,'policyDigest',NEW.policy_digest,'reviewVersion',NEW.review_version,'errorCode',NEW.error_code));
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_retention_job_guard BEFORE INSERT OR UPDATE ON meta_media_retention_jobs FOR EACH ROW EXECUTE FUNCTION guard_meta_media_retention_job_v1();

-- Runtime checks share a permanent withdrawal projection; old evidence is not
-- rewritten, and late upload/scan facts remain recordable after retirement.
CREATE VIEW meta_media_withdrawals AS
  SELECT tenant_id,job_key FROM meta_media_cleanup_jobs
  UNION SELECT tenant_id,job_key FROM meta_media_retention_jobs;
CREATE VIEW meta_media_retention_holds AS SELECT tenant_id FROM meta_media_retention_reviews WHERE legal_hold;
CREATE FUNCTION guard_retired_meta_media_upload_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_RELID<>'public.meta_media_upload_jobs'::regclass THEN RAISE EXCEPTION 'Unexpected retention trigger relation'; END IF;
  IF NEW.status IN ('claimed','dispatching') AND EXISTS(SELECT 1 FROM public.meta_media_retention_jobs WHERE job_key=NEW.job_key)
    THEN RAISE EXCEPTION 'Retired media cannot be uploaded again'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_retired_upload_guard BEFORE UPDATE ON meta_media_upload_jobs FOR EACH ROW EXECUTE FUNCTION guard_retired_meta_media_upload_v1();

CREATE OR REPLACE FUNCTION guard_meta_media_withdrawn_work_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_RELID NOT IN ('public.meta_media_tasks'::regclass,'public.meta_media_inspection_retry_requests'::regclass) THEN RAISE EXCEPTION 'Unexpected retention trigger relation'; END IF;
  IF EXISTS(SELECT 1 FROM public.meta_media_cleanup_jobs WHERE job_key=NEW.job_key) THEN RAISE EXCEPTION 'Withdrawn media cannot resume'; END IF;
  IF EXISTS(SELECT 1 FROM public.meta_media_retention_jobs WHERE job_key=NEW.job_key) THEN
    -- Preserve a previously dispatched task's terminal acknowledgement. New
    -- tasks, new claims and inspection retry grants cannot revive retirement.
    IF TG_TABLE_NAME='meta_media_tasks' AND TG_OP='UPDATE' THEN
      IF OLD.status='running' AND NEW.status IN ('done','blocked','cancelled','recovery-required') THEN RETURN NEW; END IF;
    END IF;
    RAISE EXCEPTION 'Retired media cannot resume';
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION guard_meta_media_retention_cleanup_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_RELID<>'public.meta_media_cleanup_jobs'::regclass THEN RAISE EXCEPTION 'Unexpected retention trigger relation'; END IF;
  PERFORM 1 FROM public.meta_media_upload_jobs WHERE job_key=NEW.job_key FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.meta_media_retention_jobs WHERE job_key=NEW.job_key)
    OR EXISTS(SELECT 1 FROM public.meta_media_retention_reviews WHERE tenant_id=NEW.tenant_id AND legal_hold)
    THEN RAISE EXCEPTION 'Media cleanup requires private retention review'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_retention_cleanup_guard BEFORE INSERT ON meta_media_cleanup_jobs FOR EACH ROW EXECUTE FUNCTION guard_meta_media_retention_cleanup_v1();

-- Trigger functions are installed by the migration owner. Runtime execution of
-- an installed trigger needs no CREATE TRIGGER capability for its caller.
-- Do not let an unprivileged login attach a privileged evidence writer to its
-- own (including temporary) relation. Apply the same closure to Knowledge.
REVOKE ALL ON FUNCTION reject_meta_media_retention_mutation_v1(),guard_meta_media_retention_review_v1(),guard_meta_media_retention_job_v1(),guard_retired_meta_media_upload_v1(),guard_meta_media_withdrawn_work_v1(),guard_meta_media_retention_cleanup_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION guard_knowledge_retention_review_v1(),guard_knowledge_retention_job_v1(),guard_retired_knowledge_source_v1() FROM PUBLIC;
