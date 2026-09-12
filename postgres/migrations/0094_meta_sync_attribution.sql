-- A private operator attests one retained event against one accepted request.
-- Arrival time, receiver version and progress are never attribution evidence.
CREATE TABLE meta_sync_attribution_grants (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL CHECK(isfinite(expires_at)),
  PRIMARY KEY(database_role,tenant_id),
  CHECK(database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
REVOKE ALL ON meta_sync_attribution_grants FROM PUBLIC;
CREATE FUNCTION public.meta_sync_attribution_authorize_v1(t BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.meta_sync_attribution_grants WHERE tenant_id=t AND database_role=session_user AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sync attribution authorization required'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION meta_sync_attribution_authorize_v1(BIGINT) FROM PUBLIC;

CREATE TABLE meta_sync_attributions (
  tenant_id BIGINT NOT NULL,
  event_digest TEXT NOT NULL,
  connection_version INTEGER NOT NULL,
  sync_type TEXT NOT NULL CHECK(sync_type IN ('history','smb_app_state_sync')),
  attribution_key TEXT NOT NULL UNIQUE CHECK(attribution_key ~ '^meta_sync_attribution_v1_[a-f0-9]{64}$'),
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest TEXT NOT NULL CHECK(snapshot_digest ~ '^[a-f0-9]{64}$'),
  provider_request_id TEXT NOT NULL CHECK(length(provider_request_id) BETWEEN 1 AND 255),
  operator_role NAME NOT NULL DEFAULT session_user,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(tenant_id,event_digest),
  FOREIGN KEY(tenant_id,event_digest) REFERENCES meta_sync_unattributed_events(tenant_id,event_digest) ON DELETE RESTRICT,
  FOREIGN KEY(tenant_id,sync_type,connection_version) REFERENCES meta_data_sync_requests(tenant_id,sync_type,connection_version) ON DELETE RESTRICT
);
CREATE TABLE meta_sync_attribution_imports (
  tenant_id BIGINT NOT NULL,
  event_digest TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('stored','duplicate','conflicted','discarded','updated','ignored')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(tenant_id,event_digest),
  FOREIGN KEY(tenant_id,event_digest) REFERENCES meta_sync_attributions(tenant_id,event_digest) ON DELETE RESTRICT
);
REVOKE ALL ON meta_sync_attributions,meta_sync_attribution_imports FROM PUBLIC;
CREATE TRIGGER meta_sync_attribution_immutable BEFORE UPDATE OR DELETE ON meta_sync_attributions
  FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER meta_sync_attribution_no_truncate BEFORE TRUNCATE ON meta_sync_attributions
  FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER meta_sync_import_immutable BEFORE UPDATE OR DELETE ON meta_sync_attribution_imports
  FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER meta_sync_import_no_truncate BEFORE TRUNCATE ON meta_sync_attribution_imports
  FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();

-- Payload-free authorization for a source generation, including one for which
-- the first approved history event has not created a session yet.
CREATE VIEW meta_sync_generation_authorizations AS
SELECT request.tenant_id,request.sync_type,request.waba_id,request.phone_number_id,
  request.connection_version AS source_connection_version,connection.version AS current_connection_version
FROM meta_data_sync_requests AS request
JOIN tenants AS tenant ON tenant.id=request.tenant_id AND tenant.status IN ('active','trial','payment_failed')
JOIN meta_connections AS connection ON connection.tenant_id=request.tenant_id AND connection.waba_id=request.waba_id
  AND connection.phone_number_id=request.phone_number_id AND connection.status='connected'
WHERE request.status IN ('dispatching','accepted','unknown')
  AND NOT EXISTS(SELECT 1 FROM meta_sync_import_refusals refusal WHERE refusal.tenant_id=request.tenant_id
    AND refusal.waba_id=request.waba_id AND refusal.phone_number_id=request.phone_number_id)
  AND NOT EXISTS(SELECT 1 FROM meta_history_sync_sessions declined WHERE declined.tenant_id=request.tenant_id
    AND declined.waba_id=request.waba_id AND declined.phone_number_id=request.phone_number_id AND declined.sharing_state='declined')
  AND (connection.version=request.connection_version OR (connection.version>request.connection_version AND EXISTS(
    SELECT 1 FROM meta_signup_launches launch JOIN railway_api_mutation_receipts receipt ON receipt.tenant_id=launch.tenant_id
      AND receipt.operation=launch.operation AND receipt.idempotency_key=launch.claim_key
      AND receipt.request_digest=launch.request_digest AND receipt.actor_external_user_id=launch.actor_external_user_id
    WHERE launch.tenant_id=request.tenant_id AND launch.status='finished' AND receipt.status='completed'
      AND receipt.response_json=jsonb_build_object('status','connected','connectionVersion',connection.version)
  )));
CREATE OR REPLACE VIEW meta_history_read_authorizations AS
SELECT session.tenant_id,session.waba_id,session.phone_number_id,
  session.connection_version AS source_connection_version,permitted.current_connection_version
FROM meta_history_sync_sessions session JOIN meta_sync_generation_authorizations permitted
  ON permitted.tenant_id=session.tenant_id AND permitted.sync_type='history' AND permitted.source_connection_version=session.connection_version
WHERE session.sharing_state='data_received' AND NOT session.has_conflict;

CREATE FUNCTION public.meta_sync_attribution_snapshot_v1(t BIGINT,e TEXT,v INTEGER) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE event public.meta_sync_unattributed_events%ROWTYPE; request public.meta_data_sync_requests%ROWTYPE; snapshot JSONB;
BEGIN
  PERFORM public.meta_sync_attribution_authorize_v1(t);
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Attribution requires read committed'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('meta_sync_attribution_v1:'||t,0));
  SELECT * INTO event FROM public.meta_sync_unattributed_events WHERE tenant_id=t AND event_digest=e;
  IF NOT FOUND OR event.payload IS NULL OR event.kind='declined' THEN RAISE EXCEPTION 'Retained sync event unavailable'; END IF;
  SELECT * INTO request FROM public.meta_data_sync_requests WHERE tenant_id=t AND connection_version=v
    AND sync_type=CASE WHEN event.kind='contact' THEN 'smb_app_state_sync' ELSE 'history' END
    AND waba_id=event.waba_id AND phone_number_id=event.phone_number_id AND status='accepted' AND request_id IS NOT NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Accepted source request unavailable'; END IF;
  PERFORM 1 FROM public.meta_sync_generation_authorizations WHERE tenant_id=t AND source_connection_version=v AND sync_type=request.sync_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source generation not authorized'; END IF;
  snapshot:=jsonb_build_object('event',to_jsonb(event)-'payload','payloadDigest',encode(sha256(convert_to(event.payload::text,'UTF8')),'hex'),
    'request',to_jsonb(request),'currentConnectionVersion',(SELECT version FROM public.meta_connections WHERE tenant_id=t));
  RETURN jsonb_build_object('snapshotDigest',encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),
    'operatorRole',session_user,'preparedAt',date_trunc('milliseconds',clock_timestamp()),'providerRequestId',request.request_id,
    'kind',event.kind,'sourceWabaId',event.waba_id,'sourcePhoneNumberId',event.phone_number_id);
END;
$$;
REVOKE ALL ON FUNCTION meta_sync_attribution_snapshot_v1(BIGINT,TEXT,INTEGER) FROM PUBLIC;

CREATE FUNCTION public.apply_meta_sync_attribution_v1(t BIGINT,e TEXT,v INTEGER,expected_digest TEXT,prepared_at TIMESTAMPTZ,expected_actor TEXT,request_id TEXT,evidence TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE observed JSONB; identity_key TEXT; existing public.meta_sync_attributions%ROWTYPE;
BEGIN
  observed:=public.meta_sync_attribution_snapshot_v1(t,e,v);
  IF expected_actor IS DISTINCT FROM session_user::text OR expected_digest IS NULL OR expected_digest !~ '^[a-f0-9]{64}$'
    OR evidence IS NULL OR evidence !~ '^[a-f0-9]{64}$' OR request_id IS DISTINCT FROM observed->>'providerRequestId'
    THEN RAISE EXCEPTION 'Attribution evidence identity invalid'; END IF;
  identity_key:='meta_sync_attribution_v1_'||encode(sha256(convert_to(jsonb_build_array(t,e,v,expected_digest,prepared_at,expected_actor,request_id,evidence)::text,'UTF8')),'hex');
  SELECT * INTO existing FROM public.meta_sync_attributions WHERE tenant_id=t AND event_digest=e;
  IF FOUND THEN
    IF existing.attribution_key=identity_key THEN RETURN identity_key; END IF;
    RAISE EXCEPTION 'Event already attributed; source cannot be replaced';
  END IF;
  IF prepared_at IS NULL OR NOT isfinite(prepared_at) OR prepared_at>clock_timestamp() OR prepared_at<clock_timestamp()-interval '5 minutes'
    OR expected_digest IS DISTINCT FROM observed->>'snapshotDigest' THEN RAISE EXCEPTION 'Attribution proposal stale'; END IF;
  INSERT INTO public.meta_sync_attributions(tenant_id,event_digest,connection_version,sync_type,attribution_key,evidence_digest,snapshot_digest,provider_request_id)
    VALUES(t,e,v,CASE WHEN observed->>'kind'='contact' THEN 'smb_app_state_sync' ELSE 'history' END,identity_key,evidence,expected_digest,request_id);
  INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(t,session_user,'meta.sync.attributed','meta_sync_event',e,jsonb_build_object('attributionKey',identity_key,'connectionVersion',v,'evidenceDigest',evidence));
  RETURN identity_key;
END;
$$;
REVOKE ALL ON FUNCTION apply_meta_sync_attribution_v1(BIGINT,TEXT,INTEGER,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT) FROM PUBLIC;

-- API gets pending counts/identity only, never the retained event body.
CREATE VIEW meta_sync_pending_imports AS SELECT e.tenant_id,e.waba_id,e.phone_number_id,e.event_digest
FROM meta_sync_unattributed_events e WHERE e.kind<>'declined' AND NOT EXISTS(
  SELECT 1 FROM meta_sync_attribution_imports i WHERE i.tenant_id=e.tenant_id AND i.event_digest=e.event_digest);
