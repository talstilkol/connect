-- Keep existing starts and requests intact. New linked preparation derives
-- its scope from a completed signup, never from a client timestamp/version.
ALTER TABLE meta_signup_launches ADD CONSTRAINT meta_signup_launch_start_binding
  UNIQUE (tenant_id,id,actor_external_user_id,started_at);
ALTER TABLE meta_data_sync_onboardings
  ADD COLUMN signup_launch_id BIGINT,
  ADD COLUMN signup_connection_version INTEGER,
  ADD CONSTRAINT meta_sync_signup_pair CHECK (
    (signup_launch_id IS NULL AND signup_connection_version IS NULL) OR
    (signup_launch_id IS NOT NULL AND signup_launch_id > 0 AND signup_connection_version IS NOT NULL AND signup_connection_version > 0)),
  ADD CONSTRAINT meta_sync_signup_start_binding
    FOREIGN KEY (tenant_id,signup_launch_id,actor_external_user_id,started_at)
    REFERENCES meta_signup_launches(tenant_id,id,actor_external_user_id,started_at) ON DELETE RESTRICT;

CREATE FUNCTION guard_meta_data_sync_signup_binding_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.signup_launch_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM meta_signup_launches WHERE tenant_id=NEW.tenant_id) THEN
      RAISE EXCEPTION 'Meta sync requires a completed signup binding';
    END IF;
    RETURN NEW;
  END IF;
  PERFORM 1 FROM meta_signup_launches AS launch
    JOIN railway_api_mutation_receipts AS receipt ON receipt.tenant_id=launch.tenant_id AND receipt.operation=launch.operation
      AND receipt.idempotency_key=launch.claim_key AND receipt.request_digest=launch.request_digest AND receipt.actor_external_user_id=launch.actor_external_user_id
    JOIN meta_connections AS connection ON connection.tenant_id=launch.tenant_id
    JOIN tenants AS tenant ON tenant.id=launch.tenant_id
    WHERE launch.tenant_id=NEW.tenant_id AND launch.id=NEW.signup_launch_id AND launch.status='finished'
      AND launch.actor_external_user_id=NEW.actor_external_user_id AND launch.started_at=NEW.started_at
      AND launch.baseline_connection_version IS NOT DISTINCT FROM NEW.baseline_connection_version
      AND receipt.status='completed' AND receipt.response_json=jsonb_build_object('status','connected','connectionVersion',NEW.signup_connection_version)
      AND connection.status='connected' AND connection.version=NEW.signup_connection_version
      AND tenant.status IN ('active','trial','payment_failed')
      AND clock_timestamp()<launch.started_at+INTERVAL '24 hours'
    FOR SHARE OF launch,receipt,connection,tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta sync signup evidence is unavailable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_data_sync_signup_binding_guard BEFORE INSERT ON meta_data_sync_onboardings
  FOR EACH ROW EXECUTE FUNCTION guard_meta_data_sync_signup_binding_v1();

CREATE FUNCTION guard_meta_data_sync_request_signup_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE onboarding meta_data_sync_onboardings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT onboarding FROM meta_data_sync_onboardings WHERE tenant_id=NEW.tenant_id FOR SHARE;
  IF onboarding.signup_launch_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM meta_signup_launches WHERE tenant_id=NEW.tenant_id) THEN
      RAISE EXCEPTION 'Meta sync legacy start cannot authorize a new signup';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.connection_version<>onboarding.signup_connection_version OR NEW.started_at<>onboarding.started_at THEN
    RAISE EXCEPTION 'Meta sync request does not match signup';
  END IF;
  PERFORM 1 FROM meta_connections WHERE tenant_id=NEW.tenant_id AND version=NEW.connection_version
    AND status='connected' AND waba_id=NEW.waba_id AND phone_number_id=NEW.phone_number_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta sync signup connection changed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_data_sync_request_signup_guard BEFORE INSERT ON meta_data_sync_requests
  FOR EACH ROW EXECUTE FUNCTION guard_meta_data_sync_request_signup_v1();
