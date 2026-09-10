-- Immutable, payload-free fence for each Meta Bot reply POST attempt.
-- A row is created after service-reply admission and before the provider call.

CREATE TABLE bot_reply_provider_request_claims (
  request_key TEXT PRIMARY KEY,
  delivery_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_provider_requests_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES bot_reply_deliveries (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_requests_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_requests_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_provider_requests_request_key_sha256
    CHECK (
      request_key ~ '^bot_reply_provider_request_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_requests_delivery_key_sha256
    CHECK (
      delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_requests_reservation_key_sha256
    CHECK (
      reservation_key ~ '^whatsapp_rate_reservation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_provider_requests_contract_valid
    CHECK (
      claim_version >= 1
      AND requested_at = date_trunc('milliseconds', requested_at)
      AND created_at = requested_at
    )
);

CREATE UNIQUE INDEX bot_reply_provider_requests_delivery_claim_uq
  ON bot_reply_provider_request_claims (
    delivery_key,
    claim_version
  );

CREATE UNIQUE INDEX bot_reply_provider_requests_reservation_uq
  ON bot_reply_provider_request_claims (reservation_key);

CREATE INDEX bot_reply_provider_requests_tenant_time_idx
  ON bot_reply_provider_request_claims (
    tenant_id,
    requested_at,
    request_key
  );

CREATE FUNCTION enforce_bot_reply_provider_request_insert()
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
     AND reservation.reserved_at = NEW.requested_at
     AND NEW.requested_at <= reservation.reservation_expires_at
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
    WHERE delivery.delivery_key = NEW.delivery_key
      AND delivery.tenant_id = NEW.tenant_id
      AND delivery.status = 'sending'
      AND delivery.attempt_count = 1
      AND delivery.claim_version = NEW.claim_version
      AND delivery.updated_at <= NEW.requested_at
      AND settlement.reservation_key IS NULL
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider request lacks an active delivery and reservation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_provider_requests_insert_guard
BEFORE INSERT ON bot_reply_provider_request_claims
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_provider_request_insert();

CREATE FUNCTION reject_bot_reply_provider_request_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply provider request evidence is immutable';
END;
$$;

CREATE TRIGGER bot_reply_provider_requests_update_guard
BEFORE UPDATE ON bot_reply_provider_request_claims
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_provider_request_mutation();

CREATE TRIGGER bot_reply_provider_requests_delete_guard
BEFORE DELETE ON bot_reply_provider_request_claims
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_provider_request_mutation();
