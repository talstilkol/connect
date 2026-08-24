-- Immutable provenance for provider-enforced Bot reply deferrals.
-- This migration intentionally stores no phone numbers, message payloads,
-- credentials, seed rows, or scenario-derived assumptions.

CREATE TABLE bot_reply_provider_deferral_events (
  event_key TEXT PRIMARY KEY,
  delivery_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_error_code INTEGER NOT NULL,
  cooldown_scope TEXT NOT NULL,
  retry_after_seconds INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL,
  deferred_at TIMESTAMPTZ NOT NULL,
  retry_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_provider_deferrals_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES bot_reply_deliveries (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_deferrals_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_deferrals_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_provider_cooldown_events (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_deferrals_event_key_sha256
    CHECK (
      event_key ~ '^bot_reply_provider_deferral_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_deferrals_delivery_key_sha256
    CHECK (
      delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_deferrals_claim_positive
    CHECK (claim_version >= 1),
  CONSTRAINT bot_reply_provider_deferrals_reservation_key_sha256
    CHECK (
      reservation_key ~ '^whatsapp_rate_reservation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_deferrals_scope_code_valid
    CHECK (
      (
        provider_error_code = 130429
        AND cooldown_scope = 'sender'
        AND reason_code = 'META_PHONE_THROUGHPUT_LIMITED'
      )
      OR
      (
        provider_error_code = 131056
        AND cooldown_scope = 'pair'
        AND reason_code = 'META_PAIR_RATE_LIMITED'
      )
    ),
  CONSTRAINT bot_reply_provider_deferrals_retry_valid
    CHECK (
      retry_after_seconds BETWEEN 1 AND 86400
      AND attempted_at = date_trunc('milliseconds', attempted_at)
      AND deferred_at = date_trunc('milliseconds', deferred_at)
      AND retry_at = date_trunc('milliseconds', retry_at)
      AND created_at = deferred_at
      AND deferred_at >= attempted_at
      AND retry_at > deferred_at
      AND retry_at =
        attempted_at + retry_after_seconds * INTERVAL '1 second'
    )
);

CREATE UNIQUE INDEX bot_reply_provider_deferrals_delivery_claim_uq
  ON bot_reply_provider_deferral_events (
    delivery_key,
    claim_version
  );

CREATE UNIQUE INDEX bot_reply_provider_deferrals_reservation_uq
  ON bot_reply_provider_deferral_events (reservation_key);

CREATE INDEX bot_reply_provider_deferrals_tenant_attempt_idx
  ON bot_reply_provider_deferral_events (
    tenant_id,
    attempted_at,
    event_key
  );

CREATE FUNCTION enforce_bot_reply_provider_deferral_insert()
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
      'Bot reply provider deferral lacks exact durable provenance';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_provider_deferrals_insert_guard
BEFORE INSERT ON bot_reply_provider_deferral_events
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_provider_deferral_insert();

CREATE FUNCTION reject_bot_reply_provider_deferral_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply provider deferral evidence is immutable';
END;
$$;

CREATE TRIGGER bot_reply_provider_deferrals_update_guard
BEFORE UPDATE ON bot_reply_provider_deferral_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_provider_deferral_mutation();

CREATE TRIGGER bot_reply_provider_deferrals_delete_guard
BEFORE DELETE ON bot_reply_provider_deferral_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_provider_deferral_mutation();
