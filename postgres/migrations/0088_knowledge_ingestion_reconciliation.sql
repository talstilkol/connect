CREATE TABLE knowledge_recovery_authorizations (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL CHECK(isfinite(expires_at)),
  PRIMARY KEY(database_role,tenant_id),
  CHECK(database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
CREATE TABLE knowledge_ingestion_reconciliations (
  recovery_key TEXT PRIMARY KEY CHECK(recovery_key ~ '^knowledge_recovery_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL,
  source_key TEXT NOT NULL REFERENCES knowledge_ingestion_jobs(source_key) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('reprocess','absent')),
  version_id TEXT,
  original_state JSONB NOT NULL,
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest TEXT NOT NULL CHECK(snapshot_digest ~ '^[a-f0-9]{64}$'),
  operator_role NAME NOT NULL DEFAULT session_user,
  applied_xid XID8 NOT NULL DEFAULT pg_current_xact_id(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK((action='absent' AND version_id IS NULL) OR (action='reprocess' AND version_id IS NOT NULL AND version_id<>'null' AND length(version_id) BETWEEN 1 AND 1024 AND version_id !~ '[[:cntrl:][:space:]]'))
);
CREATE TABLE knowledge_ingestion_late_receipts (
  source_key TEXT PRIMARY KEY REFERENCES knowledge_ingestion_jobs(source_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  version_id TEXT NOT NULL CHECK(version_id<>'null' AND length(version_id) BETWEEN 1 AND 1024 AND version_id !~ '[[:cntrl:][:space:]]'),
  original_state JSONB NOT NULL,
  observed_xid XID8 NOT NULL DEFAULT pg_current_xact_id(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON knowledge_recovery_authorizations,knowledge_ingestion_reconciliations,knowledge_ingestion_late_receipts FROM PUBLIC;
CREATE TRIGGER knowledge_recovery_immutable BEFORE UPDATE OR DELETE ON knowledge_ingestion_reconciliations FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER knowledge_recovery_no_truncate BEFORE TRUNCATE ON knowledge_ingestion_reconciliations FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER knowledge_late_receipt_immutable BEFORE UPDATE OR DELETE ON knowledge_ingestion_late_receipts FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER knowledge_late_receipt_no_truncate BEFORE TRUNCATE ON knowledge_ingestion_late_receipts FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();

CREATE FUNCTION public.knowledge_recovery_snapshot_v1(t BIGINT,k TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j public.knowledge_ingestion_jobs%ROWTYPE; s public.knowledge_sources%ROWTYPE; result JSONB;
BEGIN
  PERFORM 1 FROM public.knowledge_recovery_authorizations WHERE database_role=session_user AND tenant_id=t AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Knowledge recovery authorization required'; END IF;
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT * INTO j FROM public.knowledge_ingestion_jobs WHERE tenant_id=t AND source_key=k FOR UPDATE;
  SELECT * INTO s FROM public.knowledge_sources WHERE tenant_id=t AND source_key=k FOR UPDATE;
  IF j.source_key IS NULL OR s.source_key IS NULL THEN RAISE EXCEPTION 'Knowledge source unavailable'; END IF;
  IF s.status='archived' OR EXISTS(SELECT 1 FROM public.knowledge_retention_jobs WHERE source_key=k)
    OR NOT public.tenant_paid_access_allowed_v1(t) OR NOT EXISTS(SELECT 1 FROM public.tenant_memberships
      WHERE tenant_id=t AND external_user_id=j.actor_external_user_id AND status='active' AND role IN ('owner','manager'))
    THEN RAISE EXCEPTION 'Knowledge recovery source authority invalid'; END IF;
  result:=jsonb_build_object('job',to_jsonb(j)-'pending_bytes','source',to_jsonb(s),
    'reconciliations',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY recovery_key) FROM public.knowledge_ingestion_reconciliations r WHERE source_key=k),'[]'::jsonb));
  RETURN jsonb_build_object('snapshot',result,'snapshotDigest',encode(sha256(convert_to(result::text,'UTF8')),'hex'),'operatorRole',session_user,'observedAt',clock_timestamp());
END;
$$;
REVOKE ALL ON FUNCTION knowledge_recovery_snapshot_v1(BIGINT,TEXT) FROM PUBLIC;

CREATE FUNCTION public.apply_knowledge_recovery_v1(t BIGINT,k TEXT,expected_digest TEXT,prepared_at TIMESTAMPTZ,expected_actor TEXT,action_name TEXT,object_version TEXT,evidence TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE observed JSONB; j public.knowledge_ingestion_jobs%ROWTYPE; recovery TEXT; stamp TIMESTAMPTZ;
BEGIN
  observed:=public.knowledge_recovery_snapshot_v1(t,k);
  IF expected_actor IS DISTINCT FROM session_user::text OR expected_digest IS NULL OR expected_digest !~ '^[a-f0-9]{64}$' OR evidence IS NULL OR evidence !~ '^[a-f0-9]{64}$'
    THEN RAISE EXCEPTION 'Knowledge recovery identity invalid'; END IF;
  recovery:='knowledge_recovery_v1_'||encode(sha256(convert_to(jsonb_build_array(t,k,expected_digest,prepared_at,expected_actor,action_name,object_version,evidence)::text,'UTF8')),'hex');
  IF EXISTS(SELECT 1 FROM public.knowledge_ingestion_reconciliations WHERE recovery_key=recovery) THEN RETURN recovery; END IF;
  IF prepared_at IS NULL OR NOT isfinite(prepared_at) OR prepared_at>clock_timestamp() OR prepared_at<clock_timestamp()-interval '5 minutes'
    OR observed->>'snapshotDigest' IS DISTINCT FROM expected_digest THEN RAISE EXCEPTION 'Knowledge recovery snapshot stale'; END IF;
  SELECT * INTO j FROM public.knowledge_ingestion_jobs WHERE tenant_id=t AND source_key=k;
  IF j.claim_expires_at>clock_timestamp() OR j.state NOT IN ('unknown','quarantined','rejected')
    OR (j.state='rejected' AND j.error_code NOT IN ('KNOWLEDGE_SCAN_FAILED','KNOWLEDGE_SCAN_ACCESS_DENIED','KNOWLEDGE_PROCESSING_EXPIRED','KNOWLEDGE_AUTHORIZATION_CHANGED','KNOWLEDGE_LATE_OBJECT_CONFIRMED'))
    THEN RAISE EXCEPTION 'Knowledge outcome requires separate review'; END IF;
  IF (action_name='absent' AND (j.state<>'unknown' OR j.version_id IS NOT NULL))
    OR (action_name='reprocess' AND j.version_id IS NOT NULL AND j.version_id IS DISTINCT FROM object_version) THEN RAISE EXCEPTION 'Knowledge recovery version conflict'; END IF;
  INSERT INTO public.knowledge_ingestion_reconciliations(recovery_key,tenant_id,source_key,action,version_id,original_state,evidence_digest,snapshot_digest)
    VALUES(recovery,t,k,action_name,object_version,observed->'snapshot'->'job',evidence,expected_digest);
  stamp:=date_trunc('milliseconds',clock_timestamp());
  IF action_name='absent' THEN
    UPDATE public.knowledge_ingestion_jobs SET state='rejected',error_code='OPERATOR_CONFIRMED_ABSENT',pending_bytes=NULL,claim_expires_at=NULL,updated_at=stamp WHERE source_key=k;
    UPDATE public.knowledge_sources SET status='rejected',last_error_code='OPERATOR_CONFIRMED_ABSENT',version=version+1,updated_at=stamp WHERE source_key=k;
  ELSE
    UPDATE public.knowledge_ingestion_jobs SET state='quarantined',version_id=object_version,scan_verdict='PENDING',error_code=NULL,pending_bytes=NULL,
      claim_version=claim_version+1,claim_expires_at=NULL,next_attempt_at=stamp,updated_at=stamp WHERE source_key=k;
    UPDATE public.knowledge_sources SET status='scanning',last_error_code=NULL,version=version+1,updated_at=stamp WHERE source_key=k;
  END IF;
  INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(t,session_user,'ai.knowledge.reconciled','knowledge_source',k,jsonb_build_object('recoveryKey',recovery,'action',action_name,'evidenceDigest',evidence));
  RETURN recovery;
END;
$$;
REVOKE ALL ON FUNCTION apply_knowledge_recovery_v1(BIGINT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;

CREATE FUNCTION public.record_knowledge_late_receipt_v1(t BIGINT,k TEXT,object_version TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j public.knowledge_ingestion_jobs%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT * INTO j FROM public.knowledge_ingestion_jobs WHERE tenant_id=t AND source_key=k FOR UPDATE;
  IF j.source_key IS NULL OR j.state<>'rejected' OR j.version_id IS NOT NULL THEN RAISE EXCEPTION 'Knowledge late receipt scope invalid'; END IF;
  INSERT INTO public.knowledge_ingestion_late_receipts(source_key,tenant_id,version_id,original_state) VALUES(k,t,object_version,to_jsonb(j)-'pending_bytes');
  UPDATE public.knowledge_ingestion_jobs SET version_id=object_version,error_code='KNOWLEDGE_LATE_OBJECT_CONFIRMED',updated_at=date_trunc('milliseconds',clock_timestamp()) WHERE source_key=k;
END;
$$;
REVOKE ALL ON FUNCTION record_knowledge_late_receipt_v1(BIGINT,TEXT,TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION guard_knowledge_ingestion_job() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'queued' OR NEW.claim_version <> 0 OR NEW.version_id IS NOT NULL OR NEW.scan_verdict IS NOT NULL OR NEW.pending_bytes IS NULL OR encode(sha256(NEW.pending_bytes),'hex') <> NEW.content_sha256
      OR NOT EXISTS (SELECT 1 FROM public.knowledge_sources s WHERE s.tenant_id=NEW.tenant_id AND s.source_key=NEW.source_key
        AND s.status='pending-validation' AND s.content_sha256=NEW.content_sha256 AND s.media_type=NEW.media_type AND s.size_bytes=NEW.size_bytes) THEN
      RAISE EXCEPTION 'Knowledge upload must start queued';
    END IF;
  ELSE
    IF (OLD.source_key,OLD.tenant_id,OLD.actor_external_user_id,OLD.content_sha256,OLD.media_type,OLD.size_bytes,OLD.bucket,OLD.object_key,OLD.kms_key_arn,OLD.created_at)
      IS DISTINCT FROM (NEW.source_key,NEW.tenant_id,NEW.actor_external_user_id,NEW.content_sha256,NEW.media_type,NEW.size_bytes,NEW.bucket,NEW.object_key,NEW.kms_key_arn,NEW.created_at)
      OR (OLD.state IN ('ready','rejected') AND NOT (
        OLD.state='rejected' AND (
          (NEW.state='quarantined' AND EXISTS(SELECT 1 FROM public.knowledge_ingestion_reconciliations r WHERE r.source_key=OLD.source_key
            AND r.action='reprocess' AND r.applied_xid=pg_current_xact_id() AND r.version_id=NEW.version_id)) OR
          (NEW.state='rejected' AND NEW.error_code='KNOWLEDGE_LATE_OBJECT_CONFIRMED'
            AND (to_jsonb(OLD)-'version_id'-'error_code'-'updated_at')=(to_jsonb(NEW)-'version_id'-'error_code'-'updated_at')
            AND EXISTS(SELECT 1 FROM public.knowledge_ingestion_late_receipts l WHERE l.source_key=OLD.source_key AND l.version_id=NEW.version_id AND l.observed_xid=pg_current_xact_id()))
        ))) OR (OLD.version_id IS NOT NULL AND OLD.version_id IS DISTINCT FROM NEW.version_id)
      OR (NEW.pending_bytes IS NOT NULL AND OLD.pending_bytes IS DISTINCT FROM NEW.pending_bytes)
      OR NEW.claim_version NOT IN (OLD.claim_version,OLD.claim_version + 1)
      OR (OLD.state IN ('uploading','unknown','quarantined') AND NEW.state IN ('queued','preparing'))
      OR (NEW.state = 'uploading' AND OLD.state NOT IN ('preparing','uploading'))
      OR (NEW.state = 'ready' AND OLD.state <> 'quarantined') THEN
      RAISE EXCEPTION 'Knowledge upload identity or transition invalid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
