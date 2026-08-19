-- PostgreSQL production decisions with database-enforced immutable evidence.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE production_decision_records (
  check_id TEXT PRIMARY KEY,
  selection TEXT NOT NULL,
  rationale TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_event_key TEXT NOT NULL,
  decided_by_external_user_id TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT production_decision_records_check_id_registered
    CHECK (
      check_id IN (
        'identity.team-invitation-policy',
        'ai.provider',
        'billing.provider',
        'security.rate-limit-policy',
        'security.file-scanner',
        'security.knowledge-upload-policy',
        'operations.knowledge-scan-recovery',
        'operations.backup-policy',
        'operations.slo-measurement',
        'operations.slo-alert-policy',
        'governance.data-retention-policy'
      )
    ),
  CONSTRAINT production_decision_records_selection_bounded
    CHECK (
      length(selection) BETWEEN 1 AND 120
      AND selection = btrim(selection)
    ),
  CONSTRAINT production_decision_records_rationale_bounded
    CHECK (
      length(rationale) BETWEEN 1 AND 2000
      AND rationale = btrim(rationale)
    ),
  CONSTRAINT production_decision_records_version_positive
    CHECK (version >= 1),
  CONSTRAINT production_decision_records_event_key_sha256
    CHECK (
      last_event_key ~ '^production_decision_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT production_decision_records_actor_bounded
    CHECK (
      length(decided_by_external_user_id) BETWEEN 1 AND 255
      AND decided_by_external_user_id = btrim(decided_by_external_user_id)
      AND decided_by_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT production_decision_records_timestamps_consistent
    CHECK (
      decided_at = date_trunc('milliseconds', decided_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND decided_at = updated_at
    )
);

CREATE INDEX production_decision_records_updated_idx
  ON production_decision_records (updated_at);

CREATE TABLE production_decision_events (
  event_key TEXT PRIMARY KEY,
  check_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'recorded',
  selection TEXT NOT NULL,
  rationale TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  decision_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT production_decision_events_record_fk
    FOREIGN KEY (check_id)
    REFERENCES production_decision_records (check_id)
    ON DELETE RESTRICT,
  CONSTRAINT production_decision_events_key_sha256
    CHECK (event_key ~ '^production_decision_event_v1_[0-9a-f]{64}$'),
  CONSTRAINT production_decision_events_type_valid
    CHECK (event_type = 'recorded'),
  CONSTRAINT production_decision_events_selection_bounded
    CHECK (
      length(selection) BETWEEN 1 AND 120
      AND selection = btrim(selection)
    ),
  CONSTRAINT production_decision_events_rationale_bounded
    CHECK (
      length(rationale) BETWEEN 1 AND 2000
      AND rationale = btrim(rationale)
    ),
  CONSTRAINT production_decision_events_actor_bounded
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT production_decision_events_version_positive
    CHECK (decision_version >= 1),
  CONSTRAINT production_decision_events_timestamps_milliseconds
    CHECK (
      occurred_at = date_trunc('milliseconds', occurred_at)
      AND created_at = date_trunc('milliseconds', created_at)
    ),
  CONSTRAINT production_decision_events_check_version_uq
    UNIQUE (check_id, decision_version)
);

CREATE INDEX production_decision_events_check_occurred_idx
  ON production_decision_events (check_id, occurred_at);

CREATE FUNCTION enforce_production_decision_record_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF
    NEW.check_id IS DISTINCT FROM OLD.check_id
    OR NEW.version <> OLD.version + 1
    OR NEW.last_event_key = OLD.last_event_key
    OR NEW.decided_at IS DISTINCT FROM NEW.updated_at
    OR (
      NEW.selection IS NOT DISTINCT FROM OLD.selection
      AND NEW.rationale IS NOT DISTINCT FROM OLD.rationale
    )
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'invalid production decision transition';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_decision_records_update_guard
BEFORE UPDATE ON production_decision_records
FOR EACH ROW
EXECUTE FUNCTION enforce_production_decision_record_transition();

CREATE FUNCTION audit_production_decision_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO production_decision_events (
    event_key,
    check_id,
    event_type,
    selection,
    rationale,
    actor_external_user_id,
    decision_version,
    occurred_at
  ) VALUES (
    NEW.last_event_key,
    NEW.check_id,
    'recorded',
    NEW.selection,
    NEW.rationale,
    NEW.decided_by_external_user_id,
    NEW.version,
    NEW.decided_at
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_decision_records_insert_audit
AFTER INSERT ON production_decision_records
FOR EACH ROW
EXECUTE FUNCTION audit_production_decision_record();

CREATE TRIGGER production_decision_records_update_audit
AFTER UPDATE ON production_decision_records
FOR EACH ROW
EXECUTE FUNCTION audit_production_decision_record();

CREATE FUNCTION reject_production_decision_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Production decision events are immutable';
END;
$$;

CREATE TRIGGER production_decision_events_update_guard
BEFORE UPDATE ON production_decision_events
FOR EACH ROW
EXECUTE FUNCTION reject_production_decision_event_mutation();

CREATE TRIGGER production_decision_events_delete_guard
BEFORE DELETE ON production_decision_events
FOR EACH ROW
EXECUTE FUNCTION reject_production_decision_event_mutation();
