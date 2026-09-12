-- Private evidence closes an uncertain original AI delivery; it never queues a send.
CREATE TABLE ai_delivery_reconciliations (
  recovery_key TEXT PRIMARY KEY CHECK(recovery_key ~ '^ai_delivery_recovery_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL,
  delivery_key TEXT NOT NULL UNIQUE REFERENCES ai_reply_deliveries(delivery_key) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('accepted','not-accepted')),
  provider_message_id TEXT,
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest TEXT NOT NULL CHECK(snapshot_digest ~ '^[a-f0-9]{64}$'),
  original_state JSONB NOT NULL,
  operator_role NAME NOT NULL DEFAULT session_user,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK((action='accepted' AND provider_message_id IS NOT NULL AND length(provider_message_id) BETWEEN 1 AND 255
    AND provider_message_id=btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]') OR (action='not-accepted' AND provider_message_id IS NULL))
);
CREATE TABLE ai_delivery_late_acceptances (
  delivery_key TEXT NOT NULL REFERENCES ai_reply_deliveries(delivery_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  claim_version INTEGER NOT NULL,
  provider_message_id TEXT NOT NULL CHECK(length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id=btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  observed_xid XID8 NOT NULL DEFAULT pg_current_xact_id(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(delivery_key,provider_message_id)
);
REVOKE ALL ON ai_delivery_reconciliations,ai_delivery_late_acceptances FROM PUBLIC;
CREATE TRIGGER ai_delivery_recovery_immutable BEFORE UPDATE OR DELETE ON ai_delivery_reconciliations FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_delivery_recovery_no_truncate BEFORE TRUNCATE ON ai_delivery_reconciliations FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_delivery_late_immutable BEFORE UPDATE OR DELETE ON ai_delivery_late_acceptances FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_delivery_late_no_truncate BEFORE TRUNCATE ON ai_delivery_late_acceptances FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();

CREATE FUNCTION public.ai_delivery_recovery_snapshot_v1(t BIGINT,k TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE d public.ai_reply_deliveries%ROWTYPE; result JSONB;
BEGIN
  PERFORM public.ai_recovery_authorize_v1(t);
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT * INTO d FROM public.ai_reply_deliveries WHERE tenant_id=t AND delivery_key=k;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI delivery unavailable'; END IF;
  PERFORM 1 FROM public.ai_reply_outbox WHERE tenant_id=t AND outbox_key=d.outbox_key FOR UPDATE;
  PERFORM 1 FROM public.conversations WHERE tenant_id=t AND conversation_key=d.conversation_key FOR UPDATE;
  SELECT * INTO d FROM public.ai_reply_deliveries WHERE tenant_id=t AND delivery_key=k FOR UPDATE;
  result:=jsonb_build_object('delivery',to_jsonb(d),
    'approval',(SELECT to_jsonb(o) FROM public.ai_reply_outbox o WHERE o.tenant_id=t AND o.outbox_key=d.outbox_key),
    'reconciliation',(SELECT to_jsonb(r) FROM public.ai_delivery_reconciliations r WHERE r.delivery_key=k));
  RETURN jsonb_build_object('snapshot',result,'snapshotDigest',encode(sha256(convert_to(result::text,'UTF8')),'hex'),'operatorRole',session_user,'observedAt',clock_timestamp());
END;
$$;
REVOKE ALL ON FUNCTION ai_delivery_recovery_snapshot_v1(BIGINT,TEXT) FROM PUBLIC;

CREATE FUNCTION public.apply_ai_delivery_recovery_v1(t BIGINT,k TEXT,expected_digest TEXT,prepared_at TIMESTAMPTZ,expected_actor TEXT,action_name TEXT,provider_id TEXT,evidence TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE observed JSONB; d public.ai_reply_deliveries%ROWTYPE; approval public.ai_reply_outbox%ROWTYPE; existing public.messages%ROWTYPE; recovery TEXT; message_identity TEXT; stamp TIMESTAMPTZ;
BEGIN
  observed:=public.ai_delivery_recovery_snapshot_v1(t,k);
  IF expected_actor IS DISTINCT FROM session_user::text OR expected_digest IS NULL OR expected_digest !~ '^[a-f0-9]{64}$' OR evidence IS NULL OR evidence !~ '^[a-f0-9]{64}$'
    THEN RAISE EXCEPTION 'AI delivery recovery identity invalid'; END IF;
  recovery:='ai_delivery_recovery_v1_'||encode(sha256(convert_to(jsonb_build_array(t,k,expected_digest,prepared_at,expected_actor,action_name,provider_id,evidence)::text,'UTF8')),'hex');
  IF EXISTS(SELECT 1 FROM public.ai_delivery_reconciliations WHERE recovery_key=recovery) THEN RETURN recovery; END IF;
  IF prepared_at IS NULL OR NOT isfinite(prepared_at) OR prepared_at>clock_timestamp() OR prepared_at<clock_timestamp()-interval '5 minutes'
    OR observed->>'snapshotDigest' IS DISTINCT FROM expected_digest THEN RAISE EXCEPTION 'AI delivery recovery snapshot stale'; END IF;
  SELECT * INTO d FROM public.ai_reply_deliveries WHERE tenant_id=t AND delivery_key=k;
  IF NOT(d.state='unknown' OR (d.state='sending' AND d.provider_started_at<clock_timestamp()-interval '2 minutes'))
    OR d.provider_message_id IS NOT NULL OR d.provider_started_at IS NULL THEN RAISE EXCEPTION 'AI delivery is not uncertain'; END IF;
  SELECT * INTO approval FROM public.ai_reply_outbox WHERE tenant_id=t AND outbox_key=d.outbox_key;
  INSERT INTO public.ai_delivery_reconciliations(recovery_key,tenant_id,delivery_key,action,provider_message_id,evidence_digest,snapshot_digest,original_state)
    VALUES(recovery,t,k,action_name,provider_id,evidence,expected_digest,observed->'snapshot'->'delivery');
  stamp:=date_trunc('milliseconds',clock_timestamp());
  IF action_name='not-accepted' THEN
    UPDATE public.ai_reply_deliveries SET state='failed',error_code='OPERATOR_CONFIRMED_NOT_ACCEPTED',updated_at=stamp WHERE delivery_key=k;
  ELSE
    message_identity:='message_v1_'||encode(sha256(convert_to(jsonb_build_array('ai_delivery_recovery_v1',t,provider_id)::text,'UTF8')),'hex');
    INSERT INTO public.messages(message_key,conversation_key,tenant_id,provider_message_id,direction,content_kind,status,text_content,occurred_at,status_updated_at)
      VALUES(message_identity,d.conversation_key,t,provider_id,'outbound','text','sent',approval.reply_text,d.provider_started_at,d.provider_started_at)
      ON CONFLICT(tenant_id,provider_message_id) DO NOTHING;
    SELECT * INTO existing FROM public.messages WHERE tenant_id=t AND provider_message_id=provider_id FOR UPDATE;
    IF (existing.conversation_key,existing.direction,existing.content_kind,existing.text_content) IS DISTINCT FROM (d.conversation_key,'outbound','text',approval.reply_text)
      THEN RAISE EXCEPTION 'AI delivery provider identity conflicts'; END IF;
    UPDATE public.conversations SET last_message_key=CASE WHEN last_message_at IS NULL OR last_message_at<=d.provider_started_at THEN existing.message_key ELSE last_message_key END,
      last_message_at=greatest(last_message_at,d.provider_started_at),version=version+1,updated_at=stamp WHERE tenant_id=t AND conversation_key=d.conversation_key;
    UPDATE public.ai_reply_deliveries SET state='sent',provider_message_id=provider_id,error_code=NULL,updated_at=stamp WHERE delivery_key=k;
  END IF;
  INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(t,session_user,'ai.delivery.reconciled','ai_reply_delivery',k,jsonb_build_object('recoveryKey',recovery,'action',action_name,'evidenceDigest',evidence));
  RETURN recovery;
END;
$$;
REVOKE ALL ON FUNCTION apply_ai_delivery_recovery_v1(BIGINT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;

CREATE FUNCTION public.record_ai_delivery_late_acceptance_v1(t BIGINT,k TEXT,claim INTEGER,provider_id TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE d public.ai_reply_deliveries%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT * INTO d FROM public.ai_reply_deliveries WHERE tenant_id=t AND delivery_key=k FOR UPDATE;
  IF NOT FOUND OR d.claim_version IS DISTINCT FROM claim OR d.state<>'failed' OR d.error_code IS DISTINCT FROM 'OPERATOR_CONFIRMED_NOT_ACCEPTED'
    OR NOT EXISTS(SELECT 1 FROM public.ai_delivery_reconciliations WHERE delivery_key=k AND action='not-accepted') THEN RAISE EXCEPTION 'AI late acceptance scope invalid'; END IF;
  INSERT INTO public.ai_delivery_late_acceptances(delivery_key,tenant_id,claim_version,provider_message_id) VALUES(k,t,claim,provider_id);
  INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(t,NULL,'ai.delivery.late-acceptance','ai_reply_delivery',k,jsonb_build_object('claimVersion',claim,'providerMessageId',provider_id));
END;
$$;
REVOKE ALL ON FUNCTION record_ai_delivery_late_acceptance_v1(BIGINT,TEXT,INTEGER,TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION guard_ai_reply_delivery_transition() RETURNS TRIGGER
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
      (OLD.state='sent' OR (OLD.state='failed' AND NOT(OLD.error_code='OPERATOR_CONFIRMED_NOT_ACCEPTED' AND NEW.state='sent'
        AND (to_jsonb(OLD)-'state'-'provider_message_id'-'error_code'-'updated_at')=(to_jsonb(NEW)-'state'-'provider_message_id'-'error_code'-'updated_at')
        AND EXISTS(SELECT 1 FROM public.ai_delivery_late_acceptances l WHERE l.delivery_key=OLD.delivery_key AND l.tenant_id=OLD.tenant_id
          AND l.claim_version=OLD.claim_version AND l.provider_message_id=NEW.provider_message_id AND l.observed_xid=pg_current_xact_id())))) OR
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

CREATE OR REPLACE FUNCTION guard_message_bot_reply_target()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'provider-message:' || NEW.tenant_id::text || ':' ||
        NEW.provider_message_id,
      0
    )
  );
  IF EXISTS (
    SELECT 1 FROM public.bot_reply_delivery_provider_links
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to a bot reply';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_message_campaign_delivery_target()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'provider-message:' || NEW.tenant_id::text || ':' ||
        NEW.provider_message_id,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.campaign_delivery_provider_links
    WHERE tenant_id = NEW.tenant_id
      AND provider_message_id = NEW.provider_message_id
  ) THEN
    RAISE EXCEPTION 'Provider message already belongs to a campaign delivery';
  END IF;

  RETURN NEW;
END;
$$;
