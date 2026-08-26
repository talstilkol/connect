-- D31-D1e dormant writer cooperation and late-provider-truth contract.
--
-- This migration performs no Runtime activation. It creates no role, grant,
-- provider transport, secret reader, or elevated-rights function. The only
-- externally supplied identities accepted by the provider writers are one
-- immutable permit key and one validated outcome union. Tenant, operation,
-- provider-request, claim and timestamp identities are recovered from durable
-- database evidence. Every timestamp written below is database-derived.

DO $d31d1e_precondition$
DECLARE
  existing_function_count INTEGER;
  prerequisite_function_count INTEGER;
  prerequisite_relation_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'assert_bot_reply_staging_tenant_barrier_owned_v1',
      'assert_bot_reply_staging_exact_session_barrier_v1',
      'guard_bot_reply_staging_exact_permit_insert_v1',
      'guard_bot_reply_staging_exact_operation_insert_v1',
      'guard_bot_reply_staging_tenant_barrier_write_v1',
      'guard_whatsapp_portfolio_state_tenant_barrier_v1',
      'guard_bot_reply_staging_scope_admission_insert_v1',
      'reject_message_occurred_at_mutation_v1',
      'reserve_and_bind_bot_reply_staging_service_reply_v1',
      'write_bot_reply_staging_pre_send_admission_v1',
      'write_bot_reply_staging_provider_fact_v1',
      'write_bot_reply_staging_provider_uncertainty_v1'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO prerequisite_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.oid IN (
      pg_catalog.to_regprocedure(
        'public.derive_bot_reply_staging_tenant_barrier_key_v1(bigint)'
      ),
      pg_catalog.to_regprocedure(
        'public.derive_bot_reply_staging_reconciliation_marker_key_v1(bigint,text)'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_bot_reply_staging_pre_send_ledger_mutation()'
      ),
      pg_catalog.to_regprocedure(
        'public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(text)'
      )
    )
    AND procedure.prosecdef = FALSE
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[];

  SELECT pg_catalog.count(*)::INTEGER
  INTO prerequisite_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind = 'r'
    AND relation.relname IN (
      'messages',
      'bot_reply_staging_pre_send_admission_bindings',
      'bot_reply_staging_credential_bound_pre_send_permits',
      'bot_reply_staging_provider_boundary_claims',
      'bot_reply_staging_provider_uncertainty_events',
      'bot_reply_staging_provider_operations',
      'bot_reply_provider_request_claims',
      'bot_reply_delivery_provider_links',
      'bot_reply_provider_deferral_events',
      'bot_reply_service_window_rejection_events'
    );

  IF existing_function_count <> 0
    OR prerequisite_function_count <> 4
    OR prerequisite_relation_count <> 10
  THEN
    RAISE EXCEPTION
      'D31-D1e precondition failed: existing functions %, prerequisite functions %, prerequisite relations %',
      existing_function_count,
      prerequisite_function_count,
      prerequisite_relation_count;
  END IF;
END;
$d31d1e_precondition$;

-- This assertion never acquires a lock. Acquiring a tenant barrier from a row
-- trigger would invert the canonical barrier-before-row order and can
-- deadlock. Mutation wrappers acquire the barrier first; trigger guards merely
-- prove that the current backend already owns the exact tenant key.
CREATE FUNCTION public.assert_bot_reply_staging_tenant_barrier_owned_v1(
  persisted_tenant_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  barrier_key BIGINT;
  matching_lock_count INTEGER;
BEGIN
  IF persisted_tenant_id IS NULL OR persisted_tenant_id < 1 THEN
    RAISE EXCEPTION
      'Bot reply staging tenant barrier subject is invalid';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    persisted_tenant_id
  );

  SELECT pg_catalog.count(*)::INTEGER
  INTO matching_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.pid = pg_catalog.pg_backend_pid()
    AND lock.locktype = 'advisory'
    AND lock.mode = 'ExclusiveLock'
    AND lock.granted
    AND lock.objsubid = 1
    AND lock.classid::BIGINT =
      ((barrier_key >> 32) & 4294967295::BIGINT)
    AND lock.objid::BIGINT =
      (barrier_key & 4294967295::BIGINT);

  IF matching_lock_count <> 1 THEN
    RAISE EXCEPTION
      'Bot reply staging tenant writer lacks its barrier';
  END IF;
END;
$$;

CREATE FUNCTION public.assert_bot_reply_staging_exact_session_barrier_v1(
  requested_permit_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  barrier_key BIGINT;
  reconciliation_marker_key BIGINT;
  current_advisory_lock_count INTEGER;
  matching_barrier_lock_count INTEGER;
  matching_reconciliation_marker_lock_count INTEGER;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider writer permit input is invalid';
  END IF;

  SELECT permit.*
  INTO stored_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging provider writer lacks permit';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    stored_permit.tenant_id
  );
  reconciliation_marker_key :=
    public.derive_bot_reply_staging_reconciliation_marker_key_v1(
      stored_permit.tenant_id,
      stored_permit.permit_key
    );

  SELECT pg_catalog.count(*)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.mode = 'ExclusiveLock'
        AND lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((barrier_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (barrier_key & 4294967295::BIGINT)
    )::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.mode = 'ExclusiveLock'
        AND lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((reconciliation_marker_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (reconciliation_marker_key & 4294967295::BIGINT)
    )::INTEGER
  INTO current_advisory_lock_count,
    matching_barrier_lock_count,
    matching_reconciliation_marker_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.pid = pg_catalog.pg_backend_pid()
    AND lock.locktype = 'advisory'
    AND lock.granted;

  IF matching_barrier_lock_count <> 1
    OR NOT (
      (
        current_advisory_lock_count = 1
        AND matching_reconciliation_marker_lock_count = 0
      )
      OR (
        current_advisory_lock_count = 2
        AND matching_reconciliation_marker_lock_count = 1
      )
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider writer lacks exact session barrier';
  END IF;
END;
$$;

-- 0056 checked the key shape of advisory locks but did not distinguish a
-- shared hold from the exclusive session barrier. These guards close that
-- historical boundary without rewriting the 0056 finalizer: every new proof,
-- consumption chain, uncertainty observation, or terminal outcome must pass
-- the exact 0057 assertion before its first durable INSERT. An exception from
-- any guard rolls back all earlier statements in the calling function.
CREATE FUNCTION public.guard_bot_reply_staging_exact_permit_insert_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.permit_key IS NULL THEN
    RAISE EXCEPTION
      'Bot reply staging exact permit guard lacks permit';
  END IF;

  PERFORM public.assert_bot_reply_staging_exact_session_barrier_v1(
    NEW.permit_key
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_bot_reply_staging_exact_operation_insert_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  persisted_permit_key TEXT;
BEGIN
  IF NEW.operation_key IS NULL OR NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION
      'Bot reply staging exact operation guard lacks identity';
  END IF;

  SELECT permit.permit_key
  INTO persisted_permit_key
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.operation_key = NEW.operation_key
    AND permit.tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging exact operation guard lacks permit';
  END IF;

  PERFORM public.assert_bot_reply_staging_exact_session_barrier_v1(
    persisted_permit_key
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER aa_staging_boundary_claim_exact_session_guard
BEFORE INSERT ON public.bot_reply_staging_provider_boundary_claims
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_exact_permit_insert_v1();

CREATE TRIGGER aa_staging_request_binding_exact_session_guard
BEFORE INSERT ON
  public.bot_reply_staging_credential_provider_request_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_exact_permit_insert_v1();

CREATE TRIGGER aa_staging_uncertainty_exact_session_guard
BEFORE INSERT ON public.bot_reply_staging_provider_uncertainty_events
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_exact_permit_insert_v1();

CREATE TRIGGER aa_staging_operation_exact_session_guard
BEFORE INSERT ON public.bot_reply_staging_provider_operations
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_exact_operation_insert_v1();

CREATE TRIGGER aa_staging_outcome_exact_session_guard
BEFORE INSERT ON public.bot_reply_staging_provider_operation_outcomes
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_exact_operation_insert_v1();

CREATE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  persisted_tenant_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    persisted_tenant_id := OLD.tenant_id;
  ELSE
    persisted_tenant_id := NEW.tenant_id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
  THEN
    RAISE EXCEPTION
      'Bot reply staging tenant writer cannot move tenant identity';
  END IF;

  PERFORM public.assert_bot_reply_staging_tenant_barrier_owned_v1(
    persisted_tenant_id
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.reject_message_occurred_at_mutation_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.occurred_at IS DISTINCT FROM OLD.occurred_at THEN
    RAISE EXCEPTION 'Message occurred_at evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_occurred_at_immutable_guard
BEFORE UPDATE OF occurred_at ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.reject_message_occurred_at_mutation_v1();

-- Inserts and mutable safety changes are rejected unless a reviewed wrapper
-- acquired the DB-derived tenant barrier before touching any row. The guards
-- assert only; they never acquire or release advisory locks.
CREATE TRIGGER aa_meta_connections_tenant_barrier_guard
BEFORE UPDATE ON public.meta_connections
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_meta_credentials_tenant_barrier_guard
BEFORE INSERT OR UPDATE ON public.meta_credential_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_meta_credential_events_tenant_barrier_guard
BEFORE INSERT ON public.meta_credential_revision_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_staging_authorizations_tenant_barrier_guard
BEFORE INSERT ON public.bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_delivery_policy_tenant_barrier_guard
BEFORE INSERT ON public.whatsapp_campaign_delivery_policy_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_rate_reservation_tenant_barrier_guard
BEFORE INSERT ON public.whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

-- The append-only provider ledgers are also barrier participants. Their
-- tenant is derived by the trusted fact writer; callers never provide it.
CREATE TRIGGER aa_provider_links_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE
ON public.bot_reply_delivery_provider_links
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_provider_deferrals_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE
ON public.bot_reply_provider_deferral_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER aa_window_rejections_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE
ON public.bot_reply_service_window_rejection_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE FUNCTION public.guard_whatsapp_rate_evidence_tenant_barrier_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  persisted_reservation_key TEXT;
  persisted_tenant_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    persisted_reservation_key := OLD.reservation_key;
  ELSE
    persisted_reservation_key := NEW.reservation_key;
  END IF;

  SELECT reservation.tenant_id
  INTO persisted_tenant_id
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = persisted_reservation_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'WhatsApp rate evidence lacks reservation tenant';
  END IF;

  PERFORM public.assert_bot_reply_staging_tenant_barrier_owned_v1(
    persisted_tenant_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aa_rate_settlements_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_rate_limit_settlements
FOR EACH ROW
EXECUTE FUNCTION public.guard_whatsapp_rate_evidence_tenant_barrier_v1();

CREATE TRIGGER aa_cooldown_events_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_provider_cooldown_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_whatsapp_rate_evidence_tenant_barrier_v1();

CREATE TRIGGER aa_cooldown_state_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_provider_cooldown_state
FOR EACH ROW
EXECUTE FUNCTION public.guard_whatsapp_rate_evidence_tenant_barrier_v1();

CREATE TRIGGER aa_pair_state_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_pair_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION public.guard_whatsapp_rate_evidence_tenant_barrier_v1();

CREATE FUNCTION public.guard_whatsapp_portfolio_state_tenant_barrier_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  persisted_portfolio_key TEXT;
  persisted_recipient_key TEXT;
  persisted_tenant_id BIGINT;
  matching_tenant_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    persisted_portfolio_key := OLD.portfolio_key;
    persisted_recipient_key := OLD.recipient_key;
  ELSE
    persisted_portfolio_key := NEW.portfolio_key;
    persisted_recipient_key := NEW.recipient_key;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW.portfolio_key IS DISTINCT FROM OLD.portfolio_key
      OR NEW.recipient_key IS DISTINCT FROM OLD.recipient_key
    )
  THEN
    RAISE EXCEPTION
      'WhatsApp portfolio state cannot move its durable scope';
  END IF;

  SELECT
    pg_catalog.min(reservation.tenant_id),
    pg_catalog.count(
      DISTINCT reservation.tenant_id
    )::INTEGER
  INTO persisted_tenant_id, matching_tenant_count
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.portfolio_key = persisted_portfolio_key
    AND reservation.recipient_key = persisted_recipient_key
    AND reservation.reservation_class = 'business-initiated';

  IF matching_tenant_count <> 1 THEN
    RAISE EXCEPTION
      'WhatsApp portfolio state lacks one durable tenant scope';
  END IF;

  PERFORM public.assert_bot_reply_staging_tenant_barrier_owned_v1(
    persisted_tenant_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aa_portfolio_state_tenant_barrier_guard
BEFORE INSERT OR UPDATE OR DELETE
ON public.whatsapp_portfolio_recipient_rate_limit_state
FOR EACH ROW
EXECUTE FUNCTION public.guard_whatsapp_portfolio_state_tenant_barrier_v1();

-- The settlement/cooldown projections execute inside fixed-search-path
-- writers. Recreate every trigger function in that chain with qualified SQL,
-- explicit invoker rights and the same fixed path. This keeps the projection
-- operational without widening privileges or trusting a caller search_path.
CREATE OR REPLACE FUNCTION public.project_whatsapp_rate_settlement_state()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  UPDATE public.whatsapp_portfolio_recipient_rate_limit_state AS state
  SET
    active_reservation_key = CASE
      WHEN state.active_reservation_key = NEW.reservation_key THEN NULL
      ELSE state.active_reservation_key
    END,
    active_reservation_expires_at = CASE
      WHEN state.active_reservation_key = NEW.reservation_key THEN NULL
      ELSE state.active_reservation_expires_at
    END,
    last_delivered_at = CASE
      WHEN NEW.outcome = 'delivered'
        AND (
          state.last_delivered_at IS NULL
          OR state.last_delivered_at < NEW.settled_at
        )
      THEN NEW.settled_at
      ELSE state.last_delivered_at
    END,
    updated_at = GREATEST(state.updated_at, NEW.settled_at)
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.reservation_class = 'business-initiated'
    AND state.portfolio_key = reservation.portfolio_key
    AND state.recipient_key = reservation.recipient_key;

  UPDATE public.whatsapp_pair_rate_limit_state AS state
  SET
    reserved_until = CASE
      WHEN NEW.outcome = 'cancelled-before-submit'
        AND state.reservation_key = NEW.reservation_key
        AND NEW.settled_at < state.reserved_until
      THEN NEW.settled_at
      ELSE state.reserved_until
    END,
    updated_at = GREATEST(state.updated_at, NEW.settled_at)
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND state.sender_key = reservation.sender_key
    AND state.recipient_key = reservation.recipient_key;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_pair_state_write()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.reservation_key = NEW.reservation_key
      AND reservation.sender_key = NEW.sender_key
      AND reservation.recipient_key = NEW.recipient_key
      AND reservation.reserved_at <= NEW.updated_at
      AND reservation.reserved_at <= NEW.reserved_until
      AND reservation.pair_reserved_until >= NEW.reserved_until
  ) THEN
    RAISE EXCEPTION 'WhatsApp pair state lacks reservation proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.reserved_until < OLD.reserved_until
    AND NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = OLD.reservation_key
        AND settlement.outcome = 'cancelled-before-submit'
        AND settlement.settled_at = NEW.reserved_until
    )
  THEN
    RAISE EXCEPTION 'WhatsApp pair release lacks cancellation proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_portfolio_state_write()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.portfolio_key = NEW.portfolio_key
      AND reservation.recipient_key = NEW.recipient_key
  ) THEN
    RAISE EXCEPTION 'WhatsApp portfolio state lacks reservation proof';
  END IF;

  IF NEW.active_reservation_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_reservations AS reservation
      WHERE reservation.reservation_key = NEW.active_reservation_key
        AND reservation.portfolio_key = NEW.portfolio_key
        AND reservation.recipient_key = NEW.recipient_key
        AND reservation.reservation_expires_at =
          NEW.active_reservation_expires_at
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio active state lacks proof';
  END IF;

  IF NEW.last_delivered_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      INNER JOIN public.whatsapp_rate_limit_reservations AS reservation
        USING (reservation_key)
      WHERE reservation.portfolio_key = NEW.portfolio_key
        AND reservation.recipient_key = NEW.recipient_key
        AND settlement.outcome = 'delivered'
        AND settlement.settled_at = NEW.last_delivered_at
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio delivery state lacks proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.active_reservation_key IS NOT NULL
    AND NEW.active_reservation_key IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = OLD.active_reservation_key
    )
  THEN
    RAISE EXCEPTION 'WhatsApp portfolio release lacks settlement proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_portfolio_state_business_class()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.portfolio_key = NEW.portfolio_key
      AND reservation.recipient_key = NEW.recipient_key
      AND reservation.reservation_class = 'business-initiated'
  ) THEN
    RAISE EXCEPTION
      'WhatsApp portfolio state requires business-initiated proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_provider_cooldown_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    INNER JOIN public.whatsapp_rate_limit_settlements AS settlement
      USING (reservation_key)
    WHERE reservation.reservation_key = NEW.reservation_key
      AND reservation.reserved_at <= NEW.observed_at
      AND settlement.outcome = 'provider-failed'
      AND settlement.settled_at = NEW.observed_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown lacks rejection proof';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_provider_cooldown_reservation_class()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.scope = 'portfolio-recipient'
    AND EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_reservations AS reservation
      WHERE reservation.reservation_key = NEW.reservation_key
        AND reservation.reservation_class = 'service-reply'
    )
  THEN
    RAISE EXCEPTION
      'Service replies cannot create portfolio-recipient cooldowns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_whatsapp_provider_cooldown_state()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO public.whatsapp_provider_cooldown_state AS state (
    scope,
    sender_key,
    recipient_key,
    reservation_key,
    provider_error_code,
    blocked_until,
    updated_at
  )
  SELECT
    NEW.scope,
    CASE
      WHEN NEW.scope IN ('sender', 'pair') THEN reservation.sender_key
      ELSE ''
    END,
    CASE
      WHEN NEW.scope IN ('portfolio-recipient', 'pair')
      THEN reservation.recipient_key
      ELSE ''
    END,
    NEW.reservation_key,
    NEW.provider_error_code,
    NEW.blocked_until,
    NEW.observed_at
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
  ON CONFLICT (scope, sender_key, recipient_key) DO UPDATE SET
    reservation_key = EXCLUDED.reservation_key,
    provider_error_code = EXCLUDED.provider_error_code,
    blocked_until = EXCLUDED.blocked_until,
    updated_at = EXCLUDED.updated_at
  WHERE EXCLUDED.blocked_until > state.blocked_until;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_provider_cooldown_state_write()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_provider_cooldown_events AS event
    INNER JOIN public.whatsapp_rate_limit_reservations AS reservation
      USING (reservation_key)
    WHERE event.reservation_key = NEW.reservation_key
      AND event.scope = NEW.scope
      AND event.provider_error_code = NEW.provider_error_code
      AND event.blocked_until = NEW.blocked_until
      AND event.observed_at = NEW.updated_at
      AND (
        (
          NEW.scope = 'sender'
          AND reservation.sender_key = NEW.sender_key
          AND NEW.recipient_key = ''
        )
        OR
        (
          NEW.scope = 'portfolio-recipient'
          AND NEW.sender_key = ''
          AND reservation.recipient_key = NEW.recipient_key
        )
        OR
        (
          NEW.scope = 'pair'
          AND reservation.sender_key = NEW.sender_key
          AND reservation.recipient_key = NEW.recipient_key
        )
      )
  ) THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown state lacks event proof';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.blocked_until < OLD.blocked_until
  THEN
    RAISE EXCEPTION 'WhatsApp provider cooldown cannot be shortened';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp rate-limit evidence is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_whatsapp_rate_limit_state_delete()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp rate-limit state cannot be deleted';
