-- Immutable, payload-free provenance for inbound replies to accepted Bot buttons.

CREATE TABLE `inbound_button_reply_events` (
  `message_key` text PRIMARY KEY NOT NULL,
  `tenant_id` integer NOT NULL,
  `selected_bot_option_key` text NOT NULL,
  `subject_delivery_key` text NOT NULL,
  `occurred_at` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`message_key`)
    REFERENCES `messages` (`message_key`)
    ON DELETE restrict,
  FOREIGN KEY (`tenant_id`)
    REFERENCES `tenants` (`id`)
    ON DELETE restrict,
  FOREIGN KEY (`subject_delivery_key`)
    REFERENCES `bot_reply_deliveries` (`delivery_key`)
    ON DELETE restrict,
  CONSTRAINT `inbound_button_reply_message_key_sha256`
    CHECK (
      length(`message_key`) = 75
      AND substr(`message_key`, 1, 11) = 'message_v1_'
      AND substr(`message_key`, 12) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `inbound_button_reply_option_key_sha256`
    CHECK (
      length(`selected_bot_option_key`) = 78
      AND substr(`selected_bot_option_key`, 1, 14) = 'bot_option_v1_'
      AND substr(`selected_bot_option_key`, 15) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `inbound_button_reply_delivery_key_sha256`
    CHECK (
      length(`subject_delivery_key`) = 86
      AND substr(`subject_delivery_key`, 1, 22) =
        'bot_reply_delivery_v1_'
      AND substr(`subject_delivery_key`, 23) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `inbound_button_reply_time_canonical`
    CHECK (
      length(`occurred_at`) = 24
      AND strftime('%Y-%m-%dT%H:%M:%fZ', `occurred_at`) = `occurred_at`
      AND `created_at` = `occurred_at`
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_button_reply_tenant_message_uq`
ON `inbound_button_reply_events` (`tenant_id`, `message_key`);--> statement-breakpoint
CREATE INDEX `inbound_button_reply_tenant_subject_time_idx`
ON `inbound_button_reply_events` (
  `tenant_id`,
  `subject_delivery_key`,
  `occurred_at`,
  `message_key`
);--> statement-breakpoint
CREATE TRIGGER `inbound_button_reply_insert_guard`
BEFORE INSERT ON `inbound_button_reply_events`
WHEN NOT EXISTS (
  SELECT 1
  FROM `messages` AS inbound
  INNER JOIN `bot_reply_deliveries` AS delivery
    ON delivery.`delivery_key` = NEW.`subject_delivery_key`
    AND delivery.`tenant_id` = NEW.`tenant_id`
    AND delivery.`conversation_key` = inbound.`conversation_key`
    AND delivery.`status` = 'accepted'
  INNER JOIN `bot_reply_delivery_provider_links` AS provider_link
    ON provider_link.`delivery_key` = delivery.`delivery_key`
    AND provider_link.`tenant_id` = delivery.`tenant_id`
  WHERE inbound.`message_key` = NEW.`message_key`
    AND inbound.`tenant_id` = NEW.`tenant_id`
    AND inbound.`direction` = 'inbound'
    AND inbound.`status` = 'received'
    AND inbound.`content_kind` = 'interactive'
    AND inbound.`occurred_at` = NEW.`occurred_at`
    AND inbound.`occurred_at` >= provider_link.`accepted_at`
    AND json_extract(delivery.`reply_json`, '$.kind') = 'buttons'
    AND EXISTS (
      SELECT 1
      FROM json_each(delivery.`reply_json`, '$.options') AS option
      WHERE json_extract(option.value, '$.optionKey') =
        NEW.`selected_bot_option_key`
    )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Inbound button reply lacks exact accepted delivery provenance'
  );
END;--> statement-breakpoint
CREATE TRIGGER `inbound_button_reply_update_guard`
BEFORE UPDATE ON `inbound_button_reply_events`
BEGIN
  SELECT RAISE(ABORT, 'Inbound button reply evidence is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `inbound_button_reply_delete_guard`
BEFORE DELETE ON `inbound_button_reply_events`
BEGIN
  SELECT RAISE(ABORT, 'Inbound button reply evidence is immutable');
END;
