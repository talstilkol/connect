-- This is local snapshot time, not provider authorization or offboarding proof.
-- It is diagnostic only: timestamps never permit ignoring an unseen removal.
-- Legacy rows without reliable snapshot timing retain NULL.
ALTER TABLE meta_connections ADD COLUMN snapshot_started_at TIMESTAMPTZ
  CHECK (snapshot_started_at > '1970-01-01'::timestamptz AND snapshot_started_at = date_trunc('milliseconds', snapshot_started_at));
ALTER TABLE meta_connections ADD COLUMN snapshot_version INTEGER CHECK (snapshot_version > 0 AND snapshot_version <= version);
ALTER TABLE meta_connections ADD CONSTRAINT meta_snapshot_identity_pair CHECK ((snapshot_started_at IS NULL) = (snapshot_version IS NULL));
-- Do not infer historical snapshot time from mutable operational timestamps.
CREATE FUNCTION guard_meta_snapshot_epoch_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (NEW.status = 'pending' AND NEW.version > OLD.version) THEN
    NEW.snapshot_started_at := date_trunc('milliseconds', clock_timestamp());
    NEW.snapshot_version := NEW.version;
  ELSIF NEW.snapshot_started_at IS DISTINCT FROM OLD.snapshot_started_at OR NEW.snapshot_version IS DISTINCT FROM OLD.snapshot_version THEN
    RAISE EXCEPTION 'Meta snapshot epoch cannot be replaced';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_snapshot_epoch_guard BEFORE INSERT OR UPDATE ON meta_connections
FOR EACH ROW EXECUTE FUNCTION guard_meta_snapshot_epoch_v1();

ALTER TABLE meta_webhook_receipts ADD CONSTRAINT meta_webhook_lifecycle_receipt_binding UNIQUE (tenant_id, id, waba_id, event_key);
CREATE TABLE meta_account_lifecycle_events (
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  event_digest TEXT NOT NULL CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  receipt_id BIGINT NOT NULL,
  event_key TEXT NOT NULL CHECK (event_key ~ '^[0-9a-f]{64}$'),
  waba_id TEXT NOT NULL CHECK (waba_id ~ '^[1-9][0-9]{0,254}$'),
  phone_number_id TEXT NOT NULL CHECK (phone_number_id ~ '^[1-9][0-9]{0,254}$'),
  business_portfolio_id TEXT NOT NULL CHECK (business_portfolio_id ~ '^[1-9][0-9]{0,254}$'),
  connection_version INTEGER NOT NULL CHECK (connection_version > 0),
  resolved_version INTEGER NOT NULL CHECK (resolved_version > 0),
  result_version INTEGER NOT NULL CHECK (result_version >= resolved_version),
  event_type TEXT NOT NULL CHECK (event_type IN ('PARTNER_REMOVED', 'ACCOUNT_OFFBOARDED', 'ACCOUNT_RECONNECTED')),
  occurred_at TIMESTAMPTZ NOT NULL CHECK (occurred_at > '1970-01-01'::timestamptz AND occurred_at = date_trunc('seconds', occurred_at)),
  snapshot_started_at TIMESTAMPTZ,
  timing TEXT NOT NULL CHECK (timing IN ('before-snapshot', 'same-second', 'after-snapshot', 'unknown')),
  outcome TEXT NOT NULL CHECK (outcome IN ('revoked', 'already-revoked', 'connection-changed', 'reconnected-observed')),
  owner_business_id TEXT CHECK (owner_business_id ~ '^[1-9][0-9]{0,254}$'),
  reported_phone_number TEXT CHECK (reported_phone_number ~ '^\+[1-9][0-9]{0,14}$'),
  reason TEXT CHECK (length(reason) <= 128 AND reason ~ '^[A-Z][A-Z0-9_]*$'),
  initiated_by TEXT CHECK (length(initiated_by) <= 64 AND initiated_by ~ '^[A-Z][A-Z0-9_]*$'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  PRIMARY KEY (tenant_id, event_digest),
  UNIQUE (waba_id, event_digest),
  FOREIGN KEY (tenant_id, receipt_id, waba_id, event_key) REFERENCES meta_webhook_receipts(tenant_id, id, waba_id, event_key) ON DELETE RESTRICT,
  CHECK ((outcome = 'revoked' AND result_version = resolved_version + 1 AND event_type <> 'ACCOUNT_RECONNECTED') OR
    (outcome <> 'revoked' AND result_version = resolved_version)),
  CHECK (outcome <> 'reconnected-observed' OR event_type = 'ACCOUNT_RECONNECTED'),
  CHECK ((timing = 'unknown' AND snapshot_started_at IS NULL) OR
    (timing <> 'unknown' AND snapshot_started_at IS NOT NULL)),
  CHECK (owner_business_id IS NULL OR owner_business_id = business_portfolio_id)
);
CREATE INDEX meta_lifecycle_authorization_history ON meta_account_lifecycle_events (tenant_id, connection_version, occurred_at);
CREATE FUNCTION guard_meta_lifecycle_event_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Meta lifecycle evidence is immutable';
END;
$$;
CREATE TRIGGER meta_lifecycle_event_guard BEFORE UPDATE OR DELETE ON meta_account_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION guard_meta_lifecycle_event_v1();
