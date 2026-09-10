CREATE TABLE `campaign_delivery_provider_links` (
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
    REFERENCES `campaign_recipients` (`delivery_key`)
    ON DELETE restrict,
  FOREIGN KEY (`tenant_id`)
    REFERENCES `tenants` (`id`)
    ON DELETE restrict,
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `campaign_delivery_provider_links_delivery_key_sha256`
    CHECK (
      length(`delivery_key`) = 85
      AND substr(`delivery_key`, 1, 21) =
        'campaign_delivery_v1_'
      AND substr(`delivery_key`, 22)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `campaign_delivery_provider_links_message_id_bounded`
    CHECK (
      length(`provider_message_id`) BETWEEN 1 AND 255
      AND trim(`provider_message_id`) =
        `provider_message_id`
    ),
  CONSTRAINT `campaign_delivery_provider_links_reservation_key_sha256`
    CHECK (
      length(`reservation_key`) = 93
      AND substr(`reservation_key`, 1, 29) =
        'whatsapp_rate_reservation_v1_'
      AND substr(`reservation_key`, 30)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `campaign_delivery_provider_links_status_valid`
    CHECK (
      `provider_status` IN (
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed'
      )
    ),
  CONSTRAINT `campaign_delivery_provider_links_event_consistent`
    CHECK (
      (
        `last_status_event_key` IS NULL
        AND `last_status_event_at` IS NULL
      )
      OR (
        length(`last_status_event_key`) = 64
        AND `last_status_event_key`
          NOT GLOB '*[^0-9a-f]*'
        AND length(`last_status_event_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `last_status_event_at`
        ) = `last_status_event_at`
      )
    ),
  CONSTRAINT `campaign_delivery_provider_links_terminal_consistent`
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
  CONSTRAINT `campaign_delivery_provider_links_time_canonical`
    CHECK (
      length(`accepted_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `accepted_at`
      ) = `accepted_at`
      AND `created_at` = `accepted_at`
      AND length(`updated_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `updated_at`
      ) = `updated_at`
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX
  `campaign_delivery_provider_links_tenant_message_uq`
ON `campaign_delivery_provider_links` (
  `tenant_id`,
  `provider_message_id`
);--> statement-breakpoint
CREATE UNIQUE INDEX
  `campaign_delivery_provider_links_reservation_uq`
ON `campaign_delivery_provider_links` (
  `reservation_key`
);--> statement-breakpoint
CREATE INDEX
  `campaign_delivery_provider_links_terminal_idx`
ON `campaign_delivery_provider_links` (
  `tenant_id`,
  `terminal_outcome`,
  `terminal_settled_at`
);--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_message_target_guard`
BEFORE INSERT ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `messages`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` =
      NEW.`provider_message_id`
)
AND NOT EXISTS (
  SELECT 1
  FROM `campaign_delivery_provider_links`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` =
      NEW.`provider_message_id`
    AND `reservation_key` = NEW.`reservation_key`
    AND `accepted_at` = NEW.`accepted_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Provider message already belongs to another target'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `messages_campaign_delivery_target_guard`
BEFORE INSERT ON `messages`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `campaign_delivery_provider_links`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` =
      NEW.`provider_message_id`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Provider message already belongs to a campaign delivery'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_insert_proof_guard`
BEFORE INSERT ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `campaign_recipients`
  INNER JOIN `whatsapp_rate_limit_reservations`
    ON `whatsapp_rate_limit_reservations`.`reservation_key` =
      NEW.`reservation_key`
    AND `whatsapp_rate_limit_reservations`.`tenant_id` =
      NEW.`tenant_id`
  LEFT JOIN `whatsapp_rate_limit_settlements`
    ON `whatsapp_rate_limit_settlements`.`reservation_key` =
      NEW.`reservation_key`
  WHERE `campaign_recipients`.`delivery_key` =
      NEW.`delivery_key`
    AND `campaign_recipients`.`tenant_id` =
      NEW.`tenant_id`
    AND `campaign_recipients`.`status` = 'sending'
    AND `whatsapp_rate_limit_settlements`.`reservation_key`
      IS NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM `campaign_delivery_provider_links`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `provider_message_id` =
      NEW.`provider_message_id`
    AND `reservation_key` = NEW.`reservation_key`
    AND `accepted_at` = NEW.`accepted_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Campaign delivery provider link lacks active proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_accept_recipient`
AFTER INSERT ON `campaign_delivery_provider_links`
FOR EACH ROW
BEGIN
  UPDATE `campaign_recipients`
  SET
    `status` = 'accepted',
    `accepted_at` = NEW.`accepted_at`,
    `last_error_code` = NULL,
    `updated_at` = NEW.`accepted_at`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` = 'sending';
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_reconcile_recipient`
AFTER UPDATE OF
  `provider_status`,
  `last_status_event_key`,
  `last_status_event_at`
ON `campaign_delivery_provider_links`
FOR EACH ROW
BEGIN
  UPDATE `campaign_recipients`
  SET
    `status` = CASE NEW.`provider_status`
      WHEN 'accepted' THEN 'accepted'
      WHEN 'sent' THEN 'accepted'
      WHEN 'delivered' THEN 'delivered'
      WHEN 'read' THEN 'read'
      WHEN 'failed' THEN 'failed'
    END,
    `last_error_code` = CASE
      WHEN NEW.`provider_status` = 'failed'
      THEN 'META_DELIVERY_FAILED'
      ELSE NULL
    END,
    `updated_at` = NEW.`updated_at`
  WHERE `delivery_key` = NEW.`delivery_key`
    AND `tenant_id` = NEW.`tenant_id`
    AND `status` IN (
      'accepted',
      'delivered',
      'read',
      'failed'
    );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_identity_guard`
BEFORE UPDATE ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN
  NEW.`delivery_key` IS NOT OLD.`delivery_key`
  OR NEW.`tenant_id` IS NOT OLD.`tenant_id`
  OR NEW.`provider_message_id` IS NOT
    OLD.`provider_message_id`
  OR NEW.`reservation_key` IS NOT
    OLD.`reservation_key`
  OR NEW.`accepted_at` IS NOT OLD.`accepted_at`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(
    ABORT,
    'Campaign delivery provider identity is immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_terminal_guard`
BEFORE UPDATE ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN
  OLD.`terminal_outcome` IS NOT NULL
  AND (
    NEW.`terminal_outcome` IS NOT
      OLD.`terminal_outcome`
    OR NEW.`terminal_settled_at` IS NOT
      OLD.`terminal_settled_at`
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'Campaign delivery terminal outcome is immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_settlement_conflict_guard`
BEFORE UPDATE ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN
  OLD.`terminal_outcome` IS NULL
  AND NEW.`terminal_outcome` IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_settlements`
    WHERE `reservation_key` = NEW.`reservation_key`
      AND (
        `outcome` IS NOT NEW.`terminal_outcome`
        OR `settled_at` IS NOT
          NEW.`terminal_settled_at`
      )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'Campaign delivery settlement conflicts with rate-limit evidence'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_settle_rate_limit`
AFTER UPDATE ON `campaign_delivery_provider_links`
FOR EACH ROW
WHEN
  OLD.`terminal_outcome` IS NULL
  AND NEW.`terminal_outcome` IS NOT NULL
BEGIN
  INSERT INTO `whatsapp_rate_limit_settlements` (
    `reservation_key`,
    `outcome`,
    `settled_at`,
    `created_at`
  ) VALUES (
    NEW.`reservation_key`,
    NEW.`terminal_outcome`,
    NEW.`terminal_settled_at`,
    NEW.`terminal_settled_at`
  )
  ON CONFLICT (`reservation_key`) DO NOTHING;
END;--> statement-breakpoint
CREATE TRIGGER
  `campaign_delivery_provider_links_delete_guard`
BEFORE DELETE ON `campaign_delivery_provider_links`
BEGIN
  SELECT RAISE(
    ABORT,
    'Campaign delivery provider links are immutable evidence'
  );
END;
