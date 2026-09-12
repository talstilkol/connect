-- Durable, single-attempt AI dispatches. No provider credentials or prompts.
CREATE TABLE ai_generation_journal (
  request_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  ai_agent_key TEXT NOT NULL,
  ai_agent_version_key TEXT NOT NULL,
  input_digest TEXT NOT NULL CHECK (input_digest ~ '^[0-9a-f]{64}$'),
  policy_digest TEXT NOT NULL CHECK (policy_digest ~ '^[0-9a-f]{64}$'),
  period_start DATE NOT NULL CHECK (EXTRACT(DAY FROM period_start) = 1),
  counted_input_tokens BIGINT NOT NULL CHECK (counted_input_tokens BETWEEN 1 AND 1000000),
  reserved_minor_units BIGINT NOT NULL CHECK (reserved_minor_units BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('claimed', 'settled', 'uncertain')),
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  attempt_deadline TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  CONSTRAINT ai_generation_authorization_fk FOREIGN KEY (tenant_id, request_key)
    REFERENCES ai_runtime_cost_authorizations (tenant_id, request_key),
  CONSTRAINT ai_generation_version_fk FOREIGN KEY (tenant_id, ai_agent_key, ai_agent_version_key)
    REFERENCES ai_agent_versions (tenant_id, ai_agent_key, ai_agent_version_key),
  CONSTRAINT ai_generation_deadline_valid CHECK (attempt_deadline > created_at AND attempt_deadline <= created_at + INTERVAL '61 seconds'),
  CONSTRAINT ai_generation_result_valid CHECK (
    (status = 'claimed' AND result_json IS NULL AND settled_at IS NULL) OR
    (status IN ('settled', 'uncertain') AND result_json IS NOT NULL AND settled_at IS NOT NULL
      AND settled_at >= created_at AND jsonb_typeof(result_json) = 'object'
      AND octet_length(result_json::text) <= 65536
      AND COALESCE(result_json->>'outcome' IN ('generated', 'policy-violation', 'unavailable'), false))
  )
);
CREATE INDEX ai_generation_agent_budget_idx ON ai_generation_journal (tenant_id, ai_agent_key, period_start, status);

CREATE FUNCTION guard_ai_generation_transition() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'claimed' THEN RAISE EXCEPTION 'AI generation must start with a claim'; END IF;
  ELSE
    IF OLD.status <> 'claimed' OR NEW.status NOT IN ('settled', 'uncertain') OR
      (to_jsonb(OLD) - 'status' - 'result_json' - 'settled_at') IS DISTINCT FROM
      (to_jsonb(NEW) - 'status' - 'result_json' - 'settled_at') THEN
      RAISE EXCEPTION 'AI generation identity and terminal result are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ai_generation_transition_guard BEFORE INSERT OR UPDATE ON ai_generation_journal
FOR EACH ROW EXECUTE FUNCTION guard_ai_generation_transition();