END;
$$;

-- The trusted reservation writer executes with a fixed search path, so every
-- function in the reservation INSERT trigger chain must use qualified SQL and
-- the same invoker-only path contract.
CREATE OR REPLACE FUNCTION public.enforce_whatsapp_rate_limit_throughput()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  recent_outbound_count BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.reservation_key = NEW.reservation_key
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_campaign_delivery_policy_events AS policy
    WHERE policy.event_key = NEW.policy_event_key
      AND policy.tenant_id = NEW.tenant_id
      AND policy.delivery_state = 'enabled'
      AND policy.policy_version = (
        SELECT pg_catalog.max(latest.policy_version)
        FROM public.whatsapp_campaign_delivery_policy_events AS latest
        WHERE latest.tenant_id = NEW.tenant_id
      )
      AND policy.phone_throughput_messages_per_second =
        NEW.phone_throughput_messages_per_second
      AND policy.maximum_outbound_messages_per_second =
        NEW.maximum_outbound_messages_per_second
      AND policy.evidence_checked_at <= NEW.reserved_at
      AND policy.recorded_at <= NEW.reserved_at
      AND NEW.reserved_at < policy.evidence_expires_at
  ) THEN
    RAISE EXCEPTION
      'WhatsApp reservation lacks current throughput evidence';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'whatsapp-throughput:' || NEW.sender_key,
      0
    )
  );

  SELECT pg_catalog.count(*)
  INTO recent_outbound_count
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.sender_key = NEW.sender_key
    AND reservation.reserved_at >
      NEW.reserved_at - INTERVAL '1 second'
    AND reservation.reserved_at <= NEW.reserved_at;

  IF recent_outbound_count >=
    NEW.maximum_outbound_messages_per_second
  THEN
    RAISE EXCEPTION 'WhatsApp phone throughput limit exceeded';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_reservation_category_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF (
    NEW.reservation_class = 'business-initiated'
    AND (
      NEW.template_category IS NULL
      OR NEW.template_category NOT IN ('MARKETING', 'UTILITY')
    )
  ) OR (
    NEW.reservation_class = 'service-reply'
    AND NEW.template_category IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'New WhatsApp reservation has an invalid class/category pair';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_rate_reservation_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  occupied_unique_recipients BIGINT;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'whatsapp-pair:' || NEW.sender_key || ':' || NEW.recipient_key,
      0
    )
  );

  IF NEW.reservation_class = 'business-initiated' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'whatsapp-portfolio:' || NEW.portfolio_key,
        0
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.reservation_key = NEW.reservation_key
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_provider_cooldown_state AS cooldown
    WHERE cooldown.blocked_until > NEW.reserved_at
      AND (
        (
          cooldown.scope = 'sender'
          AND cooldown.sender_key = NEW.sender_key
          AND cooldown.recipient_key = ''
        ) OR (
          NEW.reservation_class = 'business-initiated'
          AND cooldown.scope = 'portfolio-recipient'
          AND NEW.template_category = 'MARKETING'
          AND cooldown.sender_key = ''
          AND cooldown.recipient_key = NEW.recipient_key
        ) OR (
          cooldown.scope = 'pair'
          AND cooldown.sender_key = NEW.sender_key
          AND cooldown.recipient_key = NEW.recipient_key
        )
      )
  ) THEN
    RAISE EXCEPTION 'WhatsApp reservation blocked by provider cooldown';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_pair_rate_limit_state AS state
    WHERE state.sender_key = NEW.sender_key
      AND state.recipient_key = NEW.recipient_key
      AND state.reserved_until > NEW.reserved_at
  ) THEN
    RAISE EXCEPTION 'WhatsApp reservation blocked by pair limit';
  END IF;

  IF NEW.reservation_class = 'business-initiated' THEN
    IF EXISTS (
      SELECT 1
      FROM public.whatsapp_portfolio_recipient_rate_limit_state AS state
      WHERE state.portfolio_key = NEW.portfolio_key
        AND state.recipient_key = NEW.recipient_key
        AND state.active_reservation_key IS NOT NULL
        AND state.active_reservation_expires_at > NEW.reserved_at
    ) THEN
      RAISE EXCEPTION
        'WhatsApp recipient already has an active reservation';
    END IF;

    IF NEW.portfolio_limit_kind = 'bounded'
      AND NOT EXISTS (
        SELECT 1
        FROM public.whatsapp_portfolio_recipient_rate_limit_state AS state
        WHERE state.portfolio_key = NEW.portfolio_key
          AND state.recipient_key = NEW.recipient_key
          AND state.last_delivered_at >=
            NEW.reserved_at - INTERVAL '24 hours'
      )
    THEN
      SELECT pg_catalog.count(*)
      INTO occupied_unique_recipients
      FROM public.whatsapp_portfolio_recipient_rate_limit_state AS state
      WHERE state.portfolio_key = NEW.portfolio_key
        AND (
          state.last_delivered_at >=
            NEW.reserved_at - INTERVAL '24 hours'
          OR (
            state.active_reservation_key IS NOT NULL
            AND state.active_reservation_expires_at > NEW.reserved_at
          )
        );

      IF occupied_unique_recipients >= NEW.portfolio_limit_value THEN
        RAISE EXCEPTION 'WhatsApp portfolio recipient limit reached';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_whatsapp_rate_reservation_state()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO public.whatsapp_pair_rate_limit_state (
    sender_key,
    recipient_key,
    reservation_key,
    reserved_until,
    updated_at
  ) VALUES (
    NEW.sender_key,
    NEW.recipient_key,
    NEW.reservation_key,
    NEW.pair_reserved_until,
    NEW.reserved_at
  )
  ON CONFLICT (sender_key, recipient_key) DO UPDATE SET
    reservation_key = EXCLUDED.reservation_key,
    reserved_until = EXCLUDED.reserved_until,
    updated_at = EXCLUDED.updated_at;

  IF NEW.reservation_class = 'business-initiated' THEN
    INSERT INTO public.whatsapp_portfolio_recipient_rate_limit_state (
      portfolio_key,
      recipient_key,
      active_reservation_key,
      active_reservation_expires_at,
      last_delivered_at,
      updated_at
    ) VALUES (
      NEW.portfolio_key,
      NEW.recipient_key,
      NEW.reservation_key,
      NEW.reservation_expires_at,
      NULL,
      NEW.reserved_at
    )
    ON CONFLICT (portfolio_key, recipient_key) DO UPDATE SET
      active_reservation_key = EXCLUDED.active_reservation_key,
      active_reservation_expires_at =
        EXCLUDED.active_reservation_expires_at,
      updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN NEW;
END;
$$;

-- A D1e reservation is not admissible merely because it shares a tenant and
-- timestamps with a run. This immutable scope ledger binds the opaque
-- rate-limit keys supplied by the trusted reservation boundary to database
-- source digests for the exact run, delivery, inbound message and recipient.
-- Raw provider identifiers and phone numbers are intentionally not retained.
ALTER TABLE public.whatsapp_rate_limit_reservations
  ADD CONSTRAINT whatsapp_rate_reservations_scope_identity_uq
  UNIQUE (
    reservation_key,
    tenant_id,
    portfolio_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reserved_at,
    pair_reserved_until,
    reservation_expires_at
  );

