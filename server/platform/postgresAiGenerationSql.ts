const columns = `tenant_id AS "tenantId", request_key AS "requestKey", ai_agent_key AS "aiAgentKey",
  ai_agent_version_key AS "aiAgentVersionKey", input_digest AS "inputDigest", policy_digest AS "policyDigest",
  period_start::text AS "periodStart", counted_input_tokens AS "countedInputTokens", reserved_minor_units AS "reservedMinorUnits",
  status, result_json AS result, attempt_deadline <= clock_timestamp() AS expired`;

export const postgresAiGenerationSql = Object.freeze({
  observe: `SELECT j.tenant_id AS "tenantId", j.request_key AS "requestKey", j.ai_agent_key AS "aiAgentKey",
    j.ai_agent_version_key AS "aiAgentVersionKey", j.input_digest AS "inputDigest", j.policy_digest AS "policyDigest",
    j.period_start::text AS "periodStart", j.counted_input_tokens AS "countedInputTokens", j.reserved_minor_units AS "reservedMinorUnits",
    CASE WHEN r.recovery_key IS NULL THEN j.status WHEN r.needs_review THEN 'uncertain' ELSE 'settled' END AS status,
    CASE WHEN r.recovery_key IS NULL THEN j.result_json ELSE '{"outcome":"unavailable"}'::jsonb END AS result,
    j.attempt_deadline<=clock_timestamp() AS expired, r.recovery_key IS NOT NULL AS reconciled
    FROM ai_generation_journal j LEFT JOIN ai_generation_recovery_state r ON r.request_key=j.request_key
    WHERE j.tenant_id=$1 AND j.request_key=$2`,
  lateUsage: "SELECT public.record_ai_generation_late_usage_v1($1,$2,$3,$4,$5)",
  lockAgent: `SELECT a.ai_agent_key AS "aiAgentKey", a.status, a.active_version_key AS "activeVersionKey",
    v.status AS "versionStatus", v.definition_json AS definition, v.version_number AS "versionNumber",
    to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-01') AS "currentPeriod"
    FROM ai_agents a JOIN ai_agent_versions v ON v.tenant_id = a.tenant_id AND v.ai_agent_key = a.ai_agent_key
    WHERE a.tenant_id = $1 AND v.ai_agent_version_key = $2 FOR UPDATE OF a`,
  authorization: `SELECT ai_agent_key AS "aiAgentKey", period_start::text AS "periodStart",
    monthly_limit_minor_units AS "monthlyLimitMinorUnits", currency
    FROM ai_runtime_cost_authorizations WHERE tenant_id = $1 AND request_key = $2`,
  blocked: `SELECT EXISTS (SELECT 1 FROM ai_generation_journal j LEFT JOIN ai_generation_recovery_state r ON r.request_key=j.request_key
    WHERE j.tenant_id=$1 AND j.ai_agent_key=$2 AND (r.needs_review OR (r.recovery_key IS NULL AND
      (j.status='uncertain' OR (j.status='claimed' AND (j.attempt_deadline<=clock_timestamp() OR j.period_start<>$3::date)))))) AS blocked`,
  budget: `SELECT COALESCE(SUM(cost), 0)::text AS total FROM (
    SELECT cost_minor_units AS cost FROM ai_generation_effective_usage
      WHERE tenant_id = $1 AND ai_agent_key = $2 AND period_start = $3::date AND currency = 'USD'
    UNION ALL
    SELECT reserved_minor_units AS cost FROM ai_generation_journal j
      WHERE j.tenant_id = $1 AND j.ai_agent_key = $2 AND j.period_start = $3::date
        AND NOT EXISTS (SELECT 1 FROM ai_generation_effective_usage u WHERE u.tenant_id = j.tenant_id AND u.request_key = j.request_key)
    UNION ALL
    SELECT greatest(j.reserved_minor_units,r.cost_minor_units,
      coalesce((SELECT max(l.cost_minor_units) FROM ai_generation_late_usage l WHERE l.request_key=j.request_key),0))-r.cost_minor_units
    FROM ai_generation_recovery_state r JOIN ai_generation_journal j ON j.request_key=r.request_key
    WHERE r.needs_review AND j.tenant_id=$1 AND j.ai_agent_key=$2 AND j.period_start=$3::date
    ) AS obligations`,
  insert: `INSERT INTO ai_generation_journal (tenant_id, request_key, ai_agent_key, ai_agent_version_key,
    input_digest, policy_digest, period_start, counted_input_tokens, reserved_minor_units, status, created_at, attempt_deadline)
    SELECT $1, $2, $3, $4, $5, $6, $7::date, $8, $9, 'claimed', stamp, stamp + $10 * INTERVAL '1 millisecond'
    FROM (SELECT clock_timestamp() AS stamp) AS timing RETURNING ${columns}`,
  usage: `SELECT input_tokens AS "inputTokens", output_tokens AS "outputTokens", cost_minor_units AS "costMinorUnits",
    currency, ai_agent_key AS "aiAgentKey", period_start::text AS "periodStart" FROM ai_runtime_usage WHERE tenant_id = $1 AND request_key = $2`,
  insertUsage: `INSERT INTO ai_runtime_usage (request_key, tenant_id, ai_agent_key, period_start, input_tokens, output_tokens,
    cost_minor_units, currency, within_limit) VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'USD', $8) RETURNING request_key`,
  settle: `UPDATE ai_generation_journal SET status = $3, result_json = $4::jsonb, settled_at = clock_timestamp()
    WHERE tenant_id = $1 AND request_key = $2 AND status = 'claimed' RETURNING ${columns}`,
});
