import { postgresManualReplySql } from "./postgresManualReplyRepository.ts";

export const aiDeliveryNow = "date_trunc('milliseconds', statement_timestamp())";
const now = aiDeliveryNow;
const eligible = `(state = 'queued' AND next_attempt_at <= ${now}) OR (state = 'preparing' AND claim_expires_at <= ${now})`;
export const aiDeliveryApprovalProof = `EXISTS (
  SELECT 1 FROM audit_logs a JOIN railway_api_mutation_receipts r
    ON r.tenant_id = a.tenant_id AND r.operation = a.action AND r.idempotency_key = a.idempotency_key
  WHERE a.tenant_id = o.tenant_id AND a.actor_external_user_id = o.decided_by_external_user_id
    AND a.action = 'ai.reply-approvals.decide' AND a.target_type = 'ai_reply_approval' AND a.target_id = o.outbox_key
    AND a.metadata_json->>'decision' = 'approve' AND a.metadata_json->>'outcome' = 'updated'
    AND a.metadata_json->>'resultingStatus' = 'ready-for-delivery' AND a.metadata_json->>'resultingVersion' = o.version::text
    AND a.metadata_json->>'requestDigest' = r.request_digest AND r.actor_external_user_id = o.decided_by_external_user_id
    AND r.status = 'completed' AND r.response_json->>'outcome' = 'updated'
    AND r.response_json->'approval'->>'outboxKey' = o.outbox_key
    AND r.response_json->'approval'->>'status' = 'ready-for-delivery'
    AND r.response_json->'approval'->>'version' = o.version::text
)`;
export const aiDeliveryGenerationProof = `EXISTS (
  SELECT 1 FROM ai_generation_journal j WHERE j.tenant_id = o.tenant_id AND j.request_key = o.request_key
    AND j.ai_agent_key = o.ai_agent_key AND j.ai_agent_version_key = o.ai_agent_version_key
    AND j.status = 'settled' AND j.result_json->>'outcome' = 'generated' AND j.result_json->>'text' = o.reply_text
)`;
export const postgresAiReplyDeliverySql = Object.freeze({
  stageCandidate: `SELECT o.* FROM ai_reply_outbox o WHERE o.status = 'ready-for-delivery' AND o.response_mode = 'agent-approval'
    AND ${aiDeliveryApprovalProof} AND ${aiDeliveryGenerationProof}
    AND NOT EXISTS (SELECT 1 FROM ai_reply_deliveries d WHERE d.tenant_id = o.tenant_id AND d.outbox_key = o.outbox_key)
    ORDER BY o.decided_at, o.outbox_key FOR UPDATE OF o SKIP LOCKED LIMIT 1`,
  insert: `INSERT INTO ai_reply_deliveries (delivery_key, tenant_id, outbox_key, approval_version, conversation_key)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING delivery_key`,
  candidate: `SELECT * FROM ai_reply_deliveries WHERE ${eligible} ORDER BY next_attempt_at, delivery_key LIMIT 1`,
  read: "SELECT * FROM ai_reply_deliveries WHERE tenant_id = $1 AND delivery_key = $2",
  lock: "SELECT * FROM ai_reply_deliveries WHERE tenant_id = $1 AND delivery_key = $2 FOR UPDATE",
  eligible: `SELECT * FROM ai_reply_deliveries WHERE tenant_id = $1 AND delivery_key = $2 AND (${eligible}) FOR UPDATE`,
  approval: `SELECT o.*, ${aiDeliveryApprovalProof} AS approved, ${aiDeliveryGenerationProof} AS generated
    FROM ai_reply_outbox o WHERE o.tenant_id = $1 AND o.outbox_key = $2 FOR UPDATE OF o`,
  agent: `SELECT a.status, a.active_version_key, v.status AS version_status, v.definition_json
    FROM ai_agents a JOIN ai_agent_versions v ON v.tenant_id = a.tenant_id AND v.ai_agent_key = a.ai_agent_key
    WHERE a.tenant_id = $1 AND a.ai_agent_key = $2 AND v.ai_agent_version_key = $3 FOR SHARE OF a, v`,
  conversation: `SELECT contact_id, status, assigned_external_user_id, last_message_key, version FROM conversations
    WHERE tenant_id = $1 AND conversation_key = $2 FOR UPDATE`,
  window: `SELECT occurred_at + interval '24 hours' AS expires_at FROM messages
    WHERE tenant_id = $1 AND conversation_key = $2 AND message_key = $3 AND direction = 'inbound'
      AND content_state = 'original' AND occurred_at <= ${now} FOR SHARE`,
  sources: `SELECT p.passage_key, p.source_key FROM ai_generation_journal j
    CROSS JOIN LATERAL jsonb_array_elements_text(j.result_json->'groundedPassageKeys') selected(passage_key)
    JOIN knowledge_passages p ON p.tenant_id = j.tenant_id AND p.passage_key = selected.passage_key
    JOIN knowledge_sources s ON s.tenant_id = p.tenant_id AND s.source_key = p.source_key AND s.status = 'ready'
    JOIN ai_agent_version_sources v ON v.tenant_id = s.tenant_id AND v.source_key = s.source_key AND v.ai_agent_version_key = j.ai_agent_version_key
    WHERE j.tenant_id = $1 AND j.request_key = $2 ORDER BY p.passage_key FOR SHARE OF p, s, v`,
  generation: "SELECT result_json FROM ai_generation_journal WHERE tenant_id = $1 AND request_key = $2",
  competing: `SELECT delivery_key FROM ai_reply_deliveries WHERE tenant_id = $1 AND conversation_key = $2 AND delivery_key <> $3
      AND state IN ('preparing', 'sending', 'unknown')
    UNION ALL SELECT delivery_key FROM manual_reply_outbox WHERE tenant_id = $1 AND conversation_key = $2
      AND state IN ('queued', 'preparing', 'sending', 'unknown') LIMIT 1`,
  prepare: `UPDATE ai_reply_deliveries SET state = 'preparing', claim_version = claim_version + 1, binding_json = $3::jsonb,
    claim_expires_at = ${now} + interval '60 seconds', reservation_key = NULL, updated_at = ${now}
    WHERE tenant_id = $1 AND delivery_key = $2 RETURNING *`,
  invalidate: `UPDATE ai_reply_deliveries SET state = 'failed', claim_expires_at = NULL, error_code = $3, updated_at = ${now}
    WHERE tenant_id = $1 AND delivery_key = $2 AND state IN ('queued', 'preparing') RETURNING delivery_key`,
  wait: `UPDATE ai_reply_deliveries SET state = 'queued', claim_expires_at = NULL, next_attempt_at = ${now} + interval '30 seconds',
    error_code = 'DEPENDENCY_UNAVAILABLE', updated_at = ${now} WHERE tenant_id = $1 AND delivery_key = $2 RETURNING delivery_key`,
  seal: `UPDATE ai_reply_deliveries SET state = 'sending', claim_expires_at = NULL, reservation_key = $4,
    provider_started_at = ${now}, error_code = NULL, updated_at = ${now}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'preparing'
      AND claim_expires_at > ${now} AND (binding_json->>'serviceWindowExpiresAt')::timestamptz > ${now} RETURNING delivery_key`,
  defer: `UPDATE ai_reply_deliveries SET state = CASE WHEN (binding_json->>'serviceWindowExpiresAt')::timestamptz <= GREATEST($4::timestamptz, ${now}) THEN 'failed' ELSE 'queued' END,
    claim_expires_at = NULL, next_attempt_at = GREATEST($4::timestamptz, ${now}), error_code = $5, updated_at = ${now}
    WHERE tenant_id = $1 AND delivery_key = $2 AND claim_version = $3 AND state = 'preparing' RETURNING delivery_key`,
  fail: postgresManualReplySql.fail.replaceAll("manual_reply_outbox", "ai_reply_deliveries"),
  unknown: postgresManualReplySql.unknown.replaceAll("manual_reply_outbox", "ai_reply_deliveries"),
  expiredSending: postgresManualReplySql.expiredSending.replaceAll("manual_reply_outbox", "ai_reply_deliveries"),
  reject: postgresManualReplySql.reject.replaceAll("manual_reply_outbox", "ai_reply_deliveries"),
  sent: postgresManualReplySql.sent.replaceAll("manual_reply_outbox", "ai_reply_deliveries"),
  project: `UPDATE conversations SET
    last_message_key = CASE WHEN last_message_at IS NULL OR last_message_at <= $4 THEN $3 ELSE last_message_key END,
    last_message_at = GREATEST(last_message_at, $4), version = version + 1, updated_at = ${now}
    WHERE tenant_id = $1 AND conversation_key = $2 RETURNING version`,
});
