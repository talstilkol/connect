-- Dormant, two-phase provider-operation fence for controlled Bot reply
-- staging sends. The first committed reservation is the only result that may
-- authorize a Meta call. Replays never return the provider request key.
-- Finalization derives its verdict from existing durable provider evidence;
-- it accepts no caller verdict, provider response, provider identifier, or
-- caller timestamp.

DO $d31d1d_precondition$
DECLARE
  existing_object_count INTEGER;
  existing_request_function_count INTEGER;
  existing_request_trigger_count INTEGER;
  unsafe_default_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_object_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_provider_operations',
      'bot_reply_staging_provider_operation_outcomes'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_request_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_provider_request_insert',
      'reject_bot_reply_provider_request_mutation'
    )
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype =
      'pg_catalog.trigger'::pg_catalog.regtype;

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_request_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'bot_reply_provider_request_claims'
    AND trigger.tgisinternal = false
    AND trigger.tgenabled = 'O'
    AND (
      (
        trigger.tgname = 'bot_reply_provider_requests_insert_guard'
        AND procedure.proname =
          'enforce_bot_reply_provider_request_insert'
        AND trigger.tgtype = 7
      )
      OR
      (
        trigger.tgname IN (
          'bot_reply_provider_requests_update_guard',
          'bot_reply_provider_requests_delete_guard'
        )
        AND procedure.proname =
          'reject_bot_reply_provider_request_mutation'
        AND trigger.tgtype IN (11, 19)
      )
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO unsafe_default_acl_count
  FROM pg_catalog.pg_default_acl AS default_acl
  CROSS JOIN LATERAL
    pg_catalog.aclexplode(default_acl.defaclacl) AS privilege
  WHERE default_acl.defaclrole = (
      SELECT role.oid
      FROM pg_catalog.pg_roles AS role
      WHERE role.rolname = CURRENT_USER
    )
    AND default_acl.defaclobjtype IN ('f', 'r')
    AND (
      default_acl.defaclnamespace = 0
      OR default_acl.defaclnamespace =
        'public'::pg_catalog.regnamespace
    )
    AND privilege.grantee <> default_acl.defaclrole;

  IF existing_object_count <> 0
    OR existing_request_function_count <> 2
    OR existing_request_trigger_count <> 3
    OR unsafe_default_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-A precondition failed: objects %, request functions %, request triggers %, unsafe default ACLs %',
      existing_object_count,
      existing_request_function_count,
      existing_request_trigger_count,
      unsafe_default_acl_count;
  END IF;
END;
$d31d1d_precondition$;

-- 0039 required requested_at to equal the reservation time. Preserve that
-- legacy contract for every ordinary request writer. Only a request backed by
-- the exact staging operation inserted earlier in the same transaction may
-- use the later database-clock instant, and that staging interval is
-- half-open.
CREATE OR REPLACE FUNCTION public.enforce_bot_reply_provider_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.bot_reply_deliveries AS delivery
    INNER JOIN public.whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = NEW.reservation_key
     AND reservation.tenant_id = NEW.tenant_id
     AND reservation.reservation_class = 'service-reply'
     AND (
       (
         reservation.reserved_at = NEW.requested_at
         AND NEW.requested_at <= reservation.reservation_expires_at
       )
       OR (
         reservation.reserved_at <= NEW.requested_at
         AND NEW.requested_at < reservation.reservation_expires_at
         AND EXISTS (
           SELECT 1
           FROM public.bot_reply_staging_provider_operations AS operation
           WHERE operation.provider_request_key = NEW.request_key
             AND operation.delivery_key = NEW.delivery_key
             AND operation.tenant_id = NEW.tenant_id
             AND operation.delivery_claim_version = NEW.claim_version
             AND operation.reservation_key = NEW.reservation_key
             AND operation.requested_at = NEW.requested_at
         )
       )
     )
    LEFT JOIN public.whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
    WHERE delivery.delivery_key = NEW.delivery_key
      AND delivery.tenant_id = NEW.tenant_id
      AND delivery.status = 'sending'
      AND delivery.attempt_count = 1
      AND delivery.claim_version = NEW.claim_version
      AND delivery.updated_at <= NEW.requested_at
      AND settlement.reservation_key IS NULL
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider request lacks an active delivery and reservation';
  END IF;

  RETURN NEW;
END;
$$;

-- Every settlement writer now takes the exact reservation row lock before
-- inserting. Reserve/finalize use the same row as their serialization point,
-- so a settlement cannot commit between their locked recheck and decision.
CREATE OR REPLACE FUNCTION public.enforce_whatsapp_rate_settlement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
BEGIN
  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
  FOR UPDATE;

  IF NOT FOUND
    OR locked_reservation.reserved_at > NEW.settled_at
  THEN
    RAISE EXCEPTION 'WhatsApp settlement lacks valid reservation proof';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.bot_reply_staging_provider_operation_outcomes AS outcome
      ON outcome.operation_key = operation.operation_key
     AND outcome.state = 'indeterminate'
    WHERE operation.reservation_key = NEW.reservation_key
  ) THEN
    RAISE EXCEPTION
      'WhatsApp settlement follows an indeterminate staging operation';
  END IF;

  -- A cancellation means the provider boundary was not crossed. Once the
  -- exact staging operation exists, that assertion can no longer become
  -- true. The shared reservation lock makes both transaction orders
  -- deterministic: cancellation-first blocks reserve; reserve-first blocks
  -- cancellation. Provider outcome settlements remain permitted.
  IF NEW.outcome = 'cancelled-before-submit'
    AND EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_provider_operations AS operation
      WHERE operation.reservation_key = NEW.reservation_key
    )
  THEN
    RAISE EXCEPTION
      'WhatsApp cancellation follows a reserved staging provider operation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_provider_request_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply provider request evidence is immutable';
END;
$$;

