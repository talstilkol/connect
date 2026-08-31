-- Immutable Meta acceptance and status evidence for service-window bot replies.

CREATE TABLE `bot_reply_delivery_provider_links` (
  `delivery_key` text PRIMARY KEY NOT NULL,
  `tenant_id` integer NOT NULL,
  `provider_message_id` text NOT NULL,
  `reservation_key` text NOT NULL,
  `provider_status` text DEFAULT 'accepted' NOT NULL,
  `last_status_event_key` text,
  `last_status_event_at` text,
  `terminal_outcome` text,
  `terminal_settled_at` text,
  `accepted_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`delivery_key`)
    REFERENCES `bot_reply_deliveries` (`delivery_key`)
    ON DELETE restrict,
  FOREIGN KEY (`tenant_id`)
    REFERENCES `tenants` (`id`)
    ON DELETE restrict,
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations` (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `bot_reply_provider_links_delivery_key_sha256`
    CHECK (
      length(`delivery_key`) = 86
      AND substr(`delivery_key`, 1, 22) =
        'bot_reply_delivery_v1_'
      AND substr(`delivery_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `bot_reply_provider_links_message_id_bounded`
    CHECK (
      length(`provider_message_id`) BETWEEN 1 AND 255
      AND trim(`provider_message_id`) = `provider_message_id`
    ),
  CONSTRAINT `bot_reply_provider_links_reservation_key_sha256`
    CHECK (
      length(`reservation_key`) = 93
      AND substr(`reservation_key`, 1, 29) =
        'whatsapp_rate_reservation_v1_'
      AND substr(`reservation_key`, 30)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `bot_reply_provider_links_status_valid`
    CHECK (
      `provider_status` IN (
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed'
      )
    ),
  CONSTRAINT `bot_reply_provider_links_event_consistent`
    CHECK (
      (
        `provider_status` = 'accepted'
        AND `last_status_event_key` IS NULL
        AND `last_status_event_at` IS NULL
      )
      OR (
        `provider_status` <> 'accepted'
        AND length(`last_status_event_key`) = 64
        AND `last_status_event_key` NOT GLOB '*[^0-9a-f]*'
        AND length(`last_status_event_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `last_status_event_at`
        ) = `last_status_event_at`
      )
    ),
  CONSTRAINT `bot_reply_provider_links_terminal_consistent`
    CHECK (
      (
        `provider_status` IN ('accepted', 'sent')
        AND `terminal_outcome` IS NULL
        AND `terminal_settled_at` IS NULL
      )
      OR (
        `provider_status` IN ('delivered', 'read')
        AND `terminal_outcome` = 'delivered'
        AND length(`terminal_settled_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `terminal_settled_at`
        ) = `terminal_settled_at`
      )
      OR (
        `provider_status` = 'failed'
        AND `terminal_outcome` = 'provider-failed'
        AND length(`terminal_settled_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `terminal_settled_at`
        ) = `terminal_settled_at`
      )
    ),
  CONSTRAINT `bot_reply_provider_links_time_canonical`
    CHECK (
      length(`accepted_at`) = 24
      AND strftime('%Y-%m-%dT%H:%M:%fZ', `accepted_at`) = `accepted_at`
      AND `created_at` = `accepted_at`
      AND length(`updated_at`) = 24
      AND strftime('%Y-%m-%dT%H:%M:%fZ', `updated_at`) = `updated_at`
      AND `updated_at` >= `accepted_at`
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_provider_links_tenant_message_uq`
ON `bot_reply_delivery_provider_links` (
  `tenant_id`,
  `provider_message_id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_provider_links_reservation_uq`
ON `bot_reply_delivery_provider_links` (`reservation_key`);--> statement-breakpoint
CREATE INDEX `bot_reply_provider_links_terminal_idx`
ON `bot_reply_delivery_provider_links` (
  `tenant_id`,
  `terminal_outcome`,
  `terminal_settled_at`
);--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_insert_proof_guard`
BEFORE INSERT ON `bot_reply_delivery_provider_links`
WHEN NOT EXISTS (
  SELECT 1
  FROM `bot_reply_deliveries` AS delivery
  INNER JOIN `whatsapp_rate_limit_reservations` AS reservation
    ON reservation.`reservation_key` = NEW.`reservation_key`
    AND reservation.`tenant_id` = NEW.`tenant_id`
    AND reservation.`reservation_class` = 'service-reply'
    AND reservation.`reserved_at` <= NEW.`accepted_at`
    AND NEW.`accepted_at` <= reservation.`reservation_expires_at`
  LEFT JOIN `whatsapp_rate_limit_settlements` AS settlement
    ON settlement.`reservation_key` = reservation.`reservation_key`
  WHERE delivery.`delivery_key` = NEW.`delivery_key`
    AND delivery.`tenant_id` = NEW.`tenant_id`
    AND delivery.`status` = 'sending'
    AND settlement.`reservation_key` IS NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM `bot_reply_delivery_provider_links`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` = NEW.`provider_message_id`
    AND `reservation_key` = NEW.`reservation_key`
    AND `accepted_at` = NEW.`accepted_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Bot reply provider link lacks active service-reply proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_target_guard`
BEFORE INSERT ON `bot_reply_delivery_provider_links`
WHEN (
  EXISTS (
    SELECT 1 FROM `messages`
    WHERE `tenant_id` = NEW.`tenant_id`
      AND `provider_message_id` = NEW.`provider_message_id`
  )
  OR EXISTS (
    SELECT 1 FROM `campaign_delivery_provider_links`
    WHERE `tenant_id` = NEW.`tenant_id`
      AND `provider_message_id` = NEW.`provider_message_id`
  )
  OR EXISTS (
    SELECT 1 FROM `bot_reply_deliveries`
    WHERE `tenant_id` = NEW.`tenant_id`
      AND `provider_message_id` = NEW.`provider_message_id`
      AND `delivery_key` IS NOT NEW.`delivery_key`
  )
)
AND NOT EXISTS (
  SELECT 1 FROM `bot_reply_delivery_provider_links`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` = NEW.`provider_message_id`
    AND `reservation_key` = NEW.`reservation_key`
    AND `accepted_at` = NEW.`accepted_at`
)
BEGIN
  SELECT RAISE(ABORT, 'Provider message already belongs to another target');
END;--> statement-breakpoint
CREATE TRIGGER `campaign_provider_links_bot_target_guard`
BEFORE INSERT ON `campaign_delivery_provider_links`
WHEN EXISTS (
  SELECT 1 FROM `bot_reply_delivery_provider_links`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` = NEW.`provider_message_id`
)
BEGIN
  SELECT RAISE(ABORT, 'Provider message already belongs to a bot reply');
END;--> statement-breakpoint
CREATE TRIGGER `messages_bot_reply_target_guard`
BEFORE INSERT ON `messages`
WHEN EXISTS (
  SELECT 1 FROM `bot_reply_delivery_provider_links`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` = NEW.`provider_message_id`
)
BEGIN
  SELECT RAISE(ABORT, 'Provider message already belongs to a bot reply');
END;--> statement-breakpoint
CREATE TRIGGER `messages_bot_reply_target_guard_update`
BEFORE UPDATE OF `tenant_id`, `provider_message_id` ON `messages`
WHEN EXISTS (
  SELECT 1 FROM `bot_reply_delivery_provider_links`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` = NEW.`provider_message_id`
)
BEGIN
  SELECT RAISE(ABORT, 'Provider message already belongs to a bot reply');
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_accept_delivery`
AFTER INSERT ON `bot_reply_delivery_provider_links`
BEGIN
  UPDATE `bot_reply_deliveries`
  SET
    `status` = 'accepted',
    `provider_message_id` = NEW.`provider_message_id`,
    `accepted_at` = NEW.`accepted_at`,
    `updated_at` = NEW.`accepted_at`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` = 'sending';
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_identity_guard`
BEFORE UPDATE ON `bot_reply_delivery_provider_links`
WHEN NEW.`delivery_key` IS NOT OLD.`delivery_key`
  OR NEW.`tenant_id` IS NOT OLD.`tenant_id`
  OR NEW.`provider_message_id` IS NOT OLD.`provider_message_id`
  OR NEW.`reservation_key` IS NOT OLD.`reservation_key`
  OR NEW.`accepted_at` IS NOT OLD.`accepted_at`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(ABORT, 'Bot reply provider identity is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_status_guard`
BEFORE UPDATE ON `bot_reply_delivery_provider_links`
WHEN OLD.`terminal_outcome` IS NOT NULL
  AND (
    NEW.`terminal_outcome` IS NOT OLD.`terminal_outcome`
    OR NEW.`terminal_settled_at` IS NOT OLD.`terminal_settled_at`
  )
  OR NEW.`last_status_event_key` IS OLD.`last_status_event_key`
  OR NEW.`last_status_event_at` IS NULL
  OR NEW.`last_status_event_at` < NEW.`accepted_at`
  OR (
    OLD.`last_status_event_at` IS NOT NULL
    AND NEW.`last_status_event_at` < OLD.`last_status_event_at`
  )
  OR (
    OLD.`last_status_event_at` = NEW.`last_status_event_at`
    AND (
      CASE NEW.`provider_status`
        WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
        WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
      END
    ) <= (
      CASE OLD.`provider_status`
        WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
        WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
      END
    )
  )
  OR NEW.`updated_at` IS NOT max(OLD.`updated_at`, NEW.`last_status_event_at`)
BEGIN
  SELECT RAISE(ABORT, 'Bot reply provider status does not advance');
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_settlement_conflict_guard`
BEFORE UPDATE ON `bot_reply_delivery_provider_links`
WHEN OLD.`terminal_outcome` IS NULL
  AND NEW.`terminal_outcome` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM `whatsapp_rate_limit_settlements`
    WHERE `reservation_key` = NEW.`reservation_key`
      AND (
        `outcome` IS NOT NEW.`terminal_outcome`
        OR `settled_at` IS NOT NEW.`terminal_settled_at`
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Bot reply settlement conflicts with rate-limit evidence');
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_settle_rate_limit`
AFTER UPDATE ON `bot_reply_delivery_provider_links`
WHEN OLD.`terminal_outcome` IS NULL
  AND NEW.`terminal_outcome` IS NOT NULL
BEGIN
  INSERT INTO `whatsapp_rate_limit_settlements` (
    `reservation_key`, `outcome`, `settled_at`, `created_at`
  ) VALUES (
    NEW.`reservation_key`,
    NEW.`terminal_outcome`,
    NEW.`terminal_settled_at`,
    NEW.`terminal_settled_at`
  )
  ON CONFLICT (`reservation_key`) DO NOTHING;
END;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_delete_guard`
BEFORE DELETE ON `bot_reply_delivery_provider_links`
BEGIN
  SELECT RAISE(ABORT, 'Bot reply provider links are immutable evidence');
END;
