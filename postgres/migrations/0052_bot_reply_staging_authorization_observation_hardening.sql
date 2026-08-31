-- Forward-only hardening for Bot reply staging authorization and observation
-- trigger functions. This migration adds no runtime privilege or delivery
-- activation. It also rejects direct spoofing of the four trigger-owned audit
-- actions while preserving their nested trigger writes.

DO $d31d1b_precondition$
DECLARE
  matched_function_count INTEGER;
  named_function_count INTEGER;
  matched_trigger_count INTEGER;
  bound_trigger_count INTEGER;
  protected_table_trigger_count INTEGER;
  protected_table_count INTEGER;
  existing_audit_insert_guard_count INTEGER;
  unsafe_default_function_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO named_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO matched_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  INNER JOIN pg_catalog.pg_language AS language
    ON language.oid = procedure.prolang
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability'
    )
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype =
      'pg_catalog.trigger'::pg_catalog.regtype
    AND language.lanname = 'plpgsql'
    AND NOT procedure.prosecdef
    AND (
      procedure.proconfig IS NULL
      OR procedure.proconfig =
        ARRAY['search_path=pg_catalog, pg_temp']::pg_catalog.TEXT[]
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
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_insert_guard',
        'enforce_bot_reply_staging_authorization_insert',
        7
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_update_guard',
        'reject_bot_reply_staging_authorization_mutation',
        19
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_delete_guard',
        'reject_bot_reply_staging_authorization_mutation',
        11
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_insert_audit',
        'audit_bot_reply_staging_authorization_insert',
        5
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_authorization_guard',
        'guard_bot_reply_staging_authorization_audit_immutability',
        27
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_update_guard',
        'guard_bot_reply_staging_audit_immutability',
        27
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_insert_guard',
        'enforce_bot_reply_staging_observation_insert',
        7
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_update_guard',
        'reject_bot_reply_staging_observation_mutation',
        19
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_delete_guard',
        'reject_bot_reply_staging_observation_mutation',
        11
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
    AND NOT trigger.tgisinternal
    AND trigger.tgenabled = 'O'
    AND trigger.tgtype = expected.trigger_type
    AND trigger.tgqual IS NULL
    AND trigger.tgnargs = 0
    AND pg_catalog.cardinality(trigger.tgattr) = 0
    AND pg_catalog.octet_length(trigger.tgargs) = 0
    AND trigger.tgconstraint = 0
    AND NOT trigger.tgdeferrable
    AND NOT trigger.tginitdeferred
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
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability'
    ]::pg_catalog.TEXT[])
    AND NOT trigger.tgisinternal;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_authorization_events',
      'bot_reply_staging_observation_events',
      'audit_logs'
    )
    AND NOT trigger.tgisinternal;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_authorization_events',
      'bot_reply_staging_observation_events',
      'audit_logs'
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
  INTO existing_audit_insert_guard_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'guard_bot_reply_staging_audit_insert';

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

  IF named_function_count <> 7
    OR matched_function_count <> 7
    OR matched_trigger_count <> 9
    OR bound_trigger_count <> 9
    OR protected_table_trigger_count <> 9
    OR protected_table_count <> 3
    OR existing_audit_insert_guard_count <> 0
    OR unsafe_default_function_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1b precondition failed: named functions %, functions %, triggers %, bindings %, table triggers %, protected tables %, existing audit insert guard %, unsafe default ACLs %',
      named_function_count,
      matched_function_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count,
      protected_table_count,
      existing_audit_insert_guard_count,
      unsafe_default_function_acl_count;
  END IF;
END;
$d31d1b_precondition$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_staging_authorization_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  connection_record public.meta_connections%ROWTYPE;
  policy_record public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  existing_record public.bot_reply_staging_authorization_events%ROWTYPE;
  previous_record public.bot_reply_staging_authorization_events%ROWTYPE;
  next_authorization_version INTEGER;
