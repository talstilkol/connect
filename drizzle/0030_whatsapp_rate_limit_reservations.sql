CREATE TABLE `whatsapp_rate_limit_reservations` (
  `reservation_key` text PRIMARY KEY NOT NULL,
  `tenant_id` integer NOT NULL,
  `portfolio_key` text NOT NULL,
  `sender_key` text NOT NULL,
  `recipient_key` text NOT NULL,
  `portfolio_limit_kind` text NOT NULL,
  `portfolio_limit_value` integer,
  `reserved_at` text NOT NULL,
  `pair_reserved_until` text NOT NULL,
  `reservation_expires_at` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`tenant_id`)
    REFERENCES `tenants` (`id`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_rate_reservations_key_sha256`
    CHECK (
      length(`reservation_key`) = 93
      AND substr(`reservation_key`, 1, 29) =
        'whatsapp_rate_reservation_v1_'
      AND substr(`reservation_key`, 30)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_rate_reservations_portfolio_key_sha256`
    CHECK (
      length(`portfolio_key`) = 86
      AND substr(`portfolio_key`, 1, 22) =
        'whatsapp_portfolio_v1_'
      AND substr(`portfolio_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_rate_reservations_sender_key_sha256`
    CHECK (
      length(`sender_key`) = 83
      AND substr(`sender_key`, 1, 19) =
        'whatsapp_sender_v1_'
      AND substr(`sender_key`, 20)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_rate_reservations_recipient_key_sha256`
    CHECK (
      length(`recipient_key`) = 86
      AND substr(`recipient_key`, 1, 22) =
        'whatsapp_recipient_v1_'
      AND substr(`recipient_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_rate_reservations_limit_valid`
    CHECK (
      (
        `portfolio_limit_kind` = 'bounded'
        AND `portfolio_limit_value` IN (
          250,
          2000,
          10000,
          100000
        )
      )
      OR (
        `portfolio_limit_kind` = 'unlimited'
        AND `portfolio_limit_value` IS NULL
      )
    ),
  CONSTRAINT `whatsapp_rate_reservations_time_valid`
    CHECK (
      length(`reserved_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `reserved_at`
      ) = `reserved_at`
      AND length(`pair_reserved_until`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `pair_reserved_until`
      ) = `pair_reserved_until`
      AND `pair_reserved_until` = strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `reserved_at`,
        '+6 seconds'
      )
      AND length(`reservation_expires_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `reservation_expires_at`
      ) = `reservation_expires_at`
      AND `reservation_expires_at` >=
        `pair_reserved_until`
      AND `reservation_expires_at` <= strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `reserved_at`,
        '+24 hours'
      )
      AND `created_at` = `reserved_at`
    )
);--> statement-breakpoint
CREATE INDEX
  `whatsapp_rate_reservations_tenant_reserved_idx`
ON `whatsapp_rate_limit_reservations` (
  `tenant_id`,
  `reserved_at`
);--> statement-breakpoint
CREATE TABLE `whatsapp_pair_rate_limit_state` (
  `sender_key` text NOT NULL,
  `recipient_key` text NOT NULL,
  `reservation_key` text NOT NULL,
  `reserved_until` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (
    `sender_key`,
    `recipient_key`
  ),
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_pair_state_sender_key_sha256`
    CHECK (
      length(`sender_key`) = 83
      AND substr(`sender_key`, 1, 19) =
        'whatsapp_sender_v1_'
      AND substr(`sender_key`, 20)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_pair_state_recipient_key_sha256`
    CHECK (
      length(`recipient_key`) = 86
      AND substr(`recipient_key`, 1, 22) =
        'whatsapp_recipient_v1_'
      AND substr(`recipient_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_pair_state_time_canonical`
    CHECK (
      length(`reserved_until`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `reserved_until`
      ) = `reserved_until`
      AND length(`updated_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `updated_at`
      ) = `updated_at`
    )
);--> statement-breakpoint
CREATE INDEX
  `whatsapp_pair_state_expiry_idx`
ON `whatsapp_pair_rate_limit_state` (
  `reserved_until`
);--> statement-breakpoint
CREATE TABLE `whatsapp_portfolio_recipient_rate_limit_state` (
  `portfolio_key` text NOT NULL,
  `recipient_key` text NOT NULL,
  `active_reservation_key` text,
  `active_reservation_expires_at` text,
  `last_delivered_at` text,
  `updated_at` text NOT NULL,
  PRIMARY KEY (
    `portfolio_key`,
    `recipient_key`
  ),
  FOREIGN KEY (`active_reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_portfolio_state_portfolio_key_sha256`
    CHECK (
      length(`portfolio_key`) = 86
      AND substr(`portfolio_key`, 1, 22) =
        'whatsapp_portfolio_v1_'
      AND substr(`portfolio_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_portfolio_state_recipient_key_sha256`
    CHECK (
      length(`recipient_key`) = 86
      AND substr(`recipient_key`, 1, 22) =
        'whatsapp_recipient_v1_'
      AND substr(`recipient_key`, 23)
        NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `whatsapp_portfolio_state_active_consistent`
    CHECK (
      (
        `active_reservation_key` IS NULL
        AND `active_reservation_expires_at` IS NULL
      )
      OR (
        `active_reservation_key` IS NOT NULL
        AND `active_reservation_expires_at` IS NOT NULL
        AND length(`active_reservation_expires_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `active_reservation_expires_at`
        ) = `active_reservation_expires_at`
      )
    ),
  CONSTRAINT `whatsapp_portfolio_state_delivery_canonical`
    CHECK (
      `last_delivered_at` IS NULL
      OR (
        length(`last_delivered_at`) = 24
        AND strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          `last_delivered_at`
        ) = `last_delivered_at`
      )
    ),
  CONSTRAINT `whatsapp_portfolio_state_updated_canonical`
    CHECK (
      length(`updated_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `updated_at`
      ) = `updated_at`
    )
);--> statement-breakpoint
CREATE INDEX
  `whatsapp_portfolio_state_capacity_idx`
ON `whatsapp_portfolio_recipient_rate_limit_state` (
  `portfolio_key`,
  `last_delivered_at`,
  `active_reservation_expires_at`
);--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_pair_state_insert_proof_guard`
BEFORE INSERT ON `whatsapp_pair_rate_limit_state`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `sender_key` = NEW.`sender_key`
    AND `recipient_key` = NEW.`recipient_key`
    AND `reserved_at` <= NEW.`reserved_until`
    AND `pair_reserved_until` >= NEW.`reserved_until`
    AND `reserved_at` <= NEW.`updated_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp pair state lacks reservation proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_pair_state_update_proof_guard`
BEFORE UPDATE ON `whatsapp_pair_rate_limit_state`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `sender_key` = NEW.`sender_key`
    AND `recipient_key` = NEW.`recipient_key`
    AND `reserved_at` <= NEW.`reserved_until`
    AND `pair_reserved_until` >= NEW.`reserved_until`
    AND `reserved_at` <= NEW.`updated_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp pair state lacks reservation proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_pair_state_release_proof_guard`
BEFORE UPDATE OF `reserved_until`
ON `whatsapp_pair_rate_limit_state`
FOR EACH ROW
WHEN NEW.`reserved_until` < OLD.`reserved_until`
  AND NOT EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_settlements`
    WHERE `reservation_key` = OLD.`reservation_key`
      AND `outcome` = 'cancelled-before-submit'
      AND `settled_at` = NEW.`reserved_until`
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp pair release lacks cancellation proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_portfolio_state_insert_proof_guard`
BEFORE INSERT ON `whatsapp_portfolio_recipient_rate_limit_state`
FOR EACH ROW
WHEN NOT (
  EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_reservations`
    WHERE `portfolio_key` = NEW.`portfolio_key`
      AND `recipient_key` = NEW.`recipient_key`
  )
  AND (
    NEW.`active_reservation_key` IS NULL
    OR EXISTS (
      SELECT 1
      FROM `whatsapp_rate_limit_reservations`
      WHERE `reservation_key` =
          NEW.`active_reservation_key`
        AND `portfolio_key` = NEW.`portfolio_key`
        AND `recipient_key` = NEW.`recipient_key`
        AND `reservation_expires_at` =
          NEW.`active_reservation_expires_at`
    )
  )
  AND (
    NEW.`last_delivered_at` IS NULL
    OR EXISTS (
      SELECT 1
      FROM `whatsapp_rate_limit_settlements`
      INNER JOIN `whatsapp_rate_limit_reservations`
        USING (`reservation_key`)
      WHERE `portfolio_key` = NEW.`portfolio_key`
        AND `recipient_key` = NEW.`recipient_key`
        AND `outcome` = 'delivered'
        AND `settled_at` = NEW.`last_delivered_at`
    )
  )
  AND (
    NEW.`last_delivered_at` IS NULL
    OR NEW.`updated_at` >= NEW.`last_delivered_at`
  )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp portfolio state lacks lifecycle proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_portfolio_state_update_proof_guard`
BEFORE UPDATE ON
  `whatsapp_portfolio_recipient_rate_limit_state`
FOR EACH ROW
WHEN NOT (
  EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_reservations`
    WHERE `portfolio_key` = NEW.`portfolio_key`
      AND `recipient_key` = NEW.`recipient_key`
  )
  AND (
    NEW.`active_reservation_key` IS NULL
    OR EXISTS (
      SELECT 1
      FROM `whatsapp_rate_limit_reservations`
      WHERE `reservation_key` =
          NEW.`active_reservation_key`
        AND `portfolio_key` = NEW.`portfolio_key`
        AND `recipient_key` = NEW.`recipient_key`
        AND `reservation_expires_at` =
          NEW.`active_reservation_expires_at`
    )
  )
  AND (
    NEW.`last_delivered_at` IS NULL
    OR EXISTS (
      SELECT 1
      FROM `whatsapp_rate_limit_settlements`
      INNER JOIN `whatsapp_rate_limit_reservations`
        USING (`reservation_key`)
      WHERE `portfolio_key` = NEW.`portfolio_key`
        AND `recipient_key` = NEW.`recipient_key`
        AND `outcome` = 'delivered'
        AND `settled_at` = NEW.`last_delivered_at`
    )
  )
  AND (
    NEW.`last_delivered_at` IS NULL
    OR NEW.`updated_at` >= NEW.`last_delivered_at`
  )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp portfolio state lacks lifecycle proof'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_portfolio_state_release_proof_guard`
BEFORE UPDATE OF `active_reservation_key`
ON `whatsapp_portfolio_recipient_rate_limit_state`
FOR EACH ROW
WHEN OLD.`active_reservation_key` IS NOT NULL
  AND NEW.`active_reservation_key` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `whatsapp_rate_limit_settlements`
    WHERE `reservation_key` =
        OLD.`active_reservation_key`
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp portfolio release lacks settlement proof'
  );
END;--> statement-breakpoint
CREATE TABLE `whatsapp_rate_limit_settlements` (
  `reservation_key` text PRIMARY KEY NOT NULL,
  `outcome` text NOT NULL,
  `settled_at` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`reservation_key`)
    REFERENCES `whatsapp_rate_limit_reservations`
      (`reservation_key`)
    ON DELETE restrict,
  CONSTRAINT `whatsapp_rate_settlements_outcome_valid`
    CHECK (
      `outcome` IN (
        'delivered',
        'provider-failed',
        'cancelled-before-submit'
      )
    ),
  CONSTRAINT `whatsapp_rate_settlements_time_canonical`
    CHECK (
      length(`settled_at`) = 24
      AND strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        `settled_at`
      ) = `settled_at`
      AND `created_at` = `settled_at`
    )
);--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_reservations_pair_state_insert`
AFTER INSERT ON `whatsapp_rate_limit_reservations`
BEGIN
  INSERT INTO `whatsapp_pair_rate_limit_state` (
    `sender_key`,
    `recipient_key`,
    `reservation_key`,
    `reserved_until`,
    `updated_at`
  ) VALUES (
    NEW.`sender_key`,
    NEW.`recipient_key`,
    NEW.`reservation_key`,
    NEW.`pair_reserved_until`,
    NEW.`reserved_at`
  )
  ON CONFLICT (
    `sender_key`,
    `recipient_key`
  ) DO UPDATE SET
    `reservation_key` = excluded.`reservation_key`,
    `reserved_until` = excluded.`reserved_until`,
    `updated_at` = excluded.`updated_at`;
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_reservations_portfolio_state_insert`
AFTER INSERT ON `whatsapp_rate_limit_reservations`
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
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_reservations_update_guard`
BEFORE UPDATE ON `whatsapp_rate_limit_reservations`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit reservations are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_reservations_delete_guard`
BEFORE DELETE ON `whatsapp_rate_limit_reservations`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit reservations are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_settlements_reservation_guard`
BEFORE INSERT ON `whatsapp_rate_limit_settlements`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_rate_limit_reservations`
  WHERE `reservation_key` = NEW.`reservation_key`
    AND `reserved_at` <= NEW.`settled_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit settlement precedes reservation'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_settlements_state_update`
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
  WHERE (`portfolio_key`, `recipient_key`) = (
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
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_settlements_update_guard`
BEFORE UPDATE ON `whatsapp_rate_limit_settlements`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit settlements are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER
  `whatsapp_rate_settlements_delete_guard`
BEFORE DELETE ON `whatsapp_rate_limit_settlements`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp rate-limit settlements are immutable'
  );
END;
