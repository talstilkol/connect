CREATE TABLE `tenant_membership_events` (
	`event_key` text PRIMARY KEY NOT NULL,
	`operation_key` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`target_external_user_id` text NOT NULL,
	`actor_external_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_role` text NOT NULL,
	`to_role` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`from_version` integer NOT NULL,
	`to_version` integer NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tenant_membership_events_event_key_valid" CHECK(length("tenant_membership_events"."event_key") = 91
          and "tenant_membership_events"."event_key" glob 'tenant_membership_event_v1_[0-9a-f]*'
          and substr("tenant_membership_events"."event_key", 28) not glob '*[^0-9a-f]*'),
	CONSTRAINT "tenant_membership_events_operation_key_valid" CHECK(length("tenant_membership_events"."operation_key") = 95
          and "tenant_membership_events"."operation_key" glob 'tenant_membership_operation_v1_[0-9a-f]*'
          and substr("tenant_membership_events"."operation_key", 32) not glob '*[^0-9a-f]*'),
	CONSTRAINT "tenant_membership_events_target_not_blank" CHECK(length(trim("tenant_membership_events"."target_external_user_id")) > 0),
	CONSTRAINT "tenant_membership_events_actor_not_blank" CHECK(length(trim("tenant_membership_events"."actor_external_user_id")) > 0),
	CONSTRAINT "tenant_membership_events_type_valid" CHECK("tenant_membership_events"."event_type" in ('role-changed', 'suspended', 'reactivated', 'owner-transfer-out', 'owner-transfer-in')),
	CONSTRAINT "tenant_membership_events_from_role_valid" CHECK("tenant_membership_events"."from_role" in ('owner', 'manager', 'agent', 'viewer')),
	CONSTRAINT "tenant_membership_events_to_role_valid" CHECK("tenant_membership_events"."to_role" in ('owner', 'manager', 'agent', 'viewer')),
	CONSTRAINT "tenant_membership_events_from_status_valid" CHECK("tenant_membership_events"."from_status" in ('active', 'suspended')),
	CONSTRAINT "tenant_membership_events_to_status_valid" CHECK("tenant_membership_events"."to_status" in ('active', 'suspended')),
	CONSTRAINT "tenant_membership_events_version_transition" CHECK("tenant_membership_events"."from_version" >= 1
          and "tenant_membership_events"."to_version" = "tenant_membership_events"."from_version" + 1),
	CONSTRAINT "tenant_membership_events_state_changed" CHECK("tenant_membership_events"."from_role" <> "tenant_membership_events"."to_role"
          or "tenant_membership_events"."from_status" <> "tenant_membership_events"."to_status"),
	CONSTRAINT "tenant_membership_events_shape_valid" CHECK((
            "tenant_membership_events"."event_type" = 'role-changed'
            and "tenant_membership_events"."from_role" <> "tenant_membership_events"."to_role"
            and "tenant_membership_events"."from_status" = "tenant_membership_events"."to_status"
          ) or (
            "tenant_membership_events"."event_type" = 'suspended'
            and "tenant_membership_events"."from_role" = "tenant_membership_events"."to_role"
            and "tenant_membership_events"."from_status" = 'active'
            and "tenant_membership_events"."to_status" = 'suspended'
          ) or (
            "tenant_membership_events"."event_type" = 'reactivated'
            and "tenant_membership_events"."from_role" = "tenant_membership_events"."to_role"
            and "tenant_membership_events"."from_status" = 'suspended'
            and "tenant_membership_events"."to_status" = 'active'
          ) or (
            "tenant_membership_events"."event_type" = 'owner-transfer-out'
            and "tenant_membership_events"."from_role" = 'owner'
            and "tenant_membership_events"."to_role" <> 'owner'
            and "tenant_membership_events"."from_status" = 'active'
            and "tenant_membership_events"."to_status" = 'active'
          ) or (
            "tenant_membership_events"."event_type" = 'owner-transfer-in'
            and "tenant_membership_events"."from_role" <> 'owner'
            and "tenant_membership_events"."to_role" = 'owner'
            and "tenant_membership_events"."from_status" = 'active'
            and "tenant_membership_events"."to_status" = 'active'
          )),
	CONSTRAINT "tenant_membership_events_occurred_at_canonical" CHECK(length("tenant_membership_events"."occurred_at") = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', "tenant_membership_events"."occurred_at")
            = "tenant_membership_events"."occurred_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_membership_events_operation_target_uq` ON `tenant_membership_events` (`operation_key`,`target_external_user_id`);--> statement-breakpoint
CREATE INDEX `tenant_membership_events_tenant_occurred_idx` ON `tenant_membership_events` (`tenant_id`,`occurred_at`);--> statement-breakpoint
ALTER TABLE `tenant_memberships`
ADD COLUMN `version` integer
DEFAULT 1 NOT NULL
CONSTRAINT "tenant_memberships_version_positive"
CHECK (`version` >= 1);--> statement-breakpoint
CREATE TRIGGER `tenant_memberships_state_version_guard`
BEFORE UPDATE OF `role`, `status`, `version`
ON `tenant_memberships`
FOR EACH ROW
WHEN (
  (
    NEW.`role` <> OLD.`role`
    OR NEW.`status` <> OLD.`status`
  )
  AND NEW.`version` <> OLD.`version` + 1
) OR (
  NEW.`role` = OLD.`role`
  AND NEW.`status` = OLD.`status`
  AND NEW.`version` <> OLD.`version`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant membership state requires an exact version transition'
  );
END;--> statement-breakpoint
CREATE TRIGGER `tenant_memberships_last_owner_update_guard`
BEFORE UPDATE OF `role`, `status`
ON `tenant_memberships`
FOR EACH ROW
WHEN OLD.`role` = 'owner'
  AND OLD.`status` = 'active'
  AND (
    NEW.`role` <> 'owner'
    OR NEW.`status` <> 'active'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `tenant_memberships`
    WHERE `tenant_id` = OLD.`tenant_id`
      AND `external_user_id` <> OLD.`external_user_id`
      AND `role` = 'owner'
      AND `status` = 'active'
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant requires at least one active owner'
  );
END;--> statement-breakpoint
CREATE TRIGGER `tenant_memberships_last_owner_delete_guard`
BEFORE DELETE ON `tenant_memberships`
FOR EACH ROW
WHEN OLD.`role` = 'owner'
  AND OLD.`status` = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM `tenant_memberships`
    WHERE `tenant_id` = OLD.`tenant_id`
      AND `external_user_id` <> OLD.`external_user_id`
      AND `role` = 'owner'
      AND `status` = 'active'
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant requires at least one active owner'
  );
END;--> statement-breakpoint
CREATE TRIGGER `tenant_membership_events_state_guard`
BEFORE INSERT ON `tenant_membership_events`
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM `tenant_memberships`
  WHERE `tenant_id` = NEW.`tenant_id`
    AND `external_user_id` =
      NEW.`target_external_user_id`
    AND `role` = NEW.`to_role`
    AND `status` = NEW.`to_status`
    AND `version` = NEW.`to_version`
)
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant membership event does not match persisted state'
  );
END;--> statement-breakpoint
CREATE TRIGGER `tenant_membership_events_update_guard`
BEFORE UPDATE ON `tenant_membership_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant membership events are immutable'
  );
END;--> statement-breakpoint
CREATE TRIGGER `tenant_membership_events_delete_guard`
BEFORE DELETE ON `tenant_membership_events`
BEGIN
  SELECT RAISE(
    ABORT,
    'tenant membership events are immutable'
  );
END;