BEGIN
  SELECT connection.*
  INTO connection_record
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT authorization_event.*
  INTO existing_record
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.event_key = NEW.event_key;

  IF existing_record.event_key IS NOT NULL THEN
    IF existing_record IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION
        'Bot reply staging authorization identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    pg_catalog.max(authorization_event.authorization_version) + 1,
    1
  )
  INTO next_authorization_version
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = NEW.tenant_id;

  IF NEW.authorization_version <> next_authorization_version THEN
    RAISE EXCEPTION
      'Bot reply staging authorization version is not sequential';
  END IF;

  SELECT authorization_event.*
  INTO previous_record
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = NEW.tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1;

  IF NEW.status = 'approved' THEN
    IF connection_record.tenant_id IS NULL
      OR connection_record.status <> 'connected'
      OR connection_record.version <> NEW.connection_version
    THEN
      RAISE EXCEPTION
        'Bot reply staging authorization lacks current Meta connection';
    END IF;

    SELECT policy.*
    INTO policy_record
    FROM public.whatsapp_campaign_delivery_policy_events AS policy
    WHERE policy.tenant_id = NEW.tenant_id
      AND policy.policy_version = NEW.policy_version;

    IF policy_record.tenant_id IS NULL
      OR policy_record.policy_version <> (
        SELECT pg_catalog.max(latest.policy_version)
        FROM public.whatsapp_campaign_delivery_policy_events AS latest
        WHERE latest.tenant_id = NEW.tenant_id
      )
      OR policy_record.connection_version <> NEW.connection_version
      OR policy_record.delivery_state <> 'enabled'
      OR policy_record.evidence_checked_at > NEW.recorded_at
      OR policy_record.recorded_at > NEW.recorded_at
      OR NEW.recorded_at >= policy_record.evidence_expires_at
      OR NOT EXISTS (
        SELECT 1
        FROM public.meta_credential_envelopes AS credential
        WHERE credential.tenant_id = NEW.tenant_id
      )
    THEN
      RAISE EXCEPTION
        'Bot reply staging authorization lacks current safety evidence';
    END IF;
  ELSE
    IF previous_record.event_key IS NULL
      OR previous_record.status <> 'approved'
      OR previous_record.environment IS DISTINCT FROM NEW.environment
      OR previous_record.connection_mode IS DISTINCT FROM NEW.connection_mode
      OR previous_record.connection_version IS DISTINCT FROM
        NEW.connection_version
      OR previous_record.policy_version IS DISTINCT FROM NEW.policy_version
      OR previous_record.recipient_fingerprint IS DISTINCT FROM
        NEW.recipient_fingerprint
      OR previous_record.recipient_opt_in_recorded IS DISTINCT FROM
        NEW.recipient_opt_in_recorded
      OR previous_record.recipient_opt_in_recorded_at IS DISTINCT FROM
        NEW.recipient_opt_in_recorded_at
      OR previous_record.recipient_expires_at IS DISTINCT FROM
        NEW.recipient_expires_at
      OR previous_record.rate_limit_approved_by IS DISTINCT FROM
        NEW.rate_limit_approved_by
      OR previous_record.rate_limit_approved_at IS DISTINCT FROM
        NEW.rate_limit_approved_at
      OR previous_record.rate_limit_expires_at IS DISTINCT FROM
        NEW.rate_limit_expires_at
      OR previous_record.rate_limit_method_fingerprint IS DISTINCT FROM
        NEW.rate_limit_method_fingerprint
    THEN
      RAISE EXCEPTION
        'Bot reply staging authorization revocation is invalid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_staging_authorization_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging authorization events are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_bot_reply_staging_authorization_insert()
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
    CASE
      WHEN NEW.status = 'approved'
        THEN 'bot-reply-staging.authorization-approved'
      ELSE 'bot-reply-staging.authorization-revoked'
    END,
    'bot-reply-staging-authorization',
    NEW.tenant_id::pg_catalog.TEXT,
    NEW.event_key,
    pg_catalog.jsonb_build_object(
      'authorizationVersion', NEW.authorization_version,
      'connectionVersion', NEW.connection_version,
      'policyVersion', NEW.policy_version,
      'recipientFingerprint', NEW.recipient_fingerprint,
      'recipientExpiresAt', NEW.recipient_expires_at,
      'rateLimitMethodFingerprint', NEW.rate_limit_method_fingerprint,
      'rateLimitExpiresAt', NEW.rate_limit_expires_at,
      'status', NEW.status
    ),
    NEW.recorded_at
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_bot_reply_staging_authorization_audit_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.action IN (
      'bot-reply-staging.authorization-approved',
      'bot-reply-staging.authorization-revoked'
    ) THEN
      RAISE EXCEPTION 'Bot reply staging authorization audit is immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.action IN (
      'bot-reply-staging.authorization-approved',
      'bot-reply-staging.authorization-revoked'
    )
    OR NEW.action IN (
      'bot-reply-staging.authorization-approved',
      'bot-reply-staging.authorization-revoked'
    )
  THEN
    RAISE EXCEPTION 'Bot reply staging authorization audit is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_bot_reply_staging_audit_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.action IN (
      'bot-reply-staging.started',
      'bot-reply-staging.completed'
    ) THEN
      RAISE EXCEPTION 'Bot reply staging audit is immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.action IN (
      'bot-reply-staging.started',
      'bot-reply-staging.completed'
    )
    OR NEW.action IN (
      'bot-reply-staging.started',
      'bot-reply-staging.completed'
    )
  THEN
    RAISE EXCEPTION 'Bot reply staging audit is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_bot_reply_staging_observation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  active_run public.bot_reply_staging_runs%ROWTYPE;
  database_now TIMESTAMPTZ;
