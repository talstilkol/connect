CREATE TABLE `whatsapp_campaign_delivery_policy_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`connection_version` integer NOT NULL,
	`policy_version` integer NOT NULL,
	`delivery_state` text NOT NULL,
	`portfolio_limit_kind` text NOT NULL,
	`portfolio_limit_value` integer,
	`reservation_duration_seconds` integer NOT NULL,
	`meta_graph_api_version` text NOT NULL,
	`evidence_digest` text NOT NULL,
	`evidence_checked_at` text NOT NULL,
	`evidence_expires_at` text NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `meta_connections`(`tenant_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `whatsapp_delivery_policy_events_key_sha256` CHECK(length(`event_key`) = 98
		and substr(`event_key`, 1, 34) = 'whatsapp_delivery_policy_event_v1_'
		and substr(`event_key`, 35) not glob '*[^0-9a-f]*'),
	CONSTRAINT `whatsapp_delivery_policy_events_versions_positive` CHECK(`connection_version` >= 1 and `policy_version` >= 1),
	CONSTRAINT `whatsapp_delivery_policy_events_state_valid` CHECK(`delivery_state` in ('enabled', 'disabled')),
	CONSTRAINT `whatsapp_delivery_policy_events_limit_valid` CHECK((
		`portfolio_limit_kind` = 'bounded'
		and `portfolio_limit_value` in (250, 2000, 10000, 100000)
	) or (
		`portfolio_limit_kind` = 'unlimited'
		and `portfolio_limit_value` is null
	)),
	CONSTRAINT `whatsapp_delivery_policy_events_duration_valid` CHECK(`reservation_duration_seconds` between 6 and 86400),
	CONSTRAINT `whatsapp_delivery_policy_events_graph_version_valid` CHECK(length(`meta_graph_api_version`) between 4 and 20
		and substr(`meta_graph_api_version`, 1, 1) = 'v'
		and instr(`meta_graph_api_version`, '.') between 3 and length(`meta_graph_api_version`) - 1
		and instr(substr(`meta_graph_api_version`, instr(`meta_graph_api_version`, '.') + 1), '.') = 0
		and substr(`meta_graph_api_version`, 2, instr(`meta_graph_api_version`, '.') - 2) not glob '*[^0-9]*'
		and substr(`meta_graph_api_version`, instr(`meta_graph_api_version`, '.') + 1) not glob '*[^0-9]*'
		and substr(`meta_graph_api_version`, 2, 1) between '1' and '9'),
	CONSTRAINT `whatsapp_delivery_policy_events_digest_sha256` CHECK(length(`evidence_digest`) = 64
		and `evidence_digest` not glob '*[^0-9a-f]*'),
	CONSTRAINT `whatsapp_delivery_policy_events_actor_bounded` CHECK(length(trim(`actor_external_user_id`)) between 1 and 255
		and trim(`actor_external_user_id`) = `actor_external_user_id`),
	CONSTRAINT `whatsapp_delivery_policy_events_time_valid` CHECK(length(`evidence_checked_at`) = 24
		and strftime('%Y-%m-%dT%H:%M:%fZ', `evidence_checked_at`) = `evidence_checked_at`
		and length(`evidence_expires_at`) = 24
		and strftime('%Y-%m-%dT%H:%M:%fZ', `evidence_expires_at`) = `evidence_expires_at`
		and length(`recorded_at`) = 24
		and strftime('%Y-%m-%dT%H:%M:%fZ', `recorded_at`) = `recorded_at`
		and `evidence_checked_at` <= `recorded_at`
		and `evidence_checked_at` < `evidence_expires_at`
		and (`delivery_state` = 'disabled' or `recorded_at` < `evidence_expires_at`)
		and `created_at` = `recorded_at`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_delivery_policy_events_tenant_version_uq` ON `whatsapp_campaign_delivery_policy_events` (`tenant_id`,`policy_version`);
--> statement-breakpoint
CREATE INDEX `whatsapp_delivery_policy_events_tenant_recorded_idx` ON `whatsapp_campaign_delivery_policy_events` (`tenant_id`,`recorded_at`);
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_connection_guard`
BEFORE INSERT ON `whatsapp_campaign_delivery_policy_events`
WHEN NOT EXISTS (
  SELECT 1
  FROM `meta_connections`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `version` = NEW.`connection_version`
    AND (
      NEW.`delivery_state` = 'disabled'
      OR `status` = 'connected'
    )
)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy is not linked to current Meta connection state'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_sequence_guard`
BEFORE INSERT ON `whatsapp_campaign_delivery_policy_events`
WHEN NEW.`policy_version` IS NOT coalesce((
  SELECT max(`policy_version`) + 1
  FROM `whatsapp_campaign_delivery_policy_events`
  WHERE `tenant_id` = NEW.`tenant_id`
), 1)
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy version is not sequential'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_disable_guard`
BEFORE INSERT ON `whatsapp_campaign_delivery_policy_events`
WHEN NEW.`delivery_state` = 'disabled'
  AND NOT EXISTS (
    SELECT 1
    FROM `whatsapp_campaign_delivery_policy_events`
    WHERE `tenant_id` = NEW.`tenant_id`
      AND `policy_version` = NEW.`policy_version` - 1
      AND `delivery_state` = 'enabled'
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy disable transition is invalid'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_insert_audit`
AFTER INSERT ON `whatsapp_campaign_delivery_policy_events`
BEGIN
  INSERT INTO `audit_logs` (
    `tenant_id`,
    `actor_external_user_id`,
    `action`,
    `target_type`,
    `target_id`,
    `idempotency_key`,
    `metadata_json`,
    `created_at`
  ) VALUES (
    NEW.`tenant_id`,
    NEW.`actor_external_user_id`,
    'whatsapp.delivery_policy.recorded',
    'whatsapp_campaign_delivery_policy',
    CAST(NEW.`tenant_id` AS TEXT),
    NEW.`event_key`,
    NULL,
    NEW.`recorded_at`
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_update_guard`
BEFORE UPDATE ON `whatsapp_campaign_delivery_policy_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy events are immutable'
  );
END;
--> statement-breakpoint
CREATE TRIGGER `whatsapp_delivery_policy_events_delete_guard`
BEFORE DELETE ON `whatsapp_campaign_delivery_policy_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'WhatsApp delivery policy events are immutable'
  );
END;
