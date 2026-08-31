-- PostgreSQL system-admin business-profile evidence and audit protection.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE business_profile_admin_events (
  event_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  previous_profile_digest TEXT NOT NULL,
  new_profile_digest TEXT NOT NULL,
  changed_fields TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  profile_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT business_profile_admin_events_profile_fk
    FOREIGN KEY (tenant_id)
    REFERENCES business_profiles (tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT business_profile_admin_events_key_sha256
    CHECK (
      event_key ~ '^business_profile_admin_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT business_profile_admin_events_previous_digest_sha256
    CHECK (previous_profile_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT business_profile_admin_events_new_digest_sha256
    CHECK (
      new_profile_digest ~ '^[0-9a-f]{64}$'
      AND new_profile_digest <> previous_profile_digest
    ),
  CONSTRAINT business_profile_admin_events_changed_fields_valid
    CHECK (
      changed_fields IN (
        'businessName',
        'timezone',
        'interfaceLanguage',
        'businessName,timezone',
        'businessName,interfaceLanguage',
        'timezone,interfaceLanguage',
        'businessName,timezone,interfaceLanguage'
      )
    ),
  CONSTRAINT business_profile_admin_events_actor_bounded
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT business_profile_admin_events_version_valid
    CHECK (profile_version >= 2),
  CONSTRAINT business_profile_admin_events_timestamps_milliseconds
    CHECK (
      occurred_at = date_trunc('milliseconds', occurred_at)
      AND created_at = date_trunc('milliseconds', created_at)
    ),
  CONSTRAINT business_profile_admin_events_tenant_version_uq
    UNIQUE (tenant_id, profile_version)
);

CREATE INDEX business_profile_admin_events_tenant_occurred_idx
  ON business_profile_admin_events (tenant_id, occurred_at);

CREATE FUNCTION enforce_business_profile_admin_event_proof()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM business_profiles
    WHERE tenant_id = NEW.tenant_id
      AND version = NEW.profile_version
      AND updated_at = NEW.occurred_at
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'Business profile admin event is not linked to current state';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_admin_events_proof_guard
BEFORE INSERT ON business_profile_admin_events
FOR EACH ROW
EXECUTE FUNCTION enforce_business_profile_admin_event_proof();

CREATE FUNCTION audit_business_profile_admin_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    actor_external_user_id,
    action,
    target_type,
    target_id,
    idempotency_key,
    metadata_json
  ) VALUES (
    NEW.tenant_id,
    NEW.actor_external_user_id,
    'business_profile.updated',
    'business_profile',
    NEW.tenant_id::text,
    NEW.event_key,
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_admin_events_insert_audit
AFTER INSERT ON business_profile_admin_events
FOR EACH ROW
EXECUTE FUNCTION audit_business_profile_admin_event();

CREATE FUNCTION reject_business_profile_admin_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Business profile admin events are immutable';
END;
$$;

CREATE TRIGGER business_profile_admin_events_update_guard
BEFORE UPDATE ON business_profile_admin_events
FOR EACH ROW
EXECUTE FUNCTION reject_business_profile_admin_event_mutation();

CREATE TRIGGER business_profile_admin_events_delete_guard
BEFORE DELETE ON business_profile_admin_events
FOR EACH ROW
EXECUTE FUNCTION reject_business_profile_admin_event_mutation();
