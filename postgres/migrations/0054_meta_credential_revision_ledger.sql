-- Dormant Meta credential revision identity and append-only audit ledger.
-- The existing repository UPSERT remains valid because PostgreSQL derives the
-- revision and digest in triggers. This migration grants no runtime access.

DO $d31d1db_precondition$
DECLARE
  envelope_table_count INTEGER;
  conflicting_column_count INTEGER;
  conflicting_relation_count INTEGER;
  conflicting_function_count INTEGER;
  conflicting_trigger_count INTEGER;
  unsafe_default_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO envelope_table_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'meta_credential_envelopes'
    AND relation.relkind = 'r';

  SELECT pg_catalog.count(*)::INTEGER
  INTO conflicting_column_count
  FROM information_schema.columns AS column_definition
  WHERE column_definition.table_schema = 'public'
    AND column_definition.table_name = 'meta_credential_envelopes'
    AND column_definition.column_name IN (
      'credential_revision',
      'envelope_digest'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO conflicting_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'meta_credential_revision_events';

  SELECT pg_catalog.count(*)::INTEGER
  INTO conflicting_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'derive_meta_credential_envelope_digest_v1',
      'derive_meta_credential_revision_event_key_v1',
      'prepare_meta_credential_envelope_revision',
      'record_meta_credential_revision_event',
      'guard_meta_credential_revision_event_insert',
      'reject_meta_credential_revision_event_mutation'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO conflicting_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'meta_credential_envelopes',
      'meta_credential_revision_events'
    )
    AND trigger.tgisinternal = false;

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

  IF envelope_table_count <> 1
    OR conflicting_column_count <> 0
    OR conflicting_relation_count <> 0
    OR conflicting_function_count <> 0
    OR conflicting_trigger_count <> 0
    OR unsafe_default_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-B-B1 precondition failed: envelope %, columns %, relations %, functions %, triggers %, unsafe default ACLs %',
      envelope_table_count,
      conflicting_column_count,
      conflicting_relation_count,
      conflicting_function_count,
      conflicting_trigger_count,
      unsafe_default_acl_count;
  END IF;
END;
$d31d1db_precondition$;

CREATE FUNCTION public.derive_meta_credential_envelope_digest_v1(
  requested_tenant_id BIGINT,
  requested_key_version TEXT,
  requested_initialization_vector TEXT,
  requested_ciphertext TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT 'sha256:' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        'connect:meta-credential-envelope:v1|'
        || pg_catalog.octet_length(requested_tenant_id::TEXT)::TEXT
        || ':' || requested_tenant_id::TEXT
        || '|' || pg_catalog.octet_length(requested_key_version)::TEXT
        || ':' || requested_key_version
        || '|' || pg_catalog.octet_length(
          requested_initialization_vector
        )::TEXT
        || ':' || requested_initialization_vector
        || '|' || pg_catalog.octet_length(requested_ciphertext)::TEXT
        || ':' || requested_ciphertext,
        'UTF8'
      )
    ),
    'hex'
  )
$$;

CREATE FUNCTION public.derive_meta_credential_revision_event_key_v1(
  requested_tenant_id BIGINT,
  requested_credential_revision BIGINT,
  requested_envelope_digest TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT 'meta_credential_revision_v1_' || pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        'connect:meta-credential-revision-event:v1|'
        || pg_catalog.octet_length(requested_tenant_id::TEXT)::TEXT
        || ':' || requested_tenant_id::TEXT
        || '|' || pg_catalog.octet_length(
          requested_credential_revision::TEXT
        )::TEXT
        || ':' || requested_credential_revision::TEXT
        || '|' || pg_catalog.octet_length(
          requested_envelope_digest
        )::TEXT
        || ':' || requested_envelope_digest,
        'UTF8'
      )
    ),
    'hex'
  )
$$;

ALTER TABLE public.meta_credential_envelopes
  ADD COLUMN credential_revision BIGINT,
  ADD COLUMN envelope_digest TEXT;

UPDATE public.meta_credential_envelopes AS credential
SET
  credential_revision = 1,
  envelope_digest = public.derive_meta_credential_envelope_digest_v1(
    credential.tenant_id,
    credential.key_version,
    credential.initialization_vector,
    credential.ciphertext
  );

