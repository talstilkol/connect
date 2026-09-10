-- A server-recorded launch precedes FB.login. This is a local authorization
-- attempt, not proof of Meta offboarding or permission to repeat data sync.
ALTER TABLE railway_api_mutation_receipts ADD CONSTRAINT meta_signup_launch_receipt_binding
  UNIQUE (tenant_id,operation,idempotency_key,request_digest,actor_external_user_id);
CREATE TABLE meta_signup_launches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512 AND actor_external_user_id = btrim(actor_external_user_id) AND actor_external_user_id !~ '[[:cntrl:]]'),
  configuration_key TEXT NOT NULL CHECK (configuration_key ~ '^[0-9a-f]{64}$'),
  baseline_connection_version INTEGER CHECK (baseline_connection_version > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','claimed','finished','abandoned')),
  claim_key TEXT CHECK (claim_key ~ '^connect_idempotency_v1_[0-9a-f]{64}$'),
  request_digest TEXT CHECK (request_digest ~ '^railway_mutation_request_v1_[0-9a-f]{64}$'),
  operation TEXT NOT NULL DEFAULT 'meta.embedded-signup.complete' CHECK (operation='meta.embedded-signup.complete'),
  claimed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  UNIQUE (tenant_id,id),
  FOREIGN KEY (tenant_id,operation,claim_key,request_digest,actor_external_user_id)
    REFERENCES railway_api_mutation_receipts(tenant_id,operation,idempotency_key,request_digest,actor_external_user_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK (started_at > '1970-01-01'::timestamptz AND started_at = date_trunc('milliseconds',started_at)),
  CHECK (expires_at = started_at + INTERVAL '20 minutes'),
  CHECK (claimed_at IS NULL OR (claimed_at >= started_at AND claimed_at < expires_at AND claimed_at = date_trunc('milliseconds',claimed_at))),
  CHECK (closed_at IS NULL OR (closed_at >= COALESCE(claimed_at,started_at) AND closed_at = date_trunc('milliseconds',closed_at))),
  CHECK ((status='ready' AND claim_key IS NULL AND request_digest IS NULL AND claimed_at IS NULL AND closed_at IS NULL)
    OR (status='claimed' AND claim_key IS NOT NULL AND request_digest IS NOT NULL AND claimed_at IS NOT NULL AND closed_at IS NULL)
    OR (status='finished' AND claim_key IS NOT NULL AND request_digest IS NOT NULL AND claimed_at IS NOT NULL AND closed_at IS NOT NULL)
    OR (status='abandoned' AND claim_key IS NULL AND request_digest IS NULL AND claimed_at IS NULL AND closed_at IS NOT NULL))
);
CREATE UNIQUE INDEX meta_signup_one_active_launch ON meta_signup_launches(tenant_id) WHERE status IN ('ready','claimed');
CREATE FUNCTION guard_meta_signup_launch_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Meta signup launch cannot be removed'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status <> 'ready' THEN RAISE EXCEPTION 'Meta signup launch must start ready'; END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.id,NEW.tenant_id,NEW.actor_external_user_id,NEW.configuration_key,NEW.baseline_connection_version,NEW.started_at,NEW.expires_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.actor_external_user_id,OLD.configuration_key,OLD.baseline_connection_version,OLD.started_at,OLD.expires_at)
    OR NOT ((OLD.status='ready' AND NEW.status IN ('claimed','abandoned')) OR
      (OLD.status='claimed' AND NEW.status='finished' AND ROW(NEW.claim_key,NEW.request_digest,NEW.claimed_at) IS NOT DISTINCT FROM ROW(OLD.claim_key,OLD.request_digest,OLD.claimed_at))) THEN
    RAISE EXCEPTION 'Invalid Meta signup launch transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_signup_launch_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_signup_launches
FOR EACH ROW EXECUTE FUNCTION guard_meta_signup_launch_v1();
