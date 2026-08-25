-- Dormant, bounded lifecycle capabilities for the protected staging-run ledger.
-- These wrappers deliberately remain SECURITY INVOKER and receive no runtime
-- grant. A later reviewed role migration must atomically set the canonical
-- owner, switch only these exact functions to SECURITY DEFINER, and grant
-- claim/read EXECUTE only to connect_api_runtime and complete EXECUTE only to
-- connect_worker_runtime before any activation is possible.

DO $$
DECLARE
  hardened_trigger_function_count INTEGER;
  matched_trigger_count INTEGER;
  bound_trigger_count INTEGER;
  protected_table_trigger_count INTEGER;
  protected_table_count INTEGER;
  existing_wrapper_count INTEGER;
  unsafe_default_function_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO hardened_trigger_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  INNER JOIN pg_catalog.pg_language AS language
    ON language.oid = procedure.prolang
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'guard_bot_reply_staging_run_update',
      'reject_bot_reply_staging_run_delete',
      'audit_bot_reply_staging_run_start',
      'audit_bot_reply_staging_run_completion',
      'guard_bot_reply_staging_audit_immutability'
    )
    AND procedure.pronargs = 0
    AND language.lanname = 'plpgsql'
    AND NOT procedure.prosecdef
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

  WITH expected_triggers (
    table_name,
    trigger_name,
    function_name,
    trigger_type
  ) AS (
    VALUES
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_update_guard',
        'guard_bot_reply_staging_run_update',
        19
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_delete_guard',
        'reject_bot_reply_staging_run_delete',
        11
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_audit_start',
        'audit_bot_reply_staging_run_start',
        5
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_audit_completion',
        'audit_bot_reply_staging_run_completion',
        17
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_update_guard',
        'guard_bot_reply_staging_audit_immutability',
        27
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_authorization_guard',
        'guard_bot_reply_staging_authorization_audit_immutability',
        27
      )
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO matched_trigger_count
  FROM expected_triggers AS expected
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relname = expected.table_name
  INNER JOIN pg_catalog.pg_namespace AS relation_namespace
    ON relation_namespace.oid = relation.relnamespace
  INNER JOIN pg_catalog.pg_trigger AS trigger
    ON trigger.tgrelid = relation.oid
    AND trigger.tgname = expected.trigger_name
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
    AND procedure.proname = expected.function_name
  INNER JOIN pg_catalog.pg_namespace AS function_namespace
    ON function_namespace.oid = procedure.pronamespace
  WHERE relation_namespace.nspname = 'public'
    AND function_namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND trigger.tgisinternal = false
    AND trigger.tgenabled = 'O'
    AND trigger.tgtype = expected.trigger_type
    AND trigger.tgqual IS NULL
    AND trigger.tgnargs = 0
    AND pg_catalog.cardinality(trigger.tgattr) = 0
    AND pg_catalog.octet_length(trigger.tgargs) = 0
    AND trigger.tgconstraint = 0
    AND trigger.tgdeferrable = false
    AND trigger.tginitdeferred = false
    AND trigger.tgparentid = 0
    AND trigger.tgoldtable IS NULL
    AND trigger.tgnewtable IS NULL;

  SELECT pg_catalog.count(*)::INTEGER
  INTO bound_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = ANY (ARRAY[
      'guard_bot_reply_staging_run_update',
      'reject_bot_reply_staging_run_delete',
      'audit_bot_reply_staging_run_start',
      'audit_bot_reply_staging_run_completion',
      'guard_bot_reply_staging_audit_immutability'
    ]::pg_catalog.TEXT[])
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('bot_reply_staging_runs', 'audit_logs')
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'bot_reply_staging_runs'
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
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
      WHERE attribute.attrelid = relation.oid
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
        AND attribute.attacl IS NOT NULL
        AND privilege.grantee <> relation.relowner
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_wrapper_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'claim_bot_reply_staging_run_v1',
      'read_bot_reply_staging_run_v1',
      'complete_bot_reply_staging_run_v1'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO unsafe_default_function_acl_count
  FROM pg_catalog.pg_default_acl AS default_acl
  CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) AS privilege
  WHERE default_acl.defaclrole = (
      SELECT role.oid
      FROM pg_catalog.pg_roles AS role
      WHERE role.rolname = CURRENT_USER
    )
    AND default_acl.defaclobjtype = 'f'
    AND (
      default_acl.defaclnamespace = 0
      OR default_acl.defaclnamespace =
        'public'::pg_catalog.regnamespace
    )
    AND privilege.grantee <> default_acl.defaclrole;

  IF hardened_trigger_function_count <> 5
    OR matched_trigger_count <> 6
    OR bound_trigger_count <> 5
    OR protected_table_trigger_count <> 6
    OR protected_table_count <> 1
    OR existing_wrapper_count <> 0
    OR unsafe_default_function_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1a precondition failed: hardened functions %, triggers %, bindings %, table triggers %, protected tables %, existing wrappers %, unsafe default ACLs %',
      hardened_trigger_function_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count,
      protected_table_count,
      existing_wrapper_count,
      unsafe_default_function_acl_count;
  END IF;
