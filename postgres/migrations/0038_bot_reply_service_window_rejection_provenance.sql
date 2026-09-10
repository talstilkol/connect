-- Immutable, payload-free provenance for Meta error 131047 on Bot replies.

CREATE TABLE bot_reply_service_window_rejection_events (
  event_key TEXT PRIMARY KEY,
  delivery_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_error_code INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  service_window_opened_at TIMESTAMPTZ NOT NULL,
  service_window_expires_at TIMESTAMPTZ NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL,
  rejected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_window_rejection_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES bot_reply_deliveries (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_window_rejection_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_window_rejection_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES whatsapp_rate_limit_settlements (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_window_rejection_event_key_sha256
    CHECK (
      event_key ~ '^bot_reply_window_rejection_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_window_rejection_delivery_key_sha256
    CHECK (
      delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_window_rejection_reservation_key_sha256
    CHECK (
      reservation_key ~ '^whatsapp_rate_reservation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_window_rejection_contract_exact
    CHECK (
      claim_version >= 1
      AND provider_error_code = 131047
      AND reason_code = 'META_SERVICE_WINDOW_CLOSED'
      AND service_window_opened_at =
        date_trunc('milliseconds', service_window_opened_at)
      AND service_window_expires_at =
        service_window_opened_at + INTERVAL '24 hours'
      AND attempted_at = date_trunc('milliseconds', attempted_at)
      AND attempted_at >= service_window_opened_at
      AND attempted_at < service_window_expires_at
      AND rejected_at = date_trunc('milliseconds', rejected_at)
      AND rejected_at >= attempted_at
      AND created_at = rejected_at
    )
);

CREATE UNIQUE INDEX bot_reply_window_rejection_delivery_claim_uq
  ON bot_reply_service_window_rejection_events (
    delivery_key,
    claim_version
  );

CREATE UNIQUE INDEX bot_reply_window_rejection_reservation_uq
  ON bot_reply_service_window_rejection_events (reservation_key);

CREATE INDEX bot_reply_window_rejection_tenant_time_idx
  ON bot_reply_service_window_rejection_events (
    tenant_id,
    attempted_at,
    event_key
  );

CREATE FUNCTION enforce_bot_reply_window_rejection_insert()
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
      'Bot reply service-window rejection lacks exact provider provenance';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_window_rejection_insert_guard
BEFORE INSERT ON bot_reply_service_window_rejection_events
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_window_rejection_insert();

CREATE FUNCTION reject_bot_reply_window_rejection_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply service-window rejection evidence is immutable';
END;
$$;

CREATE TRIGGER bot_reply_window_rejection_update_guard
BEFORE UPDATE ON bot_reply_service_window_rejection_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_window_rejection_mutation();

CREATE TRIGGER bot_reply_window_rejection_delete_guard
BEFORE DELETE ON bot_reply_service_window_rejection_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_window_rejection_mutation();

-- Existing 51-54-table receipts remain valid historical evidence.
ALTER TABLE data_migration_bundle_receipts
  DROP CONSTRAINT data_migration_bundle_counts_valid;

ALTER TABLE data_migration_bundle_receipts
  ADD CONSTRAINT data_migration_bundle_counts_valid CHECK (
    slice_count = 10
    AND table_count IN (51, 52, 53, 54, 55)
    AND total_row_count >= 0
  );
