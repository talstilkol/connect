-- Immutable, payload-free provenance for Meta error 131047 on Bot replies.

CREATE TABLE `bot_reply_service_window_rejection_events` (
  `event_key` text PRIMARY KEY NOT NULL,
  `delivery_key` text NOT NULL,
  `tenant_id` integer NOT NULL,
  `claim_version` integer NOT NULL,
  `reservation_key` text NOT NULL,
  `provider_error_code` integer NOT NULL,
  `reason_code` text NOT NULL,
  `service_window_opened_at` text NOT NULL,
  `service_window_expires_at` text NOT NULL,
  `attempted_at` text NOT NULL,
  `rejected_at` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`delivery_key`)
    REFERENCES `bot_reply_deliveries` (`delivery_key`)
    ON DELETE restrict,
  FOREIGN KEY (`tenant_id`)
    REFERENCES `tenants` (`id`)
    ON DELETE restrict,
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_settlements` (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `bot_reply_window_rejection_event_key_sha256`
    CHECK (
      length(`event_key`) = 94
      AND substr(`event_key`, 1, 30) =
        'bot_reply_window_rejection_v1_'
      AND substr(`event_key`, 31) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `bot_reply_window_rejection_delivery_key_sha256`
    CHECK (
      length(`delivery_key`) = 86
      AND substr(`delivery_key`, 1, 22) =
        'bot_reply_delivery_v1_'
      AND substr(`delivery_key`, 23) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `bot_reply_window_rejection_reservation_key_sha256`
    CHECK (
      length(`reservation_key`) = 93
      AND substr(`reservation_key`, 1, 29) =
        'whatsapp_rate_reservation_v1_'
      AND substr(`reservation_key`, 30) NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `bot_reply_window_rejection_contract_exact`
    CHECK (
      `claim_version` >= 1
      AND `provider_error_code` = 131047
      AND `reason_code` = 'META_SERVICE_WINDOW_CLOSED'
      AND length(`service_window_opened_at`) = 24
      AND length(`service_window_expires_at`) = 24
      AND length(`attempted_at`) = 24
      AND length(`rejected_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `service_window_opened_at`,
        '+24 hours'
      ) = `service_window_expires_at`
      AND `attempted_at` >= `service_window_opened_at`
      AND `attempted_at` < `service_window_expires_at`
      AND `rejected_at` >= `attempted_at`
      AND `created_at` = `rejected_at`
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_window_rejection_delivery_claim_uq`
ON `bot_reply_service_window_rejection_events` (
  `delivery_key`,
  `claim_version`
);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_window_rejection_reservation_uq`
ON `bot_reply_service_window_rejection_events` (`reservation_key`);--> statement-breakpoint
CREATE INDEX `bot_reply_window_rejection_tenant_time_idx`
ON `bot_reply_service_window_rejection_events` (
  `tenant_id`,
  `attempted_at`,
  `event_key`
);--> statement-breakpoint
CREATE TRIGGER `bot_reply_window_rejection_insert_guard`
BEFORE INSERT ON `bot_reply_service_window_rejection_events`
WHEN NOT EXISTS (
  SELECT 1
  FROM `bot_reply_deliveries` AS delivery
  INNER JOIN `messages` AS inbound
    ON inbound.`tenant_id` = delivery.`tenant_id`
    AND inbound.`message_key` = delivery.`inbound_message_key`
    AND inbound.`direction` = 'inbound'
  INNER JOIN `whatsapp_rate_limit_reservations` AS reservation
    ON reservation.`reservation_key` = NEW.`reservation_key`
    AND reservation.`tenant_id` = NEW.`tenant_id`
    AND reservation.`reservation_class` = 'service-reply'
    AND reservation.`reserved_at` = NEW.`attempted_at`
  INNER JOIN `whatsapp_rate_limit_settlements` AS settlement
    ON settlement.`reservation_key` = reservation.`reservation_key`
    AND settlement.`outcome` = 'provider-failed'
    AND settlement.`settled_at` = NEW.`attempted_at`
  WHERE delivery.`delivery_key` = NEW.`delivery_key`
    AND delivery.`tenant_id` = NEW.`tenant_id`
    AND delivery.`status` = 'rejected'
    AND delivery.`claim_version` = NEW.`claim_version`
    AND delivery.`last_error_code` = NEW.`reason_code`
    AND delivery.`updated_at` = NEW.`rejected_at`
    AND inbound.`occurred_at` = NEW.`service_window_opened_at`
    AND strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      inbound.`occurred_at`,
      '+24 hours'
    ) = NEW.`service_window_expires_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Bot reply service-window rejection lacks exact provider provenance'
  );
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_window_rejection_update_guard`
BEFORE UPDATE ON `bot_reply_service_window_rejection_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'Bot reply service-window rejection evidence is immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_window_rejection_delete_guard`
BEFORE DELETE ON `bot_reply_service_window_rejection_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'Bot reply service-window rejection evidence is immutable'
  );
END;
