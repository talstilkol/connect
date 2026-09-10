-- Durable, fenced retry state for WhatsApp bot service replies.
-- Existing terminal rows receive one legacy claim version; new pending rows
-- must carry the sender phone-number asset used by the inbound webhook.

ALTER TABLE `bot_reply_deliveries`
ADD COLUMN `sender_phone_number_id` text;
--> statement-breakpoint
ALTER TABLE `bot_reply_deliveries`
ADD COLUMN `claim_version` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `bot_reply_deliveries`
ADD COLUMN `next_attempt_at` text;
--> statement-breakpoint
ALTER TABLE `bot_reply_deliveries`
ADD COLUMN `deferred_at` text;
--> statement-breakpoint
ALTER TABLE `bot_reply_deliveries`
ADD COLUMN `last_deferral_reason_code` text;
--> statement-breakpoint
UPDATE `bot_reply_deliveries`
SET
  `claim_version` = CASE
    WHEN `attempt_count` >= 1 THEN 1
    ELSE 0
  END,
  `sender_phone_number_id` = (
    SELECT `phone_number_id`
    FROM `meta_connections`
    WHERE `meta_connections`.`tenant_id` =
      `bot_reply_deliveries`.`tenant_id`
    LIMIT 1
  );
--> statement-breakpoint
CREATE INDEX `bot_reply_deliveries_due_idx`
ON `bot_reply_deliveries` (
  `status`,
  `next_attempt_at`,
  `delivery_key`
);
--> statement-breakpoint
CREATE TRIGGER `bot_reply_deliveries_insert_contract_guard`
BEFORE INSERT ON `bot_reply_deliveries`
WHEN NEW.`sender_phone_number_id` IS NULL
  OR length(trim(NEW.`sender_phone_number_id`)) NOT BETWEEN 1 AND 255
  OR trim(NEW.`sender_phone_number_id`) IS NOT NEW.`sender_phone_number_id`
  OR NEW.`next_attempt_at` IS NOT NULL
  OR NEW.`deferred_at` IS NOT NULL
  OR NEW.`last_deferral_reason_code` IS NOT NULL
  OR (
    NEW.`status` = 'pending'
    AND NEW.`claim_version` <> 0
  )
  OR (
    NEW.`status` <> 'pending'
    AND NEW.`claim_version` < 1
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'bot reply delivery insert contract is invalid'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `bot_reply_deliveries_identity_guard`
BEFORE UPDATE ON `bot_reply_deliveries`
WHEN NEW.`delivery_key` IS NOT OLD.`delivery_key`
  OR NEW.`tenant_id` IS NOT OLD.`tenant_id`
  OR NEW.`conversation_key` IS NOT OLD.`conversation_key`
  OR NEW.`inbound_message_key` IS NOT OLD.`inbound_message_key`
  OR NEW.`bot_flow_key` IS NOT OLD.`bot_flow_key`
  OR NEW.`bot_flow_version_key` IS NOT OLD.`bot_flow_version_key`
  OR NEW.`reply_index` IS NOT OLD.`reply_index`
  OR NEW.`sender_phone_number_id` IS NOT OLD.`sender_phone_number_id`
  OR NEW.`recipient_phone_e164` IS NOT OLD.`recipient_phone_e164`
  OR NEW.`reply_json` IS NOT OLD.`reply_json`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(
    ABORT,
    'bot reply delivery identity is immutable'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `bot_reply_deliveries_transition_guard`
BEFORE UPDATE OF
  `status`,
  `attempt_count`,
  `claim_version`,
  `next_attempt_at`,
  `deferred_at`,
  `last_deferral_reason_code`,
  `provider_message_id`,
  `last_error_code`,
  `accepted_at`,
  `updated_at`
ON `bot_reply_deliveries`
WHEN NOT (
  OLD.`status` = 'pending'
  AND NEW.`status` = 'sending'
  AND NEW.`attempt_count` = 1
  AND NEW.`claim_version` = OLD.`claim_version` + 1
  AND NEW.`next_attempt_at` IS NULL
  AND NEW.`deferred_at` IS NULL
  AND NEW.`last_deferral_reason_code` IS NULL
  AND NEW.`provider_message_id` IS NULL
  AND NEW.`last_error_code` IS NULL
  AND NEW.`accepted_at` IS NULL
) AND NOT (
  OLD.`status` = 'sending'
  AND NEW.`status` = 'pending'
  AND NEW.`attempt_count` = 0
  AND NEW.`claim_version` = OLD.`claim_version`
  AND NEW.`next_attempt_at` IS NOT NULL
  AND length(NEW.`next_attempt_at`) = 24
  AND strftime(
    '%Y-%m-%dT%H:%M:%fZ',
    NEW.`next_attempt_at`
  ) = NEW.`next_attempt_at`
  AND NEW.`deferred_at` = NEW.`updated_at`
  AND NEW.`next_attempt_at` > NEW.`deferred_at`
  AND NEW.`last_deferral_reason_code` IS NOT NULL
  AND length(NEW.`last_deferral_reason_code`) BETWEEN 1 AND 100
  AND NEW.`last_deferral_reason_code` NOT GLOB '*[^A-Z0-9_]*'
  AND NEW.`provider_message_id` IS NULL
  AND NEW.`last_error_code` IS NULL
  AND NEW.`accepted_at` IS NULL
  AND NEW.`next_attempt_at` < (
    SELECT strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      `messages`.`occurred_at`,
      '+24 hours'
    )
    FROM `messages`
    WHERE `messages`.`tenant_id` = NEW.`tenant_id`
      AND `messages`.`message_key` = NEW.`inbound_message_key`
      AND `messages`.`direction` = 'inbound'
  )
) AND NOT (
  OLD.`status` = 'sending'
  AND NEW.`status` = 'accepted'
  AND NEW.`attempt_count` = 1
  AND NEW.`claim_version` = OLD.`claim_version`
  AND NEW.`next_attempt_at` IS NULL
  AND NEW.`deferred_at` IS NULL
  AND NEW.`last_deferral_reason_code` IS NULL
  AND NEW.`provider_message_id` IS NOT NULL
  AND NEW.`last_error_code` IS NULL
  AND NEW.`accepted_at` = NEW.`updated_at`
) AND NOT (
  OLD.`status` = 'sending'
  AND NEW.`status` IN ('rejected', 'ambiguous')
  AND NEW.`attempt_count` = 1
  AND NEW.`claim_version` = OLD.`claim_version`
  AND NEW.`next_attempt_at` IS NULL
  AND NEW.`deferred_at` IS NULL
  AND NEW.`last_deferral_reason_code` IS NULL
  AND NEW.`provider_message_id` IS NULL
  AND NEW.`last_error_code` IS NOT NULL
  AND NEW.`accepted_at` IS NULL
)
BEGIN
  SELECT RAISE(
    ABORT,
    'bot reply delivery transition is invalid'
  );
END;
