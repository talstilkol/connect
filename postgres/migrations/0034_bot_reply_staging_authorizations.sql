-- Railway-only immutable safety evidence for authorized Bot reply staging runs.
-- Recipient phone numbers and provider credentials are intentionally absent.

CREATE TABLE bot_reply_staging_authorization_events (
  event_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  authorization_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  environment TEXT NOT NULL,
  connection_mode TEXT NOT NULL,
  connection_version INTEGER NOT NULL,
  policy_version INTEGER NOT NULL,
  recipient_fingerprint TEXT NOT NULL,
  recipient_opt_in_recorded BOOLEAN NOT NULL,
  recipient_opt_in_recorded_at TIMESTAMPTZ NOT NULL,
  recipient_expires_at TIMESTAMPTZ NOT NULL,
  rate_limit_approved_by TEXT NOT NULL,
  rate_limit_approved_at TIMESTAMPTZ NOT NULL,
  rate_limit_expires_at TIMESTAMPTZ NOT NULL,
  rate_limit_method_fingerprint TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bot_reply_staging_authorizations_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_authorizations_policy_fk
    FOREIGN KEY (tenant_id, policy_version)
    REFERENCES whatsapp_campaign_delivery_policy_events (
      tenant_id,
      policy_version
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_staging_authorizations_event_key_sha256
    CHECK (
      event_key ~ '^bot_reply_staging_authorization_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_authorizations_version_positive
    CHECK (
      authorization_version >= 1
      AND connection_version >= 1
      AND policy_version >= 1
    ),
  CONSTRAINT bot_reply_staging_authorizations_status_valid
    CHECK (status IN ('approved', 'revoked')),
  CONSTRAINT bot_reply_staging_authorizations_scope_valid
    CHECK (
      environment = 'staging'
      AND connection_mode = 'approved-staging-waba'
    ),
  CONSTRAINT bot_reply_staging_authorizations_recipient_valid
    CHECK (
      recipient_fingerprint ~ '^sha256:[0-9a-f]{64}$'
      AND recipient_opt_in_recorded
    ),
  CONSTRAINT bot_reply_staging_authorizations_rate_limit_valid
    CHECK (
      rate_limit_approved_by = 'tal'
      AND rate_limit_method_fingerprint ~ '^sha256:[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_staging_authorizations_actor_bounded
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 255
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT bot_reply_staging_authorizations_time_canonical
    CHECK (
      recipient_opt_in_recorded_at =
        date_trunc('milliseconds', recipient_opt_in_recorded_at)
      AND recipient_expires_at =
        date_trunc('milliseconds', recipient_expires_at)
      AND rate_limit_approved_at =
        date_trunc('milliseconds', rate_limit_approved_at)
      AND rate_limit_expires_at =
        date_trunc('milliseconds', rate_limit_expires_at)
      AND recorded_at = date_trunc('milliseconds', recorded_at)
      AND created_at = recorded_at
      AND recipient_opt_in_recorded_at <= recorded_at
      AND recipient_opt_in_recorded_at < recipient_expires_at
      AND rate_limit_approved_at <= recorded_at
      AND rate_limit_approved_at < rate_limit_expires_at
      AND (
        status = 'revoked'
        OR (
          recorded_at < recipient_expires_at
          AND recorded_at < rate_limit_expires_at
        )
      )
    ),
  CONSTRAINT bot_reply_staging_authorizations_tenant_version_uq
    UNIQUE (tenant_id, authorization_version)
);

CREATE INDEX bot_reply_staging_authorizations_latest_idx
  ON bot_reply_staging_authorization_events (
    tenant_id,
    authorization_version DESC
  );

CREATE FUNCTION enforce_bot_reply_staging_authorization_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  connection_record meta_connections%ROWTYPE;
  policy_record whatsapp_campaign_delivery_policy_events%ROWTYPE;
  existing_record bot_reply_staging_authorization_events%ROWTYPE;
  previous_record bot_reply_staging_authorization_events%ROWTYPE;
  next_authorization_version INTEGER;
BEGIN
  SELECT *
  INTO connection_record
  FROM meta_connections
  WHERE tenant_id = NEW.tenant_id
  FOR UPDATE;

  SELECT *
  INTO existing_record
  FROM bot_reply_staging_authorization_events
  WHERE event_key = NEW.event_key;

  IF existing_record.event_key IS NOT NULL THEN
    IF existing_record IS DISTINCT FROM NEW THEN
      RAISE EXCEPTION
        'Bot reply staging authorization identity conflicts';
    END IF;
    RETURN NEW;
  END IF;

  SELECT coalesce(max(authorization_version) + 1, 1)
  INTO next_authorization_version
  FROM bot_reply_staging_authorization_events
  WHERE tenant_id = NEW.tenant_id;

  IF NEW.authorization_version <> next_authorization_version THEN
    RAISE EXCEPTION
      'Bot reply staging authorization version is not sequential';
  END IF;

  SELECT *
  INTO previous_record
  FROM bot_reply_staging_authorization_events
  WHERE tenant_id = NEW.tenant_id
  ORDER BY authorization_version DESC
  LIMIT 1;

  IF NEW.status = 'approved' THEN
    IF connection_record.tenant_id IS NULL
      OR connection_record.status <> 'connected'
      OR connection_record.version <> NEW.connection_version
    THEN
      RAISE EXCEPTION
        'Bot reply staging authorization lacks current Meta connection';
    END IF;

    SELECT *
    INTO policy_record
    FROM whatsapp_campaign_delivery_policy_events
    WHERE tenant_id = NEW.tenant_id
      AND policy_version = NEW.policy_version;

    IF policy_record.tenant_id IS NULL
      OR policy_record.policy_version <> (
        SELECT max(latest.policy_version)
        FROM whatsapp_campaign_delivery_policy_events AS latest
        WHERE latest.tenant_id = NEW.tenant_id
      )
      OR policy_record.connection_version <> NEW.connection_version
      OR policy_record.delivery_state <> 'enabled'
      OR policy_record.evidence_checked_at > NEW.recorded_at
      OR policy_record.recorded_at > NEW.recorded_at
      OR NEW.recorded_at >= policy_record.evidence_expires_at
      OR NOT EXISTS (
        SELECT 1
        FROM meta_credential_envelopes AS credential
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

CREATE TRIGGER bot_reply_staging_authorizations_insert_guard
BEFORE INSERT ON bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION enforce_bot_reply_staging_authorization_insert();

CREATE FUNCTION reject_bot_reply_staging_authorization_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Bot reply staging authorization events are immutable';
END;
$$;

CREATE TRIGGER bot_reply_staging_authorizations_update_guard
BEFORE UPDATE ON bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_authorization_mutation();

CREATE TRIGGER bot_reply_staging_authorizations_delete_guard
BEFORE DELETE ON bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION reject_bot_reply_staging_authorization_mutation();

CREATE FUNCTION audit_bot_reply_staging_authorization_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (
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
    NEW.tenant_id::TEXT,
    NEW.event_key,
    jsonb_build_object(
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

CREATE TRIGGER bot_reply_staging_authorizations_insert_audit
AFTER INSERT ON bot_reply_staging_authorization_events
FOR EACH ROW
EXECUTE FUNCTION audit_bot_reply_staging_authorization_insert();

CREATE FUNCTION guard_bot_reply_staging_authorization_audit_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.action IN (
    'bot-reply-staging.authorization-approved',
    'bot-reply-staging.authorization-revoked'
  ) THEN
    RAISE EXCEPTION 'Bot reply staging authorization audit is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_logs_bot_reply_staging_authorization_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION guard_bot_reply_staging_authorization_audit_immutability();
