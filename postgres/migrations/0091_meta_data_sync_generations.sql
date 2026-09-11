-- Preserve the original cycle and every provider request. A new local token
-- or connection version alone cannot authorize another one-time sync request.
ALTER TABLE meta_data_sync_onboardings DROP CONSTRAINT meta_data_sync_onboardings_pkey;
ALTER TABLE meta_data_sync_onboardings ADD PRIMARY KEY (tenant_id,started_at),
  ADD COLUMN previous_started_at TIMESTAMPTZ,
  ADD COLUMN offboarding_event_digest TEXT,
  ADD FOREIGN KEY (tenant_id,previous_started_at) REFERENCES meta_data_sync_onboardings(tenant_id,started_at) ON DELETE RESTRICT,
  ADD FOREIGN KEY (tenant_id,offboarding_event_digest) REFERENCES meta_account_lifecycle_events(tenant_id,event_digest) ON DELETE RESTRICT,
  ADD CHECK (previous_started_at IS NULL OR previous_started_at<started_at),
  ADD CHECK (offboarding_event_digest IS NULL OR previous_started_at IS NOT NULL),
  ADD UNIQUE (tenant_id,signup_launch_id), ADD UNIQUE (tenant_id,signup_connection_version);
ALTER TABLE meta_data_sync_requests DROP CONSTRAINT meta_data_sync_requests_pkey,
  DROP CONSTRAINT meta_data_sync_requests_tenant_id_sync_type_key,
  ADD PRIMARY KEY (phone_number_id,sync_type,started_at),
  ADD UNIQUE (tenant_id,sync_type,started_at),
  ADD UNIQUE (tenant_id,sync_type,connection_version);

CREATE FUNCTION guard_meta_sync_generation_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous meta_data_sync_onboardings%ROWTYPE; prior_request meta_data_sync_requests%ROWTYPE; evidence TEXT;
BEGIN
  -- Serialize concurrent launches and direct insert attempts with the runtime.
  PERFORM 1 FROM tenants WHERE id=NEW.tenant_id FOR NO KEY UPDATE;
  -- ON CONFLICT replay must not derive a new predecessor for the same cycle.
  IF EXISTS (SELECT 1 FROM meta_data_sync_onboardings WHERE tenant_id=NEW.tenant_id AND started_at=NEW.started_at) THEN RETURN NEW; END IF;
  SELECT * INTO previous FROM meta_data_sync_onboardings WHERE tenant_id=NEW.tenant_id ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    IF NEW.previous_started_at IS NOT NULL OR NEW.offboarding_event_digest IS NOT NULL THEN RAISE EXCEPTION 'Invalid first sync cycle'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.signup_launch_id IS NULL OR NEW.signup_connection_version IS NULL OR NEW.started_at<=previous.started_at
    OR (previous.signup_launch_id IS NOT NULL AND NEW.signup_launch_id<=previous.signup_launch_id) THEN
    RAISE EXCEPTION 'A new sync cycle requires a newer completed signup';
  END IF;
  IF NEW.previous_started_at IS NOT NULL OR NEW.offboarding_event_digest IS NOT NULL THEN RAISE EXCEPTION 'Sync predecessor is server derived'; END IF;
  NEW.previous_started_at:=previous.started_at;
  -- The most recently dispatched generation for this phone is the relevant
  -- predecessor, including unknown/rejected requests. A prepared row is not a POST.
  SELECT request.* INTO prior_request FROM meta_data_sync_requests request
    JOIN meta_connections connection ON connection.tenant_id=NEW.tenant_id
      AND connection.phone_number_id=request.phone_number_id
    WHERE request.dispatched_at IS NOT NULL ORDER BY request.started_at DESC LIMIT 1;
  IF FOUND THEN
    IF prior_request.tenant_id<>NEW.tenant_id THEN RAISE EXCEPTION 'Sync phone belongs to another tenant history'; END IF;
    SELECT event_digest INTO evidence FROM meta_account_lifecycle_events
      WHERE tenant_id=NEW.tenant_id AND waba_id=prior_request.waba_id AND phone_number_id=prior_request.phone_number_id
        AND connection_version>=prior_request.connection_version AND resolved_version>=connection_version
        AND result_version=NEW.baseline_connection_version AND event_type IN ('PARTNER_REMOVED','ACCOUNT_OFFBOARDED')
        AND outcome='revoked' AND occurred_at>=prior_request.started_at AND recorded_at<NEW.started_at
        AND occurred_at<NEW.started_at
      ORDER BY recorded_at DESC,event_digest LIMIT 1;
    IF evidence IS NULL THEN RAISE EXCEPTION 'SYNC_OFFBOARDING_EVIDENCE_REQUIRED'; END IF;
    NEW.offboarding_event_digest:=evidence;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_data_sync_generation_guard BEFORE INSERT ON meta_data_sync_onboardings
  FOR EACH ROW EXECUTE FUNCTION guard_meta_sync_generation_v1();

