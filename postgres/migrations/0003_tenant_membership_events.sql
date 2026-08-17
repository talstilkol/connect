-- PostgreSQL membership lifecycle ledger for Railway team mutations.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE tenant_membership_events (
  event_key TEXT PRIMARY KEY,
  operation_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  target_external_user_id TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT tenant_membership_events_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT tenant_membership_events_event_key_valid
    CHECK (
      event_key ~ '^tenant_membership_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT tenant_membership_events_operation_key_valid
    CHECK (
      operation_key ~ '^tenant_membership_operation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT tenant_membership_events_target_valid
    CHECK (
      length(target_external_user_id) BETWEEN 1 AND 512
      AND target_external_user_id = btrim(target_external_user_id)
      AND target_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT tenant_membership_events_actor_valid
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 512
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT tenant_membership_events_type_valid
    CHECK (
      event_type IN (
        'role-changed',
        'suspended',
        'reactivated',
        'owner-transfer-out',
        'owner-transfer-in'
      )
    ),
  CONSTRAINT tenant_membership_events_from_role_valid
    CHECK (from_role IN ('owner', 'manager', 'agent', 'viewer')),
  CONSTRAINT tenant_membership_events_to_role_valid
    CHECK (to_role IN ('owner', 'manager', 'agent', 'viewer')),
  CONSTRAINT tenant_membership_events_from_status_valid
    CHECK (from_status IN ('active', 'suspended')),
  CONSTRAINT tenant_membership_events_to_status_valid
    CHECK (to_status IN ('active', 'suspended')),
  CONSTRAINT tenant_membership_events_version_transition
    CHECK (from_version >= 1 AND to_version = from_version + 1),
  CONSTRAINT tenant_membership_events_state_changed
    CHECK (from_role <> to_role OR from_status <> to_status),
  CONSTRAINT tenant_membership_events_shape_valid
    CHECK (
      (
        event_type = 'role-changed'
        AND from_role <> to_role
        AND from_status = to_status
      ) OR (
        event_type = 'suspended'
        AND from_role = to_role
        AND from_status = 'active'
        AND to_status = 'suspended'
      ) OR (
        event_type = 'reactivated'
        AND from_role = to_role
        AND from_status = 'suspended'
        AND to_status = 'active'
      ) OR (
        event_type = 'owner-transfer-out'
        AND from_role = 'owner'
        AND to_role <> 'owner'
        AND from_status = 'active'
        AND to_status = 'active'
      ) OR (
        event_type = 'owner-transfer-in'
        AND from_role <> 'owner'
        AND to_role = 'owner'
        AND from_status = 'active'
        AND to_status = 'active'
      )
    ),
  CONSTRAINT tenant_membership_events_occurred_at_milliseconds
    CHECK (occurred_at = date_trunc('milliseconds', occurred_at)),
  CONSTRAINT tenant_membership_events_operation_target_uq
    UNIQUE (operation_key, target_external_user_id)
);

CREATE INDEX tenant_membership_events_tenant_occurred_idx
  ON tenant_membership_events (tenant_id, occurred_at);

CREATE FUNCTION reject_tenant_membership_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION
    USING
      ERRCODE = '55000',
      MESSAGE = 'tenant membership events are immutable';
END;
$function$;

CREATE TRIGGER tenant_membership_events_update_delete_guard
BEFORE UPDATE OR DELETE
ON tenant_membership_events
FOR EACH ROW
EXECUTE FUNCTION reject_tenant_membership_event_mutation();

CREATE FUNCTION enforce_tenant_membership_event_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM tenant_memberships
    WHERE tenant_id = NEW.tenant_id
      AND external_user_id = NEW.target_external_user_id
      AND role = NEW.to_role
      AND status = NEW.to_status
      AND version = NEW.to_version
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'tenant membership event does not match persisted state';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER tenant_membership_events_state_guard
BEFORE INSERT
ON tenant_membership_events
FOR EACH ROW
EXECUTE FUNCTION enforce_tenant_membership_event_state();

CREATE FUNCTION enforce_tenant_active_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  removes_active_owner BOOLEAN := FALSE;
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active' THEN
    IF TG_OP = 'DELETE' THEN
      removes_active_owner := TRUE;
    ELSIF TG_OP = 'UPDATE' THEN
      removes_active_owner :=
        NEW.role <> 'owner' OR NEW.status <> 'active';
    END IF;

    IF removes_active_owner THEN
      IF NOT EXISTS (
        SELECT 1
        FROM tenant_memberships
        WHERE tenant_id = OLD.tenant_id
          AND external_user_id <> OLD.external_user_id
          AND role = 'owner'
          AND status = 'active'
      ) THEN
        RAISE EXCEPTION
          USING
            ERRCODE = '23514',
            MESSAGE = 'tenant requires at least one active owner';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER tenant_memberships_last_owner_update_guard
BEFORE UPDATE OF role, status
ON tenant_memberships
FOR EACH ROW
EXECUTE FUNCTION enforce_tenant_active_owner();

CREATE TRIGGER tenant_memberships_last_owner_delete_guard
BEFORE DELETE
ON tenant_memberships
FOR EACH ROW
EXECUTE FUNCTION enforce_tenant_active_owner();
