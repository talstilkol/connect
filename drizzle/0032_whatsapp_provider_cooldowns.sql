CREATE TABLE `whatsapp_provider_cooldown_events` (
  `reservation_key` text PRIMARY KEY NOT NULL,
  `scope` text NOT NULL,
  `provider_error_code` integer NOT NULL,
  `observed_at` text NOT NULL,
  `blocked_until` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_provider_cooldowns_scope_code_valid`
    CHECK (
      (
        `scope` = 'sender'
        AND `provider_error_code` = 130429
      )
      OR (
        `scope` = 'portfolio-recipient'
        AND `provider_error_code` = 131049
      )
      OR (
        `scope` = 'pair'
        AND `provider_error_code` = 131056
      )
    ),
  CONSTRAINT `whatsapp_provider_cooldowns_time_valid`
    CHECK (
      length(`observed_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `observed_at`
      ) = `observed_at`
      AND length(`blocked_until`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `blocked_until`
      ) = `blocked_until`
      AND `blocked_until` > `observed_at`
      AND `blocked_until` <= strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `observed_at`,
        '+24 hours'
      )
      AND (
        `provider_error_code` <> 131049
        OR `blocked_until` = strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `observed_at`,
          '+24 hours'
        )
      )
      AND `created_at` = `observed_at`
    )
);--> statement-breakpoint
CREATE INDEX
  `whatsapp_provider_cooldown_events_expiry_idx`
