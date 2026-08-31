-- Durable Clerk Retry-After state for team invitation delivery.

CREATE OR REPLACE FUNCTION enforce_team_invitation_delivery_transition()
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
    AND NEW.status = 'pending'
    AND NEW.attempt_count = 0
    AND NEW.last_error_code IS NULL
    AND NEW.submitted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM team_invitation_delivery_deferrals
      WHERE delivery_key = NEW.delivery_key
        AND tenant_id = NEW.tenant_id
        AND reason_code = 'PROVIDER_RATE_LIMITED'
        AND deferred_at = NEW.updated_at
    )
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

CREATE TABLE team_invitation_delivery_deferrals (
  delivery_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  reason_code TEXT NOT NULL,
  retry_after_at TIMESTAMPTZ NOT NULL,
  deferred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT team_invitation_delivery_deferrals_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES team_invitation_deliveries (delivery_key)
    ON DELETE CASCADE,
  CONSTRAINT team_invitation_delivery_deferrals_key_valid
    CHECK (delivery_key ~ '^team_invitation_delivery_v1_[0-9a-f]{64}$'),
  CONSTRAINT team_invitation_delivery_deferrals_tenant_valid
    CHECK (tenant_id >= 1),
  CONSTRAINT team_invitation_delivery_deferrals_reason_valid
    CHECK (reason_code = 'PROVIDER_RATE_LIMITED'),
  CONSTRAINT team_invitation_delivery_deferrals_deferred_at_milliseconds
    CHECK (deferred_at = date_trunc('milliseconds', deferred_at)),
  CONSTRAINT team_invitation_delivery_deferrals_retry_after_at_valid
    CHECK (
      retry_after_at = date_trunc('milliseconds', retry_after_at)
      AND retry_after_at > deferred_at
      AND retry_after_at <= deferred_at + INTERVAL '1 day'
    )
);

CREATE INDEX team_invitation_delivery_deferrals_tenant_retry_idx
  ON team_invitation_delivery_deferrals (tenant_id, retry_after_at);

CREATE FUNCTION enforce_team_invitation_delivery_deferral_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
    OR NEW.deferred_at <= OLD.deferred_at
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation delivery deferral identity is invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM team_invitation_deliveries
    WHERE delivery_key = NEW.delivery_key
      AND tenant_id = NEW.tenant_id
      AND status = 'sending'
      AND updated_at <= NEW.deferred_at
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'team invitation delivery deferral state is invalid';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_delivery_deferrals_state_guard
BEFORE INSERT OR UPDATE
ON team_invitation_delivery_deferrals
FOR EACH ROW
EXECUTE FUNCTION enforce_team_invitation_delivery_deferral_state();

CREATE FUNCTION apply_team_invitation_delivery_deferral()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE team_invitation_deliveries
  SET
    status = 'pending',
    attempt_count = 0,
    updated_at = NEW.deferred_at
  WHERE delivery_key = NEW.delivery_key
    AND tenant_id = NEW.tenant_id
    AND status = 'sending';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '40001',
        MESSAGE = 'team invitation delivery deferral transition was lost';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER team_invitation_delivery_deferrals_transition
AFTER INSERT OR UPDATE
ON team_invitation_delivery_deferrals
FOR EACH ROW
EXECUTE FUNCTION apply_team_invitation_delivery_deferral();

CREATE FUNCTION reject_active_team_invitation_delivery_deferral_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM team_invitation_deliveries
    WHERE delivery_key = OLD.delivery_key
      AND tenant_id = OLD.tenant_id
      AND status IN ('pending', 'sending')
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'active team invitation delivery deferral cannot be deleted';
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER team_invitation_delivery_deferrals_active_delete_guard
BEFORE DELETE
ON team_invitation_delivery_deferrals
FOR EACH ROW
EXECUTE FUNCTION reject_active_team_invitation_delivery_deferral_delete();

-- Existing 51-table cutover receipts remain valid historical evidence; every
-- new full-source bundle contains the added deferral table and records 52.
ALTER TABLE data_migration_bundle_receipts
  DROP CONSTRAINT data_migration_bundle_counts_valid;

ALTER TABLE data_migration_bundle_receipts
  ADD CONSTRAINT data_migration_bundle_counts_valid CHECK (
    slice_count = 10
    AND table_count IN (51, 52)
    AND total_row_count >= 0
  );
