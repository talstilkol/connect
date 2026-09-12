-- Bounded private relay. The logical knowledge key stays compatible with
-- existing sources; physical S3 identity is immutable and independently bound.
CREATE TABLE knowledge_ingestion_jobs (
  source_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512),
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  media_type TEXT NOT NULL CHECK (media_type IN ('text/plain','text/markdown')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 131072),
  bucket TEXT NOT NULL CHECK (length(bucket) BETWEEN 3 AND 63),
  object_key TEXT NOT NULL CHECK (object_key = 'quarantine/knowledge/v1/' || tenant_id::text || '/' || source_key),
  kms_key_arn TEXT NOT NULL CHECK (length(kms_key_arn) BETWEEN 1 AND 512),
  pending_bytes BYTEA,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','preparing','uploading','unknown','quarantined','ready','rejected')),
  version_id TEXT CHECK (version_id <> 'null' AND length(version_id) BETWEEN 1 AND 1024 AND version_id !~ '[[:cntrl:][:space:]]'),
  scan_verdict TEXT CHECK (scan_verdict IN ('PENDING','NO_THREATS_FOUND','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),
  claim_version INTEGER NOT NULL DEFAULT 0 CHECK (claim_version >= 0),
  claim_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  error_code TEXT CHECK (error_code ~ '^[A-Z0-9_]{1,100}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  FOREIGN KEY (tenant_id, source_key) REFERENCES knowledge_sources(tenant_id, source_key) ON DELETE RESTRICT,
  CHECK (pending_bytes IS NULL OR octet_length(pending_bytes) = size_bytes),
  CHECK (state NOT IN ('queued','preparing','uploading','unknown') OR pending_bytes IS NOT NULL),
  CHECK (state NOT IN ('quarantined','ready') OR version_id IS NOT NULL),
  CHECK (state <> 'ready' OR (scan_verdict = 'NO_THREATS_FOUND' AND pending_bytes IS NULL AND claim_expires_at IS NULL)),
  CHECK (state <> 'rejected' OR (error_code IS NOT NULL AND pending_bytes IS NULL AND claim_expires_at IS NULL))
);
CREATE INDEX knowledge_ingestion_due_idx ON knowledge_ingestion_jobs(next_attempt_at, source_key) WHERE state NOT IN ('ready','rejected');
CREATE FUNCTION guard_knowledge_ingestion_job() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
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
      OR OLD.state IN ('ready','rejected') OR (OLD.version_id IS NOT NULL AND OLD.version_id IS DISTINCT FROM NEW.version_id)
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
CREATE TRIGGER knowledge_ingestion_job_guard BEFORE INSERT OR UPDATE ON knowledge_ingestion_jobs FOR EACH ROW EXECUTE FUNCTION guard_knowledge_ingestion_job();
CREATE FUNCTION guard_knowledge_ingestion_ready() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.status = 'ready' AND EXISTS (SELECT 1 FROM public.knowledge_ingestion_jobs WHERE source_key = NEW.source_key AND tenant_id = NEW.tenant_id
    AND (state <> 'ready' OR version_id IS NULL OR scan_verdict IS DISTINCT FROM 'NO_THREATS_FOUND'
      OR content_sha256 <> NEW.content_sha256 OR media_type <> NEW.media_type OR size_bytes <> NEW.size_bytes)) THEN
    RAISE EXCEPTION 'Knowledge source requires verified ingestion';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_ingestion_ready_guard BEFORE UPDATE ON knowledge_sources FOR EACH ROW EXECUTE FUNCTION guard_knowledge_ingestion_ready();
CREATE FUNCTION audit_knowledge_ingestion_job() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.state,OLD.version_id,OLD.scan_verdict) IS DISTINCT FROM (NEW.state,NEW.version_id,NEW.scan_verdict) THEN
    INSERT INTO public.audit_logs (tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES (NEW.tenant_id,NEW.actor_external_user_id,'ai.knowledge.ingestion','knowledge_source',NEW.source_key,
      jsonb_build_object('state',NEW.state,'scanVerdict',NEW.scan_verdict,'errorCode',NEW.error_code));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_ingestion_job_audit AFTER INSERT OR UPDATE ON knowledge_ingestion_jobs FOR EACH ROW EXECUTE FUNCTION audit_knowledge_ingestion_job();
