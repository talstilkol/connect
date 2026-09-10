-- Forward-only hardening for the existing Bot reply staging trigger functions.
-- This migration adds no runtime privilege or staging-delivery activation.

DO $d31d0_precondition$
DECLARE
  matched_function_count integer;
  matched_trigger_count integer;
  bound_trigger_count integer;
  protected_table_trigger_count integer;
BEGIN
  WITH expected_functions (function_name) AS (
    VALUES
      ('guard_bot_reply_staging_run_update'),
      ('reject_bot_reply_staging_run_delete'),
      ('audit_bot_reply_staging_run_start'),
      ('audit_bot_reply_staging_run_completion'),
      ('guard_bot_reply_staging_audit_immutability')
  )
  SELECT count(*)
  INTO matched_function_count
  FROM expected_functions AS expected
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.proname = expected.function_name
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  INNER JOIN pg_catalog.pg_language AS language
    ON language.oid = procedure.prolang
  WHERE namespace.nspname = 'public'
    AND language.lanname = 'plpgsql'
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    AND procedure.prosecdef = false
    AND (
      procedure.proconfig IS NULL
      OR procedure.proconfig =
        ARRAY['search_path=pg_catalog, pg_temp']::text[]
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) AS privilege
      WHERE privilege.privilege_type <> 'EXECUTE'
        OR privilege.grantor <> procedure.proowner
        OR privilege.is_grantable
        OR privilege.grantee NOT IN (0, procedure.proowner)
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
  SELECT count(*)
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

  SELECT count(*)
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
    ]::text[])
    AND trigger.tgisinternal = false;

  SELECT count(*)
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('bot_reply_staging_runs', 'audit_logs')
    AND trigger.tgisinternal = false;

  IF matched_function_count <> 5
    OR matched_trigger_count <> 6
    OR bound_trigger_count <> 5
    OR protected_table_trigger_count <> 6
  THEN
    RAISE EXCEPTION
      'D31-D0 precondition failed: functions %, triggers %, bindings %, table triggers %',
      matched_function_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count;
  END IF;
END;
$d31d0_precondition$;

CREATE OR REPLACE FUNCTION public.audit_bot_reply_staging_run_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id,
    actor_external_user_id,
    action,
    target_type,
    target_id,
    idempotency_key,
    metadata_json,
    created_at
  ) VALUES (
    NEW.tenant_id,
    NEW.actor_external_user_id,
    'bot-reply-staging.started',
    'bot-reply-staging-run',
    NEW.run_key,
    NEW.audit_key,
    pg_catalog.jsonb_build_object(
      'requestDigest', NEW.request_digest,
      'releaseId', NEW.release_id,
      'artifactDigest', NEW.artifact_digest
    ),
    NEW.started_at
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_bot_reply_staging_run_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.status = 'running' AND NEW.status = 'completed' THEN
    INSERT INTO public.audit_logs (
      tenant_id,
      actor_external_user_id,
      action,
      target_type,
      target_id,
      idempotency_key,
      metadata_json,
      created_at
    ) VALUES (
      NEW.tenant_id,
      NEW.actor_external_user_id,
      'bot-reply-staging.completed',
      'bot-reply-staging-run',
      NEW.run_key,
      NEW.audit_key,
      pg_catalog.jsonb_build_object(
        'requestDigest', NEW.request_digest,
        'receiptDigest', NEW.receipt_digest,
        'claimVersion', NEW.claim_version
      ),
      NEW.completed_at
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_bot_reply_staging_run_update()
  SECURITY INVOKER;
ALTER FUNCTION public.guard_bot_reply_staging_run_update()
  SET search_path = pg_catalog, pg_temp;

ALTER FUNCTION public.reject_bot_reply_staging_run_delete()
  SECURITY INVOKER;
ALTER FUNCTION public.reject_bot_reply_staging_run_delete()
  SET search_path = pg_catalog, pg_temp;

ALTER FUNCTION public.guard_bot_reply_staging_audit_immutability()
  SECURITY INVOKER;
ALTER FUNCTION public.guard_bot_reply_staging_audit_immutability()
  SET search_path = pg_catalog, pg_temp;

REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_run_update()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_run_delete()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_bot_reply_staging_run_start()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_bot_reply_staging_run_completion()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_audit_immutability()
  FROM PUBLIC;

DO $d31d0_postcondition$
DECLARE
  hardened_function_count integer;
  qualified_audit_function_count integer;
  matched_trigger_count integer;
  bound_trigger_count integer;
  protected_table_trigger_count integer;
BEGIN
  SELECT count(*)
  INTO hardened_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = ANY (ARRAY[
      'guard_bot_reply_staging_run_update',
      'reject_bot_reply_staging_run_delete',
      'audit_bot_reply_staging_run_start',
      'audit_bot_reply_staging_run_completion',
      'guard_bot_reply_staging_audit_immutability'
    ]::text[])
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    AND procedure.prosecdef = false
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::text[]
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) AS privilege
      WHERE privilege.privilege_type <> 'EXECUTE'
        OR privilege.grantor <> procedure.proowner
        OR privilege.grantee <> procedure.proowner
        OR privilege.is_grantable
    );

  SELECT count(*)
  INTO qualified_audit_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = ANY (ARRAY[
      'audit_bot_reply_staging_run_start',
      'audit_bot_reply_staging_run_completion'
    ]::text[])
    AND pg_catalog.strpos(
      pg_catalog.pg_get_functiondef(procedure.oid),
      pg_catalog.concat('INSERT', ' INTO public.audit_logs')
    ) > 0;

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
  SELECT count(*)
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

  SELECT count(*)
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
    ]::text[])
    AND trigger.tgisinternal = false;

  SELECT count(*)
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('bot_reply_staging_runs', 'audit_logs')
    AND trigger.tgisinternal = false;

  IF hardened_function_count <> 5
    OR qualified_audit_function_count <> 2
    OR matched_trigger_count <> 6
    OR bound_trigger_count <> 5
    OR protected_table_trigger_count <> 6
  THEN
    RAISE EXCEPTION
      'D31-D0 postcondition failed: functions %, audit %, triggers %, bindings %, table triggers %',
      hardened_function_count,
      qualified_audit_function_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count;
  END IF;
END;
$d31d0_postcondition$;