CREATE TABLE public.bot_reply_staging_service_reply_scope_bindings (
  scope_binding_key TEXT PRIMARY KEY,
  run_binding_key TEXT NOT NULL,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  authorization_event_key TEXT NOT NULL,
  authorization_version INTEGER NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  recipient_fingerprint TEXT NOT NULL,
  rate_limit_method_fingerprint TEXT NOT NULL,
  authorized_recipient_source_digest TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  conversation_key TEXT NOT NULL,
  inbound_message_key TEXT NOT NULL,
  portfolio_key TEXT NOT NULL,
  portfolio_source_digest TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  sender_source_digest TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  rate_recipient_source_digest TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  policy_event_key TEXT NOT NULL,
  phone_throughput_messages_per_second INTEGER NOT NULL,
  maximum_outbound_messages_per_second INTEGER NOT NULL,
  reservation_reserved_at TIMESTAMPTZ NOT NULL,
  pair_reserved_until TIMESTAMPTZ NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  bound_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_scope_run_binding_fk
    FOREIGN KEY (
      run_binding_key,
      run_key,
      tenant_id,
      run_claim_version,
      authorization_event_key,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key
    )
    REFERENCES public.bot_reply_staging_run_credential_bindings (
      binding_key,
      run_key,
      tenant_id,
      run_claim_version,
      authorization_event_key,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_scope_delivery_fk
    FOREIGN KEY (tenant_id, delivery_key)
    REFERENCES public.bot_reply_deliveries (tenant_id, delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_scope_conversation_fk
    FOREIGN KEY (tenant_id, conversation_key)
    REFERENCES public.conversations (tenant_id, conversation_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_scope_inbound_fk
    FOREIGN KEY (tenant_id, inbound_message_key)
    REFERENCES public.messages (tenant_id, message_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_scope_reservation_fk
    FOREIGN KEY (
      reservation_key,
      tenant_id,
      portfolio_key,
      sender_key,
      recipient_key,
      policy_event_key,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second,
      reservation_reserved_at,
      pair_reserved_until,
      reservation_expires_at
    )
    REFERENCES public.whatsapp_rate_limit_reservations (
      reservation_key,
      tenant_id,
      portfolio_key,
      sender_key,
      recipient_key,
      policy_event_key,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second,
      reserved_at,
      pair_reserved_until,
      reservation_expires_at
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_scope_key_valid CHECK (
    scope_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_service_scope_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_scope_identity_valid CHECK (
    run_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$'
    AND run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    AND authorization_event_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_authorization_v1_[a-f0-9]{64}$'
    AND credential_envelope_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND credential_event_key OPERATOR(pg_catalog.~)
      '^meta_credential_revision_v1_[a-f0-9]{64}$'
    AND recipient_fingerprint OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND rate_limit_method_fingerprint OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND authorized_recipient_source_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND delivery_key OPERATOR(pg_catalog.~)
      '^bot_reply_delivery_v1_[a-f0-9]{64}$'
    AND conversation_key OPERATOR(pg_catalog.~)
      '^conversation_v1_[a-f0-9]{64}$'
    AND inbound_message_key OPERATOR(pg_catalog.~)
      '^message_v1_[a-f0-9]{64}$'
    AND portfolio_key OPERATOR(pg_catalog.~)
      '^whatsapp_portfolio_v1_[a-f0-9]{64}$'
    AND portfolio_source_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND sender_key OPERATOR(pg_catalog.~)
      '^whatsapp_sender_v1_[a-f0-9]{64}$'
    AND sender_source_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND recipient_key OPERATOR(pg_catalog.~)
      '^whatsapp_recipient_v1_[a-f0-9]{64}$'
    AND rate_recipient_source_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    AND reservation_key OPERATOR(pg_catalog.~)
      '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
    AND policy_event_key OPERATOR(pg_catalog.~)
      '^whatsapp_delivery_policy_event_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT bot_reply_scope_versions_limits_valid CHECK (
    run_claim_version >= 1
    AND authorization_version >= 1
    AND credential_revision >= 1
    AND delivery_claim_version >= 1
    AND phone_throughput_messages_per_second IN (20, 80, 1000)
    AND maximum_outbound_messages_per_second >= 1
    AND maximum_outbound_messages_per_second <
      phone_throughput_messages_per_second
  ),
  CONSTRAINT bot_reply_scope_time_valid CHECK (
    reservation_reserved_at =
      pg_catalog.date_trunc('milliseconds', reservation_reserved_at)
    AND pair_reserved_until =
      pg_catalog.date_trunc('milliseconds', pair_reserved_until)
    AND reservation_expires_at =
      pg_catalog.date_trunc('milliseconds', reservation_expires_at)
    AND bound_at = pg_catalog.date_trunc('milliseconds', bound_at)
    AND created_at = bound_at
    AND reservation_reserved_at = bound_at
    AND pair_reserved_until = bound_at + INTERVAL '6 seconds'
    AND reservation_expires_at >= pair_reserved_until
    AND reservation_expires_at <= bound_at + INTERVAL '24 hours'
  ),
  CONSTRAINT bot_reply_scope_delivery_claim_uq
    UNIQUE (delivery_key, delivery_claim_version),
  CONSTRAINT bot_reply_scope_reservation_uq UNIQUE (reservation_key),
  CONSTRAINT bot_reply_scope_exact_identity_uq UNIQUE (
    scope_binding_key,
    run_binding_key,
    run_key,
    tenant_id,
    run_claim_version,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_reserved_at,
    pair_reserved_until,
    reservation_expires_at
  )
);

CREATE TRIGGER bot_reply_staging_service_scope_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_service_reply_scope_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER aa_service_scope_tenant_barrier_guard
BEFORE INSERT
ON public.bot_reply_staging_service_reply_scope_bindings
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

CREATE TRIGGER bot_reply_staging_service_scope_truncate_guard
BEFORE TRUNCATE
ON public.bot_reply_staging_service_reply_scope_bindings
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

ALTER TABLE public.bot_reply_staging_pre_send_admission_bindings
  ADD COLUMN scope_binding_key TEXT,
  ADD CONSTRAINT bot_reply_admission_scope_key_valid CHECK (
    scope_binding_key IS NULL
    OR scope_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_service_scope_v1_[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT bot_reply_admission_scope_fk FOREIGN KEY (
    scope_binding_key,
    run_binding_key,
    run_key,
    tenant_id,
    run_claim_version,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_reserved_at,
    pair_reserved_until,
    reservation_expires_at
  ) REFERENCES public.bot_reply_staging_service_reply_scope_bindings (
    scope_binding_key,
    run_binding_key,
    run_key,
    tenant_id,
    run_claim_version,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_reserved_at,
    pair_reserved_until,
    reservation_expires_at
  ) ON DELETE RESTRICT;

CREATE FUNCTION public.guard_bot_reply_staging_scope_admission_insert_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.scope_binding_key IS NULL THEN
    RAISE EXCEPTION
      'Bot reply staging D1e admission lacks immutable scope';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aa_bot_reply_staging_admission_scope_guard
BEFORE INSERT ON public.bot_reply_staging_pre_send_admission_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_bot_reply_staging_scope_admission_insert_v1();

CREATE TRIGGER aaa_bot_reply_staging_admission_barrier_guard
BEFORE INSERT ON public.bot_reply_staging_pre_send_admission_bindings
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

-- The only D1e reservation create path derives tenant, claims, timestamps and
-- all raw-source digests from locked database evidence. The caller supplies
-- opaque HMAC keys, because the database deliberately has no HMAC secret.
CREATE FUNCTION public.reserve_and_bind_bot_reply_staging_service_reply_v1(
  requested_run_binding_key TEXT,
  requested_delivery_key TEXT,
  requested_portfolio_key TEXT,
  requested_sender_key TEXT,
  requested_recipient_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "scopeBindingKey" TEXT,
  "reservationKey" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  discovered_tenant_id BIGINT;
  initial_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  locked_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_inbound public.messages%ROWTYPE;
  locked_conversation public.conversations%ROWTYPE;
  locked_contact public.contacts%ROWTYPE;
  existing_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  existing_scope
    public.bot_reply_staging_service_reply_scope_bindings%ROWTYPE;
  database_now TIMESTAMPTZ;
  service_window_expires_at TIMESTAMPTZ;
  derived_scope_binding_key TEXT;
  derived_reservation_key TEXT;
  derived_authorized_recipient_source_digest TEXT;
  derived_portfolio_source_digest TEXT;
  derived_sender_source_digest TEXT;
  derived_rate_recipient_source_digest TEXT;
BEGIN
  IF requested_run_binding_key IS NULL
    OR NOT requested_run_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$'
    OR requested_delivery_key IS NULL
    OR NOT requested_delivery_key OPERATOR(pg_catalog.~)
      '^bot_reply_delivery_v1_[a-f0-9]{64}$'
    OR requested_portfolio_key IS NULL
    OR NOT requested_portfolio_key OPERATOR(pg_catalog.~)
      '^whatsapp_portfolio_v1_[a-f0-9]{64}$'
    OR requested_sender_key IS NULL
    OR NOT requested_sender_key OPERATOR(pg_catalog.~)
      '^whatsapp_sender_v1_[a-f0-9]{64}$'
    OR requested_recipient_key IS NULL
    OR NOT requested_recipient_key OPERATOR(pg_catalog.~)
      '^whatsapp_recipient_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging service reservation input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging service reservation requires read committed isolation';
  END IF;

  SELECT binding.*
  INTO initial_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.binding_key = requested_run_binding_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging service reservation lacks run binding';
  END IF;

  discovered_tenant_id := initial_binding.tenant_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    public.derive_bot_reply_staging_tenant_barrier_key_v1(
      discovered_tenant_id
    )
  );

  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = initial_binding.run_key
    AND staging_run.tenant_id = discovered_tenant_id
  FOR UPDATE;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = discovered_tenant_id
  FOR UPDATE;

  IF current_credential.tenant_id IS NOT NULL THEN
    SELECT event.*
    INTO current_credential_event
    FROM public.meta_credential_revision_events AS event
    WHERE event.tenant_id = discovered_tenant_id
      AND event.credential_revision =
        current_credential.credential_revision
      AND event.envelope_digest = current_credential.envelope_digest
    FOR KEY SHARE;
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = discovered_tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = discovered_tenant_id
  FOR UPDATE;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = discovered_tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT binding.*
  INTO locked_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.binding_key = requested_run_binding_key
    AND binding.tenant_id = discovered_tenant_id
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = requested_delivery_key
    AND delivery.tenant_id = discovered_tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NOT NULL THEN
    SELECT inbound.*
    INTO locked_inbound
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = discovered_tenant_id
      AND inbound.message_key = locked_delivery.inbound_message_key
    FOR KEY SHARE;

    SELECT conversation.*
    INTO locked_conversation
    FROM public.conversations AS conversation
    WHERE conversation.tenant_id = discovered_tenant_id
      AND conversation.conversation_key =
        locked_delivery.conversation_key
    FOR KEY SHARE;

    IF locked_conversation.conversation_key IS NOT NULL THEN
      SELECT contact.*
      INTO locked_contact
      FROM public.contacts AS contact
      WHERE contact.tenant_id = discovered_tenant_id
        AND contact.id = locked_conversation.contact_id
      FOR KEY SHARE;
    END IF;
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  service_window_expires_at :=
    locked_inbound.occurred_at + INTERVAL '24 hours';

  derived_authorized_recipient_source_digest := 'sha256:' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-authorized-recipient-source-v1', 'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_contact.phone_e164, 'UTF8')
      ),
      'hex'
    );
  derived_portfolio_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-portfolio-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        current_connection.business_portfolio_id, 'UTF8'
      )
    ),
    'hex'
  );
  derived_sender_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-sender-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(current_connection.phone_number_id, 'UTF8')
    ),
    'hex'
  );
  derived_rate_recipient_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-recipient-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        current_connection.business_portfolio_id, 'UTF8'
      ) || pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(locked_contact.phone_e164, 'UTF8')
    ),
    'hex'
  );

  derived_scope_binding_key :=
    'bot_reply_staging_service_scope_v1_' || pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-service-scope-v1', 'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_binding.binding_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_delivery.delivery_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          locked_delivery.claim_version::pg_catalog.TEXT, 'UTF8'
        )
      ),
      'hex'
    );
  derived_reservation_key := 'whatsapp_rate_reservation_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-service-reservation-v1', 'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(derived_scope_binding_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_portfolio_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_sender_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_recipient_key, 'UTF8')
      ),
      'hex'
    );

  SELECT reservation.*
  INTO existing_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = derived_reservation_key
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_provider_cooldown_state AS cooldown
  WHERE (
      cooldown.scope = 'sender'
      AND cooldown.sender_key = requested_sender_key
      AND cooldown.recipient_key = ''
    ) OR (
      cooldown.scope = 'pair'
      AND cooldown.sender_key = requested_sender_key
      AND cooldown.recipient_key = requested_recipient_key
    )
  ORDER BY cooldown.scope, cooldown.sender_key, cooldown.recipient_key
  FOR UPDATE;

  SELECT scope.*
  INTO existing_scope
  FROM public.bot_reply_staging_service_reply_scope_bindings AS scope
  WHERE scope.scope_binding_key = derived_scope_binding_key
  FOR UPDATE;

  IF active_run.run_key IS NULL
    OR active_run.status <> 'running'
    OR active_run.claim_version <> locked_binding.run_claim_version
    OR active_run.started_at > database_now
    OR database_now >= active_run.lease_expires_at
    OR current_credential.tenant_id IS NULL
    OR current_credential_event.event_key IS NULL
    OR active_authorization.event_key IS NULL
    OR active_authorization.status <> 'approved'
    OR active_authorization.connection_version <>
      active_run.connection_version
    OR active_authorization.policy_version <> active_run.policy_version
    OR active_authorization.recipient_fingerprint <>
      active_run.recipient_fingerprint
    OR active_authorization.rate_limit_method_fingerprint <>
      active_run.rate_limit_method_fingerprint
    OR active_authorization.credential_revision <>
      current_credential.credential_revision
    OR active_authorization.credential_envelope_digest <>
      current_credential.envelope_digest
    OR active_authorization.credential_event_key <>
      current_credential_event.event_key
    OR active_authorization.recorded_at > database_now
    OR database_now >= active_authorization.recipient_expires_at
    OR database_now >= active_authorization.rate_limit_expires_at
    OR current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
    OR current_connection.phone_number_id IS DISTINCT FROM
      locked_delivery.sender_phone_number_id
    OR current_policy.event_key IS NULL
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.meta_graph_api_version <> active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR locked_binding.binding_key IS NULL
    OR locked_binding.run_key <> active_run.run_key
    OR locked_binding.run_claim_version <> active_run.claim_version
    OR locked_binding.authorization_event_key <>
      active_authorization.event_key
    OR locked_binding.authorization_version <>
      active_authorization.authorization_version
    OR locked_binding.credential_revision <>
      current_credential.credential_revision
    OR locked_binding.credential_envelope_digest <>
      current_credential.envelope_digest
    OR locked_binding.credential_event_key <>
      current_credential_event.event_key
    OR locked_delivery.delivery_key IS NULL
    OR locked_delivery.status <> 'sending'
    OR locked_delivery.attempt_count <> 1
    OR locked_delivery.claim_version < 1
    OR locked_inbound.message_key IS NULL
    OR locked_inbound.direction <> 'inbound'
    OR locked_inbound.conversation_key <>
      locked_delivery.conversation_key
    OR locked_conversation.conversation_key IS NULL
    OR locked_contact.id IS NULL
    OR locked_contact.phone_e164 <>
      locked_delivery.recipient_phone_e164
    OR locked_inbound.occurred_at > database_now
    OR database_now + INTERVAL '6 seconds' > service_window_expires_at
    OR database_now + INTERVAL '6 seconds' > active_run.lease_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_service_reply_scope_bindings AS scope
      WHERE scope.tenant_id = discovered_tenant_id
        AND (
          (
            (
              scope.recipient_fingerprint =
                active_run.recipient_fingerprint
              OR scope.run_binding_key = locked_binding.binding_key
            )
            AND scope.authorized_recipient_source_digest <>
              derived_authorized_recipient_source_digest
          ) OR (
            scope.portfolio_key = requested_portfolio_key
            AND scope.portfolio_source_digest <>
              derived_portfolio_source_digest
          ) OR (
            scope.sender_key = requested_sender_key
            AND scope.sender_source_digest <> derived_sender_source_digest
          ) OR (
            scope.recipient_key = requested_recipient_key
            AND scope.rate_recipient_source_digest <>
              derived_rate_recipient_source_digest
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_provider_cooldown_state AS cooldown
      WHERE cooldown.blocked_until > database_now
        AND (
          (
            cooldown.scope = 'sender'
            AND cooldown.sender_key = requested_sender_key
            AND cooldown.recipient_key = ''
          ) OR (
            cooldown.scope = 'pair'
            AND cooldown.sender_key = requested_sender_key
            AND cooldown.recipient_key = requested_recipient_key
          )
        )
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging service reservation safety evidence is stale';
  END IF;

  IF existing_scope.scope_binding_key IS NOT NULL THEN
    IF existing_scope.run_binding_key <> locked_binding.binding_key
      OR existing_scope.delivery_key <> locked_delivery.delivery_key
      OR existing_scope.delivery_claim_version <>
        locked_delivery.claim_version
      OR existing_scope.portfolio_key <> requested_portfolio_key
      OR existing_scope.sender_key <> requested_sender_key
      OR existing_scope.recipient_key <> requested_recipient_key
      OR existing_scope.authorized_recipient_source_digest <>
        derived_authorized_recipient_source_digest
      OR existing_scope.portfolio_source_digest <>
        derived_portfolio_source_digest
      OR existing_scope.sender_source_digest <>
        derived_sender_source_digest
      OR existing_scope.rate_recipient_source_digest <>
        derived_rate_recipient_source_digest
      OR existing_scope.reservation_key <> derived_reservation_key
    THEN
      RAISE EXCEPTION
        'Bot reply staging service reservation replay conflicts';
    END IF;

    RETURN QUERY SELECT
      'replayed'::TEXT,
      existing_scope.scope_binding_key,
      existing_scope.reservation_key;
    RETURN;
  END IF;

  IF existing_reservation.reservation_key IS NOT NULL THEN
    RAISE EXCEPTION
      'Bot reply staging service reservation is legacy or unbound';
  END IF;

  INSERT INTO public.whatsapp_rate_limit_reservations (
    reservation_key,
    tenant_id,
    portfolio_key,
    sender_key,
    recipient_key,
    template_category,
    portfolio_limit_kind,
    portfolio_limit_value,
    reserved_at,
    pair_reserved_until,
    reservation_expires_at,
    created_at,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_class
  ) VALUES (
    derived_reservation_key,
    discovered_tenant_id,
    requested_portfolio_key,
    requested_sender_key,
    requested_recipient_key,
    NULL,
    'unlimited',
    NULL,
    database_now,
    database_now + INTERVAL '6 seconds',
    LEAST(service_window_expires_at, active_run.lease_expires_at,
      database_now + INTERVAL '24 hours'),
    database_now,
    current_policy.event_key,
    current_policy.phone_throughput_messages_per_second,
    current_policy.maximum_outbound_messages_per_second,
    'service-reply'
  );

  INSERT INTO public.bot_reply_staging_service_reply_scope_bindings (
    scope_binding_key,
    run_binding_key,
    run_key,
    tenant_id,
    run_claim_version,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    recipient_fingerprint,
    rate_limit_method_fingerprint,
    authorized_recipient_source_digest,
    delivery_key,
    delivery_claim_version,
    conversation_key,
    inbound_message_key,
    portfolio_key,
    portfolio_source_digest,
    sender_key,
    sender_source_digest,
    recipient_key,
    rate_recipient_source_digest,
    reservation_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_reserved_at,
    pair_reserved_until,
    reservation_expires_at,
    bound_at,
    created_at
  ) VALUES (
    derived_scope_binding_key,
    locked_binding.binding_key,
    active_run.run_key,
    discovered_tenant_id,
    active_run.claim_version,
    active_authorization.event_key,
    active_authorization.authorization_version,
    current_credential.credential_revision,
    current_credential.envelope_digest,
    current_credential_event.event_key,
    active_run.recipient_fingerprint,
    active_run.rate_limit_method_fingerprint,
    derived_authorized_recipient_source_digest,
    locked_delivery.delivery_key,
    locked_delivery.claim_version,
    locked_delivery.conversation_key,
    locked_delivery.inbound_message_key,
    requested_portfolio_key,
    derived_portfolio_source_digest,
    requested_sender_key,
    derived_sender_source_digest,
    requested_recipient_key,
    derived_rate_recipient_source_digest,
    derived_reservation_key,
    current_policy.event_key,
    current_policy.phone_throughput_messages_per_second,
    current_policy.maximum_outbound_messages_per_second,
    database_now,
    database_now + INTERVAL '6 seconds',
    LEAST(service_window_expires_at, active_run.lease_expires_at,
      database_now + INTERVAL '24 hours'),
    database_now,
    database_now
  );

  RETURN QUERY SELECT
    'created'::TEXT,
    derived_scope_binding_key,
    derived_reservation_key;
END;
$$;

-- Admission now accepts exactly one immutable scope identity. It has no
-- caller-controlled tenant, run, delivery, reservation, claim or timestamp.
-- After acquiring the tenant barrier it re-locks and revalidates the entire
-- source chain before projecting the admission row.
CREATE FUNCTION public.write_bot_reply_staging_pre_send_admission_v1(
  requested_scope_binding_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "admissionBindingKey" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  discovered_tenant_id BIGINT;
  requested_run_key TEXT;
  requested_delivery_key TEXT;
  requested_reservation_key TEXT;
  initial_scope
    public.bot_reply_staging_service_reply_scope_bindings%ROWTYPE;
  locked_scope
    public.bot_reply_staging_service_reply_scope_bindings%ROWTYPE;
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  locked_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_inbound public.messages%ROWTYPE;
  locked_conversation public.conversations%ROWTYPE;
  locked_contact public.contacts%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  existing_admission
    public.bot_reply_staging_pre_send_admission_bindings%ROWTYPE;
  service_window_opened_at TIMESTAMPTZ;
  service_window_expires_at TIMESTAMPTZ;
  database_now TIMESTAMPTZ;
  derived_admission_key TEXT;
  derived_authorized_recipient_source_digest TEXT;
  derived_portfolio_source_digest TEXT;
  derived_sender_source_digest TEXT;
  derived_rate_recipient_source_digest TEXT;
BEGIN
  IF requested_scope_binding_key IS NULL
    OR NOT requested_scope_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_service_scope_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging admission input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging admission requires read committed isolation';
  END IF;

  SELECT scope.*
  INTO initial_scope
  FROM public.bot_reply_staging_service_reply_scope_bindings AS scope
  WHERE scope.scope_binding_key = requested_scope_binding_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bot reply staging admission lacks scope';
  END IF;

  discovered_tenant_id := initial_scope.tenant_id;
  requested_run_key := initial_scope.run_key;
  requested_delivery_key := initial_scope.delivery_key;
  requested_reservation_key := initial_scope.reservation_key;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    public.derive_bot_reply_staging_tenant_barrier_key_v1(
      discovered_tenant_id
    )
  );

  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
    AND staging_run.tenant_id = discovered_tenant_id
  FOR UPDATE;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = discovered_tenant_id
  FOR UPDATE;

  IF current_credential.tenant_id IS NOT NULL THEN
    SELECT event.*
    INTO current_credential_event
    FROM public.meta_credential_revision_events AS event
    WHERE event.tenant_id = discovered_tenant_id
      AND event.credential_revision =
        current_credential.credential_revision
      AND event.envelope_digest = current_credential.envelope_digest
    FOR KEY SHARE;
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = discovered_tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = discovered_tenant_id
  FOR UPDATE;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = discovered_tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT binding.*
  INTO locked_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.run_key = requested_run_key
    AND binding.run_claim_version = active_run.claim_version
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = requested_delivery_key
    AND delivery.tenant_id = discovered_tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NOT NULL THEN
    SELECT inbound.*
    INTO locked_inbound
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = discovered_tenant_id
      AND inbound.message_key = locked_delivery.inbound_message_key
    FOR KEY SHARE;

    service_window_opened_at := locked_inbound.occurred_at;
    service_window_expires_at :=
      locked_inbound.occurred_at + INTERVAL '24 hours';

    SELECT conversation.*
    INTO locked_conversation
    FROM public.conversations AS conversation
    WHERE conversation.tenant_id = discovered_tenant_id
      AND conversation.conversation_key =
        locked_delivery.conversation_key
    FOR KEY SHARE;

    IF locked_conversation.conversation_key IS NOT NULL THEN
      SELECT contact.*
      INTO locked_contact
      FROM public.contacts AS contact
      WHERE contact.tenant_id = discovered_tenant_id
        AND contact.id = locked_conversation.contact_id
      FOR KEY SHARE;
    END IF;
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = requested_reservation_key
    AND reservation.tenant_id = discovered_tenant_id
  FOR UPDATE;

  IF locked_reservation.reservation_key IS NOT NULL THEN
    PERFORM 1
    FROM public.whatsapp_provider_cooldown_state AS cooldown
    WHERE (
        cooldown.scope = 'sender'
        AND cooldown.sender_key = locked_reservation.sender_key
        AND cooldown.recipient_key = ''
      ) OR (
        cooldown.scope = 'portfolio-recipient'
        AND cooldown.sender_key = ''
        AND cooldown.recipient_key = locked_reservation.recipient_key
      ) OR (
        cooldown.scope = 'pair'
        AND cooldown.sender_key = locked_reservation.sender_key
        AND cooldown.recipient_key = locked_reservation.recipient_key
      )
    ORDER BY cooldown.scope, cooldown.sender_key, cooldown.recipient_key
    FOR UPDATE;
  END IF;

  SELECT scope.*
  INTO locked_scope
  FROM public.bot_reply_staging_service_reply_scope_bindings AS scope
  WHERE scope.scope_binding_key = requested_scope_binding_key
  FOR UPDATE;

  SELECT admission.*
  INTO existing_admission
  FROM public.bot_reply_staging_pre_send_admission_bindings AS admission
  WHERE admission.delivery_key = requested_delivery_key
    AND admission.delivery_claim_version = locked_delivery.claim_version
  FOR UPDATE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  derived_authorized_recipient_source_digest := 'sha256:' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-authorized-recipient-source-v1', 'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_contact.phone_e164, 'UTF8')
      ),
      'hex'
    );
  derived_portfolio_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-portfolio-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        current_connection.business_portfolio_id, 'UTF8'
      )
    ),
    'hex'
  );
  derived_sender_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-sender-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(current_connection.phone_number_id, 'UTF8')
    ),
    'hex'
  );
  derived_rate_recipient_source_digest := 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to('connect-rate-recipient-source-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        current_connection.business_portfolio_id, 'UTF8'
      ) || pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(locked_contact.phone_e164, 'UTF8')
    ),
    'hex'
  );

  IF active_run.run_key IS NULL
    OR active_run.status <> 'running'
    OR active_run.tenant_id <> discovered_tenant_id
    OR active_run.started_at > database_now
    OR database_now >= active_run.lease_expires_at
    OR current_credential.tenant_id IS NULL
    OR current_credential_event.event_key IS NULL
    OR active_authorization.event_key IS NULL
    OR active_authorization.status <> 'approved'
    OR active_authorization.authorization_version < 1
    OR active_authorization.connection_version <>
      active_run.connection_version
    OR active_authorization.policy_version <> active_run.policy_version
    OR active_authorization.recipient_fingerprint <>
      active_run.recipient_fingerprint
    OR active_authorization.rate_limit_method_fingerprint <>
      active_run.rate_limit_method_fingerprint
    OR active_authorization.credential_revision <>
      current_credential.credential_revision
    OR active_authorization.credential_envelope_digest <>
      current_credential.envelope_digest
    OR active_authorization.credential_event_key <>
      current_credential_event.event_key
    OR active_authorization.recorded_at > database_now
    OR database_now >= active_authorization.recipient_expires_at
    OR database_now >= active_authorization.rate_limit_expires_at
    OR current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
    OR current_policy.event_key IS NULL
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.meta_graph_api_version <> active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR locked_binding.binding_key IS NULL
    OR locked_binding.tenant_id <> discovered_tenant_id
    OR locked_binding.run_key <> active_run.run_key
    OR locked_binding.run_claim_version <> active_run.claim_version
    OR locked_binding.authorization_event_key <>
      active_authorization.event_key
    OR locked_binding.authorization_version <>
      active_authorization.authorization_version
    OR locked_binding.credential_revision <>
      current_credential.credential_revision
    OR locked_binding.credential_envelope_digest <>
      current_credential.envelope_digest
    OR locked_binding.credential_event_key <>
      current_credential_event.event_key
    OR locked_delivery.delivery_key IS NULL
    OR locked_delivery.status <> 'sending'
    OR locked_delivery.attempt_count <> 1
    OR locked_delivery.claim_version < 1
    OR current_connection.phone_number_id IS DISTINCT FROM
      locked_delivery.sender_phone_number_id
    OR locked_inbound.message_key IS NULL
    OR locked_inbound.direction <> 'inbound'
    OR locked_inbound.conversation_key <>
      locked_delivery.conversation_key
    OR locked_conversation.conversation_key IS NULL
    OR locked_contact.id IS NULL
    OR locked_contact.phone_e164 <>
      locked_delivery.recipient_phone_e164
    OR locked_reservation.reservation_key IS NULL
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.policy_event_key <> current_policy.event_key
    OR locked_reservation.phone_throughput_messages_per_second <>
      current_policy.phone_throughput_messages_per_second
    OR locked_reservation.maximum_outbound_messages_per_second <>
      current_policy.maximum_outbound_messages_per_second
    OR locked_reservation.reserved_at > database_now
    OR database_now >= locked_reservation.reservation_expires_at
    OR service_window_opened_at IS NULL
    OR service_window_opened_at > database_now
    OR database_now >= service_window_expires_at
    OR locked_scope.scope_binding_key IS NULL
    OR locked_scope.run_binding_key <> locked_binding.binding_key
    OR locked_scope.run_key <> active_run.run_key
    OR locked_scope.tenant_id <> discovered_tenant_id
    OR locked_scope.run_claim_version <> active_run.claim_version
    OR locked_scope.authorization_event_key <>
      active_authorization.event_key
    OR locked_scope.authorization_version <>
      active_authorization.authorization_version
    OR locked_scope.credential_revision <>
      current_credential.credential_revision
    OR locked_scope.credential_envelope_digest <>
      current_credential.envelope_digest
    OR locked_scope.credential_event_key <>
      current_credential_event.event_key
    OR locked_scope.recipient_fingerprint <>
      active_run.recipient_fingerprint
    OR locked_scope.rate_limit_method_fingerprint <>
      active_run.rate_limit_method_fingerprint
    OR locked_scope.authorized_recipient_source_digest <>
      derived_authorized_recipient_source_digest
    OR locked_scope.delivery_key <> locked_delivery.delivery_key
    OR locked_scope.delivery_claim_version <>
      locked_delivery.claim_version
    OR locked_scope.conversation_key <>
      locked_delivery.conversation_key
    OR locked_scope.inbound_message_key <>
      locked_delivery.inbound_message_key
    OR locked_scope.portfolio_key <> locked_reservation.portfolio_key
    OR locked_scope.portfolio_source_digest <>
      derived_portfolio_source_digest
    OR locked_scope.sender_key <> locked_reservation.sender_key
    OR locked_scope.sender_source_digest <> derived_sender_source_digest
    OR locked_scope.recipient_key <> locked_reservation.recipient_key
    OR locked_scope.rate_recipient_source_digest <>
      derived_rate_recipient_source_digest
    OR locked_scope.reservation_key <> locked_reservation.reservation_key
    OR locked_scope.policy_event_key <> current_policy.event_key
    OR locked_scope.phone_throughput_messages_per_second <>
      current_policy.phone_throughput_messages_per_second
    OR locked_scope.maximum_outbound_messages_per_second <>
      current_policy.maximum_outbound_messages_per_second
    OR locked_scope.reservation_reserved_at <>
      locked_reservation.reserved_at
    OR locked_scope.pair_reserved_until <>
      locked_reservation.pair_reserved_until
    OR locked_scope.reservation_expires_at <>
      locked_reservation.reservation_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = requested_reservation_key
    )
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_provider_cooldown_state AS cooldown
      WHERE cooldown.blocked_until > database_now
        AND (
          (
            cooldown.scope = 'sender'
            AND cooldown.sender_key = locked_reservation.sender_key
            AND cooldown.recipient_key = ''
          ) OR (
            cooldown.scope = 'portfolio-recipient'
            AND cooldown.sender_key = ''
            AND cooldown.recipient_key = locked_reservation.recipient_key
          ) OR (
            cooldown.scope = 'pair'
            AND cooldown.sender_key = locked_reservation.sender_key
            AND cooldown.recipient_key = locked_reservation.recipient_key
          )
        )
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging admission safety evidence is stale';
  END IF;

  derived_admission_key := 'bot_reply_staging_admission_binding_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-admission-binding-v1',
          'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_binding.binding_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_delivery.delivery_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          locked_delivery.claim_version::pg_catalog.TEXT,
          'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_reservation.reservation_key, 'UTF8')
      ),
      'hex'
    );

  IF existing_admission.admission_binding_key IS NOT NULL THEN
    IF existing_admission.admission_binding_key <> derived_admission_key
      OR existing_admission.scope_binding_key <>
        locked_scope.scope_binding_key
      OR existing_admission.run_binding_key <> locked_binding.binding_key
      OR existing_admission.reservation_key <>
        locked_reservation.reservation_key
    THEN
      RAISE EXCEPTION
        'Bot reply staging admission replay conflicts';
    END IF;

    RETURN QUERY SELECT
      'replayed'::TEXT,
      existing_admission.admission_binding_key;
    RETURN;
  END IF;

  INSERT INTO public.bot_reply_staging_pre_send_admission_bindings (
    admission_binding_key,
    scope_binding_key,
    run_binding_key,
    run_key,
    tenant_id,
    run_claim_version,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reservation_reserved_at,
    pair_reserved_until,
    reservation_expires_at,
    bound_at,
    created_at
  ) VALUES (
    derived_admission_key,
    locked_scope.scope_binding_key,
    locked_binding.binding_key,
    active_run.run_key,
    discovered_tenant_id,
    active_run.claim_version,
    active_authorization.event_key,
    active_authorization.authorization_version,
    current_credential.credential_revision,
    current_credential.envelope_digest,
    current_credential_event.event_key,
    locked_delivery.delivery_key,
    locked_delivery.claim_version,
    locked_reservation.reservation_key,
    locked_reservation.sender_key,
    locked_reservation.recipient_key,
    current_policy.event_key,
    current_policy.phone_throughput_messages_per_second,
    current_policy.maximum_outbound_messages_per_second,
    locked_reservation.reserved_at,
    locked_reservation.pair_reserved_until,
    locked_reservation.reservation_expires_at,
    database_now,
    database_now
  );

  RETURN QUERY SELECT 'created'::TEXT, derived_admission_key;
