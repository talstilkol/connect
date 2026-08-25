-- Dormant D31-D1d-B-B2a1 credential-bound pre-send admission.
--
-- This migration deliberately stops before capability consumption. It binds
-- new staging authorizations to the exact DB-derived credential revision,
-- binds a claimed run version to that authorization, and may reserve one
-- short-lived immutable permit. It never creates or returns a provider request
-- key and it never inserts a provider request claim.
--
-- D1e / 0056 remains an activation blocker: every relevant writer must use a
-- DB-derived tenant session advisory lock held by one pinned client across
-- consume, the external Meta callback boundary, COMMIT/ROLLBACK, and a safe
-- same-client unlock. The transaction locks below protect only cooperating
-- database statements; they are not that session advisory lock contract.

DO $d31d1d_b2a1_precondition$
DECLARE
  existing_relation_count INTEGER;
  existing_function_count INTEGER;
  existing_authorization_column_count INTEGER;
  credential_identity_count INTEGER;
  unsafe_default_acl_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_pre_send_admission_bindings',
      'bot_reply_staging_run_credential_bindings',
      'bot_reply_staging_credential_bound_pre_send_permits',
      'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
      'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'bind_bot_reply_staging_authorization_credential_v1',
      'reject_bot_reply_staging_pre_send_ledger_mutation',
      'derive_bot_reply_staging_pre_send_permit_key_v1',
      'claim_bot_reply_staging_run_v2',
      'reserve_bot_reply_staging_credential_bound_pre_send_permit_v2'
    );

  SELECT pg_catalog.count(*)::INTEGER
  INTO existing_authorization_column_count
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid =
      'public.bot_reply_staging_authorization_events'::pg_catalog.regclass
    AND attribute.attname IN (
      'credential_revision',
      'credential_envelope_digest',
      'credential_event_key'
    )
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  SELECT pg_catalog.count(*)::INTEGER
  INTO credential_identity_count
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid =
      'public.meta_credential_envelopes'::pg_catalog.regclass
    AND attribute.attname IN (
      'credential_revision',
      'envelope_digest'
    )
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

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
    OR existing_authorization_column_count <> 0
    OR credential_identity_count <> 2
    OR pg_catalog.to_regclass(
      'public.meta_credential_revision_events'
    ) IS NULL
    OR unsafe_default_acl_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-B-B2a1 precondition failed: relations %, functions %, authorization columns %, credential identity %, unsafe default ACLs %',
      existing_relation_count,
      existing_function_count,
      existing_authorization_column_count,
      credential_identity_count,
      unsafe_default_acl_count;
  END IF;
END;
$d31d1d_b2a1_precondition$;

ALTER TABLE public.meta_credential_revision_events
  ADD CONSTRAINT meta_credential_revision_events_exact_identity_uq
  UNIQUE (
    event_key,
    tenant_id,
    credential_revision,
    envelope_digest
  );

-- Nullable by design. Existing rows receive no backfill and therefore remain
-- permanently ineligible for claim_v2/reserve_v2.
ALTER TABLE public.bot_reply_staging_authorization_events
  ADD COLUMN credential_revision BIGINT,
  ADD COLUMN credential_envelope_digest TEXT,
  ADD COLUMN credential_event_key TEXT,
  ADD CONSTRAINT bot_reply_staging_authorizations_credential_binding_complete
    CHECK (
      (
        credential_revision IS NULL
        AND credential_envelope_digest IS NULL
        AND credential_event_key IS NULL
      )
      OR (
        credential_revision IS NOT NULL
        AND credential_revision >= 1
        AND credential_envelope_digest IS NOT NULL
        AND credential_envelope_digest OPERATOR(pg_catalog.~)
          '^sha256:[a-f0-9]{64}$'
        AND credential_event_key IS NOT NULL
        AND credential_event_key OPERATOR(pg_catalog.~)
          '^meta_credential_revision_v1_[a-f0-9]{64}$'
      )
    ),
  ADD CONSTRAINT bot_reply_staging_authorizations_credential_event_fk
    FOREIGN KEY (
      credential_event_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest
    )
    REFERENCES public.meta_credential_revision_events (
      event_key,
      tenant_id,
      credential_revision,
      envelope_digest
    )
    ON DELETE RESTRICT,
  ADD CONSTRAINT bot_reply_staging_authorizations_exact_identity_uq
    UNIQUE (
      event_key,
      tenant_id,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key
    );

CREATE FUNCTION public.bind_bot_reply_staging_authorization_credential_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  existing_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  previous_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
BEGIN
  -- Preserve exact legacy/bound replays. The existing authorization trigger
  -- performs the full row equality check after this trigger returns.
  SELECT authorization_event.*
  INTO existing_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.event_key = NEW.event_key
  FOR UPDATE;

  IF FOUND THEN
    IF NEW.credential_revision IS NOT NULL
      OR NEW.credential_envelope_digest IS NOT NULL
      OR NEW.credential_event_key IS NOT NULL
    THEN
      RAISE EXCEPTION
        'Bot reply staging authorization credential identity is DB-derived';
    END IF;

    NEW.credential_revision := existing_authorization.credential_revision;
    NEW.credential_envelope_digest :=
      existing_authorization.credential_envelope_digest;
    NEW.credential_event_key :=
      existing_authorization.credential_event_key;
    RETURN NEW;
  END IF;

  IF NEW.credential_revision IS NOT NULL
    OR NEW.credential_envelope_digest IS NOT NULL
    OR NEW.credential_event_key IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Bot reply staging authorization credential identity is DB-derived';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'connect-bot-reply-tenant-barrier-v1:' ||
        NEW.tenant_id::pg_catalog.TEXT,
      0
    )
  );

  IF NEW.status = 'revoked' THEN
    SELECT authorization_event.*
    INTO previous_authorization
    FROM public.bot_reply_staging_authorization_events AS authorization_event
    WHERE authorization_event.tenant_id = NEW.tenant_id
    ORDER BY authorization_event.authorization_version DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      NEW.credential_revision :=
        previous_authorization.credential_revision;
      NEW.credential_envelope_digest :=
        previous_authorization.credential_envelope_digest;
      NEW.credential_event_key :=
        previous_authorization.credential_event_key;
    END IF;
    RETURN NEW;
  END IF;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging authorization lacks current credential identity';
  END IF;

  SELECT credential_event.*
  INTO current_credential_event
  FROM public.meta_credential_revision_events AS credential_event
  WHERE credential_event.tenant_id = current_credential.tenant_id
    AND credential_event.credential_revision =
      current_credential.credential_revision
    AND credential_event.envelope_digest =
      current_credential.envelope_digest
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging authorization lacks exact credential event';
  END IF;

  NEW.credential_revision := current_credential.credential_revision;
  NEW.credential_envelope_digest := current_credential.envelope_digest;
  NEW.credential_event_key := current_credential_event.event_key;
  RETURN NEW;
END;
$$;

-- Trigger names execute alphabetically. This credential binding runs before
-- the existing insert guard, which then validates connection/policy evidence.
CREATE TRIGGER bot_reply_staging_authorizations_credential_binding_guard
BEFORE INSERT ON public.bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION
  public.bind_bot_reply_staging_authorization_credential_v1();

-- Exact immutable identities used by the dormant admission binding and by the
-- later 0056 consumption evidence. Legacy nullable throughput rows remain
-- ineligible because every admission-binding field below is NOT NULL.
ALTER TABLE public.whatsapp_campaign_delivery_policy_events
  ADD CONSTRAINT whatsapp_delivery_policy_events_pre_send_identity_uq
  UNIQUE (
    event_key,
    tenant_id,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second
  );

ALTER TABLE public.whatsapp_rate_limit_reservations
  ADD CONSTRAINT whatsapp_rate_reservations_pre_send_identity_uq
  UNIQUE (
    reservation_key,
    tenant_id,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    reserved_at,
    pair_reserved_until,
    reservation_expires_at
  );

ALTER TABLE public.bot_reply_provider_request_claims
  ADD CONSTRAINT bot_reply_provider_requests_pre_send_identity_uq
  UNIQUE (
    request_key,
    delivery_key,
    tenant_id,
    claim_version,
    reservation_key
  );

