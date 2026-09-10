-- Immutable, payload-free provenance for inbound replies to accepted Bot buttons.

CREATE TABLE inbound_button_reply_events (
  message_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  selected_bot_option_key TEXT NOT NULL,
  subject_delivery_key TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT inbound_button_reply_message_fk
    FOREIGN KEY (tenant_id, message_key)
    REFERENCES messages (tenant_id, message_key)
    ON DELETE RESTRICT,
  CONSTRAINT inbound_button_reply_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT inbound_button_reply_delivery_fk
    FOREIGN KEY (tenant_id, subject_delivery_key)
    REFERENCES bot_reply_deliveries (tenant_id, delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT inbound_button_reply_message_key_sha256
    CHECK (message_key ~ '^message_v1_[0-9a-f]{64}$'),
  CONSTRAINT inbound_button_reply_option_key_sha256
    CHECK (selected_bot_option_key ~ '^bot_option_v1_[0-9a-f]{64}$'),
  CONSTRAINT inbound_button_reply_delivery_key_sha256
    CHECK (
      subject_delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT inbound_button_reply_time_canonical
    CHECK (
      occurred_at = date_trunc('milliseconds', occurred_at)
      AND created_at = occurred_at
    ),
  CONSTRAINT inbound_button_reply_tenant_message_uq
    UNIQUE (tenant_id, message_key)
);

CREATE INDEX inbound_button_reply_tenant_subject_time_idx
  ON inbound_button_reply_events (
    tenant_id,
    subject_delivery_key,
    occurred_at,
    message_key
  );

CREATE FUNCTION enforce_inbound_button_reply_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM messages AS inbound
    INNER JOIN bot_reply_deliveries AS delivery
      ON delivery.delivery_key = NEW.subject_delivery_key
     AND delivery.tenant_id = NEW.tenant_id
     AND delivery.conversation_key = inbound.conversation_key
     AND delivery.status = 'accepted'
    INNER JOIN bot_reply_delivery_provider_links AS provider_link
      ON provider_link.delivery_key = delivery.delivery_key
     AND provider_link.tenant_id = delivery.tenant_id
    WHERE inbound.message_key = NEW.message_key
      AND inbound.tenant_id = NEW.tenant_id
      AND inbound.direction = 'inbound'
      AND inbound.status = 'received'
      AND inbound.content_kind = 'interactive'
      AND inbound.occurred_at = NEW.occurred_at
      AND inbound.occurred_at >= provider_link.accepted_at
      AND delivery.reply_json ->> 'kind' = 'buttons'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(delivery.reply_json -> 'options') AS option
        WHERE option ->> 'optionKey' = NEW.selected_bot_option_key
      )
  ) THEN
    RAISE EXCEPTION
      'Inbound button reply lacks exact accepted delivery provenance';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inbound_button_reply_insert_guard
BEFORE INSERT ON inbound_button_reply_events
FOR EACH ROW
EXECUTE FUNCTION enforce_inbound_button_reply_insert();

CREATE FUNCTION reject_inbound_button_reply_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inbound button reply evidence is immutable';
END;
$$;

CREATE TRIGGER inbound_button_reply_update_guard
BEFORE UPDATE ON inbound_button_reply_events
FOR EACH ROW
EXECUTE FUNCTION reject_inbound_button_reply_mutation();

CREATE TRIGGER inbound_button_reply_delete_guard
BEFORE DELETE ON inbound_button_reply_events
FOR EACH ROW
EXECUTE FUNCTION reject_inbound_button_reply_mutation();

-- Existing 51/52/53-table receipts remain valid historical evidence;
-- new full-source bundles also include immutable button-reply provenance.
ALTER TABLE data_migration_bundle_receipts
  DROP CONSTRAINT data_migration_bundle_counts_valid;

ALTER TABLE data_migration_bundle_receipts
  ADD CONSTRAINT data_migration_bundle_counts_valid CHECK (
    slice_count = 10
    AND table_count IN (51, 52, 53, 54)
    AND total_row_count >= 0
  );
