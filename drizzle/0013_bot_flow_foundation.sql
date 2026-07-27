CREATE TABLE `bot_flow_versions` (
	`bot_flow_version_key` text PRIMARY KEY NOT NULL,
	`bot_flow_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`version_number` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`bot_flow_key`) REFERENCES `bot_flows`(`tenant_id`,`bot_flow_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "bot_flow_versions_key_sha256" CHECK(length("bot_flow_versions"."bot_flow_version_key") = 84
        and substr("bot_flow_versions"."bot_flow_version_key", 1, 20) = 'bot_flow_version_v1_'
        and substr("bot_flow_versions"."bot_flow_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_flow_versions_flow_key_sha256" CHECK(length("bot_flow_versions"."bot_flow_key") = 76
        and substr("bot_flow_versions"."bot_flow_key", 1, 12) = 'bot_flow_v1_'
        and substr("bot_flow_versions"."bot_flow_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_flow_versions_number_positive" CHECK("bot_flow_versions"."version_number" >= 1),
	CONSTRAINT "bot_flow_versions_status_valid" CHECK("bot_flow_versions"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "bot_flow_versions_definition_json_valid" CHECK(length("bot_flow_versions"."definition_json") between 2 and 1000000
        and json_valid("bot_flow_versions"."definition_json")),
	CONSTRAINT "bot_flow_versions_publication_consistent" CHECK((
        "bot_flow_versions"."status" = 'draft'
        and "bot_flow_versions"."published_at" is null
      ) or (
        "bot_flow_versions"."status" in ('published', 'archived')
        and "bot_flow_versions"."published_at" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_flow_versions_tenant_key_uq` ON `bot_flow_versions` (`tenant_id`,`bot_flow_version_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_flow_versions_tenant_number_uq` ON `bot_flow_versions` (`tenant_id`,`bot_flow_key`,`version_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_flow_versions_one_published_uq` ON `bot_flow_versions` (`tenant_id`,`bot_flow_key`) WHERE "bot_flow_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX `bot_flow_versions_tenant_flow_idx` ON `bot_flow_versions` (`tenant_id`,`bot_flow_key`,`version_number`);--> statement-breakpoint
CREATE TABLE `bot_flows` (
	`bot_flow_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`latest_version_key` text NOT NULL,
	`latest_version_number` integer NOT NULL,
	`active_version_key` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "bot_flows_key_sha256" CHECK(length("bot_flows"."bot_flow_key") = 76
        and substr("bot_flows"."bot_flow_key", 1, 12) = 'bot_flow_v1_'
        and substr("bot_flows"."bot_flow_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_flows_name_bounded" CHECK(length(trim("bot_flows"."name")) between 1 and 160),
	CONSTRAINT "bot_flows_status_valid" CHECK("bot_flows"."status" in ('draft', 'active', 'inactive')),
	CONSTRAINT "bot_flows_latest_version_key_sha256" CHECK(length("bot_flows"."latest_version_key") = 84
        and substr("bot_flows"."latest_version_key", 1, 20) = 'bot_flow_version_v1_'
        and substr("bot_flows"."latest_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "bot_flows_active_version_key_sha256" CHECK("bot_flows"."active_version_key" is null
        or (
          length("bot_flows"."active_version_key") = 84
          and substr("bot_flows"."active_version_key", 1, 20) = 'bot_flow_version_v1_'
          and substr("bot_flows"."active_version_key", 21) not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "bot_flows_active_state_consistent" CHECK((
        "bot_flows"."status" = 'draft'
        and "bot_flows"."active_version_key" is null
      ) or (
        "bot_flows"."status" in ('active', 'inactive')
        and "bot_flows"."active_version_key" is not null
      )),
	CONSTRAINT "bot_flows_latest_version_positive" CHECK("bot_flows"."latest_version_number" >= 1),
	CONSTRAINT "bot_flows_version_positive" CHECK("bot_flows"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_flows_tenant_key_uq` ON `bot_flows` (`tenant_id`,`bot_flow_key`);--> statement-breakpoint
CREATE INDEX `bot_flows_tenant_status_updated_idx` ON `bot_flows` (`tenant_id`,`status`,`updated_at`);