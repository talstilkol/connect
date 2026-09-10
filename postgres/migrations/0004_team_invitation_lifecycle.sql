-- PostgreSQL team invitation lifecycle, delivery outbox, and acceptance ledger.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE team_invitations (
  invitation_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  normalized_email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  invited_by_external_user_id TEXT NOT NULL,
  last_actor_kind TEXT NOT NULL DEFAULT 'user',
  last_actor_external_user_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT team_invitations_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT team_invitations_key_valid
    CHECK (invitation_key ~ '^team_invitation_v1_[0-9a-f]{64}$'),
  CONSTRAINT team_invitations_email_normalized
    CHECK (
      length(normalized_email) BETWEEN 3 AND 254
      AND normalized_email = lower(btrim(normalized_email))
      AND normalized_email !~ '[[:cntrl:][:space:]]'
      AND normalized_email ~ '^[^@]+@[^@]+\.[^@]+$'
    ),
  CONSTRAINT team_invitations_role_valid
    CHECK (role IN ('manager', 'agent', 'viewer')),
  CONSTRAINT team_invitations_status_valid
    CHECK (status IN ('pending', 'revoked', 'expired')),
  CONSTRAINT team_invitations_version_positive
    CHECK (version >= 1),
  CONSTRAINT team_invitations_inviter_valid
    CHECK (
      length(invited_by_external_user_id) BETWEEN 1 AND 512
      AND invited_by_external_user_id = btrim(invited_by_external_user_id)
      AND invited_by_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT team_invitations_last_actor_valid
    CHECK (
      length(last_actor_external_user_id) BETWEEN 1 AND 512
      AND last_actor_external_user_id = btrim(last_actor_external_user_id)
      AND last_actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT team_invitations_last_actor_kind_valid
    CHECK (
      last_actor_kind = 'user'
      OR (
        last_actor_kind = 'system'
        AND status = 'expired'
        AND last_actor_external_user_id =
          'team-invitation-expiration-scheduler-v1'
      )
    ),
  CONSTRAINT team_invitations_requested_at_milliseconds
    CHECK (requested_at = date_trunc('milliseconds', requested_at)),
  CONSTRAINT team_invitations_expires_at_valid
    CHECK (
      expires_at = date_trunc('milliseconds', expires_at)
      AND expires_at > requested_at
    ),
  CONSTRAINT team_invitations_updated_at_valid
    CHECK (
      updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= requested_at
    ),
  CONSTRAINT team_invitations_tenant_email_uq
    UNIQUE (tenant_id, normalized_email),
  CONSTRAINT team_invitations_tenant_key_uq
    UNIQUE (tenant_id, invitation_key)
);

CREATE INDEX team_invitations_tenant_status_expiry_idx
  ON team_invitations (tenant_id, status, expires_at);

CREATE INDEX team_invitations_expiration_scan_idx
  ON team_invitations (status, expires_at, invitation_key);

CREATE TABLE team_invitation_events (
  event_key TEXT PRIMARY KEY,
  operation_key TEXT NOT NULL,
  invitation_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  actor_kind TEXT NOT NULL DEFAULT 'user',
  actor_external_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_role TEXT,
  to_role TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT team_invitation_events_invitation_fk
    FOREIGN KEY (tenant_id, invitation_key)
    REFERENCES team_invitations (tenant_id, invitation_key)
    ON DELETE RESTRICT,
  CONSTRAINT team_invitation_events_key_valid
    CHECK (event_key ~ '^team_invitation_event_v1_[0-9a-f]{64}$'),
  CONSTRAINT team_invitation_events_operation_key_valid
    CHECK (
      operation_key ~ '^team_invitation_operation_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT team_invitation_events_actor_valid
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 512
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT team_invitation_events_actor_kind_valid
    CHECK (
      actor_kind = 'user'
      OR (
        actor_kind = 'system'
        AND event_type = 'expired'
        AND actor_external_user_id =
          'team-invitation-expiration-scheduler-v1'
      )
    ),
  CONSTRAINT team_invitation_events_type_valid
    CHECK (
      event_type IN ('requested', 're-requested', 'revoked', 'expired')
    ),
  CONSTRAINT team_invitation_events_from_role_valid
    CHECK (
      from_role IS NULL
      OR from_role IN ('manager', 'agent', 'viewer')
    ),
  CONSTRAINT team_invitation_events_to_role_valid
    CHECK (to_role IN ('manager', 'agent', 'viewer')),
  CONSTRAINT team_invitation_events_from_status_valid
    CHECK (
      from_status IS NULL
      OR from_status IN ('pending', 'revoked', 'expired')
    ),
  CONSTRAINT team_invitation_events_to_status_valid
    CHECK (to_status IN ('pending', 'revoked', 'expired')),
  CONSTRAINT team_invitation_events_version_transition
    CHECK (
      (
        event_type = 'requested'
        AND from_version = 0
        AND to_version = 1
      ) OR (
        event_type <> 'requested'
        AND from_version >= 1
        AND to_version = from_version + 1
      )
    ),
  CONSTRAINT team_invitation_events_shape_valid
    CHECK (
      (
        event_type = 'requested'
        AND from_role IS NULL
        AND from_status IS NULL
        AND to_status = 'pending'
      ) OR (
        event_type = 're-requested'
        AND from_role IN ('manager', 'agent', 'viewer')
        AND from_status IN ('revoked', 'expired')
        AND to_status = 'pending'
      ) OR (
        event_type = 'revoked'
        AND from_role = to_role
        AND from_status = 'pending'
        AND to_status = 'revoked'
      ) OR (
        event_type = 'expired'
        AND from_role = to_role
        AND from_status = 'pending'
        AND to_status = 'expired'
      )
    ),
  CONSTRAINT team_invitation_events_occurred_at_milliseconds
    CHECK (occurred_at = date_trunc('milliseconds', occurred_at)),
  CONSTRAINT team_invitation_events_expires_at_valid
    CHECK (
      expires_at = date_trunc('milliseconds', expires_at)
      AND (to_status <> 'pending' OR expires_at > occurred_at)
    ),
  CONSTRAINT team_invitation_events_operation_uq
    UNIQUE (operation_key),
  CONSTRAINT team_invitation_events_invitation_version_uq
    UNIQUE (invitation_key, to_version)
);

CREATE INDEX team_invitation_events_tenant_occurred_idx
  ON team_invitation_events (tenant_id, occurred_at);

CREATE TABLE team_invitation_deliveries (
  delivery_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  invitation_key TEXT NOT NULL,
  invitation_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT team_invitation_deliveries_invitation_fk
    FOREIGN KEY (tenant_id, invitation_key)
    REFERENCES team_invitations (tenant_id, invitation_key)
    ON DELETE RESTRICT,
  CONSTRAINT team_invitation_deliveries_key_valid
    CHECK (
      delivery_key ~ '^team_invitation_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT team_invitation_deliveries_version_positive
    CHECK (invitation_version >= 1),
  CONSTRAINT team_invitation_deliveries_status_valid
    CHECK (
      status IN (
        'pending',
        'sending',
        'submitted',
        'blocked',
        'ambiguous',
        'cancelled'
      )
    ),
  CONSTRAINT team_invitation_deliveries_attempt_count_valid
    CHECK (attempt_count >= 0),
  CONSTRAINT team_invitation_deliveries_error_code_valid
    CHECK (
      last_error_code IS NULL
      OR (
        length(last_error_code) BETWEEN 1 AND 100
        AND last_error_code ~ '^[A-Z0-9_]+$'
      )
    ),
  CONSTRAINT team_invitation_deliveries_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT team_invitation_deliveries_updated_at_valid
    CHECK (
      updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT team_invitation_deliveries_submitted_at_valid
    CHECK (
      submitted_at IS NULL
      OR (
        submitted_at = date_trunc('milliseconds', submitted_at)
        AND submitted_at >= created_at
      )
    ),
  CONSTRAINT team_invitation_deliveries_state_shape_valid
    CHECK (
      (
        status = 'pending'
        AND attempt_count = 0
        AND last_error_code IS NULL
        AND submitted_at IS NULL
      ) OR (
        status = 'sending'
        AND attempt_count = 1
        AND last_error_code IS NULL
        AND submitted_at IS NULL
      ) OR (
        status = 'submitted'
        AND attempt_count = 1
        AND last_error_code IS NULL
        AND submitted_at IS NOT NULL
      ) OR (
        status IN ('blocked', 'ambiguous', 'cancelled')
        AND attempt_count IN (0, 1)
        AND last_error_code IS NOT NULL
        AND submitted_at IS NULL
      )
    ),
  CONSTRAINT team_invitation_deliveries_invitation_version_uq
    UNIQUE (invitation_key, invitation_version)
);

CREATE INDEX team_invitation_deliveries_status_created_idx
  ON team_invitation_deliveries (status, created_at);

CREATE TABLE team_invitation_acceptances (
  acceptance_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  invitation_key TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  role TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT team_invitation_acceptances_invitation_fk
    FOREIGN KEY (tenant_id, invitation_key)
    REFERENCES team_invitations (tenant_id, invitation_key)
    ON DELETE RESTRICT,
  CONSTRAINT team_invitation_acceptances_membership_fk
    FOREIGN KEY (tenant_id, external_user_id)
    REFERENCES tenant_memberships (tenant_id, external_user_id)
    ON DELETE RESTRICT,
  CONSTRAINT team_invitation_acceptances_key_valid
    CHECK (
      acceptance_key ~ '^team_invitation_acceptance_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT team_invitation_acceptances_user_valid
    CHECK (
      length(external_user_id) BETWEEN 1 AND 512
      AND external_user_id = btrim(external_user_id)
      AND external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT team_invitation_acceptances_email_normalized
    CHECK (
      length(normalized_email) BETWEEN 3 AND 254
      AND normalized_email = lower(btrim(normalized_email))
      AND normalized_email !~ '[[:cntrl:][:space:]]'
      AND normalized_email ~ '^[^@]+@[^@]+\.[^@]+$'
    ),
  CONSTRAINT team_invitation_acceptances_role_valid
    CHECK (role IN ('manager', 'agent', 'viewer')),
  CONSTRAINT team_invitation_acceptances_version_transition
    CHECK (from_version >= 1 AND to_version = from_version + 1),
  CONSTRAINT team_invitation_acceptances_time_valid
    CHECK (
      accepted_at = date_trunc('milliseconds', accepted_at)
      AND expires_at = date_trunc('milliseconds', expires_at)
      AND accepted_at < expires_at
    ),
  CONSTRAINT team_invitation_acceptances_invitation_uq
    UNIQUE (invitation_key),
  CONSTRAINT team_invitation_acceptances_tenant_user_uq
    UNIQUE (tenant_id, external_user_id)
);

CREATE INDEX team_invitation_acceptances_tenant_accepted_idx
  ON team_invitation_acceptances (tenant_id, accepted_at);

CREATE FUNCTION enforce_team_invitation_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.invitation_key IS DISTINCT FROM OLD.invitation_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.normalized_email IS DISTINCT FROM OLD.normalized_email
    OR NEW.invited_by_external_user_id IS DISTINCT FROM
      OLD.invited_by_external_user_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation identity is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_identity_guard
BEFORE UPDATE OF
  invitation_key,
  tenant_id,
  normalized_email,
  invited_by_external_user_id,
  created_at
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_identity();

CREATE FUNCTION enforce_team_invitation_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT (
    OLD.status = 'pending'
    AND NEW.status IN ('revoked', 'expired')
    AND NEW.role = OLD.role
  ) AND NOT (
    OLD.status IN ('revoked', 'expired')
    AND NEW.status = 'pending'
    AND NEW.role IN ('manager', 'agent', 'viewer')
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation transition is invalid';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_transition_guard
BEFORE UPDATE OF role, status
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_transition();

CREATE FUNCTION enforce_team_invitation_state_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  state_changed BOOLEAN;
BEGIN
  state_changed :=
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.last_actor_kind IS DISTINCT FROM OLD.last_actor_kind
    OR NEW.last_actor_external_user_id IS DISTINCT FROM
      OLD.last_actor_external_user_id
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.updated_at IS DISTINCT FROM OLD.updated_at;

  IF (
    state_changed
    AND NEW.version <> OLD.version + 1
  ) OR (
    NOT state_changed
    AND NEW.version <> OLD.version
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation state requires an exact version transition';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_state_version_guard
BEFORE UPDATE OF
  role,
  status,
  version,
  last_actor_kind,
  last_actor_external_user_id,
  requested_at,
  expires_at,
  updated_at
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_state_version();

CREATE FUNCTION reject_pending_team_invitation_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status = 'pending' THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'pending team invitations cannot be deleted';
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER team_invitations_pending_delete_guard
BEFORE DELETE
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION reject_pending_team_invitation_delete();

CREATE FUNCTION enforce_team_invitation_event_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM team_invitations
    WHERE tenant_id = NEW.tenant_id
      AND invitation_key = NEW.invitation_key
      AND role = NEW.to_role
      AND status = NEW.to_status
      AND version = NEW.to_version
      AND last_actor_kind = NEW.actor_kind
      AND last_actor_external_user_id = NEW.actor_external_user_id
      AND updated_at = NEW.occurred_at
      AND expires_at = NEW.expires_at
      AND (
        NEW.to_status <> 'pending'
        OR requested_at = NEW.occurred_at
      )
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation event does not match persisted state';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_events_state_guard
BEFORE INSERT
ON team_invitation_events
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_event_state();

CREATE FUNCTION reject_team_invitation_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION
    USING
      ERRCODE = '55000',
      MESSAGE = 'team invitation events are immutable';
END;
$function$;

CREATE TRIGGER team_invitation_events_update_delete_guard
BEFORE UPDATE OR DELETE
ON team_invitation_events
FOR EACH ROW
EXECUTE FUNCTION reject_team_invitation_event_mutation();

CREATE FUNCTION enforce_team_invitation_delivery_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM team_invitations
    WHERE tenant_id = NEW.tenant_id
      AND invitation_key = NEW.invitation_key
      AND version = NEW.invitation_version
      AND status = 'pending'
      AND requested_at = NEW.created_at
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation delivery does not match pending invitation';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_deliveries_insert_guard
BEFORE INSERT
ON team_invitation_deliveries
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_delivery_insert();

CREATE FUNCTION enforce_team_invitation_delivery_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.invitation_key IS DISTINCT FROM OLD.invitation_key
    OR NEW.invitation_version IS DISTINCT FROM OLD.invitation_version
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation delivery identity is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_deliveries_identity_guard
BEFORE UPDATE OF
  delivery_key,
  tenant_id,
  invitation_key,
  invitation_version,
  created_at
ON team_invitation_deliveries
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_delivery_identity();

CREATE FUNCTION enforce_team_invitation_delivery_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT (
    OLD.status = 'pending'
    AND NEW.status = 'sending'
    AND NEW.attempt_count = 1
    AND NEW.last_error_code IS NULL
    AND NEW.submitted_at IS NULL
  ) AND NOT (
    OLD.status = 'pending'
    AND NEW.status = 'cancelled'
    AND NEW.attempt_count = 0
    AND NEW.last_error_code IS NOT NULL
    AND NEW.submitted_at IS NULL
  ) AND NOT (
    OLD.status = 'sending'
    AND NEW.status = 'submitted'
    AND NEW.attempt_count = 1
    AND NEW.last_error_code IS NULL
    AND NEW.submitted_at IS NOT NULL
  ) AND NOT (
    OLD.status = 'sending'
    AND NEW.status IN ('blocked', 'ambiguous')
    AND NEW.attempt_count = 1
    AND NEW.last_error_code IS NOT NULL
    AND NEW.submitted_at IS NULL
  ) AND NOT (
    OLD.status = 'ambiguous'
    AND NEW.status = 'submitted'
    AND NEW.attempt_count = 1
    AND NEW.last_error_code IS NULL
    AND NEW.submitted_at IS NOT NULL
  ) AND NOT (
    OLD.status = 'ambiguous'
    AND NEW.status = 'blocked'
    AND NEW.attempt_count = 1
    AND NEW.last_error_code IS NOT NULL
    AND NEW.submitted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation delivery transition is invalid';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_deliveries_transition_guard
BEFORE UPDATE OF
  status,
  attempt_count,
  last_error_code,
  submitted_at,
  updated_at
ON team_invitation_deliveries
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_delivery_transition();

CREATE FUNCTION reject_active_team_invitation_delivery_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status IN ('pending', 'sending') THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'active team invitation deliveries cannot be deleted';
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER team_invitation_deliveries_active_delete_guard
BEFORE DELETE
ON team_invitation_deliveries
FOR EACH ROW
EXECUTE FUNCTION reject_active_team_invitation_delivery_delete();

CREATE FUNCTION enforce_settled_team_invitation_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM team_invitation_deliveries
    WHERE tenant_id = OLD.tenant_id
      AND invitation_key = OLD.invitation_key
      AND invitation_version = OLD.version
      AND status = 'sending'
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'sending invitation delivery must settle before invitation transition';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_delivery_sending_guard
BEFORE UPDATE OF role, status, version
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION enforce_settled_team_invitation_delivery();

CREATE FUNCTION enforce_inactive_team_invitation_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status = 'pending'
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.version IS DISTINCT FROM OLD.version
    )
    AND EXISTS (
      SELECT 1
      FROM team_invitation_deliveries
      WHERE tenant_id = OLD.tenant_id
        AND invitation_key = OLD.invitation_key
        AND invitation_version = OLD.version
        AND status IN ('pending', 'sending')
    )
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'active invitation delivery must be settled before invitation transition';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_delivery_active_guard
BEFORE UPDATE OF role, status, version
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION enforce_inactive_team_invitation_delivery();

CREATE FUNCTION enforce_team_invitation_acceptance_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM team_invitations
    INNER JOIN tenant_memberships
      ON tenant_memberships.tenant_id = team_invitations.tenant_id
      AND tenant_memberships.external_user_id = NEW.external_user_id
    WHERE team_invitations.tenant_id = NEW.tenant_id
      AND team_invitations.invitation_key = NEW.invitation_key
      AND team_invitations.normalized_email = NEW.normalized_email
      AND team_invitations.role = NEW.role
      AND team_invitations.status = 'pending'
      AND team_invitations.version = NEW.to_version
      AND team_invitations.last_actor_kind = 'user'
      AND team_invitations.last_actor_external_user_id =
        NEW.external_user_id
      AND team_invitations.updated_at = NEW.accepted_at
      AND team_invitations.expires_at = NEW.expires_at
      AND tenant_memberships.role = NEW.role
      AND tenant_memberships.status = 'active'
      AND tenant_memberships.version = 1
      AND tenant_memberships.created_at = NEW.accepted_at
      AND tenant_memberships.updated_at = NEW.accepted_at
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation acceptance does not match persisted state';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_acceptances_state_guard
BEFORE INSERT
ON team_invitation_acceptances
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_acceptance_state();

CREATE FUNCTION reject_team_invitation_acceptance_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION
    USING
      ERRCODE = '55000',
      MESSAGE = 'team invitation acceptances are immutable';
END;
$function$;

CREATE TRIGGER team_invitation_acceptances_update_delete_guard
BEFORE UPDATE OR DELETE
ON team_invitation_acceptances
FOR EACH ROW
EXECUTE FUNCTION reject_team_invitation_acceptance_mutation();

CREATE FUNCTION reject_accepted_team_invitation_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM team_invitation_acceptances
    WHERE invitation_key = OLD.invitation_key
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '55000',
        MESSAGE = 'accepted team invitations are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitations_accepted_update_guard
BEFORE UPDATE
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION reject_accepted_team_invitation_mutation();

CREATE TRIGGER team_invitations_accepted_delete_guard
BEFORE DELETE
ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION reject_accepted_team_invitation_mutation();