CREATE TABLE public.bot_reply_staging_provider_operations (
  operation_key TEXT PRIMARY KEY,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  request_digest TEXT NOT NULL,
  audit_key TEXT NOT NULL,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  run_lease_expires_at TIMESTAMPTZ NOT NULL,
  operation_kind TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_request_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_provider_operations_run_fk
    FOREIGN KEY (run_key)
    REFERENCES public.bot_reply_staging_runs (run_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_operations_delivery_fk
    FOREIGN KEY (delivery_key)
    REFERENCES public.bot_reply_deliveries (delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_operations_reservation_fk
    FOREIGN KEY (reservation_key)
    REFERENCES public.whatsapp_rate_limit_reservations (reservation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_operations_request_fk
    FOREIGN KEY (provider_request_key)
    REFERENCES public.bot_reply_provider_request_claims (request_key)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT bot_reply_staging_provider_operations_operation_key_sha256
    CHECK (
      operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_run_key_sha256
    CHECK (
      run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_request_digest_sha256
    CHECK (
      request_digest OPERATOR(pg_catalog.~) '^sha256:[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_audit_key_sha256
    CHECK (
      audit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_audit_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_release_id_sha256
    CHECK (
      release_id OPERATOR(pg_catalog.~)
        '^connect_release_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_commit_sha
    CHECK (commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'),
  CONSTRAINT bot_reply_staging_provider_operations_artifact_digest_sha256
    CHECK (
      artifact_digest OPERATOR(pg_catalog.~) '^sha256:[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_delivery_key_sha256
    CHECK (
      delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_reservation_key_sha256
    CHECK (
      reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_request_key_sha256
    CHECK (
      provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_operations_versions_positive
    CHECK (
      run_claim_version >= 1
      AND delivery_claim_version >= 1
    ),
  CONSTRAINT bot_reply_staging_provider_operations_kind_dispatch_only
    CHECK (
      operation_kind IN (
        'text-send',
        'button-send',
        'customer-window-expired',
        'provider-retry',
        'pair-limit',
        'duplicate-safety'
      )
    ),
  CONSTRAINT bot_reply_staging_provider_operations_time_canonical
    CHECK (
      run_lease_expires_at =
        pg_catalog.date_trunc('milliseconds', run_lease_expires_at)
      AND requested_at =
        pg_catalog.date_trunc('milliseconds', requested_at)
      AND created_at = requested_at
      AND requested_at < run_lease_expires_at
    ),
  CONSTRAINT bot_reply_staging_provider_operations_delivery_claim_uq
    UNIQUE (delivery_key, delivery_claim_version),
  CONSTRAINT bot_reply_staging_provider_operations_reservation_uq
    UNIQUE (reservation_key),
  CONSTRAINT bot_reply_staging_provider_operations_request_uq
    UNIQUE (provider_request_key)
);

CREATE INDEX bot_reply_staging_provider_operations_run_idx
  ON public.bot_reply_staging_provider_operations (
    run_key,
    run_claim_version,
    requested_at,
    operation_key
  );

CREATE TABLE public.bot_reply_staging_provider_operation_outcomes (
  observation_key TEXT PRIMARY KEY,
  operation_key TEXT NOT NULL UNIQUE,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  provider_request_key TEXT NOT NULL UNIQUE,
  operation_kind TEXT NOT NULL,
  state TEXT NOT NULL,
  provider_outcome_kind TEXT NOT NULL,
  evidence_key TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_provider_outcomes_operation_fk
    FOREIGN KEY (operation_key)
    REFERENCES public.bot_reply_staging_provider_operations (operation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_outcomes_run_fk
    FOREIGN KEY (run_key)
    REFERENCES public.bot_reply_staging_runs (run_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_outcomes_request_fk
    FOREIGN KEY (provider_request_key)
    REFERENCES public.bot_reply_provider_request_claims (request_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_provider_outcomes_observation_key_sha256
    CHECK (
      observation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_observation_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_operation_key_sha256
    CHECK (
      operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_run_key_sha256
    CHECK (
      run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_request_key_sha256
    CHECK (
      provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_kind_dispatch_only
    CHECK (
      operation_kind IN (
        'text-send',
        'button-send',
        'customer-window-expired',
        'provider-retry',
        'pair-limit',
        'duplicate-safety'
      )
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_state_valid
    CHECK (state IN ('completed', 'indeterminate')),
  CONSTRAINT bot_reply_staging_provider_outcomes_kind_valid
    CHECK (
      (
        state = 'completed'
        AND provider_outcome_kind IN (
          'accepted',
          'sender-deferred',
          'pair-deferred',
          'service-window-rejected'
        )
      )
      OR
      (
        state = 'indeterminate'
        AND provider_outcome_kind IN (
          'ambiguous',
          'lease-expired-without-outcome'
        )
      )
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_evidence_key_valid
    CHECK (
      (
        provider_outcome_kind IN (
          'accepted',
          'ambiguous',
          'lease-expired-without-outcome'
        )
        AND evidence_key OPERATOR(pg_catalog.~)
          '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      )
      OR
      (
        provider_outcome_kind IN ('sender-deferred', 'pair-deferred')
        AND evidence_key OPERATOR(pg_catalog.~)
          '^bot_reply_provider_deferral_v1_[a-f0-9]{64}$'
      )
      OR
      (
        provider_outcome_kind = 'service-window-rejected'
        AND evidence_key OPERATOR(pg_catalog.~)
          '^bot_reply_window_rejection_v1_[a-f0-9]{64}$'
      )
    ),
  CONSTRAINT bot_reply_staging_provider_outcomes_time_canonical
    CHECK (
      observed_at = pg_catalog.date_trunc('milliseconds', observed_at)
      AND finalized_at = pg_catalog.date_trunc('milliseconds', finalized_at)
      AND created_at = finalized_at
      AND observed_at <= finalized_at
    )
);

CREATE INDEX bot_reply_staging_provider_outcomes_run_idx
  ON public.bot_reply_staging_provider_operation_outcomes (
    run_key,
    finalized_at,
    observation_key
  );

CREATE FUNCTION public.reject_bot_reply_staging_provider_operation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging provider operation is immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_provider_operations_update_guard
BEFORE UPDATE ON public.bot_reply_staging_provider_operations
FOR EACH ROW
EXECUTE FUNCTION public.reject_bot_reply_staging_provider_operation_mutation();

CREATE TRIGGER bot_reply_staging_provider_operations_delete_guard
BEFORE DELETE ON public.bot_reply_staging_provider_operations
FOR EACH ROW
EXECUTE FUNCTION public.reject_bot_reply_staging_provider_operation_mutation();

CREATE FUNCTION public.reject_bot_reply_staging_provider_outcome_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply staging provider operation outcome is immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_provider_outcomes_update_guard
BEFORE UPDATE ON public.bot_reply_staging_provider_operation_outcomes
FOR EACH ROW
EXECUTE FUNCTION public.reject_bot_reply_staging_provider_outcome_mutation();

CREATE TRIGGER bot_reply_staging_provider_outcomes_delete_guard
BEFORE DELETE ON public.bot_reply_staging_provider_operation_outcomes
FOR EACH ROW
EXECUTE FUNCTION public.reject_bot_reply_staging_provider_outcome_mutation();

-- Provider-outcome producers serialize in one exact order before their
-- durable fact becomes visible: delivery, reservation, provider request.
-- Finalize takes the same locks in the same order. This closes the window in
-- which a producer could insert a fact and then block on its delivery
-- projection while finalize published an expiry/no-fact verdict.
CREATE OR REPLACE FUNCTION public.enforce_bot_reply_provider_link_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'provider-message:' || NEW.tenant_id::pg_catalog.TEXT || ':' ||
        NEW.provider_message_id,
      0
    )
  );

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = NEW.delivery_key
    AND delivery.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = locked_delivery.claim_version
    AND request.reservation_key = NEW.reservation_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_delivery_provider_links AS link
    WHERE link.delivery_key = NEW.delivery_key
      AND link.tenant_id = NEW.tenant_id
      AND link.provider_message_id = NEW.provider_message_id
      AND link.reservation_key = NEW.reservation_key
      AND link.accepted_at = NEW.accepted_at
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.bot_reply_staging_provider_operation_outcomes AS outcome
      ON outcome.operation_key = operation.operation_key
    WHERE operation.provider_request_key = locked_request.request_key
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider link follows a finalized staging operation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.messages AS message
    WHERE message.tenant_id = NEW.tenant_id
      AND message.provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1
    FROM public.campaign_delivery_provider_links AS link
    WHERE link.tenant_id = NEW.tenant_id
      AND link.provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1
    FROM public.bot_reply_deliveries AS delivery
    WHERE delivery.tenant_id = NEW.tenant_id
      AND delivery.provider_message_id = NEW.provider_message_id
      AND delivery.delivery_key <> NEW.delivery_key
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to another target';
  END IF;

  IF locked_delivery.status <> 'sending'
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.reserved_at > NEW.accepted_at
    OR NEW.accepted_at > locked_reservation.reservation_expires_at
    OR locked_request.requested_at > NEW.accepted_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = NEW.reservation_key
    )
  THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_provider_deferral_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  existing_event public.bot_reply_provider_deferral_events%ROWTYPE;
BEGIN
  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = NEW.delivery_key
    AND delivery.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider deferral lacks an exact provider request claim';
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider deferral lacks an exact provider request claim';
  END IF;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version
    AND request.reservation_key = NEW.reservation_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply provider deferral lacks an exact provider request claim';
  END IF;

  SELECT event.*
  INTO existing_event
  FROM public.bot_reply_provider_deferral_events AS event
  WHERE event.event_key = NEW.event_key;

  IF FOUND THEN
    IF existing_event IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION 'Bot reply provider deferral identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.bot_reply_staging_provider_operation_outcomes AS outcome
      ON outcome.operation_key = operation.operation_key
    WHERE operation.provider_request_key = locked_request.request_key
  ) THEN
    RAISE EXCEPTION
      'Bot reply provider deferral follows a finalized staging operation';
  END IF;

  IF locked_delivery.status <> 'pending'
    OR locked_delivery.attempt_count <> 0
    OR locked_delivery.claim_version <> NEW.claim_version
    OR locked_delivery.next_attempt_at <> NEW.retry_at
    OR locked_delivery.deferred_at <> NEW.deferred_at
    OR locked_delivery.last_deferral_reason_code <> NEW.reason_code
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.reserved_at > NEW.attempted_at
    OR NEW.attempted_at > locked_reservation.reservation_expires_at
    OR locked_request.requested_at > NEW.attempted_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = NEW.reservation_key
        AND settlement.outcome = 'provider-failed'
        AND settlement.settled_at = NEW.attempted_at
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_provider_cooldown_events AS cooldown
      WHERE cooldown.reservation_key = NEW.reservation_key
        AND cooldown.scope = NEW.cooldown_scope
        AND cooldown.provider_error_code = NEW.provider_error_code
        AND cooldown.observed_at = NEW.attempted_at
        AND cooldown.blocked_until = NEW.retry_at
    )
  THEN
    RAISE EXCEPTION
      'Bot reply provider deferral lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_window_rejection_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  existing_event public.bot_reply_service_window_rejection_events%ROWTYPE;
BEGIN
  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = NEW.delivery_key
    AND delivery.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection lacks an exact provider request claim';
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection lacks an exact provider request claim';
  END IF;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version
    AND request.reservation_key = NEW.reservation_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection lacks an exact provider request claim';
  END IF;

  SELECT event.*
  INTO existing_event
  FROM public.bot_reply_service_window_rejection_events AS event
  WHERE event.event_key = NEW.event_key;

  IF FOUND THEN
    IF existing_event IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION
        'Bot reply service-window rejection identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.bot_reply_staging_provider_operation_outcomes AS outcome
      ON outcome.operation_key = operation.operation_key
    WHERE operation.provider_request_key = locked_request.request_key
  ) THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection follows a finalized staging operation';
  END IF;

  IF locked_delivery.status <> 'rejected'
    OR locked_delivery.claim_version <> NEW.claim_version
    OR locked_delivery.last_error_code <> NEW.reason_code
    OR locked_delivery.updated_at <> NEW.rejected_at
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.reserved_at <> NEW.attempted_at
    OR locked_request.requested_at > NEW.attempted_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = NEW.reservation_key
        AND settlement.outcome = 'provider-failed'
        AND settlement.settled_at = NEW.attempted_at
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.messages AS inbound
      WHERE inbound.tenant_id = NEW.tenant_id
        AND inbound.message_key = locked_delivery.inbound_message_key
        AND inbound.direction = 'inbound'
        AND inbound.occurred_at = NEW.service_window_opened_at
        AND inbound.occurred_at + INTERVAL '24 hours' =
          NEW.service_window_expires_at
    )
  THEN
    RAISE EXCEPTION
      'Bot reply service-window rejection lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_bot_reply_staging_late_ambiguous_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  matched_reservation_key TEXT;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
BEGIN
  IF NEW.status <> 'ambiguous'
    OR NEW.status IS NOT DISTINCT FROM OLD.status
  THEN
    RETURN NEW;
  END IF;

  -- The UPDATE already owns the delivery row lock. Resolve the immutable
  -- request identity, then take reservation and request locks in the shared
  -- producer/finalizer order.
  SELECT request.reservation_key
  INTO matched_reservation_key
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = matched_reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version
    AND request.reservation_key = matched_reservation_key
  FOR UPDATE;

  IF locked_reservation.reservation_key IS NULL
    OR locked_request.request_key IS NULL
  THEN
    RAISE EXCEPTION
      'Bot reply ambiguous outcome lacks its provider request fence';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.bot_reply_staging_provider_operation_outcomes AS outcome
      ON outcome.operation_key = operation.operation_key
    WHERE operation.provider_request_key = locked_request.request_key
  ) THEN
    RAISE EXCEPTION
      'Bot reply ambiguous outcome follows a finalized staging operation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_deliveries_staging_ambiguous_guard
BEFORE UPDATE OF status ON public.bot_reply_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_late_ambiguous_outcome();

-- A run that has crossed the provider boundary may not be reclaimed or
-- completed while its provider outcome is unresolved. This turns a worker
-- crash or a lost provider response into manual reconciliation, never an
-- automatic second Meta call.
CREATE FUNCTION public.guard_bot_reply_staging_provider_operation_reclaim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF (
      NEW.claim_version > OLD.claim_version
      OR (OLD.status = 'running' AND NEW.status = 'completed')
    )
    AND EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_provider_operations AS operation
      LEFT JOIN public.bot_reply_staging_provider_operation_outcomes
        AS outcome
        ON outcome.operation_key = operation.operation_key
      WHERE operation.run_key = OLD.run_key
        AND operation.run_claim_version = OLD.claim_version
        AND (
          outcome.operation_key IS NULL
          OR outcome.state <> 'completed'
        )
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation requires reconciliation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bot_reply_staging_runs_provider_operation_reclaim_guard
BEFORE UPDATE ON public.bot_reply_staging_runs
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_provider_operation_reclaim();

CREATE FUNCTION public.reserve_bot_reply_staging_provider_operation_v1(
  requested_run_key TEXT,
  requested_tenant_id BIGINT,
  requested_request_digest TEXT,
  requested_audit_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_run_claim_version INTEGER,
  requested_run_lease_expires_at TIMESTAMPTZ,
  requested_operation_key TEXT,
  requested_operation_kind TEXT,
  requested_delivery_key TEXT,
  requested_delivery_claim_version INTEGER,
  requested_reservation_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "operationKey" TEXT,
  "providerRequestKey" TEXT,
  state TEXT,
  "requestedAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  inserted_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_outcome
    public.bot_reply_staging_provider_operation_outcomes%ROWTYPE;
  database_now TIMESTAMPTZ;
  provider_request_key TEXT;
  provider_request_inserted BOOLEAN;
BEGIN
  IF requested_run_key IS NULL
    OR NOT requested_run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    OR requested_tenant_id IS NULL
    OR requested_tenant_id < 1
    OR requested_request_digest IS NULL
    OR NOT requested_request_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_audit_key IS NULL
    OR NOT requested_audit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_audit_v1_[a-f0-9]{64}$'
    OR requested_release_id IS NULL
    OR NOT requested_release_id OPERATOR(pg_catalog.~)
      '^connect_release_v1_[a-f0-9]{64}$'
    OR requested_commit_sha IS NULL
    OR NOT requested_commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'
    OR requested_artifact_digest IS NULL
    OR NOT requested_artifact_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_run_claim_version IS NULL
    OR requested_run_claim_version < 1
    OR requested_run_lease_expires_at IS NULL
    OR requested_run_lease_expires_at <>
      pg_catalog.date_trunc(
        'milliseconds',
        requested_run_lease_expires_at
      )
    OR requested_operation_key IS NULL
    OR NOT requested_operation_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
    OR requested_operation_kind IS NULL
    OR requested_operation_kind NOT IN (
      'text-send',
      'button-send',
      'customer-window-expired',
      'provider-retry',
      'pair-limit',
      'duplicate-safety'
    )
    OR requested_delivery_key IS NULL
    OR NOT requested_delivery_key OPERATOR(pg_catalog.~)
      '^bot_reply_delivery_v1_[a-f0-9]{64}$'
    OR requested_delivery_claim_version IS NULL
    OR requested_delivery_claim_version < 1
    OR requested_reservation_key IS NULL
    OR NOT requested_reservation_key OPERATOR(pg_catalog.~)
      '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation requires read committed isolation';
  END IF;

  -- An already committed operation is a closed capability. Validate every
  -- caller-bound field, then return no request key and no timestamp even when
  -- the run, delivery, reservation, or authorization has since gone stale.
  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = requested_operation_key
  FOR UPDATE;

  IF stored_operation.operation_key IS NULL THEN
    -- New reservations serialize first on the run. A concurrent reserver of
    -- the same run must commit before this transaction can recheck the
    -- operation under a fresh READ COMMITTED statement snapshot.
    SELECT staging_run.*
    INTO active_run
    FROM public.bot_reply_staging_runs AS staging_run
    WHERE staging_run.run_key = requested_run_key
    FOR UPDATE;

    SELECT operation.*
    INTO stored_operation
    FROM public.bot_reply_staging_provider_operations AS operation
    WHERE operation.operation_key = requested_operation_key
    FOR UPDATE;
  END IF;

  IF stored_operation.operation_key IS NOT NULL THEN
    IF stored_operation.run_key <> requested_run_key
      OR stored_operation.tenant_id <> requested_tenant_id
      OR stored_operation.request_digest <> requested_request_digest
      OR stored_operation.audit_key <> requested_audit_key
      OR stored_operation.release_id <> requested_release_id
      OR stored_operation.commit_sha <> requested_commit_sha
      OR stored_operation.artifact_digest <> requested_artifact_digest
      OR stored_operation.run_claim_version <>
        requested_run_claim_version
      OR stored_operation.run_lease_expires_at <>
        requested_run_lease_expires_at
      OR stored_operation.operation_kind <> requested_operation_kind
      OR stored_operation.delivery_key <> requested_delivery_key
      OR stored_operation.delivery_claim_version <>
        requested_delivery_claim_version
      OR stored_operation.reservation_key <> requested_reservation_key
    THEN
      RAISE EXCEPTION
        'Bot reply staging provider operation replay scope conflicts';
    END IF;

    SELECT provider_outcome.*
    INTO stored_outcome
    FROM public.bot_reply_staging_provider_operation_outcomes
      AS provider_outcome
    WHERE provider_outcome.operation_key = stored_operation.operation_key;

    RETURN QUERY SELECT
      'replay-blocked'::TEXT,
      requested_operation_key,
      NULL::TEXT,
      CASE
        WHEN stored_outcome.operation_key IS NULL THEN 'reserved'::TEXT
        ELSE stored_outcome.state
      END,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = requested_tenant_id
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = requested_delivery_key
    AND delivery.tenant_id = requested_tenant_id
  FOR UPDATE;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = requested_reservation_key
    AND reservation.tenant_id = requested_tenant_id
  FOR UPDATE;

  -- Do not use a clock sampled before any lock wait. Every time-sensitive
  -- admission check below observes this post-lock database instant.
  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF active_run.run_key IS NULL
    OR active_run.tenant_id <> requested_tenant_id
    OR active_run.request_digest <> requested_request_digest
    OR active_run.audit_key <> requested_audit_key
    OR active_run.release_id <> requested_release_id
    OR active_run.commit_sha <> requested_commit_sha
    OR active_run.artifact_digest <> requested_artifact_digest
    OR active_run.claim_version <> requested_run_claim_version
    OR active_run.lease_expires_at <>
      requested_run_lease_expires_at
    OR active_run.status <> 'running'
    OR database_now < active_run.started_at
    OR database_now >= active_run.lease_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation lacks an exact active run';
  END IF;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = requested_tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1;

  IF current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
    OR current_policy.tenant_id IS NULL
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.meta_graph_api_version <>
      active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR requested_run_lease_expires_at >
      current_policy.evidence_expires_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.meta_credential_envelopes AS credential
      WHERE credential.tenant_id = requested_tenant_id
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation lacks current provider policy';
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events
    AS authorization_event
  WHERE authorization_event.tenant_id = requested_tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1;

  IF NOT FOUND
    OR active_authorization.status <> 'approved'
    OR active_authorization.connection_version <>
      active_run.connection_version
    OR active_authorization.policy_version <> active_run.policy_version
    OR active_authorization.recipient_fingerprint <>
      active_run.recipient_fingerprint
    OR active_authorization.rate_limit_method_fingerprint <>
      active_run.rate_limit_method_fingerprint
    OR active_authorization.recorded_at > database_now
    OR database_now >= active_authorization.recipient_expires_at
    OR database_now >= active_authorization.rate_limit_expires_at
    OR requested_run_lease_expires_at >
      active_authorization.recipient_expires_at
    OR requested_run_lease_expires_at >
      active_authorization.rate_limit_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation lacks current authorization';
  END IF;

  IF locked_delivery.delivery_key IS NULL
    OR locked_delivery.status <> 'sending'
    OR locked_delivery.attempt_count <> 1
    OR locked_delivery.claim_version <>
      requested_delivery_claim_version
    OR locked_delivery.updated_at > database_now
    OR locked_reservation.reservation_key IS NULL
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.reserved_at > database_now
    OR database_now >= locked_reservation.reservation_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = requested_reservation_key
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider operation lacks exact delivery admission';
  END IF;

  provider_request_key := 'bot_reply_provider_request_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-provider-operation-request-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_run_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_request_digest, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_operation_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_delivery_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          requested_delivery_claim_version::TEXT,
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_reservation_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          pg_catalog.to_char(
            database_now AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'UTF8'
        )
      ),
      'hex'
    );

  INSERT INTO public.bot_reply_staging_provider_operations (
    operation_key,
    run_key,
    tenant_id,
    request_digest,
    audit_key,
    release_id,
    commit_sha,
    artifact_digest,
    run_claim_version,
    run_lease_expires_at,
    operation_kind,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    provider_request_key,
    requested_at,
    created_at
  ) VALUES (
    requested_operation_key,
    requested_run_key,
    requested_tenant_id,
    requested_request_digest,
    requested_audit_key,
    requested_release_id,
    requested_commit_sha,
    requested_artifact_digest,
    requested_run_claim_version,
    requested_run_lease_expires_at,
    requested_operation_kind,
    requested_delivery_key,
    requested_delivery_claim_version,
    requested_reservation_key,
    provider_request_key,
    database_now,
    database_now
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO inserted_operation;

  IF NOT FOUND THEN
    SELECT operation.*
    INTO stored_operation
    FROM public.bot_reply_staging_provider_operations AS operation
    WHERE operation.operation_key = requested_operation_key
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Bot reply staging provider operation replay disappeared';
    END IF;

    IF stored_operation.run_key <> requested_run_key
      OR stored_operation.tenant_id <> requested_tenant_id
      OR stored_operation.request_digest <> requested_request_digest
      OR stored_operation.audit_key <> requested_audit_key
      OR stored_operation.release_id <> requested_release_id
      OR stored_operation.commit_sha <> requested_commit_sha
      OR stored_operation.artifact_digest <> requested_artifact_digest
      OR stored_operation.run_claim_version <>
        requested_run_claim_version
      OR stored_operation.run_lease_expires_at <>
        requested_run_lease_expires_at
      OR stored_operation.operation_kind <> requested_operation_kind
      OR stored_operation.delivery_key <> requested_delivery_key
      OR stored_operation.delivery_claim_version <>
        requested_delivery_claim_version
      OR stored_operation.reservation_key <> requested_reservation_key
    THEN
      RAISE EXCEPTION
        'Bot reply staging provider operation replay scope conflicts';
    END IF;

    SELECT provider_outcome.*
    INTO stored_outcome
    FROM public.bot_reply_staging_provider_operation_outcomes
      AS provider_outcome
    WHERE provider_outcome.operation_key = stored_operation.operation_key;

    RETURN QUERY SELECT
      'replay-blocked'::TEXT,
      requested_operation_key,
      NULL::TEXT,
      CASE
        WHEN stored_outcome.operation_key IS NULL THEN 'reserved'::TEXT
        ELSE stored_outcome.state
      END,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  WITH inserted_request AS (
    INSERT INTO public.bot_reply_provider_request_claims (
      request_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      requested_at,
      created_at
    ) VALUES (
      provider_request_key,
      requested_delivery_key,
      requested_tenant_id,
      requested_delivery_claim_version,
      requested_reservation_key,
      database_now,
      database_now
    )
    ON CONFLICT DO NOTHING
    RETURNING request_key
  )
  SELECT EXISTS (
    SELECT 1 FROM inserted_request
  ) INTO provider_request_inserted;

  IF NOT provider_request_inserted THEN
    RAISE EXCEPTION
      'Bot reply staging provider request identity is already fenced';
  END IF;

  RETURN QUERY SELECT
    'authorized'::TEXT,
    inserted_operation.operation_key,
    inserted_operation.provider_request_key,
    'reserved'::TEXT,
    inserted_operation.requested_at;
END;
$$;

CREATE FUNCTION public.finalize_bot_reply_staging_provider_operation_v1(
  requested_run_key TEXT,
  requested_tenant_id BIGINT,
  requested_request_digest TEXT,
  requested_audit_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_run_claim_version INTEGER,
  requested_run_lease_expires_at TIMESTAMPTZ,
  requested_operation_key TEXT,
  requested_operation_kind TEXT,
  requested_delivery_key TEXT,
  requested_delivery_claim_version INTEGER,
  requested_reservation_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "operationKey" TEXT,
  state TEXT,
  "providerOutcomeKind" TEXT,
  "observationKey" TEXT,
  "finalizedAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_outcome
    public.bot_reply_staging_provider_operation_outcomes%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  database_now TIMESTAMPTZ;
  accepted_evidence_key TEXT;
  accepted_observed_at TIMESTAMPTZ;
  deferral_evidence_key TEXT;
  deferral_observed_at TIMESTAMPTZ;
  deferral_provider_error_code INTEGER;
  rejection_evidence_key TEXT;
  rejection_observed_at TIMESTAMPTZ;
  ambiguous_observed_at TIMESTAMPTZ;
  exact_fact_count INTEGER;
  derived_state TEXT;
  derived_outcome_kind TEXT;
  derived_evidence_key TEXT;
  derived_observed_at TIMESTAMPTZ;
  derived_observation_key TEXT;
BEGIN
  IF requested_run_key IS NULL
    OR NOT requested_run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    OR requested_tenant_id IS NULL
    OR requested_tenant_id < 1
    OR requested_request_digest IS NULL
    OR NOT requested_request_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_audit_key IS NULL
    OR NOT requested_audit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_audit_v1_[a-f0-9]{64}$'
    OR requested_release_id IS NULL
    OR NOT requested_release_id OPERATOR(pg_catalog.~)
      '^connect_release_v1_[a-f0-9]{64}$'
    OR requested_commit_sha IS NULL
    OR NOT requested_commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'
    OR requested_artifact_digest IS NULL
    OR NOT requested_artifact_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_run_claim_version IS NULL
    OR requested_run_claim_version < 1
    OR requested_run_lease_expires_at IS NULL
    OR requested_run_lease_expires_at <>
      pg_catalog.date_trunc(
        'milliseconds',
        requested_run_lease_expires_at
      )
    OR requested_operation_key IS NULL
    OR NOT requested_operation_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
    OR requested_operation_kind IS NULL
    OR requested_operation_kind NOT IN (
      'text-send',
      'button-send',
      'customer-window-expired',
      'provider-retry',
      'pair-limit',
      'duplicate-safety'
    )
    OR requested_delivery_key IS NULL
    OR NOT requested_delivery_key OPERATOR(pg_catalog.~)
      '^bot_reply_delivery_v1_[a-f0-9]{64}$'
    OR requested_delivery_claim_version IS NULL
    OR requested_delivery_claim_version < 1
    OR requested_reservation_key IS NULL
    OR NOT requested_reservation_key OPERATOR(pg_catalog.~)
      '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider finalization input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider finalization requires read committed isolation';
  END IF;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = requested_operation_key
  FOR UPDATE;

  IF NOT FOUND
    OR stored_operation.run_key <> requested_run_key
    OR stored_operation.tenant_id <> requested_tenant_id
    OR stored_operation.request_digest <> requested_request_digest
    OR stored_operation.audit_key <> requested_audit_key
    OR stored_operation.release_id <> requested_release_id
    OR stored_operation.commit_sha <> requested_commit_sha
    OR stored_operation.artifact_digest <> requested_artifact_digest
    OR stored_operation.run_claim_version <>
      requested_run_claim_version
    OR stored_operation.run_lease_expires_at <>
      requested_run_lease_expires_at
    OR stored_operation.operation_kind <> requested_operation_kind
    OR stored_operation.delivery_key <> requested_delivery_key
    OR stored_operation.delivery_claim_version <>
      requested_delivery_claim_version
    OR stored_operation.reservation_key <> requested_reservation_key
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider finalization scope conflicts';
  END IF;

  SELECT provider_outcome.*
  INTO stored_outcome
  FROM public.bot_reply_staging_provider_operation_outcomes
    AS provider_outcome
  WHERE provider_outcome.operation_key = requested_operation_key;

  IF FOUND THEN
    RETURN QUERY SELECT
      'replayed'::TEXT,
      stored_operation.operation_key,
      stored_outcome.state,
      stored_outcome.provider_outcome_kind,
      stored_outcome.observation_key,
      stored_outcome.finalized_at;
    RETURN;
  END IF;

  -- The durable outcome producers hardened above take these exact locks in
  -- this exact order. At READ COMMITTED, every statement after a wait gets a
  -- fresh snapshot, and the clock is sampled only after all locks are held.
  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = stored_operation.delivery_key
    AND delivery.tenant_id = stored_operation.tenant_id
  FOR UPDATE;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = stored_operation.reservation_key
    AND reservation.tenant_id = stored_operation.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.request_key = stored_operation.provider_request_key
  FOR UPDATE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF locked_delivery.delivery_key IS NULL
    OR locked_delivery.claim_version <>
      stored_operation.delivery_claim_version
    OR locked_reservation.reservation_key IS NULL
    OR locked_request.request_key IS NULL
    OR locked_request.delivery_key <> stored_operation.delivery_key
    OR locked_request.tenant_id <> stored_operation.tenant_id
    OR locked_request.claim_version <>
      stored_operation.delivery_claim_version
    OR locked_request.reservation_key <>
      stored_operation.reservation_key
    OR locked_request.requested_at <> stored_operation.requested_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider request fence is missing';
  END IF;

  SELECT link.delivery_key, link.accepted_at
  INTO accepted_evidence_key, accepted_observed_at
  FROM public.bot_reply_deliveries AS delivery
  INNER JOIN public.bot_reply_delivery_provider_links AS link
    ON link.delivery_key = delivery.delivery_key
   AND link.tenant_id = delivery.tenant_id
   AND link.provider_message_id = delivery.provider_message_id
   AND link.accepted_at = delivery.accepted_at
  INNER JOIN public.bot_reply_provider_request_claims AS request
    ON request.request_key = stored_operation.provider_request_key
   AND request.delivery_key = link.delivery_key
   AND request.tenant_id = link.tenant_id
   AND request.reservation_key = link.reservation_key
   AND request.requested_at <= link.accepted_at
  WHERE link.delivery_key = stored_operation.delivery_key
    AND link.tenant_id = stored_operation.tenant_id
    AND link.reservation_key = stored_operation.reservation_key
    AND delivery.status = 'accepted'
    AND delivery.attempt_count = 1
    AND delivery.claim_version = stored_operation.delivery_claim_version;

  SELECT deferral.event_key, deferral.attempted_at,
    deferral.provider_error_code
  INTO deferral_evidence_key, deferral_observed_at,
    deferral_provider_error_code
  FROM public.bot_reply_provider_deferral_events AS deferral
  INNER JOIN public.bot_reply_provider_request_claims AS request
    ON request.request_key = stored_operation.provider_request_key
   AND request.delivery_key = deferral.delivery_key
   AND request.tenant_id = deferral.tenant_id
   AND request.claim_version = deferral.claim_version
   AND request.reservation_key = deferral.reservation_key
   AND request.requested_at <= deferral.attempted_at
  WHERE deferral.delivery_key = stored_operation.delivery_key
    AND deferral.tenant_id = stored_operation.tenant_id
    AND deferral.claim_version =
      stored_operation.delivery_claim_version
    AND deferral.reservation_key = stored_operation.reservation_key;

  SELECT rejection.event_key, rejection.attempted_at
  INTO rejection_evidence_key, rejection_observed_at
  FROM public.bot_reply_service_window_rejection_events AS rejection
  INNER JOIN public.bot_reply_provider_request_claims AS request
    ON request.request_key = stored_operation.provider_request_key
   AND request.delivery_key = rejection.delivery_key
   AND request.tenant_id = rejection.tenant_id
   AND request.claim_version = rejection.claim_version
   AND request.reservation_key = rejection.reservation_key
   AND request.requested_at <= rejection.attempted_at
  WHERE rejection.delivery_key = stored_operation.delivery_key
    AND rejection.tenant_id = stored_operation.tenant_id
    AND rejection.claim_version =
      stored_operation.delivery_claim_version
    AND rejection.reservation_key = stored_operation.reservation_key
    AND rejection.provider_error_code = 131047
    AND rejection.reason_code = 'META_SERVICE_WINDOW_CLOSED';

  SELECT delivery.updated_at
  INTO ambiguous_observed_at
  FROM public.bot_reply_deliveries AS delivery
  INNER JOIN public.bot_reply_provider_request_claims AS request
    ON request.request_key = stored_operation.provider_request_key
   AND request.delivery_key = delivery.delivery_key
   AND request.tenant_id = delivery.tenant_id
   AND request.claim_version = delivery.claim_version
  WHERE delivery.delivery_key = stored_operation.delivery_key
    AND delivery.tenant_id = stored_operation.tenant_id
    AND delivery.claim_version = stored_operation.delivery_claim_version
    AND delivery.status = 'ambiguous'
    AND delivery.last_error_code = 'DELIVERY_OUTCOME_UNKNOWN'
    AND delivery.updated_at >= request.requested_at;

  exact_fact_count :=
    CASE WHEN accepted_evidence_key IS NULL THEN 0 ELSE 1 END +
    CASE WHEN deferral_evidence_key IS NULL THEN 0 ELSE 1 END +
    CASE WHEN rejection_evidence_key IS NULL THEN 0 ELSE 1 END +
    CASE WHEN ambiguous_observed_at IS NULL THEN 0 ELSE 1 END;

  IF exact_fact_count > 1 THEN
    RAISE EXCEPTION
      'Bot reply staging provider outcome evidence conflicts';
  END IF;

  IF accepted_evidence_key IS NOT NULL THEN
    IF stored_operation.operation_kind NOT IN (
      'text-send',
      'button-send',
      'duplicate-safety'
    )
    THEN
      RAISE EXCEPTION
        'Bot reply staging accepted outcome kind conflicts';
    END IF;
    derived_state := 'completed';
    derived_outcome_kind := 'accepted';
    derived_evidence_key := accepted_evidence_key;
    derived_observed_at := accepted_observed_at;
  ELSIF deferral_evidence_key IS NOT NULL THEN
    IF deferral_provider_error_code = 130429
      AND stored_operation.operation_kind = 'provider-retry'
    THEN
      derived_state := 'completed';
      derived_outcome_kind := 'sender-deferred';
    ELSIF deferral_provider_error_code = 131056
      AND stored_operation.operation_kind = 'pair-limit'
    THEN
      derived_state := 'completed';
      derived_outcome_kind := 'pair-deferred';
    ELSE
      RAISE EXCEPTION
        'Bot reply staging deferral outcome kind conflicts';
    END IF;
    derived_evidence_key := deferral_evidence_key;
    derived_observed_at := deferral_observed_at;
  ELSIF rejection_evidence_key IS NOT NULL THEN
    IF stored_operation.operation_kind <> 'customer-window-expired' THEN
      RAISE EXCEPTION
        'Bot reply staging rejection outcome kind conflicts';
    END IF;
    derived_state := 'completed';
    derived_outcome_kind := 'service-window-rejected';
    derived_evidence_key := rejection_evidence_key;
    derived_observed_at := rejection_observed_at;
  ELSIF ambiguous_observed_at IS NOT NULL THEN
    derived_state := 'indeterminate';
    derived_outcome_kind := 'ambiguous';
    derived_evidence_key := stored_operation.delivery_key;
    derived_observed_at := ambiguous_observed_at;
  ELSIF database_now < stored_operation.run_lease_expires_at THEN
    RETURN QUERY SELECT
      'pending'::TEXT,
      stored_operation.operation_key,
      'reserved'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  ELSE
    derived_state := 'indeterminate';
    derived_outcome_kind := 'lease-expired-without-outcome';
    derived_evidence_key := stored_operation.delivery_key;
    derived_observed_at := database_now;
  END IF;

  IF derived_observed_at < stored_operation.requested_at
    OR derived_observed_at > database_now
    OR (
      derived_state = 'completed'
      AND derived_observed_at >= stored_operation.run_lease_expires_at
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider outcome time conflicts';
  END IF;

  derived_observation_key := 'bot_reply_staging_observation_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-provider-operation-outcome-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(stored_operation.operation_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          stored_operation.provider_request_key,
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(derived_state, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(derived_outcome_kind, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(derived_evidence_key, 'UTF8')
      ),
      'hex'
    );

  INSERT INTO public.bot_reply_staging_provider_operation_outcomes (
    observation_key,
    operation_key,
    run_key,
    tenant_id,
    provider_request_key,
    operation_kind,
    state,
    provider_outcome_kind,
    evidence_key,
    observed_at,
    finalized_at,
    created_at
  ) VALUES (
    derived_observation_key,
    stored_operation.operation_key,
    stored_operation.run_key,
    stored_operation.tenant_id,
    stored_operation.provider_request_key,
    stored_operation.operation_kind,
    derived_state,
    derived_outcome_kind,
    derived_evidence_key,
    derived_observed_at,
    database_now,
    database_now
  )
  RETURNING * INTO stored_outcome;

  RETURN QUERY SELECT
    'finalized'::TEXT,
    stored_operation.operation_key,
    stored_outcome.state,
    stored_outcome.provider_outcome_kind,
    stored_outcome.observation_key,
    stored_outcome.finalized_at;
END;
$$;

REVOKE ALL ON TABLE
  public.bot_reply_provider_request_claims,
  public.bot_reply_staging_provider_operations,
  public.bot_reply_staging_provider_operation_outcomes
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.enforce_bot_reply_provider_request_insert()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_provider_request_mutation()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_whatsapp_rate_settlement_insert()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_staging_provider_operation_mutation()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_staging_provider_outcome_mutation()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_bot_reply_provider_link_insert()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_bot_reply_provider_deferral_insert()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_bot_reply_window_rejection_insert()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_late_ambiguous_outcome()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_provider_operation_reclaim()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reserve_bot_reply_staging_provider_operation_v1(
    TEXT,
    BIGINT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TEXT
  )
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.finalize_bot_reply_staging_provider_operation_v1(
    TEXT,
    BIGINT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TEXT
  )
FROM PUBLIC;

DO $d31d1d_postcondition$
DECLARE
  exact_column_count INTEGER;
  actual_column_count INTEGER;
  hardened_function_count INTEGER;
  bound_trigger_count INTEGER;
  public_function_acl_count INTEGER;
  public_table_acl_count INTEGER;
BEGIN
  WITH expected_columns(table_name, column_name, type_name) AS (
    VALUES
      ('bot_reply_staging_provider_operations', 'operation_key', 'text'),
      ('bot_reply_staging_provider_operations', 'run_key', 'text'),
      ('bot_reply_staging_provider_operations', 'tenant_id', 'int8'),
      ('bot_reply_staging_provider_operations', 'request_digest', 'text'),
      ('bot_reply_staging_provider_operations', 'audit_key', 'text'),
      ('bot_reply_staging_provider_operations', 'release_id', 'text'),
      ('bot_reply_staging_provider_operations', 'commit_sha', 'text'),
      ('bot_reply_staging_provider_operations', 'artifact_digest', 'text'),
      ('bot_reply_staging_provider_operations', 'run_claim_version', 'int4'),
      ('bot_reply_staging_provider_operations', 'run_lease_expires_at', 'timestamptz'),
      ('bot_reply_staging_provider_operations', 'operation_kind', 'text'),
      ('bot_reply_staging_provider_operations', 'delivery_key', 'text'),
      ('bot_reply_staging_provider_operations', 'delivery_claim_version', 'int4'),
      ('bot_reply_staging_provider_operations', 'reservation_key', 'text'),
      ('bot_reply_staging_provider_operations', 'provider_request_key', 'text'),
      ('bot_reply_staging_provider_operations', 'requested_at', 'timestamptz'),
      ('bot_reply_staging_provider_operations', 'created_at', 'timestamptz'),
      ('bot_reply_staging_provider_operation_outcomes', 'observation_key', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'operation_key', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'run_key', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'tenant_id', 'int8'),
      ('bot_reply_staging_provider_operation_outcomes', 'provider_request_key', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'operation_kind', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'state', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'provider_outcome_kind', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'evidence_key', 'text'),
      ('bot_reply_staging_provider_operation_outcomes', 'observed_at', 'timestamptz'),
      ('bot_reply_staging_provider_operation_outcomes', 'finalized_at', 'timestamptz'),
      ('bot_reply_staging_provider_operation_outcomes', 'created_at', 'timestamptz')
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO exact_column_count
  FROM expected_columns AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname = expected.table_name
   AND relation.relkind = 'r'
  INNER JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = relation.oid
   AND attribute.attname = expected.column_name
   AND attribute.attnum > 0
   AND attribute.attisdropped = false
  INNER JOIN pg_catalog.pg_type AS type
    ON type.oid = attribute.atttypid
   AND type.typname = expected.type_name;

  SELECT pg_catalog.count(*)::INTEGER
  INTO actual_column_count
  FROM pg_catalog.pg_attribute AS attribute
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = attribute.attrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_provider_operations',
      'bot_reply_staging_provider_operation_outcomes'
    )
    AND relation.relkind = 'r'
    AND attribute.attnum > 0
    AND attribute.attisdropped = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO hardened_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_provider_request_insert',
      'reject_bot_reply_provider_request_mutation',
      'enforce_whatsapp_rate_settlement_insert',
      'reject_bot_reply_staging_provider_operation_mutation',
      'reject_bot_reply_staging_provider_outcome_mutation',
      'enforce_bot_reply_provider_link_insert',
      'enforce_bot_reply_provider_deferral_insert',
      'enforce_bot_reply_window_rejection_insert',
      'guard_bot_reply_staging_late_ambiguous_outcome',
      'guard_bot_reply_staging_provider_operation_reclaim',
      'reserve_bot_reply_staging_provider_operation_v1',
      'finalize_bot_reply_staging_provider_operation_v1'
    )
    AND procedure.prokind = 'f'
    AND procedure.prosecdef = false
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[];

  WITH expected_triggers(table_name, trigger_name, function_name) AS (
    VALUES
      ('bot_reply_provider_request_claims', 'bot_reply_provider_requests_insert_guard', 'enforce_bot_reply_provider_request_insert'),
      ('bot_reply_provider_request_claims', 'bot_reply_provider_requests_update_guard', 'reject_bot_reply_provider_request_mutation'),
      ('bot_reply_provider_request_claims', 'bot_reply_provider_requests_delete_guard', 'reject_bot_reply_provider_request_mutation'),
      ('whatsapp_rate_limit_settlements', 'whatsapp_rate_settlements_insert_guard', 'enforce_whatsapp_rate_settlement_insert'),
      ('bot_reply_delivery_provider_links', 'bot_reply_provider_links_insert_guard', 'enforce_bot_reply_provider_link_insert'),
      ('bot_reply_provider_deferral_events', 'bot_reply_provider_deferrals_insert_guard', 'enforce_bot_reply_provider_deferral_insert'),
      ('bot_reply_service_window_rejection_events', 'bot_reply_window_rejection_insert_guard', 'enforce_bot_reply_window_rejection_insert'),
      ('bot_reply_deliveries', 'bot_reply_deliveries_staging_ambiguous_guard', 'guard_bot_reply_staging_late_ambiguous_outcome'),
      ('bot_reply_staging_provider_operations', 'bot_reply_staging_provider_operations_update_guard', 'reject_bot_reply_staging_provider_operation_mutation'),
      ('bot_reply_staging_provider_operations', 'bot_reply_staging_provider_operations_delete_guard', 'reject_bot_reply_staging_provider_operation_mutation'),
      ('bot_reply_staging_provider_operation_outcomes', 'bot_reply_staging_provider_outcomes_update_guard', 'reject_bot_reply_staging_provider_outcome_mutation'),
      ('bot_reply_staging_provider_operation_outcomes', 'bot_reply_staging_provider_outcomes_delete_guard', 'reject_bot_reply_staging_provider_outcome_mutation'),
      ('bot_reply_staging_runs', 'bot_reply_staging_runs_provider_operation_reclaim_guard', 'guard_bot_reply_staging_provider_operation_reclaim')
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO bound_trigger_count
  FROM expected_triggers AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname = expected.table_name
  INNER JOIN pg_catalog.pg_trigger AS trigger
    ON trigger.tgrelid = relation.oid
   AND trigger.tgname = expected.trigger_name
   AND trigger.tgisinternal = false
   AND trigger.tgenabled = 'O'
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
   AND procedure.proname = expected.function_name;

  SELECT pg_catalog.count(*)::INTEGER
  INTO public_function_acl_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      procedure.proacl,
      pg_catalog.acldefault('f', procedure.proowner)
    )
  ) AS privilege
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_provider_request_insert',
      'reject_bot_reply_provider_request_mutation',
      'enforce_whatsapp_rate_settlement_insert',
      'reject_bot_reply_staging_provider_operation_mutation',
      'reject_bot_reply_staging_provider_outcome_mutation',
      'enforce_bot_reply_provider_link_insert',
      'enforce_bot_reply_provider_deferral_insert',
      'enforce_bot_reply_window_rejection_insert',
      'guard_bot_reply_staging_late_ambiguous_outcome',
      'guard_bot_reply_staging_provider_operation_reclaim',
      'reserve_bot_reply_staging_provider_operation_v1',
      'finalize_bot_reply_staging_provider_operation_v1'
    )
    AND privilege.grantee = 0;

  SELECT pg_catalog.count(*)::INTEGER
  INTO public_table_acl_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      relation.relacl,
      pg_catalog.acldefault('r', relation.relowner)
    )
  ) AS privilege
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_provider_operations',
      'bot_reply_staging_provider_operation_outcomes'
    )
    AND privilege.grantee = 0;

  IF exact_column_count <> 29
    OR actual_column_count <> 29
    OR hardened_function_count <> 12
    OR bound_trigger_count <> 13
    OR public_function_acl_count <> 0
    OR public_table_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-A postcondition failed: exact columns %, actual columns %, functions %, triggers %, function ACLs %, table ACLs %',
      exact_column_count,
      actual_column_count,
      hardened_function_count,
      bound_trigger_count,
      public_function_acl_count,
      public_table_acl_count;
  END IF;
END;
$d31d1d_postcondition$;

-- Deliberately no ROLE, GRANT, SECURITY DEFINER, runtime wiring, provider I/O,
-- credential, recipient address, payload, or provider message identifier.
-- D31-D1d-A rechecks the exact half-open reservation expiry only. The
-- immediate pre-send 24-hour customer-service-window recheck and the
-- commit-before-token bridge remain explicit D31-D1d-B activation blockers.
