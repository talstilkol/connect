-- PostgreSQL tenant subscription state and immutable administrative history.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE tenant_subscriptions (
  tenant_id BIGINT PRIMARY KEY,
  status TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT tenant_subscriptions_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT tenant_subscriptions_status_valid
    CHECK (
      status IN (
        'trial',
        'active',
        'payment_failed',
        'suspended',
        'cancelled',
        'expired',
        'blocked'
      )
    ),
  CONSTRAINT tenant_subscriptions_window_valid
    CHECK (starts_at < ends_at),
  CONSTRAINT tenant_subscriptions_version_positive
    CHECK (version >= 1),
  CONSTRAINT tenant_subscriptions_cancelled_state_consistent
    CHECK (
      (status = 'cancelled' AND cancelled_at IS NOT NULL)
      OR
      (status <> 'cancelled' AND cancelled_at IS NULL)
    ),
  CONSTRAINT tenant_subscriptions_timestamps_milliseconds
    CHECK (
      starts_at = date_trunc('milliseconds', starts_at)
      AND ends_at = date_trunc('milliseconds', ends_at)
      AND (
        cancelled_at IS NULL
        OR cancelled_at = date_trunc('milliseconds', cancelled_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    )
);

CREATE INDEX tenant_subscriptions_status_ends_idx
  ON tenant_subscriptions (status, ends_at);

CREATE TABLE tenant_subscription_events (
  event_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  previous_ends_at TIMESTAMPTZ,
  new_ends_at TIMESTAMPTZ NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  subscription_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT tenant_subscription_events_subscription_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenant_subscriptions (tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT tenant_subscription_events_key_valid
    CHECK (event_key ~ '^tenant_subscription_event_v1_[0-9a-f]{64}$'),
  CONSTRAINT tenant_subscription_events_type_valid
    CHECK (
      event_type IN ('created', 'extended', 'status-changed', 'cancelled')
    ),
  CONSTRAINT tenant_subscription_events_status_valid
    CHECK (
      to_status IN (
        'trial',
        'active',
        'payment_failed',
        'suspended',
        'cancelled',
        'expired',
        'blocked'
      )
      AND (
        from_status IS NULL
        OR from_status IN (
          'trial',
          'active',
          'payment_failed',
          'suspended',
          'cancelled',
          'expired',
          'blocked'
        )
      )
    ),
  CONSTRAINT tenant_subscription_events_actor_valid
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT tenant_subscription_events_version_positive
    CHECK (subscription_version >= 1),
  CONSTRAINT tenant_subscription_events_state_consistent
    CHECK (
      (
        event_type = 'created'
        AND from_status IS NULL
        AND to_status IN ('trial', 'active')
        AND previous_ends_at IS NULL
        AND subscription_version = 1
      )
      OR
      (
        event_type = 'extended'
        AND from_status = to_status
        AND previous_ends_at IS NOT NULL
        AND previous_ends_at < new_ends_at
        AND subscription_version >= 2
      )
      OR
      (
        event_type = 'status-changed'
        AND from_status IS NOT NULL
        AND from_status <> to_status
        AND to_status IN ('active', 'suspended', 'blocked')
        AND previous_ends_at = new_ends_at
        AND subscription_version >= 2
      )
      OR
      (
        event_type = 'cancelled'
        AND from_status IS NOT NULL
        AND from_status <> 'cancelled'
        AND to_status = 'cancelled'
        AND previous_ends_at = new_ends_at
        AND subscription_version >= 2
      )
    ),
  CONSTRAINT tenant_subscription_events_timestamps_milliseconds
    CHECK (
      (
        previous_ends_at IS NULL
        OR previous_ends_at = date_trunc('milliseconds', previous_ends_at)
      )
      AND new_ends_at = date_trunc('milliseconds', new_ends_at)
      AND occurred_at = date_trunc('milliseconds', occurred_at)
      AND created_at = date_trunc('milliseconds', created_at)
    ),
  CONSTRAINT tenant_subscription_events_tenant_version_uq
    UNIQUE (tenant_id, subscription_version)
);

CREATE INDEX tenant_subscription_events_tenant_occurred_idx
  ON tenant_subscription_events (tenant_id, occurred_at);

CREATE FUNCTION audit_tenant_subscription_event_insert()
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
    CASE NEW.event_type
      WHEN 'created' THEN 'subscription.created'
      WHEN 'extended' THEN 'subscription.extended'
      WHEN 'status-changed' THEN 'subscription.status_changed'
      WHEN 'cancelled' THEN 'subscription.cancelled'
    END,
    'tenant_subscription',
    NEW.tenant_id::TEXT,
    NEW.event_key,
    NULL,
    NEW.occurred_at
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_subscription_events_insert_audit
AFTER INSERT ON tenant_subscription_events
FOR EACH ROW
EXECUTE FUNCTION audit_tenant_subscription_event_insert();

CREATE FUNCTION reject_tenant_subscription_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Tenant subscription events are immutable';
END;
$$;

CREATE TRIGGER tenant_subscription_events_update_guard
BEFORE UPDATE ON tenant_subscription_events
FOR EACH ROW
EXECUTE FUNCTION reject_tenant_subscription_event_mutation();

CREATE TRIGGER tenant_subscription_events_delete_guard
BEFORE DELETE ON tenant_subscription_events
FOR EACH ROW
EXECUTE FUNCTION reject_tenant_subscription_event_mutation();
