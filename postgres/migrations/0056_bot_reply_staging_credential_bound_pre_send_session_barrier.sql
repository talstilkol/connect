-- D31-D1d-B-B2a2 dormant session barrier and one-shot consumption fence.
--
-- This migration performs no runtime activation. A permit key is the only
-- caller input. Tenant, credential, admission, delivery, reservation, provider
-- request, and advisory-lock identities are always recovered from immutable
-- database evidence. A TypeScript driver must still pin one physical client,
-- wait for an unambiguous COMMIT acknowledgement before crossing the provider
-- boundary, and release the session lock on that same client. D1e must make all
-- relevant writers participate in the same DB-derived tenant barrier. This
-- contract remains without a Runtime importer until those reviews complete.

DO $d31d1d_b2a2_precondition$
DECLARE
  existing_relation_count INTEGER;
  existing_function_count INTEGER;
  prerequisite_relation_count INTEGER;
  prerequisite_function_count INTEGER;
  prerequisite_constraint_count INTEGER;
  unsafe_default_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_credential_provider_request_bindings',
      'bot_reply_staging_provider_uncertainty_events',
      'bot_reply_staging_provider_boundary_claims'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'derive_bot_reply_staging_tenant_barrier_key_v1',
      'derive_bot_reply_staging_reconciliation_marker_key_v1',
      'acquire_bot_reply_staging_pre_send_session_barrier_v1',
      'prove_bot_reply_staging_pre_send_session_barrier_v1',
      'release_bot_reply_staging_pre_send_session_barrier_v1',
      'consume_bot_reply_staging_credential_bound_pre_send_permit_v1',
      'finalize_bot_reply_staging_credential_bound_pre_send_permit_v1',
      'reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO prerequisite_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind = 'r'
    AND relation.relname IN (
      'bot_reply_staging_credential_bound_pre_send_permits',
      'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
      'bot_reply_staging_credential_bound_pre_send_permit_resolutions',
      'bot_reply_staging_provider_operations',
      'bot_reply_staging_provider_operation_outcomes',
      'bot_reply_provider_request_claims'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO prerequisite_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.oid IN (
      pg_catalog.to_regprocedure(
        'public.derive_bot_reply_staging_pre_send_permit_key_v1(bigint,text,bigint,text,text,text,text,text,text,integer,integer,text,text,text,integer,text,timestamptz,timestamptz,timestamptz,timestamptz)'
      ),
      pg_catalog.to_regprocedure(
        'public.finalize_bot_reply_staging_provider_operation_v1(text,bigint,text,text,text,text,text,integer,timestamptz,text,text,text,integer,text)'
      ),
      pg_catalog.to_regprocedure(
        'public.reject_bot_reply_staging_pre_send_ledger_mutation()'
      )
    )
    AND procedure.prosecdef = false
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[];

  SELECT pg_catalog.count(*)::INTEGER
  INTO prerequisite_constraint_count
  FROM pg_catalog.pg_constraint AS constraint_record
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = constraint_record.conrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND (
      (
        relation.relname =
          'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
        AND constraint_record.conname =
          'bot_reply_staging_pre_send_resolutions_outcome_valid'
        AND constraint_record.contype = 'c'
      )
      OR (
        relation.relname = 'bot_reply_provider_request_claims'
        AND constraint_record.conname =
          'bot_reply_provider_requests_pre_send_identity_uq'
        AND constraint_record.contype = 'u'
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

  IF existing_relation_count <> 0
    OR existing_function_count <> 0
    OR prerequisite_relation_count <> 6
    OR prerequisite_function_count <> 3
    OR prerequisite_constraint_count <> 2
    OR unsafe_default_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-B-B2a2 precondition failed: relations %, functions %, prerequisite relations %, prerequisite functions %, prerequisite constraints %, unsafe default ACLs %',
      existing_relation_count,
      existing_function_count,
      prerequisite_relation_count,
      prerequisite_function_count,
      prerequisite_constraint_count,
      unsafe_default_acl_count;
  END IF;
END;
$d31d1d_b2a2_precondition$;

-- Rate-limit subjects are derived from Meta assets rather than tenant IDs.
-- WABA and phone-number ownership were already globally unique in 0010. The
-- portfolio must be exclusive as well so two tenants cannot race on a missing
-- global portfolio-recipient cooldown row while holding different tenant
-- barriers. A conflicting existing assignment intentionally blocks migration.
DO $d31d1d_b2a2_meta_asset_preflight$
DECLARE
  invalid_asset_count INTEGER;
  shared_portfolio_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO invalid_asset_count
  FROM public.meta_connections AS connection_record
  WHERE connection_record.business_portfolio_id
      OPERATOR(pg_catalog.!~) '^[1-9][0-9]{0,63}$'
    OR connection_record.waba_id
      OPERATOR(pg_catalog.!~) '^[1-9][0-9]{0,63}$'
    OR connection_record.phone_number_id
      OPERATOR(pg_catalog.!~) '^[1-9][0-9]{0,63}$';

  SELECT pg_catalog.count(*)::INTEGER
  INTO shared_portfolio_count
  FROM (
    SELECT connection_record.business_portfolio_id
    FROM public.meta_connections AS connection_record
    GROUP BY connection_record.business_portfolio_id
    HAVING pg_catalog.count(*) > 1
  ) AS shared_portfolio;

  IF invalid_asset_count <> 0 OR shared_portfolio_count <> 0 THEN
    RAISE EXCEPTION
      'Migration 0056 Meta asset preflight failed: invalid assets %, shared portfolios %',
      invalid_asset_count,
      shared_portfolio_count;
  END IF;
END;
$d31d1d_b2a2_meta_asset_preflight$;

ALTER TABLE public.meta_connections
  ADD CONSTRAINT meta_connections_business_portfolio_uq
  UNIQUE (business_portfolio_id);

ALTER TABLE public.meta_connections
  ADD CONSTRAINT meta_connections_business_portfolio_id_canonical
  CHECK (
    business_portfolio_id
      OPERATOR(pg_catalog.~) '^[1-9][0-9]{0,63}$'
  ),
  ADD CONSTRAINT meta_connections_waba_id_canonical
  CHECK (waba_id OPERATOR(pg_catalog.~) '^[1-9][0-9]{0,63}$'),
  ADD CONSTRAINT meta_connections_phone_number_id_canonical
  CHECK (
    phone_number_id OPERATOR(pg_catalog.~) '^[1-9][0-9]{0,63}$'
  );

-- These exact identities make one committed preparation auditable without
-- storing a payload, recipient address, access token, or provider identifier.
ALTER TABLE
  public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
  ADD CONSTRAINT bot_reply_staging_consumptions_request_binding_uq
  UNIQUE (
    consumption_key,
    permit_key,
    tenant_id,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    provider_request_key,
    operation_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    consumed_at
  );

ALTER TABLE public.bot_reply_staging_provider_operations
  ADD CONSTRAINT bot_reply_staging_provider_ops_credential_exact_uq
  UNIQUE (
    operation_key,
    run_key,
    tenant_id,
    run_claim_version,
    operation_kind,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    provider_request_key,
    requested_at
  );

ALTER TABLE public.bot_reply_provider_request_claims
  ADD CONSTRAINT bot_reply_provider_requests_prepared_exact_uq
  UNIQUE (
    request_key,
    delivery_key,
    tenant_id,
    claim_version,
    reservation_key,
    requested_at
  );

ALTER TABLE
  public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
  DROP CONSTRAINT bot_reply_staging_pre_send_resolutions_outcome_valid;

ALTER TABLE
  public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
  ADD CONSTRAINT bot_reply_staging_pre_send_resolutions_outcome_valid
  CHECK (
    (
      outcome = 'released'
      AND reason_code = 'CAPABILITY_RELEASED'
      AND provider_request_key IS NOT NULL
    )
    OR (
      outcome = 'denied'
      AND reason_code IN (
        'PERMIT_EXPIRED',
        'CREDENTIAL_CHANGED',
        'AUTHORIZATION_STALE',
        'CONNECTION_CHANGED',
        'POLICY_DISABLED',
        'RUN_STALE',
        'DELIVERY_STALE',
        'RESERVATION_STALE',
        'SERVICE_WINDOW_CLOSED',
        'PROVIDER_COOLDOWN_ACTIVE',
        'OPERATION_KIND_NOT_RELEASABLE',
        'OPERATION_ALREADY_FENCED'
      )
      AND provider_request_key IS NULL
    )
  );

CREATE TABLE public.bot_reply_staging_credential_provider_request_bindings (
  binding_key TEXT NOT NULL PRIMARY KEY,
  permit_key TEXT NOT NULL UNIQUE,
  consumption_key TEXT NOT NULL UNIQUE,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  operation_kind TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL UNIQUE,
  provider_request_key TEXT NOT NULL UNIQUE,
  bound_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_request_bindings_permit_fk
    FOREIGN KEY (
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key
    )
    REFERENCES public.bot_reply_staging_credential_bound_pre_send_permits (
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_request_bindings_consumption_fk
    FOREIGN KEY (
      consumption_key,
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      provider_request_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key,
      bound_at
    )
    REFERENCES
      public.bot_reply_staging_credential_bound_pre_send_permit_consumptions (
      consumption_key,
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      provider_request_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key,
      consumed_at
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_request_bindings_operation_fk
    FOREIGN KEY (
      operation_key,
      run_key,
      tenant_id,
      run_claim_version,
      operation_kind,
      delivery_key,
      delivery_claim_version,
      reservation_key,
      provider_request_key,
      bound_at
    )
    REFERENCES public.bot_reply_staging_provider_operations (
      operation_key,
      run_key,
      tenant_id,
      run_claim_version,
      operation_kind,
      delivery_key,
      delivery_claim_version,
      reservation_key,
      provider_request_key,
      requested_at
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_request_bindings_request_fk
    FOREIGN KEY (
      provider_request_key,
      delivery_key,
      tenant_id,
      delivery_claim_version,
      reservation_key,
      bound_at
    )
    REFERENCES public.bot_reply_provider_request_claims (
      request_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      requested_at
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_request_bindings_keys_valid
    CHECK (
      binding_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_request_binding_v1_[a-f0-9]{64}$'
      AND permit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
      AND consumption_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_permit_consumption_v1_[a-f0-9]{64}$'
      AND run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
      AND credential_envelope_digest OPERATOR(pg_catalog.~)
        '^sha256:[a-f0-9]{64}$'
      AND credential_event_key OPERATOR(pg_catalog.~)
        '^meta_credential_revision_v1_[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
      AND provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_request_bindings_values_valid
    CHECK (
      run_claim_version >= 1
      AND credential_revision >= 1
      AND delivery_claim_version >= 1
      AND operation_kind IN ('text-send', 'button-send')
      AND bound_at = pg_catalog.date_trunc('milliseconds', bound_at)
      AND created_at = bound_at
    )
);

CREATE TRIGGER bot_reply_staging_request_bindings_mutation_guard
BEFORE UPDATE OR DELETE ON public.bot_reply_staging_credential_provider_request_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_request_bindings_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_staging_credential_provider_request_bindings
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

ALTER TABLE
  public.bot_reply_staging_credential_provider_request_bindings
  ADD CONSTRAINT bot_reply_staging_request_bindings_uncertainty_exact_uq
  UNIQUE (
    permit_key,
    operation_key,
    run_key,
    tenant_id,
    delivery_key,
    reservation_key,
    provider_request_key,
    bound_at
  );

-- Timeout and ambiguous transport observations are audit evidence, not a
-- provider verdict. This append-only ledger keeps the first exact observation
-- of each kind without terminalizing the operation or blocking a late trusted
-- provider fact.
CREATE TABLE public.bot_reply_staging_provider_uncertainty_events (
  event_key TEXT NOT NULL PRIMARY KEY,
  permit_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  delivery_key TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_request_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  uncertainty_kind TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_uncertainty_binding_fk
    FOREIGN KEY (
      permit_key,
      operation_key,
      run_key,
      tenant_id,
      delivery_key,
      reservation_key,
      provider_request_key,
      requested_at
    )
    REFERENCES
      public.bot_reply_staging_credential_provider_request_bindings (
        permit_key,
        operation_key,
        run_key,
        tenant_id,
        delivery_key,
        reservation_key,
        provider_request_key,
        bound_at
      )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_uncertainty_keys_valid
    CHECK (
      event_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_uncertainty_v1_[a-f0-9]{64}$'
      AND permit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
      AND provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_uncertainty_values_valid
    CHECK (
      uncertainty_kind IN (
        'provider-response-ambiguous',
        'lease-expired-without-outcome'
      )
      AND requested_at =
        pg_catalog.date_trunc('milliseconds', requested_at)
      AND detected_at = pg_catalog.date_trunc('milliseconds', detected_at)
      AND created_at = detected_at
      AND detected_at >= requested_at
    ),
  CONSTRAINT bot_reply_staging_uncertainty_operation_kind_uq
    UNIQUE (operation_key, uncertainty_kind)
);

CREATE TRIGGER bot_reply_staging_uncertainty_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_provider_uncertainty_events
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_uncertainty_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_staging_provider_uncertainty_events
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

-- Proof is a one-shot durable boundary claim. B2b may call Meta only after the
-- INSERT itself has an unambiguous commit acknowledgement. A repeated proof,
-- including on the same pinned session, cannot mint another send capability.
CREATE TABLE public.bot_reply_staging_provider_boundary_claims (
  claim_key TEXT NOT NULL PRIMARY KEY,
  permit_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  delivery_key TEXT NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_request_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  backend_pid INTEGER NOT NULL,
  proved_at TIMESTAMPTZ NOT NULL,
  send_before TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_boundary_claims_binding_fk
    FOREIGN KEY (
      permit_key,
      operation_key,
      run_key,
      tenant_id,
      delivery_key,
      reservation_key,
      provider_request_key,
      requested_at
    )
    REFERENCES
      public.bot_reply_staging_credential_provider_request_bindings (
        permit_key,
        operation_key,
        run_key,
        tenant_id,
        delivery_key,
        reservation_key,
        provider_request_key,
        bound_at
      )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_boundary_claims_keys_valid
    CHECK (
      claim_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_boundary_claim_v1_[a-f0-9]{64}$'
      AND permit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
      AND provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_boundary_claims_values_valid
    CHECK (
      backend_pid > 0
      AND requested_at =
        pg_catalog.date_trunc('milliseconds', requested_at)
      AND proved_at = pg_catalog.date_trunc('milliseconds', proved_at)
      AND send_before = pg_catalog.date_trunc('milliseconds', send_before)
      AND created_at = proved_at
      AND requested_at <= proved_at
      AND proved_at < send_before
    ),
  CONSTRAINT bot_reply_staging_boundary_claims_permit_uq
    UNIQUE (permit_key),
  CONSTRAINT bot_reply_staging_boundary_claims_operation_uq
    UNIQUE (operation_key),
  CONSTRAINT bot_reply_staging_boundary_claims_request_uq
    UNIQUE (provider_request_key)
);

CREATE TRIGGER bot_reply_staging_boundary_claims_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_provider_boundary_claims
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_boundary_claims_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_staging_provider_boundary_claims
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE FUNCTION public.derive_bot_reply_staging_tenant_barrier_key_v1(
  persisted_tenant_id BIGINT
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
SELECT pg_catalog.hashtextextended(
  'connect-bot-reply-tenant-barrier-v1:' ||
    persisted_tenant_id::pg_catalog.TEXT,
  0
)
$$;

CREATE FUNCTION
  public.derive_bot_reply_staging_reconciliation_marker_key_v1(
  persisted_tenant_id BIGINT,
  persisted_permit_key TEXT
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
SELECT pg_catalog.hashtextextended(
  'connect-bot-reply-reconciliation-marker-v1:' ||
    persisted_tenant_id::pg_catalog.TEXT || ':' || persisted_permit_key,
  0
)
$$;

CREATE FUNCTION public.acquire_bot_reply_staging_pre_send_session_barrier_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (outcome TEXT)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  persisted_tenant_id BIGINT;
  recomputed_permit_key TEXT;
  barrier_key BIGINT;
  reconciliation_marker_key BIGINT;
  current_advisory_lock_count INTEGER;
  unresolved_operation_count INTEGER;
  requested_unresolved_operation_count INTEGER;
  acquired BOOLEAN;
  reconciliation_marker_acquired BOOLEAN := false;
  released BOOLEAN;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session barrier input is invalid';
  END IF;

  SELECT persisted_permit.*
  INTO permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits
    AS persisted_permit
  WHERE persisted_permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session barrier lacks permit';
  END IF;

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      permit.tenant_id,
      permit.run_binding_key,
      permit.credential_revision,
      permit.credential_envelope_digest,
      permit.credential_event_key,
      permit.admission_binding_key,
      permit.policy_event_key,
      permit.sender_key,
      permit.recipient_key,
      permit.phone_throughput_messages_per_second,
      permit.maximum_outbound_messages_per_second,
      permit.operation_key,
      permit.operation_kind,
      permit.delivery_key,
      permit.delivery_claim_version,
      permit.reservation_key,
      permit.reservation_reserved_at,
      permit.pair_reserved_until,
      permit.reservation_expires_at,
      permit.reserved_at
    );

  IF permit.permit_key <> recomputed_permit_key THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session barrier permit conflicts';
  END IF;

  persisted_tenant_id := permit.tenant_id;
  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    persisted_tenant_id
  );
  reconciliation_marker_key :=
    public.derive_bot_reply_staging_reconciliation_marker_key_v1(
      persisted_tenant_id,
      permit.permit_key
    );

  IF reconciliation_marker_key = barrier_key THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send reconciliation marker conflicts';
  END IF;

  SELECT pg_catalog.count(*)::INTEGER
  INTO current_advisory_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.pid = pg_catalog.pg_backend_pid()
    AND lock.locktype = 'advisory'
    AND lock.granted;

  IF current_advisory_lock_count > 0 THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session barrier client is contaminated';
  END IF;

  acquired := pg_catalog.pg_try_advisory_lock(barrier_key);
  IF NOT acquired THEN
    RETURN QUERY SELECT 'busy'::TEXT;
    RETURN;
  END IF;

  -- A session lock is not crash-durable. After a worker disconnects, a new
  -- permit must not cross Meta while an earlier provider operation for this
  -- tenant still lacks an authoritative completed outcome. The exact old
  -- permit may reacquire only for reconciliation; a different permit is
  -- blocked and this function releases the lock before returning.
  BEGIN
    SELECT pg_catalog.count(*)::INTEGER,
      pg_catalog.count(*) FILTER (
        WHERE request_binding.permit_key = requested_permit_key
          AND released_resolution.resolution_key IS NOT NULL
      )::INTEGER
    INTO unresolved_operation_count, requested_unresolved_operation_count
    FROM public.bot_reply_staging_provider_operations AS operation
    INNER JOIN public.whatsapp_rate_limit_reservations
      AS unresolved_reservation
      ON unresolved_reservation.reservation_key = operation.reservation_key
     AND unresolved_reservation.tenant_id = operation.tenant_id
    LEFT JOIN
      public.bot_reply_staging_credential_provider_request_bindings
        AS request_binding
      ON request_binding.operation_key = operation.operation_key
     AND request_binding.tenant_id = operation.tenant_id
     AND request_binding.provider_request_key =
       operation.provider_request_key
    LEFT JOIN public.bot_reply_staging_provider_operation_outcomes
      AS provider_outcome
      ON provider_outcome.operation_key = operation.operation_key
     AND provider_outcome.tenant_id = operation.tenant_id
     AND provider_outcome.provider_request_key =
       operation.provider_request_key
    LEFT JOIN
      public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
        AS released_resolution
      ON released_resolution.permit_key = request_binding.permit_key
     AND released_resolution.tenant_id = request_binding.tenant_id
     AND released_resolution.credential_revision =
       request_binding.credential_revision
     AND released_resolution.credential_envelope_digest =
       request_binding.credential_envelope_digest
     AND released_resolution.credential_event_key =
       request_binding.credential_event_key
     AND released_resolution.operation_key =
       request_binding.operation_key
     AND released_resolution.delivery_key = request_binding.delivery_key
     AND released_resolution.delivery_claim_version =
       request_binding.delivery_claim_version
     AND released_resolution.reservation_key =
       request_binding.reservation_key
     AND released_resolution.provider_request_key =
       request_binding.provider_request_key
     AND released_resolution.resolved_at = request_binding.bound_at
     AND released_resolution.outcome = 'released'
     AND released_resolution.reason_code = 'CAPABILITY_RELEASED'
    WHERE (
        operation.tenant_id = persisted_tenant_id
        OR unresolved_reservation.sender_key = permit.sender_key
        OR unresolved_reservation.recipient_key = permit.recipient_key
      )
      AND (
        provider_outcome.operation_key IS NULL
        OR provider_outcome.state <> 'completed'
      );

    IF unresolved_operation_count = 0 THEN
      RETURN QUERY SELECT 'acquired'::TEXT;
      RETURN;
    END IF;

    IF unresolved_operation_count = 1
      AND requested_unresolved_operation_count = 1
    THEN
      reconciliation_marker_acquired :=
        pg_catalog.pg_try_advisory_lock(reconciliation_marker_key);

      IF NOT reconciliation_marker_acquired THEN
        released := pg_catalog.pg_advisory_unlock(barrier_key);

        SELECT pg_catalog.count(*)::INTEGER
        INTO current_advisory_lock_count
        FROM pg_catalog.pg_locks AS lock
        WHERE lock.pid = pg_catalog.pg_backend_pid()
          AND lock.locktype = 'advisory'
          AND lock.granted;

        IF NOT released OR current_advisory_lock_count <> 0 THEN
          RAISE EXCEPTION
            'Bot reply staging pre-send reconciliation barrier leaked';
        END IF;

        RETURN QUERY SELECT 'busy'::TEXT;
        RETURN;
      END IF;

      RETURN QUERY SELECT 'reconciliation-required'::TEXT;
      RETURN;
    END IF;

    released := pg_catalog.pg_advisory_unlock(barrier_key);

    SELECT pg_catalog.count(*)::INTEGER
    INTO current_advisory_lock_count
    FROM pg_catalog.pg_locks AS lock
    WHERE lock.pid = pg_catalog.pg_backend_pid()
      AND lock.locktype = 'advisory'
      AND lock.granted;

    IF NOT released OR current_advisory_lock_count <> 0 THEN
      RAISE EXCEPTION
        'Bot reply staging pre-send unresolved-operation barrier leaked';
    END IF;

    RETURN QUERY SELECT 'blocked-unresolved'::TEXT;
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    IF reconciliation_marker_acquired THEN
      PERFORM pg_catalog.pg_advisory_unlock(reconciliation_marker_key);
    END IF;
    PERFORM pg_catalog.pg_advisory_unlock(barrier_key);
    RAISE;
  END;
END;
$$;

-- B2b calls this permit-key-only proof after an unambiguous COMMIT and
-- ReadyForQuery on the same physical client. A transaction-scoped hold cannot
-- survive to this one-shot claim statement. The driver must wait for the claim
-- INSERT's unambiguous commit acknowledgement and compare the pinned client's
-- backend PID captured before acquisition. This function never releases or
-- reacquires the barrier immediately before the provider boundary.
CREATE FUNCTION public.prove_bot_reply_staging_pre_send_session_barrier_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "backendPid" INTEGER,
  "sendBefore" TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  stored_resolution
    public.bot_reply_staging_credential_bound_pre_send_permit_resolutions%ROWTYPE;
  stored_consumption
    public.bot_reply_staging_credential_bound_pre_send_permit_consumptions%ROWTYPE;
  stored_binding
    public.bot_reply_staging_credential_provider_request_bindings%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_outcome
    public.bot_reply_staging_provider_operation_outcomes%ROWTYPE;
  stored_request public.bot_reply_provider_request_claims%ROWTYPE;
  stored_boundary_claim
    public.bot_reply_staging_provider_boundary_claims%ROWTYPE;
  recomputed_permit_key TEXT;
  boundary_claim_key TEXT;
  barrier_key BIGINT;
  current_advisory_lock_count INTEGER;
  matching_barrier_lock_count INTEGER;
  database_now TIMESTAMPTZ;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof input is invalid';
  END IF;

  SELECT persisted_permit.*
  INTO stored_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits
    AS persisted_permit
  WHERE persisted_permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof lacks permit';
  END IF;

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      stored_permit.tenant_id,
      stored_permit.run_binding_key,
      stored_permit.credential_revision,
      stored_permit.credential_envelope_digest,
      stored_permit.credential_event_key,
      stored_permit.admission_binding_key,
      stored_permit.policy_event_key,
      stored_permit.sender_key,
      stored_permit.recipient_key,
      stored_permit.phone_throughput_messages_per_second,
      stored_permit.maximum_outbound_messages_per_second,
      stored_permit.operation_key,
      stored_permit.operation_kind,
      stored_permit.delivery_key,
      stored_permit.delivery_claim_version,
      stored_permit.reservation_key,
      stored_permit.reservation_reserved_at,
      stored_permit.pair_reserved_until,
      stored_permit.reservation_expires_at,
      stored_permit.reserved_at
    );

  IF stored_permit.permit_key <> recomputed_permit_key THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof permit conflicts';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    stored_permit.tenant_id
  );

  SELECT pg_catalog.count(*)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((barrier_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (barrier_key & 4294967295::BIGINT)
    )::INTEGER
  INTO current_advisory_lock_count, matching_barrier_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.pid = pg_catalog.pg_backend_pid()
    AND lock.locktype = 'advisory'
    AND lock.granted;

  IF current_advisory_lock_count <> 1
    OR matching_barrier_lock_count <> 1
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof lacks exact barrier';
  END IF;

  SELECT resolution.*
  INTO stored_resolution
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
    AS resolution
  WHERE resolution.permit_key = stored_permit.permit_key
    AND resolution.tenant_id = stored_permit.tenant_id;

  SELECT consumption.*
  INTO stored_consumption
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
    AS consumption
  WHERE consumption.permit_key = stored_permit.permit_key
    AND consumption.tenant_id = stored_permit.tenant_id;

  SELECT request_binding.*
  INTO stored_binding
  FROM public.bot_reply_staging_credential_provider_request_bindings
    AS request_binding
  WHERE request_binding.permit_key = stored_permit.permit_key
    AND request_binding.tenant_id = stored_permit.tenant_id;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = stored_permit.operation_key
    AND operation.tenant_id = stored_permit.tenant_id;

  SELECT request.*
  INTO stored_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.request_key = stored_resolution.provider_request_key
    AND request.tenant_id = stored_permit.tenant_id;

  SELECT provider_outcome.*
  INTO stored_outcome
  FROM public.bot_reply_staging_provider_operation_outcomes
    AS provider_outcome
  WHERE provider_outcome.operation_key = stored_permit.operation_key
    AND provider_outcome.tenant_id = stored_permit.tenant_id
    AND provider_outcome.provider_request_key =
      stored_operation.provider_request_key;

  IF stored_outcome.operation_key IS NOT NULL THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof follows terminal outcome';
  END IF;

  IF stored_resolution.resolution_key IS NULL
    OR stored_resolution.outcome <> 'released'
    OR stored_resolution.reason_code <> 'CAPABILITY_RELEASED'
    OR stored_resolution.permit_key <> stored_permit.permit_key
    OR stored_resolution.tenant_id <> stored_permit.tenant_id
    OR stored_resolution.credential_revision <>
      stored_permit.credential_revision
    OR stored_resolution.credential_envelope_digest <>
      stored_permit.credential_envelope_digest
    OR stored_resolution.credential_event_key <>
      stored_permit.credential_event_key
    OR stored_resolution.operation_key <> stored_permit.operation_key
    OR stored_resolution.delivery_key <> stored_permit.delivery_key
    OR stored_resolution.delivery_claim_version <>
      stored_permit.delivery_claim_version
    OR stored_resolution.reservation_key <> stored_permit.reservation_key
    OR stored_consumption.consumption_key IS NULL
    OR stored_consumption.permit_key <> stored_permit.permit_key
    OR stored_consumption.tenant_id <> stored_permit.tenant_id
    OR stored_consumption.credential_revision <>
      stored_permit.credential_revision
    OR stored_consumption.credential_envelope_digest <>
      stored_permit.credential_envelope_digest
    OR stored_consumption.credential_event_key <>
      stored_permit.credential_event_key
    OR stored_consumption.operation_key <> stored_permit.operation_key
    OR stored_consumption.delivery_key <> stored_permit.delivery_key
    OR stored_consumption.delivery_claim_version <>
      stored_permit.delivery_claim_version
    OR stored_consumption.reservation_key <> stored_permit.reservation_key
    OR stored_binding.binding_key IS NULL
    OR stored_binding.permit_key <> stored_permit.permit_key
    OR stored_binding.consumption_key <> stored_consumption.consumption_key
    OR stored_binding.run_key <> stored_permit.run_key
    OR stored_binding.tenant_id <> stored_permit.tenant_id
    OR stored_binding.run_claim_version <> stored_permit.run_claim_version
    OR stored_binding.credential_revision <> stored_permit.credential_revision
    OR stored_binding.credential_envelope_digest <>
      stored_permit.credential_envelope_digest
    OR stored_binding.credential_event_key <>
      stored_permit.credential_event_key
    OR stored_binding.operation_key <> stored_permit.operation_key
    OR stored_binding.operation_kind <> stored_permit.operation_kind
    OR stored_binding.delivery_key <> stored_permit.delivery_key
    OR stored_binding.delivery_claim_version <>
      stored_permit.delivery_claim_version
    OR stored_binding.reservation_key <> stored_permit.reservation_key
    OR stored_operation.operation_key IS NULL
    OR stored_operation.run_key <> stored_permit.run_key
    OR stored_operation.tenant_id <> stored_permit.tenant_id
    OR stored_operation.request_digest <> stored_permit.request_digest
    OR stored_operation.audit_key <> stored_permit.audit_key
    OR stored_operation.release_id <> stored_permit.release_id
    OR stored_operation.commit_sha <> stored_permit.commit_sha
    OR stored_operation.artifact_digest <> stored_permit.artifact_digest
    OR stored_operation.run_claim_version <> stored_permit.run_claim_version
    OR stored_operation.run_lease_expires_at <>
      stored_permit.run_lease_expires_at
    OR stored_operation.operation_kind <> stored_permit.operation_kind
    OR stored_operation.operation_kind NOT IN ('text-send', 'button-send')
    OR stored_operation.delivery_key <> stored_permit.delivery_key
    OR stored_operation.delivery_claim_version <>
      stored_permit.delivery_claim_version
    OR stored_operation.reservation_key <> stored_permit.reservation_key
    OR stored_request.request_key IS NULL
    OR stored_request.delivery_key <> stored_permit.delivery_key
    OR stored_request.tenant_id <> stored_permit.tenant_id
    OR stored_request.claim_version <> stored_permit.delivery_claim_version
    OR stored_request.reservation_key <> stored_permit.reservation_key
    OR stored_resolution.provider_request_key <>
      stored_consumption.provider_request_key
    OR stored_consumption.provider_request_key <>
      stored_binding.provider_request_key
    OR stored_binding.provider_request_key <>
      stored_operation.provider_request_key
    OR stored_operation.provider_request_key <> stored_request.request_key
    OR stored_resolution.resolved_at <> stored_consumption.consumed_at
    OR stored_consumption.consumed_at <> stored_binding.bound_at
    OR stored_binding.bound_at <> stored_operation.requested_at
    OR stored_operation.requested_at <> stored_request.requested_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof lacks committed released chain';
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  IF stored_permit.reserved_at > database_now
    OR database_now + INTERVAL '15 seconds' >=
      stored_permit.permit_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session proof permit margin expired';
  END IF;

  boundary_claim_key :=
    'bot_reply_staging_boundary_claim_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-provider-boundary-claim-v1',
          'UTF8'
        ) || pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(stored_permit.permit_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(stored_operation.operation_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          stored_operation.provider_request_key,
          'UTF8'
        )
      ),
      'hex'
    );

  INSERT INTO public.bot_reply_staging_provider_boundary_claims (
    claim_key,
    permit_key,
    operation_key,
    run_key,
    tenant_id,
    delivery_key,
    reservation_key,
    provider_request_key,
    requested_at,
    backend_pid,
    proved_at,
    send_before,
    created_at
  ) VALUES (
    boundary_claim_key,
    stored_permit.permit_key,
    stored_operation.operation_key,
    stored_operation.run_key,
    stored_operation.tenant_id,
    stored_operation.delivery_key,
    stored_operation.reservation_key,
    stored_operation.provider_request_key,
    stored_operation.requested_at,
    pg_catalog.pg_backend_pid(),
    database_now,
    stored_permit.permit_expires_at - INTERVAL '15 seconds',
    database_now
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO stored_boundary_claim;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send provider boundary proof already consumed';
  END IF;

  RETURN QUERY SELECT
    'held'::TEXT,
    stored_boundary_claim.backend_pid,
    stored_boundary_claim.send_before;
END;
$$;

CREATE FUNCTION public.release_bot_reply_staging_pre_send_session_barrier_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "releasedCount" INTEGER
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  recomputed_permit_key TEXT;
  barrier_key BIGINT;
  reconciliation_marker_key BIGINT;
  current_advisory_lock_count INTEGER;
  matching_barrier_lock_count INTEGER;
  matching_reconciliation_marker_lock_count INTEGER;
  expected_lock_shape BOOLEAN := false;
  barrier_unlocked BOOLEAN := false;
  reconciliation_marker_unlocked BOOLEAN := false;
  released_count INTEGER := 0;
  remaining_lock_count INTEGER;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session release input is invalid';
  END IF;

  SELECT permit.*
  INTO stored_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session release lacks permit';
  END IF;

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      stored_permit.tenant_id,
      stored_permit.run_binding_key,
      stored_permit.credential_revision,
      stored_permit.credential_envelope_digest,
      stored_permit.credential_event_key,
      stored_permit.admission_binding_key,
      stored_permit.policy_event_key,
      stored_permit.sender_key,
      stored_permit.recipient_key,
      stored_permit.phone_throughput_messages_per_second,
      stored_permit.maximum_outbound_messages_per_second,
      stored_permit.operation_key,
      stored_permit.operation_kind,
      stored_permit.delivery_key,
      stored_permit.delivery_claim_version,
      stored_permit.reservation_key,
      stored_permit.reservation_reserved_at,
      stored_permit.pair_reserved_until,
      stored_permit.reservation_expires_at,
      stored_permit.reserved_at
    );

  IF stored_permit.permit_key <> recomputed_permit_key THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send session release permit conflicts';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    stored_permit.tenant_id
  );
  reconciliation_marker_key :=
    public.derive_bot_reply_staging_reconciliation_marker_key_v1(
      stored_permit.tenant_id,
      stored_permit.permit_key
    );

  IF reconciliation_marker_key = barrier_key THEN
    RAISE EXCEPTION
      'Bot reply staging pre-send reconciliation marker conflicts';
  END IF;

  SELECT pg_catalog.count(*)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((barrier_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (barrier_key & 4294967295::BIGINT)
    )::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
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

  IF current_advisory_lock_count = 0 THEN
    RETURN QUERY SELECT 'not-held'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  expected_lock_shape :=
    (
      current_advisory_lock_count = 1
      AND matching_barrier_lock_count = 1
      AND matching_reconciliation_marker_lock_count = 0
    )
    OR (
      current_advisory_lock_count = 2
      AND matching_barrier_lock_count = 1
      AND matching_reconciliation_marker_lock_count = 1
    );

  -- A reconciliation marker is released before its tenant barrier. Exactly
  -- one unlock per visible key is attempted; a reentrant or transaction-level
  -- hold remains visible and is reported as a leak instead of being drained.
  IF matching_reconciliation_marker_lock_count = 1 THEN
    reconciliation_marker_unlocked :=
      pg_catalog.pg_advisory_unlock(reconciliation_marker_key);
  END IF;

  IF matching_barrier_lock_count = 1 THEN
    barrier_unlocked := pg_catalog.pg_advisory_unlock(barrier_key);
  END IF;

  released_count :=
    CASE WHEN reconciliation_marker_unlocked THEN 1 ELSE 0 END +
    CASE WHEN barrier_unlocked THEN 1 ELSE 0 END;

  SELECT pg_catalog.count(*)::INTEGER
  INTO remaining_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.locktype = 'advisory'
    AND lock.pid = pg_catalog.pg_backend_pid()
    AND lock.granted;

  IF expected_lock_shape
    AND remaining_lock_count = 0
    AND released_count = current_advisory_lock_count
  THEN
    RETURN QUERY SELECT 'released'::TEXT, released_count;
  ELSE
    RETURN QUERY SELECT 'lock-leaked'::TEXT, released_count;
  END IF;
END;
$$;

CREATE FUNCTION
  public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "reasonCode" TEXT
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
  locked_permit
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
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_admission
    public.bot_reply_staging_pre_send_admission_bindings%ROWTYPE;
  stored_resolution
    public.bot_reply_staging_credential_bound_pre_send_permit_resolutions%ROWTYPE;
  stored_consumption
    public.bot_reply_staging_credential_bound_pre_send_permit_consumptions%ROWTYPE;
  stored_request_binding
    public.bot_reply_staging_credential_provider_request_bindings%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_request public.bot_reply_provider_request_claims%ROWTYPE;
  recomputed_permit_key TEXT;
  service_window_opened_at TIMESTAMPTZ;
  service_window_expires_at TIMESTAMPTZ;
  database_now TIMESTAMPTZ;
  safety_cutoff TIMESTAMPTZ;
  denial_reason TEXT;
  provider_request_key TEXT;
  consumption_key TEXT;
  provider_binding_key TEXT;
  resolution_key TEXT;
  barrier_key BIGINT;
  current_advisory_lock_count INTEGER;
  matching_barrier_lock_count INTEGER;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption requires read committed isolation';
  END IF;

  SELECT permit.*
  INTO initial_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption lacks permit';
  END IF;

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      initial_permit.tenant_id,
      initial_permit.run_binding_key,
      initial_permit.credential_revision,
      initial_permit.credential_envelope_digest,
      initial_permit.credential_event_key,
      initial_permit.admission_binding_key,
      initial_permit.policy_event_key,
      initial_permit.sender_key,
      initial_permit.recipient_key,
      initial_permit.phone_throughput_messages_per_second,
      initial_permit.maximum_outbound_messages_per_second,
      initial_permit.operation_key,
      initial_permit.operation_kind,
      initial_permit.delivery_key,
      initial_permit.delivery_claim_version,
      initial_permit.reservation_key,
      initial_permit.reservation_reserved_at,
      initial_permit.pair_reserved_until,
      initial_permit.reservation_expires_at,
      initial_permit.reserved_at
    );

  IF initial_permit.permit_key <> recomputed_permit_key THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption permit conflicts';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    initial_permit.tenant_id
  );

  SELECT pg_catalog.count(*)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((barrier_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (barrier_key & 4294967295::BIGINT)
    )::INTEGER
  INTO current_advisory_lock_count, matching_barrier_lock_count
  FROM pg_catalog.pg_locks AS lock
  WHERE lock.pid = pg_catalog.pg_backend_pid()
    AND lock.locktype = 'advisory'
    AND lock.granted;

  IF current_advisory_lock_count <> 1
    OR matching_barrier_lock_count <> 1
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption lacks session barrier';
  END IF;

  -- Canonical post-barrier lock order matches 0055, followed by the immutable
  -- capability ledgers and the legacy provider fence.
  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = initial_permit.run_key
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

  -- Locks every existing matching cooldown row deterministically. D1e still
  -- has to make insertion of a previously absent matching row participate in
  -- the tenant barrier; row locks alone cannot prevent that phantom.
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
  WHERE admission.admission_binding_key =
      initial_permit.admission_binding_key
    AND admission.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT permit.*
  INTO locked_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key
    AND permit.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT resolution.*
  INTO stored_resolution
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
    AS resolution
  WHERE resolution.permit_key = requested_permit_key
    AND resolution.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT consumption.*
  INTO stored_consumption
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
    AS consumption
  WHERE consumption.permit_key = requested_permit_key
    AND consumption.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT request_binding.*
  INTO stored_request_binding
  FROM public.bot_reply_staging_credential_provider_request_bindings
    AS request_binding
  WHERE request_binding.permit_key = requested_permit_key
    AND request_binding.tenant_id = initial_permit.tenant_id
  FOR UPDATE;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.tenant_id = initial_permit.tenant_id
    AND (
      operation.operation_key = initial_permit.operation_key
      OR (
        operation.delivery_key = initial_permit.delivery_key
        AND operation.delivery_claim_version =
          initial_permit.delivery_claim_version
      )
      OR operation.reservation_key = initial_permit.reservation_key
    )
  ORDER BY operation.operation_key
  LIMIT 1
  FOR UPDATE;

  SELECT request.*
  INTO stored_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.tenant_id = initial_permit.tenant_id
    AND (
      (
        request.delivery_key = initial_permit.delivery_key
        AND request.claim_version = initial_permit.delivery_claim_version
      )
      OR request.reservation_key = initial_permit.reservation_key
    )
  ORDER BY request.request_key
  LIMIT 1
  FOR UPDATE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  safety_cutoff := database_now + INTERVAL '15 seconds';

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      locked_permit.tenant_id,
      locked_permit.run_binding_key,
      locked_permit.credential_revision,
      locked_permit.credential_envelope_digest,
      locked_permit.credential_event_key,
      locked_permit.admission_binding_key,
      locked_permit.policy_event_key,
      locked_permit.sender_key,
      locked_permit.recipient_key,
      locked_permit.phone_throughput_messages_per_second,
      locked_permit.maximum_outbound_messages_per_second,
      locked_permit.operation_key,
      locked_permit.operation_kind,
      locked_permit.delivery_key,
      locked_permit.delivery_claim_version,
      locked_permit.reservation_key,
      locked_permit.reservation_reserved_at,
      locked_permit.pair_reserved_until,
      locked_permit.reservation_expires_at,
      locked_permit.reserved_at
    );

  IF locked_permit.permit_key IS NULL
    OR locked_permit IS DISTINCT FROM initial_permit
    OR locked_permit.permit_key <> recomputed_permit_key
    OR locked_binding.binding_key IS NULL
    OR locked_admission.admission_binding_key IS NULL
    OR locked_binding.binding_key <> locked_permit.run_binding_key
    OR locked_binding.run_key <> locked_permit.run_key
    OR locked_binding.tenant_id <> locked_permit.tenant_id
    OR locked_binding.run_claim_version <> locked_permit.run_claim_version
    OR locked_binding.authorization_event_key <>
      locked_permit.authorization_event_key
    OR locked_binding.authorization_version <>
      locked_permit.authorization_version
    OR locked_binding.credential_revision <>
      locked_permit.credential_revision
    OR locked_binding.credential_envelope_digest <>
      locked_permit.credential_envelope_digest
    OR locked_binding.credential_event_key <>
      locked_permit.credential_event_key
    OR locked_admission.run_binding_key <> locked_permit.run_binding_key
    OR locked_admission.run_key <> locked_permit.run_key
    OR locked_admission.tenant_id <> locked_permit.tenant_id
    OR locked_admission.run_claim_version <> locked_permit.run_claim_version
    OR locked_admission.authorization_event_key <>
      locked_permit.authorization_event_key
    OR locked_admission.authorization_version <>
      locked_permit.authorization_version
    OR locked_admission.credential_revision <>
      locked_permit.credential_revision
    OR locked_admission.credential_envelope_digest <>
      locked_permit.credential_envelope_digest
    OR locked_admission.credential_event_key <>
      locked_permit.credential_event_key
    OR locked_admission.delivery_key <> locked_permit.delivery_key
    OR locked_admission.delivery_claim_version <>
      locked_permit.delivery_claim_version
    OR locked_admission.reservation_key <> locked_permit.reservation_key
    OR locked_admission.sender_key <> locked_permit.sender_key
    OR locked_admission.recipient_key <> locked_permit.recipient_key
    OR locked_admission.policy_event_key <> locked_permit.policy_event_key
    OR locked_admission.phone_throughput_messages_per_second <>
      locked_permit.phone_throughput_messages_per_second
    OR locked_admission.maximum_outbound_messages_per_second <>
      locked_permit.maximum_outbound_messages_per_second
    OR locked_admission.reservation_reserved_at <>
      locked_permit.reservation_reserved_at
    OR locked_admission.pair_reserved_until <>
      locked_permit.pair_reserved_until
    OR locked_admission.reservation_expires_at <>
      locked_permit.reservation_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption scope conflicts';
  END IF;

  IF stored_resolution.resolution_key IS NOT NULL THEN
    IF stored_resolution.tenant_id <> locked_permit.tenant_id
      OR stored_resolution.credential_revision <>
        locked_permit.credential_revision
      OR stored_resolution.credential_envelope_digest <>
        locked_permit.credential_envelope_digest
      OR stored_resolution.credential_event_key <>
        locked_permit.credential_event_key
      OR stored_resolution.operation_key <> locked_permit.operation_key
      OR stored_resolution.delivery_key <> locked_permit.delivery_key
      OR stored_resolution.delivery_claim_version <>
        locked_permit.delivery_claim_version
      OR stored_resolution.reservation_key <> locked_permit.reservation_key
      OR (
        stored_resolution.outcome = 'denied'
        AND (
          stored_resolution.provider_request_key IS NOT NULL
          OR stored_consumption.consumption_key IS NOT NULL
          OR stored_request_binding.binding_key IS NOT NULL
        )
      )
      OR (
        stored_resolution.outcome = 'released'
        AND (
          stored_consumption.consumption_key IS NULL
          OR stored_request_binding.binding_key IS NULL
          OR stored_operation.operation_key IS NULL
          OR stored_request.request_key IS NULL
          OR stored_resolution.provider_request_key <>
            stored_consumption.provider_request_key
          OR stored_consumption.provider_request_key <>
            stored_request_binding.provider_request_key
          OR stored_request_binding.provider_request_key <>
            stored_operation.provider_request_key
          OR stored_operation.provider_request_key <>
            stored_request.request_key
        )
      )
    THEN
      RAISE EXCEPTION
        'Bot reply staging credential-bound consumption replay conflicts';
    END IF;

    RETURN QUERY SELECT
      'replay-blocked'::TEXT,
      CASE
        WHEN stored_resolution.outcome = 'released'
          THEN 'CAPABILITY_ALREADY_RELEASED'::TEXT
        ELSE stored_resolution.reason_code
      END;
    RETURN;
  END IF;

  IF stored_consumption.consumption_key IS NOT NULL
    OR stored_request_binding.binding_key IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound consumption is partial';
  END IF;

  IF locked_permit.operation_kind NOT IN ('text-send', 'button-send') THEN
    denial_reason := 'OPERATION_KIND_NOT_RELEASABLE';
  ELSIF locked_permit.reserved_at > database_now
    OR safety_cutoff >= locked_permit.permit_expires_at
  THEN
    denial_reason := 'PERMIT_EXPIRED';
  ELSIF current_credential.tenant_id IS NULL
    OR current_credential_event.event_key IS NULL
    OR current_credential.credential_revision <>
      locked_permit.credential_revision
    OR current_credential.envelope_digest <>
      locked_permit.credential_envelope_digest
    OR current_credential_event.event_key <>
      locked_permit.credential_event_key
  THEN
    denial_reason := 'CREDENTIAL_CHANGED';
  ELSIF active_authorization.event_key IS NULL
    OR active_authorization.event_key <>
      locked_permit.authorization_event_key
    OR active_authorization.authorization_version <>
      locked_permit.authorization_version
    OR active_authorization.status <> 'approved'
    OR active_authorization.credential_revision <>
      locked_permit.credential_revision
    OR active_authorization.credential_envelope_digest <>
      locked_permit.credential_envelope_digest
    OR active_authorization.credential_event_key <>
      locked_permit.credential_event_key
    OR active_authorization.recorded_at > database_now
    OR database_now >= active_authorization.recipient_expires_at
    OR database_now >= active_authorization.rate_limit_expires_at
  THEN
    denial_reason := 'AUTHORIZATION_STALE';
  ELSIF current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
  THEN
    denial_reason := 'CONNECTION_CHANGED';
  ELSIF current_policy.event_key IS NULL
    OR current_policy.event_key <> locked_permit.policy_event_key
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.meta_graph_api_version <> active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_observation_events AS observation
      WHERE observation.run_key = locked_permit.run_key
        AND observation.fact_kind = 'kill-switch'
    )
  THEN
    denial_reason := 'POLICY_DISABLED';
  ELSIF active_run.run_key IS NULL
    OR active_run.tenant_id <> locked_permit.tenant_id
    OR active_run.request_digest <> locked_permit.request_digest
    OR active_run.audit_key <> locked_permit.audit_key
    OR active_run.release_id <> locked_permit.release_id
    OR active_run.commit_sha <> locked_permit.commit_sha
    OR active_run.artifact_digest <> locked_permit.artifact_digest
    OR active_run.claim_version <> locked_permit.run_claim_version
    OR active_run.lease_expires_at <> locked_permit.run_lease_expires_at
    OR active_run.status <> 'running'
    OR database_now < active_run.started_at
    OR database_now >= active_run.lease_expires_at
  THEN
    denial_reason := 'RUN_STALE';
  ELSIF locked_delivery.delivery_key IS NULL
    OR locked_delivery.status <> 'sending'
    OR locked_delivery.attempt_count <> 1
    OR locked_delivery.claim_version <>
      locked_permit.delivery_claim_version
    OR locked_delivery.updated_at > database_now
  THEN
    denial_reason := 'DELIVERY_STALE';
  ELSIF locked_reservation.reservation_key IS NULL
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.sender_key <> locked_permit.sender_key
    OR locked_reservation.recipient_key <> locked_permit.recipient_key
    OR locked_reservation.policy_event_key <> locked_permit.policy_event_key
    OR locked_reservation.reserved_at <>
      locked_permit.reservation_reserved_at
    OR locked_reservation.pair_reserved_until <>
      locked_permit.pair_reserved_until
    OR locked_reservation.reservation_expires_at <>
      locked_permit.reservation_expires_at
    OR locked_reservation.reserved_at > database_now
    OR database_now >= locked_reservation.reservation_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = locked_permit.reservation_key
    )
  THEN
    denial_reason := 'RESERVATION_STALE';
  ELSIF service_window_opened_at IS NULL
    OR service_window_opened_at > database_now
    OR safety_cutoff >= service_window_expires_at
  THEN
    denial_reason := 'SERVICE_WINDOW_CLOSED';
  ELSIF EXISTS (
    SELECT 1
    FROM public.whatsapp_provider_cooldown_state AS cooldown
    WHERE cooldown.blocked_until > database_now
      AND (
        (
          cooldown.scope = 'sender'
          AND cooldown.sender_key = locked_permit.sender_key
          AND cooldown.recipient_key = ''
        ) OR (
          cooldown.scope = 'portfolio-recipient'
          AND cooldown.sender_key = ''
          AND cooldown.recipient_key = locked_permit.recipient_key
        ) OR (
          cooldown.scope = 'pair'
          AND cooldown.sender_key = locked_permit.sender_key
          AND cooldown.recipient_key = locked_permit.recipient_key
        )
      )
  ) THEN
    denial_reason := 'PROVIDER_COOLDOWN_ACTIVE';
  ELSIF stored_operation.operation_key IS NOT NULL
    OR stored_request.request_key IS NOT NULL
  THEN
    denial_reason := 'OPERATION_ALREADY_FENCED';
  END IF;

  IF denial_reason IS NOT NULL THEN
    resolution_key := 'bot_reply_staging_permit_resolution_v1_' ||
      pg_catalog.encode(
        pg_catalog.sha256(
          pg_catalog.convert_to(
            'connect-bot-reply-staging-permit-denial-v1',
            'UTF8'
          ) ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(locked_permit.permit_key, 'UTF8') ||
          pg_catalog.decode('00', 'hex') ||
          pg_catalog.convert_to(denial_reason, 'UTF8')
        ),
        'hex'
      );

    INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permit_resolutions (
      resolution_key,
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key,
      outcome,
      reason_code,
      provider_request_key,
      resolved_at,
      created_at
    ) VALUES (
      resolution_key,
      locked_permit.permit_key,
      locked_permit.tenant_id,
      locked_permit.credential_revision,
      locked_permit.credential_envelope_digest,
      locked_permit.credential_event_key,
      locked_permit.operation_key,
      locked_permit.delivery_key,
      locked_permit.delivery_claim_version,
      locked_permit.reservation_key,
      'denied',
      denial_reason,
      NULL,
      database_now,
      database_now
    );

    RETURN QUERY SELECT
      'denied'::TEXT,
      denial_reason;
    RETURN;
  END IF;

  provider_request_key := 'bot_reply_provider_request_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-credential-request-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_permit.permit_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          (EXTRACT(epoch FROM database_now) * 1000)::BIGINT::TEXT,
          'UTF8'
        )
      ),
      'hex'
    );

  consumption_key := 'bot_reply_staging_permit_consumption_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-permit-consumption-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_permit.permit_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(provider_request_key, 'UTF8')
      ),
      'hex'
    );

  provider_binding_key := 'bot_reply_staging_request_binding_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-request-binding-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(consumption_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(provider_request_key, 'UTF8')
      ),
      'hex'
    );

  resolution_key := 'bot_reply_staging_permit_resolution_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-permit-release-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(locked_permit.permit_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(provider_request_key, 'UTF8')
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
    locked_permit.operation_key,
    locked_permit.run_key,
    locked_permit.tenant_id,
    locked_permit.request_digest,
    locked_permit.audit_key,
    locked_permit.release_id,
    locked_permit.commit_sha,
    locked_permit.artifact_digest,
    locked_permit.run_claim_version,
    locked_permit.run_lease_expires_at,
    locked_permit.operation_kind,
    locked_permit.delivery_key,
    locked_permit.delivery_claim_version,
    locked_permit.reservation_key,
    provider_request_key,
    database_now,
    database_now
  );

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
    locked_permit.delivery_key,
    locked_permit.tenant_id,
    locked_permit.delivery_claim_version,
    locked_permit.reservation_key,
    database_now,
    database_now
  );

  INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permit_consumptions (
    consumption_key,
    permit_key,
    tenant_id,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    operation_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    provider_request_key,
    consumed_at,
    created_at
  ) VALUES (
    consumption_key,
    locked_permit.permit_key,
    locked_permit.tenant_id,
    locked_permit.credential_revision,
    locked_permit.credential_envelope_digest,
    locked_permit.credential_event_key,
    locked_permit.operation_key,
    locked_permit.delivery_key,
    locked_permit.delivery_claim_version,
    locked_permit.reservation_key,
    provider_request_key,
    database_now,
    database_now
  );

  INSERT INTO public.bot_reply_staging_credential_provider_request_bindings (
    binding_key,
    permit_key,
    consumption_key,
    run_key,
    tenant_id,
    run_claim_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    operation_key,
    operation_kind,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    provider_request_key,
    bound_at,
    created_at
  ) VALUES (
    provider_binding_key,
    locked_permit.permit_key,
    consumption_key,
    locked_permit.run_key,
    locked_permit.tenant_id,
    locked_permit.run_claim_version,
    locked_permit.credential_revision,
    locked_permit.credential_envelope_digest,
    locked_permit.credential_event_key,
    locked_permit.operation_key,
    locked_permit.operation_kind,
    locked_permit.delivery_key,
    locked_permit.delivery_claim_version,
    locked_permit.reservation_key,
    provider_request_key,
    database_now,
    database_now
  );

  INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permit_resolutions (
    resolution_key,
    permit_key,
    tenant_id,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    operation_key,
    delivery_key,
    delivery_claim_version,
    reservation_key,
    outcome,
    reason_code,
    provider_request_key,
    resolved_at,
    created_at
  ) VALUES (
    resolution_key,
    locked_permit.permit_key,
    locked_permit.tenant_id,
    locked_permit.credential_revision,
    locked_permit.credential_envelope_digest,
    locked_permit.credential_event_key,
    locked_permit.operation_key,
    locked_permit.delivery_key,
    locked_permit.delivery_claim_version,
    locked_permit.reservation_key,
    'released',
    'CAPABILITY_RELEASED',
    provider_request_key,
    database_now,
    database_now
  );

  RETURN QUERY SELECT
    'authorized'::TEXT,
    'CAPABILITY_RELEASED'::TEXT;
