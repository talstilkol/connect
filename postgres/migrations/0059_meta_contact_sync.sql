-- Source-owned address-book state; Connect profiles and consent are unchanged.
CREATE TABLE meta_contact_sync_states (
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  contact_phone TEXT NOT NULL CHECK (contact_phone ~ '^\+[1-9][0-9]{0,14}$'),
  occurred_at TIMESTAMPTZ NOT NULL CHECK (occurred_at > '1970-01-01'::timestamptz AND occurred_at = date_trunc('milliseconds', occurred_at)),
  status TEXT NOT NULL CHECK (status IN ('present', 'removed', 'conflicted')),
  full_name TEXT,
  first_name TEXT,
  PRIMARY KEY (tenant_id, waba_id, phone_number_id, contact_phone),
  CHECK (tenant_id > 0),
  CHECK (length(waba_id) BETWEEN 1 AND 255 AND waba_id = btrim(waba_id) AND waba_id !~ '[[:cntrl:]]'),
  CHECK (length(phone_number_id) BETWEEN 1 AND 255 AND phone_number_id = btrim(phone_number_id) AND phone_number_id !~ '[[:cntrl:]]'),
  CHECK (full_name IS NULL OR (length(full_name) BETWEEN 1 AND 512 AND full_name = btrim(full_name) AND full_name !~ '[[:cntrl:]]')),
  CHECK (first_name IS NULL OR (length(first_name) BETWEEN 1 AND 512 AND first_name = btrim(first_name) AND first_name !~ '[[:cntrl:]]')),
  CHECK (status = 'present' OR (full_name IS NULL AND first_name IS NULL))
);

CREATE TABLE meta_contact_sync_events (
  tenant_id BIGINT NOT NULL,
  event_key TEXT NOT NULL CHECK (event_key ~ '^[0-9a-f]{64}$'),
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_key),
  FOREIGN KEY (tenant_id, waba_id, phone_number_id, contact_phone)
    REFERENCES meta_contact_sync_states (tenant_id, waba_id, phone_number_id, contact_phone) ON DELETE CASCADE
);
