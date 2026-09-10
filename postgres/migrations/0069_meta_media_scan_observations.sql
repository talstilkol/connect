-- Immutable, version-bound observations from authenticated S3 reads. These
-- facts do not authorize serving a file and do not relax quarantine policy.
CREATE TABLE meta_media_scan_observations (
  job_key TEXT NOT NULL REFERENCES meta_media_upload_jobs(job_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  claim_version INTEGER NOT NULL CHECK (claim_version > 1),
  object_version_id TEXT NOT NULL CHECK (object_version_id <> 'null' AND length(object_version_id) BETWEEN 1 AND 1024 AND object_version_id !~ '[[:cntrl:][:space:]]'),
  result TEXT NOT NULL CHECK (result IN ('PENDING','NO_THREATS_FOUND','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED')),
  content_verified BOOLEAN NOT NULL CHECK (content_verified = (result='NO_THREATS_FOUND')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (job_key,object_version_id,result)
);
CREATE INDEX meta_media_scan_observations_tenant ON meta_media_scan_observations(tenant_id,job_key);

CREATE FUNCTION guard_meta_media_scan_observation_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Media scan observations are immutable'; END IF;
  PERFORM 1 FROM meta_media_upload_jobs
    WHERE job_key=NEW.job_key AND tenant_id=NEW.tenant_id AND claim_version=NEW.claim_version
      AND status IN ('dispatching','reconciliation-required','quarantined')
      AND (object_version_id IS NULL OR object_version_id=NEW.object_version_id)
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Media scan observation requires the exact dispatched upload'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_scan_observation_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_media_scan_observations
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_scan_observation_v1();