CREATE OR REPLACE FUNCTION guard_meta_data_sync_request_signup_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE onboarding meta_data_sync_onboardings%ROWTYPE;
BEGIN
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Sync preparation requires read committed'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('meta_sync_phone_v1:' || NEW.phone_number_id,0));
  SELECT * INTO STRICT onboarding FROM meta_data_sync_onboardings WHERE tenant_id=NEW.tenant_id AND started_at=NEW.started_at FOR SHARE;
  IF EXISTS (SELECT 1 FROM meta_data_sync_requests WHERE phone_number_id=NEW.phone_number_id AND tenant_id<>NEW.tenant_id) THEN
    RAISE EXCEPTION 'Sync phone belongs to another tenant history';
  END IF;
  IF EXISTS (SELECT 1 FROM meta_data_sync_onboardings WHERE tenant_id=NEW.tenant_id AND started_at>NEW.started_at) THEN
    RAISE EXCEPTION 'Sync generation is superseded';
  END IF;
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

-- These are observations of the currently connected receiver, NOT proof that
-- their payload belongs to that receiver's import generation. Runtime cannot
-- project or release them into the inbox. Refusal only permits redaction.
CREATE TABLE meta_sync_unattributed_events (
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  event_digest TEXT NOT NULL CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  waba_id TEXT NOT NULL CHECK (waba_id ~ '^[1-9][0-9]{0,254}$'),
  phone_number_id TEXT NOT NULL CHECK (phone_number_id ~ '^[1-9][0-9]{0,254}$'),
  observed_connection_version INTEGER NOT NULL CHECK (observed_connection_version>0),
  kind TEXT NOT NULL CHECK (kind IN ('chunk','media','declined','contact')),
  payload JSONB CHECK (payload IS NULL OR jsonb_typeof(payload)='object'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,event_digest), CHECK (kind<>'declined' OR payload IS NULL)
);
CREATE FUNCTION guard_meta_sync_unattributed_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Unattributed sync evidence cannot be erased'; END IF;
  IF (to_jsonb(NEW)-'payload') IS DISTINCT FROM (to_jsonb(OLD)-'payload') OR NEW.payload IS NOT NULL THEN
    RAISE EXCEPTION 'Unattributed sync payload can only be redacted';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_sync_unattributed_guard BEFORE UPDATE OR DELETE ON meta_sync_unattributed_events
  FOR EACH ROW EXECUTE FUNCTION guard_meta_sync_unattributed_v1();
CREATE TRIGGER meta_sync_unattributed_truncate_guard BEFORE TRUNCATE ON meta_sync_unattributed_events
  FOR EACH STATEMENT EXECUTE FUNCTION guard_meta_sync_unattributed_v1();
CREATE TRIGGER meta_data_sync_start_truncate_guard BEFORE TRUNCATE ON meta_data_sync_onboardings
  FOR EACH STATEMENT EXECUTE FUNCTION guard_meta_data_sync_start_v1();
CREATE TRIGGER meta_data_sync_request_truncate_guard BEFORE TRUNCATE ON meta_data_sync_requests
  FOR EACH STATEMENT EXECUTE FUNCTION guard_meta_data_sync_start_v1();
CREATE INDEX meta_sync_unattributed_refusals ON meta_sync_unattributed_events(tenant_id,waba_id,phone_number_id) WHERE kind='declined';
-- The API needs only this payload-free refusal projection.
CREATE VIEW meta_sync_import_refusals AS SELECT DISTINCT tenant_id,waba_id,phone_number_id
  FROM meta_sync_unattributed_events WHERE kind='declined';
