-- Retention never derives an old closure time from mutable tenant timestamps.
-- The clock function is a server-owned clock seam, not caller input.
CREATE FUNCTION knowledge_retention_now_v1() RETURNS TIMESTAMPTZ LANGUAGE SQL VOLATILE
  SET search_path=pg_catalog,pg_temp AS $$ SELECT clock_timestamp() $$;
ALTER TABLE tenants ADD COLUMN knowledge_retention_closed_at TIMESTAMPTZ;
CREATE FUNCTION track_knowledge_retention_closure_v1() RETURNS TRIGGER LANGUAGE plpgsql
  SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NEW.status<>'cancelled' THEN NEW.knowledge_retention_closed_at := NULL;
  ELSIF TG_OP='INSERT' THEN NEW.knowledge_retention_closed_at := public.knowledge_retention_now_v1();
  ELSIF OLD.status<>'cancelled' OR OLD.knowledge_retention_closed_at IS NULL THEN NEW.knowledge_retention_closed_at := public.knowledge_retention_now_v1();
  ELSE NEW.knowledge_retention_closed_at := OLD.knowledge_retention_closed_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_retention_closure BEFORE INSERT OR UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION track_knowledge_retention_closure_v1();

CREATE TABLE knowledge_retention_grants (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL CHECK (isfinite(expires_at)),
  PRIMARY KEY(database_role,tenant_id),
  CHECK (database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
REVOKE ALL ON knowledge_retention_grants FROM PUBLIC;
CREATE FUNCTION knowledge_retention_authorize_v1(requested_tenant BIGINT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
  SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.knowledge_retention_grants WHERE database_role=session_user AND tenant_id=requested_tenant
    AND expires_at>public.knowledge_retention_now_v1() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Knowledge retention authority required'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION knowledge_retention_authorize_v1(BIGINT) FROM PUBLIC;
CREATE TABLE knowledge_retention_reviews (
  tenant_id BIGINT PRIMARY KEY REFERENCES tenants(id) ON DELETE RESTRICT,
  version BIGINT NOT NULL CHECK (version>0),
  legal_hold BOOLEAN NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
  operator_role NAME NOT NULL DEFAULT session_user,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT knowledge_retention_now_v1()
);
CREATE TABLE knowledge_retention_jobs (
  source_key TEXT PRIMARY KEY REFERENCES knowledge_ingestion_jobs(source_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  object_version_id TEXT NOT NULL CHECK (object_version_id<>'null' AND length(object_version_id) BETWEEN 1 AND 1024 AND object_version_id !~ '[[:cntrl:][:space:]]'),
  version BIGINT NOT NULL DEFAULT 1 CHECK(version>0),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','unknown','blocked','removed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  lease_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT knowledge_retention_now_v1(),
  closure_at TIMESTAMPTZ NOT NULL,
  review_version BIGINT NOT NULL CHECK(review_version>0),
  approval_digest TEXT NOT NULL CHECK(approval_digest ~ '^[a-f0-9]{64}$'),
  policy_digest TEXT NOT NULL CHECK(policy_digest ~ '^[a-f0-9]{64}$'),
  retain_days INTEGER NOT NULL CHECK(retain_days BETWEEN 1 AND 100000000),
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  operator_role NAME NOT NULL DEFAULT session_user,
  error_code TEXT CHECK(error_code ~ '^[A-Z_]{1,100}$'),
  FOREIGN KEY(tenant_id,source_key) REFERENCES knowledge_sources(tenant_id,source_key) ON DELETE RESTRICT,
  CHECK ((state='running')=(lease_expires_at IS NOT NULL))
);
CREATE TABLE knowledge_retention_events (
  source_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  version BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('review','pending','running','unknown','blocked','removed')),
  operator_role NAME NOT NULL DEFAULT session_user,
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  details JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT knowledge_retention_now_v1(),
  PRIMARY KEY(tenant_id,source_key,version,event_type)
);
REVOKE ALL ON knowledge_retention_reviews,knowledge_retention_jobs,knowledge_retention_events FROM PUBLIC;
CREATE FUNCTION reject_knowledge_retention_mutation_v1() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Knowledge retention evidence cannot be removed or rewritten'; END;
$$;
CREATE TRIGGER knowledge_retention_events_immutable BEFORE UPDATE OR DELETE ON knowledge_retention_events FOR EACH ROW EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();
CREATE TRIGGER knowledge_retention_events_no_truncate BEFORE TRUNCATE ON knowledge_retention_events FOR EACH STATEMENT EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();
CREATE TRIGGER knowledge_retention_jobs_no_delete BEFORE DELETE ON knowledge_retention_jobs FOR EACH ROW EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();
CREATE TRIGGER knowledge_retention_jobs_no_truncate BEFORE TRUNCATE ON knowledge_retention_jobs FOR EACH STATEMENT EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();
CREATE TRIGGER knowledge_retention_reviews_no_truncate BEFORE TRUNCATE ON knowledge_retention_reviews FOR EACH STATEMENT EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();
CREATE TRIGGER knowledge_retention_reviews_no_delete BEFORE DELETE ON knowledge_retention_reviews FOR EACH ROW EXECUTE FUNCTION reject_knowledge_retention_mutation_v1();

CREATE FUNCTION guard_knowledge_retention_review_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  PERFORM public.knowledge_retention_authorize_v1(NEW.tenant_id);
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
  IF TG_OP='UPDATE' AND (OLD.tenant_id<>NEW.tenant_id OR NEW.version<>OLD.version+1) THEN RAISE EXCEPTION 'Stale retention review'; END IF;
  IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial retention review'; END IF;
  NEW.operator_role := session_user; NEW.reviewed_at := public.knowledge_retention_now_v1();
  INSERT INTO public.knowledge_retention_events(tenant_id,source_key,version,event_type,evidence_digest,details)
    VALUES(NEW.tenant_id,'tenant-review',NEW.version,'review',NEW.evidence_digest,jsonb_build_object('legalHold',NEW.legal_hold));
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_retention_review_guard BEFORE INSERT OR UPDATE ON knowledge_retention_reviews FOR EACH ROW EXECUTE FUNCTION guard_knowledge_retention_review_v1();
CREATE FUNCTION guard_knowledge_retention_job_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE initial_or_resumed BOOLEAN := TG_OP='INSERT';
BEGIN
  IF TG_OP='UPDATE' THEN
    initial_or_resumed := OLD.state='blocked' AND NEW.state='pending';
    IF (OLD.tenant_id,OLD.source_key,OLD.object_version_id) IS DISTINCT FROM (NEW.tenant_id,NEW.source_key,NEW.object_version_id)
      OR NEW.version<>OLD.version+1 OR OLD.state='removed'
      OR (OLD.state,NEW.state) NOT IN (('pending','running'),('pending','blocked'),('unknown','running'),('unknown','blocked'),('running','running'),('running','unknown'),('running','blocked'),('running','removed'),('blocked','pending'))
      THEN RAISE EXCEPTION 'Invalid retention identity or transition'; END IF;
    IF NOT initial_or_resumed AND (OLD.approval_digest,OLD.closure_at,OLD.review_version,OLD.policy_digest,OLD.retain_days,OLD.evidence_digest,OLD.operator_role)
      IS DISTINCT FROM (NEW.approval_digest,NEW.closure_at,NEW.review_version,NEW.policy_digest,NEW.retain_days,NEW.evidence_digest,NEW.operator_role)
      THEN RAISE EXCEPTION 'Retention approval is immutable during an attempt'; END IF;
    IF NOT initial_or_resumed AND OLD.operator_role<>session_user THEN RAISE EXCEPTION 'Deletion claim belongs to another operator'; END IF;
  ELSE
    IF NEW.version<>1 OR NEW.state<>'pending' OR NEW.attempts<>0 THEN RAISE EXCEPTION 'Retention must start pending'; END IF;
  END IF;
  IF initial_or_resumed THEN
    PERFORM public.knowledge_retention_authorize_v1(NEW.tenant_id);
    NEW.operator_role := session_user;
    IF NEW.attempts<>0 THEN RAISE EXCEPTION 'New approval must reset bounded attempt count'; END IF;
  END IF;
  IF initial_or_resumed OR NEW.state='running' THEN
    PERFORM public.knowledge_retention_authorize_v1(NEW.tenant_id);
    PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
    IF NOT EXISTS(SELECT 1 FROM public.tenants t JOIN public.knowledge_retention_reviews r ON r.tenant_id=t.id
      JOIN public.knowledge_sources s ON s.tenant_id=t.id AND s.source_key=NEW.source_key
      JOIN public.knowledge_ingestion_jobs i ON i.source_key=s.source_key
      WHERE t.id=NEW.tenant_id AND t.status='cancelled' AND t.knowledge_retention_closed_at=NEW.closure_at
        AND NEW.closure_at+(NEW.retain_days::double precision*INTERVAL '1 day')<=public.knowledge_retention_now_v1()
        AND r.version=NEW.review_version AND NOT r.legal_hold AND r.reviewed_at>=NEW.closure_at
        AND s.status IN ('archived','rejected') AND i.state IN ('ready','rejected') AND i.pending_bytes IS NULL AND i.claim_expires_at IS NULL
        AND i.version_id=NEW.object_version_id)
      THEN RAISE EXCEPTION 'Retention candidate no longer eligible'; END IF;
    IF NEW.state='running' AND (NEW.attempts<>OLD.attempts+1 OR NEW.lease_expires_at<=public.knowledge_retention_now_v1()) THEN RAISE EXCEPTION 'Invalid deletion claim'; END IF;
  ELSIF TG_OP='UPDATE' AND NEW.attempts<>OLD.attempts THEN RAISE EXCEPTION 'Invalid attempt accounting';
  END IF;
  INSERT INTO public.knowledge_retention_events(tenant_id,source_key,version,event_type,evidence_digest,details)
    VALUES(NEW.tenant_id,NEW.source_key,NEW.version,NEW.state,NEW.evidence_digest,
      jsonb_build_object('objectVersionId',NEW.object_version_id,'attempts',NEW.attempts,'policyDigest',NEW.policy_digest,'reviewVersion',NEW.review_version,'errorCode',NEW.error_code));
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_retention_job_guard BEFORE INSERT OR UPDATE ON knowledge_retention_jobs FOR EACH ROW EXECUTE FUNCTION guard_knowledge_retention_job_v1();
CREATE FUNCTION guard_retired_knowledge_source_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NEW.status NOT IN ('archived','rejected') AND EXISTS(SELECT 1 FROM public.knowledge_retention_jobs WHERE source_key=NEW.source_key)
    THEN RAISE EXCEPTION 'Retired knowledge cannot be reactivated'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_retired_source_guard BEFORE UPDATE ON knowledge_sources FOR EACH ROW EXECUTE FUNCTION guard_retired_knowledge_source_v1();
