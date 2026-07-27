CREATE TABLE `ai_reply_outbox` (
	`outbox_key` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`audit_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`conversation_key` text NOT NULL,
	`inbound_message_key` text NOT NULL,
	`ai_agent_key` text NOT NULL,
	`ai_agent_version_key` text NOT NULL,
	`expected_conversation_version` integer NOT NULL,
	`recipient_phone_e164` text NOT NULL,
	`response_mode` text NOT NULL,
	`reply_text` text NOT NULL,
	`grounded_source_keys_json` text NOT NULL,
	`grounding_score_basis_points` integer NOT NULL,
	`status` text NOT NULL,
	`decided_by_external_user_id` text,
	`decided_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`audit_key`) REFERENCES `ai_runtime_audit_events`(`tenant_id`,`audit_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_reply_outbox_key_sha256" CHECK(length("ai_reply_outbox"."outbox_key") = 83
        and substr("ai_reply_outbox"."outbox_key", 1, 19) = 'ai_reply_outbox_v1_'
        and substr("ai_reply_outbox"."outbox_key", 20) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_request_key_sha256" CHECK(length("ai_reply_outbox"."request_key") = 87
        and substr("ai_reply_outbox"."request_key", 1, 23) = 'ai_provider_request_v1_'
        and substr("ai_reply_outbox"."request_key", 24) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_audit_key_sha256" CHECK(length("ai_reply_outbox"."audit_key") = 84
        and substr("ai_reply_outbox"."audit_key", 1, 20) = 'ai_runtime_audit_v1_'
        and substr("ai_reply_outbox"."audit_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_conversation_key_sha256" CHECK(length("ai_reply_outbox"."conversation_key") = 80
        and substr("ai_reply_outbox"."conversation_key", 1, 16) = 'conversation_v1_'
        and substr("ai_reply_outbox"."conversation_key", 17) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_message_key_sha256" CHECK(length("ai_reply_outbox"."inbound_message_key") = 75
        and substr("ai_reply_outbox"."inbound_message_key", 1, 11) = 'message_v1_'
        and substr("ai_reply_outbox"."inbound_message_key", 12) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_agent_key_sha256" CHECK(length("ai_reply_outbox"."ai_agent_key") = 76
        and substr("ai_reply_outbox"."ai_agent_key", 1, 12) = 'ai_agent_v1_'
        and substr("ai_reply_outbox"."ai_agent_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_version_key_sha256" CHECK(length("ai_reply_outbox"."ai_agent_version_key") = 84
        and substr("ai_reply_outbox"."ai_agent_version_key", 1, 20) = 'ai_agent_version_v1_'
        and substr("ai_reply_outbox"."ai_agent_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_reply_outbox_expected_version_positive" CHECK("ai_reply_outbox"."expected_conversation_version" >= 1),
	CONSTRAINT "ai_reply_outbox_phone_valid" CHECK(length("ai_reply_outbox"."recipient_phone_e164") between 2 and 16
        and substr("ai_reply_outbox"."recipient_phone_e164", 1, 1) = '+'
        and substr("ai_reply_outbox"."recipient_phone_e164", 2, 1) between '1' and '9'
        and substr("ai_reply_outbox"."recipient_phone_e164", 2) not glob '*[^0-9]*'),
	CONSTRAINT "ai_reply_outbox_response_mode_valid" CHECK("ai_reply_outbox"."response_mode" in ('automatic', 'agent-approval')),
	CONSTRAINT "ai_reply_outbox_reply_text_bounded" CHECK(length(trim("ai_reply_outbox"."reply_text")) between 1 and 4096),
	CONSTRAINT "ai_reply_outbox_sources_json_valid" CHECK(length("ai_reply_outbox"."grounded_source_keys_json") between 2 and 100000
        and json_valid("ai_reply_outbox"."grounded_source_keys_json")
        and json_type("ai_reply_outbox"."grounded_source_keys_json") = 'array'
        and json_array_length("ai_reply_outbox"."grounded_source_keys_json") between 1 and 100),
	CONSTRAINT "ai_reply_outbox_grounding_valid" CHECK("ai_reply_outbox"."grounding_score_basis_points" between 0 and 10000),
	CONSTRAINT "ai_reply_outbox_status_valid" CHECK("ai_reply_outbox"."status" in ('awaiting-approval', 'ready-for-delivery', 'rejected')),
	CONSTRAINT "ai_reply_outbox_decider_bounded" CHECK("ai_reply_outbox"."decided_by_external_user_id" is null
        or length(trim("ai_reply_outbox"."decided_by_external_user_id")) between 1 and 255),
	CONSTRAINT "ai_reply_outbox_version_positive" CHECK("ai_reply_outbox"."version" >= 1),
	CONSTRAINT "ai_reply_outbox_state_consistent" CHECK((
        "ai_reply_outbox"."response_mode" = 'automatic'
        and "ai_reply_outbox"."status" = 'ready-for-delivery'
        and "ai_reply_outbox"."decided_by_external_user_id" is null
        and "ai_reply_outbox"."decided_at" is null
        and "ai_reply_outbox"."version" = 1
      ) or (
        "ai_reply_outbox"."response_mode" = 'agent-approval'
        and "ai_reply_outbox"."status" = 'awaiting-approval'
        and "ai_reply_outbox"."decided_by_external_user_id" is null
        and "ai_reply_outbox"."decided_at" is null
        and "ai_reply_outbox"."version" = 1
      ) or (
        "ai_reply_outbox"."response_mode" = 'agent-approval'
        and "ai_reply_outbox"."status" in ('ready-for-delivery', 'rejected')
        and "ai_reply_outbox"."decided_by_external_user_id" is not null
        and "ai_reply_outbox"."decided_at" is not null
        and "ai_reply_outbox"."version" >= 2
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_reply_outbox_tenant_key_uq` ON `ai_reply_outbox` (`tenant_id`,`outbox_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_reply_outbox_tenant_request_uq` ON `ai_reply_outbox` (`tenant_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_reply_outbox_tenant_inbound_uq` ON `ai_reply_outbox` (`tenant_id`,`inbound_message_key`);--> statement-breakpoint
CREATE INDEX `ai_reply_outbox_tenant_status_created_idx` ON `ai_reply_outbox` (`tenant_id`,`status`,`created_at`);