ON `whatsapp_provider_cooldown_events` (
  `blocked_until`
);--> statement-breakpoint
CREATE TABLE `whatsapp_provider_cooldown_state` (
  `scope` text NOT NULL,
  `sender_key` text NOT NULL,
  `recipient_key` text NOT NULL,
  `reservation_key` text NOT NULL,
  `provider_error_code` integer NOT NULL,
  `blocked_until` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (
    `scope`,
    `sender_key`,
    `recipient_key`
  ),
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_provider_cooldown_events`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_provider_cooldown_state_subject_valid`
    CHECK (
      (
        `scope` = 'sender'
        AND length(`sender_key`) = 83
        AND substr(`sender_key`, 1, 19) =
          'whatsapp_sender_v1_'
        AND substr(`sender_key`, 20)
          NOT GLOB '*[^0-9a-f]*'
        AND `recipient_key` = ''
        AND `provider_error_code` = 130429
      )
      OR (
        `scope` = 'portfolio-recipient'
        AND `sender_key` = ''
        AND length(`recipient_key`) = 86
        AND substr(`recipient_key`, 1, 22) =
          'whatsapp_recipient_v1_'
        AND substr(`recipient_key`, 23)
          NOT GLOB '*[^0-9a-f]*'
        AND `provider_error_code` = 131049
      )
      OR (
        `scope` = 'pair'
        AND length(`sender_key`) = 83
        AND substr(`sender_key`, 1, 19) =
          'whatsapp_sender_v1_'
        AND substr(`sender_key`, 20)
          NOT GLOB '*[^0-9a-f]*'
        AND length(`recipient_key`) = 86
        AND substr(`recipient_key`, 1, 22) =
          'whatsapp_recipient_v1_'
        AND substr(`recipient_key`, 23)
          NOT GLOB '*[^0-9a-f]*'
        AND `provider_error_code` = 131056
      )
    ),
  CONSTRAINT `whatsapp_provider_cooldown_state_time_valid`
    CHECK (
      length(`blocked_until`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `blocked_until`
      ) = `blocked_until`
      AND length(`updated_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `updated_at`
      ) = `updated_at`
    )
);--> statement-breakpoint
CREATE INDEX
  `whatsapp_provider_cooldown_state_expiry_idx`
ON `whatsapp_provider_cooldown_state` (
  `blocked_until`
);--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_events_proof_guard`
BEFORE INSERT ON `whatsapp_provider_cooldown_events`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `reserved_at` <= NEW.`observed_at`
)
OR NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_settlements`
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `outcome` = 'provider-failed'
    AND `settled_at` = NEW.`observed_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown lacks rejection proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_state_insert_proof_guard`
BEFORE INSERT ON `whatsapp_provider_cooldown_state`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_provider_cooldown_events`
  INNER JOIN `whatsapp_rate_limit_reservations`
    USING (`reservation_key`)
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `scope` = NEW.`scope`
    AND `provider_error_code` =
      NEW.`provider_error_code`
    AND `blocked_until` = NEW.`blocked_until`
    AND `observed_at` = NEW.`updated_at`
    AND (
      (
        NEW.`scope` = 'sender'
        AND `sender_key` = NEW.`sender_key`
        AND NEW.`recipient_key` = ''
      )
      OR (
        NEW.`scope` = 'portfolio-recipient'
        AND NEW.`sender_key` = ''
        AND `recipient_key` = NEW.`recipient_key`
      )
      OR (
        NEW.`scope` = 'pair'
        AND `sender_key` = NEW.`sender_key`
        AND `recipient_key` = NEW.`recipient_key`
      )
    )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown state lacks event proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_state_update_proof_guard`
BEFORE UPDATE ON `whatsapp_provider_cooldown_state`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_provider_cooldown_events`
  INNER JOIN `whatsapp_rate_limit_reservations`
    USING (`reservation_key`)
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `scope` = NEW.`scope`
    AND `provider_error_code` =
      NEW.`provider_error_code`
    AND `blocked_until` = NEW.`blocked_until`
    AND `observed_at` = NEW.`updated_at`
    AND (
      (
        NEW.`scope` = 'sender'
        AND `sender_key` = NEW.`sender_key`
        AND NEW.`recipient_key` = ''
      )
      OR (
        NEW.`scope` = 'portfolio-recipient'
        AND NEW.`sender_key` = ''
        AND `recipient_key` = NEW.`recipient_key`
      )
      OR (
        NEW.`scope` = 'pair'
        AND `sender_key` = NEW.`sender_key`
        AND `recipient_key` = NEW.`recipient_key`
      )
    )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown state lacks event proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_state_monotonic_guard`
BEFORE UPDATE ON `whatsapp_provider_cooldown_state`
FOR EACH ROW
WHEN NEW.`blocked_until` < OLD.`blocked_until`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown cannot be shortened'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_events_state_insert`
AFTER INSERT ON `whatsapp_provider_cooldown_events`
BEGIN
  INSERT INTO `whatsapp_provider_cooldown_state` (
    `scope`,
    `sender_key`,
    `recipient_key`,
    `reservation_key`,
    `provider_error_code`,
    `blocked_until`,
    `updated_at`
  )
  SELECT
    NEW.`scope`,
    CASE
      WHEN NEW.`scope` IN ('sender', 'pair')
      THEN `sender_key`
      ELSE ''
    END,
    CASE
      WHEN NEW.`scope` IN (
        'portfolio-recipient',
        'pair'
      )
      THEN `recipient_key`
      ELSE ''
    END,
    NEW.`reservation_key`,
    NEW.`provider_error_code`,
    NEW.`blocked_until`,
    NEW.`observed_at`
  FROM `whatsapp_rate_limit_reservations`
  WHERE `reservation_key` = NEW.`reservation_key`
  ON CONFLICT (
    `scope`,
    `sender_key`,
    `recipient_key`
  ) DO UPDATE SET
    `reservation_key` = excluded.`reservation_key`,
    `provider_error_code` =
      excluded.`provider_error_code`,
    `blocked_until` = excluded.`blocked_until`,
    `updated_at` = excluded.`updated_at`
  WHERE excluded.`blocked_until` >
    `whatsapp_provider_cooldown_state`.`blocked_until`;
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_events_update_guard`
BEFORE UPDATE ON `whatsapp_provider_cooldown_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown events are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_events_delete_guard`
BEFORE DELETE ON `whatsapp_provider_cooldown_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown events are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_provider_cooldown_state_delete_guard`
BEFORE DELETE ON `whatsapp_provider_cooldown_state`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp provider cooldown state cannot be deleted'
  );
END;
