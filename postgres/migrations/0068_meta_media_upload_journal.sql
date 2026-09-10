-- Upload intent and remote outcome, without content, URLs, tokens or scan
-- verdicts. Dispatching work is never reclaimed for another provider PUT.
CREATE TABLE meta_media_upload_jobs (
  job_key TEXT PRIMARY KEY CHECK (job_key ~ '^media_upload_v1_[0-9a-f]{64}$'),
  tenant_id BIGINT NOT NULL,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512),
  message_key TEXT NOT NULL,
  connection_version INTEGER NOT NULL CHECK (connection_version > 0),
  source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  media_type TEXT NOT NULL CHECK (length(media_type) BETWEEN 3 AND 255),
  size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 104857600),
  bucket TEXT NOT NULL CHECK (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key TEXT NOT NULL,
  kms_key_arn TEXT NOT NULL CHECK (length(kms_key_arn) BETWEEN 20 AND 255),
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','claimed','dispatching','quarantined','reconciliation-required','rejected')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  claim_version INTEGER CHECK (claim_version > 1 AND claim_version <= version),
  lease_expires_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  object_version_id TEXT CHECK (object_version_id <> 'null' AND length(object_version_id) BETWEEN 1 AND 1024 AND object_version_id !~ '[[:cntrl:][:space:]]'),
  error_code TEXT CHECK (error_code IN ('WRITE_REJECTED','RECONCILIATION_REQUIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,connection_version,message_key,source_sha256),
  FOREIGN KEY (tenant_id,message_key) REFERENCES meta_history_inbox_messages(tenant_id,message_key) ON DELETE RESTRICT,
  CHECK (object_key = 'quarantine/meta-history/v1/' || tenant_id || '/' || connection_version || '/' || message_key || '/' || source_sha256 || '/' || content_sha256),
  CHECK ((status='prepared') = (claim_version IS NULL)),
  CHECK ((status IN ('claimed','dispatching')) = (lease_expires_at IS NOT NULL)),
  CHECK ((status IN ('dispatching','quarantined','reconciliation-required','rejected')) = (dispatched_at IS NOT NULL)),
  CHECK ((status='quarantined') = (object_version_id IS NOT NULL)),
  CHECK ((status IN ('reconciliation-required','rejected')) = (error_code IS NOT NULL)),
  CHECK (status<>'rejected' OR error_code='WRITE_REJECTED'),
  CHECK (status<>'reconciliation-required' OR error_code='RECONCILIATION_REQUIRED')
);
CREATE INDEX meta_media_upload_jobs_unfinished ON meta_media_upload_jobs(status,lease_expires_at,job_key)
  WHERE status IN ('prepared','claimed','dispatching','reconciliation-required');

CREATE FUNCTION guard_meta_media_upload_job_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Media upload evidence is retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'prepared' OR NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial media upload'; END IF;
    PERFORM 1 FROM meta_history_inbox_messages AS message
      JOIN meta_history_media_bindings AS binding ON binding.tenant_id=message.tenant_id AND binding.provider_message_id=message.provider_message_id
      WHERE message.tenant_id=NEW.tenant_id AND message.message_key=NEW.message_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'Media upload requires a saved source binding'; END IF;
  ELSE
    IF (NEW.job_key,NEW.tenant_id,NEW.actor_external_user_id,NEW.message_key,NEW.connection_version,NEW.source_sha256,NEW.content_sha256,
        NEW.media_type,NEW.size_bytes,NEW.bucket,NEW.object_key,NEW.kms_key_arn,NEW.created_at)
      IS DISTINCT FROM (OLD.job_key,OLD.tenant_id,OLD.actor_external_user_id,OLD.message_key,OLD.connection_version,OLD.source_sha256,OLD.content_sha256,
        OLD.media_type,OLD.size_bytes,OLD.bucket,OLD.object_key,OLD.kms_key_arn,OLD.created_at)
      OR NEW.version<>OLD.version+1 OR OLD.status IN ('quarantined','rejected') THEN
      RAISE EXCEPTION 'Invalid media upload identity or version';
    END IF;
    IF NOT ((OLD.status='prepared' AND NEW.status='claimed')
      OR (OLD.status='claimed' AND NEW.status='claimed' AND OLD.lease_expires_at<=clock_timestamp())
      OR (OLD.status='claimed' AND NEW.status='dispatching' AND OLD.lease_expires_at>clock_timestamp())
      OR (OLD.status='dispatching' AND NEW.status IN ('quarantined','reconciliation-required','rejected'))
      OR (OLD.status='reconciliation-required' AND NEW.status='quarantined')) THEN
      RAISE EXCEPTION 'Invalid media upload transition';
    END IF;
    IF (NEW.status='claimed' AND NEW.claim_version<>NEW.version)
      OR (NEW.status<>'claimed' AND NEW.claim_version IS DISTINCT FROM OLD.claim_version)
      OR (OLD.dispatched_at IS NOT NULL AND NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at)
      OR (NEW.lease_expires_at IS NOT NULL AND (NEW.lease_expires_at<=clock_timestamp() OR NEW.lease_expires_at>clock_timestamp()+INTERVAL '5 minutes')) THEN
      RAISE EXCEPTION 'Invalid media upload claim';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_upload_job_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_media_upload_jobs
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_upload_job_v1();
