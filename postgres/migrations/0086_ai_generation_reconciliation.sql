-- Private operator evidence supplements immutable original generation/usage.
-- No operator grant, provider credential or retry is introduced by migration.
CREATE TABLE ai_recovery_authorizations (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL CHECK (isfinite(expires_at)),
  PRIMARY KEY(database_role,tenant_id),
  CHECK(database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
REVOKE ALL ON ai_recovery_authorizations FROM PUBLIC;
CREATE FUNCTION public.ai_recovery_authorize_v1(t BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.ai_recovery_authorizations WHERE database_role=session_user AND tenant_id=t AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI recovery authorization required'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION ai_recovery_authorize_v1(BIGINT) FROM PUBLIC;

CREATE TABLE ai_generation_reconciliations (
  recovery_key TEXT PRIMARY KEY CHECK(recovery_key ~ '^ai_recovery_v1_[a-f0-9]{64}$'),
  request_key TEXT NOT NULL REFERENCES ai_generation_journal(request_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  action TEXT NOT NULL CHECK(action IN ('usage-confirmed','no-charge-confirmed')),
  input_tokens BIGINT NOT NULL CHECK(input_tokens BETWEEN 0 AND 10000000),
  output_tokens BIGINT NOT NULL CHECK(output_tokens BETWEEN 0 AND 10000000),
  cost_minor_units BIGINT NOT NULL CHECK(cost_minor_units BETWEEN 0 AND 9007199254740991),
  within_limit BOOLEAN NOT NULL,
  evidence_digest TEXT NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest TEXT NOT NULL CHECK(snapshot_digest ~ '^[a-f0-9]{64}$'),
  observed_late_keys JSONB NOT NULL CHECK(jsonb_typeof(observed_late_keys)='array'),
  operator_role NAME NOT NULL DEFAULT session_user,
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(request_key,revision),
  CHECK(action<>'no-charge-confirmed' OR (input_tokens=0 AND output_tokens=0 AND cost_minor_units=0))
);
CREATE TABLE ai_generation_late_usage (
  observation_key TEXT PRIMARY KEY CHECK(observation_key ~ '^[a-f0-9]{64}$'),
  request_key TEXT NOT NULL REFERENCES ai_generation_journal(request_key) ON DELETE RESTRICT,
  tenant_id BIGINT NOT NULL,
  input_tokens BIGINT NOT NULL CHECK(input_tokens BETWEEN 0 AND 10000000),
  output_tokens BIGINT NOT NULL CHECK(output_tokens BETWEEN 1 AND 16384),
  cost_minor_units BIGINT NOT NULL CHECK(cost_minor_units BETWEEN 0 AND 9007199254740991),
  received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON ai_generation_reconciliations,ai_generation_late_usage FROM PUBLIC;
CREATE FUNCTION public.reject_ai_recovery_mutation_v1() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'AI original evidence and reconciliation are immutable'; END;
$$;
CREATE TRIGGER ai_recovery_immutable BEFORE UPDATE OR DELETE ON ai_generation_reconciliations FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_recovery_no_truncate BEFORE TRUNCATE ON ai_generation_reconciliations FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_late_usage_immutable BEFORE UPDATE OR DELETE ON ai_generation_late_usage FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_late_usage_no_truncate BEFORE TRUNCATE ON ai_generation_late_usage FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_original_usage_immutable BEFORE UPDATE OR DELETE ON ai_runtime_usage FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_original_usage_no_truncate BEFORE TRUNCATE ON ai_runtime_usage FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_generation_no_delete BEFORE DELETE ON ai_generation_journal FOR EACH ROW EXECUTE FUNCTION reject_ai_recovery_mutation_v1();
CREATE TRIGGER ai_generation_no_truncate BEFORE TRUNCATE ON ai_generation_journal FOR EACH STATEMENT EXECUTE FUNCTION reject_ai_recovery_mutation_v1();

CREATE VIEW ai_generation_recovery_state AS
SELECT r.*, EXISTS(SELECT 1 FROM ai_generation_late_usage l WHERE l.request_key=r.request_key
  AND NOT r.observed_late_keys ? l.observation_key
  AND (l.input_tokens,l.output_tokens,l.cost_minor_units) IS DISTINCT FROM (r.input_tokens,r.output_tokens,r.cost_minor_units)) AS needs_review
FROM (SELECT DISTINCT ON(request_key) * FROM ai_generation_reconciliations ORDER BY request_key,revision DESC) r;
CREATE VIEW ai_generation_effective_usage AS
SELECT u.* FROM ai_runtime_usage u WHERE NOT EXISTS(SELECT 1 FROM ai_generation_recovery_state r WHERE r.request_key=u.request_key)
UNION ALL
SELECT j.request_key,j.tenant_id,j.ai_agent_key,j.period_start,r.input_tokens,r.output_tokens,r.cost_minor_units,'USD',
  r.within_limit,date_trunc('milliseconds',j.created_at)
FROM ai_generation_recovery_state r JOIN ai_generation_journal j USING(request_key)
JOIN ai_runtime_cost_authorizations a ON a.tenant_id=j.tenant_id AND a.request_key=j.request_key;
REVOKE ALL ON ai_generation_recovery_state,ai_generation_effective_usage FROM PUBLIC;

CREATE FUNCTION public.record_ai_generation_late_usage_v1(t BIGINT,k TEXT,i BIGINT,o BIGINT,c BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE agent TEXT; identity TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT ai_agent_key INTO agent FROM public.ai_generation_journal WHERE tenant_id=t AND request_key=k;
  PERFORM 1 FROM public.ai_agents WHERE tenant_id=t AND ai_agent_key=agent FOR UPDATE;
  IF agent IS NULL OR NOT(EXISTS(SELECT 1 FROM public.ai_generation_reconciliations WHERE request_key=k) OR EXISTS(SELECT 1 FROM public.ai_generation_journal WHERE request_key=k AND status='uncertain')) THEN RAISE EXCEPTION 'AI late usage requires uncertain or reconciled generation'; END IF;
  identity:=encode(sha256(convert_to(jsonb_build_array(t,k,i,o,c)::text,'UTF8')),'hex');
  INSERT INTO public.ai_generation_late_usage(observation_key,tenant_id,request_key,input_tokens,output_tokens,cost_minor_units)
    VALUES(identity,t,k,i,o,c) ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION record_ai_generation_late_usage_v1(BIGINT,TEXT,BIGINT,BIGINT,BIGINT) FROM PUBLIC;

CREATE FUNCTION public.ai_generation_recovery_snapshot_v1(t BIGINT,k TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j public.ai_generation_journal%ROWTYPE; result JSONB;
BEGIN
  PERFORM public.ai_recovery_authorize_v1(t);
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(t));
  SELECT * INTO j FROM public.ai_generation_journal WHERE tenant_id=t AND request_key=k;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI generation unavailable'; END IF;
  PERFORM 1 FROM public.ai_agents WHERE tenant_id=t AND ai_agent_key=j.ai_agent_key FOR UPDATE;
  SELECT jsonb_build_object('generation',to_jsonb(x),'usage',(SELECT to_jsonb(u) FROM public.ai_runtime_usage u WHERE u.request_key=k),
    'reconciliation',(SELECT to_jsonb(r) FROM public.ai_generation_recovery_state r WHERE r.request_key=k),
    'lateUsage',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.observation_key) FROM public.ai_generation_late_usage l WHERE l.request_key=k),'[]'::jsonb))
    INTO result FROM public.ai_generation_journal x WHERE x.request_key=k;
  RETURN jsonb_build_object('snapshot',result,'snapshotDigest',encode(sha256(convert_to(result::text,'UTF8')),'hex'),
    'operatorRole',session_user,'observedAt',clock_timestamp());
END;
$$;
REVOKE ALL ON FUNCTION ai_generation_recovery_snapshot_v1(BIGINT,TEXT) FROM PUBLIC;

CREATE FUNCTION public.apply_ai_generation_recovery_v1(t BIGINT,k TEXT,expected_digest TEXT,prepared_at TIMESTAMPTZ,expected_actor TEXT,
  action_name TEXT,input_count BIGINT,output_count BIGINT,cost BIGINT,evidence TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE observed JSONB; snap JSONB; recovery TEXT; j public.ai_generation_journal%ROWTYPE; prev public.ai_generation_reconciliations%ROWTYPE;
BEGIN
  observed:=public.ai_generation_recovery_snapshot_v1(t,k); snap:=observed->'snapshot';
  IF expected_actor IS DISTINCT FROM session_user::text OR expected_digest !~ '^[a-f0-9]{64}$' OR evidence !~ '^[a-f0-9]{64}$'
    OR expected_digest IS NULL OR evidence IS NULL OR action_name IS NULL THEN RAISE EXCEPTION 'AI recovery input or identity invalid'; END IF;
  recovery:='ai_recovery_v1_'||encode(sha256(convert_to(jsonb_build_array(t,k,expected_digest,prepared_at,expected_actor,action_name,input_count,output_count,cost,evidence)::text,'UTF8')),'hex');
  IF EXISTS(SELECT 1 FROM public.ai_generation_reconciliations WHERE recovery_key=recovery) THEN RETURN recovery; END IF;
  IF NOT isfinite(prepared_at) OR prepared_at IS NULL OR prepared_at>clock_timestamp() OR prepared_at<clock_timestamp()-INTERVAL '5 minutes'
    OR observed->>'snapshotDigest' IS DISTINCT FROM expected_digest THEN RAISE EXCEPTION 'AI recovery snapshot is stale'; END IF;
  SELECT * INTO j FROM public.ai_generation_journal WHERE tenant_id=t AND request_key=k FOR UPDATE;
  SELECT * INTO prev FROM public.ai_generation_reconciliations WHERE request_key=k ORDER BY revision DESC LIMIT 1;
  IF (prev.recovery_key IS NULL AND NOT(j.status='uncertain' OR (j.status='claimed' AND j.attempt_deadline<clock_timestamp())))
    OR (prev.recovery_key IS NOT NULL AND NOT (snap->'reconciliation'->>'needs_review')::boolean) THEN RAISE EXCEPTION 'AI generation is not unresolved'; END IF;
  IF action_name='no-charge-confirmed' AND (EXISTS(SELECT 1 FROM public.ai_runtime_usage WHERE request_key=k AND cost_minor_units>0)
    OR EXISTS(SELECT 1 FROM public.ai_generation_late_usage WHERE request_key=k AND cost_minor_units>0)
    OR prev.cost_minor_units>0) THEN RAISE EXCEPTION 'Positive usage cannot be erased as absent'; END IF;
  INSERT INTO public.ai_generation_reconciliations(recovery_key,request_key,tenant_id,revision,action,input_tokens,output_tokens,cost_minor_units,
    within_limit,evidence_digest,snapshot_digest,observed_late_keys) VALUES(recovery,k,t,coalesce(prev.revision,0)+1,action_name,input_count,output_count,cost,
    (SELECT coalesce(sum(u.cost_minor_units),0)+cost FROM public.ai_generation_effective_usage u WHERE u.tenant_id=t AND u.ai_agent_key=j.ai_agent_key AND u.period_start=j.period_start AND u.request_key<>k)
      <=(SELECT monthly_limit_minor_units FROM public.ai_runtime_cost_authorizations WHERE tenant_id=t AND request_key=k),evidence,expected_digest,
    COALESCE((SELECT jsonb_agg(observation_key ORDER BY observation_key) FROM public.ai_generation_late_usage WHERE request_key=k),'[]'::jsonb));
  INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(t,session_user,'ai.generation.reconciled','ai_generation',k,jsonb_build_object('recoveryKey',recovery,'revision',coalesce(prev.revision,0)+1,'action',action_name,'evidenceDigest',evidence));
  RETURN recovery;
END;
$$;
REVOKE ALL ON FUNCTION apply_ai_generation_recovery_v1(BIGINT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,BIGINT,BIGINT,BIGINT,TEXT) FROM PUBLIC;