END;
$$;

CREATE FUNCTION public.claim_bot_reply_staging_run_v1(
  requested_run_key TEXT,
  requested_tenant_id BIGINT,
  requested_request_digest TEXT,
  requested_actor_external_user_id TEXT,
  requested_connection_version INTEGER,
  requested_policy_version INTEGER,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_graph_api_version TEXT,
  requested_recipient_fingerprint TEXT,
  requested_rate_limit_method_fingerprint TEXT,
  requested_lease_duration_seconds INTEGER,
  requested_audit_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "runKey" TEXT,
  "requestDigest" TEXT,
  "auditKey" TEXT,
  "claimVersion" INTEGER,
  "leaseExpiresAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "receiptJson" TEXT,
  "receiptDigest" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_run public.bot_reply_staging_runs%ROWTYPE;
  expected_audit_key TEXT;
  database_now TIMESTAMPTZ;
  database_lease_expires_at TIMESTAMPTZ;
BEGIN
  IF requested_run_key IS NULL
    OR NOT requested_run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    OR requested_tenant_id IS NULL
    OR requested_tenant_id < 1
    OR requested_request_digest IS NULL
    OR NOT requested_request_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_actor_external_user_id IS NULL
    OR pg_catalog.length(requested_actor_external_user_id) NOT BETWEEN 1 AND 255
    OR requested_actor_external_user_id <>
      pg_catalog.btrim(requested_actor_external_user_id)
    OR requested_actor_external_user_id OPERATOR(pg_catalog.~) '[[:cntrl:]]'
    OR requested_connection_version IS NULL
    OR requested_connection_version < 1
    OR requested_policy_version IS NULL
    OR requested_policy_version < 1
    OR requested_release_id IS NULL
    OR NOT requested_release_id OPERATOR(pg_catalog.~)
      '^connect_release_v1_[a-f0-9]{64}$'
    OR requested_commit_sha IS NULL
    OR NOT requested_commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'
    OR requested_artifact_digest IS NULL
    OR NOT requested_artifact_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_graph_api_version IS NULL
    OR NOT requested_graph_api_version OPERATOR(pg_catalog.~)
      '^v[1-9][0-9]{0,2}[.]0$'
    OR requested_recipient_fingerprint IS NULL
    OR NOT requested_recipient_fingerprint OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_rate_limit_method_fingerprint IS NULL
    OR NOT requested_rate_limit_method_fingerprint OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
    OR requested_lease_duration_seconds IS NULL
    OR requested_lease_duration_seconds NOT BETWEEN 60 AND 3600
  THEN
    RAISE EXCEPTION 'Bot reply staging claim input is invalid';
  END IF;

  expected_audit_key := 'bot_reply_staging_audit_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(requested_run_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(requested_request_digest, 'UTF8')
      ),
      'hex'
    );

  IF requested_audit_key IS NULL
    OR requested_audit_key <> expected_audit_key
  THEN
    RAISE EXCEPTION 'Bot reply staging claim audit identity is invalid';
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  database_lease_expires_at := database_now + pg_catalog.make_interval(
    secs => requested_lease_duration_seconds
  );

  INSERT INTO public.bot_reply_staging_runs (
    run_key,
    tenant_id,
    request_digest,
    actor_external_user_id,
    connection_version,
    policy_version,
    release_id,
    commit_sha,
    artifact_digest,
    graph_api_version,
    recipient_fingerprint,
    rate_limit_method_fingerprint,
    lease_expires_at,
    audit_key,
    started_at,
    created_at,
    updated_at
  ) VALUES (
    requested_run_key,
    requested_tenant_id,
    requested_request_digest,
    requested_actor_external_user_id,
    requested_connection_version,
    requested_policy_version,
    requested_release_id,
    requested_commit_sha,
    requested_artifact_digest,
    requested_graph_api_version,
    requested_recipient_fingerprint,
    requested_rate_limit_method_fingerprint,
    database_lease_expires_at,
    requested_audit_key,
    database_now,
    database_now,
    database_now
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO stored_run;

  IF FOUND THEN
    RETURN QUERY SELECT
      'claimed'::TEXT,
      stored_run.run_key,
      stored_run.request_digest,
      stored_run.audit_key,
      stored_run.claim_version,
      stored_run.lease_expires_at,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  SELECT staging_run.*
  INTO stored_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bot reply staging claim conflict disappeared';
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );
  database_lease_expires_at := database_now + pg_catalog.make_interval(
    secs => requested_lease_duration_seconds
  );

  IF stored_run.tenant_id <> requested_tenant_id
    OR stored_run.request_digest <> requested_request_digest
    OR stored_run.actor_external_user_id <>
      requested_actor_external_user_id
    OR stored_run.connection_version <> requested_connection_version
    OR stored_run.policy_version <> requested_policy_version
    OR stored_run.release_id <> requested_release_id
    OR stored_run.commit_sha <> requested_commit_sha
    OR stored_run.artifact_digest <> requested_artifact_digest
    OR stored_run.graph_api_version <> requested_graph_api_version
    OR stored_run.recipient_fingerprint <> requested_recipient_fingerprint
    OR stored_run.rate_limit_method_fingerprint <>
      requested_rate_limit_method_fingerprint
    OR stored_run.audit_key <> requested_audit_key
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  IF stored_run.status = 'completed' THEN
    RETURN QUERY SELECT
      'replayed'::TEXT,
      stored_run.run_key,
      stored_run.request_digest,
      stored_run.audit_key,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      stored_run.completed_at,
      stored_run.receipt_json,
      stored_run.receipt_digest;
    RETURN;
  END IF;

  IF stored_run.lease_expires_at > database_now THEN
    RETURN QUERY SELECT
      'in-progress'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.bot_reply_staging_runs AS staging_run
  SET
    claim_version = staging_run.claim_version + 1,
    lease_expires_at = database_lease_expires_at,
    updated_at = database_now
  WHERE staging_run.run_key = requested_run_key
    AND staging_run.request_digest = requested_request_digest
    AND staging_run.status = 'running'
    AND staging_run.claim_version = stored_run.claim_version
    AND staging_run.lease_expires_at <= database_now
  RETURNING staging_run.* INTO stored_run;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bot reply staging lease reclaim failed';
  END IF;

  RETURN QUERY SELECT
    'claimed'::TEXT,
    stored_run.run_key,
    stored_run.request_digest,
    stored_run.audit_key,
    stored_run.claim_version,
    stored_run.lease_expires_at,
    NULL::TIMESTAMPTZ,
    NULL::TEXT,
    NULL::TEXT;
