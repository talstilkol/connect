-- Separate business-initiated quota reservations from service-window replies.
-- Existing rows predate the classification and are business-initiated.

ALTER TABLE `whatsapp_rate_limit_reservations`
ADD COLUMN `reservation_class` text;
--> statement-breakpoint
ALTER TABLE `whatsapp_rate_limit_reservations`
ADD COLUMN `template_category` text;
--> statement-breakpoint
DROP TRIGGER `whatsapp_rate_reservations_update_guard`;
--> statement-breakpoint
UPDATE `whatsapp_rate_limit_reservations`
SET `reservation_class` = 'business-initiated'
WHERE `reservation_class` IS NULL;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_rate_reservations_update_guard`
BEFORE UPDATE ON `whatsapp_rate_limit_reservations`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit reservations are immutable'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_rate_reservations_class_guard`
BEFORE INSERT ON `whatsapp_rate_limit_reservations`
WHEN NEW.`reservation_class` IS NULL
  OR NEW.`reservation_class` NOT IN (
    'business-initiated',
    'service-reply'
  )
  OR (
    NEW.`reservation_class` = 'business-initiated'
    AND (
      NEW.`template_category` IS NULL
      OR NEW.`template_category` NOT IN ('MARKETING', 'UTILITY')
    )
  )
  OR (
    NEW.`reservation_class` = 'service-reply'
    AND NEW.`template_category` IS NOT NULL
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp reservation class is invalid'
  );
END;
--> statement-breakpoint
DROP TRIGGER `whatsapp_rate_reservations_portfolio_state_insert`;
--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_reservations_portfolio_state_insert`
AFTER INSERT ON `whatsapp_rate_limit_reservations`
WHEN NEW.`reservation_class` = 'business-initiated'
BEGIN
  INSERT INTO `whatsapp_portfolio_recipient_rate_limit_state` (
    `portfolio_key`,
    `recipient_key`,
    `active_reservation_key`,
    `active_reservation_expires_at`,
    `last_delivered_at`,
    `updated_at`
  ) VALUES (
    NEW.`portfolio_key`,
    NEW.`recipient_key`,
    NEW.`reservation_key`,
    NEW.`reservation_expires_at`,
    NULL,
    NEW.`reserved_at`
  )
  ON CONFLICT (
    `portfolio_key`,
    `recipient_key`
  ) DO UPDATE SET
    `active_reservation_key` =
      excluded.`active_reservation_key`,
    `active_reservation_expires_at` =
      excluded.`active_reservation_expires_at`,
    `updated_at` = excluded.`updated_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_portfolio_state_business_class_guard_insert`
BEFORE INSERT ON `whatsapp_portfolio_recipient_rate_limit_state`
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `portfolio_key` = NEW.`portfolio_key`
    AND `recipient_key` = NEW.`recipient_key`
    AND `reservation_class` = 'business-initiated'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp portfolio state requires business-initiated proof'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_portfolio_state_business_class_guard_update`
BEFORE UPDATE ON `whatsapp_portfolio_recipient_rate_limit_state`
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `portfolio_key` = NEW.`portfolio_key`
    AND `recipient_key` = NEW.`recipient_key`
    AND `reservation_class` = 'business-initiated'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp portfolio state requires business-initiated proof'
  );
END;
--> statement-breakpoint
DROP TRIGGER `whatsapp_rate_settlements_state_update`;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_rate_settlements_state_update`
AFTER INSERT ON `whatsapp_rate_limit_settlements`
BEGIN
  UPDATE `whatsapp_portfolio_recipient_rate_limit_state`
  SET
    `active_reservation_key` = CASE
      WHEN `active_reservation_key` = NEW.`reservation_key`
      THEN NULL
      ELSE `active_reservation_key`
    END,
    `active_reservation_expires_at` = CASE
      WHEN `active_reservation_key` = NEW.`reservation_key`
      THEN NULL
      ELSE `active_reservation_expires_at`
    END,
    `last_delivered_at` = CASE
      WHEN NEW.`outcome` = 'delivered'
        AND (
          `last_delivered_at` IS NULL
          OR `last_delivered_at` < NEW.`settled_at`
        )
      THEN NEW.`settled_at`
      ELSE `last_delivered_at`
    END,
    `updated_at` = CASE
      WHEN `updated_at` < NEW.`settled_at`
      THEN NEW.`settled_at`
      ELSE `updated_at`
    END
  WHERE (
    SELECT `reservation_class`
    FROM `whatsapp_rate_limit_reservations`
    WHERE `reservation_key` = NEW.`reservation_key`
  ) = 'business-initiated'
    AND (`portfolio_key`, `recipient_key`) = (
      SELECT
        `portfolio_key`,
        `recipient_key`
      FROM `whatsapp_rate_limit_reservations`
      WHERE `reservation_key` = NEW.`reservation_key`
    );

  UPDATE `whatsapp_pair_rate_limit_state`
  SET
    `reserved_until` = CASE
      WHEN NEW.`outcome` = 'cancelled-before-submit'
        AND `reservation_key` = NEW.`reservation_key`
        AND NEW.`settled_at` < `reserved_until`
      THEN NEW.`settled_at`
      ELSE `reserved_until`
    END,
    `updated_at` = CASE
      WHEN `updated_at` < NEW.`settled_at`
      THEN NEW.`settled_at`
      ELSE `updated_at`
    END
  WHERE (`sender_key`, `recipient_key`) = (
    SELECT
      `sender_key`,
      `recipient_key`
    FROM `whatsapp_rate_limit_reservations`
    WHERE `reservation_key` = NEW.`reservation_key`
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_provider_cooldown_service_scope_guard`
BEFORE INSERT ON `whatsapp_provider_cooldown_events`
WHEN NEW.`scope` = 'portfolio-recipient'
  AND EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_reservations`
    WHERE `reservation_key` = NEW.`reservation_key`
      AND `reservation_class` = 'service-reply'
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'Service replies cannot create portfolio-recipient cooldowns'
  );
END;
