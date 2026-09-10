-- Provider-bound WhatsApp phone throughput evidence and rolling limiter.
-- This migration intentionally contains no seed or demonstration data.

ALTER TABLE whatsapp_campaign_delivery_policy_events
  ADD COLUMN phone_throughput_messages_per_second INTEGER,
  ADD COLUMN maximum_outbound_messages_per_second INTEGER,
  ADD CONSTRAINT whatsapp_delivery_policy_throughput_valid
    CHECK (
      (
        phone_throughput_messages_per_second IN (20, 80, 1000)
        AND maximum_outbound_messages_per_second >= 1
        AND maximum_outbound_messages_per_second
          < phone_throughput_messages_per_second
      )
      OR (
        delivery_state = 'disabled'
        AND phone_throughput_messages_per_second IS NULL
        AND maximum_outbound_messages_per_second IS NULL
      )
    );

CREATE FUNCTION enforce_whatsapp_delivery_policy_throughput()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  previous_policy whatsapp_campaign_delivery_policy_events%ROWTYPE;
BEGIN
  IF NEW.delivery_state = 'disabled' THEN
    SELECT *
    INTO previous_policy
    FROM whatsapp_campaign_delivery_policy_events
    WHERE tenant_id = NEW.tenant_id
      AND policy_version = NEW.policy_version - 1;

    IF NOT FOUND
      OR previous_policy.phone_throughput_messages_per_second
        IS DISTINCT FROM NEW.phone_throughput_messages_per_second
      OR previous_policy.maximum_outbound_messages_per_second
        IS DISTINCT FROM NEW.maximum_outbound_messages_per_second
    THEN
      RAISE EXCEPTION
        'WhatsApp delivery policy disable throughput transition is invalid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_delivery_policy_events_throughput_guard
BEFORE INSERT ON whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_delivery_policy_throughput();

ALTER TABLE whatsapp_rate_limit_reservations
  ADD COLUMN policy_event_key TEXT,
  ADD COLUMN phone_throughput_messages_per_second INTEGER,
  ADD COLUMN maximum_outbound_messages_per_second INTEGER,
  ADD CONSTRAINT whatsapp_rate_reservations_policy_event_fk
    FOREIGN KEY (policy_event_key)
    REFERENCES whatsapp_campaign_delivery_policy_events (event_key)
    ON DELETE RESTRICT,
  ADD CONSTRAINT whatsapp_rate_reservations_throughput_valid
    CHECK (
      (
        policy_event_key IS NULL
        AND phone_throughput_messages_per_second IS NULL
        AND maximum_outbound_messages_per_second IS NULL
      )
      OR (
        policy_event_key ~
          '^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$'
        AND phone_throughput_messages_per_second IN (20, 80, 1000)
        AND maximum_outbound_messages_per_second >= 1
        AND maximum_outbound_messages_per_second
          < phone_throughput_messages_per_second
      )
    );

CREATE INDEX whatsapp_rate_reservations_sender_reserved_idx
  ON whatsapp_rate_limit_reservations (sender_key, reserved_at);

CREATE FUNCTION enforce_whatsapp_rate_limit_throughput()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recent_outbound_count BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM whatsapp_campaign_delivery_policy_events AS policy
    WHERE policy.event_key = NEW.policy_event_key
      AND policy.tenant_id = NEW.tenant_id
      AND policy.delivery_state = 'enabled'
      AND policy.policy_version = (
        SELECT max(latest.policy_version)
        FROM whatsapp_campaign_delivery_policy_events AS latest
        WHERE latest.tenant_id = NEW.tenant_id
      )
      AND policy.phone_throughput_messages_per_second
        = NEW.phone_throughput_messages_per_second
      AND policy.maximum_outbound_messages_per_second
        = NEW.maximum_outbound_messages_per_second
      AND policy.evidence_checked_at <= NEW.reserved_at
      AND policy.recorded_at <= NEW.reserved_at
      AND NEW.reserved_at < policy.evidence_expires_at
  ) THEN
    RAISE EXCEPTION
      'WhatsApp reservation lacks current throughput evidence';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'whatsapp-throughput:' || NEW.sender_key,
      0
    )
  );

  SELECT count(*)
  INTO recent_outbound_count
  FROM whatsapp_rate_limit_reservations
  WHERE sender_key = NEW.sender_key
    AND reserved_at > NEW.reserved_at - interval '1 second'
    AND reserved_at <= NEW.reserved_at;

  IF recent_outbound_count >=
    NEW.maximum_outbound_messages_per_second
  THEN
    RAISE EXCEPTION
      'WhatsApp phone throughput limit exceeded';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_limit_reservations_throughput_guard
BEFORE INSERT ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_rate_limit_throughput();