END;
$$;

-- An exact provider deferral can arrive after a transport uncertainty was
-- recorded. Its provider-attempt instant remains the boundary proof, while
-- the local deferral projection cannot move delivery.updated_at backwards.
-- The retry therefore starts no earlier than one millisecond after the
-- database reconciliation instant.
ALTER TABLE public.bot_reply_provider_deferral_events
  DROP CONSTRAINT bot_reply_provider_deferrals_retry_valid,
  ADD CONSTRAINT bot_reply_provider_deferrals_retry_valid
  CHECK (
    retry_after_seconds BETWEEN 1 AND 86400
    AND attempted_at = pg_catalog.date_trunc('milliseconds', attempted_at)
    AND deferred_at = pg_catalog.date_trunc('milliseconds', deferred_at)
    AND retry_at = pg_catalog.date_trunc('milliseconds', retry_at)
    AND created_at = deferred_at
    AND deferred_at >= attempted_at
    AND retry_at > deferred_at
    AND retry_at = GREATEST(
      attempted_at + retry_after_seconds * INTERVAL '1 second',
      deferred_at + INTERVAL '1 millisecond'
    )
  );

-- Preserve all legacy delivery transitions and add one narrow late-truth edge:
-- ambiguous -> accepted is allowed only while the newly inserted provider link
-- is bound to this migration's exact permit/request/boundary chain. It does
-- not alter claim_version or create a retry.
CREATE OR REPLACE FUNCTION public.enforce_bot_reply_delivery_transition()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  service_window_expires_at TIMESTAMPTZ;
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.conversation_key IS DISTINCT FROM OLD.conversation_key
    OR NEW.inbound_message_key IS DISTINCT FROM OLD.inbound_message_key
    OR NEW.bot_flow_key IS DISTINCT FROM OLD.bot_flow_key
    OR NEW.bot_flow_version_key IS DISTINCT FROM OLD.bot_flow_version_key
    OR NEW.reply_index IS DISTINCT FROM OLD.reply_index
    OR NEW.sender_phone_number_id IS DISTINCT FROM OLD.sender_phone_number_id
    OR NEW.recipient_phone_e164 IS DISTINCT FROM OLD.recipient_phone_e164
    OR NEW.reply_json IS DISTINCT FROM OLD.reply_json
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'bot reply delivery identity is immutable';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'sending' THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version + 1
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery claim transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'sending' AND NEW.status = 'pending' THEN
    SELECT inbound.occurred_at + INTERVAL '24 hours'
    INTO service_window_expires_at
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = NEW.tenant_id
      AND inbound.message_key = NEW.inbound_message_key
      AND inbound.direction = 'inbound';

    IF NEW.attempt_count <> 0
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NULL
      OR NEW.deferred_at IS NULL
      OR NEW.deferred_at <> NEW.updated_at
      OR NEW.next_attempt_at <= NEW.deferred_at
      OR service_window_expires_at IS NULL
      OR NEW.next_attempt_at >= service_window_expires_at
      OR NEW.last_deferral_reason_code IS NULL
      OR NEW.last_deferral_reason_code
        OPERATOR(pg_catalog.!~) '^[A-Z0-9_]{1,100}$'
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery deferral transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'ambiguous' AND NEW.status = 'pending' THEN
    SELECT inbound.occurred_at + INTERVAL '24 hours'
    INTO service_window_expires_at
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = NEW.tenant_id
      AND inbound.message_key = NEW.inbound_message_key
      AND inbound.direction = 'inbound';

    IF OLD.last_error_code <> 'DELIVERY_OUTCOME_UNKNOWN'
      OR NEW.attempt_count <> 0
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NULL
      OR NEW.deferred_at IS NULL
      OR NEW.deferred_at <> NEW.updated_at
      OR NEW.deferred_at < OLD.updated_at
      OR NEW.next_attempt_at <= NEW.deferred_at
      OR service_window_expires_at IS NULL
      OR NEW.next_attempt_at >= service_window_expires_at
      OR NEW.last_deferral_reason_code IS NULL
      OR NEW.last_deferral_reason_code
        OPERATOR(pg_catalog.!~) '^[A-Z0-9_]{1,100}$'
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.bot_reply_provider_deferral_events AS deferral
        INNER JOIN
          public.bot_reply_staging_credential_provider_request_bindings
            AS binding
          ON binding.delivery_key = deferral.delivery_key
         AND binding.tenant_id = deferral.tenant_id
         AND binding.delivery_claim_version = deferral.claim_version
         AND binding.reservation_key = deferral.reservation_key
        INNER JOIN public.bot_reply_staging_provider_boundary_claims
          AS boundary_claim
          ON boundary_claim.permit_key = binding.permit_key
         AND boundary_claim.operation_key = binding.operation_key
         AND boundary_claim.provider_request_key =
           binding.provider_request_key
         AND boundary_claim.proved_at = deferral.attempted_at
        INNER JOIN public.bot_reply_staging_provider_uncertainty_events
          AS uncertainty
          ON uncertainty.permit_key = binding.permit_key
         AND uncertainty.operation_key = binding.operation_key
         AND uncertainty.provider_request_key =
           binding.provider_request_key
         AND uncertainty.delivery_key = deferral.delivery_key
         AND uncertainty.reservation_key = deferral.reservation_key
         AND uncertainty.uncertainty_kind = 'provider-response-ambiguous'
        WHERE deferral.delivery_key = NEW.delivery_key
          AND deferral.tenant_id = NEW.tenant_id
          AND deferral.claim_version = NEW.claim_version
          AND deferral.retry_at = NEW.next_attempt_at
          AND deferral.deferred_at = NEW.deferred_at
          AND deferral.reason_code = NEW.last_deferral_reason_code
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery exact-late deferral transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('sending', 'ambiguous')
    AND NEW.status = 'accepted'
  THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NULL
      OR NEW.last_error_code IS NOT NULL
      OR NEW.accepted_at IS NULL
      OR NEW.accepted_at <> NEW.updated_at
      OR (
        OLD.status = 'ambiguous'
        AND (
          OLD.last_error_code <> 'DELIVERY_OUTCOME_UNKNOWN'
          OR NOT EXISTS (
            SELECT 1
            FROM public.bot_reply_delivery_provider_links AS link
            INNER JOIN
              public.bot_reply_staging_credential_provider_request_bindings
                AS binding
              ON binding.delivery_key = link.delivery_key
             AND binding.tenant_id = link.tenant_id
             AND binding.reservation_key = link.reservation_key
            INNER JOIN public.bot_reply_staging_provider_boundary_claims
              AS boundary_claim
              ON boundary_claim.permit_key = binding.permit_key
             AND boundary_claim.operation_key = binding.operation_key
             AND boundary_claim.provider_request_key =
               binding.provider_request_key
            WHERE link.delivery_key = NEW.delivery_key
              AND link.tenant_id = NEW.tenant_id
              AND link.provider_message_id = NEW.provider_message_id
              AND link.accepted_at = NEW.accepted_at
              AND binding.delivery_claim_version = NEW.claim_version
              AND boundary_claim.proved_at <= link.accepted_at
          )
        )
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery acceptance transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'sending'
    AND NEW.status IN ('rejected', 'ambiguous')
  THEN
    IF NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code IS NULL
      OR NEW.accepted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery failure transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'ambiguous' AND NEW.status = 'rejected' THEN
    IF OLD.last_error_code <> 'DELIVERY_OUTCOME_UNKNOWN'
      OR NEW.attempt_count <> 1
      OR NEW.claim_version <> OLD.claim_version
      OR NEW.next_attempt_at IS NOT NULL
      OR NEW.deferred_at IS NOT NULL
      OR NEW.last_deferral_reason_code IS NOT NULL
      OR NEW.provider_message_id IS NOT NULL
      OR NEW.last_error_code <> 'META_SERVICE_WINDOW_CLOSED'
      OR NEW.accepted_at IS NOT NULL
      OR NEW.updated_at < OLD.updated_at
      OR NOT EXISTS (
        SELECT 1
        FROM public.bot_reply_service_window_rejection_events AS rejection
        INNER JOIN
          public.bot_reply_staging_credential_provider_request_bindings
            AS binding
          ON binding.delivery_key = rejection.delivery_key
         AND binding.tenant_id = rejection.tenant_id
         AND binding.delivery_claim_version = rejection.claim_version
         AND binding.reservation_key = rejection.reservation_key
        INNER JOIN public.bot_reply_staging_provider_boundary_claims
          AS boundary_claim
          ON boundary_claim.permit_key = binding.permit_key
         AND boundary_claim.operation_key = binding.operation_key
         AND boundary_claim.provider_request_key =
           binding.provider_request_key
         AND boundary_claim.proved_at = rejection.attempted_at
        INNER JOIN public.bot_reply_staging_provider_uncertainty_events
          AS uncertainty
          ON uncertainty.permit_key = binding.permit_key
         AND uncertainty.operation_key = binding.operation_key
         AND uncertainty.provider_request_key =
           binding.provider_request_key
         AND uncertainty.delivery_key = rejection.delivery_key
         AND uncertainty.reservation_key = rejection.reservation_key
         AND uncertainty.uncertainty_kind = 'provider-response-ambiguous'
        WHERE rejection.delivery_key = NEW.delivery_key
          AND rejection.tenant_id = NEW.tenant_id
          AND rejection.claim_version = NEW.claim_version
          AND rejection.rejected_at = NEW.updated_at
          AND rejection.reason_code = NEW.last_error_code
          AND rejection.provider_error_code = 131047
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'bot reply delivery exact-late rejection transition is invalid';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'bot reply delivery transition is invalid';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_provider_link_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  staging_chain_count INTEGER;
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

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NULL
    OR locked_reservation.reservation_key IS NULL
  THEN
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

  IF locked_request.request_key IS NULL THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  SELECT pg_catalog.count(*)::INTEGER
  INTO staging_chain_count
  FROM public.bot_reply_staging_credential_provider_request_bindings
    AS binding
  INNER JOIN public.bot_reply_staging_provider_boundary_claims
    AS boundary_claim
    ON boundary_claim.permit_key = binding.permit_key
   AND boundary_claim.operation_key = binding.operation_key
   AND boundary_claim.provider_request_key = binding.provider_request_key
  WHERE binding.delivery_key = NEW.delivery_key
    AND binding.tenant_id = NEW.tenant_id
    AND binding.delivery_claim_version = locked_delivery.claim_version
    AND binding.reservation_key = NEW.reservation_key
    AND binding.provider_request_key = locked_request.request_key
    AND boundary_claim.proved_at <= NEW.accepted_at;

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
    SELECT 1 FROM public.messages AS message
    WHERE message.tenant_id = NEW.tenant_id
      AND message.provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1 FROM public.campaign_delivery_provider_links AS link
    WHERE link.tenant_id = NEW.tenant_id
      AND link.provider_message_id = NEW.provider_message_id
  ) OR EXISTS (
    SELECT 1 FROM public.bot_reply_deliveries AS delivery
    WHERE delivery.tenant_id = NEW.tenant_id
      AND delivery.provider_message_id = NEW.provider_message_id
      AND delivery.delivery_key <> NEW.delivery_key
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to another target';
  END IF;

  IF locked_reservation.reservation_class <> 'service-reply'
    OR locked_request.requested_at > NEW.accepted_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = NEW.reservation_key
    )
    OR NOT (
      (
        staging_chain_count = 1
        AND locked_delivery.status IN ('sending', 'ambiguous')
      )
      OR (
        staging_chain_count = 0
        AND locked_delivery.status = 'sending'
        AND locked_reservation.reserved_at <= NEW.accepted_at
        AND NEW.accepted_at <= locked_reservation.reservation_expires_at
      )
    )
  THEN
    RAISE EXCEPTION
      'Bot reply provider link lacks an exact provider request claim';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_bot_reply_provider_acceptance()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  changed_rows INTEGER;
BEGIN
  UPDATE public.bot_reply_deliveries AS delivery
  SET
    status = 'accepted',
    provider_message_id = NEW.provider_message_id,
    last_error_code = NULL,
    next_attempt_at = NULL,
    deferred_at = NULL,
    last_deferral_reason_code = NULL,
    accepted_at = NEW.accepted_at,
    updated_at = NEW.accepted_at
  WHERE delivery.delivery_key = NEW.delivery_key
    AND delivery.tenant_id = NEW.tenant_id
    AND delivery.status IN ('sending', 'ambiguous');

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Bot reply acceptance projection failed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aa_bot_reply_deliveries_tenant_barrier_guard
BEFORE UPDATE ON public.bot_reply_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_tenant_barrier_write_v1();

-- One exact provider-fact union. The caller cannot supply tenant, request key,
-- operation key, delivery/claim identity, reservation identity, or any time.
-- A provider message ID is accepted only by the accepted branch. Error code
-- and retry are accepted only by their exact branches.
CREATE FUNCTION public.write_bot_reply_staging_provider_fact_v1(
  requested_permit_key TEXT,
  requested_outcome_kind TEXT,
  requested_provider_message_id TEXT,
  requested_error_code INTEGER,
  requested_retry_after_seconds INTEGER
)
RETURNS TABLE (
  outcome TEXT,
  "providerOutcomeKind" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  initial_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  locked_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  service_window_opened_at TIMESTAMPTZ;
  service_window_expires_at TIMESTAMPTZ;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_admission
    public.bot_reply_staging_pre_send_admission_bindings%ROWTYPE;
  locked_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  stored_binding
    public.bot_reply_staging_credential_provider_request_bindings%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_request public.bot_reply_provider_request_claims%ROWTYPE;
  stored_boundary_claim
    public.bot_reply_staging_provider_boundary_claims%ROWTYPE;
  stored_outcome
    public.bot_reply_staging_provider_operation_outcomes%ROWTYPE;
  existing_acceptance public.bot_reply_delivery_provider_links%ROWTYPE;
  existing_deferral public.bot_reply_provider_deferral_events%ROWTYPE;
  existing_rejection
    public.bot_reply_service_window_rejection_events%ROWTYPE;
  database_now TIMESTAMPTZ;
  attempted_at TIMESTAMPTZ;
  retry_at TIMESTAMPTZ;
  evidence_key TEXT;
  cooldown_scope TEXT;
  reason_code TEXT;
  exact_fact_count INTEGER;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
    OR requested_outcome_kind IS NULL
    OR (
      (
        requested_outcome_kind = 'accepted'
        AND requested_provider_message_id IS NOT NULL
        AND pg_catalog.length(
          pg_catalog.btrim(requested_provider_message_id)
        ) BETWEEN 1 AND 255
        AND requested_provider_message_id =
          pg_catalog.btrim(requested_provider_message_id)
        AND requested_provider_message_id
          OPERATOR(pg_catalog.!~) '[[:cntrl:]]'
        AND requested_error_code IS NULL
        AND requested_retry_after_seconds IS NULL
      )
      OR (
        requested_outcome_kind = 'sender-deferred'
        AND requested_provider_message_id IS NULL
        AND requested_error_code IS NOT NULL
        AND requested_error_code = 130429
        AND requested_retry_after_seconds IS NOT NULL
        AND requested_retry_after_seconds BETWEEN 1 AND 86400
      )
      OR (
        requested_outcome_kind = 'pair-deferred'
        AND requested_provider_message_id IS NULL
        AND requested_error_code IS NOT NULL
        AND requested_error_code = 131056
        AND requested_retry_after_seconds IS NOT NULL
        AND requested_retry_after_seconds BETWEEN 1 AND 86400
      )
      OR (
        requested_outcome_kind = 'service-window-rejected'
        AND requested_provider_message_id IS NULL
        AND requested_error_code IS NOT NULL
        AND requested_error_code = 131047
        AND requested_retry_after_seconds IS NULL
      )
    ) IS NOT TRUE
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider fact union is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider fact requires read committed isolation';
  END IF;

  PERFORM public.assert_bot_reply_staging_exact_session_barrier_v1(
    requested_permit_key
  );

  SELECT permit.*
  INTO initial_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bot reply staging provider fact lacks permit';
  END IF;

  -- Canonical order: tenant barrier (already held), run, credential,
  -- credential event, authorization, connection, policy, run binding,
  -- delivery, inbound message, reservation, cooldown scopes, admission/permit,
  -- provider operation, provider request.
  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = initial_permit.run_key
    AND staging_run.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  IF current_credential.tenant_id IS NOT NULL THEN
    SELECT event.*
    INTO current_credential_event
    FROM public.meta_credential_revision_events AS event
    WHERE event.tenant_id = initial_permit.tenant_id
      AND event.credential_revision =
        current_credential.credential_revision
      AND event.envelope_digest = current_credential.envelope_digest
    FOR KEY SHARE;
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = initial_permit.tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = initial_permit.tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT binding.*
  INTO locked_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.binding_key = initial_permit.run_binding_key
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = initial_permit.delivery_key
    AND delivery.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NOT NULL THEN
    SELECT inbound.occurred_at,
      inbound.occurred_at + INTERVAL '24 hours'
    INTO service_window_opened_at, service_window_expires_at
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = initial_permit.tenant_id
      AND inbound.message_key = locked_delivery.inbound_message_key
      AND inbound.direction = 'inbound'
    FOR KEY SHARE;
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = initial_permit.reservation_key
    AND reservation.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_provider_cooldown_state AS cooldown
  WHERE (
      cooldown.scope = 'sender'
      AND cooldown.sender_key = initial_permit.sender_key
      AND cooldown.recipient_key = ''
    ) OR (
      cooldown.scope = 'portfolio-recipient'
      AND cooldown.sender_key = ''
      AND cooldown.recipient_key = initial_permit.recipient_key
    ) OR (
      cooldown.scope = 'pair'
      AND cooldown.sender_key = initial_permit.sender_key
      AND cooldown.recipient_key = initial_permit.recipient_key
    )
  ORDER BY cooldown.scope, cooldown.sender_key, cooldown.recipient_key
  FOR UPDATE;

  SELECT admission.*
  INTO locked_admission
  FROM public.bot_reply_staging_pre_send_admission_bindings AS admission
  WHERE admission.admission_binding_key = initial_permit.admission_binding_key
    AND admission.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT permit.*
  INTO locked_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key
    AND permit.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT binding.*
  INTO stored_binding
  FROM public.bot_reply_staging_credential_provider_request_bindings
    AS binding
  WHERE binding.permit_key = requested_permit_key
    AND binding.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = initial_permit.operation_key
    AND operation.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO stored_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.request_key = stored_operation.provider_request_key
    AND request.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT boundary_claim.*
  INTO stored_boundary_claim
  FROM public.bot_reply_staging_provider_boundary_claims AS boundary_claim
  WHERE boundary_claim.permit_key = requested_permit_key
    AND boundary_claim.operation_key = initial_permit.operation_key
    AND boundary_claim.provider_request_key = stored_request.request_key
  FOR KEY SHARE;

  SELECT provider_outcome.*
  INTO stored_outcome
  FROM public.bot_reply_staging_provider_operation_outcomes
    AS provider_outcome
  WHERE provider_outcome.operation_key = initial_permit.operation_key
  FOR KEY SHARE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  attempted_at := stored_boundary_claim.proved_at;

  IF locked_permit.permit_key IS NULL
    OR locked_permit IS DISTINCT FROM initial_permit
    OR locked_binding.binding_key IS NULL
    OR locked_admission.admission_binding_key IS NULL
    OR stored_binding.binding_key IS NULL
    OR stored_operation.operation_key IS NULL
    OR stored_request.request_key IS NULL
    OR stored_boundary_claim.claim_key IS NULL
    OR stored_binding.operation_key <> locked_permit.operation_key
    OR stored_binding.delivery_key <> locked_permit.delivery_key
    OR stored_binding.delivery_claim_version <>
      locked_permit.delivery_claim_version
    OR stored_binding.reservation_key <> locked_permit.reservation_key
    OR stored_binding.provider_request_key <> stored_request.request_key
    OR stored_operation.provider_request_key <> stored_request.request_key
    OR stored_operation.requested_at <> stored_request.requested_at
    OR stored_boundary_claim.requested_at <> stored_request.requested_at
    OR stored_boundary_claim.backend_pid <>
      pg_catalog.pg_backend_pid()
    OR stored_boundary_claim.proved_at < stored_request.requested_at
    OR stored_boundary_claim.proved_at > database_now
    OR locked_delivery.delivery_key IS NULL
    OR locked_delivery.claim_version <> locked_permit.delivery_claim_version
    OR locked_reservation.reservation_key IS NULL
    OR locked_reservation.reservation_class <> 'service-reply'
    OR service_window_opened_at IS NULL
    OR attempted_at < service_window_opened_at
    OR attempted_at >= service_window_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider fact chain conflicts';
  END IF;

  SELECT link.*
  INTO existing_acceptance
  FROM public.bot_reply_delivery_provider_links AS link
  WHERE link.delivery_key = locked_permit.delivery_key
    AND link.tenant_id = locked_permit.tenant_id;

  SELECT event.*
  INTO existing_deferral
  FROM public.bot_reply_provider_deferral_events AS event
  WHERE event.delivery_key = locked_permit.delivery_key
    AND event.tenant_id = locked_permit.tenant_id
    AND event.claim_version = locked_permit.delivery_claim_version;

  SELECT event.*
  INTO existing_rejection
  FROM public.bot_reply_service_window_rejection_events AS event
  WHERE event.delivery_key = locked_permit.delivery_key
    AND event.tenant_id = locked_permit.tenant_id
    AND event.claim_version = locked_permit.delivery_claim_version;

  exact_fact_count :=
    CASE WHEN existing_acceptance.delivery_key IS NULL THEN 0 ELSE 1 END +
    CASE WHEN existing_deferral.event_key IS NULL THEN 0 ELSE 1 END +
    CASE WHEN existing_rejection.event_key IS NULL THEN 0 ELSE 1 END;

  IF exact_fact_count > 1 THEN
    RAISE EXCEPTION
      'Bot reply staging provider facts conflict';
  ELSIF exact_fact_count = 1 THEN
    IF (
        requested_outcome_kind = 'accepted'
        AND existing_acceptance.delivery_key IS NOT NULL
        AND existing_acceptance.provider_message_id =
          requested_provider_message_id
      ) OR (
        requested_outcome_kind = 'sender-deferred'
        AND existing_deferral.provider_error_code = 130429
        AND existing_deferral.retry_after_seconds =
          requested_retry_after_seconds
      ) OR (
        requested_outcome_kind = 'pair-deferred'
        AND existing_deferral.provider_error_code = 131056
        AND existing_deferral.retry_after_seconds =
          requested_retry_after_seconds
      ) OR (
        requested_outcome_kind = 'service-window-rejected'
        AND existing_rejection.provider_error_code = 131047
      )
    THEN
      RETURN QUERY SELECT 'replayed'::TEXT, requested_outcome_kind;
      RETURN;
    END IF;

    RAISE EXCEPTION
      'Bot reply staging provider fact replay conflicts';
  END IF;

  -- Finalization may already have projected this exact fact into the provider
  -- outcome ledger. Identical facts replay above; without matching immutable
  -- evidence an existing outcome remains a hard conflict.
  IF stored_outcome.operation_key IS NOT NULL THEN
    RAISE EXCEPTION
      'Bot reply staging provider fact chain conflicts';
  END IF;

  IF requested_outcome_kind = 'accepted' THEN
    INSERT INTO public.bot_reply_delivery_provider_links (
      delivery_key,
      tenant_id,
      provider_message_id,
      reservation_key,
      provider_status,
      last_status_event_key,
      last_status_event_at,
      terminal_outcome,
      terminal_settled_at,
      accepted_at,
      created_at,
      updated_at
    ) VALUES (
      locked_permit.delivery_key,
      locked_permit.tenant_id,
      requested_provider_message_id,
      locked_permit.reservation_key,
      'accepted',
      NULL,
      NULL,
      NULL,
      NULL,
      database_now,
      database_now,
      database_now
    );
  ELSIF requested_outcome_kind IN ('sender-deferred', 'pair-deferred') THEN
    IF locked_delivery.status NOT IN ('sending', 'ambiguous')
      OR (
        locked_delivery.status = 'ambiguous'
        AND locked_delivery.last_error_code <>
          'DELIVERY_OUTCOME_UNKNOWN'
      )
    THEN
      RAISE EXCEPTION
        'Bot reply staging deferral requires unresolved sending state';
    END IF;

    cooldown_scope := CASE requested_outcome_kind
      WHEN 'sender-deferred' THEN 'sender'
      ELSE 'pair'
    END;
    reason_code := CASE requested_outcome_kind
      WHEN 'sender-deferred' THEN 'META_PHONE_THROUGHPUT_LIMITED'
      ELSE 'META_PAIR_RATE_LIMITED'
    END;
    retry_at := GREATEST(
      attempted_at +
        requested_retry_after_seconds * INTERVAL '1 second',
      database_now + INTERVAL '1 millisecond'
    );

    IF retry_at >= service_window_expires_at THEN
      RAISE EXCEPTION
        'Bot reply staging exact deferral retry exceeds service window';
    END IF;

    INSERT INTO public.whatsapp_rate_limit_settlements (
      reservation_key,
      outcome,
      settled_at,
      created_at
    ) VALUES (
      locked_permit.reservation_key,
      'provider-failed',
      attempted_at,
      attempted_at
    );

    INSERT INTO public.whatsapp_provider_cooldown_events (
      reservation_key,
      scope,
      provider_error_code,
      observed_at,
      blocked_until,
      created_at
    ) VALUES (
      locked_permit.reservation_key,
      cooldown_scope,
      requested_error_code,
      attempted_at,
      retry_at,
      attempted_at
    );

    evidence_key := 'bot_reply_provider_deferral_v1_' ||
      pg_catalog.encode(
        pg_catalog.sha256(
          pg_catalog.convert_to(
            'connect-bot-reply-staging-provider-deferral-v1',
            'UTF8'
          ) || pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(stored_operation.operation_key, 'UTF8') ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(stored_request.request_key, 'UTF8') ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(requested_outcome_kind, 'UTF8') ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(
            requested_retry_after_seconds::pg_catalog.TEXT,
            'UTF8'
          )
        ),
        'hex'
      );

    INSERT INTO public.bot_reply_provider_deferral_events (
      event_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      provider_error_code,
      cooldown_scope,
      retry_after_seconds,
      reason_code,
      attempted_at,
      deferred_at,
      retry_at,
      created_at
    ) VALUES (
      evidence_key,
      locked_permit.delivery_key,
      locked_permit.tenant_id,
      locked_permit.delivery_claim_version,
      locked_permit.reservation_key,
      requested_error_code,
      cooldown_scope,
      requested_retry_after_seconds,
      reason_code,
      attempted_at,
      database_now,
      retry_at,
      database_now
    );

    UPDATE public.bot_reply_deliveries AS delivery
    SET
      status = 'pending',
      attempt_count = 0,
      next_attempt_at = retry_at,
      deferred_at = database_now,
      last_deferral_reason_code = reason_code,
      last_error_code = NULL,
      updated_at = database_now
    WHERE delivery.delivery_key = locked_permit.delivery_key
      AND delivery.tenant_id = locked_permit.tenant_id
      AND delivery.status IN ('sending', 'ambiguous')
      AND delivery.claim_version = locked_permit.delivery_claim_version;
  ELSE
    IF locked_delivery.status NOT IN ('sending', 'ambiguous')
      OR (
        locked_delivery.status = 'ambiguous'
        AND locked_delivery.last_error_code <>
          'DELIVERY_OUTCOME_UNKNOWN'
      )
    THEN
      RAISE EXCEPTION
        'Bot reply staging service rejection requires unresolved sending state';
    END IF;

    INSERT INTO public.whatsapp_rate_limit_settlements (
      reservation_key,
      outcome,
      settled_at,
      created_at
    ) VALUES (
      locked_permit.reservation_key,
      'provider-failed',
      attempted_at,
      attempted_at
    );

    evidence_key := 'bot_reply_window_rejection_v1_' ||
      pg_catalog.encode(
        pg_catalog.sha256(
          pg_catalog.convert_to(
            'connect-bot-reply-staging-window-rejection-v1',
            'UTF8'
          ) || pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(stored_operation.operation_key, 'UTF8') ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(stored_request.request_key, 'UTF8')
        ),
        'hex'
      );

    INSERT INTO public.bot_reply_service_window_rejection_events (
      event_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      provider_error_code,
      reason_code,
      service_window_opened_at,
      service_window_expires_at,
      attempted_at,
      rejected_at,
      created_at
    ) VALUES (
      evidence_key,
      locked_permit.delivery_key,
      locked_permit.tenant_id,
      locked_permit.delivery_claim_version,
      locked_permit.reservation_key,
      131047,
      'META_SERVICE_WINDOW_CLOSED',
      service_window_opened_at,
      service_window_expires_at,
      attempted_at,
      database_now,
      database_now
    );

    UPDATE public.bot_reply_deliveries AS delivery
    SET
      status = 'rejected',
      last_error_code = 'META_SERVICE_WINDOW_CLOSED',
      updated_at = database_now
    WHERE delivery.delivery_key = locked_permit.delivery_key
      AND delivery.tenant_id = locked_permit.tenant_id
      AND delivery.status IN ('sending', 'ambiguous')
      AND delivery.claim_version = locked_permit.delivery_claim_version;
  END IF;

  RETURN QUERY SELECT 'recorded'::TEXT, requested_outcome_kind;
END;
$$;

ALTER TABLE public.bot_reply_staging_provider_uncertainty_events
  ADD COLUMN source_reason TEXT,
  ADD CONSTRAINT bot_reply_staging_uncertainty_source_reason_valid
  CHECK (
    source_reason IS NULL
    OR source_reason IN ('timeout', 'threw')
  );

CREATE FUNCTION public.write_bot_reply_staging_provider_uncertainty_v1(
  requested_permit_key TEXT,
  requested_reason TEXT
)
RETURNS TABLE (
  outcome TEXT,
  state TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  initial_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_request public.bot_reply_provider_request_claims%ROWTYPE;
  stored_boundary_claim
    public.bot_reply_staging_provider_boundary_claims%ROWTYPE;
  existing_uncertainty
    public.bot_reply_staging_provider_uncertainty_events%ROWTYPE;
  database_now TIMESTAMPTZ;
  uncertainty_event_key TEXT;
  exact_fact_count INTEGER;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
    OR requested_reason IS NULL
    OR requested_reason NOT IN ('timeout', 'threw')
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider uncertainty union is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider uncertainty requires read committed isolation';
  END IF;

  PERFORM public.assert_bot_reply_staging_exact_session_barrier_v1(
    requested_permit_key
  );

  SELECT permit.*
  INTO initial_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging provider uncertainty lacks permit';
  END IF;

  -- Use the same canonical lock order as the exact writer. These read-only
  -- locks intentionally recheck the immutable chain without accepting any
  -- caller-provided tenant, request or timestamp.
  PERFORM 1
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = initial_permit.run_key
    AND staging_run.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.meta_credential_revision_events AS event
  WHERE event.tenant_id = initial_permit.tenant_id
    AND event.credential_revision = initial_permit.credential_revision
    AND event.envelope_digest = initial_permit.credential_envelope_digest
  FOR KEY SHARE;

  PERFORM 1
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.event_key = initial_permit.authorization_event_key
    AND authorization_event.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.event_key = initial_permit.policy_event_key
    AND policy.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.binding_key = initial_permit.run_binding_key
    AND binding.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = initial_permit.delivery_key
    AND delivery.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NOT NULL THEN
    PERFORM 1
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = initial_permit.tenant_id
      AND inbound.message_key = locked_delivery.inbound_message_key
      AND inbound.direction = 'inbound'
    FOR KEY SHARE;
  END IF;

  PERFORM 1
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = initial_permit.reservation_key
    AND reservation.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_provider_cooldown_state AS cooldown
  WHERE (
      cooldown.scope = 'sender'
      AND cooldown.sender_key = initial_permit.sender_key
      AND cooldown.recipient_key = ''
    ) OR (
      cooldown.scope = 'portfolio-recipient'
      AND cooldown.sender_key = ''
      AND cooldown.recipient_key = initial_permit.recipient_key
    ) OR (
      cooldown.scope = 'pair'
      AND cooldown.sender_key = initial_permit.sender_key
      AND cooldown.recipient_key = initial_permit.recipient_key
    )
  ORDER BY cooldown.scope, cooldown.sender_key, cooldown.recipient_key
  FOR UPDATE;

  PERFORM 1
  FROM public.bot_reply_staging_pre_send_admission_bindings AS admission
  WHERE admission.admission_binding_key = initial_permit.admission_binding_key
    AND admission.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key
    AND permit.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = initial_permit.operation_key
    AND operation.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO stored_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.request_key = stored_operation.provider_request_key
    AND request.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT boundary_claim.*
  INTO stored_boundary_claim
  FROM public.bot_reply_staging_provider_boundary_claims AS boundary_claim
  WHERE boundary_claim.permit_key = requested_permit_key
    AND boundary_claim.operation_key = stored_operation.operation_key
    AND boundary_claim.provider_request_key = stored_request.request_key
  FOR KEY SHARE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF locked_delivery.delivery_key IS NULL
    OR stored_operation.operation_key IS NULL
    OR stored_request.request_key IS NULL
    OR stored_boundary_claim.claim_key IS NULL
    OR stored_boundary_claim.backend_pid <>
      pg_catalog.pg_backend_pid()
    OR stored_boundary_claim.proved_at > database_now
  THEN
    RAISE EXCEPTION
      'Bot reply staging provider uncertainty chain conflicts';
  END IF;

  SELECT
    (CASE WHEN EXISTS (
      SELECT 1
      FROM public.bot_reply_delivery_provider_links AS link
      WHERE link.delivery_key = initial_permit.delivery_key
        AND link.tenant_id = initial_permit.tenant_id
    ) THEN 1 ELSE 0 END) +
    (CASE WHEN EXISTS (
      SELECT 1
      FROM public.bot_reply_provider_deferral_events AS event
      WHERE event.delivery_key = initial_permit.delivery_key
        AND event.tenant_id = initial_permit.tenant_id
        AND event.claim_version = initial_permit.delivery_claim_version
    ) THEN 1 ELSE 0 END) +
    (CASE WHEN EXISTS (
      SELECT 1
      FROM public.bot_reply_service_window_rejection_events AS event
      WHERE event.delivery_key = initial_permit.delivery_key
        AND event.tenant_id = initial_permit.tenant_id
        AND event.claim_version = initial_permit.delivery_claim_version
    ) THEN 1 ELSE 0 END)
  INTO exact_fact_count;

  IF exact_fact_count > 0 THEN
    RETURN QUERY SELECT 'superseded'::TEXT, 'exact-provider-fact'::TEXT;
    RETURN;
  END IF;

  SELECT uncertainty.*
  INTO existing_uncertainty
  FROM public.bot_reply_staging_provider_uncertainty_events AS uncertainty
  WHERE uncertainty.operation_key = stored_operation.operation_key
    AND uncertainty.uncertainty_kind = 'provider-response-ambiguous';

  IF existing_uncertainty.event_key IS NOT NULL THEN
    IF existing_uncertainty.source_reason IS NOT NULL
      AND existing_uncertainty.source_reason <> requested_reason
    THEN
      RAISE EXCEPTION
        'Bot reply staging provider uncertainty replay conflicts';
    END IF;
    RETURN QUERY SELECT 'replayed'::TEXT, 'ambiguous'::TEXT;
    RETURN;
  END IF;

  IF locked_delivery.status <> 'sending'
    OR locked_delivery.claim_version <>
      initial_permit.delivery_claim_version
  THEN
    RAISE EXCEPTION
      'Bot reply staging uncertainty requires active sending state';
  END IF;

  UPDATE public.bot_reply_deliveries AS delivery
  SET
    status = 'ambiguous',
    last_error_code = 'DELIVERY_OUTCOME_UNKNOWN',
    updated_at = database_now
  WHERE delivery.delivery_key = initial_permit.delivery_key
    AND delivery.tenant_id = initial_permit.tenant_id
    AND delivery.status = 'sending'
    AND delivery.claim_version = initial_permit.delivery_claim_version;

  uncertainty_event_key := 'bot_reply_staging_uncertainty_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-provider-uncertainty-writer-v1',
          'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(stored_operation.operation_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(stored_request.request_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_reason, 'UTF8')
      ),
      'hex'
    );

  INSERT INTO public.bot_reply_staging_provider_uncertainty_events (
    event_key,
    permit_key,
    operation_key,
    run_key,
    tenant_id,
    delivery_key,
    reservation_key,
    provider_request_key,
    requested_at,
    uncertainty_kind,
    detected_at,
    created_at,
    source_reason
  ) VALUES (
    uncertainty_event_key,
    initial_permit.permit_key,
    stored_operation.operation_key,
    stored_operation.run_key,
    stored_operation.tenant_id,
    stored_operation.delivery_key,
    stored_operation.reservation_key,
    stored_operation.provider_request_key,
    stored_operation.requested_at,
    'provider-response-ambiguous',
    database_now,
    database_now,
    requested_reason
  );

  RETURN QUERY SELECT 'recorded'::TEXT, 'ambiguous'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_provider_deferral_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
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

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version
    AND request.reservation_key = NEW.reservation_key
  FOR UPDATE;

  SELECT event.*
  INTO existing_event
  FROM public.bot_reply_provider_deferral_events AS event
  WHERE event.event_key = NEW.event_key;

  IF existing_event.event_key IS NOT NULL THEN
    IF existing_event IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION 'Bot reply provider deferral identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  IF locked_delivery.delivery_key IS NULL
    OR locked_reservation.reservation_key IS NULL
    OR locked_request.request_key IS NULL
    OR locked_delivery.claim_version <> NEW.claim_version
    OR NOT (
      (
        locked_delivery.status = 'pending'
        AND locked_delivery.attempt_count = 0
        AND locked_delivery.next_attempt_at = NEW.retry_at
        AND locked_delivery.deferred_at = NEW.deferred_at
        AND locked_delivery.last_deferral_reason_code = NEW.reason_code
      )
      OR (
        locked_delivery.status IN ('sending', 'ambiguous')
        AND locked_delivery.attempt_count = 1
        AND locked_delivery.next_attempt_at IS NULL
        AND locked_delivery.deferred_at IS NULL
        AND locked_delivery.last_deferral_reason_code IS NULL
        AND locked_delivery.provider_message_id IS NULL
        AND locked_delivery.accepted_at IS NULL
        AND (
          locked_delivery.status = 'sending'
          OR (
            locked_delivery.last_error_code =
              'DELIVERY_OUTCOME_UNKNOWN'
            AND EXISTS (
              SELECT 1
              FROM public.bot_reply_staging_provider_uncertainty_events
                AS uncertainty
              INNER JOIN
                public.bot_reply_staging_credential_provider_request_bindings
                  AS binding
                ON binding.permit_key = uncertainty.permit_key
               AND binding.operation_key = uncertainty.operation_key
               AND binding.provider_request_key =
                 uncertainty.provider_request_key
              WHERE uncertainty.delivery_key = NEW.delivery_key
                AND uncertainty.tenant_id = NEW.tenant_id
                AND uncertainty.reservation_key = NEW.reservation_key
                AND uncertainty.uncertainty_kind =
                  'provider-response-ambiguous'
                AND binding.delivery_claim_version = NEW.claim_version
                AND binding.provider_request_key = locked_request.request_key
            )
          )
        )
      )
    )
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_request.requested_at > NEW.attempted_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_credential_provider_request_bindings
        AS binding
      INNER JOIN public.bot_reply_staging_provider_boundary_claims
        AS boundary_claim
        ON boundary_claim.permit_key = binding.permit_key
       AND boundary_claim.operation_key = binding.operation_key
       AND boundary_claim.provider_request_key = binding.provider_request_key
      WHERE binding.delivery_key = NEW.delivery_key
        AND binding.tenant_id = NEW.tenant_id
        AND binding.delivery_claim_version = NEW.claim_version
        AND binding.reservation_key = NEW.reservation_key
        AND binding.provider_request_key = locked_request.request_key
        AND boundary_claim.proved_at = NEW.attempted_at
    )
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
      'Bot reply provider deferral lacks exact staging boundary provenance';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_window_rejection_insert()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  existing_event
    public.bot_reply_service_window_rejection_events%ROWTYPE;
