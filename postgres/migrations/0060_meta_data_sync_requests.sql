-- One immutable local start precedes Embedded Signup. Provider requests remain
-- dormant until the complete Coexistence flow is activated.
CREATE TABLE meta_data_sync_onboardings (
  tenant_id BIGINT PRIMARY KEY REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512 AND actor_external_user_id = btrim(actor_external_user_id) AND actor_external_user_id !~ '[[:cntrl:]]'),
  baseline_connection_version INTEGER CHECK (baseline_connection_version > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  CHECK (tenant_id > 0),
  CHECK (started_at > '1970-01-01'::timestamptz AND started_at = date_trunc('milliseconds', started_at)),
  UNIQUE (tenant_id, started_at)
);

CREATE TABLE meta_data_sync_requests (
  tenant_id BIGINT NOT NULL,
  waba_id TEXT NOT NULL CHECK (waba_id ~ '^[1-9][0-9]{0,254}$'),
  phone_number_id TEXT NOT NULL CHECK (phone_number_id ~ '^[1-9][0-9]{0,254}$'),
  connection_version INTEGER NOT NULL CHECK (connection_version > 0),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('smb_app_state_sync', 'history')),
  started_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'dispatching', 'accepted', 'unknown', 'rejected', 'expired', 'cancelled')),
  request_id TEXT CHECK (length(request_id) BETWEEN 1 AND 512 AND request_id = btrim(request_id) AND request_id !~ '[[:cntrl:]]'),
  dispatched_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  -- Changing a local authorization version cannot repeat a one-time provider call.
  PRIMARY KEY (phone_number_id, sync_type),
  UNIQUE (tenant_id, sync_type),
  FOREIGN KEY (tenant_id, started_at) REFERENCES meta_data_sync_onboardings(tenant_id, started_at) ON DELETE RESTRICT,
  CHECK (
    (status = 'prepared' AND dispatched_at IS NULL AND finished_at IS NULL AND request_id IS NULL) OR
    (status = 'dispatching' AND dispatched_at IS NOT NULL AND finished_at IS NULL AND request_id IS NULL) OR
    (status = 'accepted' AND dispatched_at IS NOT NULL AND finished_at IS NOT NULL AND request_id IS NOT NULL) OR
    (status IN ('unknown', 'rejected') AND dispatched_at IS NOT NULL AND finished_at IS NOT NULL AND request_id IS NULL) OR
    (status IN ('expired', 'cancelled') AND dispatched_at IS NULL AND finished_at IS NOT NULL AND request_id IS NULL)
  ),
  CHECK (dispatched_at IS NULL OR (dispatched_at >= started_at AND dispatched_at < started_at + INTERVAL '24 hours' AND dispatched_at = date_trunc('milliseconds', dispatched_at))),
  CHECK (finished_at IS NULL OR (finished_at >= COALESCE(dispatched_at, started_at) AND finished_at = date_trunc('milliseconds', finished_at)))
);

CREATE FUNCTION guard_meta_data_sync_start_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Meta sync onboarding start is immutable';
END;
$$;
CREATE TRIGGER meta_data_sync_start_guard BEFORE UPDATE OR DELETE ON meta_data_sync_onboardings
FOR EACH ROW EXECUTE FUNCTION guard_meta_data_sync_start_v1();

CREATE FUNCTION guard_meta_data_sync_transition_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Meta sync request cannot be reset'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'prepared' THEN RAISE EXCEPTION 'Meta sync request must start prepared'; END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.tenant_id, NEW.waba_id, NEW.phone_number_id, NEW.connection_version, NEW.sync_type, NEW.started_at)
    IS DISTINCT FROM ROW(OLD.tenant_id, OLD.waba_id, OLD.phone_number_id, OLD.connection_version, OLD.sync_type, OLD.started_at)
    OR NOT ((OLD.status = 'prepared' AND NEW.status IN ('dispatching', 'expired', 'cancelled'))
      OR (OLD.status = 'dispatching' AND NEW.status IN ('accepted', 'unknown', 'rejected') AND NEW.dispatched_at = OLD.dispatched_at)) THEN
    RAISE EXCEPTION 'Invalid Meta sync transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_data_sync_request_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_data_sync_requests
FOR EACH ROW EXECUTE FUNCTION guard_meta_data_sync_transition_v1();
