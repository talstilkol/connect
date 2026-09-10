-- PostgreSQL campaign provider acceptance and status evidence.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE campaign_delivery_provider_links (
  delivery_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  provider_message_id TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_status TEXT NOT NULL DEFAULT 'accepted',
  last_status_event_key TEXT,
  last_status_event_at TIMESTAMPTZ,
  terminal_outcome TEXT,
  terminal_settled_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT campaign_delivery_provider_links_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES campaign_recipients (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT campaign_delivery_provider_links_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT campaign_delivery_provider_links_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT campaign_delivery_provider_links_delivery_key_sha256
    CHECK (delivery_key ~ '^campaign_delivery_v1_[0-9a-f]{64}$'),
  CONSTRAINT campaign_delivery_provider_links_message_id_bounded
    CHECK (
      length(provider_message_id) BETWEEN 1 AND 255
      AND provider_message_id = btrim(provider_message_id)
      AND provider_message_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT campaign_delivery_provider_links_reservation_key_sha256
    CHECK (
      reservation_key ~ '^whatsapp_rate_reservation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT campaign_delivery_provider_links_status_valid
    CHECK (
      provider_status IN ('accepted', 'sent', 'delivered', 'read', 'failed')
    ),
  CONSTRAINT campaign_delivery_provider_links_event_consistent
    CHECK (
      (
        provider_status = 'accepted'
        AND last_status_event_key IS NULL
        AND last_status_event_at IS NULL
      )
      OR (
        provider_status <> 'accepted'
        AND last_status_event_key ~ '^[0-9a-f]{64}$'
        AND last_status_event_at =
          date_trunc('milliseconds', last_status_event_at)
      )
    ),
  CONSTRAINT campaign_delivery_provider_links_terminal_consistent
    CHECK (
      (
        provider_status IN ('accepted', 'sent')
        AND terminal_outcome IS NULL
        AND terminal_settled_at IS NULL
      )
      OR (
        provider_status IN ('delivered', 'read')
        AND terminal_outcome = 'delivered'
        AND terminal_settled_at =
          date_trunc('milliseconds', terminal_settled_at)
      )
      OR (
        provider_status = 'failed'
        AND terminal_outcome = 'provider-failed'
        AND terminal_settled_at =
          date_trunc('milliseconds', terminal_settled_at)
      )
    ),
  CONSTRAINT campaign_delivery_provider_links_time_canonical
    CHECK (
      accepted_at = date_trunc('milliseconds', accepted_at)
      AND created_at = accepted_at
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= accepted_at
    )
);

CREATE UNIQUE INDEX campaign_delivery_provider_links_tenant_message_uq
  ON campaign_delivery_provider_links (tenant_id, provider_message_id);

CREATE UNIQUE INDEX campaign_delivery_provider_links_reservation_uq
  ON campaign_delivery_provider_links (reservation_key);

CREATE INDEX campaign_delivery_provider_links_terminal_idx
  ON campaign_delivery_provider_links (
    tenant_id,
    terminal_outcome,
    terminal_settled_at
  );

CREATE FUNCTION enforce_campaign_delivery_provider_link_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'provider-message:' || NEW.tenant_id::text || ':' ||
        NEW.provider_message_id,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM campaign_delivery_provider_links
    WHERE delivery_key = NEW.delivery_key
      AND tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
      AND reservation_key = NEW.reservation_key
      AND accepted_at = NEW.accepted_at
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM messages
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to another target';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM campaign_recipients AS recipient
    INNER JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = NEW.reservation_key
     AND reservation.tenant_id = NEW.tenant_id
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
    WHERE recipient.delivery_key = NEW.delivery_key
      AND recipient.tenant_id = NEW.tenant_id
      AND recipient.status = 'sending'
      AND settlement.reservation_key IS NULL
  ) THEN
    RAISE EXCEPTION 'Campaign delivery provider link lacks active proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_delivery_provider_links_insert_guard
BEFORE INSERT ON campaign_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION enforce_campaign_delivery_provider_link_insert();

CREATE FUNCTION guard_message_campaign_delivery_target()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'provider-message:' || NEW.tenant_id::text || ':' ||
        NEW.provider_message_id,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM campaign_delivery_provider_links
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to a campaign delivery';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_campaign_delivery_target_guard
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION guard_message_campaign_delivery_target();

CREATE FUNCTION project_campaign_delivery_provider_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  changed_rows INTEGER;
BEGIN
  UPDATE campaign_recipients
  SET
    status = 'accepted',
    accepted_at = NEW.accepted_at,
    last_error_code = NULL,
    updated_at = NEW.accepted_at
  WHERE delivery_key = NEW.delivery_key
    AND tenant_id = NEW.tenant_id
    AND status = 'sending';

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Campaign delivery acceptance projection failed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_delivery_provider_links_accept_recipient
AFTER INSERT ON campaign_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION project_campaign_delivery_provider_acceptance();

CREATE FUNCTION guard_campaign_delivery_provider_link_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
    OR NEW.reservation_key IS DISTINCT FROM OLD.reservation_key
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Campaign delivery provider identity is immutable';
  END IF;

  IF OLD.terminal_outcome IS NOT NULL
    AND (
      NEW.terminal_outcome IS DISTINCT FROM OLD.terminal_outcome
      OR NEW.terminal_settled_at IS DISTINCT FROM OLD.terminal_settled_at
    )
  THEN
    RAISE EXCEPTION 'Campaign delivery terminal outcome is immutable';
  END IF;

  IF NEW.last_status_event_key IS NOT DISTINCT FROM OLD.last_status_event_key
    OR NEW.last_status_event_at IS NULL
    OR (
      OLD.last_status_event_at IS NOT NULL
      AND NEW.last_status_event_at < OLD.last_status_event_at
    )
    OR (
      OLD.last_status_event_at IS NOT NULL
      AND NEW.last_status_event_at = OLD.last_status_event_at
      AND (
        CASE NEW.provider_status
          WHEN 'accepted' THEN 0
          WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2
          WHEN 'read' THEN 3
          WHEN 'failed' THEN 4
        END
      ) <= (
        CASE OLD.provider_status
          WHEN 'accepted' THEN 0
          WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2
          WHEN 'read' THEN 3
          WHEN 'failed' THEN 4
        END
      )
    )
    OR NEW.updated_at IS DISTINCT FROM
      greatest(OLD.updated_at, NEW.last_status_event_at)
  THEN
    RAISE EXCEPTION 'Campaign delivery provider status does not advance';
  END IF;

  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    PERFORM 1
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = NEW.reservation_key
        AND (
          outcome IS DISTINCT FROM NEW.terminal_outcome
          OR settled_at IS DISTINCT FROM NEW.terminal_settled_at
        )
    ) THEN
      RAISE EXCEPTION
        'Campaign delivery settlement conflicts with rate-limit evidence';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_delivery_provider_links_update_guard
BEFORE UPDATE ON campaign_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION guard_campaign_delivery_provider_link_update();

CREATE FUNCTION project_campaign_delivery_provider_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE campaign_recipients
  SET
    status = CASE NEW.provider_status
      WHEN 'accepted' THEN 'accepted'
      WHEN 'sent' THEN 'accepted'
      WHEN 'delivered' THEN 'delivered'
      WHEN 'read' THEN 'read'
      WHEN 'failed' THEN 'failed'
    END,
    last_error_code = CASE
      WHEN NEW.provider_status = 'failed' THEN 'META_DELIVERY_FAILED'
      ELSE NULL
    END,
    updated_at = NEW.updated_at
  WHERE delivery_key = NEW.delivery_key
    AND tenant_id = NEW.tenant_id
    AND status IN ('accepted', 'delivered', 'read', 'failed');

  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    INSERT INTO whatsapp_rate_limit_settlements (
      reservation_key,
      outcome,
      settled_at,
      created_at
    ) VALUES (
      NEW.reservation_key,
      NEW.terminal_outcome,
      NEW.terminal_settled_at,
      NEW.terminal_settled_at
    )
    ON CONFLICT (reservation_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_delivery_provider_links_reconcile_recipient
AFTER UPDATE OF
  provider_status,
  last_status_event_key,
  last_status_event_at
ON campaign_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION project_campaign_delivery_provider_status();

CREATE FUNCTION reject_campaign_delivery_provider_link_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Campaign delivery provider links are immutable evidence';
END;
$$;

CREATE TRIGGER campaign_delivery_provider_links_delete_guard
BEFORE DELETE ON campaign_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION reject_campaign_delivery_provider_link_delete();
