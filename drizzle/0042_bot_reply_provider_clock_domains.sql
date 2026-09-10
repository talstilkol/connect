-- Keep Meta's provider occurrence time separate from Connect's local
-- reconciliation time. Provider ordering remains based on
-- last_status_event_at, while updated_at and terminal_settled_at are local,
-- causal timestamps supplied by the trusted reconciliation runtime.

DROP TRIGGER IF EXISTS `bot_reply_provider_links_status_guard`;--> statement-breakpoint
CREATE TRIGGER `bot_reply_provider_links_status_guard`
BEFORE UPDATE ON `bot_reply_delivery_provider_links`
WHEN NEW.`delivery_key` IS OLD.`delivery_key`
  AND NEW.`tenant_id` IS OLD.`tenant_id`
  AND NEW.`provider_message_id` IS OLD.`provider_message_id`
  AND NEW.`reservation_key` IS OLD.`reservation_key`
  AND NEW.`accepted_at` IS OLD.`accepted_at`
  AND NEW.`created_at` IS OLD.`created_at`
  AND (
  OLD.`terminal_outcome` IS NOT NULL
  AND (
    NEW.`terminal_outcome` IS NOT OLD.`terminal_outcome`
    OR NEW.`terminal_settled_at` IS NOT OLD.`terminal_settled_at`
  )
  OR NEW.`last_status_event_key` IS OLD.`last_status_event_key`
  OR NEW.`last_status_event_at` IS NULL
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
  OR NEW.`updated_at` < OLD.`updated_at`
  OR (
    OLD.`terminal_outcome` IS NULL
    AND NEW.`terminal_outcome` IS NOT NULL
    AND NEW.`terminal_settled_at` IS NOT NEW.`updated_at`
  )
  )
BEGIN
  SELECT RAISE(ABORT, 'Bot reply provider status does not advance');
END;

CREATE TRIGGER `campaign_delivery_provider_links_status_clock_guard`
BEFORE UPDATE ON `campaign_delivery_provider_links`
WHEN NEW.`delivery_key` IS OLD.`delivery_key`
  AND NEW.`tenant_id` IS OLD.`tenant_id`
  AND NEW.`provider_message_id` IS OLD.`provider_message_id`
  AND NEW.`reservation_key` IS OLD.`reservation_key`
  AND NEW.`accepted_at` IS OLD.`accepted_at`
  AND NEW.`created_at` IS OLD.`created_at`
  AND (
  NEW.`last_status_event_key` IS OLD.`last_status_event_key`
  OR NEW.`last_status_event_at` IS NULL
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
  OR NEW.`updated_at` < OLD.`updated_at`
  OR (
    OLD.`terminal_outcome` IS NULL
    AND NEW.`terminal_outcome` IS NOT NULL
    AND NEW.`terminal_settled_at` IS NOT NEW.`updated_at`
  )
  )
BEGIN
  SELECT RAISE(ABORT, 'Campaign provider status does not advance');
END;