BEGIN
  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = NEW.run_key
  FOR UPDATE;

  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF active_run.run_key IS NULL
    OR active_run.status <> 'running'
    OR NEW.claim_version <> active_run.claim_version
    OR NEW.recipient_fingerprint <> active_run.recipient_fingerprint
    OR NEW.observed_at < active_run.started_at
    OR NEW.observed_at >= active_run.lease_expires_at
    OR NEW.observed_at > database_now
    OR database_now >= active_run.lease_expires_at
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
    FROM public.bot_reply_deliveries AS delivery
    WHERE delivery.delivery_key = NEW.subject_delivery_key
      AND delivery.tenant_id = active_run.tenant_id
  ) THEN
    RAISE EXCEPTION 'Bot reply staging observation subject is invalid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bot_reply_staging_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging observation is immutable';
END;
$$;

CREATE FUNCTION public.guard_bot_reply_staging_audit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.action IN (
    'bot-reply-staging.started',
    'bot-reply-staging.completed',
    'bot-reply-staging.authorization-approved',
    'bot-reply-staging.authorization-revoked'
  )
    AND pg_catalog.pg_trigger_depth() < 2
  THEN
    RAISE EXCEPTION 'Bot reply staging audit insert lacks its source trigger';
  END IF;

  IF NEW.action = 'bot-reply-staging.started'
    AND NOT EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_runs AS staging_run
      WHERE staging_run.tenant_id = NEW.tenant_id
        AND staging_run.actor_external_user_id =
          NEW.actor_external_user_id
        AND NEW.target_type = 'bot-reply-staging-run'
        AND NEW.target_id = staging_run.run_key
        AND NEW.idempotency_key = staging_run.audit_key
        AND NEW.created_at = staging_run.started_at
        AND NEW.metadata_json = pg_catalog.jsonb_build_object(
          'requestDigest', staging_run.request_digest,
          'releaseId', staging_run.release_id,
          'artifactDigest', staging_run.artifact_digest
        )
    )
  THEN
    RAISE EXCEPTION 'Bot reply staging start audit source is invalid';
  ELSIF NEW.action = 'bot-reply-staging.completed'
    AND NOT EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_runs AS staging_run
      WHERE staging_run.tenant_id = NEW.tenant_id
        AND staging_run.actor_external_user_id =
          NEW.actor_external_user_id
        AND staging_run.status = 'completed'
        AND NEW.target_type = 'bot-reply-staging-run'
        AND NEW.target_id = staging_run.run_key
        AND NEW.idempotency_key = staging_run.audit_key
        AND NEW.created_at = staging_run.completed_at
        AND NEW.metadata_json = pg_catalog.jsonb_build_object(
          'requestDigest', staging_run.request_digest,
          'receiptDigest', staging_run.receipt_digest,
          'claimVersion', staging_run.claim_version
        )
    )
  THEN
    RAISE EXCEPTION 'Bot reply staging completion audit source is invalid';
  ELSIF NEW.action IN (
      'bot-reply-staging.authorization-approved',
      'bot-reply-staging.authorization-revoked'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_authorization_events AS authorization_event
      WHERE authorization_event.tenant_id = NEW.tenant_id
        AND authorization_event.actor_external_user_id =
          NEW.actor_external_user_id
        AND authorization_event.status = CASE
          WHEN NEW.action = 'bot-reply-staging.authorization-approved'
            THEN 'approved'
          ELSE 'revoked'
        END
        AND NEW.target_type = 'bot-reply-staging-authorization'
        AND NEW.target_id = authorization_event.tenant_id::pg_catalog.TEXT
        AND NEW.idempotency_key = authorization_event.event_key
        AND NEW.created_at = authorization_event.recorded_at
        AND NEW.metadata_json = pg_catalog.jsonb_build_object(
          'authorizationVersion', authorization_event.authorization_version,
          'connectionVersion', authorization_event.connection_version,
          'policyVersion', authorization_event.policy_version,
          'recipientFingerprint', authorization_event.recipient_fingerprint,
          'recipientExpiresAt', authorization_event.recipient_expires_at,
          'rateLimitMethodFingerprint',
            authorization_event.rate_limit_method_fingerprint,
          'rateLimitExpiresAt', authorization_event.rate_limit_expires_at,
          'status', authorization_event.status
        )
    )
  THEN
    RAISE EXCEPTION 'Bot reply staging authorization audit source is invalid';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_bot_reply_staging_authorization_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_authorization_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_bot_reply_staging_authorization_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_authorization_audit_immutability()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_audit_immutability()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_bot_reply_staging_observation_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_bot_reply_staging_observation_mutation()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_bot_reply_staging_audit_insert()
  FROM PUBLIC;

