-- Immutable, versioned WhatsApp campaign delivery policy evidence.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE whatsapp_campaign_delivery_policy_events (
  event_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  connection_version INTEGER NOT NULL,
  policy_version INTEGER NOT NULL,
  delivery_state TEXT NOT NULL,
  portfolio_limit_kind TEXT NOT NULL,
  portfolio_limit_value INTEGER,
  reservation_duration_seconds INTEGER NOT NULL,
  meta_graph_api_version TEXT NOT NULL,
  evidence_digest TEXT NOT NULL,
  evidence_checked_at TIMESTAMPTZ NOT NULL,
  evidence_expires_at TIMESTAMPTZ NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT whatsapp_delivery_policy_events_connection_fk
    FOREIGN KEY (tenant_id)
    REFERENCES meta_connections (tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_delivery_policy_events_key_sha256
    CHECK (
      event_key ~ '^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT whatsapp_delivery_policy_events_versions_positive
    CHECK (connection_version >= 1 AND policy_version >= 1),
  CONSTRAINT whatsapp_delivery_policy_events_state_valid
    CHECK (delivery_state IN ('enabled', 'disabled')),
  CONSTRAINT whatsapp_delivery_policy_events_limit_valid
    CHECK (
      (
        portfolio_limit_kind = 'bounded'
        AND portfolio_limit_value IN (250, 2000, 10000, 100000)
      )
      OR
      (
        portfolio_limit_kind = 'unlimited'
        AND portfolio_limit_value IS NULL
      )
    ),
  CONSTRAINT whatsapp_delivery_policy_events_duration_valid
    CHECK (reservation_duration_seconds BETWEEN 6 AND 86400),
  CONSTRAINT whatsapp_delivery_policy_events_graph_version_valid
    CHECK (meta_graph_api_version ~ '^v[1-9][0-9]*\.[0-9]+$'),
  CONSTRAINT whatsapp_delivery_policy_events_digest_sha256
    CHECK (evidence_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_delivery_policy_events_actor_bounded
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT whatsapp_delivery_policy_events_time_valid
    CHECK (
      evidence_checked_at =
        date_trunc('milliseconds', evidence_checked_at)
      AND evidence_expires_at =
        date_trunc('milliseconds', evidence_expires_at)
      AND recorded_at = date_trunc('milliseconds', recorded_at)
      AND created_at = date_trunc('milliseconds', created_at)
      AND evidence_checked_at <= recorded_at
      AND evidence_checked_at < evidence_expires_at
      AND (
        delivery_state = 'disabled'
        OR recorded_at < evidence_expires_at
      )
      AND created_at = recorded_at
    ),
  CONSTRAINT whatsapp_delivery_policy_events_tenant_version_uq
    UNIQUE (tenant_id, policy_version)
);

CREATE INDEX whatsapp_delivery_policy_events_tenant_recorded_idx
  ON whatsapp_campaign_delivery_policy_events (tenant_id, recorded_at);

CREATE FUNCTION enforce_whatsapp_delivery_policy_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  connection_status TEXT;
  current_connection_version INTEGER;
  next_policy_version INTEGER;
  previous_policy whatsapp_campaign_delivery_policy_events%ROWTYPE;
BEGIN
  SELECT status, version
  INTO connection_status, current_connection_version
  FROM meta_connections
  WHERE tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND
    OR current_connection_version <> NEW.connection_version
    OR (
      NEW.delivery_state = 'enabled'
      AND connection_status <> 'connected'
    )
  THEN
    RAISE EXCEPTION
      'WhatsApp delivery policy is not linked to current Meta connection state';
  END IF;

  SELECT coalesce(max(policy_version) + 1, 1)
  INTO next_policy_version
  FROM whatsapp_campaign_delivery_policy_events
  WHERE tenant_id = NEW.tenant_id;

  IF NEW.policy_version <> next_policy_version THEN
    RAISE EXCEPTION
      'WhatsApp delivery policy version is not sequential';
  END IF;

  IF NEW.delivery_state = 'disabled' THEN
    SELECT *
    INTO previous_policy
    FROM whatsapp_campaign_delivery_policy_events
    WHERE tenant_id = NEW.tenant_id
      AND policy_version = NEW.policy_version - 1;

    IF NOT FOUND
      OR previous_policy.delivery_state <> 'enabled'
      OR previous_policy.connection_version <> NEW.connection_version
      OR previous_policy.portfolio_limit_kind
        IS DISTINCT FROM NEW.portfolio_limit_kind
      OR previous_policy.portfolio_limit_value
        IS DISTINCT FROM NEW.portfolio_limit_value
      OR previous_policy.reservation_duration_seconds
        IS DISTINCT FROM NEW.reservation_duration_seconds
      OR previous_policy.meta_graph_api_version
        IS DISTINCT FROM NEW.meta_graph_api_version
      OR previous_policy.evidence_digest
        IS DISTINCT FROM NEW.evidence_digest
      OR previous_policy.evidence_checked_at
        IS DISTINCT FROM NEW.evidence_checked_at
      OR previous_policy.evidence_expires_at
        IS DISTINCT FROM NEW.evidence_expires_at
    THEN
      RAISE EXCEPTION
        'WhatsApp delivery policy disable transition is invalid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_delivery_policy_events_insert_guard
BEFORE INSERT ON whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_delivery_policy_insert();

CREATE FUNCTION audit_whatsapp_delivery_policy_insert()
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
    metadata_json,
    created_at
  ) VALUES (
    NEW.tenant_id,
    NEW.actor_external_user_id,
    'whatsapp.delivery_policy.recorded',
    'whatsapp_campaign_delivery_policy',
    NEW.tenant_id::TEXT,
    NEW.event_key,
    NULL,
    NEW.recorded_at
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_delivery_policy_events_insert_audit
AFTER INSERT ON whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION audit_whatsapp_delivery_policy_insert();

CREATE FUNCTION reject_whatsapp_delivery_policy_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp delivery policy events are immutable';
END;
$$;

CREATE TRIGGER whatsapp_delivery_policy_events_update_guard
BEFORE UPDATE ON whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_delivery_policy_mutation();

CREATE TRIGGER whatsapp_delivery_policy_events_delete_guard
BEFORE DELETE ON whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_delivery_policy_mutation();