BEGIN
  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = NEW.delivery_key
    AND delivery.tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = NEW.reservation_key
    AND reservation.tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO locked_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.delivery_key = NEW.delivery_key
    AND request.tenant_id = NEW.tenant_id
    AND request.claim_version = NEW.claim_version
    AND request.reservation_key = NEW.reservation_key
  FOR UPDATE;

  SELECT event.*
  INTO existing_event
  FROM public.bot_reply_service_window_rejection_events AS event
  WHERE event.event_key = NEW.event_key;

  IF existing_event.event_key IS NOT NULL THEN
    IF existing_event IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION
        'Bot reply service-window rejection identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  IF locked_delivery.delivery_key IS NULL
    OR locked_reservation.reservation_key IS NULL
    OR locked_request.request_key IS NULL
    OR locked_delivery.claim_version <> NEW.claim_version
    OR NOT (
      (
        locked_delivery.status = 'rejected'
        AND locked_delivery.last_error_code = NEW.reason_code
        AND locked_delivery.updated_at = NEW.rejected_at
      )
      OR (
        locked_delivery.status IN ('sending', 'ambiguous')
        AND locked_delivery.attempt_count = 1
        AND locked_delivery.provider_message_id IS NULL
        AND locked_delivery.accepted_at IS NULL
        AND locked_delivery.next_attempt_at IS NULL
        AND locked_delivery.deferred_at IS NULL
        AND locked_delivery.last_deferral_reason_code IS NULL
        AND NEW.rejected_at >= locked_delivery.updated_at
        AND (
          locked_delivery.status = 'sending'
          OR (
            locked_delivery.last_error_code =
              'DELIVERY_OUTCOME_UNKNOWN'
            AND EXISTS (
              SELECT 1
              FROM public.bot_reply_staging_provider_uncertainty_events
                AS uncertainty
              INNER JOIN
                public.bot_reply_staging_credential_provider_request_bindings
                  AS binding
                ON binding.permit_key = uncertainty.permit_key
               AND binding.operation_key = uncertainty.operation_key
               AND binding.provider_request_key =
                 uncertainty.provider_request_key
              WHERE uncertainty.delivery_key = NEW.delivery_key
                AND uncertainty.tenant_id = NEW.tenant_id
                AND uncertainty.reservation_key = NEW.reservation_key
                AND uncertainty.uncertainty_kind =
                  'provider-response-ambiguous'
                AND binding.delivery_claim_version = NEW.claim_version
                AND binding.provider_request_key = locked_request.request_key
            )
          )
        )
      )
    )
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_request.requested_at > NEW.attempted_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_credential_provider_request_bindings
        AS binding
      INNER JOIN public.bot_reply_staging_provider_boundary_claims
        AS boundary_claim
        ON boundary_claim.permit_key = binding.permit_key
       AND boundary_claim.operation_key = binding.operation_key
       AND boundary_claim.provider_request_key = binding.provider_request_key
      WHERE binding.delivery_key = NEW.delivery_key
        AND binding.tenant_id = NEW.tenant_id
        AND binding.delivery_claim_version = NEW.claim_version
        AND binding.reservation_key = NEW.reservation_key
        AND binding.provider_request_key = locked_request.request_key
        AND boundary_claim.proved_at = NEW.attempted_at
    )
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
      'Bot reply service-window rejection lacks exact staging boundary provenance';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_bot_reply_provider_link_update()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
    OR NEW.reservation_key IS DISTINCT FROM OLD.reservation_key
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Bot reply provider identity is immutable';
  END IF;

  IF OLD.terminal_outcome IS NOT NULL
    AND (
      NEW.terminal_outcome IS DISTINCT FROM OLD.terminal_outcome
      OR NEW.terminal_settled_at IS DISTINCT FROM OLD.terminal_settled_at
    )
  THEN
    RAISE EXCEPTION 'Bot reply terminal outcome is immutable';
  END IF;

  IF NEW.last_status_event_key IS NOT DISTINCT FROM OLD.last_status_event_key
    OR NEW.last_status_event_at IS NULL
    OR (
      OLD.last_status_event_at IS NOT NULL
      AND NEW.last_status_event_at < OLD.last_status_event_at
    )
    OR (
      OLD.last_status_event_at = NEW.last_status_event_at
      AND (
        CASE NEW.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      ) <= (
        CASE OLD.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      )
    )
    OR NEW.updated_at < OLD.updated_at
    OR (
      OLD.terminal_outcome IS NULL
      AND NEW.terminal_outcome IS NOT NULL
      AND NEW.terminal_settled_at IS DISTINCT FROM NEW.updated_at
    )
  THEN
    RAISE EXCEPTION 'Bot reply provider status does not advance';
  END IF;

  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    PERFORM 1
    FROM public.whatsapp_rate_limit_reservations AS reservation
    WHERE reservation.reservation_key = NEW.reservation_key
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = NEW.reservation_key
        AND (
          settlement.outcome IS DISTINCT FROM NEW.terminal_outcome
          OR settlement.settled_at IS DISTINCT FROM
            NEW.terminal_settled_at
        )
    ) THEN
      RAISE EXCEPTION
        'Bot reply settlement conflicts with rate-limit evidence';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_bot_reply_provider_status()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    INSERT INTO public.whatsapp_rate_limit_settlements (
      reservation_key,
      outcome,
      settled_at,
      created_at
    ) VALUES (
      NEW.reservation_key,
      NEW.terminal_outcome,
      NEW.terminal_settled_at,
      NEW.terminal_settled_at
    )
    ON CONFLICT (reservation_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_provider_link_delete()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply provider links are immutable evidence';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_provider_deferral_mutation()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply provider deferral evidence is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_window_rejection_mutation()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply service-window rejection evidence is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp rate-limit evidence is immutable';
END;
$$;

-- Append-only closure: bulk table clearing cannot bypass row-level mutation
-- guards. State projections are also non-truncatable because they are safety
-- inputs to admission and consumption.
CREATE TRIGGER bot_reply_provider_links_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_delivery_provider_links
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_bot_reply_provider_link_delete();

CREATE TRIGGER bot_reply_provider_deferrals_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_provider_deferral_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_bot_reply_provider_deferral_mutation();

CREATE TRIGGER bot_reply_window_rejections_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_service_window_rejection_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_bot_reply_window_rejection_mutation();

CREATE TRIGGER whatsapp_rate_reservations_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_rate_limit_reservations
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_rate_settlements_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_rate_limit_settlements
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_provider_cooldown_events_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_provider_cooldown_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_provider_cooldown_state_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_provider_cooldown_state
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_evidence_mutation();

CREATE TRIGGER whatsapp_pair_state_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_pair_rate_limit_state
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_state_delete();

CREATE TRIGGER whatsapp_portfolio_state_truncate_guard
BEFORE TRUNCATE ON public.whatsapp_portfolio_recipient_rate_limit_state
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_whatsapp_rate_limit_state_delete();

REVOKE ALL ON TABLE public.bot_reply_staging_pre_send_admission_bindings
  FROM PUBLIC;
REVOKE ALL ON TABLE
  public.bot_reply_staging_service_reply_scope_bindings FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_staging_provider_uncertainty_events
  FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_delivery_provider_links FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_provider_deferral_events FROM PUBLIC;
REVOKE ALL ON TABLE public.bot_reply_service_window_rejection_events
  FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_rate_limit_settlements FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_rate_limit_reservations FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_pair_rate_limit_state FROM PUBLIC;
REVOKE ALL ON TABLE
  public.whatsapp_portfolio_recipient_rate_limit_state FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_provider_cooldown_events FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_provider_cooldown_state FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.assert_bot_reply_staging_tenant_barrier_owned_v1(BIGINT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.assert_bot_reply_staging_exact_session_barrier_v1(TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_exact_permit_insert_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_exact_operation_insert_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_tenant_barrier_write_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_whatsapp_rate_evidence_tenant_barrier_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_whatsapp_portfolio_state_tenant_barrier_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.guard_bot_reply_staging_scope_admission_insert_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_message_occurred_at_mutation_v1()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reserve_and_bind_bot_reply_staging_service_reply_v1(
    TEXT, TEXT, TEXT, TEXT, TEXT
  )
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.write_bot_reply_staging_pre_send_admission_v1(TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.write_bot_reply_staging_provider_fact_v1(
    TEXT, TEXT, TEXT, INTEGER, INTEGER
  )
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.write_bot_reply_staging_provider_uncertainty_v1(TEXT, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_delivery_transition()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_provider_link_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_bot_reply_provider_acceptance()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_provider_deferral_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_window_rejection_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_bot_reply_provider_link_update()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_bot_reply_provider_status()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_provider_link_delete()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_provider_deferral_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_window_rejection_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_whatsapp_rate_limit_evidence_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_whatsapp_rate_settlement_state()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_pair_state_write()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_portfolio_state_write()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_whatsapp_portfolio_state_business_class()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_provider_cooldown_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_whatsapp_provider_cooldown_reservation_class()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_whatsapp_provider_cooldown_state()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.enforce_whatsapp_provider_cooldown_state_write()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_whatsapp_rate_limit_state_delete()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_rate_limit_throughput()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_reservation_category_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_whatsapp_rate_reservation_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_whatsapp_rate_reservation_state()
  FROM PUBLIC;

DO $d31d1e_postcondition$
DECLARE
  protected_function_count INTEGER;
  protected_trigger_count INTEGER;
  public_function_privilege_count INTEGER;
  public_relation_privilege_count INTEGER;
  uncertainty_reason_column_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.oid IN (
      pg_catalog.to_regprocedure(
        'public.assert_bot_reply_staging_tenant_barrier_owned_v1(bigint)'
      ),
      pg_catalog.to_regprocedure(
        'public.assert_bot_reply_staging_exact_session_barrier_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_bot_reply_staging_exact_permit_insert_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_bot_reply_staging_exact_operation_insert_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_bot_reply_staging_tenant_barrier_write_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_whatsapp_rate_evidence_tenant_barrier_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_whatsapp_portfolio_state_tenant_barrier_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_bot_reply_staging_scope_admission_insert_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_message_occurred_at_mutation_v1()'
      ),
      pg_catalog.to_regprocedure(
        'public.reserve_and_bind_bot_reply_staging_service_reply_v1(text,text,text,text,text)'
      ),
      pg_catalog.to_regprocedure(
        'public.write_bot_reply_staging_pre_send_admission_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.write_bot_reply_staging_provider_fact_v1(text,text,text,integer,integer)'
      ),
      pg_catalog.to_regprocedure(
        'public.write_bot_reply_staging_provider_uncertainty_v1(text,text)'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_bot_reply_delivery_transition()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_bot_reply_provider_link_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.project_bot_reply_provider_acceptance()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_bot_reply_provider_deferral_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_bot_reply_window_rejection_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.guard_bot_reply_provider_link_update()'
      ),
      pg_catalog.to_regprocedure(
        'public.project_bot_reply_provider_status()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_bot_reply_provider_link_delete()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_bot_reply_provider_deferral_mutation()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_bot_reply_window_rejection_mutation()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_whatsapp_rate_limit_evidence_mutation()'
      ),
      pg_catalog.to_regprocedure(
        'public.project_whatsapp_rate_settlement_state()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_pair_state_write()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_portfolio_state_write()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_portfolio_state_business_class()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_provider_cooldown_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_provider_cooldown_reservation_class()'
      ),
      pg_catalog.to_regprocedure(
        'public.project_whatsapp_provider_cooldown_state()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_provider_cooldown_state_write()'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_whatsapp_rate_limit_state_delete()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_rate_limit_throughput()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_reservation_category_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.enforce_whatsapp_rate_reservation_insert()'
      ),
      pg_catalog.to_regprocedure(
        'public.project_whatsapp_rate_reservation_state()'
      )
    )
    AND procedure.prosecdef = FALSE
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[];

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_trigger_count
  FROM pg_catalog.pg_trigger AS trigger_record
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger_record.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND NOT trigger_record.tgisinternal
    AND trigger_record.tgname IN (
      'messages_occurred_at_immutable_guard',
      'aa_meta_connections_tenant_barrier_guard',
      'aa_meta_credentials_tenant_barrier_guard',
      'aa_meta_credential_events_tenant_barrier_guard',
      'aa_staging_authorizations_tenant_barrier_guard',
      'aa_delivery_policy_tenant_barrier_guard',
      'aa_rate_reservation_tenant_barrier_guard',
      'aa_provider_links_tenant_barrier_guard',
      'aa_provider_deferrals_tenant_barrier_guard',
      'aa_window_rejections_tenant_barrier_guard',
      'aa_rate_settlements_tenant_barrier_guard',
      'aa_cooldown_events_tenant_barrier_guard',
      'aa_cooldown_state_tenant_barrier_guard',
      'aa_pair_state_tenant_barrier_guard',
      'aa_portfolio_state_tenant_barrier_guard',
      'aa_bot_reply_deliveries_tenant_barrier_guard',
      'aa_service_scope_tenant_barrier_guard',
      'bot_reply_staging_service_scope_mutation_guard',
      'bot_reply_staging_service_scope_truncate_guard',
      'aa_bot_reply_staging_admission_scope_guard',
      'aaa_bot_reply_staging_admission_barrier_guard',
      'aa_staging_boundary_claim_exact_session_guard',
      'aa_staging_request_binding_exact_session_guard',
      'aa_staging_uncertainty_exact_session_guard',
      'aa_staging_operation_exact_session_guard',
      'aa_staging_outcome_exact_session_guard',
      'bot_reply_provider_links_truncate_guard',
      'bot_reply_provider_deferrals_truncate_guard',
      'bot_reply_window_rejections_truncate_guard',
      'whatsapp_rate_reservations_truncate_guard',
      'whatsapp_rate_settlements_truncate_guard',
      'whatsapp_provider_cooldown_events_truncate_guard',
      'whatsapp_provider_cooldown_state_truncate_guard',
      'whatsapp_pair_state_truncate_guard',
      'whatsapp_portfolio_state_truncate_guard'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO public_function_privilege_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(procedure.proacl) AS privilege
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'assert_bot_reply_staging_tenant_barrier_owned_v1',
      'assert_bot_reply_staging_exact_session_barrier_v1',
      'guard_bot_reply_staging_exact_permit_insert_v1',
      'guard_bot_reply_staging_exact_operation_insert_v1',
      'guard_bot_reply_staging_tenant_barrier_write_v1',
      'guard_whatsapp_rate_evidence_tenant_barrier_v1',
      'guard_whatsapp_portfolio_state_tenant_barrier_v1',
      'guard_bot_reply_staging_scope_admission_insert_v1',
      'reject_message_occurred_at_mutation_v1',
      'reserve_and_bind_bot_reply_staging_service_reply_v1',
      'write_bot_reply_staging_pre_send_admission_v1',
      'write_bot_reply_staging_provider_fact_v1',
      'write_bot_reply_staging_provider_uncertainty_v1',
      'enforce_bot_reply_delivery_transition',
      'enforce_bot_reply_provider_link_insert',
      'project_bot_reply_provider_acceptance',
      'enforce_bot_reply_provider_deferral_insert',
      'enforce_bot_reply_window_rejection_insert',
      'guard_bot_reply_provider_link_update',
      'project_bot_reply_provider_status',
      'reject_bot_reply_provider_link_delete',
      'reject_bot_reply_provider_deferral_mutation',
      'reject_bot_reply_window_rejection_mutation',
      'reject_whatsapp_rate_limit_evidence_mutation',
      'project_whatsapp_rate_settlement_state',
      'enforce_whatsapp_pair_state_write',
      'enforce_whatsapp_portfolio_state_write',
      'enforce_whatsapp_portfolio_state_business_class',
      'enforce_whatsapp_provider_cooldown_insert',
      'enforce_whatsapp_provider_cooldown_reservation_class',
      'project_whatsapp_provider_cooldown_state',
      'enforce_whatsapp_provider_cooldown_state_write',
      'reject_whatsapp_rate_limit_state_delete',
      'enforce_whatsapp_rate_limit_throughput',
      'enforce_whatsapp_reservation_category_insert',
      'enforce_whatsapp_rate_reservation_insert',
      'project_whatsapp_rate_reservation_state'
    )
    AND privilege.grantee = 0;

  SELECT pg_catalog.count(*)::INTEGER
  INTO public_relation_privilege_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(relation.relacl) AS privilege
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_pre_send_admission_bindings',
      'bot_reply_staging_service_reply_scope_bindings',
      'bot_reply_staging_provider_uncertainty_events',
      'bot_reply_delivery_provider_links',
      'bot_reply_provider_deferral_events',
      'bot_reply_service_window_rejection_events',
      'whatsapp_rate_limit_reservations',
      'whatsapp_rate_limit_settlements',
      'whatsapp_pair_rate_limit_state',
      'whatsapp_portfolio_recipient_rate_limit_state',
      'whatsapp_provider_cooldown_events',
      'whatsapp_provider_cooldown_state'
    )
    AND privilege.grantee = 0;

  SELECT pg_catalog.count(*)::INTEGER
  INTO uncertainty_reason_column_count
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid =
      'public.bot_reply_staging_provider_uncertainty_events'::pg_catalog.regclass
    AND attribute.attname = 'source_reason'
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF protected_function_count <> 37
    OR protected_trigger_count <> 35
    OR public_function_privilege_count <> 0
    OR public_relation_privilege_count <> 0
    OR uncertainty_reason_column_count <> 1
  THEN
    RAISE EXCEPTION
      'Migration 0057 postcondition failed: functions %, triggers %, public function privileges %, public relation privileges %, uncertainty reason columns %',
      protected_function_count,
      protected_trigger_count,
      public_function_privilege_count,
      public_relation_privilege_count,
      uncertainty_reason_column_count;
  END IF;
END;
$d31d1e_postcondition$;

-- Activation remains false. No function above is granted to a Runtime role;
-- no provider transport imports it. Live role provisioning, wrapper-only ACL
-- evidence, pinned-session provider tests and staging proof remain mandatory.
