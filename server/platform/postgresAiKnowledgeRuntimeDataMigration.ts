import { createHash } from "node:crypto";

import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationColumnKind,
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  validateAiAgentDefinition,
} from "../../shared/validation/aiAgentDefinition.ts";

const unsafeControlPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const allControlPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const digestPattern = /^[0-9a-f]{64}$/;
const agentKeyPattern = /^ai_agent_v1_[0-9a-f]{64}$/;
const agentVersionKeyPattern = /^ai_agent_version_v1_[0-9a-f]{64}$/;
const sourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const passageKeyPattern = /^knowledge_passage_v1_[0-9a-f]{64}$/;
const requestKeyPattern = /^ai_provider_request_v1_[0-9a-f]{64}$/;
const auditKeyPattern = /^ai_runtime_audit_v1_[0-9a-f]{64}$/;
const outboxKeyPattern = /^ai_reply_outbox_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const currencyPattern = /^[A-Z]{3}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const mediaTypePattern =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const periodPattern = /^\d{4}-(?:0[1-9]|1[0-2])-01$/;
const agentStatuses = new Set(["draft", "active", "inactive"]);
const versionStatuses = new Set(["draft", "published", "archived"]);
const sourceStatuses = new Set([
  "pending-upload",
  "pending-validation",
  "pending-scan",
  "scanning",
  "ready",
  "rejected",
  "archived",
]);
const fallbackReasons = new Set([
  "customer-request",
  "no-approved-knowledge",
  "grounding-below-threshold",
  "provider-unavailable",
  "budget-exhausted",
  "policy-violation",
]);
const responseModes = new Set(["automatic", "agent-approval"]);
const outboxStatuses = new Set([
  "awaiting-approval",
  "ready-for-delivery",
  "rejected",
]);

