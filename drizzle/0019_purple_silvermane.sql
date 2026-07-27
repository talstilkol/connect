CREATE TABLE `tenant_subscription_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`previous_ends_at` text,
	`new_ends_at` text NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`subscription_version` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant_subscriptions`(`tenant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tenant_subscription_events_key_sha256" CHECK(length("tenant_subscription_events"."event_key") = 93
          and substr("tenant_subscription_events"."event_key", 1, 29)
            = 'tenant_subscription_event_v1_'
          and substr("tenant_subscription_events"."event_key", 30)
            not glob '*[^0-9a-f]*'),
	CONSTRAINT "tenant_subscription_events_type_valid" CHECK("tenant_subscription_events"."event_type" in ('created', 'extended', 'status-changed', 'cancelled')),
	CONSTRAINT "tenant_subscription_events_status_valid" CHECK("tenant_subscription_events"."to_status" in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')
          and (
            "tenant_subscription_events"."from_status" is null
            or "tenant_subscription_events"."from_status" in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')
          )),
	CONSTRAINT "tenant_subscription_events_previous_end_canonical" CHECK("tenant_subscription_events"."previous_ends_at" is null
          or (
            length("tenant_subscription_events"."previous_ends_at") = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscription_events"."previous_ends_at")
              = "tenant_subscription_events"."previous_ends_at"
          )),
	CONSTRAINT "tenant_subscription_events_new_end_canonical" CHECK(length("tenant_subscription_events"."new_ends_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscription_events"."new_ends_at")
            = "tenant_subscription_events"."new_ends_at"),
	CONSTRAINT "tenant_subscription_events_actor_bounded" CHECK(length(trim("tenant_subscription_events"."actor_external_user_id")) between 1 and 255),
	CONSTRAINT "tenant_subscription_events_version_positive" CHECK("tenant_subscription_events"."subscription_version" >= 1),
	CONSTRAINT "tenant_subscription_events_occurred_at_canonical" CHECK(length("tenant_subscription_events"."occurred_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscription_events"."occurred_at")
            = "tenant_subscription_events"."occurred_at"),
	CONSTRAINT "tenant_subscription_events_state_consistent" CHECK((
          "tenant_subscription_events"."event_type" = 'created'
          and "tenant_subscription_events"."from_status" is null
          and "tenant_subscription_events"."to_status" in ('trial', 'active')
          and "tenant_subscription_events"."previous_ends_at" is null
          and "tenant_subscription_events"."subscription_version" = 1
        ) or (
          "tenant_subscription_events"."event_type" = 'extended'
          and "tenant_subscription_events"."from_status" = "tenant_subscription_events"."to_status"
          and "tenant_subscription_events"."previous_ends_at" is not null
          and unixepoch("tenant_subscription_events"."previous_ends_at") < unixepoch("tenant_subscription_events"."new_ends_at")
          and "tenant_subscription_events"."subscription_version" >= 2
        ) or (
          "tenant_subscription_events"."event_type" = 'status-changed'
          and "tenant_subscription_events"."from_status" is not null
          and "tenant_subscription_events"."from_status" <> "tenant_subscription_events"."to_status"
          and "tenant_subscription_events"."to_status" in ('active', 'suspended', 'blocked')
          and "tenant_subscription_events"."previous_ends_at" = "tenant_subscription_events"."new_ends_at"
          and "tenant_subscription_events"."subscription_version" >= 2
        ) or (
          "tenant_subscription_events"."event_type" = 'cancelled'
          and "tenant_subscription_events"."from_status" is not null
          and "tenant_subscription_events"."from_status" <> 'cancelled'
          and "tenant_subscription_events"."to_status" = 'cancelled'
          and "tenant_subscription_events"."previous_ends_at" = "tenant_subscription_events"."new_ends_at"
          and "tenant_subscription_events"."subscription_version" >= 2
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_subscription_events_tenant_version_uq` ON `tenant_subscription_events` (`tenant_id`,`subscription_version`);--> statement-breakpoint
CREATE INDEX `tenant_subscription_events_tenant_occurred_idx` ON `tenant_subscription_events` (`tenant_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `tenant_subscriptions` (
	`tenant_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`cancelled_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tenant_subscriptions_status_valid" CHECK("tenant_subscriptions"."status" in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')),
	CONSTRAINT "tenant_subscriptions_starts_at_canonical" CHECK(length("tenant_subscriptions"."starts_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscriptions"."starts_at")
            = "tenant_subscriptions"."starts_at"),
	CONSTRAINT "tenant_subscriptions_ends_at_canonical" CHECK(length("tenant_subscriptions"."ends_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscriptions"."ends_at")
            = "tenant_subscriptions"."ends_at"),
	CONSTRAINT "tenant_subscriptions_window_valid" CHECK(unixepoch("tenant_subscriptions"."starts_at") < unixepoch("tenant_subscriptions"."ends_at")),
	CONSTRAINT "tenant_subscriptions_cancelled_at_canonical" CHECK("tenant_subscriptions"."cancelled_at" is null
          or (
            length("tenant_subscriptions"."cancelled_at") = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_subscriptions"."cancelled_at")
              = "tenant_subscriptions"."cancelled_at"
          )),
	CONSTRAINT "tenant_subscriptions_version_positive" CHECK("tenant_subscriptions"."version" >= 1),
	CONSTRAINT "tenant_subscriptions_cancelled_state_consistent" CHECK((
          "tenant_subscriptions"."status" = 'cancelled'
          and "tenant_subscriptions"."cancelled_at" is not null
        ) or (
          "tenant_subscriptions"."status" <> 'cancelled'
          and "tenant_subscriptions"."cancelled_at" is null
        ))
);
--> statement-breakpoint
CREATE INDEX `tenant_subscriptions_status_ends_idx` ON `tenant_subscriptions` (`status`,`ends_at`);