CREATE TABLE public.bot_reply_staging_pre_send_admission_bindings (
  admission_binding_key TEXT PRIMARY KEY,
  run_binding_key TEXT NOT NULL,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  authorization_event_key TEXT NOT NULL,
  authorization_version INTEGER NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  policy_event_key TEXT NOT NULL,
  phone_throughput_messages_per_second INTEGER NOT NULL,
  maximum_outbound_messages_per_second INTEGER NOT NULL,
  reservation_reserved_at TIMESTAMPTZ NOT NULL,
  pair_reserved_until TIMESTAMPTZ NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  bound_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_pre_send_admission_delivery_fk
    FOREIGN KEY (tenant_id, delivery_key)
    REFERENCES public.bot_reply_deliveries (tenant_id, delivery_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_pre_send_admission_policy_fk
    FOREIGN KEY (
      policy_event_key,
      tenant_id,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second
    )
    REFERENCES public.whatsapp_campaign_delivery_policy_events (
      event_key,
      tenant_id,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_pre_send_admission_reservation_fk
    FOREIGN KEY (
      reservation_key,
      tenant_id,
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
  CONSTRAINT bot_reply_staging_pre_send_admission_key_valid
    CHECK (
      admission_binding_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_admission_binding_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_admission_identity_valid
    CHECK (
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
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
      AND sender_key OPERATOR(pg_catalog.~)
        '^whatsapp_sender_v1_[a-f0-9]{64}$'
      AND recipient_key OPERATOR(pg_catalog.~)
        '^whatsapp_recipient_v1_[a-f0-9]{64}$'
      AND policy_event_key OPERATOR(pg_catalog.~)
        '^whatsapp_delivery_policy_event_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_admission_limits_valid
    CHECK (
      run_claim_version >= 1
      AND authorization_version >= 1
      AND credential_revision >= 1
      AND delivery_claim_version >= 1
      AND phone_throughput_messages_per_second IN (20, 80, 1000)
      AND maximum_outbound_messages_per_second >= 1
      AND maximum_outbound_messages_per_second <
        phone_throughput_messages_per_second
    ),
  CONSTRAINT bot_reply_staging_pre_send_admission_time_valid
    CHECK (
      reservation_reserved_at =
        pg_catalog.date_trunc('milliseconds', reservation_reserved_at)
      AND pair_reserved_until =
        pg_catalog.date_trunc('milliseconds', pair_reserved_until)
      AND reservation_expires_at =
        pg_catalog.date_trunc('milliseconds', reservation_expires_at)
      AND bound_at = pg_catalog.date_trunc('milliseconds', bound_at)
      AND created_at = bound_at
      AND reservation_reserved_at <= bound_at
      AND bound_at < reservation_expires_at
    ),
  CONSTRAINT bot_reply_staging_pre_send_admission_delivery_claim_uq
    UNIQUE (delivery_key, delivery_claim_version),
  CONSTRAINT bot_reply_staging_pre_send_admission_reservation_uq
    UNIQUE (reservation_key),
  CONSTRAINT bot_reply_staging_pre_send_admission_exact_identity_uq
    UNIQUE (
      admission_binding_key,
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

-- Intentionally no INSERT wrapper exists for this table in 0055. D1e must
-- create the exact admission binding only after the run claim is bound and
-- atomically with the final delivery/reservation admission decision while
-- holding the DB-derived pinned-session barrier.

CREATE TABLE public.bot_reply_staging_run_credential_bindings (
  binding_key TEXT PRIMARY KEY,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  authorization_event_key TEXT NOT NULL,
  authorization_version INTEGER NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  bound_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_run_bindings_run_fk
    FOREIGN KEY (run_key)
    REFERENCES public.bot_reply_staging_runs (run_key)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_run_bindings_authorization_fk
    FOREIGN KEY (
      authorization_event_key,
      tenant_id,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key
    )
    REFERENCES public.bot_reply_staging_authorization_events (
      event_key,
      tenant_id,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_run_bindings_key_valid
    CHECK (
      binding_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_run_bindings_run_key_valid
    CHECK (
      run_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_run_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_run_bindings_versions_positive
    CHECK (
      run_claim_version >= 1
      AND authorization_version >= 1
      AND credential_revision >= 1
    ),
  CONSTRAINT bot_reply_staging_run_bindings_digest_valid
    CHECK (
      credential_envelope_digest OPERATOR(pg_catalog.~)
        '^sha256:[a-f0-9]{64}$'
      AND credential_event_key OPERATOR(pg_catalog.~)
        '^meta_credential_revision_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_run_bindings_time_valid
    CHECK (
      bound_at = pg_catalog.date_trunc('milliseconds', bound_at)
      AND created_at = bound_at
    ),
  CONSTRAINT bot_reply_staging_run_bindings_claim_uq
    UNIQUE (run_key, run_claim_version),
  CONSTRAINT bot_reply_staging_run_bindings_exact_identity_uq
    UNIQUE (
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
);

ALTER TABLE public.bot_reply_staging_pre_send_admission_bindings
  ADD CONSTRAINT bot_reply_staging_pre_send_admission_run_binding_fk
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
  ON DELETE RESTRICT;

CREATE TABLE public.bot_reply_staging_credential_bound_pre_send_permits (
  permit_key TEXT PRIMARY KEY,
  run_binding_key TEXT NOT NULL,
  run_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  request_digest TEXT NOT NULL,
  audit_key TEXT NOT NULL,
  release_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  run_claim_version INTEGER NOT NULL,
  run_lease_expires_at TIMESTAMPTZ NOT NULL,
  authorization_event_key TEXT NOT NULL,
  authorization_version INTEGER NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  admission_binding_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  operation_kind TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  policy_event_key TEXT NOT NULL,
  phone_throughput_messages_per_second INTEGER NOT NULL,
  maximum_outbound_messages_per_second INTEGER NOT NULL,
  reservation_reserved_at TIMESTAMPTZ NOT NULL,
  pair_reserved_until TIMESTAMPTZ NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL,
  permit_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_pre_send_permits_binding_fk
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
  CONSTRAINT bot_reply_staging_pre_send_permits_admission_fk
    FOREIGN KEY (
      admission_binding_key,
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
    REFERENCES public.bot_reply_staging_pre_send_admission_bindings (
      admission_binding_key,
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
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_pre_send_permits_key_valid
    CHECK (
      permit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_permits_identity_valid
    CHECK (
      request_digest OPERATOR(pg_catalog.~) '^sha256:[a-f0-9]{64}$'
      AND audit_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_audit_v1_[a-f0-9]{64}$'
      AND release_id OPERATOR(pg_catalog.~)
        '^connect_release_v1_[a-f0-9]{64}$'
      AND commit_sha OPERATOR(pg_catalog.~) '^[a-f0-9]{40}$'
      AND artifact_digest OPERATOR(pg_catalog.~)
        '^sha256:[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
      AND admission_binding_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_admission_binding_v1_[a-f0-9]{64}$'
      AND sender_key OPERATOR(pg_catalog.~)
        '^whatsapp_sender_v1_[a-f0-9]{64}$'
      AND recipient_key OPERATOR(pg_catalog.~)
        '^whatsapp_recipient_v1_[a-f0-9]{64}$'
      AND policy_event_key OPERATOR(pg_catalog.~)
        '^whatsapp_delivery_policy_event_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_permits_versions_positive
    CHECK (
      run_claim_version >= 1
      AND authorization_version >= 1
      AND credential_revision >= 1
      AND delivery_claim_version >= 1
      AND phone_throughput_messages_per_second IN (20, 80, 1000)
      AND maximum_outbound_messages_per_second >= 1
      AND maximum_outbound_messages_per_second <
        phone_throughput_messages_per_second
    ),
  CONSTRAINT bot_reply_staging_pre_send_permits_credential_valid
    CHECK (
      credential_envelope_digest OPERATOR(pg_catalog.~)
        '^sha256:[a-f0-9]{64}$'
      AND credential_event_key OPERATOR(pg_catalog.~)
        '^meta_credential_revision_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_permits_kind_valid
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
  CONSTRAINT bot_reply_staging_pre_send_permits_time_valid
    CHECK (
      run_lease_expires_at =
        pg_catalog.date_trunc('milliseconds', run_lease_expires_at)
      AND reservation_reserved_at =
        pg_catalog.date_trunc('milliseconds', reservation_reserved_at)
      AND pair_reserved_until =
        pg_catalog.date_trunc('milliseconds', pair_reserved_until)
      AND reservation_expires_at =
        pg_catalog.date_trunc('milliseconds', reservation_expires_at)
      AND reserved_at = pg_catalog.date_trunc('milliseconds', reserved_at)
      AND permit_expires_at =
        pg_catalog.date_trunc('milliseconds', permit_expires_at)
      AND created_at = reserved_at
      AND reservation_reserved_at <= reserved_at
      AND reserved_at < reservation_expires_at
      AND permit_expires_at > reserved_at
      AND permit_expires_at <= reserved_at + INTERVAL '30 seconds'
      AND permit_expires_at <= run_lease_expires_at
      AND permit_expires_at <= reservation_expires_at
    ),
  CONSTRAINT bot_reply_staging_pre_send_permits_operation_uq
    UNIQUE (operation_key),
  CONSTRAINT bot_reply_staging_pre_send_permits_delivery_claim_uq
    UNIQUE (delivery_key, delivery_claim_version),
  CONSTRAINT bot_reply_staging_pre_send_permits_reservation_uq
    UNIQUE (reservation_key),
  CONSTRAINT bot_reply_staging_pre_send_permits_exact_identity_uq
    UNIQUE (
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
);

-- These two ledgers are intentionally inert in 0055. Only the reviewed 0056
-- session-barrier capability may insert them.
CREATE TABLE
  public.bot_reply_staging_credential_bound_pre_send_permit_consumptions (
  consumption_key TEXT PRIMARY KEY,
  permit_key TEXT NOT NULL UNIQUE,
  tenant_id BIGINT NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  provider_request_key TEXT NOT NULL UNIQUE,
  consumed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_pre_send_consumptions_permit_fk
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
  CONSTRAINT bot_reply_staging_pre_send_consumptions_request_fk
    FOREIGN KEY (
      provider_request_key,
      delivery_key,
      tenant_id,
      delivery_claim_version,
      reservation_key
    )
    REFERENCES public.bot_reply_provider_request_claims (
      request_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_pre_send_consumptions_key_valid
    CHECK (
      consumption_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_permit_consumption_v1_[a-f0-9]{64}$'
      AND provider_request_key OPERATOR(pg_catalog.~)
        '^bot_reply_provider_request_v1_[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND delivery_claim_version >= 1
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_consumptions_time_valid
    CHECK (
      consumed_at = pg_catalog.date_trunc('milliseconds', consumed_at)
      AND created_at = consumed_at
    ),
  CONSTRAINT bot_reply_staging_pre_send_consumptions_exact_identity_uq
    UNIQUE (
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      provider_request_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key
    )
);

CREATE TABLE
  public.bot_reply_staging_credential_bound_pre_send_permit_resolutions (
  resolution_key TEXT PRIMARY KEY,
  permit_key TEXT NOT NULL UNIQUE,
  tenant_id BIGINT NOT NULL,
  credential_revision BIGINT NOT NULL,
  credential_envelope_digest TEXT NOT NULL,
  credential_event_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  delivery_claim_version INTEGER NOT NULL,
  reservation_key TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  provider_request_key TEXT UNIQUE,
  resolved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_pre_send_resolutions_permit_fk
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
  CONSTRAINT bot_reply_staging_pre_send_resolutions_consumption_fk
    FOREIGN KEY (
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      provider_request_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key
    )
    REFERENCES
      public.bot_reply_staging_credential_bound_pre_send_permit_consumptions (
      permit_key,
      tenant_id,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      provider_request_key,
      operation_key,
      delivery_key,
      delivery_claim_version,
      reservation_key
    )
    MATCH SIMPLE
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_pre_send_resolutions_key_valid
    CHECK (
      resolution_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_permit_resolution_v1_[a-f0-9]{64}$'
      AND operation_key OPERATOR(pg_catalog.~)
        '^bot_reply_staging_step_v1_[a-f0-9]{64}$'
      AND delivery_key OPERATOR(pg_catalog.~)
        '^bot_reply_delivery_v1_[a-f0-9]{64}$'
      AND delivery_claim_version >= 1
      AND reservation_key OPERATOR(pg_catalog.~)
        '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'
    ),
  CONSTRAINT bot_reply_staging_pre_send_resolutions_outcome_valid
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
          'OPERATION_ALREADY_FENCED'
        )
        AND provider_request_key IS NULL
      )
    ),
  CONSTRAINT bot_reply_staging_pre_send_resolutions_time_valid
    CHECK (
      resolved_at = pg_catalog.date_trunc('milliseconds', resolved_at)
      AND created_at = resolved_at
    )
);

CREATE FUNCTION public.reject_bot_reply_staging_pre_send_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION
    'Bot reply staging credential-bound pre-send evidence is immutable';
END;
$$;

CREATE FUNCTION
  public.derive_bot_reply_staging_pre_send_permit_key_v1(
  persisted_tenant_id BIGINT,
  persisted_run_binding_key TEXT,
  persisted_credential_revision BIGINT,
  persisted_credential_envelope_digest TEXT,
  persisted_credential_event_key TEXT,
  persisted_admission_binding_key TEXT,
  persisted_policy_event_key TEXT,
  persisted_sender_key TEXT,
  persisted_recipient_key TEXT,
  persisted_phone_throughput_messages_per_second INTEGER,
  persisted_maximum_outbound_messages_per_second INTEGER,
  persisted_operation_key TEXT,
  persisted_operation_kind TEXT,
  persisted_delivery_key TEXT,
  persisted_delivery_claim_version INTEGER,
  persisted_reservation_key TEXT,
  persisted_reservation_reserved_at TIMESTAMPTZ,
  persisted_pair_reserved_until TIMESTAMPTZ,
  persisted_reservation_expires_at TIMESTAMPTZ,
  persisted_reserved_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
SELECT 'bot_reply_staging_pre_send_permit_v1_' ||
  pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        'connect-bot-reply-staging-credential-bound-permit-v1',
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_tenant_id::TEXT, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_run_binding_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_credential_revision::TEXT, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        persisted_credential_envelope_digest,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_credential_event_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_admission_binding_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_policy_event_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_sender_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_recipient_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        persisted_phone_throughput_messages_per_second::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        persisted_maximum_outbound_messages_per_second::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_operation_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_operation_kind, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_delivery_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        persisted_delivery_claim_version::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(persisted_reservation_key, 'UTF8') ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        (
          EXTRACT(
            epoch FROM persisted_reservation_reserved_at
          ) * 1000
        )::BIGINT::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        (
          EXTRACT(epoch FROM persisted_pair_reserved_until) *
            1000
        )::BIGINT::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        (
          EXTRACT(
            epoch FROM persisted_reservation_expires_at
          ) * 1000
        )::BIGINT::TEXT,
        'UTF8'
      ) ||
      pg_catalog.decode('00', 'hex') ||
      pg_catalog.convert_to(
        (
          EXTRACT(epoch FROM persisted_reserved_at) * 1000
        )::BIGINT::TEXT,
        'UTF8'
      )
    ),
    'hex'
  )
$$;

CREATE TRIGGER bot_reply_staging_pre_send_admission_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_pre_send_admission_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();
CREATE TRIGGER bot_reply_staging_pre_send_admission_truncate_guard
BEFORE TRUNCATE
ON public.bot_reply_staging_pre_send_admission_bindings
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_run_bindings_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_run_credential_bindings
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();
CREATE TRIGGER bot_reply_staging_run_bindings_truncate_guard
BEFORE TRUNCATE ON public.bot_reply_staging_run_credential_bindings
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_pre_send_permits_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_credential_bound_pre_send_permits
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();
CREATE TRIGGER bot_reply_staging_pre_send_permits_truncate_guard
BEFORE TRUNCATE
ON public.bot_reply_staging_credential_bound_pre_send_permits
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_pre_send_consumptions_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();
CREATE TRIGGER bot_reply_staging_pre_send_consumptions_truncate_guard
BEFORE TRUNCATE
ON public.bot_reply_staging_credential_bound_pre_send_permit_consumptions
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE TRIGGER bot_reply_staging_pre_send_resolutions_mutation_guard
BEFORE UPDATE OR DELETE
ON public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
FOR EACH ROW
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();
CREATE TRIGGER bot_reply_staging_pre_send_resolutions_truncate_guard
BEFORE TRUNCATE
ON public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation();

CREATE FUNCTION public.claim_bot_reply_staging_run_v2(
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
  requested_audit_key TEXT,
  requested_authorization_event_key TEXT
)
RETURNS TABLE (
  outcome TEXT,
  "runKey" TEXT,
  "requestDigest" TEXT,
  "auditKey" TEXT,
  "claimVersion" INTEGER,
  "leaseExpiresAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "receiptDigest" TEXT,
  "runBindingKey" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  authorization_lookup
    public.bot_reply_staging_authorization_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  stored_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  persisted_tenant_id BIGINT;
  claim_outcome TEXT;
  claim_run_key TEXT;
  claim_request_digest TEXT;
  claim_audit_key TEXT;
  claim_version INTEGER;
  claim_lease_expires_at TIMESTAMPTZ;
  claim_completed_at TIMESTAMPTZ;
  claim_receipt_digest TEXT;
  database_now TIMESTAMPTZ;
  derived_binding_key TEXT;
BEGIN
  IF requested_authorization_event_key IS NULL
    OR NOT requested_authorization_event_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_authorization_v1_[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim requires read committed isolation';
  END IF;

  -- Resolve the lock tenant from immutable database evidence, never from the
  -- caller-supplied tenant argument.
  SELECT authorization_event.*
  INTO authorization_lookup
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.event_key =
    requested_authorization_event_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim lacks authorization';
  END IF;

  persisted_tenant_id := authorization_lookup.tenant_id;
  IF persisted_tenant_id <> requested_tenant_id THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim tenant conflicts';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'connect-bot-reply-tenant-barrier-v1:' ||
        persisted_tenant_id::pg_catalog.TEXT,
      0
    )
  );

  -- claim_v1 owns the canonical run insert/reclaim transition. Any later
  -- safety failure in this wrapper rolls that transition back atomically.
  SELECT
    claim_result.outcome,
    claim_result."runKey",
    claim_result."requestDigest",
    claim_result."auditKey",
    claim_result."claimVersion",
    claim_result."leaseExpiresAt",
    claim_result."completedAt",
    claim_result."receiptDigest"
  INTO
    claim_outcome,
    claim_run_key,
    claim_request_digest,
    claim_audit_key,
    claim_version,
    claim_lease_expires_at,
    claim_completed_at,
    claim_receipt_digest
  FROM public.claim_bot_reply_staging_run_v1(
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
    requested_lease_duration_seconds,
    requested_audit_key
  ) AS claim_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim returned no canonical result';
  END IF;

  IF claim_outcome <> 'claimed' THEN
    RETURN QUERY SELECT
      claim_outcome,
      claim_run_key,
      claim_request_digest,
      claim_audit_key,
      claim_version,
      claim_lease_expires_at,
      claim_completed_at,
      claim_receipt_digest,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Canonical B2a1 row order after the tenant xact lock: run, credential,
  -- credential event, latest authorization, connection, latest policy,
  -- then any prior binding for this exact run claim.
  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
  FOR UPDATE;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = persisted_tenant_id
  FOR UPDATE;

  IF current_credential.tenant_id IS NOT NULL THEN
    SELECT credential_event.*
    INTO current_credential_event
    FROM public.meta_credential_revision_events AS credential_event
    WHERE credential_event.tenant_id = persisted_tenant_id
      AND credential_event.credential_revision =
        current_credential.credential_revision
      AND credential_event.envelope_digest =
        current_credential.envelope_digest
    FOR KEY SHARE;
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = persisted_tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = persisted_tenant_id
  FOR UPDATE;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = persisted_tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT binding.*
  INTO stored_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.run_key = requested_run_key
    AND binding.run_claim_version = claim_version
  FOR UPDATE;

  -- Never validate a lease or evidence expiry against a clock sampled before
  -- a lock wait.
  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF active_run.run_key IS NULL
    OR active_run.tenant_id <> persisted_tenant_id
    OR active_run.claim_version <> claim_version
    OR active_run.lease_expires_at <> claim_lease_expires_at
    OR active_run.status <> 'running'
    OR database_now < active_run.started_at
    OR database_now >= active_run.lease_expires_at
    OR current_credential.tenant_id IS NULL
    OR current_credential_event.event_key IS NULL
    OR active_authorization.event_key IS NULL
    OR active_authorization.event_key <>
      requested_authorization_event_key
    OR active_authorization.status <> 'approved'
    OR active_authorization.credential_revision IS NULL
    OR active_authorization.credential_revision <>
      current_credential.credential_revision
    OR active_authorization.credential_envelope_digest <>
      current_credential.envelope_digest
    OR active_authorization.credential_event_key <>
      current_credential_event.event_key
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
    OR active_run.lease_expires_at >
      active_authorization.recipient_expires_at
    OR active_run.lease_expires_at >
      active_authorization.rate_limit_expires_at
    OR current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
    OR current_policy.event_key IS NULL
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.meta_graph_api_version <>
      active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR active_run.lease_expires_at > current_policy.evidence_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_observation_events AS observation
      WHERE observation.run_key = active_run.run_key
        AND observation.fact_kind = 'kill-switch'
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound claim lacks current safety evidence';
  END IF;

  derived_binding_key := 'bot_reply_staging_run_binding_v1_' ||
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(
          'connect-bot-reply-staging-run-credential-binding-v1',
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(active_run.run_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(active_run.claim_version::TEXT, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(active_authorization.event_key, 'UTF8') ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(
          current_credential.credential_revision::TEXT,
          'UTF8'
        ) ||
        pg_catalog.decode('00', 'hex') ||
        pg_catalog.convert_to(current_credential.envelope_digest, 'UTF8')
      ),
      'hex'
    );

  IF stored_binding.binding_key IS NULL THEN
    INSERT INTO public.bot_reply_staging_run_credential_bindings (
      binding_key,
      run_key,
      tenant_id,
      run_claim_version,
      authorization_event_key,
      authorization_version,
      credential_revision,
      credential_envelope_digest,
      credential_event_key,
      bound_at,
      created_at
    ) VALUES (
      derived_binding_key,
      active_run.run_key,
      active_run.tenant_id,
      active_run.claim_version,
      active_authorization.event_key,
      active_authorization.authorization_version,
      current_credential.credential_revision,
      current_credential.envelope_digest,
      current_credential_event.event_key,
      database_now,
      database_now
    )
    ON CONFLICT DO NOTHING
    RETURNING * INTO stored_binding;

    IF NOT FOUND THEN
      SELECT binding.*
      INTO stored_binding
      FROM public.bot_reply_staging_run_credential_bindings AS binding
      WHERE binding.run_key = active_run.run_key
        AND binding.run_claim_version = active_run.claim_version
      FOR UPDATE;
    END IF;
  END IF;

  IF stored_binding.binding_key IS NULL
    OR stored_binding.binding_key <> derived_binding_key
    OR stored_binding.run_key <> active_run.run_key
    OR stored_binding.tenant_id <> active_run.tenant_id
    OR stored_binding.run_claim_version <> active_run.claim_version
    OR stored_binding.authorization_event_key <>
      active_authorization.event_key
    OR stored_binding.authorization_version <>
      active_authorization.authorization_version
    OR stored_binding.credential_revision <>
      current_credential.credential_revision
    OR stored_binding.credential_envelope_digest <>
      current_credential.envelope_digest
    OR stored_binding.credential_event_key <>
      current_credential_event.event_key
  THEN
    RAISE EXCEPTION
      'Bot reply staging run credential binding conflicts';
  END IF;

  RETURN QUERY SELECT
    claim_outcome,
    claim_run_key,
    claim_request_digest,
    claim_audit_key,
    claim_version,
    claim_lease_expires_at,
    claim_completed_at,
    claim_receipt_digest,
    stored_binding.binding_key;
END;
$$;

CREATE FUNCTION
  public.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2(
  requested_run_key TEXT,
  requested_tenant_id BIGINT,
  requested_request_digest TEXT,
  requested_audit_key TEXT,
  requested_release_id TEXT,
  requested_commit_sha TEXT,
  requested_artifact_digest TEXT,
  requested_run_claim_version INTEGER,
  requested_run_lease_expires_at TIMESTAMPTZ,
  requested_run_binding_key TEXT,
  requested_admission_binding_key TEXT,
  requested_operation_key TEXT,
  requested_operation_kind TEXT,
  requested_delivery_key TEXT,
  requested_delivery_claim_version INTEGER,
  requested_reservation_key TEXT
)
RETURNS TABLE (
  "permitKey" TEXT
)
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
ROWS 1
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  initial_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  locked_binding
    public.bot_reply_staging_run_credential_bindings%ROWTYPE;
  active_run public.bot_reply_staging_runs%ROWTYPE;
  current_credential public.meta_credential_envelopes%ROWTYPE;
  current_credential_event public.meta_credential_revision_events%ROWTYPE;
  active_authorization
    public.bot_reply_staging_authorization_events%ROWTYPE;
  current_connection public.meta_connections%ROWTYPE;
  current_policy
    public.whatsapp_campaign_delivery_policy_events%ROWTYPE;
  locked_delivery public.bot_reply_deliveries%ROWTYPE;
  locked_reservation public.whatsapp_rate_limit_reservations%ROWTYPE;
  locked_admission
    public.bot_reply_staging_pre_send_admission_bindings%ROWTYPE;
  stored_permit
    public.bot_reply_staging_credential_bound_pre_send_permits%ROWTYPE;
  persisted_tenant_id BIGINT;
  service_window_opened_at TIMESTAMPTZ;
  service_window_expires_at TIMESTAMPTZ;
  database_now TIMESTAMPTZ;
  derived_permit_key TEXT;
  recomputed_permit_key TEXT;
  database_permit_expires_at TIMESTAMPTZ;
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
    OR requested_run_binding_key IS NULL
    OR NOT requested_run_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_run_binding_v1_[a-f0-9]{64}$'
    OR requested_admission_binding_key IS NULL
    OR NOT requested_admission_binding_key OPERATOR(pg_catalog.~)
      '^bot_reply_staging_admission_binding_v1_[a-f0-9]{64}$'
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
      'Bot reply staging credential-bound permit input is invalid';
  END IF;

  IF pg_catalog.current_setting('transaction_isolation') <>
    'read committed'
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit requires read committed isolation';
  END IF;

  -- Resolve tenant/lock identity from the immutable binding row before using
  -- any caller-supplied tenant value.
  SELECT binding_lookup.*
  INTO initial_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding_lookup
  WHERE binding_lookup.binding_key = requested_run_binding_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit lacks run binding';
  END IF;

  persisted_tenant_id := initial_binding.tenant_id;
  IF persisted_tenant_id <> requested_tenant_id THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit tenant conflicts';
  END IF;

  IF initial_binding.run_key <> requested_run_key
    OR initial_binding.run_claim_version <>
      requested_run_claim_version
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit run binding conflicts';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'connect-bot-reply-tenant-barrier-v1:' ||
        persisted_tenant_id::pg_catalog.TEXT,
      0
    )
  );

  -- Canonical B2a1 lock order: run, credential, credential event, latest
  -- authorization, connection, latest policy, run binding, delivery, inbound
  -- service-window message, reservation, exact admission binding, and finally
  -- an existing permit selected only by its one-shot scopes.
  SELECT staging_run.*
  INTO active_run
  FROM public.bot_reply_staging_runs AS staging_run
  WHERE staging_run.run_key = requested_run_key
  FOR UPDATE;

  SELECT credential.*
  INTO current_credential
  FROM public.meta_credential_envelopes AS credential
  WHERE credential.tenant_id = persisted_tenant_id
  FOR UPDATE;

  IF current_credential.tenant_id IS NOT NULL THEN
    SELECT credential_event.*
    INTO current_credential_event
    FROM public.meta_credential_revision_events AS credential_event
    WHERE credential_event.tenant_id = persisted_tenant_id
      AND credential_event.credential_revision =
        current_credential.credential_revision
      AND credential_event.envelope_digest =
        current_credential.envelope_digest
    FOR KEY SHARE;
  END IF;

  SELECT authorization_event.*
  INTO active_authorization
  FROM public.bot_reply_staging_authorization_events AS authorization_event
  WHERE authorization_event.tenant_id = persisted_tenant_id
  ORDER BY authorization_event.authorization_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT connection.*
  INTO current_connection
  FROM public.meta_connections AS connection
  WHERE connection.tenant_id = persisted_tenant_id
  FOR UPDATE;

  SELECT policy.*
  INTO current_policy
  FROM public.whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = persisted_tenant_id
  ORDER BY policy.policy_version DESC
  LIMIT 1
  FOR UPDATE;

  SELECT binding.*
  INTO locked_binding
  FROM public.bot_reply_staging_run_credential_bindings AS binding
  WHERE binding.binding_key = requested_run_binding_key
  FOR UPDATE;

  SELECT delivery.*
  INTO locked_delivery
  FROM public.bot_reply_deliveries AS delivery
  WHERE delivery.delivery_key = requested_delivery_key
    AND delivery.tenant_id = persisted_tenant_id
  FOR UPDATE;

  IF locked_delivery.delivery_key IS NOT NULL THEN
    -- The inbound timestamp is currently treated as immutable evidence. D1e
    -- / 0056 must either prove that writer boundary or include message writers
    -- in the same DB-derived session advisory barrier before activation.
    SELECT inbound.occurred_at,
      inbound.occurred_at + INTERVAL '24 hours'
    INTO service_window_opened_at, service_window_expires_at
    FROM public.messages AS inbound
    WHERE inbound.tenant_id = persisted_tenant_id
      AND inbound.message_key = locked_delivery.inbound_message_key
      AND inbound.direction = 'inbound'
    FOR KEY SHARE;
  END IF;

  SELECT reservation.*
  INTO locked_reservation
  FROM public.whatsapp_rate_limit_reservations AS reservation
  WHERE reservation.reservation_key = requested_reservation_key
    AND reservation.tenant_id = persisted_tenant_id
  FOR UPDATE;

  SELECT admission.*
  INTO locked_admission
  FROM public.bot_reply_staging_pre_send_admission_bindings AS admission
  WHERE admission.admission_binding_key =
      requested_admission_binding_key
    AND admission.tenant_id = persisted_tenant_id
  FOR UPDATE;

  SELECT permit.*
  INTO stored_permit
  FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
  WHERE permit.tenant_id = persisted_tenant_id
    AND (
      permit.operation_key = requested_operation_key
      OR (
        permit.delivery_key = requested_delivery_key
        AND permit.delivery_claim_version =
          requested_delivery_claim_version
      )
      OR permit.reservation_key = requested_reservation_key
    )
  ORDER BY permit.permit_key
  LIMIT 1
  FOR UPDATE;

  -- All time-sensitive rechecks below use this post-lock database instant.
  database_now := pg_catalog.date_trunc(
    'milliseconds',
    pg_catalog.clock_timestamp()
  );

  IF stored_permit.permit_key IS NOT NULL THEN
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

    IF stored_permit.permit_key <> recomputed_permit_key
      OR stored_permit.run_binding_key <> requested_run_binding_key
      OR stored_permit.run_key <> requested_run_key
      OR stored_permit.tenant_id <> persisted_tenant_id
      OR stored_permit.request_digest <> requested_request_digest
      OR stored_permit.audit_key <> requested_audit_key
      OR stored_permit.release_id <> requested_release_id
      OR stored_permit.commit_sha <> requested_commit_sha
      OR stored_permit.artifact_digest <> requested_artifact_digest
      OR stored_permit.run_claim_version <>
        requested_run_claim_version
      OR stored_permit.run_lease_expires_at <>
        requested_run_lease_expires_at
      OR stored_permit.authorization_event_key <>
        locked_binding.authorization_event_key
      OR stored_permit.authorization_version <>
        locked_binding.authorization_version
      OR stored_permit.credential_revision <>
        locked_binding.credential_revision
      OR stored_permit.credential_envelope_digest <>
        locked_binding.credential_envelope_digest
      OR stored_permit.credential_event_key <>
        locked_binding.credential_event_key
      OR stored_permit.admission_binding_key <>
        requested_admission_binding_key
      OR stored_permit.operation_key <> requested_operation_key
      OR stored_permit.operation_kind <> requested_operation_kind
      OR stored_permit.delivery_key <> requested_delivery_key
      OR stored_permit.delivery_claim_version <>
        requested_delivery_claim_version
      OR stored_permit.reservation_key <> requested_reservation_key
      OR stored_permit.run_binding_key IS DISTINCT FROM
        locked_admission.run_binding_key
      OR stored_permit.run_key IS DISTINCT FROM
        locked_admission.run_key
      OR stored_permit.run_claim_version IS DISTINCT FROM
        locked_admission.run_claim_version
      OR stored_permit.authorization_event_key IS DISTINCT FROM
        locked_admission.authorization_event_key
      OR stored_permit.authorization_version IS DISTINCT FROM
        locked_admission.authorization_version
      OR stored_permit.credential_revision IS DISTINCT FROM
        locked_admission.credential_revision
      OR stored_permit.credential_envelope_digest IS DISTINCT FROM
        locked_admission.credential_envelope_digest
      OR stored_permit.credential_event_key IS DISTINCT FROM
        locked_admission.credential_event_key
      OR stored_permit.sender_key IS DISTINCT FROM
        locked_admission.sender_key
      OR stored_permit.recipient_key IS DISTINCT FROM
        locked_admission.recipient_key
      OR stored_permit.policy_event_key IS DISTINCT FROM
        locked_admission.policy_event_key
      OR stored_permit.phone_throughput_messages_per_second IS DISTINCT FROM
        locked_admission.phone_throughput_messages_per_second
      OR stored_permit.maximum_outbound_messages_per_second IS DISTINCT FROM
        locked_admission.maximum_outbound_messages_per_second
      OR stored_permit.reservation_reserved_at IS DISTINCT FROM
        locked_admission.reservation_reserved_at
      OR stored_permit.pair_reserved_until IS DISTINCT FROM
        locked_admission.pair_reserved_until
      OR stored_permit.reservation_expires_at IS DISTINCT FROM
        locked_admission.reservation_expires_at
      OR locked_binding.binding_key IS NULL
      OR locked_admission.admission_binding_key IS NULL
      OR current_credential.tenant_id IS NULL
      OR current_credential_event.event_key IS NULL
      OR active_authorization.event_key IS NULL
      OR current_policy.event_key IS NULL
      OR stored_permit.credential_revision IS DISTINCT FROM
        current_credential.credential_revision
      OR stored_permit.credential_envelope_digest IS DISTINCT FROM
        current_credential.envelope_digest
      OR stored_permit.credential_event_key IS DISTINCT FROM
        current_credential_event.event_key
      OR stored_permit.authorization_event_key IS DISTINCT FROM
        active_authorization.event_key
      OR stored_permit.authorization_version IS DISTINCT FROM
        active_authorization.authorization_version
      OR stored_permit.policy_event_key IS DISTINCT FROM
        current_policy.event_key
      OR stored_permit.sender_key IS DISTINCT FROM
        locked_reservation.sender_key
      OR stored_permit.recipient_key IS DISTINCT FROM
        locked_reservation.recipient_key
      OR stored_permit.policy_event_key IS DISTINCT FROM
        locked_reservation.policy_event_key
      OR stored_permit.phone_throughput_messages_per_second IS DISTINCT FROM
        locked_reservation.phone_throughput_messages_per_second
      OR stored_permit.maximum_outbound_messages_per_second IS DISTINCT FROM
        locked_reservation.maximum_outbound_messages_per_second
      OR stored_permit.reservation_reserved_at IS DISTINCT FROM
        locked_reservation.reserved_at
      OR stored_permit.pair_reserved_until IS DISTINCT FROM
        locked_reservation.pair_reserved_until
      OR stored_permit.reservation_expires_at IS DISTINCT FROM
        locked_reservation.reservation_expires_at
    THEN
      RAISE EXCEPTION
        'Bot reply staging credential-bound permit replay scope conflicts';
    END IF;

    -- An exact replay is closed: the only capability-shaped result is NULL.
    RETURN QUERY SELECT NULL::TEXT;
    RETURN;
  END IF;

  IF active_run.run_key IS NULL
    OR active_run.tenant_id <> persisted_tenant_id
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
    OR locked_binding.binding_key IS NULL
    OR locked_binding.run_key <> active_run.run_key
    OR locked_binding.tenant_id <> persisted_tenant_id
    OR locked_binding.run_claim_version <> active_run.claim_version
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit lacks exact active run';
  END IF;

  IF current_credential.tenant_id IS NULL
    OR current_credential_event.event_key IS NULL
    OR locked_binding.credential_revision <>
      current_credential.credential_revision
    OR locked_binding.credential_envelope_digest <>
      current_credential.envelope_digest
    OR locked_binding.credential_event_key <>
      current_credential_event.event_key
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit credential changed';
  END IF;

  IF active_authorization.event_key IS NULL
    OR active_authorization.event_key <>
      locked_binding.authorization_event_key
    OR active_authorization.authorization_version <>
      locked_binding.authorization_version
    OR active_authorization.status <> 'approved'
    OR active_authorization.credential_revision <>
      locked_binding.credential_revision
    OR active_authorization.credential_envelope_digest <>
      locked_binding.credential_envelope_digest
    OR active_authorization.credential_event_key <>
      locked_binding.credential_event_key
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
    OR active_run.lease_expires_at >
      active_authorization.recipient_expires_at
    OR active_run.lease_expires_at >
      active_authorization.rate_limit_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit authorization is stale';
  END IF;

  IF current_connection.tenant_id IS NULL
    OR current_connection.status <> 'connected'
    OR current_connection.version <> active_run.connection_version
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit connection changed';
  END IF;

  IF current_policy.event_key IS NULL
    OR current_policy.policy_version <> active_run.policy_version
    OR current_policy.connection_version <> active_run.connection_version
    OR current_policy.delivery_state <> 'enabled'
    OR current_policy.meta_graph_api_version <>
      active_run.graph_api_version
    OR current_policy.evidence_checked_at > database_now
    OR current_policy.recorded_at > database_now
    OR database_now >= current_policy.evidence_expires_at
    OR active_run.lease_expires_at > current_policy.evidence_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_observation_events AS observation
      WHERE observation.run_key = active_run.run_key
        AND observation.fact_kind = 'kill-switch'
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit policy is disabled';
  END IF;

  IF locked_delivery.delivery_key IS NULL
    OR locked_delivery.status <> 'sending'
    OR locked_delivery.attempt_count <> 1
    OR locked_delivery.claim_version <>
      requested_delivery_claim_version
    OR locked_delivery.updated_at > database_now
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit delivery is stale';
  END IF;

  IF locked_reservation.reservation_key IS NULL
    OR locked_reservation.reservation_class <> 'service-reply'
    OR locked_reservation.reserved_at > database_now
    OR active_run.started_at > locked_reservation.reserved_at
    OR locked_delivery.updated_at > locked_reservation.reserved_at
    OR database_now >= locked_reservation.reservation_expires_at
    OR EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements AS settlement
      WHERE settlement.reservation_key = requested_reservation_key
    )
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_staging_provider_operations AS operation
      WHERE operation.operation_key = requested_operation_key
        OR (
          operation.delivery_key = requested_delivery_key
          AND operation.delivery_claim_version =
            requested_delivery_claim_version
        )
        OR operation.reservation_key = requested_reservation_key
    )
    OR EXISTS (
      SELECT 1
      FROM public.bot_reply_provider_request_claims AS request
      WHERE (
          request.delivery_key = requested_delivery_key
          AND request.claim_version = requested_delivery_claim_version
        )
        OR request.reservation_key = requested_reservation_key
    )
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit reservation is stale';
  END IF;

  IF locked_admission.admission_binding_key IS NULL
    OR locked_admission.run_binding_key IS DISTINCT FROM
      locked_binding.binding_key
    OR locked_admission.run_key IS DISTINCT FROM active_run.run_key
    OR locked_admission.tenant_id <> persisted_tenant_id
    OR locked_admission.run_claim_version IS DISTINCT FROM
      active_run.claim_version
    OR locked_admission.authorization_event_key IS DISTINCT FROM
      locked_binding.authorization_event_key
    OR locked_admission.authorization_version IS DISTINCT FROM
      locked_binding.authorization_version
    OR locked_admission.credential_revision IS DISTINCT FROM
      locked_binding.credential_revision
    OR locked_admission.credential_envelope_digest IS DISTINCT FROM
      locked_binding.credential_envelope_digest
    OR locked_admission.credential_event_key IS DISTINCT FROM
      locked_binding.credential_event_key
    OR locked_admission.delivery_key <> locked_delivery.delivery_key
    OR locked_admission.delivery_claim_version <>
      locked_delivery.claim_version
    OR locked_admission.reservation_key <>
      locked_reservation.reservation_key
    OR locked_admission.sender_key IS DISTINCT FROM
      locked_reservation.sender_key
    OR locked_admission.recipient_key IS DISTINCT FROM
      locked_reservation.recipient_key
    OR locked_admission.policy_event_key IS DISTINCT FROM
      locked_reservation.policy_event_key
    OR locked_admission.phone_throughput_messages_per_second
      IS DISTINCT FROM
        locked_reservation.phone_throughput_messages_per_second
    OR locked_admission.maximum_outbound_messages_per_second
      IS DISTINCT FROM
        locked_reservation.maximum_outbound_messages_per_second
    OR locked_admission.reservation_reserved_at IS DISTINCT FROM
      locked_reservation.reserved_at
    OR locked_admission.pair_reserved_until IS DISTINCT FROM
      locked_reservation.pair_reserved_until
    OR locked_admission.reservation_expires_at IS DISTINCT FROM
      locked_reservation.reservation_expires_at
    OR locked_admission.policy_event_key IS DISTINCT FROM
      current_policy.event_key
    OR locked_admission.phone_throughput_messages_per_second
      IS DISTINCT FROM
        current_policy.phone_throughput_messages_per_second
    OR locked_admission.maximum_outbound_messages_per_second
      IS DISTINCT FROM
        current_policy.maximum_outbound_messages_per_second
    OR locked_admission.bound_at > database_now
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit admission binding conflicts';
  END IF;

  IF service_window_opened_at IS NULL
    OR service_window_opened_at > database_now
    OR database_now >= service_window_expires_at
  THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit service window is closed';
  END IF;

  derived_permit_key :=
    public.derive_bot_reply_staging_pre_send_permit_key_v1(
      persisted_tenant_id,
      locked_binding.binding_key,
      current_credential.credential_revision,
      current_credential.envelope_digest,
      current_credential_event.event_key,
      locked_admission.admission_binding_key,
      locked_admission.policy_event_key,
      locked_admission.sender_key,
      locked_admission.recipient_key,
      locked_admission.phone_throughput_messages_per_second,
      locked_admission.maximum_outbound_messages_per_second,
      requested_operation_key,
      requested_operation_kind,
      locked_delivery.delivery_key,
      locked_delivery.claim_version,
      locked_reservation.reservation_key,
      locked_admission.reservation_reserved_at,
      locked_admission.pair_reserved_until,
      locked_admission.reservation_expires_at,
      database_now
    );

  database_permit_expires_at := LEAST(
    database_now + INTERVAL '30 seconds',
    active_run.lease_expires_at,
    active_authorization.recipient_expires_at,
    active_authorization.rate_limit_expires_at,
    current_policy.evidence_expires_at,
    locked_reservation.reservation_expires_at,
    service_window_expires_at
  );

  IF database_permit_expires_at <= database_now THEN
    RAISE EXCEPTION
      'Bot reply staging credential-bound permit has no safe lifetime';
  END IF;

  INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permits (
    permit_key,
    run_binding_key,
    run_key,
    tenant_id,
    request_digest,
    audit_key,
    release_id,
    commit_sha,
    artifact_digest,
    run_claim_version,
    run_lease_expires_at,
    authorization_event_key,
    authorization_version,
    credential_revision,
    credential_envelope_digest,
    credential_event_key,
    admission_binding_key,
    operation_key,
    operation_kind,
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
    reserved_at,
    permit_expires_at,
    created_at
  ) VALUES (
    derived_permit_key,
    locked_binding.binding_key,
    active_run.run_key,
    persisted_tenant_id,
    active_run.request_digest,
    active_run.audit_key,
    active_run.release_id,
    active_run.commit_sha,
    active_run.artifact_digest,
    active_run.claim_version,
    active_run.lease_expires_at,
    active_authorization.event_key,
    active_authorization.authorization_version,
    current_credential.credential_revision,
    current_credential.envelope_digest,
    current_credential_event.event_key,
    locked_admission.admission_binding_key,
    requested_operation_key,
    requested_operation_kind,
    locked_delivery.delivery_key,
    locked_delivery.claim_version,
    locked_reservation.reservation_key,
    locked_admission.sender_key,
    locked_admission.recipient_key,
    locked_admission.policy_event_key,
    locked_admission.phone_throughput_messages_per_second,
    locked_admission.maximum_outbound_messages_per_second,
    locked_admission.reservation_reserved_at,
    locked_admission.pair_reserved_until,
    locked_admission.reservation_expires_at,
    database_now,
    database_permit_expires_at,
    database_now
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO stored_permit;

  IF NOT FOUND THEN
    SELECT permit.*
    INTO stored_permit
    FROM public.bot_reply_staging_credential_bound_pre_send_permits AS permit
    WHERE permit.tenant_id = persisted_tenant_id
      AND (
        permit.operation_key = requested_operation_key
        OR (
          permit.delivery_key = requested_delivery_key
          AND permit.delivery_claim_version =
            requested_delivery_claim_version
        )
        OR permit.reservation_key = requested_reservation_key
      )
    ORDER BY permit.permit_key
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      IF EXISTS (
        SELECT 1
        FROM public.bot_reply_staging_credential_bound_pre_send_permits
          AS key_collision
        WHERE key_collision.permit_key = derived_permit_key
      ) THEN
        RAISE EXCEPTION
          'Bot reply staging credential-bound permit key collision';
      END IF;

      RAISE EXCEPTION
        'Bot reply staging credential-bound permit conflict';
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

    IF stored_permit.permit_key <> recomputed_permit_key
      OR stored_permit.run_binding_key <> requested_run_binding_key
      OR stored_permit.run_key <> requested_run_key
      OR stored_permit.tenant_id <> persisted_tenant_id
      OR stored_permit.request_digest <> requested_request_digest
      OR stored_permit.audit_key <> requested_audit_key
      OR stored_permit.release_id <> requested_release_id
      OR stored_permit.commit_sha <> requested_commit_sha
      OR stored_permit.artifact_digest <> requested_artifact_digest
      OR stored_permit.run_claim_version <>
        requested_run_claim_version
      OR stored_permit.run_lease_expires_at <>
        requested_run_lease_expires_at
      OR stored_permit.authorization_event_key <>
        locked_binding.authorization_event_key
      OR stored_permit.authorization_version <>
        locked_binding.authorization_version
      OR stored_permit.credential_revision <>
        locked_binding.credential_revision
      OR stored_permit.credential_envelope_digest <>
        locked_binding.credential_envelope_digest
      OR stored_permit.credential_event_key <>
        locked_binding.credential_event_key
      OR stored_permit.admission_binding_key <>
        requested_admission_binding_key
      OR stored_permit.operation_key <> requested_operation_key
      OR stored_permit.operation_kind <> requested_operation_kind
      OR stored_permit.delivery_key <> requested_delivery_key
      OR stored_permit.delivery_claim_version <>
        requested_delivery_claim_version
      OR stored_permit.reservation_key <> requested_reservation_key
      OR stored_permit.run_binding_key IS DISTINCT FROM
        locked_admission.run_binding_key
      OR stored_permit.run_key IS DISTINCT FROM
        locked_admission.run_key
      OR stored_permit.run_claim_version IS DISTINCT FROM
        locked_admission.run_claim_version
      OR stored_permit.authorization_event_key IS DISTINCT FROM
        locked_admission.authorization_event_key
      OR stored_permit.authorization_version IS DISTINCT FROM
        locked_admission.authorization_version
      OR stored_permit.credential_revision IS DISTINCT FROM
        locked_admission.credential_revision
      OR stored_permit.credential_envelope_digest IS DISTINCT FROM
        locked_admission.credential_envelope_digest
      OR stored_permit.credential_event_key IS DISTINCT FROM
        locked_admission.credential_event_key
      OR stored_permit.sender_key IS DISTINCT FROM
        locked_admission.sender_key
      OR stored_permit.recipient_key IS DISTINCT FROM
        locked_admission.recipient_key
      OR stored_permit.policy_event_key IS DISTINCT FROM
        locked_admission.policy_event_key
      OR stored_permit.phone_throughput_messages_per_second IS DISTINCT FROM
        locked_admission.phone_throughput_messages_per_second
      OR stored_permit.maximum_outbound_messages_per_second IS DISTINCT FROM
        locked_admission.maximum_outbound_messages_per_second
      OR stored_permit.reservation_reserved_at IS DISTINCT FROM
        locked_admission.reservation_reserved_at
      OR stored_permit.pair_reserved_until IS DISTINCT FROM
        locked_admission.pair_reserved_until
      OR stored_permit.reservation_expires_at IS DISTINCT FROM
        locked_admission.reservation_expires_at
      OR stored_permit.credential_revision IS DISTINCT FROM
        current_credential.credential_revision
      OR stored_permit.credential_envelope_digest IS DISTINCT FROM
        current_credential.envelope_digest
      OR stored_permit.credential_event_key IS DISTINCT FROM
        current_credential_event.event_key
      OR stored_permit.authorization_event_key IS DISTINCT FROM
        active_authorization.event_key
      OR stored_permit.authorization_version IS DISTINCT FROM
        active_authorization.authorization_version
      OR stored_permit.policy_event_key IS DISTINCT FROM
        current_policy.event_key
      OR stored_permit.sender_key IS DISTINCT FROM
        locked_reservation.sender_key
      OR stored_permit.recipient_key IS DISTINCT FROM
        locked_reservation.recipient_key
      OR stored_permit.policy_event_key IS DISTINCT FROM
        locked_reservation.policy_event_key
      OR stored_permit.phone_throughput_messages_per_second IS DISTINCT FROM
        locked_reservation.phone_throughput_messages_per_second
      OR stored_permit.maximum_outbound_messages_per_second IS DISTINCT FROM
        locked_reservation.maximum_outbound_messages_per_second
      OR stored_permit.reservation_reserved_at IS DISTINCT FROM
        locked_reservation.reserved_at
      OR stored_permit.pair_reserved_until IS DISTINCT FROM
        locked_reservation.pair_reserved_until
      OR stored_permit.reservation_expires_at IS DISTINCT FROM
        locked_reservation.reservation_expires_at
    THEN
      RAISE EXCEPTION
        'Bot reply staging credential-bound permit conflict';
    END IF;

    RETURN QUERY SELECT NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT stored_permit.permit_key;
END;
$$;

REVOKE ALL ON TABLE
  public.bot_reply_staging_pre_send_admission_bindings,
  public.bot_reply_staging_run_credential_bindings,
  public.bot_reply_staging_credential_bound_pre_send_permits,
  public.bot_reply_staging_credential_bound_pre_send_permit_consumptions,
  public.bot_reply_staging_credential_bound_pre_send_permit_resolutions
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.bind_bot_reply_staging_authorization_credential_v1()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_bot_reply_staging_pre_send_ledger_mutation()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.derive_bot_reply_staging_pre_send_permit_key_v1(
    BIGINT,
    TEXT,
    BIGINT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    INTEGER,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TIMESTAMPTZ
  )
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_bot_reply_staging_run_v2(
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
  TEXT,
  TEXT
)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2(
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
    TEXT,
    TEXT,
    INTEGER,
    TEXT
  )
FROM PUBLIC;

DO $d31d1d_b2a1_postcondition$
DECLARE
  protected_relation_count INTEGER;
  protected_function_count INTEGER;
  expected_trigger_count INTEGER;
  actual_trigger_count INTEGER;
  forbidden_capability_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_relation_count
  FROM pg_catalog.pg_class AS relation
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_pre_send_admission_bindings',
      'bot_reply_staging_run_credential_bindings',
      'bot_reply_staging_credential_bound_pre_send_permits',
      'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
      'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
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

  SELECT pg_catalog.count(*)::INTEGER
  INTO protected_function_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'bind_bot_reply_staging_authorization_credential_v1',
      'reject_bot_reply_staging_pre_send_ledger_mutation',
      'derive_bot_reply_staging_pre_send_permit_key_v1',
      'claim_bot_reply_staging_run_v2',
      'reserve_bot_reply_staging_credential_bound_pre_send_permit_v2'
    )
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
        'bot_reply_staging_authorization_events',
        'bot_reply_staging_authorizations_credential_binding_guard',
        'bind_bot_reply_staging_authorization_credential_v1',
        7
      ),
      (
        'bot_reply_staging_pre_send_admission_bindings',
        'bot_reply_staging_pre_send_admission_mutation_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        27
      ),
      (
        'bot_reply_staging_pre_send_admission_bindings',
        'bot_reply_staging_pre_send_admission_truncate_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        34
      ),
      (
        'bot_reply_staging_run_credential_bindings',
        'bot_reply_staging_run_bindings_mutation_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        27
      ),
      (
        'bot_reply_staging_run_credential_bindings',
        'bot_reply_staging_run_bindings_truncate_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        34
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permits',
        'bot_reply_staging_pre_send_permits_mutation_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        27
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permits',
        'bot_reply_staging_pre_send_permits_truncate_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        34
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
        'bot_reply_staging_pre_send_consumptions_mutation_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        27
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
        'bot_reply_staging_pre_send_consumptions_truncate_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        34
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permit_resolutions',
        'bot_reply_staging_pre_send_resolutions_mutation_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        27
      ),
      (
        'bot_reply_staging_credential_bound_pre_send_permit_resolutions',
        'bot_reply_staging_pre_send_resolutions_truncate_guard',
        'reject_bot_reply_staging_pre_send_ledger_mutation',
        34
      )
  )
  SELECT pg_catalog.count(*)::INTEGER
  INTO expected_trigger_count
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
    AND trigger.tgfoid = pg_catalog.to_regprocedure(
      'public.' || expected.function_name || '()'
    )
    AND procedure.pronargs = 0
    AND procedure.prorettype =
      'pg_catalog.trigger'::pg_catalog.regtype
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
  INTO actual_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  INNER JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'bot_reply_staging_pre_send_admission_bindings',
      'bot_reply_staging_run_credential_bindings',
      'bot_reply_staging_credential_bound_pre_send_permits',
      'bot_reply_staging_credential_bound_pre_send_permit_consumptions',
      'bot_reply_staging_credential_bound_pre_send_permit_resolutions'
    )
    AND trigger.tgisinternal = false;

  SELECT pg_catalog.count(*)::INTEGER
  INTO forbidden_capability_count
  FROM pg_catalog.pg_proc AS procedure
  INNER JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname OPERATOR(pg_catalog.~)
      '^(consume|release|finalize|reconcile)_bot_reply_staging_credential_bound_pre_send_permit';

  IF protected_relation_count <> 5
    OR protected_function_count <> 5
    OR expected_trigger_count <> 11
    OR actual_trigger_count <> 10
    OR forbidden_capability_count <> 0
  THEN
    RAISE EXCEPTION
      'D31-D1d-B-B2a1 postcondition failed: relations %, functions %, expected triggers %, ledger triggers %, forbidden capabilities %',
      protected_relation_count,
      protected_function_count,
      expected_trigger_count,
      actual_trigger_count,
      forbidden_capability_count;
  END IF;
END;
$d31d1d_b2a1_postcondition$;
