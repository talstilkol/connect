-- Immutable, PII-free facts observed during an authorized Bot reply staging run.
-- This migration intentionally contains no seed, fixture, or synthetic evidence.

CREATE TABLE bot_reply_staging_observation_events (
  event_key TEXT PRIMARY KEY,
  run_key TEXT NOT NULL,
  claim_version INTEGER NOT NULL,
  operation_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  subject_delivery_key TEXT NOT NULL,
  case_name TEXT NOT NULL,
  fact_kind TEXT NOT NULL,
  scenario TEXT,
  provider_error_code INTEGER,
  dispatch_outcome TEXT,
  first_dispatch_outcome TEXT,
  second_dispatch_outcome TEXT,
  retry_after_seconds INTEGER,
  cooldown_scope TEXT,
  backoff_policy TEXT,
  queue_delivery_count INTEGER,
  provider_request_count INTEGER,
  disabled_policy_version INTEGER,
  policy_state TEXT,
  recipient_fingerprint TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_observation_run_fk
    FOREIGN KEY (run_key)
    REFERENCES bot_reply_staging_runs (run_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_observation_subject_fk
    FOREIGN KEY (subject_delivery_key)
    REFERENCES bot_reply_deliveries (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_observation_event_key_sha256
    CHECK (event_key ~ '^bot_reply_staging_observation_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_observation_operation_key_sha256
    CHECK (operation_key ~ '^bot_reply_staging_step_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_observation_delivery_keys_sha256
    CHECK (
      delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
      AND subject_delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_observation_claim_positive
    CHECK (claim_version >= 1),
  CONSTRAINT bot_reply_staging_observation_case_valid
    CHECK (
      case_name IN (
        'text-send',
        'button-send',
        'button-reply',
        'status-sent',
        'status-delivered',
        'status-read',
        'customer-window-expired',
        'provider-retry',
        'pair-limit',
        'duplicate-safety',
        'kill-switch'
      )
    ),
  CONSTRAINT bot_reply_staging_observation_recipient_sha256
    CHECK (recipient_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_staging_observation_time_canonical
    CHECK (
      observed_at = date_trunc('milliseconds', observed_at)
      AND created_at = observed_at
    ),
  CONSTRAINT bot_reply_staging_observation_fact_valid
    CHECK (
      (
        fact_kind = 'scenario'
        AND scenario IN (
          'text-send',
          'button-send',
          'button-reply',
          'status-sent',
          'status-delivered',
          'status-read',
          'customer-window-expired'
        )
        AND case_name = scenario
        AND (
          (
            scenario IN (
              'text-send',
              'button-send'
            )
            AND provider_error_code IS NULL
            AND dispatch_outcome IN ('accepted', 'duplicate')
            AND delivery_key = subject_delivery_key
          )
          OR (
            scenario IN (
              'button-reply',
              'status-sent',
              'status-delivered',
              'status-read'
            )
            AND provider_error_code IS NULL
            AND dispatch_outcome IS NULL
            AND delivery_key <> subject_delivery_key
          )
          OR (
            scenario = 'customer-window-expired'
            AND provider_error_code = 131047
            AND dispatch_outcome IN ('rejected', 'duplicate')
            AND delivery_key = subject_delivery_key
          )
        )
        AND first_dispatch_outcome IS NULL
        AND second_dispatch_outcome IS NULL
        AND retry_after_seconds IS NULL
        AND cooldown_scope IS NULL
        AND backoff_policy IS NULL
        AND queue_delivery_count IS NULL
        AND provider_request_count IS NULL
        AND disabled_policy_version IS NULL
        AND policy_state IS NULL
      )
      OR (
        fact_kind = 'provider-retry'
        AND case_name = 'provider-retry'
        AND scenario IS NULL
        AND provider_error_code = 130429
        AND dispatch_outcome IN ('deferred', 'duplicate')
        AND delivery_key = subject_delivery_key
        AND first_dispatch_outcome IS NULL
        AND second_dispatch_outcome IS NULL
        AND retry_after_seconds BETWEEN 1 AND 86400
        AND cooldown_scope = 'sender'
        AND backoff_policy IS NULL
        AND queue_delivery_count IS NULL
        AND provider_request_count IS NULL
        AND disabled_policy_version IS NULL
        AND policy_state IS NULL
      )
      OR (
        fact_kind = 'pair-limit'
        AND case_name = 'pair-limit'
        AND scenario IS NULL
        AND provider_error_code = 131056
        AND dispatch_outcome IN ('deferred', 'duplicate')
        AND delivery_key = subject_delivery_key
        AND first_dispatch_outcome IS NULL
        AND second_dispatch_outcome IS NULL
        AND retry_after_seconds IS NULL
        AND cooldown_scope = 'pair'
        AND backoff_policy = 'meta-4-power-x'
        AND queue_delivery_count IS NULL
        AND provider_request_count IS NULL
        AND disabled_policy_version IS NULL
        AND policy_state IS NULL
      )
      OR (
        fact_kind = 'duplicate-safety'
        AND case_name = 'duplicate-safety'
        AND scenario IS NULL
        AND provider_error_code IS NULL
        AND dispatch_outcome IS NULL
        AND delivery_key = subject_delivery_key
        AND first_dispatch_outcome IN ('accepted', 'duplicate')
        AND second_dispatch_outcome = 'duplicate'
        AND retry_after_seconds IS NULL
        AND cooldown_scope IS NULL
        AND backoff_policy IS NULL
        AND queue_delivery_count BETWEEN 2 AND 100
        AND provider_request_count = 1
        AND disabled_policy_version IS NULL
        AND policy_state IS NULL
      )
      OR (
        fact_kind = 'kill-switch'
        AND case_name = 'kill-switch'
        AND scenario IS NULL
        AND provider_error_code IS NULL
        AND dispatch_outcome IN ('rejected', 'deferred', 'duplicate')
        AND delivery_key = subject_delivery_key
        AND first_dispatch_outcome IS NULL
        AND second_dispatch_outcome IS NULL
        AND retry_after_seconds IS NULL
        AND cooldown_scope IS NULL
        AND backoff_policy IS NULL
        AND queue_delivery_count IS NULL
        AND provider_request_count = 0
        AND disabled_policy_version >= 2
        AND policy_state = 'disabled'
      )
    )
);

CREATE UNIQUE INDEX bot_reply_staging_observation_operation_uq
  ON bot_reply_staging_observation_events (run_key, operation_key);

CREATE INDEX bot_reply_staging_observation_run_time_idx
  ON bot_reply_staging_observation_events (run_key, observed_at);

CREATE FUNCTION enforce_bot_reply_staging_observation_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_run bot_reply_staging_runs%ROWTYPE;
BEGIN
  SELECT *
  INTO active_run
  FROM bot_reply_staging_runs
  WHERE run_key = NEW.run_key
  FOR UPDATE;

  IF active_run.run_key IS NULL
    OR active_run.status <> 'running'
    OR NEW.claim_version <> active_run.claim_version
    OR NEW.recipient_fingerprint <> active_run.recipient_fingerprint
    OR NEW.observed_at < active_run.started_at
    OR NEW.observed_at > active_run.lease_expires_at
  THEN
    RAISE EXCEPTION 'Bot reply staging observation lacks an active run';
  END IF;

  IF NEW.fact_kind = 'kill-switch'
    AND NEW.disabled_policy_version <> active_run.policy_version + 1
  THEN
    RAISE EXCEPTION 'Bot reply staging kill switch version is invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM bot_reply_deliveries AS delivery
    WHERE delivery.delivery_key = NEW.subject_delivery_key
      AND delivery.tenant_id = active_run.tenant_id
  ) THEN
    RAISE EXCEPTION 'Bot reply staging observation subject is invalid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_observation_insert_guard
BEFORE INSERT ON bot_reply_staging_observation_events
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_staging_observation_insert();

CREATE FUNCTION reject_bot_reply_staging_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging observation is immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_observation_update_guard
BEFORE UPDATE ON bot_reply_staging_observation_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_observation_mutation();

CREATE TRIGGER bot_reply_staging_observation_delete_guard
BEFORE DELETE ON bot_reply_staging_observation_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_observation_mutation();
