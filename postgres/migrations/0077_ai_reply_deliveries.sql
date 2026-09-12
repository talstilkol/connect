-- Approved AI drafts have a separate, single-POST delivery lifecycle.
CREATE TABLE ai_reply_deliveries (
  delivery_key TEXT PRIMARY KEY CHECK (delivery_key ~ '^ai_reply_delivery_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  outbox_key TEXT NOT NULL,
  approval_version INTEGER NOT NULL CHECK (approval_version >= 2),
  conversation_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'preparing', 'sending', 'sent', 'failed', 'unknown')),
  claim_version INTEGER NOT NULL DEFAULT 0 CHECK (claim_version >= 0),
  binding_json JSONB CHECK (jsonb_typeof(binding_json) = 'object' AND octet_length(binding_json::text) <= 16384),
  claim_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  reservation_key TEXT CHECK (reservation_key ~ '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'),
  provider_started_at TIMESTAMPTZ,
  provider_message_id TEXT CHECK (length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id = btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  error_code TEXT CHECK (error_code ~ '^[A-Z0-9_]{1,100}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  FOREIGN KEY (tenant_id, outbox_key) REFERENCES ai_reply_outbox(tenant_id, outbox_key) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, conversation_key) REFERENCES conversations(tenant_id, conversation_key) ON DELETE RESTRICT,
  UNIQUE (tenant_id, outbox_key),
  UNIQUE (tenant_id, provider_message_id),
  CHECK (updated_at >= created_at),
  CHECK ((state = 'preparing') = (claim_expires_at IS NOT NULL)),
  CHECK ((state = 'sent') = (provider_message_id IS NOT NULL)),
  CHECK (state NOT IN ('preparing', 'sending', 'sent', 'unknown') OR binding_json IS NOT NULL),
  CHECK (state NOT IN ('sending', 'sent', 'unknown') OR (provider_started_at IS NOT NULL AND reservation_key IS NOT NULL))
);
CREATE INDEX ai_reply_delivery_claim_idx ON ai_reply_deliveries(next_attempt_at, delivery_key) WHERE state IN ('queued', 'preparing');
CREATE INDEX ai_reply_delivery_conversation_idx ON ai_reply_deliveries(tenant_id, conversation_key, created_at);
CREATE INDEX ai_reply_delivery_sending_idx ON ai_reply_deliveries(provider_started_at) WHERE state = 'sending';

-- Approval cannot authorize a subsequently edited payload or be reversed after dispatch.
CREATE FUNCTION guard_ai_reply_approval_identity() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF OLD.status <> 'awaiting-approval' OR NEW.status NOT IN ('ready-for-delivery', 'rejected') OR
    NEW.version <> OLD.version + 1 OR
    (to_jsonb(OLD) - 'status' - 'version' - 'decided_by_external_user_id' - 'decided_at' - 'updated_at') IS DISTINCT FROM
    (to_jsonb(NEW) - 'status' - 'version' - 'decided_by_external_user_id' - 'decided_at' - 'updated_at') THEN
    RAISE EXCEPTION 'AI reply approval payload is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ai_reply_approval_identity_guard BEFORE UPDATE ON ai_reply_outbox
FOR EACH ROW EXECUTE FUNCTION guard_ai_reply_approval_identity();

CREATE FUNCTION guard_ai_reply_delivery_transition() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'queued' OR NEW.claim_version <> 0 OR NEW.binding_json IS NOT NULL OR
      NEW.provider_started_at IS NOT NULL OR NEW.reservation_key IS NOT NULL THEN
      RAISE EXCEPTION 'AI delivery must start queued';
    END IF;
  ELSE
    IF (OLD.delivery_key, OLD.tenant_id, OLD.outbox_key, OLD.approval_version, OLD.conversation_key, OLD.created_at)
      IS DISTINCT FROM (NEW.delivery_key, NEW.tenant_id, NEW.outbox_key, NEW.approval_version, NEW.conversation_key, NEW.created_at) OR
      OLD.state IN ('sent', 'failed') OR
      (OLD.state = 'sending' AND NEW.state NOT IN ('sent', 'failed', 'unknown')) OR
      (OLD.state = 'unknown' AND NEW.state NOT IN ('sent', 'failed')) OR
      (OLD.state IN ('sending', 'unknown') AND (OLD.binding_json, OLD.claim_version, OLD.provider_started_at, OLD.reservation_key)
        IS DISTINCT FROM (NEW.binding_json, NEW.claim_version, NEW.provider_started_at, NEW.reservation_key)) OR
      (OLD.state = 'queued' AND NEW.state NOT IN ('queued', 'preparing', 'failed')) OR
      (OLD.state = 'preparing' AND NEW.state NOT IN ('queued', 'preparing', 'sending', 'failed')) OR
      (NEW.state = 'preparing' AND NEW.claim_version <> OLD.claim_version + 1) OR
      (NEW.state <> 'preparing' AND NEW.claim_version <> OLD.claim_version) OR
      (NEW.state = 'sending' AND (OLD.state <> 'preparing' OR OLD.binding_json IS DISTINCT FROM NEW.binding_json)) THEN
      RAISE EXCEPTION 'AI delivery transition is invalid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ai_reply_delivery_transition_guard BEFORE INSERT OR UPDATE ON ai_reply_deliveries
FOR EACH ROW EXECUTE FUNCTION guard_ai_reply_delivery_transition();

CREATE FUNCTION audit_ai_reply_delivery_transition() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO public.audit_logs (tenant_id, actor_external_user_id, action, target_type, target_id, metadata_json)
    SELECT NEW.tenant_id, o.decided_by_external_user_id, 'ai.reply-delivery.' || NEW.state, 'ai_reply_delivery', NEW.delivery_key,
      jsonb_build_object('approvalVersion', NEW.approval_version, 'claimVersion', NEW.claim_version, 'errorCode', NEW.error_code)
    FROM public.ai_reply_outbox o WHERE o.tenant_id = NEW.tenant_id AND o.outbox_key = NEW.outbox_key;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ai_reply_delivery_audit AFTER INSERT OR UPDATE ON ai_reply_deliveries
FOR EACH ROW EXECUTE FUNCTION audit_ai_reply_delivery_transition();
