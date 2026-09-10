-- Provider-bound WhatsApp phone throughput evidence and rolling limiter.
-- Existing policy and reservation rows remain readable as legacy evidence;
-- every new enabled policy and reservation must carry explicit values.

ALTER TABLE `whatsapp_campaign_delivery_policy_events`
ADD COLUMN `phone_throughput_messages_per_second` integer;
--> statement-breakpoint
ALTER TABLE `whatsapp_campaign_delivery_policy_events`
ADD COLUMN `maximum_outbound_messages_per_second` integer;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_throughput_guard`
BEFORE INSERT ON `whatsapp_campaign_delivery_policy_events`
WHEN NOT (
  (
    NEW.`phone_throughput_messages_per_second` IN (20, 80, 1000)
    AND NEW.`maximum_outbound_messages_per_second` >= 1
    AND NEW.`maximum_outbound_messages_per_second`
      < NEW.`phone_throughput_messages_per_second`
  )
  OR (
    NEW.`delivery_state` = 'disabled'
    AND NEW.`phone_throughput_messages_per_second` IS NULL
    AND NEW.`maximum_outbound_messages_per_second` IS NULL
  )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy throughput evidence is invalid'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_disable_throughput_guard`
BEFORE INSERT ON `whatsapp_campaign_delivery_policy_events`
WHEN NEW.`delivery_state` = 'disabled'
  AND EXISTS (
    SELECT 1
    FROM `whatsapp_campaign_delivery_policy_events`
    WHERE `tenant_id` = NEW.`tenant_id`
      AND `policy_version` = NEW.`policy_version` - 1
      AND (
        `phone_throughput_messages_per_second`
          IS NOT NEW.`phone_throughput_messages_per_second`
        OR `maximum_outbound_messages_per_second`
          IS NOT NEW.`maximum_outbound_messages_per_second`
      )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy disable throughput transition is invalid'
  );
END;
--> statement-breakpoint
ALTER TABLE `whatsapp_rate_limit_reservations`
ADD COLUMN `policy_event_key` text;
--> statement-breakpoint
ALTER TABLE `whatsapp_rate_limit_reservations`
ADD COLUMN `phone_throughput_messages_per_second` integer;
--> statement-breakpoint
ALTER TABLE `whatsapp_rate_limit_reservations`
ADD COLUMN `maximum_outbound_messages_per_second` integer;
--> statement-breakpoint
CREATE INDEX `whatsapp_rate_reservations_sender_reserved_idx`
ON `whatsapp_rate_limit_reservations` (
  `sender_key`,
  `reserved_at`
);
--> statement-breakpoint
CREATE TRIGGER `whatsapp_rate_reservations_throughput_evidence_guard`
BEFORE INSERT ON `whatsapp_rate_limit_reservations`
WHEN NOT EXISTS (
  SELECT 1
  FROM `whatsapp_campaign_delivery_policy_events` AS `policy`
  WHERE `policy`.`event_key` = NEW.`policy_event_key`
    AND `policy`.`tenant_id` = NEW.`tenant_id`
    AND `policy`.`delivery_state` = 'enabled'
    AND `policy`.`policy_version` = (
      SELECT max(`latest`.`policy_version`)
      FROM `whatsapp_campaign_delivery_policy_events` AS `latest`
      WHERE `latest`.`tenant_id` = NEW.`tenant_id`
    )
    AND `policy`.`phone_throughput_messages_per_second`
      = NEW.`phone_throughput_messages_per_second`
    AND `policy`.`maximum_outbound_messages_per_second`
      = NEW.`maximum_outbound_messages_per_second`
    AND `policy`.`evidence_checked_at` <= NEW.`reserved_at`
    AND `policy`.`recorded_at` <= NEW.`reserved_at`
    AND NEW.`reserved_at` < `policy`.`evidence_expires_at`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp reservation lacks current throughput evidence'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_rate_reservations_phone_throughput_guard`
BEFORE INSERT ON `whatsapp_rate_limit_reservations`
WHEN (
  SELECT count(*)
  FROM `whatsapp_rate_limit_reservations`
  WHERE `sender_key` = NEW.`sender_key`
    AND `reserved_at` > strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      NEW.`reserved_at`,
      '-1 second'
    )
    AND `reserved_at` <= NEW.`reserved_at`
) >= NEW.`maximum_outbound_messages_per_second`
BEGIN
  SELECT RAISE(IGNORE);
END;
