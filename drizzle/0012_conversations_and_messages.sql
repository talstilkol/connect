-- Stage 10: tenant-scoped conversations and normalized messages.
CREATE TABLE `conversations` (
	`conversation_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_external_user_id` text,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`last_message_key` text,
	`last_message_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`contact_id`) REFERENCES `contacts`(`tenant_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "conversations_key_sha256" CHECK(length("conversations"."conversation_key") = 80
        and substr("conversations"."conversation_key", 1, 16) = 'conversation_v1_'
        and substr("conversations"."conversation_key", 17) not glob '*[^0-9a-f]*'),
	CONSTRAINT "conversations_status_valid" CHECK("conversations"."status" in ('new', 'bot_active', 'waiting_for_agent', 'agent_active', 'waiting_for_contact', 'closed')),
	CONSTRAINT "conversations_assignee_bounded" CHECK("conversations"."assigned_external_user_id" is null
        or length(trim("conversations"."assigned_external_user_id")) between 1 and 255),
	CONSTRAINT "conversations_unread_count_nonnegative" CHECK("conversations"."unread_count" >= 0),
	CONSTRAINT "conversations_last_message_key_valid" CHECK("conversations"."last_message_key" is null
        or (
          length("conversations"."last_message_key") = 75
          and substr("conversations"."last_message_key", 1, 11) = 'message_v1_'
          and substr("conversations"."last_message_key", 12) not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "conversations_last_message_at_valid" CHECK("conversations"."last_message_at" is null
        or (
          length("conversations"."last_message_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "conversations"."last_message_at")
            = "conversations"."last_message_at"
        )),
	CONSTRAINT "conversations_last_message_pair_consistent" CHECK((
        "conversations"."last_message_key" is null
        and "conversations"."last_message_at" is null
      ) or (
        "conversations"."last_message_key" is not null
        and "conversations"."last_message_at" is not null
      )),
	CONSTRAINT "conversations_version_positive" CHECK("conversations"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_tenant_key_uq` ON `conversations` (`tenant_id`,`conversation_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_tenant_contact_uq` ON `conversations` (`tenant_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `conversations_tenant_status_activity_idx` ON `conversations` (`tenant_id`,`status`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`message_key` text PRIMARY KEY NOT NULL,
	`conversation_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`provider_message_id` text NOT NULL,
	`direction` text NOT NULL,
	`content_kind` text NOT NULL,
	`status` text NOT NULL,
	`text_content` text,
	`occurred_at` text NOT NULL,
	`status_updated_at` text NOT NULL,
	`last_status_event_key` text,
	`last_status_event_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`,`conversation_key`) REFERENCES `conversations`(`tenant_id`,`conversation_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "messages_key_sha256" CHECK(length("messages"."message_key") = 75
        and substr("messages"."message_key", 1, 11) = 'message_v1_'
        and substr("messages"."message_key", 12) not glob '*[^0-9a-f]*'),
	CONSTRAINT "messages_conversation_key_sha256" CHECK(length("messages"."conversation_key") = 80
        and substr("messages"."conversation_key", 1, 16) = 'conversation_v1_'
        and substr("messages"."conversation_key", 17) not glob '*[^0-9a-f]*'),
	CONSTRAINT "messages_provider_id_bounded" CHECK(length(trim("messages"."provider_message_id")) between 1 and 255),
	CONSTRAINT "messages_direction_valid" CHECK("messages"."direction" in ('inbound', 'outbound')),
	CONSTRAINT "messages_content_kind_valid" CHECK("messages"."content_kind" in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'interactive', 'unsupported')),
	CONSTRAINT "messages_status_valid" CHECK("messages"."status" in ('received', 'sent', 'delivered', 'read', 'failed')),
	CONSTRAINT "messages_direction_status_consistent" CHECK((
        "messages"."direction" = 'inbound'
        and "messages"."status" = 'received'
      ) or (
        "messages"."direction" = 'outbound'
        and "messages"."status" in ('sent', 'delivered', 'read', 'failed')
      )),
	CONSTRAINT "messages_content_consistent" CHECK((
        "messages"."content_kind" = 'text'
        and "messages"."text_content" is not null
        and length(trim("messages"."text_content")) between 1 and 16384
      ) or (
        "messages"."content_kind" <> 'text'
        and "messages"."text_content" is null
      )),
	CONSTRAINT "messages_occurred_at_valid" CHECK(length("messages"."occurred_at") = 24
        and strftime('%Y-%m-%dT%H:%M:%fZ', "messages"."occurred_at")
          = "messages"."occurred_at"),
	CONSTRAINT "messages_status_updated_at_valid" CHECK(length("messages"."status_updated_at") = 24
        and strftime('%Y-%m-%dT%H:%M:%fZ', "messages"."status_updated_at")
          = "messages"."status_updated_at"),
	CONSTRAINT "messages_status_event_key_valid" CHECK("messages"."last_status_event_key" is null
        or (
          length("messages"."last_status_event_key") = 64
          and "messages"."last_status_event_key" not glob '*[^0-9a-f]*'
        )),
	CONSTRAINT "messages_status_event_at_valid" CHECK("messages"."last_status_event_at" is null
        or (
          length("messages"."last_status_event_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "messages"."last_status_event_at")
            = "messages"."last_status_event_at"
        )),
	CONSTRAINT "messages_status_event_pair_consistent" CHECK((
        "messages"."last_status_event_key" is null
        and "messages"."last_status_event_at" is null
      ) or (
        "messages"."last_status_event_key" is not null
        and "messages"."last_status_event_at" is not null
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_tenant_key_uq` ON `messages` (`tenant_id`,`message_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_tenant_provider_id_uq` ON `messages` (`tenant_id`,`provider_message_id`);--> statement-breakpoint
CREATE INDEX `messages_tenant_conversation_time_idx` ON `messages` (`tenant_id`,`conversation_key`,`occurred_at`,`message_key`);
