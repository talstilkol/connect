-- Require every Bot reply provider outcome to reference the exact request claim
-- that crossed the Meta POST boundary. Existing immutable outcome rows remain
-- historical only; staging observers must join this request fence before they
-- can publish release evidence.

CREATE OR REPLACE FUNCTION enforce_bot_reply_provider_link_insert()
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
    SELECT 1 FROM bot_reply_delivery_provider_links
    WHERE delivery_key = NEW.delivery_key
      AND tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
      AND reservation_key = NEW.reservation_key
      AND accepted_at = NEW.accepted_at
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM messages
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1 FROM campaign_delivery_provider_links
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1 FROM bot_reply_deliveries
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
      AND delivery_key <> NEW.delivery_key
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to another target';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM bot_reply_deliveries AS delivery
    INNER JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = NEW.reservation_key
     AND reservation.tenant_id = NEW.tenant_id
     AND reservation.reservation_class = 'service-reply'
     AND reservation.reserved_at <= NEW.accepted_at
     AND NEW.accepted_at <= reservation.reservation_expires_at
    INNER JOIN bot_reply_provider_request_claims AS request
      ON request.delivery_key = NEW.delivery_key
     AND request.tenant_id = NEW.tenant_id
     AND request.claim_version = delivery.claim_version
     AND request.reservation_key = NEW.reservation_key
     AND request.requested_at <= NEW.accepted_at
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
    WHERE delivery.delivery_key = NEW.delivery_key
      AND delivery.tenant_id = NEW.tenant_id
      AND delivery.status = 'sending'
      AND settlement.reservation_key IS NULL
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

-- Expose only request-fenced, payload-free service-window facts to staging.
-- Keeping the reservation identity inside this view prevents it from entering
-- release-observation queries or evidence payloads.
CREATE VIEW bot_reply_request_fenced_window_rejections AS
SELECT
  event.event_key,
  event.delivery_key,
  event.tenant_id,
  event.provider_error_code,
  event.reason_code,
  event.attempted_at,
  event.rejected_at
FROM bot_reply_service_window_rejection_events AS event
INNER JOIN bot_reply_provider_request_claims AS request
  ON request.delivery_key = event.delivery_key
 AND request.tenant_id = event.tenant_id
 AND request.claim_version = event.claim_version
 AND request.reservation_key = event.reservation_key
 AND request.requested_at <= event.attempted_at;

CREATE OR REPLACE FUNCTION enforce_bot_reply_provider_deferral_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM bot_reply_deliveries AS delivery
    INNER JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = NEW.reservation_key
     AND reservation.tenant_id = NEW.tenant_id
     AND reservation.reservation_class = 'service-reply'
     AND reservation.reserved_at <= NEW.attempted_at
     AND NEW.attempted_at <= reservation.reservation_expires_at
    INNER JOIN bot_reply_provider_request_claims AS request
      ON request.delivery_key = NEW.delivery_key
     AND request.tenant_id = NEW.tenant_id
     AND request.claim_version = NEW.claim_version
     AND request.reservation_key = NEW.reservation_key
     AND request.requested_at <= NEW.attempted_at
    INNER JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
     AND settlement.outcome = 'provider-failed'
     AND settlement.settled_at = NEW.attempted_at
    INNER JOIN whatsapp_provider_cooldown_events AS cooldown
      ON cooldown.reservation_key = reservation.reservation_key
     AND cooldown.scope = NEW.cooldown_scope
     AND cooldown.provider_error_code = NEW.provider_error_code
     AND cooldown.observed_at = NEW.attempted_at
     AND cooldown.blocked_until = NEW.retry_at
    WHERE delivery.delivery_key = NEW.delivery_key
      AND delivery.tenant_id = NEW.tenant_id
      AND delivery.status = 'pending'
      AND delivery.attempt_count = 0
      AND delivery.claim_version = NEW.claim_version
      AND delivery.next_attempt_at = NEW.retry_at
      AND delivery.deferred_at = NEW.deferred_at
      AND delivery.last_deferral_reason_code = NEW.reason_code
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider deferral lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_bot_reply_window_rejection_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM bot_reply_deliveries AS delivery
    INNER JOIN messages AS inbound
      ON inbound.tenant_id = delivery.tenant_id
     AND inbound.message_key = delivery.inbound_message_key
     AND inbound.direction = 'inbound'
    INNER JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = NEW.reservation_key
     AND reservation.tenant_id = NEW.tenant_id
     AND reservation.reservation_class = 'service-reply'
     AND reservation.reserved_at = NEW.attempted_at
    INNER JOIN bot_reply_provider_request_claims AS request
      ON request.delivery_key = NEW.delivery_key
     AND request.tenant_id = NEW.tenant_id
     AND request.claim_version = NEW.claim_version
     AND request.reservation_key = NEW.reservation_key
     AND request.requested_at <= NEW.attempted_at
    INNER JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
     AND settlement.outcome = 'provider-failed'
     AND settlement.settled_at = NEW.attempted_at
    WHERE delivery.delivery_key = NEW.delivery_key
      AND delivery.tenant_id = NEW.tenant_id
      AND delivery.status = 'rejected'
      AND delivery.claim_version = NEW.claim_version
      AND delivery.last_error_code = NEW.reason_code
      AND delivery.updated_at = NEW.rejected_at
      AND inbound.occurred_at = NEW.service_window_opened_at
      AND inbound.occurred_at + INTERVAL '24 hours' =
        NEW.service_window_expires_at
  ) THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;
