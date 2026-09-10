-- Separate business-initiated quota reservations from service-window replies.
-- Existing rows predate the classification and are business-initiated.

ALTER TABLE whatsapp_rate_limit_reservations
  ADD COLUMN reservation_class TEXT;

UPDATE whatsapp_rate_limit_reservations
SET reservation_class = 'business-initiated'
WHERE reservation_class IS NULL;

ALTER TABLE whatsapp_rate_limit_reservations
  ALTER COLUMN reservation_class SET NOT NULL,
  ADD CONSTRAINT whatsapp_rate_reservations_class_valid
    CHECK (
      reservation_class IN (
        'business-initiated',
        'service-reply'
      )
    ),
  DROP CONSTRAINT whatsapp_rate_reservations_category_valid,
  ADD CONSTRAINT whatsapp_rate_reservations_category_valid
    CHECK (
      (
        reservation_class = 'business-initiated'
        AND (
          template_category IS NULL
          OR template_category IN ('MARKETING', 'UTILITY')
        )
      )
      OR (
        reservation_class = 'service-reply'
        AND template_category IS NULL
      )
    );

CREATE OR REPLACE FUNCTION enforce_whatsapp_reservation_category_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.reservation_class = 'business-initiated'
    AND (
      NEW.template_category IS NULL
      OR NEW.template_category NOT IN ('MARKETING', 'UTILITY')
    )
  ) OR (
    NEW.reservation_class = 'service-reply'
    AND NEW.template_category IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'New WhatsApp reservation has an invalid class/category pair';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_whatsapp_rate_reservation_insert()
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

  IF NEW.reservation_class = 'business-initiated' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('whatsapp-portfolio:' || NEW.portfolio_key, 0)
    );
  END IF;

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
        OR (
          NEW.reservation_class = 'business-initiated'
          AND scope = 'portfolio-recipient'
          AND NEW.template_category = 'MARKETING'
          AND sender_key = ''
          AND recipient_key = NEW.recipient_key
        )
        OR (
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

  IF NEW.reservation_class = 'business-initiated' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project_whatsapp_rate_reservation_state()
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

  IF NEW.reservation_class = 'business-initiated' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project_whatsapp_rate_settlement_state()
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
    AND reservation.reservation_class = 'business-initiated'
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

CREATE FUNCTION enforce_whatsapp_portfolio_state_business_class()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE portfolio_key = NEW.portfolio_key
      AND recipient_key = NEW.recipient_key
      AND reservation_class = 'business-initiated'
  ) THEN
    RAISE EXCEPTION
      'WhatsApp portfolio state requires business-initiated proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_portfolio_state_business_class_guard
BEFORE INSERT OR UPDATE ON whatsapp_portfolio_recipient_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_portfolio_state_business_class();

CREATE FUNCTION enforce_whatsapp_provider_cooldown_reservation_class()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scope = 'portfolio-recipient'
    AND EXISTS (
      SELECT 1
      FROM whatsapp_rate_limit_reservations
      WHERE reservation_key = NEW.reservation_key
        AND reservation_class = 'service-reply'
    )
  THEN
    RAISE EXCEPTION
      'Service replies cannot create portfolio-recipient cooldowns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_provider_cooldown_service_scope_guard
BEFORE INSERT ON whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_provider_cooldown_reservation_class();