function invalid(): never {
  throw new Error("ai-knowledge-runtime-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function nullableInteger(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = row[name];
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): number {
  const milliseconds = Date.parse(text(row, name));
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = nullableText(row, name);
  if (value === null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function parseJson(row: PostgresDataMigrationRow, name: string): unknown {
  try {
    return JSON.parse(text(row, name)) as unknown;
  } catch {
    invalid();
  }
}

function digestJson(value: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireTrimmed(
  value: string,
  maximum: number,
  controls = allControlPattern,
): void {
  if (
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    controls.test(value)
  ) {
    invalid();
  }
}

function requirePeriod(value: string): void {
  if (!periodPattern.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))) {
    invalid();
  }
}

function validateAgent(row: PostgresDataMigrationRow): void {
  const name = text(row, "name");
  const status = text(row, "status");
  const activeVersionKey = nullableText(row, "active_version_key");
  requireTrimmed(name, 160);
  const expectedKey = `ai_agent_v1_${digestJson({
    namespace: "ai_agent_v1",
    tenantId: integer(row, "tenant_id"),
    name,
  })}`;
  if (
    !agentKeyPattern.test(text(row, "ai_agent_key")) ||
    text(row, "ai_agent_key") !== expectedKey ||
    !agentStatuses.has(status) ||
    !agentVersionKeyPattern.test(text(row, "latest_version_key")) ||
    (activeVersionKey !== null && !agentVersionKeyPattern.test(activeVersionKey)) ||
    ((status === "draft") !== (activeVersionKey === null)) ||
    integer(row, "latest_version_number") < 1 ||
    integer(row, "version") < 1 ||
    timestamp(row, "updated_at") < timestamp(row, "created_at")
  ) {
    invalid();
  }
}

function validateAgentVersion(row: PostgresDataMigrationRow): void {
  const status = text(row, "status");
  const publishedAt = nullableTimestamp(row, "published_at");
  const definitionJson = text(row, "definition_json");
  const definition = parseJson(row, "definition_json");
  const validation = validateAiAgentDefinition(definition);
  if (!validation.success) invalid();
  const agentKey = text(row, "ai_agent_key");
  const expectedAgentKey = `ai_agent_v1_${digestJson({
    namespace: "ai_agent_v1",
    tenantId: integer(row, "tenant_id"),
    name: validation.value.name,
  })}`;
  const expectedVersionKey = `ai_agent_version_v1_${digestJson({
    namespace: "ai_agent_version_v1",
    tenantId: integer(row, "tenant_id"),
    aiAgentKey: agentKey,
    version: integer(row, "version_number"),
    definition: validation.value,
  })}`;
  if (
    !agentVersionKeyPattern.test(text(row, "ai_agent_version_key")) ||
    text(row, "ai_agent_version_key") !== expectedVersionKey ||
    !agentKeyPattern.test(agentKey) ||
    agentKey !== expectedAgentKey ||
    integer(row, "version_number") < 1 ||
    !versionStatuses.has(status) ||
    ((status === "draft") !== (publishedAt === null)) ||
    new TextEncoder().encode(definitionJson).byteLength > 1_000_000
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function validateKnowledgeSource(row: PostgresDataMigrationRow): void {
  const tenantId = integer(row, "tenant_id");
  const sourceKey = text(row, "source_key");
  const contentDigest = text(row, "content_sha256");
  const fileName = text(row, "file_name");
  const mediaType = text(row, "media_type");
  const status = text(row, "status");
  const errorCode = nullableText(row, "last_error_code");
  const readyAt = nullableTimestamp(row, "ready_at");
  const createdAt = timestamp(row, "created_at");
  const expectedKey = `knowledge_source_v1_${digestJson({
    namespace: "knowledge_source_v1",
    tenantId,
    contentSha256: contentDigest,
  })}`;
  requireTrimmed(fileName, 512);
  if (
    !sourceKeyPattern.test(sourceKey) ||
    sourceKey !== expectedKey ||
    !digestPattern.test(contentDigest) ||
    !mediaTypePattern.test(mediaType) ||
    mediaType !== mediaType.trim().toLowerCase() ||
    integer(row, "size_bytes") < 1 ||
    text(row, "storage_object_key") !== `knowledge/v1/${sourceKey}` ||
    !sourceStatuses.has(status) ||
    (errorCode !== null && !errorCodePattern.test(errorCode)) ||
    !(
      (["pending-upload", "pending-validation", "pending-scan", "scanning"]
        .includes(status) && errorCode === null && readyAt === null) ||
      (status === "ready" && errorCode === null && readyAt !== null) ||
      (status === "rejected" && errorCode !== null && readyAt === null) ||
      (status === "archived" && ((errorCode === null && readyAt !== null) ||
        (errorCode !== null && readyAt === null)))
    ) ||
    integer(row, "version") < 1 ||
    timestamp(row, "updated_at") < createdAt ||
    (readyAt !== null && readyAt < createdAt)
  ) {
    invalid();
  }
}

function validateKnowledgePassage(row: PostgresDataMigrationRow): void {
  const tenantId = integer(row, "tenant_id");
  const sourceKey = text(row, "source_key");
  const ordinal = integer(row, "passage_ordinal");
  const content = text(row, "content");
  const contentDigest = text(row, "content_sha256");
  requireTrimmed(content, 16_384, unsafeControlPattern);
  const actualDigest = createHash("sha256").update(content).digest("hex");
  const expectedKey = `knowledge_passage_v1_${digestJson({
    namespace: "knowledge_passage_v1",
    tenantId,
    sourceKey,
    passageOrdinal: ordinal,
    contentSha256: actualDigest,
  })}`;
  if (
    !passageKeyPattern.test(text(row, "passage_key")) ||
    text(row, "passage_key") !== expectedKey ||
    !sourceKeyPattern.test(sourceKey) ||
    ordinal < 1 ||
    !digestPattern.test(contentDigest) ||
    contentDigest !== actualDigest
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function validateAgentVersionSource(row: PostgresDataMigrationRow): void {
  if (
    !agentVersionKeyPattern.test(text(row, "ai_agent_version_key")) ||
    !sourceKeyPattern.test(text(row, "source_key"))
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function validateCostAuthorization(row: PostgresDataMigrationRow): void {
  requirePeriod(text(row, "period_start"));
  if (
    !requestKeyPattern.test(text(row, "request_key")) ||
    !agentKeyPattern.test(text(row, "ai_agent_key")) ||
    integer(row, "monthly_limit_minor_units") < 1 ||
    !currencyPattern.test(text(row, "currency"))
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function validateUsage(row: PostgresDataMigrationRow): void {
  requirePeriod(text(row, "period_start"));
  if (
    !requestKeyPattern.test(text(row, "request_key")) ||
    !agentKeyPattern.test(text(row, "ai_agent_key")) ||
    integer(row, "input_tokens") < 0 ||
    integer(row, "output_tokens") < 1 ||
    integer(row, "cost_minor_units") < 0 ||
    !currencyPattern.test(text(row, "currency")) ||
    ![0, 1].includes(integer(row, "within_limit"))
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function runtimeIdentity(row: PostgresDataMigrationRow): Record<string, unknown> {
  return {
    tenantId: integer(row, "tenant_id"),
    conversationKey: text(row, "conversation_key"),
    inboundMessageKey: text(row, "inbound_message_key"),
    aiAgentVersionKey: text(row, "ai_agent_version_key"),
  };
}

function validateAudit(row: PostgresDataMigrationRow): void {
  const outcome = text(row, "outcome");
  const reason = nullableText(row, "reason");
  const grounding = nullableInteger(row, "grounding_score_basis_points");
  const inputTokens = nullableInteger(row, "input_tokens");
  const outputTokens = nullableInteger(row, "output_tokens");
  const cost = nullableInteger(row, "cost_minor_units");
  const usageValues = [inputTokens, outputTokens, cost];
  const hasUsage = usageValues.every((value) => value !== null);
  const hasNoUsage = usageValues.every((value) => value === null);
  const identity = runtimeIdentity(row);
  const expectedRequestKey = `ai_provider_request_v1_${digestJson({
    namespace: "ai_provider_request_v1",
    ...identity,
  })}`;
  const expectedAuditKey = `ai_runtime_audit_v1_${digestJson({
    namespace: "ai_runtime_audit_v1",
    ...identity,
  })}`;
  if (
    !auditKeyPattern.test(text(row, "audit_key")) ||
    text(row, "audit_key") !== expectedAuditKey ||
    !requestKeyPattern.test(text(row, "request_key")) ||
    text(row, "request_key") !== expectedRequestKey ||
    !conversationKeyPattern.test(text(row, "conversation_key")) ||
    !messageKeyPattern.test(text(row, "inbound_message_key")) ||
    !agentKeyPattern.test(text(row, "ai_agent_key")) ||
    !agentVersionKeyPattern.test(text(row, "ai_agent_version_key")) ||
    integer(row, "expected_conversation_version") < 1 ||
    !["reply-planned", "handoff"].includes(outcome) ||
    (reason !== null && !fallbackReasons.has(reason)) ||
    !responseModes.has(text(row, "response_mode")) ||
    (grounding !== null && (grounding < 0 || grounding > 10_000)) ||
    (!hasUsage && !hasNoUsage) ||
    (hasUsage && (Number(inputTokens) < 0 || Number(outputTokens) < 1 ||
      Number(cost) < 0)) ||
    !currencyPattern.test(text(row, "currency")) ||
    !(
      outcome === "reply-planned" && reason === null && grounding !== null &&
        hasUsage ||
      outcome === "handoff" && reason !== null
    )
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function parseSourceKeys(row: PostgresDataMigrationRow): readonly string[] {
  const value = parseJson(row, "grounded_source_keys_json");
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 100 ||
    value.some((key) => typeof key !== "string" || !sourceKeyPattern.test(key)) ||
    new Set(value).size !== value.length ||
    value.some((key, index) => index > 0 && String(value[index - 1]) >= String(key))
  ) {
    invalid();
  }
  return value as readonly string[];
}

function validateOutbox(row: PostgresDataMigrationRow): void {
  const responseMode = text(row, "response_mode");
  const status = text(row, "status");
  const actor = nullableText(row, "decided_by_external_user_id");
  const decidedAt = nullableTimestamp(row, "decided_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  const version = integer(row, "version");
  const requestKey = text(row, "request_key");
  const replyText = text(row, "reply_text");
  parseSourceKeys(row);
  if (actor !== null) requireTrimmed(actor, 255);
  if (
    !outboxKeyPattern.test(text(row, "outbox_key")) ||
    text(row, "outbox_key") !== `ai_reply_outbox_v1_${digestJson({
      namespace: "ai_reply_outbox_v1",
      tenantId: integer(row, "tenant_id"),
      requestKey,
    })}` ||
    !requestKeyPattern.test(requestKey) ||
    !auditKeyPattern.test(text(row, "audit_key")) ||
    !conversationKeyPattern.test(text(row, "conversation_key")) ||
    !messageKeyPattern.test(text(row, "inbound_message_key")) ||
    !agentKeyPattern.test(text(row, "ai_agent_key")) ||
    !agentVersionKeyPattern.test(text(row, "ai_agent_version_key")) ||
    integer(row, "expected_conversation_version") < 1 ||
    !phonePattern.test(text(row, "recipient_phone_e164")) ||
    !responseModes.has(responseMode) ||
    replyText.trim().length < 1 ||
    replyText.length > 4_096 ||
    unsafeControlPattern.test(replyText) ||
    integer(row, "grounding_score_basis_points") < 0 ||
    integer(row, "grounding_score_basis_points") > 10_000 ||
    !outboxStatuses.has(status) ||
    version < 1 ||
    updatedAt < createdAt ||
    (decidedAt !== null && (decidedAt < createdAt || decidedAt !== updatedAt)) ||
    !(
      responseMode === "automatic" && status === "ready-for-delivery" &&
        actor === null && decidedAt === null && version === 1 ||
      responseMode === "agent-approval" && status === "awaiting-approval" &&
        actor === null && decidedAt === null && version === 1 ||
      responseMode === "agent-approval" &&
        ["ready-for-delivery", "rejected"].includes(status) &&
        actor !== null && decidedAt !== null && version >= 2
    )
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: PostgresDataMigrationColumnKind,
  nullable = false,
) {
  return Object.freeze({ name, kind, ...(nullable ? { nullable: true as const } : {}) });
}

export const POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "ai_agents",
      columns: Object.freeze([
        column("ai_agent_key", "text"),
        column("tenant_id", "positive-integer"),
        column("name", "text"),
        column("status", "text"),
        column("latest_version_key", "text"),
        column("latest_version_number", "positive-integer"),
        column("active_version_key", "text", true),
        column("version", "positive-integer"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "ai_agent_key"]),
      validate: validateAgent,
    }),
    Object.freeze({
      name: "ai_agent_versions",
      columns: Object.freeze([
        column("ai_agent_version_key", "text"),
        column("ai_agent_key", "text"),
        column("tenant_id", "positive-integer"),
        column("version_number", "positive-integer"),
        column("status", "text"),
        column("definition_json", "json"),
        column("published_at", "timestamp", true),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "ai_agent_key", "version_number"]),
      validate: validateAgentVersion,
    }),
    Object.freeze({
      name: "knowledge_sources",
      columns: Object.freeze([
        column("source_key", "text"),
        column("tenant_id", "positive-integer"),
        column("content_sha256", "text"),
        column("file_name", "text"),
        column("media_type", "text"),
        column("size_bytes", "positive-integer"),
        column("storage_object_key", "text"),
        column("status", "text"),
        column("last_error_code", "text", true),
        column("ready_at", "timestamp", true),
        column("version", "positive-integer"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "source_key"]),
      validate: validateKnowledgeSource,
    }),
    Object.freeze({
      name: "knowledge_passages",
      columns: Object.freeze([
        column("passage_key", "text"),
        column("tenant_id", "positive-integer"),
        column("source_key", "text"),
        column("passage_ordinal", "positive-integer"),
        column("content_sha256", "text"),
        column("content", "text"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "source_key", "passage_ordinal"]),
      validate: validateKnowledgePassage,
    }),
    Object.freeze({
      name: "ai_agent_version_sources",
      columns: Object.freeze([
        column("tenant_id", "positive-integer"),
        column("ai_agent_version_key", "text"),
        column("source_key", "text"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "ai_agent_version_key", "source_key"]),
      validate: validateAgentVersionSource,
    }),
    Object.freeze({
      name: "ai_runtime_cost_authorizations",
      columns: Object.freeze([
        column("request_key", "text"),
        column("tenant_id", "positive-integer"),
        column("ai_agent_key", "text"),
        column("period_start", "date"),
        column("monthly_limit_minor_units", "positive-integer"),
        column("currency", "text"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "request_key"]),
      validate: validateCostAuthorization,
    }),
    Object.freeze({
      name: "ai_runtime_usage",
      columns: Object.freeze([
        column("request_key", "text"),
        column("tenant_id", "positive-integer"),
        column("ai_agent_key", "text"),
        column("period_start", "date"),
        column("input_tokens", "nonnegative-integer"),
        column("output_tokens", "positive-integer"),
        column("cost_minor_units", "nonnegative-integer"),
        column("currency", "text"),
        column("within_limit", "boolean-integer"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "request_key"]),
      validate: validateUsage,
    }),
    Object.freeze({
      name: "ai_runtime_audit_events",
      columns: Object.freeze([
        column("audit_key", "text"),
        column("request_key", "text"),
        column("tenant_id", "positive-integer"),
        column("conversation_key", "text"),
        column("inbound_message_key", "text"),
        column("ai_agent_key", "text"),
        column("ai_agent_version_key", "text"),
        column("expected_conversation_version", "positive-integer"),
        column("outcome", "text"),
        column("reason", "text", true),
        column("response_mode", "text"),
        column("grounding_score_basis_points", "nonnegative-integer", true),
        column("input_tokens", "nonnegative-integer", true),
        column("output_tokens", "positive-integer", true),
        column("cost_minor_units", "nonnegative-integer", true),
        column("currency", "text"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "created_at", "audit_key"]),
      validate: validateAudit,
    }),
    Object.freeze({
      name: "ai_reply_outbox",
      columns: Object.freeze([
        column("outbox_key", "text"),
        column("request_key", "text"),
        column("audit_key", "text"),
        column("tenant_id", "positive-integer"),
        column("conversation_key", "text"),
        column("inbound_message_key", "text"),
        column("ai_agent_key", "text"),
        column("ai_agent_version_key", "text"),
        column("expected_conversation_version", "positive-integer"),
        column("recipient_phone_e164", "text"),
        column("response_mode", "text"),
        column("reply_text", "text"),
        column("grounded_source_keys_json", "json"),
        column("grounding_score_basis_points", "nonnegative-integer"),
        column("status", "text"),
        column("decided_by_external_user_id", "text", true),
        column("decided_at", "timestamp", true),
        column("version", "positive-integer"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "created_at", "outbox_key"]),
      validate: validateOutbox,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireNoRows(
  transaction: PostgresQueryExecutor,
  sql: string,
  code: string,
): Promise<void> {
  const result = await transaction.query(sql, []);
  if (result.rowCount !== 0) throw new Error(code);
}

async function verifyLoadedState(transaction: PostgresQueryExecutor): Promise<void> {
  await requireNoRows(transaction, `
    SELECT 1
    FROM ai_agents AS agent
    LEFT JOIN ai_agent_versions AS latest
      ON latest.tenant_id = agent.tenant_id
      AND latest.ai_agent_key = agent.ai_agent_key
      AND latest.ai_agent_version_key = agent.latest_version_key
      AND latest.version_number = agent.latest_version_number
    LEFT JOIN ai_agent_versions AS active
      ON active.tenant_id = agent.tenant_id
      AND active.ai_agent_key = agent.ai_agent_key
      AND active.ai_agent_version_key = agent.active_version_key
    WHERE latest.ai_agent_version_key IS NULL
      OR (agent.active_version_key IS NOT NULL
        AND active.ai_agent_version_key IS NULL)
    LIMIT 1`, "ai-agent-projection-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM ai_agent_versions AS version
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        version.definition_json -> 'knowledgeSourceKeys'
      ) AS desired(source_key)
      LEFT JOIN ai_agent_version_sources AS link
        ON link.tenant_id = version.tenant_id
        AND link.ai_agent_version_key = version.ai_agent_version_key
        AND link.source_key = desired.source_key
      WHERE link.source_key IS NULL
    ) OR EXISTS (
      SELECT 1
      FROM ai_agent_version_sources AS link
      WHERE link.tenant_id = version.tenant_id
        AND link.ai_agent_version_key = version.ai_agent_version_key
        AND NOT (version.definition_json -> 'knowledgeSourceKeys'
          ? link.source_key)
    )
    LIMIT 1`, "ai-agent-source-lineage-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM knowledge_sources AS source
    LEFT JOIN knowledge_passages AS passage
      ON passage.tenant_id = source.tenant_id
      AND passage.source_key = source.source_key
    GROUP BY source.tenant_id, source.source_key, source.status,
      source.last_error_code, source.ready_at
    HAVING
      (source.status = 'ready' AND count(passage.passage_key) = 0)
      OR (source.status = 'archived' AND source.ready_at IS NOT NULL
        AND count(passage.passage_key) = 0)
      OR (source.status NOT IN ('ready', 'archived')
        AND count(passage.passage_key) > 0)
      OR (source.status = 'archived' AND source.ready_at IS NULL
        AND count(passage.passage_key) > 0)
      OR (count(passage.passage_key) > 0 AND (
        min(passage.passage_ordinal) <> 1
        OR max(passage.passage_ordinal) <> count(passage.passage_key)
        OR count(passage.passage_key) > 1000
      ))
    LIMIT 1`, "knowledge-passage-state-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM ai_runtime_usage AS usage
    LEFT JOIN ai_runtime_cost_authorizations AS cost_auth
      ON cost_auth.tenant_id = usage.tenant_id
      AND cost_auth.request_key = usage.request_key
      AND cost_auth.ai_agent_key = usage.ai_agent_key
      AND cost_auth.period_start = usage.period_start
      AND cost_auth.currency = usage.currency
    WHERE cost_auth.request_key IS NULL
    LIMIT 1`, "ai-runtime-cost-lineage-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM ai_runtime_audit_events AS audit
    LEFT JOIN messages AS inbound
      ON inbound.tenant_id = audit.tenant_id
      AND inbound.conversation_key = audit.conversation_key
      AND inbound.message_key = audit.inbound_message_key
      AND inbound.direction = 'inbound'
    LEFT JOIN ai_agent_versions AS version
      ON version.tenant_id = audit.tenant_id
      AND version.ai_agent_key = audit.ai_agent_key
      AND version.ai_agent_version_key = audit.ai_agent_version_key
    LEFT JOIN ai_runtime_usage AS usage
      ON usage.tenant_id = audit.tenant_id
      AND usage.request_key = audit.request_key
      AND usage.ai_agent_key = audit.ai_agent_key
      AND usage.input_tokens IS NOT DISTINCT FROM audit.input_tokens
      AND usage.output_tokens IS NOT DISTINCT FROM audit.output_tokens
      AND usage.cost_minor_units IS NOT DISTINCT FROM audit.cost_minor_units
      AND usage.currency = audit.currency
    WHERE inbound.message_key IS NULL
      OR version.ai_agent_version_key IS NULL
      OR (audit.input_tokens IS NOT NULL AND usage.request_key IS NULL)
    LIMIT 1`, "ai-runtime-audit-lineage-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM ai_reply_outbox AS outbox
    LEFT JOIN ai_runtime_audit_events AS audit
      ON audit.tenant_id = outbox.tenant_id
      AND audit.audit_key = outbox.audit_key
      AND audit.request_key = outbox.request_key
      AND audit.conversation_key = outbox.conversation_key
      AND audit.inbound_message_key = outbox.inbound_message_key
      AND audit.ai_agent_key = outbox.ai_agent_key
      AND audit.ai_agent_version_key = outbox.ai_agent_version_key
      AND audit.expected_conversation_version = outbox.expected_conversation_version
      AND audit.response_mode = outbox.response_mode
      AND audit.grounding_score_basis_points = outbox.grounding_score_basis_points
      AND audit.outcome = 'reply-planned'
    LEFT JOIN conversations AS conversation
      ON conversation.tenant_id = outbox.tenant_id
      AND conversation.conversation_key = outbox.conversation_key
    LEFT JOIN contacts AS contact
      ON contact.tenant_id = conversation.tenant_id
      AND contact.id = conversation.contact_id
      AND contact.phone_e164 = outbox.recipient_phone_e164
    WHERE audit.audit_key IS NULL OR contact.id IS NULL OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        outbox.grounded_source_keys_json
      ) AS grounded(source_key)
      LEFT JOIN ai_agent_version_sources AS link
        ON link.tenant_id = outbox.tenant_id
        AND link.ai_agent_version_key = outbox.ai_agent_version_key
        AND link.source_key = grounded.source_key
      LEFT JOIN knowledge_sources AS source
        ON source.tenant_id = outbox.tenant_id
        AND source.source_key = grounded.source_key
      WHERE link.source_key IS NULL OR source.source_key IS NULL
    )
    LIMIT 1`, "ai-reply-outbox-lineage-invalid");
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_ai_knowledge_runtime_data_v1",
  planKind: "postgres-ai-knowledge-runtime-data-migration-plan",
  evidenceKind: "postgres-ai-knowledge-runtime-data-migration-evidence",
  advisoryLockKey: [1129270867, 4],
  tables: POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
  verifyLoadedState,
});

export type PostgresAiKnowledgeRuntimeDataSnapshot = PostgresDataMigrationSnapshot;
export type PostgresAiKnowledgeRuntimeDataMigrationPlan = PostgresDataMigrationPlan;
export type PostgresAiKnowledgeRuntimeDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresAiKnowledgeRuntimeDataSnapshot = protocol.createSnapshot;
export const createPostgresAiKnowledgeRuntimeDataMigrationPlan = protocol.createPlan;
export const executePostgresAiKnowledgeRuntimeDataMigration = protocol.execute;

export async function migratePostgresAiKnowledgeRuntimeData(
  input: Readonly<{
    snapshot: PostgresAiKnowledgeRuntimeDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresAiKnowledgeRuntimeDataMigrationEvidence> {
  const plan = createPostgresAiKnowledgeRuntimeDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresAiKnowledgeRuntimeDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
