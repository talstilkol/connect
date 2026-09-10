-- A committed successful Business App receipt and its continuation are one
-- transaction. No authorization code or access token is stored in this queue.
CREATE TABLE meta_coexistence_sync_jobs (
  launch_id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  configuration_key TEXT NOT NULL CHECK (configuration_key ~ '^[0-9a-f]{64}$'),
  started_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','requests-accepted','recovery-required','cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_expires_at TIMESTAMPTZ,
  CHECK ((status='running') = (lease_expires_at IS NOT NULL)),
  FOREIGN KEY (tenant_id,launch_id,actor_external_user_id,started_at)
    REFERENCES meta_signup_launches(tenant_id,id,actor_external_user_id,started_at) ON DELETE RESTRICT
);
CREATE INDEX meta_coexistence_sync_jobs_due ON meta_coexistence_sync_jobs(next_attempt_at,launch_id)
  WHERE status IN ('pending','running');

CREATE FUNCTION guard_meta_coexistence_sync_job_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Meta sync jobs are retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'pending' OR NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial Meta sync job'; END IF;
    PERFORM 1 FROM meta_signup_launches AS launch
      JOIN railway_api_mutation_receipts AS receipt ON receipt.tenant_id=launch.tenant_id AND receipt.operation=launch.operation
        AND receipt.idempotency_key=launch.claim_key AND receipt.request_digest=launch.request_digest
        AND receipt.actor_external_user_id=launch.actor_external_user_id
      WHERE launch.id=NEW.launch_id AND launch.tenant_id=NEW.tenant_id AND launch.status='finished'
        AND launch.configuration_key=NEW.configuration_key AND launch.actor_external_user_id=NEW.actor_external_user_id
        AND launch.started_at=NEW.started_at AND receipt.status='completed'
        AND receipt.response_json->>'status'='connected'
        AND (receipt.response_json->>'connectionVersion')::bigint>0
      FOR SHARE OF launch,receipt;
    IF NOT FOUND THEN RAISE EXCEPTION 'Meta sync job requires completed signup evidence'; END IF;
  ELSE
    IF (NEW.launch_id,NEW.tenant_id,NEW.actor_external_user_id,NEW.configuration_key,NEW.started_at)
      IS DISTINCT FROM (OLD.launch_id,OLD.tenant_id,OLD.actor_external_user_id,OLD.configuration_key,OLD.started_at)
      OR NEW.version<>OLD.version+1 OR OLD.status IN ('requests-accepted','recovery-required','cancelled')
      OR (OLD.status='pending' AND NEW.status NOT IN ('running','recovery-required')) THEN
      RAISE EXCEPTION 'Invalid Meta sync job transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_coexistence_sync_job_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_coexistence_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION guard_meta_coexistence_sync_job_v1();
