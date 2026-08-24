-- Railway Meta template submission outbox and immutable transition evidence.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE message_template_submission_outbox (
  submission_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  template_key TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  meta_connection_version INTEGER NOT NULL,
  waba_id TEXT NOT NULL,
  graph_api_version TEXT NOT NULL,
  request_operation TEXT NOT NULL,
  request_idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  state_version INTEGER NOT NULL DEFAULT 1,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  meta_template_id TEXT,
  claimed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT message_template_submission_outbox_template_fk
    FOREIGN KEY (tenant_id, template_key)
    REFERENCES message_templates (tenant_id, template_key)
    ON DELETE RESTRICT,
  CONSTRAINT message_template_submission_outbox_connection_fk
    FOREIGN KEY (tenant_id)
    REFERENCES meta_connections (tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT message_template_submission_outbox_request_fk
    FOREIGN KEY (
      tenant_id,
      request_operation,
      request_idempotency_key
    )
    REFERENCES railway_api_mutation_receipts (
      tenant_id,
      operation,
      idempotency_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT message_template_submission_outbox_key_valid
    CHECK (
      submission_key ~ '^template_submission_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT message_template_submission_outbox_template_key_valid
    CHECK (template_key ~ '^template_v1_[0-9a-f]{64}$'),
  CONSTRAINT message_template_submission_outbox_template_version_positive
    CHECK (template_version >= 1),
  CONSTRAINT message_template_submission_outbox_connection_version_positive
    CHECK (meta_connection_version >= 1),
  CONSTRAINT message_template_submission_outbox_waba_valid
    CHECK (waba_id ~ '^[1-9][0-9]{0,63}$'),
  CONSTRAINT message_template_submission_outbox_graph_version_valid
    CHECK (graph_api_version ~ '^v[1-9][0-9]*\.[0-9]+$'),
  CONSTRAINT message_template_submission_outbox_request_valid
    CHECK (
      request_operation = 'templates.submit'
      AND request_idempotency_key ~
        '^connect_idempotency_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT message_template_submission_outbox_status_valid
    CHECK (
      status IN (
        'pending',
        'submitting',
        'submitted',
        'rejected',
        'blocked',
        'ambiguous'
      )
    ),
  CONSTRAINT message_template_submission_outbox_state_version_positive
    CHECK (state_version >= 1),
  CONSTRAINT message_template_submission_outbox_attempt_bounded
    CHECK (attempt_count BETWEEN 0 AND 1),
  CONSTRAINT message_template_submission_outbox_error_valid
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT message_template_submission_outbox_meta_id_valid
    CHECK (
      meta_template_id IS NULL
      OR meta_template_id ~ '^[1-9][0-9]{0,254}$'
    ),
  CONSTRAINT message_template_submission_outbox_time_valid
    CHECK (
      created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
      AND (
        claimed_at IS NULL
        OR (
          claimed_at = date_trunc('milliseconds', claimed_at)
          AND claimed_at >= created_at
        )
      )
      AND (
        settled_at IS NULL
        OR (
          settled_at = date_trunc('milliseconds', settled_at)
          AND settled_at >= created_at
        )
      )
    ),
  CONSTRAINT message_template_submission_outbox_state_shape_valid
    CHECK (
      (
        status = 'pending'
        AND state_version = 1
        AND attempt_count = 0
        AND last_error_code IS NULL
        AND meta_template_id IS NULL
        AND claimed_at IS NULL
        AND settled_at IS NULL
      )
      OR (
        status = 'submitting'
        AND state_version = 2
        AND attempt_count = 1
        AND last_error_code IS NULL
        AND meta_template_id IS NULL
        AND claimed_at IS NOT NULL
        AND settled_at IS NULL
      )
      OR (
        status = 'submitted'
        AND state_version IN (3, 4)
        AND attempt_count = 1
        AND last_error_code IS NULL
        AND meta_template_id IS NOT NULL
        AND claimed_at IS NOT NULL
        AND settled_at IS NOT NULL
      )
      OR (
        status = 'rejected'
        AND state_version IN (3, 4)
        AND attempt_count = 1
        AND last_error_code IS NOT NULL
        AND meta_template_id IS NULL
        AND claimed_at IS NOT NULL
        AND settled_at IS NOT NULL
      )
      OR (
        status = 'ambiguous'
        AND state_version = 3
        AND attempt_count = 1
        AND last_error_code IS NOT NULL
        AND meta_template_id IS NULL
        AND claimed_at IS NOT NULL
        AND settled_at IS NULL
      )
      OR (
        status = 'blocked'
        AND state_version = 2
        AND attempt_count = 0
        AND last_error_code IS NOT NULL
        AND meta_template_id IS NULL
        AND claimed_at IS NULL
        AND settled_at IS NOT NULL
      )
    ),
  CONSTRAINT message_template_submission_outbox_template_version_uq
    UNIQUE (tenant_id, template_key, template_version)
);

CREATE UNIQUE INDEX message_template_submission_outbox_meta_id_uq
  ON message_template_submission_outbox (meta_template_id)
  WHERE meta_template_id IS NOT NULL;

CREATE INDEX message_template_submission_outbox_status_created_idx
  ON message_template_submission_outbox (status, created_at, submission_key);

CREATE INDEX message_template_submission_outbox_status_updated_idx
  ON message_template_submission_outbox (status, updated_at, submission_key);

CREATE TABLE message_template_submission_events (
  event_key TEXT PRIMARY KEY,
  submission_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  template_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  causation_key TEXT NOT NULL,
  error_code TEXT,
  meta_template_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT message_template_submission_events_outbox_fk
    FOREIGN KEY (submission_key)
    REFERENCES message_template_submission_outbox (submission_key)
    ON DELETE RESTRICT,
  CONSTRAINT message_template_submission_events_template_fk
    FOREIGN KEY (tenant_id, template_key)
    REFERENCES message_templates (tenant_id, template_key)
    ON DELETE RESTRICT,
  CONSTRAINT message_template_submission_events_key_valid
    CHECK (
      event_key ~ '^template_submission_event_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT message_template_submission_events_type_valid
    CHECK (
      event_type IN (
        'staged',
        'claimed',
        'submitted',
        'rejected',
        'blocked',
        'ambiguous',
        'reconciled-submitted',
        'reconciled-rejected'
      )
    ),
  CONSTRAINT message_template_submission_events_status_valid
    CHECK (
      (from_status IS NULL OR from_status IN (
        'pending',
        'submitting',
        'ambiguous'
      ))
      AND to_status IN (
        'pending',
        'submitting',
        'submitted',
        'rejected',
        'blocked',
        'ambiguous'
      )
    ),
  CONSTRAINT message_template_submission_events_version_valid
    CHECK (
      (event_type = 'staged' AND from_version = 0 AND to_version = 1)
      OR (event_type <> 'staged' AND from_version >= 1
        AND to_version = from_version + 1)
    ),
  CONSTRAINT message_template_submission_events_actor_valid
    CHECK (
      actor_kind IN ('user', 'system')
      AND length(actor_external_user_id) BETWEEN 1 AND 512
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
      AND (
        (event_type = 'staged' AND actor_kind = 'user')
        OR (event_type <> 'staged' AND actor_kind = 'system')
      )
    ),
  CONSTRAINT message_template_submission_events_causation_valid
    CHECK (
      (event_type = 'staged' AND causation_key ~
        '^connect_idempotency_v1_[0-9a-f]{64}$')
      OR (event_type <> 'staged' AND causation_key = submission_key)
    ),
  CONSTRAINT message_template_submission_events_evidence_valid
    CHECK (
      error_code IS NULL
      OR error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT message_template_submission_events_meta_id_valid
    CHECK (
      meta_template_id IS NULL
      OR meta_template_id ~ '^[1-9][0-9]{0,254}$'
    ),
  CONSTRAINT message_template_submission_events_transition_valid
    CHECK (
      (event_type = 'staged'
        AND from_status IS NULL AND to_status = 'pending')
      OR (event_type = 'claimed'
        AND from_status = 'pending' AND to_status = 'submitting')
      OR (event_type = 'submitted'
        AND from_status = 'submitting' AND to_status = 'submitted')
      OR (event_type = 'rejected'
        AND from_status = 'submitting' AND to_status = 'rejected')
      OR (event_type = 'blocked'
        AND from_status = 'pending' AND to_status = 'blocked')
      OR (event_type = 'ambiguous'
        AND from_status = 'submitting' AND to_status = 'ambiguous')
      OR (event_type = 'reconciled-submitted'
        AND from_status = 'ambiguous' AND to_status = 'submitted')
      OR (event_type = 'reconciled-rejected'
        AND from_status = 'ambiguous' AND to_status = 'rejected')
    ),
  CONSTRAINT message_template_submission_events_shape_valid
    CHECK (
      (to_status = 'submitted'
        AND error_code IS NULL AND meta_template_id IS NOT NULL)
      OR (to_status IN ('rejected', 'blocked', 'ambiguous')
        AND error_code IS NOT NULL AND meta_template_id IS NULL)
      OR (to_status IN ('pending', 'submitting')
        AND error_code IS NULL AND meta_template_id IS NULL)
    ),
  CONSTRAINT message_template_submission_events_time_valid
    CHECK (
      occurred_at = date_trunc('milliseconds', occurred_at)
      AND created_at = date_trunc('milliseconds', created_at)
      AND created_at >= occurred_at
    ),
  CONSTRAINT message_template_submission_events_version_uq
    UNIQUE (submission_key, to_version)
);

CREATE INDEX message_template_submission_events_tenant_occurred_idx
  ON message_template_submission_events (tenant_id, occurred_at, event_key);

CREATE FUNCTION enforce_message_template_submission_outbox_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.submission_key IS DISTINCT FROM OLD.submission_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.template_key IS DISTINCT FROM OLD.template_key
    OR NEW.template_version IS DISTINCT FROM OLD.template_version
    OR NEW.meta_connection_version IS DISTINCT FROM
      OLD.meta_connection_version
    OR NEW.waba_id IS DISTINCT FROM OLD.waba_id
    OR NEW.graph_api_version IS DISTINCT FROM OLD.graph_api_version
    OR NEW.request_operation IS DISTINCT FROM OLD.request_operation
    OR NEW.request_idempotency_key IS DISTINCT FROM
      OLD.request_idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'message template submission identity is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER message_template_submission_outbox_identity_guard
BEFORE UPDATE ON message_template_submission_outbox
FOR EACH ROW
EXECUTE FUNCTION enforce_message_template_submission_outbox_identity();

CREATE FUNCTION enforce_message_template_submission_outbox_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.state_version <> OLD.state_version + 1
    OR NEW.updated_at < OLD.updated_at
    OR NOT (
      (OLD.status = 'pending' AND NEW.status IN ('submitting', 'blocked'))
      OR (OLD.status = 'submitting'
        AND NEW.status IN ('submitted', 'rejected', 'ambiguous'))
      OR (OLD.status = 'ambiguous'
        AND NEW.status IN ('submitted', 'rejected'))
    )
  THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'message template submission transition is invalid';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER message_template_submission_outbox_transition_guard
BEFORE UPDATE OF
  status,
  state_version,
  attempt_count,
  last_error_code,
  meta_template_id,
  claimed_at,
  settled_at,
  updated_at
ON message_template_submission_outbox
FOR EACH ROW
EXECUTE FUNCTION enforce_message_template_submission_outbox_transition();

CREATE FUNCTION require_message_template_submission_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM message_template_submission_events AS event
    WHERE event.submission_key = NEW.submission_key
      AND event.tenant_id = NEW.tenant_id
      AND event.template_key = NEW.template_key
      AND event.to_status = NEW.status
      AND event.to_version = NEW.state_version
      AND event.error_code IS NOT DISTINCT FROM NEW.last_error_code
      AND event.meta_template_id IS NOT DISTINCT FROM NEW.meta_template_id
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'message template submission event is required';
  END IF;

  RETURN NULL;
END;
$function$;

CREATE CONSTRAINT TRIGGER message_template_submission_outbox_event_guard
AFTER INSERT OR UPDATE ON message_template_submission_outbox
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION require_message_template_submission_event();

CREATE FUNCTION reject_message_template_submission_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION
    USING
      ERRCODE = '23514',
      MESSAGE = 'message template submission events are immutable';
END;
$function$;

CREATE TRIGGER message_template_submission_events_immutable_guard
BEFORE UPDATE OR DELETE ON message_template_submission_events
FOR EACH ROW
EXECUTE FUNCTION reject_message_template_submission_event_mutation();