END;
$$;

CREATE FUNCTION
  public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
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
  stored_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  stored_resolution
    public.bot_reply_staging_credential_bound_pre_send_permit_resolutions%ROWTYPE;
  stored_consumption
    public.bot_reply_staging_credential_bound_pre_send_permit_consumptions%ROWTYPE;
  stored_binding
    public.bot_reply_staging_credential_provider_request_bindings%ROWTYPE;
  stored_operation public.bot_reply_staging_provider_operations%ROWTYPE;
  stored_outcome
    public.bot_reply_staging_provider_operation_outcomes%ROWTYPE;
  stored_request public.bot_reply_provider_request_claims%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_request public.bot_reply_provider_request_claims%ROWTYPE;
  recomputed_permit_key TEXT;
  barrier_key BIGINT;
  reconciliation_marker_key BIGINT;
  current_advisory_lock_count INTEGER;
  matching_barrier_lock_count INTEGER;
  matching_reconciliation_marker_lock_count INTEGER;
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
  uncertainty_kind TEXT;
  uncertainty_state TEXT;
  uncertainty_detected_at TIMESTAMPTZ;
  uncertainty_event_key TEXT;
BEGIN
  IF requested_permit_key IS NULL
    OR NOT requested_permit_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound finalization input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound finalization requires read committed isolation';
  END IF;

  SELECT permit.*
  INTO stored_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.permit_key = requested_permit_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound finalization lacks permit';
  END IF;

  recomputed_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      stored_permit.tenant_id,
      stored_permit.run_binding_key,
      stored_permit.credential_revision,
      stored_permit.credential_envelope_digest,
      stored_permit.credential_event_key,
      stored_permit.admission_binding_key,
      stored_permit.policy_event_key,
      stored_permit.sender_key,
      stored_permit.recipient_key,
      stored_permit.phone_throughput_messages_per_second,
      stored_permit.maximum_outbound_messages_per_second,
      stored_permit.operation_key,
      stored_permit.operation_kind,
      stored_permit.delivery_key,
      stored_permit.delivery_claim_version,
      stored_permit.reservation_key,
      stored_permit.reservation_reserved_at,
      stored_permit.pair_reserved_until,
      stored_permit.reservation_expires_at,
      stored_permit.reserved_at
    );

  IF stored_permit.permit_key <> recomputed_permit_key THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound finalization permit conflicts';
  END IF;

  barrier_key := public.derive_bot_reply_staging_tenant_barrier_key_v1(
    stored_permit.tenant_id
  );
  reconciliation_marker_key :=
    public.derive_bot_reply_staging_reconciliation_marker_key_v1(
      stored_permit.tenant_id,
      stored_permit.permit_key
    );

  IF reconciliation_marker_key = barrier_key THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound reconciliation marker conflicts';
  END IF;

  SELECT pg_catalog.count(*)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
        AND lock.classid::BIGINT =
          ((barrier_key >> 32) & 4294967295::BIGINT)
        AND lock.objid::BIGINT =
          (barrier_key & 4294967295::BIGINT)
    )::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE lock.objsubid = 1
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
      'Bot reply staging credential-bound finalization lacks session barrier';
  END IF;

  SELECT resolution.*
  INTO stored_resolution
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
    AS resolution
  WHERE resolution.permit_key = stored_permit.permit_key
    AND resolution.tenant_id = stored_permit.tenant_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'closed'::TEXT,
      'unconsumed'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF stored_resolution.outcome = 'denied' THEN
    RETURN QUERY SELECT
      'closed'::TEXT,
      'denied'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT consumption.*
  INTO stored_consumption
  FROM public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
    AS consumption
  WHERE consumption.permit_key = stored_permit.permit_key
    AND consumption.tenant_id = stored_permit.tenant_id;

  SELECT request_binding.*
  INTO stored_binding
  FROM public.bot_reply_staging_credential_provider_request_bindings
    AS request_binding
  WHERE request_binding.permit_key = stored_permit.permit_key
    AND request_binding.tenant_id = stored_permit.tenant_id;

  SELECT operation.*
  INTO stored_operation
  FROM public.bot_reply_staging_provider_operations AS operation
  WHERE operation.operation_key = stored_permit.operation_key
    AND operation.tenant_id = stored_permit.tenant_id
  FOR UPDATE;

  SELECT request.*
  INTO stored_request
  FROM public.bot_reply_provider_request_claims AS request
  WHERE request.request_key = stored_resolution.provider_request_key
    AND request.tenant_id = stored_permit.tenant_id;

  IF stored_consumption.consumption_key IS NULL
    OR stored_binding.binding_key IS NULL
    OR stored_operation.operation_key IS NULL
    OR stored_request.request_key IS NULL
    OR stored_resolution.provider_request_key <>
      stored_consumption.provider_request_key
    OR stored_consumption.provider_request_key <>
      stored_binding.provider_request_key
    OR stored_binding.provider_request_key <>
      stored_operation.provider_request_key
    OR stored_operation.provider_request_key <> stored_request.request_key
    OR stored_consumption.permit_key <> stored_permit.permit_key
    OR stored_binding.permit_key <> stored_permit.permit_key
    OR stored_binding.consumption_key <> stored_consumption.consumption_key
    OR stored_binding.run_key <> stored_permit.run_key
    OR stored_binding.tenant_id <> stored_permit.tenant_id
    OR stored_binding.run_claim_version <> stored_permit.run_claim_version
    OR stored_binding.operation_key <> stored_permit.operation_key
    OR stored_binding.operation_kind <> stored_permit.operation_kind
    OR stored_binding.delivery_key <> stored_permit.delivery_key
    OR stored_binding.delivery_claim_version <>
      stored_permit.delivery_claim_version
    OR stored_binding.reservation_key <> stored_permit.reservation_key
    OR stored_binding.credential_revision <>
      stored_permit.credential_revision
    OR stored_binding.credential_envelope_digest <>
      stored_permit.credential_envelope_digest
    OR stored_binding.credential_event_key <>
      stored_permit.credential_event_key
    OR stored_binding.bound_at <> stored_consumption.consumed_at
    OR stored_binding.bound_at <> stored_operation.requested_at
    OR stored_binding.bound_at <> stored_request.requested_at
    OR stored_operation.run_key <> stored_permit.run_key
    OR stored_operation.tenant_id <> stored_permit.tenant_id
    OR stored_operation.run_claim_version <> stored_permit.run_claim_version
    OR stored_operation.operation_kind <> stored_permit.operation_kind
    OR stored_operation.request_digest <> stored_permit.request_digest
    OR stored_operation.audit_key <> stored_permit.audit_key
    OR stored_operation.release_id <> stored_permit.release_id
    OR stored_operation.commit_sha <> stored_permit.commit_sha
    OR stored_operation.artifact_digest <> stored_permit.artifact_digest
    OR stored_operation.run_lease_expires_at <>
      stored_permit.run_lease_expires_at
    OR stored_operation.operation_kind NOT IN ('text-send', 'button-send')
    OR stored_request.delivery_key <> stored_permit.delivery_key
    OR stored_request.tenant_id <> stored_permit.tenant_id
    OR stored_request.claim_version <> stored_permit.delivery_claim_version
    OR stored_request.reservation_key <> stored_permit.reservation_key
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound finalization chain conflicts';
  END IF;

  SELECT provider_outcome.*
  INTO stored_outcome
  FROM public.bot_reply_staging_provider_operation_outcomes
    AS provider_outcome
  WHERE provider_outcome.operation_key = stored_operation.operation_key;

  IF FOUND THEN
    RETURN QUERY SELECT
      'replayed'::TEXT,
      stored_outcome.state,
      stored_outcome.provider_outcome_kind,
      stored_outcome.observation_key,
      stored_outcome.finalized_at;
    RETURN;
  END IF;

  -- The outcome producers and the 0053 finalizer use this canonical order.
  -- The operation row is already locked above, so concurrent finalizers cannot
  -- create two terminal observations for the same provider request.
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
      'Bot reply staging credential-bound provider request fence is missing';
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
    CASE WHEN rejection_evidence_key IS NULL THEN 0 ELSE 1 END;

  IF exact_fact_count > 1 THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound provider outcome evidence conflicts';
  END IF;

  -- operation_kind describes the side effect that was authorized. Outcome
  -- classification is derived after Meta responds; it must never rewrite a
  -- real text/button send into one of the old synthetic control kinds.
  IF accepted_evidence_key IS NOT NULL THEN
    derived_state := 'completed';
    derived_outcome_kind := 'accepted';
    derived_evidence_key := accepted_evidence_key;
    derived_observed_at := accepted_observed_at;
  ELSIF deferral_evidence_key IS NOT NULL THEN
    IF deferral_provider_error_code = 130429 THEN
      derived_state := 'completed';
      derived_outcome_kind := 'sender-deferred';
    ELSIF deferral_provider_error_code = 131056 THEN
      derived_state := 'completed';
      derived_outcome_kind := 'pair-deferred';
    ELSE
      RAISE EXCEPTION
        'Bot reply staging credential-bound deferral code conflicts';
    END IF;
    derived_evidence_key := deferral_evidence_key;
    derived_observed_at := deferral_observed_at;
  ELSIF rejection_evidence_key IS NOT NULL THEN
    derived_state := 'completed';
    derived_outcome_kind := 'service-window-rejected';
    derived_evidence_key := rejection_evidence_key;
    derived_observed_at := rejection_observed_at;
  ELSIF ambiguous_observed_at IS NOT NULL THEN
    -- Ambiguity is not an authoritative provider outcome. Keeping the
    -- operation nonterminal permits a later exact durable provider fact or a
    -- future audited manual-resolution contract to reconcile it. The durable
    -- unresolved-operation fence prevents any automatic Meta retry.
    uncertainty_kind := 'provider-response-ambiguous';
    uncertainty_state := 'ambiguous';
    uncertainty_detected_at := ambiguous_observed_at;
  ELSIF database_now < stored_operation.run_lease_expires_at THEN
    RETURN QUERY SELECT
      'pending'::TEXT,
      'reserved'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  ELSE
    -- A local lease timeout cannot prove whether Meta received the request.
    -- Do not create an immutable terminal outcome that would reject a late
    -- callback. B2b/D2 must surface this state for manual reconciliation and
    -- must never retry the provider call automatically.
    uncertainty_kind := 'lease-expired-without-outcome';
    uncertainty_state := 'lease-expired-without-outcome';
    uncertainty_detected_at := database_now;
  END IF;

  IF uncertainty_kind IS NOT NULL THEN
    IF uncertainty_detected_at < stored_operation.requested_at
      OR uncertainty_detected_at > database_now
    THEN
      RAISE EXCEPTION
        'Bot reply staging credential-bound uncertainty time conflicts';
    END IF;

    uncertainty_event_key := 'bot_reply_staging_uncertainty_v1_' ||
      pg_catalog.encode(
        pg_catalog.sha256(
          pg_catalog.convert_to(
            'connect-bot-reply-staging-provider-uncertainty-v1',
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
          pg_catalog.convert_to(uncertainty_kind, 'UTF8')
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
      created_at
    ) VALUES (
      uncertainty_event_key,
      stored_permit.permit_key,
      stored_operation.operation_key,
      stored_operation.run_key,
      stored_operation.tenant_id,
      stored_operation.delivery_key,
      stored_operation.reservation_key,
      stored_operation.provider_request_key,
      stored_operation.requested_at,
      uncertainty_kind,
      uncertainty_detected_at,
      uncertainty_detected_at
    )
    ON CONFLICT ON CONSTRAINT
      bot_reply_staging_uncertainty_operation_kind_uq
    DO NOTHING;

    RETURN QUERY SELECT
      'manual-reconciliation-required'::TEXT,
      uncertainty_state,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF derived_observed_at < stored_operation.requested_at
    OR derived_observed_at > database_now
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound provider outcome time conflicts';
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
    stored_outcome.state,
    stored_outcome.provider_outcome_kind,
    stored_outcome.observation_key,
    stored_outcome.finalized_at;
END;
$$;

CREATE FUNCTION
  public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(
  requested_permit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
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
BEGIN
  RETURN QUERY
  SELECT finalization.outcome,
    finalization.state,
    finalization."providerOutcomeKind",
    finalization."observationKey",
    finalization."finalizedAt"
  FROM public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(
    requested_permit_key
  ) AS finalization;
END;
$$;

REVOKE ALL ON TABLE
  public.bot_reply_staging_credential_provider_request_bindings
FROM PUBLIC;
REVOKE ALL ON TABLE
  public.bot_reply_staging_provider_uncertainty_events
FROM PUBLIC;
REVOKE ALL ON TABLE
  public.bot_reply_staging_provider_boundary_claims
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.derive_bot_reply_staging_tenant_barrier_key_v1(BIGINT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.derive_bot_reply_staging_reconciliation_marker_key_v1(BIGINT, TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.acquire_bot_reply_staging_pre_send_session_barrier_v1(TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.prove_bot_reply_staging_pre_send_session_barrier_v1(TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.release_bot_reply_staging_pre_send_session_barrier_v1(TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(TEXT)
FROM PUBLIC;

DO $d31d1d_b2a2_postcondition$
DECLARE
  exact_column_count INTEGER;
  actual_column_count INTEGER;
  uncertainty_exact_column_count INTEGER;
  uncertainty_actual_column_count INTEGER;
  boundary_exact_column_count INTEGER;
  boundary_actual_column_count INTEGER;
  protected_function_count INTEGER;
  protected_relation_count INTEGER;
  exact_trigger_count INTEGER;
  actual_trigger_count INTEGER;
  exact_constraint_count INTEGER;
BEGIN
  WITH expected_columns(column_name, type_name) AS (
    VALUES
      ('binding_key', 'text'),
      ('permit_key', 'text'),
      ('consumption_key', 'text'),
      ('run_key', 'text'),
      ('tenant_id', 'int8'),
      ('run_claim_version', 'int4'),
      ('credential_revision', 'int8'),
      ('credential_envelope_digest', 'text'),
      ('credential_event_key', 'text'),
      ('operation_key', 'text'),
      ('operation_kind', 'text'),
      ('delivery_key', 'text'),
      ('delivery_claim_version', 'int4'),
      ('reservation_key', 'text'),
      ('provider_request_key', 'text'),
      ('bound_at', 'timestamptz'),
      ('created_at', 'timestamptz')
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO exact_column_count
  FROM expected_columns AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname =
      'bot_reply_staging_credential_provider_request_bindings'
   AND relation.relkind = 'r'
  INNER JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = relation.oid
   AND attribute.attname = expected.column_name
   AND attribute.attnum > 0
   AND attribute.attisdropped = false
   AND attribute.attnotnull
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
    AND relation.relname =
      'bot_reply_staging_credential_provider_request_bindings'
    AND relation.relkind = 'r'
    AND attribute.attnum > 0
    AND attribute.attisdropped = false;

  WITH expected_columns(column_name, type_name) AS (
    VALUES
      ('event_key', 'text'),
      ('permit_key', 'text'),
      ('operation_key', 'text'),
      ('run_key', 'text'),
      ('tenant_id', 'int8'),
      ('delivery_key', 'text'),
      ('reservation_key', 'text'),
      ('provider_request_key', 'text'),
      ('requested_at', 'timestamptz'),
      ('uncertainty_kind', 'text'),
      ('detected_at', 'timestamptz'),
      ('created_at', 'timestamptz')
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO uncertainty_exact_column_count
  FROM expected_columns AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname =
      'bot_reply_staging_provider_uncertainty_events'
   AND relation.relkind = 'r'
  INNER JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = relation.oid
   AND attribute.attname = expected.column_name
   AND attribute.attnum > 0
   AND attribute.attisdropped = false
   AND attribute.attnotnull
  INNER JOIN pg_catalog.pg_type AS type
    ON type.oid = attribute.atttypid
   AND type.typname = expected.type_name;

  SELECT pg_catalog.count(*)::INTEGER
  INTO uncertainty_actual_column_count
  FROM pg_catalog.pg_attribute AS attribute
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = attribute.attrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname =
      'bot_reply_staging_provider_uncertainty_events'
    AND relation.relkind = 'r'
    AND attribute.attnum > 0
    AND attribute.attisdropped = false;

  WITH expected_columns(column_name, type_name) AS (
    VALUES
      ('claim_key', 'text'),
      ('permit_key', 'text'),
      ('operation_key', 'text'),
      ('run_key', 'text'),
      ('tenant_id', 'int8'),
      ('delivery_key', 'text'),
      ('reservation_key', 'text'),
      ('provider_request_key', 'text'),
      ('requested_at', 'timestamptz'),
      ('backend_pid', 'int4'),
      ('proved_at', 'timestamptz'),
      ('send_before', 'timestamptz'),
      ('created_at', 'timestamptz')
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO boundary_exact_column_count
  FROM expected_columns AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname =
      'bot_reply_staging_provider_boundary_claims'
   AND relation.relkind = 'r'
  INNER JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = relation.oid
   AND attribute.attname = expected.column_name
   AND attribute.attnum > 0
   AND attribute.attisdropped = false
   AND attribute.attnotnull
  INNER JOIN pg_catalog.pg_type AS type
    ON type.oid = attribute.atttypid
   AND type.typname = expected.type_name;

  SELECT pg_catalog.count(*)::INTEGER
  INTO boundary_actual_column_count
  FROM pg_catalog.pg_attribute AS attribute
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = attribute.attrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname =
      'bot_reply_staging_provider_boundary_claims'
    AND relation.relkind = 'r'
    AND attribute.attnum > 0
    AND attribute.attisdropped = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_function_count
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
        'public.acquire_bot_reply_staging_pre_send_session_barrier_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.prove_bot_reply_staging_pre_send_session_barrier_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.release_bot_reply_staging_pre_send_session_barrier_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(text)'
      ),
      pg_catalog.to_regprocedure(
        'public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(text)'
      )
    )
    AND procedure.prosecdef = FALSE
    AND pg_catalog.oidvectortypes(procedure.proargtypes) IN (
      'bigint',
      'text',
      'bigint, text'
    )
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[]
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) AS privilege
      WHERE privilege.grantee <> procedure.proowner
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_credential_provider_request_bindings',
      'bot_reply_staging_provider_uncertainty_events',
      'bot_reply_staging_provider_boundary_claims'
    )
    AND relation.relkind = 'r'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          relation.relacl,
          pg_catalog.acldefault('r', relation.relowner)
        )
      ) AS privilege
      WHERE privilege.grantee <> relation.relowner
    );

  WITH expected_triggers(relation_name, trigger_name, trigger_type) AS (
    VALUES
      (
        'bot_reply_staging_credential_provider_request_bindings',
        'bot_reply_staging_request_bindings_mutation_guard',
        27
      ),
      (
        'bot_reply_staging_credential_provider_request_bindings',
        'bot_reply_staging_request_bindings_truncate_guard',
        34
      ),
      (
        'bot_reply_staging_provider_uncertainty_events',
        'bot_reply_staging_uncertainty_mutation_guard',
        27
      ),
      (
        'bot_reply_staging_provider_uncertainty_events',
        'bot_reply_staging_uncertainty_truncate_guard',
        34
      ),
      (
        'bot_reply_staging_provider_boundary_claims',
        'bot_reply_staging_boundary_claims_mutation_guard',
        27
      ),
      (
        'bot_reply_staging_provider_boundary_claims',
        'bot_reply_staging_boundary_claims_truncate_guard',
        34
      )
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO exact_trigger_count
  FROM expected_triggers AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname = expected.relation_name
  INNER JOIN pg_catalog.pg_trigger AS trigger
    ON trigger.tgrelid = relation.oid
   AND trigger.tgname = expected.trigger_name
   AND trigger.tgtype = expected.trigger_type
   AND trigger.tgenabled = 'O'
   AND trigger.tgisinternal = false
   AND trigger.tgfoid = pg_catalog.to_regprocedure(
      'public.reject_bot_reply_staging_pre_send_ledger_mutation()'
    )
   AND trigger.tgqual IS NULL
   AND trigger.tgnargs = 0
   AND pg_catalog.cardinality(trigger.tgattr) = 0
   AND pg_catalog.octet_length(trigger.tgargs) = 0;

  SELECT pg_catalog.count(*)::INTEGER
  INTO actual_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_credential_provider_request_bindings',
      'bot_reply_staging_provider_uncertainty_events',
      'bot_reply_staging_provider_boundary_claims'
    )
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO exact_constraint_count
  FROM pg_catalog.pg_constraint AS constraint_record
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = constraint_record.conrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND (
      (
        relation.relname =
          'bot_reply_staging_credential_provider_request_bindings'
        AND constraint_record.conname IN (
          'bot_reply_staging_request_bindings_permit_fk',
          'bot_reply_staging_request_bindings_consumption_fk',
          'bot_reply_staging_request_bindings_operation_fk',
          'bot_reply_staging_request_bindings_request_fk'
        )
        AND constraint_record.contype = 'f'
        AND constraint_record.confmatchtype = 's'
        AND constraint_record.confdeltype = 'r'
        AND constraint_record.confupdtype = 'a'
        AND constraint_record.condeferrable = false
        AND constraint_record.condeferred = false
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_credential_provider_request_bindings'
        AND constraint_record.conname =
          'bot_reply_staging_request_bindings_uncertainty_exact_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_uncertainty_events'
        AND constraint_record.conname =
          'bot_reply_staging_uncertainty_binding_fk'
        AND constraint_record.contype = 'f'
        AND constraint_record.confmatchtype = 's'
        AND constraint_record.confdeltype = 'r'
        AND constraint_record.confupdtype = 'a'
        AND constraint_record.condeferrable = false
        AND constraint_record.condeferred = false
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_uncertainty_events'
        AND constraint_record.conname IN (
          'bot_reply_staging_uncertainty_keys_valid',
          'bot_reply_staging_uncertainty_values_valid'
        )
        AND constraint_record.contype = 'c'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_uncertainty_events'
        AND constraint_record.conname =
          'bot_reply_staging_uncertainty_operation_kind_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_boundary_claims'
        AND constraint_record.conname =
          'bot_reply_staging_boundary_claims_binding_fk'
        AND constraint_record.contype = 'f'
        AND constraint_record.confmatchtype = 's'
        AND constraint_record.confdeltype = 'r'
        AND constraint_record.confupdtype = 'a'
        AND constraint_record.condeferrable = false
        AND constraint_record.condeferred = false
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_boundary_claims'
        AND constraint_record.conname IN (
          'bot_reply_staging_boundary_claims_keys_valid',
          'bot_reply_staging_boundary_claims_values_valid'
        )
        AND constraint_record.contype = 'c'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_provider_boundary_claims'
        AND constraint_record.conname IN (
          'bot_reply_staging_boundary_claims_permit_uq',
          'bot_reply_staging_boundary_claims_operation_uq',
          'bot_reply_staging_boundary_claims_request_uq'
        )
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname = 'meta_connections'
        AND constraint_record.conname =
          'meta_connections_business_portfolio_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
        AND constraint_record.conkey = ARRAY[
          (
            SELECT attribute.attnum
            FROM pg_catalog.pg_attribute AS attribute
            WHERE attribute.attrelid = relation.oid
              AND attribute.attname = 'business_portfolio_id'
              AND attribute.attnum > 0
              AND attribute.attisdropped = false
          )
        ]::pg_catalog.int2[]
      )
      OR (
        relation.relname = 'meta_connections'
        AND constraint_record.conname IN (
          'meta_connections_business_portfolio_id_canonical',
          'meta_connections_waba_id_canonical',
          'meta_connections_phone_number_id_canonical'
        )
        AND constraint_record.contype = 'c'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_credential_provider_request_bindings'
        AND constraint_record.conname IN (
          'bot_reply_staging_request_bindings_keys_valid',
          'bot_reply_staging_request_bindings_values_valid'
        )
        AND constraint_record.contype = 'c'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_credential_bound_pre_send_permit_consumptions'
        AND constraint_record.conname =
          'bot_reply_staging_consumptions_request_binding_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname = 'bot_reply_staging_provider_operations'
        AND constraint_record.conname =
          'bot_reply_staging_provider_ops_credential_exact_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname = 'bot_reply_provider_request_claims'
        AND constraint_record.conname =
          'bot_reply_provider_requests_prepared_exact_uq'
        AND constraint_record.contype = 'u'
        AND constraint_record.convalidated
      )
      OR (
        relation.relname =
          'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
        AND constraint_record.conname =
          'bot_reply_staging_pre_send_resolutions_outcome_valid'
        AND constraint_record.contype = 'c'
        AND constraint_record.convalidated
      )
    );

  IF exact_column_count <> 17
    OR actual_column_count <> 17
    OR uncertainty_exact_column_count <> 12
    OR uncertainty_actual_column_count <> 12
    OR boundary_exact_column_count <> 13
    OR boundary_actual_column_count <> 13
    OR protected_function_count <> 8
    OR protected_relation_count <> 3
    OR exact_trigger_count <> 6
    OR actual_trigger_count <> 6
    OR exact_constraint_count <> 25
  THEN
    RAISE EXCEPTION
      'Migration 0056 postcondition failed: binding exact columns %, binding actual columns %, uncertainty exact columns %, uncertainty actual columns %, boundary exact columns %, boundary actual columns %, functions %, relations %, exact triggers %, actual triggers %, constraints %',
      exact_column_count,
      actual_column_count,
      uncertainty_exact_column_count,
      uncertainty_actual_column_count,
      boundary_exact_column_count,
      boundary_actual_column_count,
      protected_function_count,
      protected_relation_count,
      exact_trigger_count,
      actual_trigger_count,
      exact_constraint_count;
  END IF;
END;
$d31d1d_b2a2_postcondition$;

-- B2b and D1e remain mandatory. Activation remains NO-GO: the migration
-- creates no role, runtime importer, provider transport, secret access, or
-- admission writer before any real provider side effect may use this contract.
