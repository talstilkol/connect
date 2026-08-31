-- Durable WhatsApp reservation, settlement, and provider-cooldown evidence.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE whatsapp_rate_limit_reservations (
  reservation_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  portfolio_key TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  template_category TEXT NOT NULL,
  portfolio_limit_kind TEXT NOT NULL,
  portfolio_limit_value INTEGER,
  reserved_at TIMESTAMPTZ NOT NULL,
  pair_reserved_until TIMESTAMPTZ NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT whatsapp_rate_reservations_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_rate_reservations_key_sha256
    CHECK (
      reservation_key ~ '^whatsapp_rate_reservation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT whatsapp_rate_reservations_portfolio_key_sha256
    CHECK (portfolio_key ~ '^whatsapp_portfolio_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_rate_reservations_sender_key_sha256
    CHECK (sender_key ~ '^whatsapp_sender_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_rate_reservations_recipient_key_sha256
    CHECK (recipient_key ~ '^whatsapp_recipient_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_rate_reservations_category_valid
    CHECK (template_category IN ('MARKETING', 'UTILITY')),
  CONSTRAINT whatsapp_rate_reservations_limit_valid
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
  CONSTRAINT whatsapp_rate_reservations_time_valid
    CHECK (
      reserved_at = date_trunc('milliseconds', reserved_at)
      AND pair_reserved_until =
        date_trunc('milliseconds', pair_reserved_until)
      AND reservation_expires_at =
        date_trunc('milliseconds', reservation_expires_at)
      AND created_at = date_trunc('milliseconds', created_at)
      AND pair_reserved_until = reserved_at + INTERVAL '6 seconds'
      AND reservation_expires_at >= pair_reserved_until
      AND reservation_expires_at <= reserved_at + INTERVAL '24 hours'
      AND created_at = reserved_at
    )
);

CREATE INDEX whatsapp_rate_reservations_tenant_reserved_idx
  ON whatsapp_rate_limit_reservations (tenant_id, reserved_at);

CREATE TABLE whatsapp_pair_rate_limit_state (
  sender_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  reserved_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (sender_key, recipient_key),
  CONSTRAINT whatsapp_pair_state_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_pair_state_sender_key_sha256
    CHECK (sender_key ~ '^whatsapp_sender_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_pair_state_recipient_key_sha256
    CHECK (recipient_key ~ '^whatsapp_recipient_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_pair_state_time_valid
    CHECK (
      reserved_until = date_trunc('milliseconds', reserved_until)
      AND updated_at = date_trunc('milliseconds', updated_at)
    )
);

CREATE INDEX whatsapp_pair_state_expiry_idx
  ON whatsapp_pair_rate_limit_state (reserved_until);

CREATE TABLE whatsapp_portfolio_recipient_rate_limit_state (
  portfolio_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  active_reservation_key TEXT,
  active_reservation_expires_at TIMESTAMPTZ,
  last_delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (portfolio_key, recipient_key),
  CONSTRAINT whatsapp_portfolio_state_reservation_fk
    FOREIGN KEY (active_reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_portfolio_state_portfolio_key_sha256
    CHECK (portfolio_key ~ '^whatsapp_portfolio_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_portfolio_state_recipient_key_sha256
    CHECK (recipient_key ~ '^whatsapp_recipient_v1_[0-9a-f]{64}$'),
  CONSTRAINT whatsapp_portfolio_state_active_consistent
    CHECK (
      (
        active_reservation_key IS NULL
        AND active_reservation_expires_at IS NULL
      )
      OR
      (
        active_reservation_key IS NOT NULL
        AND active_reservation_expires_at IS NOT NULL
        AND active_reservation_expires_at =
          date_trunc('milliseconds', active_reservation_expires_at)
      )
    ),
  CONSTRAINT whatsapp_portfolio_state_time_valid
    CHECK (
      (
        last_delivered_at IS NULL
        OR last_delivered_at = date_trunc('milliseconds', last_delivered_at)
      )
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND (
        last_delivered_at IS NULL
        OR updated_at >= last_delivered_at
      )
    )
);

CREATE INDEX whatsapp_portfolio_state_capacity_idx
  ON whatsapp_portfolio_recipient_rate_limit_state (
    portfolio_key,
    last_delivered_at,
    active_reservation_expires_at
  );

CREATE TABLE whatsapp_rate_limit_settlements (
  reservation_key TEXT PRIMARY KEY,
  outcome TEXT NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT whatsapp_rate_settlements_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_rate_settlements_outcome_valid
    CHECK (
      outcome IN (
        'delivered',
        'provider-failed',
        'cancelled-before-submit'
      )
    ),
  CONSTRAINT whatsapp_rate_settlements_time_valid
    CHECK (
      settled_at = date_trunc('milliseconds', settled_at)
      AND created_at = settled_at
    )
);

CREATE TABLE whatsapp_provider_cooldown_events (
  reservation_key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  provider_error_code INTEGER NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT whatsapp_provider_cooldown_events_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_provider_cooldown_events_scope_code_valid
    CHECK (
      (scope = 'sender' AND provider_error_code = 130429)
      OR
      (scope = 'portfolio-recipient' AND provider_error_code = 131049)
      OR
      (scope = 'pair' AND provider_error_code = 131056)
    ),
  CONSTRAINT whatsapp_provider_cooldown_events_time_valid
    CHECK (
      observed_at = date_trunc('milliseconds', observed_at)
      AND blocked_until = date_trunc('milliseconds', blocked_until)
      AND created_at = observed_at
      AND blocked_until > observed_at
      AND blocked_until <= observed_at + INTERVAL '24 hours'
      AND (
        provider_error_code <> 131049
        OR blocked_until = observed_at + INTERVAL '24 hours'
      )
    )
);

CREATE INDEX whatsapp_provider_cooldown_events_expiry_idx
  ON whatsapp_provider_cooldown_events (blocked_until);

CREATE TABLE whatsapp_provider_cooldown_state (
  scope TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_error_code INTEGER NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, sender_key, recipient_key),
  CONSTRAINT whatsapp_provider_cooldown_state_event_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_provider_cooldown_events (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT whatsapp_provider_cooldown_state_subject_valid
    CHECK (
      (
        scope = 'sender'
        AND sender_key ~ '^whatsapp_sender_v1_[0-9a-f]{64}$'
        AND recipient_key = ''
        AND provider_error_code = 130429
      )
      OR
      (
        scope = 'portfolio-recipient'
        AND sender_key = ''
        AND recipient_key ~ '^whatsapp_recipient_v1_[0-9a-f]{64}$'
        AND provider_error_code = 131049
      )
      OR
      (
        scope = 'pair'
        AND sender_key ~ '^whatsapp_sender_v1_[0-9a-f]{64}$'
        AND recipient_key ~ '^whatsapp_recipient_v1_[0-9a-f]{64}$'
        AND provider_error_code = 131056
      )
    ),
  CONSTRAINT whatsapp_provider_cooldown_state_time_valid
    CHECK (
      blocked_until = date_trunc('milliseconds', blocked_until)
      AND updated_at = date_trunc('milliseconds', updated_at)
    )
);

CREATE INDEX whatsapp_provider_cooldown_state_expiry_idx
  ON whatsapp_provider_cooldown_state (blocked_until);

CREATE FUNCTION enforce_whatsapp_rate_reservation_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  occupied_unique_recipients BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'whatsapp-pair:' || NEW.sender_key || ':' || NEW.recipient_key,
      0
    )
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended('whatsapp-portfolio:' || NEW.portfolio_key, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM whatsapp_provider_cooldown_state
    WHERE blocked_until > NEW.reserved_at
      AND (
        (
          scope = 'sender'
          AND sender_key = NEW.sender_key
          AND recipient_key = ''
        )
        OR
        (
          scope = 'portfolio-recipient'
          AND NEW.template_category = 'MARKETING'
          AND sender_key = ''
          AND recipient_key = NEW.recipient_key
        )
        OR
        (
          scope = 'pair'
          AND sender_key = NEW.sender_key
          AND recipient_key = NEW.recipient_key
        )
      )
  ) THEN
    RAISE EXCEPTION 'WhatsApp reservation blocked by provider cooldown';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM whatsapp_pair_rate_limit_state
    WHERE sender_key = NEW.sender_key
      AND recipient_key = NEW.recipient_key
      AND reserved_until > NEW.reserved_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp reservation blocked by pair limit';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM whatsapp_portfolio_recipient_rate_limit_state
    WHERE portfolio_key = NEW.portfolio_key
      AND recipient_key = NEW.recipient_key
      AND active_reservation_key IS NOT NULL
      AND active_reservation_expires_at > NEW.reserved_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp recipient already has an active reservation';
  END IF;

  IF NEW.portfolio_limit_kind = 'bounded'
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_portfolio_recipient_rate_limit_state
      WHERE portfolio_key = NEW.portfolio_key
        AND recipient_key = NEW.recipient_key
        AND last_delivered_at >= NEW.reserved_at - INTERVAL '24 hours'
    )
  THEN
    SELECT count(*)
    INTO occupied_unique_recipients
    FROM whatsapp_portfolio_recipient_rate_limit_state
    WHERE portfolio_key = NEW.portfolio_key
      AND (
        last_delivered_at >= NEW.reserved_at - INTERVAL '24 hours'
        OR (
          active_reservation_key IS NOT NULL
          AND active_reservation_expires_at > NEW.reserved_at
        )
      );

    IF occupied_unique_recipients >= NEW.portfolio_limit_value THEN
      RAISE EXCEPTION 'WhatsApp portfolio recipient limit reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_reservations_insert_guard
BEFORE INSERT ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_rate_reservation_insert();

CREATE FUNCTION project_whatsapp_rate_reservation_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_pair_rate_limit_state (
    sender_key,
    recipient_key,
    reservation_key,
    reserved_until,
    updated_at
  ) VALUES (
    NEW.sender_key,
    NEW.recipient_key,
    NEW.reservation_key,
    NEW.pair_reserved_until,
    NEW.reserved_at
  )
  ON CONFLICT (sender_key, recipient_key) DO UPDATE SET
    reservation_key = EXCLUDED.reservation_key,
    reserved_until = EXCLUDED.reserved_until,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO whatsapp_portfolio_recipient_rate_limit_state (
    portfolio_key,
    recipient_key,
    active_reservation_key,
    active_reservation_expires_at,
    last_delivered_at,
    updated_at
  ) VALUES (
    NEW.portfolio_key,
    NEW.recipient_key,
    NEW.reservation_key,
    NEW.reservation_expires_at,
    NULL,
    NEW.reserved_at
  )
  ON CONFLICT (portfolio_key, recipient_key) DO UPDATE SET
    active_reservation_key = EXCLUDED.active_reservation_key,
    active_reservation_expires_at =
      EXCLUDED.active_reservation_expires_at,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_reservations_state_projection
AFTER INSERT ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION project_whatsapp_rate_reservation_state();

CREATE FUNCTION enforce_whatsapp_rate_settlement_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
      AND reserved_at <= NEW.settled_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp settlement lacks valid reservation proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_settlements_insert_guard
BEFORE INSERT ON whatsapp_rate_limit_settlements
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_rate_settlement_insert();

CREATE FUNCTION project_whatsapp_rate_settlement_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE whatsapp_portfolio_recipient_rate_limit_state AS state
  SET
    active_reservation_key = CASE
      WHEN state.active_reservation_key = NEW.reservation_key THEN NULL
      ELSE state.active_reservation_key
    END,
    active_reservation_expires_at = CASE
      WHEN state.active_reservation_key = NEW.reservation_key THEN NULL
      ELSE state.active_reservation_expires_at
    END,
    last_delivered_at = CASE
      WHEN NEW.outcome = 'delivered'
        AND (
          state.last_delivered_at IS NULL
          OR state.last_delivered_at < NEW.settled_at
        )
      THEN NEW.settled_at
      ELSE state.last_delivered_at
    END,
    updated_at = greatest(state.updated_at, NEW.settled_at)
  FROM whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND state.portfolio_key = reservation.portfolio_key
    AND state.recipient_key = reservation.recipient_key;

  UPDATE whatsapp_pair_rate_limit_state AS state
  SET
    reserved_until = CASE
      WHEN NEW.outcome = 'cancelled-before-submit'
        AND state.reservation_key = NEW.reservation_key
        AND NEW.settled_at < state.reserved_until
      THEN NEW.settled_at
      ELSE state.reserved_until
    END,
    updated_at = greatest(state.updated_at, NEW.settled_at)
  FROM whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND state.sender_key = reservation.sender_key
    AND state.recipient_key = reservation.recipient_key;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_settlements_state_projection
AFTER INSERT ON whatsapp_rate_limit_settlements
FOR EACH ROW
EXECUTE FUNCTION project_whatsapp_rate_settlement_state();

CREATE FUNCTION enforce_whatsapp_provider_cooldown_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations AS reservation
    INNER JOIN whatsapp_rate_limit_settlements AS settlement
      USING (reservation_key)
    WHERE reservation.reservation_key = NEW.reservation_key
      AND reservation.reserved_at <= NEW.observed_at
      AND settlement.outcome = 'provider-failed'
      AND settlement.settled_at = NEW.observed_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown lacks rejection proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_provider_cooldown_events_insert_guard
BEFORE INSERT ON whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_provider_cooldown_insert();

CREATE FUNCTION project_whatsapp_provider_cooldown_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_provider_cooldown_state (
    scope,
    sender_key,
    recipient_key,
    reservation_key,
    provider_error_code,
    blocked_until,
    updated_at
  )
  SELECT
    NEW.scope,
    CASE
      WHEN NEW.scope IN ('sender', 'pair') THEN reservation.sender_key
      ELSE ''
    END,
    CASE
      WHEN NEW.scope IN ('portfolio-recipient', 'pair')
      THEN reservation.recipient_key
      ELSE ''
    END,
    NEW.reservation_key,
    NEW.provider_error_code,
    NEW.blocked_until,
    NEW.observed_at
  FROM whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
  ON CONFLICT (scope, sender_key, recipient_key) DO UPDATE SET
    reservation_key = EXCLUDED.reservation_key,
    provider_error_code = EXCLUDED.provider_error_code,
    blocked_until = EXCLUDED.blocked_until,
    updated_at = EXCLUDED.updated_at
  WHERE EXCLUDED.blocked_until >
    whatsapp_provider_cooldown_state.blocked_until;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_provider_cooldown_events_state_projection
AFTER INSERT ON whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION project_whatsapp_provider_cooldown_state();

CREATE FUNCTION enforce_whatsapp_pair_state_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
      AND sender_key = NEW.sender_key
      AND recipient_key = NEW.recipient_key
      AND reserved_at <= NEW.updated_at
      AND reserved_at <= NEW.reserved_until
      AND pair_reserved_until >= NEW.reserved_until
  ) THEN
    RAISE EXCEPTION 'WhatsApp pair state lacks reservation proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.reserved_until < OLD.reserved_until
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = OLD.reservation_key
        AND outcome = 'cancelled-before-submit'
        AND settled_at = NEW.reserved_until
    )
  THEN
    RAISE EXCEPTION 'WhatsApp pair release lacks cancellation proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_pair_state_write_guard
BEFORE INSERT OR UPDATE ON whatsapp_pair_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_pair_state_write();

CREATE FUNCTION enforce_whatsapp_portfolio_state_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE portfolio_key = NEW.portfolio_key
      AND recipient_key = NEW.recipient_key
  ) THEN
    RAISE EXCEPTION 'WhatsApp portfolio state lacks reservation proof';
  END IF;

  IF NEW.active_reservation_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_reservations
      WHERE reservation_key = NEW.active_reservation_key
        AND portfolio_key = NEW.portfolio_key
        AND recipient_key = NEW.recipient_key
        AND reservation_expires_at = NEW.active_reservation_expires_at
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio active state lacks proof';
  END IF;

  IF NEW.last_delivered_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_settlements AS settlement
      INNER JOIN whatsapp_rate_limit_reservations AS reservation
        USING (reservation_key)
      WHERE reservation.portfolio_key = NEW.portfolio_key
        AND reservation.recipient_key = NEW.recipient_key
        AND settlement.outcome = 'delivered'
        AND settlement.settled_at = NEW.last_delivered_at
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio delivery state lacks proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.active_reservation_key IS NOT NULL
    AND NEW.active_reservation_key IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = OLD.active_reservation_key
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio release lacks settlement proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_portfolio_state_write_guard
BEFORE INSERT OR UPDATE ON whatsapp_portfolio_recipient_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_portfolio_state_write();

CREATE FUNCTION enforce_whatsapp_provider_cooldown_state_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_provider_cooldown_events AS event
    INNER JOIN whatsapp_rate_limit_reservations AS reservation
      USING (reservation_key)
    WHERE event.reservation_key = NEW.reservation_key
      AND event.scope = NEW.scope
      AND event.provider_error_code = NEW.provider_error_code
      AND event.blocked_until = NEW.blocked_until
      AND event.observed_at = NEW.updated_at
      AND (
        (
          NEW.scope = 'sender'
          AND reservation.sender_key = NEW.sender_key
          AND NEW.recipient_key = ''
        )
        OR
        (
          NEW.scope = 'portfolio-recipient'
          AND NEW.sender_key = ''
          AND reservation.recipient_key = NEW.recipient_key
        )
        OR
        (
          NEW.scope = 'pair'
          AND reservation.sender_key = NEW.sender_key
          AND reservation.recipient_key = NEW.recipient_key
        )
      )
  ) THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown state lacks event proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.blocked_until < OLD.blocked_until
  THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown cannot be shortened';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_provider_cooldown_state_write_guard
BEFORE INSERT OR UPDATE ON whatsapp_provider_cooldown_state
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_provider_cooldown_state_write();

CREATE FUNCTION reject_whatsapp_rate_limit_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp rate-limit evidence is immutable';
END;
$$;

CREATE TRIGGER whatsapp_rate_reservations_update_guard
BEFORE UPDATE ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_rate_reservations_delete_guard
BEFORE DELETE ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_rate_settlements_update_guard
BEFORE UPDATE ON whatsapp_rate_limit_settlements
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_rate_settlements_delete_guard
BEFORE DELETE ON whatsapp_rate_limit_settlements
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_provider_cooldown_events_update_guard
BEFORE UPDATE ON whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_provider_cooldown_events_delete_guard
BEFORE DELETE ON whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_evidence_mutation();

CREATE FUNCTION reject_whatsapp_rate_limit_state_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp rate-limit state cannot be deleted';
END;
$$;

CREATE TRIGGER whatsapp_pair_state_delete_guard
BEFORE DELETE ON whatsapp_pair_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_state_delete();

CREATE TRIGGER whatsapp_portfolio_state_delete_guard
BEFORE DELETE ON whatsapp_portfolio_recipient_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_state_delete();

CREATE TRIGGER whatsapp_provider_cooldown_state_delete_guard
BEFORE DELETE ON whatsapp_provider_cooldown_state
FOR EACH ROW
EXECUTE FUNCTION reject_whatsapp_rate_limit_state_delete();
