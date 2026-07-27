CREATE TABLE `ai_agent_version_sources` (
	`tenant_id` integer NOT NULL,
	`ai_agent_version_key` text NOT NULL,
	`source_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`ai_agent_version_key`, `source_key`),
	FOREIGN KEY (`tenant_id`,`ai_agent_version_key`) REFERENCES `ai_agent_versions`(`tenant_id`,`ai_agent_version_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`source_key`) REFERENCES `knowledge_sources`(`tenant_id`,`source_key`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ai_agent_version_sources_tenant_version_idx` ON `ai_agent_version_sources` (`tenant_id`,`ai_agent_version_key`);--> statement-breakpoint
CREATE INDEX `ai_agent_version_sources_tenant_source_idx` ON `ai_agent_version_sources` (`tenant_id`,`source_key`);--> statement-breakpoint
CREATE TABLE `ai_agent_versions` (
	`ai_agent_version_key` text PRIMARY KEY NOT NULL,
	`ai_agent_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`version_number` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`ai_agent_key`) REFERENCES `ai_agents`(`tenant_id`,`ai_agent_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_agent_versions_key_sha256" CHECK(length("ai_agent_versions"."ai_agent_version_key") = 84
        and substr("ai_agent_versions"."ai_agent_version_key", 1, 20) = 'ai_agent_version_v1_'
        and substr("ai_agent_versions"."ai_agent_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_agent_versions_agent_key_sha256" CHECK(length("ai_agent_versions"."ai_agent_key") = 76
        and substr("ai_agent_versions"."ai_agent_key", 1, 12) = 'ai_agent_v1_'
        and substr("ai_agent_versions"."ai_agent_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_agent_versions_number_positive" CHECK("ai_agent_versions"."version_number" >= 1),
	CONSTRAINT "ai_agent_versions_status_valid" CHECK("ai_agent_versions"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "ai_agent_versions_definition_json_valid" CHECK(length("ai_agent_versions"."definition_json") between 2 and 1000000
        and json_valid("ai_agent_versions"."definition_json")),
	CONSTRAINT "ai_agent_versions_publication_consistent" CHECK((
        "ai_agent_versions"."status" = 'draft'
        and "ai_agent_versions"."published_at" is null
      ) or (
        "ai_agent_versions"."status" in ('published', 'archived')
        and "ai_agent_versions"."published_at" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agent_versions_tenant_key_uq` ON `ai_agent_versions` (`tenant_id`,`ai_agent_version_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agent_versions_tenant_number_uq` ON `ai_agent_versions` (`tenant_id`,`ai_agent_key`,`version_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agent_versions_one_published_uq` ON `ai_agent_versions` (`tenant_id`,`ai_agent_key`) WHERE "ai_agent_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX `ai_agent_versions_tenant_agent_idx` ON `ai_agent_versions` (`tenant_id`,`ai_agent_key`,`version_number`);--> statement-breakpoint
CREATE TABLE `ai_agents` (
	`ai_agent_key` text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "ai_agents_key_sha256" CHECK(length("ai_agents"."ai_agent_key") = 76
        and substr("ai_agents"."ai_agent_key", 1, 12) = 'ai_agent_v1_'
        and substr("ai_agents"."ai_agent_key", 13) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_agents_name_bounded" CHECK(length(trim("ai_agents"."name")) between 1 and 160),
	CONSTRAINT "ai_agents_status_valid" CHECK("ai_agents"."status" in ('draft', 'active', 'inactive')),
	CONSTRAINT "ai_agents_latest_version_key_sha256" CHECK(length("ai_agents"."latest_version_key") = 84
        and substr("ai_agents"."latest_version_key", 1, 20) = 'ai_agent_version_v1_'
        and substr("ai_agents"."latest_version_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "ai_agents_active_version_key_sha256" CHECK("ai_agents"."active_version_key" is null
        or (
          length("ai_agents"."active_version_key") = 84
          and substr("ai_agents"."active_version_key", 1, 20) = 'ai_agent_version_v1_'
          and substr("ai_agents"."active_version_key", 21) not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "ai_agents_active_state_consistent" CHECK((
        "ai_agents"."status" = 'draft'
        and "ai_agents"."active_version_key" is null
      ) or (
        "ai_agents"."status" in ('active', 'inactive')
        and "ai_agents"."active_version_key" is not null
      )),
	CONSTRAINT "ai_agents_latest_version_positive" CHECK("ai_agents"."latest_version_number" >= 1),
	CONSTRAINT "ai_agents_version_positive" CHECK("ai_agents"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agents_tenant_key_uq` ON `ai_agents` (`tenant_id`,`ai_agent_key`);--> statement-breakpoint
CREATE INDEX `ai_agents_tenant_status_updated_idx` ON `ai_agents` (`tenant_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `knowledge_sources` (
	`source_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`content_sha256` text NOT NULL,
	`file_name` text NOT NULL,
	`media_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_object_key` text NOT NULL,
	`status` text DEFAULT 'pending-validation' NOT NULL,
	`last_error_code` text,
	`ready_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "knowledge_sources_key_sha256" CHECK(length("knowledge_sources"."source_key") = 84
        and substr("knowledge_sources"."source_key", 1, 20) = 'knowledge_source_v1_'
        and substr("knowledge_sources"."source_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "knowledge_sources_digest_sha256" CHECK(length("knowledge_sources"."content_sha256") = 64
        and "knowledge_sources"."content_sha256" not glob '*[^0-9a-f]*'),
	CONSTRAINT "knowledge_sources_file_name_bounded" CHECK(length(trim("knowledge_sources"."file_name")) between 1 and 512),
	CONSTRAINT "knowledge_sources_media_type_bounded" CHECK(length(trim("knowledge_sources"."media_type")) between 3 and 255),
	CONSTRAINT "knowledge_sources_size_positive" CHECK("knowledge_sources"."size_bytes" between 1 and 9007199254740991),
	CONSTRAINT "knowledge_sources_object_key_bounded" CHECK(length("knowledge_sources"."storage_object_key") between 1 and 1024),
	CONSTRAINT "knowledge_sources_status_valid" CHECK("knowledge_sources"."status" in ('pending-upload', 'pending-validation', 'pending-scan', 'scanning', 'ready', 'rejected', 'archived')),
	CONSTRAINT "knowledge_sources_error_code_valid" CHECK("knowledge_sources"."last_error_code" is null
        or (
          length("knowledge_sources"."last_error_code") between 1 and 100
          and "knowledge_sources"."last_error_code" not glob '*[^A-Z0-9_]*'
        )),
	CONSTRAINT "knowledge_sources_state_consistent" CHECK((
        "knowledge_sources"."status" in ('pending-upload', 'pending-validation', 'pending-scan', 'scanning')
        and "knowledge_sources"."last_error_code" is null
        and "knowledge_sources"."ready_at" is null
      ) or (
        "knowledge_sources"."status" = 'ready'
        and "knowledge_sources"."last_error_code" is null
        and "knowledge_sources"."ready_at" is not null
      ) or (
        "knowledge_sources"."status" = 'rejected'
        and "knowledge_sources"."last_error_code" is not null
        and "knowledge_sources"."ready_at" is null
      ) or (
        "knowledge_sources"."status" = 'archived'
        and not (
          "knowledge_sources"."last_error_code" is not null
          and "knowledge_sources"."ready_at" is not null
        )
      )),
	CONSTRAINT "knowledge_sources_version_positive" CHECK("knowledge_sources"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_sources_tenant_key_uq` ON `knowledge_sources` (`tenant_id`,`source_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_sources_tenant_digest_uq` ON `knowledge_sources` (`tenant_id`,`content_sha256`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_sources_storage_key_uq` ON `knowledge_sources` (`storage_object_key`);--> statement-breakpoint
CREATE INDEX `knowledge_sources_tenant_status_updated_idx` ON `knowledge_sources` (`tenant_id`,`status`,`updated_at`);