ALTER TABLE public.meta_credential_envelopes
  ALTER COLUMN credential_revision SET NOT NULL,
  ALTER COLUMN envelope_digest SET NOT NULL,
  ADD CONSTRAINT meta_credential_envelopes_revision_positive
    CHECK (credential_revision >= 1),
  ADD CONSTRAINT meta_credential_envelopes_digest_sha256
    CHECK (
      envelope_digest OPERATOR(pg_catalog.~) '^sha256:[a-f0-9]{64}$'
    ),
  ADD CONSTRAINT meta_credential_envelopes_revision_identity_uq
    UNIQUE (tenant_id, credential_revision, envelope_digest);

CREATE TABLE public.meta_credential_revision_events (
  event_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  credential_revision BIGINT NOT NULL,
  envelope_digest TEXT NOT NULL,
  key_version TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT meta_credential_revision_events_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT meta_credential_revision_events_event_key_sha256
    CHECK (
      event_key OPERATOR(pg_catalog.~)
        '^meta_credential_revision_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT meta_credential_revision_events_revision_positive
    CHECK (credential_revision >= 1),
  CONSTRAINT meta_credential_revision_events_digest_sha256
    CHECK (
      envelope_digest OPERATOR(pg_catalog.~) '^sha256:[a-f0-9]{64}$'
    ),
  CONSTRAINT meta_credential_revision_events_key_version_valid
    CHECK (key_version = 'v1'),
  CONSTRAINT meta_credential_revision_events_timestamps_canonical
    CHECK (
      recorded_at = pg_catalog.date_trunc('milliseconds', recorded_at)
      AND created_at = recorded_at
    ),
  CONSTRAINT meta_credential_revision_events_tenant_revision_uq
    UNIQUE (tenant_id, credential_revision),
  CONSTRAINT meta_credential_revision_events_tenant_digest_uq
    UNIQUE (tenant_id, envelope_digest)
);

CREATE INDEX meta_credential_revision_events_tenant_recorded_idx
  ON public.meta_credential_revision_events (
    tenant_id,
    recorded_at,
    credential_revision
  );

-- This is a one-time, deterministic migration of existing encrypted envelope
-- identity. It copies no IV, ciphertext, token, provider identifier, or PII.
INSERT INTO public.meta_credential_revision_events (
  event_key,
  tenant_id,
  credential_revision,
  envelope_digest,
  key_version,
  recorded_at,
  created_at
)
SELECT
  public.derive_meta_credential_revision_event_key_v1(
    credential.tenant_id,
    credential.credential_revision,
    credential.envelope_digest
  ),
  credential.tenant_id,
  credential.credential_revision,
  credential.envelope_digest,
  credential.key_version,
  credential.updated_at,
  credential.updated_at
FROM public.meta_credential_envelopes AS credential
ORDER BY credential.tenant_id;

CREATE FUNCTION public.prepare_meta_credential_envelope_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  derived_digest TEXT;
  database_updated_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.credential_revision IS NOT NULL
      OR NEW.envelope_digest IS NOT NULL
    THEN
      RAISE EXCEPTION
        'Meta credential revision identity is database-derived';
    END IF;

    database_updated_at := pg_catalog.date_trunc(
      'milliseconds',
      pg_catalog.clock_timestamp()
    );
    NEW.created_at := database_updated_at;
    NEW.updated_at := database_updated_at;
    NEW.credential_revision := 1;
    NEW.envelope_digest :=
      public.derive_meta_credential_envelope_digest_v1(
        NEW.tenant_id,
        NEW.key_version,
        NEW.initialization_vector,
        NEW.ciphertext
      );
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Meta credential envelope identity is immutable';
  END IF;

  IF NEW.credential_revision IS DISTINCT FROM OLD.credential_revision
    OR NEW.envelope_digest IS DISTINCT FROM OLD.envelope_digest
  THEN
    RAISE EXCEPTION
      'Meta credential revision identity is database-derived';
  END IF;

  IF ROW(
      NEW.key_version,
      NEW.initialization_vector,
      NEW.ciphertext
    ) IS NOT DISTINCT FROM ROW(
      OLD.key_version,
      OLD.initialization_vector,
      OLD.ciphertext
    )
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  derived_digest := public.derive_meta_credential_envelope_digest_v1(
    NEW.tenant_id,
    NEW.key_version,
    NEW.initialization_vector,
    NEW.ciphertext
  );

  IF derived_digest = OLD.envelope_digest THEN
    RAISE EXCEPTION 'Meta credential envelope digest collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.meta_credential_revision_events AS event
    WHERE event.tenant_id = OLD.tenant_id
      AND event.envelope_digest = derived_digest
  ) THEN
    RAISE EXCEPTION
      'Meta credential envelope digest cannot be reused';
  END IF;

  database_updated_at := GREATEST(
    pg_catalog.date_trunc(
      'milliseconds',
      pg_catalog.clock_timestamp()
    ),
    OLD.updated_at + INTERVAL '1 millisecond'
  );
  NEW.credential_revision := OLD.credential_revision + 1;
  NEW.envelope_digest := derived_digest;
  NEW.updated_at := database_updated_at;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_meta_credential_revision_event_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF pg_catalog.pg_trigger_depth() <> 2
    OR NOT EXISTS (
      SELECT 1
      FROM public.meta_credential_envelopes AS credential
      WHERE credential.tenant_id = NEW.tenant_id
        AND credential.credential_revision = NEW.credential_revision
        AND credential.envelope_digest = NEW.envelope_digest
        AND credential.key_version = NEW.key_version
        AND credential.updated_at = NEW.recorded_at
    )
    OR NEW.created_at <> NEW.recorded_at
    OR NEW.event_key <>
      public.derive_meta_credential_revision_event_key_v1(
        NEW.tenant_id,
        NEW.credential_revision,
        NEW.envelope_digest
      )
  THEN
    RAISE EXCEPTION
      'Meta credential revision event insert is trigger-owned';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.record_meta_credential_revision_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.credential_revision = OLD.credential_revision
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.meta_credential_revision_events (
    event_key,
    tenant_id,
    credential_revision,
    envelope_digest,
    key_version,
    recorded_at,
    created_at
  ) VALUES (
    public.derive_meta_credential_revision_event_key_v1(
      NEW.tenant_id,
      NEW.credential_revision,
      NEW.envelope_digest
    ),
    NEW.tenant_id,
    NEW.credential_revision,
    NEW.envelope_digest,
    NEW.key_version,
    NEW.updated_at,
    NEW.updated_at
  );

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.reject_meta_credential_revision_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Meta credential revision events are append-only';
END;
$$;

