CREATE TABLE `knowledge_passages` (
	`passage_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`source_key` text NOT NULL,
	`passage_ordinal` integer NOT NULL,
	`content_sha256` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`,`source_key`) REFERENCES `knowledge_sources`(`tenant_id`,`source_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "knowledge_passages_key_sha256" CHECK(length("knowledge_passages"."passage_key") = 85
        and substr("knowledge_passages"."passage_key", 1, 21) = 'knowledge_passage_v1_'
        and substr("knowledge_passages"."passage_key", 22) not glob '*[^0-9a-f]*'),
	CONSTRAINT "knowledge_passages_source_key_sha256" CHECK(length("knowledge_passages"."source_key") = 84
        and substr("knowledge_passages"."source_key", 1, 20) = 'knowledge_source_v1_'
        and substr("knowledge_passages"."source_key", 21) not glob '*[^0-9a-f]*'),
	CONSTRAINT "knowledge_passages_ordinal_positive" CHECK("knowledge_passages"."passage_ordinal" >= 1),
	CONSTRAINT "knowledge_passages_digest_sha256" CHECK(length("knowledge_passages"."content_sha256") = 64
        and "knowledge_passages"."content_sha256" not glob '*[^0-9a-f]*'),
	CONSTRAINT "knowledge_passages_content_bounded" CHECK(length(trim("knowledge_passages"."content")) between 1 and 16384)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_passages_tenant_key_uq` ON `knowledge_passages` (`tenant_id`,`passage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_passages_tenant_source_ordinal_uq` ON `knowledge_passages` (`tenant_id`,`source_key`,`passage_ordinal`);--> statement-breakpoint
CREATE INDEX `knowledge_passages_tenant_source_idx` ON `knowledge_passages` (`tenant_id`,`source_key`,`passage_ordinal`);