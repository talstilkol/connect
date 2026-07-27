CREATE TABLE `ai_runtime_audit_events` (
	`audit_key` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`conversation_key` text NOT NULL,
	`inbound_message_key` text NOT NULL,
	`ai_agent_key` text NOT NULL,
	`ai_agent_version_key` text NOT NULL,
	`expected_conversation_version` integer NOT NULL,
	`outcome` text NOT NULL,
	`reason` text,
	`response_mode` text NOT NULL,
	`grounding_score_basis_points` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_minor_units` integer,
	`currency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`conversation_key`) REFERENCES `conversations`(`tenant_id`,`conversation_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`inbound_message_key`) REFERENCES `messages`(`tenant_id`,`message_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`ai_agent_key`) REFERENCES `ai_agents`(`tenant_id`,`ai_agent_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`ai_agent_version_key`) REFERENCES `ai_agent_versions`(`tenant_id`,`ai_agent_version_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_runtime_audit_events_audit_key_sha256" CHECK(length("ai_runtime_audit_events"."audit_key") = 84
        and substr("ai_runtime_audit_events"."audit_key", 1, 20) = 'ai_runtime_audit_v1_'
        and substr("ai_runtime_audit_events"."audit_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_request_key_sha256" CHECK(length("ai_runtime_audit_events"."request_key") = 87
        and substr("ai_runtime_audit_events"."request_key", 1, 23) = 'ai_provider_request_v1_'
        and substr("ai_runtime_audit_events"."request_key", 24) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_conversation_key_sha256" CHECK(length("ai_runtime_audit_events"."conversation_key") = 80
        and substr("ai_runtime_audit_events"."conversation_key", 1, 16) = 'conversation_v1_'
        and substr("ai_runtime_audit_events"."conversation_key", 17) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_message_key_sha256" CHECK(length("ai_runtime_audit_events"."inbound_message_key") = 75
        and substr("ai_runtime_audit_events"."inbound_message_key", 1, 11) = 'message_v1_'
        and substr("ai_runtime_audit_events"."inbound_message_key", 12) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_agent_key_sha256" CHECK(length("ai_runtime_audit_events"."ai_agent_key") = 76
        and substr("ai_runtime_audit_events"."ai_agent_key", 1, 12) = 'ai_agent_v1_'
        and substr("ai_runtime_audit_events"."ai_agent_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_version_key_sha256" CHECK(length("ai_runtime_audit_events"."ai_agent_version_key") = 84
        and substr("ai_runtime_audit_events"."ai_agent_version_key", 1, 20) = 'ai_agent_version_v1_'
        and substr("ai_runtime_audit_events"."ai_agent_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_audit_events_expected_version_positive" CHECK("ai_runtime_audit_events"."expected_conversation_version" >= 1),
	CONSTRAINT "ai_runtime_audit_events_outcome_valid" CHECK("ai_runtime_audit_events"."outcome" in ('reply-planned', 'handoff')),
	CONSTRAINT "ai_runtime_audit_events_reason_valid" CHECK("ai_runtime_audit_events"."reason" is null
        or "ai_runtime_audit_events"."reason" in (
          'customer-request',
          'no-approved-knowledge',
          'grounding-below-threshold',
          'provider-unavailable',
          'budget-exhausted',
          'policy-violation'
        )),
	CONSTRAINT "ai_runtime_audit_events_response_mode_valid" CHECK("ai_runtime_audit_events"."response_mode" in ('automatic', 'agent-approval')),
	CONSTRAINT "ai_runtime_audit_events_grounding_valid" CHECK("ai_runtime_audit_events"."grounding_score_basis_points" is null
        or "ai_runtime_audit_events"."grounding_score_basis_points" between 0 and 10000),
	CONSTRAINT "ai_runtime_audit_events_usage_valid" CHECK((
        "ai_runtime_audit_events"."input_tokens" is null
        and "ai_runtime_audit_events"."output_tokens" is null
        and "ai_runtime_audit_events"."cost_minor_units" is null
      ) or (
        "ai_runtime_audit_events"."input_tokens" between 0 and 9007199254740991
        and "ai_runtime_audit_events"."output_tokens" between 1 and 9007199254740991
        and "ai_runtime_audit_events"."cost_minor_units" between 0 and 9007199254740991
      )),
	CONSTRAINT "ai_runtime_audit_events_currency_valid" CHECK(length("ai_runtime_audit_events"."currency") = 3
        and "ai_runtime_audit_events"."currency" not glob '*[^A-Z]*'),
	CONSTRAINT "ai_runtime_audit_events_state_consistent" CHECK((
        "ai_runtime_audit_events"."outcome" = 'reply-planned'
        and "ai_runtime_audit_events"."reason" is null
        and "ai_runtime_audit_events"."grounding_score_basis_points" is not null
        and "ai_runtime_audit_events"."input_tokens" is not null
      ) or (
        "ai_runtime_audit_events"."outcome" = 'handoff'
        and "ai_runtime_audit_events"."reason" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runtime_audit_events_tenant_audit_uq` ON `ai_runtime_audit_events` (`tenant_id`,`audit_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runtime_audit_events_tenant_request_uq` ON `ai_runtime_audit_events` (`tenant_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `ai_runtime_audit_events_tenant_conversation_created_idx` ON `ai_runtime_audit_events` (`tenant_id`,`conversation_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_runtime_audit_events_tenant_agent_created_idx` ON `ai_runtime_audit_events` (`tenant_id`,`ai_agent_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_runtime_cost_authorizations` (
	`request_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`ai_agent_key` text NOT NULL,
	`period_start` text NOT NULL,
	`monthly_limit_minor_units` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`ai_agent_key`) REFERENCES `ai_agents`(`tenant_id`,`ai_agent_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_runtime_cost_authorizations_request_key_sha256" CHECK(length("ai_runtime_cost_authorizations"."request_key") = 87
          and substr("ai_runtime_cost_authorizations"."request_key", 1, 23) = 'ai_provider_request_v1_'
          and substr("ai_runtime_cost_authorizations"."request_key", 24) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_cost_authorizations_period_start_valid" CHECK(length("ai_runtime_cost_authorizations"."period_start") = 10
          and strftime('%Y-%m-01', "ai_runtime_cost_authorizations"."period_start") = "ai_runtime_cost_authorizations"."period_start"),
	CONSTRAINT "ai_runtime_cost_authorizations_limit_positive" CHECK("ai_runtime_cost_authorizations"."monthly_limit_minor_units" between 1 and 9007199254740991),
	CONSTRAINT "ai_runtime_cost_authorizations_currency_valid" CHECK(length("ai_runtime_cost_authorizations"."currency") = 3
          and "ai_runtime_cost_authorizations"."currency" not glob '*[^A-Z]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runtime_cost_authorizations_tenant_request_uq` ON `ai_runtime_cost_authorizations` (`tenant_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `ai_runtime_cost_authorizations_tenant_agent_period_idx` ON `ai_runtime_cost_authorizations` (`tenant_id`,`ai_agent_key`,`period_start`);--> statement-breakpoint
CREATE TABLE `ai_runtime_usage` (
	`request_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`ai_agent_key` text NOT NULL,
	`period_start` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_minor_units` integer NOT NULL,
	`currency` text NOT NULL,
	`within_limit` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`request_key`) REFERENCES `ai_runtime_cost_authorizations`(`tenant_id`,`request_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`ai_agent_key`) REFERENCES `ai_agents`(`tenant_id`,`ai_agent_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_runtime_usage_request_key_sha256" CHECK(length("ai_runtime_usage"."request_key") = 87
        and substr("ai_runtime_usage"."request_key", 1, 23) = 'ai_provider_request_v1_'
        and substr("ai_runtime_usage"."request_key", 24) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_runtime_usage_period_start_valid" CHECK(length("ai_runtime_usage"."period_start") = 10
        and strftime('%Y-%m-01', "ai_runtime_usage"."period_start") = "ai_runtime_usage"."period_start"),
	CONSTRAINT "ai_runtime_usage_input_tokens_nonnegative" CHECK("ai_runtime_usage"."input_tokens" between 0 and 9007199254740991),
	CONSTRAINT "ai_runtime_usage_output_tokens_positive" CHECK("ai_runtime_usage"."output_tokens" between 1 and 9007199254740991),
	CONSTRAINT "ai_runtime_usage_cost_nonnegative" CHECK("ai_runtime_usage"."cost_minor_units" between 0 and 9007199254740991),
	CONSTRAINT "ai_runtime_usage_currency_valid" CHECK(length("ai_runtime_usage"."currency") = 3
        and "ai_runtime_usage"."currency" not glob '*[^A-Z]*'),
	CONSTRAINT "ai_runtime_usage_within_limit_boolean" CHECK("ai_runtime_usage"."within_limit" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runtime_usage_tenant_request_uq` ON `ai_runtime_usage` (`tenant_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `ai_runtime_usage_tenant_agent_period_idx` ON `ai_runtime_usage` (`tenant_id`,`ai_agent_key`,`period_start`);