CREATE TRIGGER audit_logs_bot_reply_staging_insert_guard
BEFORE INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.guard_bot_reply_staging_audit_insert();

DO $d31d1b_postcondition$
DECLARE
  hardened_function_count INTEGER;
  named_function_count INTEGER;
  qualified_function_count INTEGER;
  matched_trigger_count INTEGER;
  bound_trigger_count INTEGER;
  protected_table_trigger_count INTEGER;
  protected_table_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO named_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability',
      'guard_bot_reply_staging_audit_insert'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO hardened_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  INNER JOIN pg_catalog.pg_language AS language
    ON language.oid = procedure.prolang
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability',
      'guard_bot_reply_staging_audit_insert'
    )
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype =
      'pg_catalog.trigger'::pg_catalog.regtype
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
      WHERE privilege.privilege_type <> 'EXECUTE'
        OR privilege.grantor <> procedure.proowner
        OR privilege.grantee <> procedure.proowner
        OR privilege.is_grantable
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO qualified_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.prokind = 'f'
    AND procedure.pronargs = 0
    AND procedure.prorettype =
      'pg_catalog.trigger'::pg_catalog.regtype
    AND (
      (
        procedure.proname =
          'enforce_bot_reply_staging_authorization_insert'
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.meta_connections AS connection'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.bot_reply_staging_authorization_events AS authorization_event'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.whatsapp_campaign_delivery_policy_events AS policy'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.meta_credential_envelopes AS credential'
        ) > 0
      )
      OR (
        procedure.proname = 'audit_bot_reply_staging_authorization_insert'
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          pg_catalog.concat('INSERT', ' INTO public.audit_logs')
        ) > 0
      )
      OR (
        procedure.proname = 'enforce_bot_reply_staging_observation_insert'
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.bot_reply_staging_runs AS staging_run'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.bot_reply_deliveries AS delivery'
        ) > 0
      )
      OR (
        procedure.proname = 'guard_bot_reply_staging_audit_insert'
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'pg_catalog.pg_trigger_depth() < 2'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.bot_reply_staging_runs AS staging_run'
        ) > 0
        AND pg_catalog.strpos(
          pg_catalog.pg_get_functiondef(procedure.oid),
          'FROM public.bot_reply_staging_authorization_events AS authorization_event'
        ) > 0
      )
    );

  WITH expected_triggers (
    table_name,
    trigger_name,
    function_name,
    trigger_type
  ) AS (
    VALUES
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_insert_guard',
        'enforce_bot_reply_staging_authorization_insert',
        7
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_update_guard',
        'reject_bot_reply_staging_authorization_mutation',
        19
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_delete_guard',
        'reject_bot_reply_staging_authorization_mutation',
        11
      ),
      (
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_insert_audit',
        'audit_bot_reply_staging_authorization_insert',
        5
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_authorization_guard',
        'guard_bot_reply_staging_authorization_audit_immutability',
        27
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_update_guard',
        'guard_bot_reply_staging_audit_immutability',
        27
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_insert_guard',
        'enforce_bot_reply_staging_observation_insert',
        7
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_update_guard',
        'reject_bot_reply_staging_observation_mutation',
        19
      ),
      (
        'bot_reply_staging_observation_events',
        'bot_reply_staging_observation_delete_guard',
        'reject_bot_reply_staging_observation_mutation',
        11
      ),
      (
        'audit_logs',
        'audit_logs_bot_reply_staging_insert_guard',
        'guard_bot_reply_staging_audit_insert',
        7
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
    AND NOT trigger.tgisinternal
    AND trigger.tgenabled = 'O'
    AND trigger.tgtype = expected.trigger_type
    AND trigger.tgqual IS NULL
    AND trigger.tgnargs = 0
    AND pg_catalog.cardinality(trigger.tgattr) = 0
    AND pg_catalog.octet_length(trigger.tgargs) = 0
    AND trigger.tgconstraint = 0
    AND NOT trigger.tgdeferrable
    AND NOT trigger.tginitdeferred
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
      'enforce_bot_reply_staging_authorization_insert',
      'reject_bot_reply_staging_authorization_mutation',
      'audit_bot_reply_staging_authorization_insert',
      'guard_bot_reply_staging_authorization_audit_immutability',
      'enforce_bot_reply_staging_observation_insert',
      'reject_bot_reply_staging_observation_mutation',
      'guard_bot_reply_staging_audit_immutability',
      'guard_bot_reply_staging_audit_insert'
    ]::pg_catalog.TEXT[])
    AND NOT trigger.tgisinternal;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_authorization_events',
      'bot_reply_staging_observation_events',
      'audit_logs'
    )
    AND NOT trigger.tgisinternal;

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_table_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_authorization_events',
      'bot_reply_staging_observation_events',
      'audit_logs'
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

  IF named_function_count <> 8
    OR hardened_function_count <> 8
    OR qualified_function_count <> 4
    OR matched_trigger_count <> 10
    OR bound_trigger_count <> 10
    OR protected_table_trigger_count <> 10
    OR protected_table_count <> 3
  THEN
    RAISE EXCEPTION
      'D31-D1b postcondition failed: named functions %, functions %, qualified bodies %, triggers %, bindings %, table triggers %, protected tables %',
      named_function_count,
      hardened_function_count,
      qualified_function_count,
      matched_trigger_count,
      bound_trigger_count,
      protected_table_trigger_count,
      protected_table_count;
  END IF;
END;
$d31d1b_postcondition$;