CREATE TRIGGER meta_credential_envelopes_prepare_insert
BEFORE INSERT ON public.meta_credential_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.prepare_meta_credential_envelope_revision();

CREATE TRIGGER meta_credential_envelopes_prepare_update
BEFORE UPDATE ON public.meta_credential_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.prepare_meta_credential_envelope_revision();

CREATE TRIGGER meta_credential_envelopes_record_revision
AFTER INSERT OR UPDATE ON public.meta_credential_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.record_meta_credential_revision_event();

CREATE TRIGGER meta_credential_revision_events_insert_guard
BEFORE INSERT ON public.meta_credential_revision_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_meta_credential_revision_event_insert();

CREATE TRIGGER meta_credential_revision_events_update_guard
BEFORE UPDATE ON public.meta_credential_revision_events
FOR EACH ROW
EXECUTE FUNCTION public.reject_meta_credential_revision_event_mutation();

CREATE TRIGGER meta_credential_revision_events_delete_guard
BEFORE DELETE ON public.meta_credential_revision_events
FOR EACH ROW
EXECUTE FUNCTION public.reject_meta_credential_revision_event_mutation();

CREATE TRIGGER meta_credential_revision_events_truncate_guard
BEFORE TRUNCATE ON public.meta_credential_revision_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_meta_credential_revision_event_mutation();