END;
$$;

CREATE FUNCTION public.read_bot_reply_staging_run_v1(
  requested_tenant_id BIGINT,
  requested_run_key TEXT,
  requested_request_digest TEXT,
  requested_audit_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_claim_version INTEGER
)
RETURNS TABLE (
  outcome TEXT,
  "runKey" TEXT,
  "requestDigest" TEXT,
  "auditKey" TEXT,
  "claimVersion" INTEGER,
  "leaseExpiresAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "receiptJson" TEXT,
  "receiptDigest" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_run public.bot_reply_staging_runs%ROWTYPE;
  database_now TIMESTAMPTZ;
BEGIN
  IF requested_tenant_id IS NULL
    OR requested_tenant_id < 1
    OR requested_run_key IS NULL
    OR NOT requested_run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
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
    OR requested_claim_version IS NULL
    OR requested_claim_version < 1
  THEN
    RAISE EXCEPTION 'Bot reply staging read input is invalid';
  END IF;

  SELECT staging_run.*
  INTO stored_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
    AND staging_run.tenant_id = requested_tenant_id
  LIMIT 1;

  IF NOT FOUND
    OR stored_run.request_digest <> requested_request_digest
    OR stored_run.audit_key <> requested_audit_key
    OR stored_run.release_id <> requested_release_id
    OR stored_run.commit_sha <> requested_commit_sha
    OR stored_run.artifact_digest <> requested_artifact_digest
    OR stored_run.claim_version <> requested_claim_version
  THEN
    RETURN QUERY SELECT
      'missing-or-conflict'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF stored_run.status = 'running' THEN
    IF database_now >= stored_run.lease_expires_at THEN
      RETURN QUERY SELECT
        'expired'::TEXT,
        requested_run_key,
        requested_request_digest,
        NULL::TEXT,
        NULL::INTEGER,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::TEXT,
        NULL::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT
      'running'::TEXT,
      stored_run.run_key,
      stored_run.request_digest,
      stored_run.audit_key,
      stored_run.claim_version,
      stored_run.lease_expires_at,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    'completed'::TEXT,
    stored_run.run_key,
    stored_run.request_digest,
    stored_run.audit_key,
    stored_run.claim_version,
    NULL::TIMESTAMPTZ,
    stored_run.completed_at,
    stored_run.receipt_json,
    stored_run.receipt_digest;
END;
$$;

-- The canonical JSON argument is a capability boundary, not legacy
-- JSON.stringify output. Its SHA-256 must match the shared TypeScript
-- canonical serializer before the receipt can be persisted.
CREATE FUNCTION public.complete_bot_reply_staging_run_v1(
  requested_tenant_id BIGINT,
  requested_run_key TEXT,
  requested_request_digest TEXT,
  requested_audit_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_claim_version INTEGER,
  requested_lease_expires_at TIMESTAMPTZ,
  requested_canonical_receipt_json TEXT,
  requested_receipt_digest TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "runKey" TEXT,
  "requestDigest" TEXT,
  "auditKey" TEXT,
  "claimVersion" INTEGER,
  "leaseExpiresAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "receiptJson" TEXT,
  "receiptDigest" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  stored_run public.bot_reply_staging_runs%ROWTYPE;
  database_now TIMESTAMPTZ;
  expected_receipt_digest TEXT;
BEGIN
  IF requested_tenant_id IS NULL
    OR requested_tenant_id < 1
    OR requested_run_key IS NULL
    OR NOT requested_run_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
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
    OR requested_claim_version IS NULL
    OR requested_claim_version < 1
    OR requested_lease_expires_at IS NULL
    OR requested_lease_expires_at <>
      pg_catalog.date_trunc('milliseconds', requested_lease_expires_at)
    OR requested_canonical_receipt_json IS NULL
    OR pg_catalog.octet_length(requested_canonical_receipt_json)
      NOT BETWEEN 2 AND 48000
    OR pg_catalog.jsonb_typeof(
      requested_canonical_receipt_json::pg_catalog.jsonb
    ) <> 'object'
    OR requested_receipt_digest IS NULL
    OR NOT requested_receipt_digest OPERATOR(pg_catalog.~)
      '^sha256:[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION 'Bot reply staging completion input is invalid';
  END IF;

  expected_receipt_digest := 'sha256:' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(requested_canonical_receipt_json, 'UTF8')
      ),
      'hex'
    );

  IF requested_receipt_digest <> expected_receipt_digest THEN
    RAISE EXCEPTION
      'Bot reply staging receipt digest does not match its exact bytes';
  END IF;

  SELECT staging_run.*
  INTO stored_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
    AND staging_run.tenant_id = requested_tenant_id
  FOR UPDATE;

  IF NOT FOUND
    OR stored_run.request_digest <> requested_request_digest
    OR stored_run.audit_key <> requested_audit_key
    OR stored_run.release_id <> requested_release_id
    OR stored_run.commit_sha <> requested_commit_sha
    OR stored_run.artifact_digest <> requested_artifact_digest
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  IF stored_run.status = 'completed' THEN
    IF stored_run.claim_version <> requested_claim_version
      OR stored_run.lease_expires_at <> requested_lease_expires_at
      OR stored_run.receipt_json <> requested_canonical_receipt_json
      OR stored_run.receipt_digest <> requested_receipt_digest
    THEN
      RETURN QUERY SELECT
        'conflict'::TEXT,
        requested_run_key,
        requested_request_digest,
        NULL::TEXT,
        NULL::INTEGER,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::TEXT,
        NULL::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT
      'replayed'::TEXT,
      stored_run.run_key,
      stored_run.request_digest,
      stored_run.audit_key,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      stored_run.completed_at,
      stored_run.receipt_json,
      stored_run.receipt_digest;
    RETURN;
  END IF;

  IF stored_run.claim_version <> requested_claim_version
    OR stored_run.lease_expires_at <> requested_lease_expires_at
  THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF database_now < stored_run.started_at
    OR database_now >= stored_run.lease_expires_at
  THEN
    RETURN QUERY SELECT
      'lease-expired'::TEXT,
      requested_run_key,
      requested_request_digest,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.bot_reply_staging_runs AS staging_run
  SET
    status = 'completed',
    receipt_json = requested_canonical_receipt_json,
    receipt_digest = requested_receipt_digest,
    completed_at = database_now,
    updated_at = database_now
  WHERE staging_run.run_key = requested_run_key
    AND staging_run.request_digest = requested_request_digest
    AND staging_run.status = 'running'
    AND staging_run.claim_version = requested_claim_version
    AND staging_run.lease_expires_at = requested_lease_expires_at
    AND database_now >= staging_run.started_at
    AND database_now < staging_run.lease_expires_at
  RETURNING staging_run.* INTO stored_run;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bot reply staging completion failed';
  END IF;

  RETURN QUERY SELECT
    'completed'::TEXT,
    stored_run.run_key,
    stored_run.request_digest,
    stored_run.audit_key,
    NULL::INTEGER,
    NULL::TIMESTAMPTZ,
    stored_run.completed_at,
    stored_run.receipt_json,
    stored_run.receipt_digest;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bot_reply_staging_run_v1(
  TEXT,
  BIGINT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.read_bot_reply_staging_run_v1(
  BIGINT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.complete_bot_reply_staging_run_v1(
  BIGINT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TEXT,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON TABLE public.bot_reply_staging_runs FROM PUBLIC;

COMMENT ON FUNCTION public.claim_bot_reply_staging_run_v1(
  TEXT,
  BIGINT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
) IS
  'Dormant invoker-rights atomic claim/reclaim wrapper; canonical ownership, definer rights, API EXECUTE and direct-table denial require a later reviewed role migration.';

COMMENT ON FUNCTION public.read_bot_reply_staging_run_v1(
  BIGINT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER
) IS
  'Dormant invoker-rights bounded poll wrapper; canonical ownership, definer rights, API EXECUTE and direct-table denial require a later reviewed role migration.';

COMMENT ON FUNCTION public.complete_bot_reply_staging_run_v1(
  BIGINT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TEXT,
  TEXT
) IS
  'Dormant invoker-rights atomic completion/replay wrapper requiring shared canonical receipt JSON bytes and their exact digest; canonical ownership, definer rights, worker EXECUTE and direct-table denial require a later reviewed role migration.';

DO $$
DECLARE
  wrapper_count INTEGER;
  wrapper_body_count INTEGER;
  matched_trigger_count INTEGER;
  bound_trigger_count INTEGER;
  protected_table_trigger_count INTEGER;
  protected_table_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO wrapper_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  INNER JOIN pg_catalog.pg_language AS language
    ON language.oid = procedure.prolang
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'claim_bot_reply_staging_run_v1',
      'read_bot_reply_staging_run_v1',
      'complete_bot_reply_staging_run_v1'
    )
    AND language.lanname = 'plpgsql'
    AND procedure.prokind = 'f'
    AND procedure.proretset
    AND procedure.prorettype = 'pg_catalog.record'::pg_catalog.regtype
    AND procedure.pronargdefaults = 0
    AND procedure.provariadic = 0
    AND NOT procedure.prosecdef
    AND procedure.provolatile = 'v'
    AND procedure.proparallel = 'u'
    AND procedure.prorows = 1
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[]
    AND pg_catalog.pg_get_function_identity_arguments(procedure.oid) = CASE
      WHEN procedure.proname = 'claim_bot_reply_staging_run_v1' THEN
        'requested_run_key text, requested_tenant_id bigint, requested_request_digest text, requested_actor_external_user_id text, requested_connection_version integer, requested_policy_version integer, requested_release_id text, requested_commit_sha text, requested_artifact_digest text, requested_graph_api_version text, requested_recipient_fingerprint text, requested_rate_limit_method_fingerprint text, requested_lease_duration_seconds integer, requested_audit_key text'
      WHEN procedure.proname = 'read_bot_reply_staging_run_v1' THEN
        'requested_tenant_id bigint, requested_run_key text, requested_request_digest text, requested_audit_key text, requested_release_id text, requested_commit_sha text, requested_artifact_digest text, requested_claim_version integer'
      WHEN procedure.proname = 'complete_bot_reply_staging_run_v1' THEN
        'requested_tenant_id bigint, requested_run_key text, requested_request_digest text, requested_audit_key text, requested_release_id text, requested_commit_sha text, requested_artifact_digest text, requested_claim_version integer, requested_lease_expires_at timestamp with time zone, requested_canonical_receipt_json text, requested_receipt_digest text'
      ELSE NULL
    END
    AND pg_catalog.pg_get_function_result(procedure.oid) =
      'TABLE(outcome text, "runKey" text, "requestDigest" text, "auditKey" text, "claimVersion" integer, "leaseExpiresAt" timestamp with time zone, "completedAt" timestamp with time zone, "receiptJson" text, "receiptDigest" text)'
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
  INTO wrapper_body_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'claim_bot_reply_staging_run_v1',
      'read_bot_reply_staging_run_v1',
      'complete_bot_reply_staging_run_v1'
    )
    AND pg_catalog.pg_get_functiondef(procedure.oid) LIKE
      '%public.bot_reply_staging_runs%'
    AND pg_catalog.pg_get_functiondef(procedure.oid) NOT LIKE
      '%SECURITY DEFINER%';

  WITH expected_triggers (
    table_name,
    trigger_name,
    function_name,
    trigger_type
  ) AS (
    VALUES
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_update_guard',
        'guard_bot_reply_staging_run_update',
        19
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_delete_guard',
        'reject_bot_reply_staging_run_delete',
        11
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_audit_start',
        'audit_bot_reply_staging_run_start',
        5
      ),
      (
        'bot_reply_staging_runs',
        'bot_reply_staging_runs_audit_completion',
        'audit_bot_reply_staging_run_completion',
        17
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_update_guard',
        'guard_bot_reply_staging_audit_immutability',
        27
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_authorization_guard',
        'guard_bot_reply_staging_authorization_audit_immutability',
        27
      )
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO matched_trigger_count
  FROM expected_triggers AS expected
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relname = expected.table_name
  INNER JOIN pg_catalog.pg_namespace AS relation_namespace
    ON relation_namespace.oid = relation.relnamespace
  INNER JOIN pg_catalog.pg_trigger AS trigger
    ON trigger.tgrelid = relation.oid
    AND trigger.tgname = expected.trigger_name
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
    AND procedure.proname = expected.function_name
  INNER JOIN pg_catalog.pg_namespace AS function_namespace
    ON function_namespace.oid = procedure.pronamespace
  WHERE relation_namespace.nspname = 'public'
    AND function_namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND trigger.tgisinternal = false
    AND trigger.tgenabled = 'O'
    AND trigger.tgtype = expected.trigger_type
    AND trigger.tgqual IS NULL
    AND trigger.tgnargs = 0
    AND pg_catalog.cardinality(trigger.tgattr) = 0
    AND pg_catalog.octet_length(trigger.tgargs) = 0
    AND trigger.tgconstraint = 0
    AND trigger.tgdeferrable = false
    AND trigger.tginitdeferred = false
    AND trigger.tgparentid = 0
    AND trigger.tgoldtable IS NULL
    AND trigger.tgnewtable IS NULL;

  SELECT pg_catalog.count(*)::INTEGER
  INTO bound_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = ANY (ARRAY[
      'guard_bot_reply_staging_run_update',
      'reject_bot_reply_staging_run_delete',
      'audit_bot_reply_staging_run_start',
      'audit_bot_reply_staging_run_completion',
      'guard_bot_reply_staging_audit_immutability'
    ]::pg_catalog.TEXT[])
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('bot_reply_staging_runs', 'audit_logs')
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'bot_reply_staging_runs'
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
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
      WHERE attribute.attrelid = relation.oid
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
        AND attribute.attacl IS NOT NULL
        AND privilege.grantee <> relation.relowner
    );

  IF wrapper_count <> 3
    OR wrapper_body_count <> 3
    OR matched_trigger_count <> 6
    OR bound_trigger_count <> 5
    OR protected_table_trigger_count <> 6
    OR protected_table_count <> 1
  THEN
    RAISE EXCEPTION
      'D31-D1a postcondition failed: wrappers %, bodies %, triggers %, bindings %, table triggers %, protected tables %',
      wrapper_count,
      wrapper_body_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count,
      protected_table_count;
  END IF;
END;
$$;
