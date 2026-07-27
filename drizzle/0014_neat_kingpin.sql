CREATE TABLE `bot_reply_deliveries` (
	`delivery_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`conversation_key` text NOT NULL,
	`inbound_message_key` text NOT NULL,
	`bot_flow_key` text NOT NULL,
	`bot_flow_version_key` text NOT NULL,
	`reply_index` integer NOT NULL,
	`recipient_phone_e164` text NOT NULL,
	`reply_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`provider_message_id` text,
	`last_error_code` text,
	`accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`conversation_key`) REFERENCES `conversations`(`tenant_id`,`conversation_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`inbound_message_key`) REFERENCES `messages`(`tenant_id`,`message_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`bot_flow_version_key`) REFERENCES `bot_flow_versions`(`tenant_id`,`bot_flow_version_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "bot_reply_deliveries_key_sha256" CHECK(length("bot_reply_deliveries"."delivery_key") = 86
        and substr("bot_reply_deliveries"."delivery_key", 1, 22) = 'bot_reply_delivery_v1_'
        and substr("bot_reply_deliveries"."delivery_key", 23) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_reply_deliveries_conversation_key_sha256" CHECK(length("bot_reply_deliveries"."conversation_key") = 80
        and substr("bot_reply_deliveries"."conversation_key", 1, 16) = 'conversation_v1_'
        and substr("bot_reply_deliveries"."conversation_key", 17) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_reply_deliveries_inbound_key_sha256" CHECK(length("bot_reply_deliveries"."inbound_message_key") = 75
        and substr("bot_reply_deliveries"."inbound_message_key", 1, 11) = 'message_v1_'
        and substr("bot_reply_deliveries"."inbound_message_key", 12) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_reply_deliveries_flow_key_sha256" CHECK(length("bot_reply_deliveries"."bot_flow_key") = 76
        and substr("bot_reply_deliveries"."bot_flow_key", 1, 12) = 'bot_flow_v1_'
        and substr("bot_reply_deliveries"."bot_flow_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_reply_deliveries_version_key_sha256" CHECK(length("bot_reply_deliveries"."bot_flow_version_key") = 84
        and substr("bot_reply_deliveries"."bot_flow_version_key", 1, 20) = 'bot_flow_version_v1_'
        and substr("bot_reply_deliveries"."bot_flow_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_reply_deliveries_reply_index_positive" CHECK("bot_reply_deliveries"."reply_index" >= 1),
	CONSTRAINT "bot_reply_deliveries_phone_valid" CHECK(length("bot_reply_deliveries"."recipient_phone_e164") between 2 and 16
        and substr("bot_reply_deliveries"."recipient_phone_e164", 1, 1) = '+'
        and substr("bot_reply_deliveries"."recipient_phone_e164", 2, 1) between '1' and '9'
        and substr("bot_reply_deliveries"."recipient_phone_e164", 2) not glob '*[^0-9]*'),
	CONSTRAINT "bot_reply_deliveries_reply_json_valid" CHECK(length("bot_reply_deliveries"."reply_json") between 2 and 50000
        and json_valid("bot_reply_deliveries"."reply_json")),
	CONSTRAINT "bot_reply_deliveries_status_valid" CHECK("bot_reply_deliveries"."status" in ('pending', 'sending', 'accepted', 'rejected', 'ambiguous')),
	CONSTRAINT "bot_reply_deliveries_attempt_count_nonnegative" CHECK("bot_reply_deliveries"."attempt_count" >= 0),
	CONSTRAINT "bot_reply_deliveries_provider_id_bounded" CHECK("bot_reply_deliveries"."provider_message_id" is null
        or length(trim("bot_reply_deliveries"."provider_message_id")) between 1 and 255),
	CONSTRAINT "bot_reply_deliveries_error_code_valid" CHECK("bot_reply_deliveries"."last_error_code" is null
        or (
          length("bot_reply_deliveries"."last_error_code") between 1 and 100
          and "bot_reply_deliveries"."last_error_code" not glob '*[^A-Z0-9_]*'
        )),
	CONSTRAINT "bot_reply_deliveries_state_consistent" CHECK((
        "bot_reply_deliveries"."status" = 'pending'
        and "bot_reply_deliveries"."attempt_count" = 0
        and "bot_reply_deliveries"."provider_message_id" is null
        and "bot_reply_deliveries"."last_error_code" is null
        and "bot_reply_deliveries"."accepted_at" is null
      ) or (
        "bot_reply_deliveries"."status" = 'sending'
        and "bot_reply_deliveries"."attempt_count" >= 1
        and "bot_reply_deliveries"."provider_message_id" is null
        and "bot_reply_deliveries"."last_error_code" is null
        and "bot_reply_deliveries"."accepted_at" is null
      ) or (
        "bot_reply_deliveries"."status" = 'accepted'
        and "bot_reply_deliveries"."attempt_count" >= 1
        and "bot_reply_deliveries"."provider_message_id" is not null
        and "bot_reply_deliveries"."last_error_code" is null
        and "bot_reply_deliveries"."accepted_at" is not null
      ) or (
        "bot_reply_deliveries"."status" in ('rejected', 'ambiguous')
        and "bot_reply_deliveries"."attempt_count" >= 1
        and "bot_reply_deliveries"."provider_message_id" is null
        and "bot_reply_deliveries"."last_error_code" is not null
        and "bot_reply_deliveries"."accepted_at" is null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_deliveries_tenant_key_uq` ON `bot_reply_deliveries` (`tenant_id`,`delivery_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_deliveries_inbound_reply_uq` ON `bot_reply_deliveries` (`tenant_id`,`inbound_message_key`,`reply_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_reply_deliveries_provider_id_uq` ON `bot_reply_deliveries` (`tenant_id`,`provider_message_id`) WHERE "bot_reply_deliveries"."provider_message_id" is not null;--> statement-breakpoint
CREATE INDEX `bot_reply_deliveries_tenant_status_idx` ON `bot_reply_deliveries` (`tenant_id`,`status`,`created_at`);