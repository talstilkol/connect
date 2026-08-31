-- Durable, fenced retry state for WhatsApp bot service replies.

ALTER TABLE bot_reply_deliveries
  ADD COLUMN sender_phone_number_id TEXT,
  ADD COLUMN claim_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_attempt_at TIMESTAMPTZ,
  ADD COLUMN deferred_at TIMESTAMPTZ,
  ADD COLUMN last_deferral_reason_code TEXT;

UPDATE bot_reply_deliveries AS delivery
SET
  claim_version = CASE
    WHEN delivery.attempt_count >= 1 THEN 1
    ELSE 0
  END,
  sender_phone_number_id = connection.phone_number_id
FROM meta_connections AS connection
WHERE connection.tenant_id = delivery.tenant_id;

ALTER TABLE bot_reply_deliveries
  ADD CONSTRAINT bot_reply_deliveries_sender_phone_id_valid
    CHECK (
      sender_phone_number_id IS NULL
      OR (
        length(btrim(sender_phone_number_id)) BETWEEN 1 AND 255
        AND sender_phone_number_id = btrim(sender_phone_number_id)
        AND sender_phone_number_id !~ '[[:cntrl:]]'
      )
    ),
  ADD CONSTRAINT bot_reply_deliveries_claim_version_nonnegative
    CHECK (claim_version >= 0),
  ADD CONSTRAINT bot_reply_deliveries_deferral_state_valid
    CHECK (
      (
        next_attempt_at IS NULL
        AND deferred_at IS NULL
        AND last_deferral_reason_code IS NULL
      )
      OR (
        status = 'pending'
        AND attempt_count = 0
        AND claim_version >= 1
        AND next_attempt_at IS NOT NULL
        AND deferred_at IS NOT NULL
        AND next_attempt_at > deferred_at
        AND next_attempt_at = date_trunc('milliseconds', next_attempt_at)
        AND deferred_at = date_trunc('milliseconds', deferred_at)
        AND last_deferral_reason_code ~ '^[A-Z0-9_]{1,100}$'
      )
    );

CREATE INDEX bot_reply_deliveries_due_idx
  ON bot_reply_deliveries (
    status,
    next_attempt_at,
    delivery_key
  );

CREATE FUNCTION enforce_bot_reply_delivery_insert_contract()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sender_phone_number_id IS NULL
    OR length(btrim(NEW.sender_phone_number_id)) NOT BETWEEN 1 AND 255
    OR NEW.sender_phone_number_id <> btrim(NEW.sender_phone_number_id)
    OR NEW.sender_phone_number_id ~ '[[:cntrl:]]'
    OR NEW.next_attempt_at IS NOT NULL
    OR NEW.deferred_at IS NOT NULL
    OR NEW.last_deferral_reason_code IS NOT NULL
    OR (
      NEW.status = 'pending'
      AND NEW.claim_version <> 0
    )
    OR (
      NEW.status <> 'pending'
      AND NEW.claim_version < 1
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'bot reply delivery insert contract is invalid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_deliveries_insert_contract_guard
BEFORE INSERT ON bot_reply_deliveries
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_delivery_insert_contract();

CREATE FUNCTION enforce_bot_reply_delivery_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  service_window_expires_at TIMESTAMPTZ;
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.conversation_key IS DISTINCT FROM OLD.conversation_key
    OR NEW.inbound_message_key IS DISTINCT FROM OLD.inbound_message_key
    OR NEW.bot_flow_key IS DISTINCT FROM OLD.bot_flow_key
    OR NEW.bot_flow_version_key IS DISTINCT FROM OLD.bot_flow_version_key
    OR NEW.reply_index IS DISTINCT FROM OLD.reply_index
    OR NEW.sender_phone_number_id IS DISTINCT FROM OLD.sender_phone_number_id
    OR NEW.recipient_phone_e164 IS DISTINCT FROM OLD.recipient_phone_e164
    OR NEW.reply_json IS DISTINCT FROM OLD.reply_json
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'bot reply delivery identity is immutable';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'sending' THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version + 1
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery claim transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'sending' AND NEW.status = 'pending' THEN
    SELECT occurred_at + INTERVAL '24 hours'
    INTO service_window_expires_at
    FROM messages
    WHERE tenant_id = NEW.tenant_id
      AND message_key = NEW.inbound_message_key
      AND direction = 'inbound';

    IF NEW.attempt_count <> 0
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NULL
      OR NEW.deferred_at IS NULL
      OR NEW.deferred_at <> NEW.updated_at
      OR NEW.next_attempt_at <= NEW.deferred_at
      OR service_window_expires_at IS NULL
      OR NEW.next_attempt_at >= service_window_expires_at
      OR NEW.last_deferral_reason_code IS NULL
      OR NEW.last_deferral_reason_code !~ '^[A-Z0-9_]{1,100}$'
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery deferral transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'sending' AND NEW.status = 'accepted' THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NULL
      OR NEW.accepted_at <> NEW.updated_at
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery acceptance transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'sending'
    AND NEW.status IN ('rejected', 'ambiguous')
  THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery failure transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'bot reply delivery transition is invalid';
END;
$$;

CREATE TRIGGER bot_reply_deliveries_transition_guard
BEFORE UPDATE ON bot_reply_deliveries
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_delivery_transition();