REVOKE ALL ON TABLE public.meta_credential_revision_events FROM PUBLIC;
REVOKE ALL ON FUNCTION public.derive_meta_credential_envelope_digest_v1(
  BIGINT,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.derive_meta_credential_revision_event_key_v1(
  BIGINT,
  BIGINT,
  TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_meta_credential_envelope_revision()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_meta_credential_revision_event_insert()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_meta_credential_revision_event()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_meta_credential_revision_event_mutation()
  FROM PUBLIC;

DO $d31d1db_postcondition$
DECLARE
  envelope_column_count INTEGER;
  event_columns TEXT[];
  function_count INTEGER;
  trigger_count INTEGER;
  mismatched_event_count INTEGER;
  non_owner_privilege_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO envelope_column_count
  FROM information_schema.columns AS column_definition
  WHERE column_definition.table_schema = 'public'
    AND column_definition.table_name = 'meta_credential_envelopes'
    AND column_definition.column_name IN (
      'credential_revision',
      'envelope_digest'
    )
    AND column_definition.is_nullable = 'NO'
    AND column_definition.column_default IS NULL;

  SELECT pg_catalog.array_agg(
    column_definition.column_name::TEXT
    ORDER BY column_definition.ordinal_position
  )
  INTO event_columns
  FROM information_schema.columns AS column_definition
  WHERE column_definition.table_schema = 'public'
    AND column_definition.table_name =
      'meta_credential_revision_events';

  SELECT pg_catalog.count(*)::INTEGER
  INTO function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'derive_meta_credential_envelope_digest_v1',
      'derive_meta_credential_revision_event_key_v1',
      'prepare_meta_credential_envelope_revision',
      'record_meta_credential_revision_event',
      'guard_meta_credential_revision_event_insert',
      'reject_meta_credential_revision_event_mutation'
    )
    AND procedure.prokind = 'f'
    AND procedure.prosecdef = false
    AND procedure.proconfig =
      ARRAY['search_path=pg_catalog, pg_temp']::TEXT[];

  WITH expected_triggers(
    table_name,
    trigger_name,
    function_name,
    trigger_type
  ) AS (
    VALUES
      (
        'meta_credential_envelopes',
        'meta_credential_envelopes_prepare_insert',
        'prepare_meta_credential_envelope_revision',
        7
      ),
      (
        'meta_credential_envelopes',
        'meta_credential_envelopes_prepare_update',
        'prepare_meta_credential_envelope_revision',
        19
      ),
      (
        'meta_credential_envelopes',
        'meta_credential_envelopes_record_revision',
        'record_meta_credential_revision_event',
        21
      ),
      (
        'meta_credential_revision_events',
        'meta_credential_revision_events_insert_guard',
        'guard_meta_credential_revision_event_insert',
        7
      ),
      (
        'meta_credential_revision_events',
        'meta_credential_revision_events_update_guard',
        'reject_meta_credential_revision_event_mutation',
        19
      ),
      (
        'meta_credential_revision_events',
        'meta_credential_revision_events_delete_guard',
        'reject_meta_credential_revision_event_mutation',
        11
      ),
      (
        'meta_credential_revision_events',
        'meta_credential_revision_events_truncate_guard',
        'reject_meta_credential_revision_event_mutation',
        34
      )
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO trigger_count
  FROM expected_triggers AS expected
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
   AND relation.relname = expected.table_name
  INNER JOIN pg_catalog.pg_trigger AS trigger
    ON trigger.tgrelid = relation.oid
   AND trigger.tgname = expected.trigger_name
   AND trigger.tgtype = expected.trigger_type
   AND trigger.tgisinternal = false
   AND trigger.tgenabled = 'O'
  INNER JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
   AND procedure.pronamespace = namespace.oid
   AND procedure.proname = expected.function_name;

  SELECT pg_catalog.count(*)::INTEGER
  INTO mismatched_event_count
  FROM public.meta_credential_envelopes AS credential
  LEFT JOIN public.meta_credential_revision_events AS event
    ON event.tenant_id = credential.tenant_id
   AND event.credential_revision = credential.credential_revision
   AND event.envelope_digest = credential.envelope_digest
   AND event.key_version = credential.key_version
   AND event.recorded_at = credential.updated_at
  WHERE event.event_key IS NULL;

  SELECT pg_catalog.count(*)::INTEGER
  INTO non_owner_privilege_count
  FROM (
    SELECT
      relation.relowner AS owner_oid,
      privilege.grantee
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
      AND relation.relname = 'meta_credential_revision_events'

    UNION ALL

    SELECT
      procedure.proowner AS owner_oid,
      privilege.grantee
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
        'derive_meta_credential_envelope_digest_v1',
        'derive_meta_credential_revision_event_key_v1',
        'prepare_meta_credential_envelope_revision',
        'record_meta_credential_revision_event',
        'guard_meta_credential_revision_event_insert',
        'reject_meta_credential_revision_event_mutation'
      )
  ) AS access
  WHERE access.grantee <> access.owner_oid;

  IF envelope_column_count <> 2
    OR event_columns IS DISTINCT FROM ARRAY[
      'event_key',
      'tenant_id',
      'credential_revision',
      'envelope_digest',
      'key_version',
      'recorded_at',
      'created_at'
    ]::TEXT[]
    OR function_count <> 6
    OR trigger_count <> 7
    OR mismatched_event_count <> 0
    OR non_owner_privilege_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-B-B1 postcondition failed: envelope columns %, event columns %, functions %, triggers %, mismatches %, non-owner privileges %',
      envelope_column_count,
      event_columns,
      function_count,
      trigger_count,
      mismatched_event_count,
      non_owner_privilege_count;
  END IF;
END;
$d31d1db_postcondition$;
