import {
  aiAgentFallbackReasons,
  aiResponseModes,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiCostAuthorizationRequest,
  AiCostAuthorizationResult,
  AiCostUsageRequest,
  AiCostUsageResult,
  AiRuntimeAuditEvent,
} from "../../shared/domain/aiRuntime.ts";
import type {
  AiRuntimePersistence,
} from "../../db/aiRuntimeRepository.ts";
import {
  parsePostgresNonnegativeInteger,
  parsePostgresPositiveInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const requestKeyPattern = /^ai_provider_request_v1_[0-9a-f]{64}$/;
const auditKeyPattern = /^ai_runtime_audit_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const aiAgentKeyPattern = /^ai_agent_v1_[0-9a-f]{64}$/;
const aiAgentVersionKeyPattern = /^ai_agent_version_v1_[0-9a-f]{64}$/;
const currencyPattern = /^[A-Z]{3}$/;
const periodStartPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const conversationStatuses = Object.freeze([
  "new",
  "bot_active",
  "waiting_for_agent",
  "agent_active",
  "waiting_for_contact",
  "closed",
]);

const authorizationRowKeys = Object.freeze([
  "aiAgentKey",
  "currency",
  "monthlyLimitMinorUnits",
  "periodStart",
  "requestKey",
  "tenantId",
]);
const usageRowKeys = Object.freeze([
  "aiAgentKey",
  "costMinorUnits",
  "currency",
  "inputTokens",
  "outputTokens",
  "requestKey",
  "tenantId",
  "withinLimit",
]);
const auditRowKeys = Object.freeze([
  "aiAgentKey",
  "aiAgentVersionKey",
  "auditKey",
  "conversationKey",
  "costMinorUnits",
  "currency",
  "expectedConversationVersion",
  "groundingScoreBasisPoints",
  "inboundMessageKey",
  "inputTokens",
  "outcome",
  "outputTokens",
  "reason",
  "requestKey",
  "responseMode",
  "tenantId",
]);
const agentLockRowKeys = Object.freeze(["aiAgentKey", "status"]);
const conversationRowKeys = Object.freeze([
  "assignedExternalUserId",
  "status",
  "version",
]);

const authorizationColumns = `
  request_key AS "requestKey",
  tenant_id AS "tenantId",
  ai_agent_key AS "aiAgentKey",
  period_start::text AS "periodStart",
  monthly_limit_minor_units AS "monthlyLimitMinorUnits",
  currency
`;
const usageColumns = `
  request_key AS "requestKey",
  tenant_id AS "tenantId",
  ai_agent_key AS "aiAgentKey",
  input_tokens AS "inputTokens",
  output_tokens AS "outputTokens",
  cost_minor_units AS "costMinorUnits",
  currency,
  within_limit AS "withinLimit"
`;
const auditColumns = `
  audit_key AS "auditKey",
  request_key AS "requestKey",
  tenant_id AS "tenantId",
  conversation_key AS "conversationKey",
  inbound_message_key AS "inboundMessageKey",
  ai_agent_key AS "aiAgentKey",
  ai_agent_version_key AS "aiAgentVersionKey",
  expected_conversation_version AS "expectedConversationVersion",
  outcome,
  reason,
  response_mode AS "responseMode",
  grounding_score_basis_points AS "groundingScoreBasisPoints",
  input_tokens AS "inputTokens",
  output_tokens AS "outputTokens",
  cost_minor_units AS "costMinorUnits",
  currency
`;

export const postgresAiRuntimeSql = Object.freeze({
  findAuthorizationForUpdate: `
    SELECT ${authorizationColumns}
    FROM ai_runtime_cost_authorizations
    WHERE tenant_id = $1
      AND request_key = $2
    FOR UPDATE
  `,
  lockAgent: `
    SELECT ai_agent_key AS "aiAgentKey", status
    FROM ai_agents
    WHERE tenant_id = $1
      AND ai_agent_key = $2
    FOR UPDATE
  `,
  sumUsage: `
    SELECT COALESCE(SUM(cost_minor_units), 0) AS "costMinorUnits"
    FROM ai_runtime_usage
    WHERE tenant_id = $1
      AND ai_agent_key = $2
      AND period_start = $3::date
      AND currency = $4
  `,
  insertAuthorization: `
    INSERT INTO ai_runtime_cost_authorizations (
      request_key,
      tenant_id,
      ai_agent_key,
      period_start,
      monthly_limit_minor_units,
      currency
    ) VALUES ($1, $2, $3, $4::date, $5, $6)
    ON CONFLICT DO NOTHING
    RETURNING ${authorizationColumns}
  `,
  findUsageForUpdate: `
    SELECT ${usageColumns}
    FROM ai_runtime_usage
    WHERE tenant_id = $1
      AND request_key = $2
    FOR UPDATE
  `,
  insertUsage: `
    INSERT INTO ai_runtime_usage (
      request_key,
      tenant_id,
      ai_agent_key,
      period_start,
      input_tokens,
      output_tokens,
      cost_minor_units,
      currency,
      within_limit
    ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9)
    ON CONFLICT DO NOTHING
    RETURNING ${usageColumns}
  `,
  findAuditForUpdate: `
    SELECT ${auditColumns}
    FROM ai_runtime_audit_events
    WHERE tenant_id = $1
      AND audit_key = $2
    FOR UPDATE
  `,
  lockConversation: `
    SELECT
      status,
      assigned_external_user_id AS "assignedExternalUserId",
      version
    FROM conversations
    WHERE tenant_id = $1
      AND conversation_key = $2
    FOR UPDATE
  `,
  insertAudit: `
    INSERT INTO ai_runtime_audit_events (
      audit_key,
      request_key,
      tenant_id,
      conversation_key,
      inbound_message_key,
      ai_agent_key,
      ai_agent_version_key,
      expected_conversation_version,
      outcome,
      reason,
      response_mode,
      grounding_score_basis_points,
      input_tokens,
      output_tokens,
      cost_minor_units,
      currency
    )
    SELECT
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16
    FROM messages
    INNER JOIN ai_agents
      ON ai_agents.tenant_id = messages.tenant_id
      AND ai_agents.ai_agent_key = $6
      AND ai_agents.status = 'active'
      AND ai_agents.active_version_key = $7
    INNER JOIN ai_agent_versions
      ON ai_agent_versions.tenant_id = messages.tenant_id
      AND ai_agent_versions.ai_agent_key = $6
      AND ai_agent_versions.ai_agent_version_key = $7
      AND ai_agent_versions.status = 'published'
    WHERE messages.tenant_id = $3
      AND messages.conversation_key = $4
      AND messages.message_key = $5
      AND messages.direction = 'inbound'
      AND messages.status = 'received'
    ON CONFLICT DO NOTHING
    RETURNING ${auditColumns}
  `,
  applyHandoff: `
    UPDATE conversations
    SET
      status = 'waiting_for_agent',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND version = $3
      AND assigned_external_user_id IS NULL
      AND status IN ('new', 'bot_active')
      AND EXISTS (
        SELECT 1
        FROM ai_runtime_audit_events
        WHERE tenant_id = $1
          AND audit_key = $4
          AND outcome = 'handoff'
          AND expected_conversation_version = $3
      )
    RETURNING
      status,
      assigned_external_user_id AS "assignedExternalUserId",
      version
  `,
});

interface AuthorizationRow {
  readonly requestKey: string;
  readonly tenantId: number;
  readonly aiAgentKey: string;
  readonly periodStart: string;
  readonly monthlyLimitMinorUnits: number;
  readonly currency: string;
}

interface UsageRow {
  readonly requestKey: string;
  readonly tenantId: number;
  readonly aiAgentKey: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costMinorUnits: number;
  readonly currency: string;
  readonly withinLimit: boolean;
}

interface AgentLockRow {
  readonly aiAgentKey: string;
  readonly status: string;
}

interface ConversationRow {
  readonly status: string;
  readonly assignedExternalUserId: string | null;
  readonly version: number;
}

export interface PostgresAiRuntimeRepositoryOptions {
  readonly now?: () => Date;
}

export interface PostgresAiRuntimeRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive safe integer`);
  }
  return Number(value);
}

function requireNonnegativeInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${fieldName} must be a nonnegative safe integer`);
  }
  return Number(value);
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function requireNullableInteger(
  value: unknown,
  fieldName: string,
  positive: boolean,
): number | null {
  if (value === null) {
    return null;
  }
  try {
    return positive
      ? parsePostgresPositiveInteger(value)
      : parsePostgresNonnegativeInteger(value);
  } catch {
    throw new Error(`PostgreSQL returned an invalid ${fieldName}`);
  }
}

function parseBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error("PostgreSQL returned an invalid boolean");
  }
  return value;
}

function parseAuthorization(value: unknown): AuthorizationRow {
  const row = requireExactPostgresRow(value, authorizationRowKeys);
  return Object.freeze({
    requestKey: requirePattern(row.requestKey, requestKeyPattern, "requestKey"),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    aiAgentKey: requirePattern(row.aiAgentKey, aiAgentKeyPattern, "aiAgentKey"),
    periodStart: requirePattern(row.periodStart, periodStartPattern, "periodStart"),
    monthlyLimitMinorUnits: parsePostgresPositiveInteger(
      row.monthlyLimitMinorUnits,
    ),
    currency: requirePattern(row.currency, currencyPattern, "currency"),
  });
}

function parseUsage(value: unknown): UsageRow {
  const row = requireExactPostgresRow(value, usageRowKeys);
  return Object.freeze({
    requestKey: requirePattern(row.requestKey, requestKeyPattern, "requestKey"),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    aiAgentKey: requirePattern(row.aiAgentKey, aiAgentKeyPattern, "aiAgentKey"),
    inputTokens: parsePostgresNonnegativeInteger(row.inputTokens),
    outputTokens: parsePostgresPositiveInteger(row.outputTokens),
    costMinorUnits: parsePostgresNonnegativeInteger(row.costMinorUnits),
    currency: requirePattern(row.currency, currencyPattern, "currency"),
    withinLimit: parseBoolean(row.withinLimit),
  });
}

function parseAudit(value: unknown): AiRuntimeAuditEvent {
  const row = requireExactPostgresRow(value, auditRowKeys);
  const outcome = row.outcome === "reply-planned" || row.outcome === "handoff"
    ? row.outcome
    : null;
  const reason = row.reason === null
    ? null
    : aiAgentFallbackReasons.find((candidate) => candidate === row.reason);
  const responseMode = aiResponseModes.find(
    (candidate) => candidate === row.responseMode,
  );
  if (outcome === null || reason === undefined || responseMode === undefined) {
    throw new Error("PostgreSQL returned an invalid AI runtime audit event");
  }
  const event: AiRuntimeAuditEvent = {
    auditKey: requirePattern(row.auditKey, auditKeyPattern, "auditKey"),
    requestKey: requirePattern(row.requestKey, requestKeyPattern, "requestKey"),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    conversationKey: requirePattern(
      row.conversationKey,
      conversationKeyPattern,
      "conversationKey",
    ),
    inboundMessageKey: requirePattern(
      row.inboundMessageKey,
      messageKeyPattern,
      "inboundMessageKey",
    ),
    expectedConversationVersion: parsePostgresPositiveInteger(
      row.expectedConversationVersion,
    ),
    aiAgentKey: requirePattern(row.aiAgentKey, aiAgentKeyPattern, "aiAgentKey"),
    aiAgentVersionKey: requirePattern(
      row.aiAgentVersionKey,
      aiAgentVersionKeyPattern,
      "aiAgentVersionKey",
    ),
    outcome,
    reason,
    responseMode,
    groundingScoreBasisPoints: requireNullableInteger(
      row.groundingScoreBasisPoints,
      "groundingScoreBasisPoints",
      false,
    ),
    inputTokens: requireNullableInteger(row.inputTokens, "inputTokens", false),
    outputTokens: requireNullableInteger(row.outputTokens, "outputTokens", true),
    costMinorUnits: requireNullableInteger(
      row.costMinorUnits,
      "costMinorUnits",
      false,
    ),
    currency: requirePattern(row.currency, currencyPattern, "currency"),
  };
  assertAuditEvent(event);
  return Object.freeze(event);
}

function parseAgentLock(value: unknown): AgentLockRow {
  const row = requireExactPostgresRow(value, agentLockRowKeys);
  if (row.status !== "draft" && row.status !== "active" && row.status !== "inactive") {
    throw new Error("PostgreSQL returned an invalid AI agent state");
  }
  return Object.freeze({
    aiAgentKey: requirePattern(row.aiAgentKey, aiAgentKeyPattern, "aiAgentKey"),
    status: row.status,
  });
}

function parseConversation(value: unknown): ConversationRow {
  const row = requireExactPostgresRow(value, conversationRowKeys);
  if (
    typeof row.status !== "string" ||
    !conversationStatuses.includes(row.status) ||
    (row.assignedExternalUserId !== null &&
      typeof row.assignedExternalUserId !== "string")
  ) {
    throw new Error("PostgreSQL returned an invalid conversation state");
  }
  return Object.freeze({
    status: row.status,
    assignedExternalUserId: row.assignedExternalUserId,
    version: parsePostgresPositiveInteger(row.version),
  });
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await queries.query<Record<string, unknown>>(sql, parameters);
  return requirePostgresRows(result, maximum);
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Record<string, unknown> | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows.length === 0 ? null : rows[0];
}

function periodStartUtc(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("AI runtime clock returned an invalid date");
  }
  return `${now.toISOString().slice(0, 7)}-01`;
}

function assertAuthorizationRequest(request: AiCostAuthorizationRequest): void {
  requirePositiveInteger(request?.tenantId, "tenantId");
  requirePositiveInteger(request?.monthlyLimitMinorUnits, "monthlyLimitMinorUnits");
  requirePattern(request?.requestKey, requestKeyPattern, "requestKey");
  requirePattern(request?.aiAgentKey, aiAgentKeyPattern, "aiAgentKey");
  requirePattern(request?.currency, currencyPattern, "currency");
}

function assertUsageRequest(request: AiCostUsageRequest): void {
  requirePositiveInteger(request?.tenantId, "tenantId");
  requireNonnegativeInteger(request?.usage?.inputTokens, "inputTokens");
  requirePositiveInteger(request?.usage?.outputTokens, "outputTokens");
  requireNonnegativeInteger(request?.usage?.costMinorUnits, "costMinorUnits");
  requirePattern(request?.requestKey, requestKeyPattern, "requestKey");
  requirePattern(request?.aiAgentKey, aiAgentKeyPattern, "aiAgentKey");
  requirePattern(request?.usage?.currency, currencyPattern, "currency");
}

function assertAuditEvent(event: AiRuntimeAuditEvent): void {
  requirePositiveInteger(event?.tenantId, "tenantId");
  requirePositiveInteger(
    event?.expectedConversationVersion,
    "expectedConversationVersion",
  );
  requirePattern(event?.auditKey, auditKeyPattern, "auditKey");
  requirePattern(event?.requestKey, requestKeyPattern, "requestKey");
  requirePattern(event?.conversationKey, conversationKeyPattern, "conversationKey");
  requirePattern(event?.inboundMessageKey, messageKeyPattern, "inboundMessageKey");
  requirePattern(event?.aiAgentKey, aiAgentKeyPattern, "aiAgentKey");
  requirePattern(
    event?.aiAgentVersionKey,
    aiAgentVersionKeyPattern,
    "aiAgentVersionKey",
  );
  requirePattern(event?.currency, currencyPattern, "currency");
  if (
    !aiResponseModes.includes(event?.responseMode) ||
    (event?.outcome !== "reply-planned" && event?.outcome !== "handoff") ||
    (event.outcome === "reply-planned" && event.reason !== null) ||
    (event.outcome === "handoff" &&
      (event.reason === null || !aiAgentFallbackReasons.includes(event.reason))) ||
    (event.groundingScoreBasisPoints !== null &&
      (!Number.isSafeInteger(event.groundingScoreBasisPoints) ||
        event.groundingScoreBasisPoints < 0 ||
        event.groundingScoreBasisPoints > 10_000))
  ) {
    throw new Error("AI runtime audit event is invalid");
  }
  const values = [event.inputTokens, event.outputTokens, event.costMinorUnits];
  const hasUsage = values.every((value) => value !== null);
  const hasNoUsage = values.every((value) => value === null);
  if (
    (!hasUsage && !hasNoUsage) ||
    (event.outcome === "reply-planned" &&
      (!hasUsage || event.groundingScoreBasisPoints === null))
  ) {
    throw new Error("AI runtime audit usage is invalid");
  }
  if (hasUsage) {
    requireNonnegativeInteger(event.inputTokens, "inputTokens");
    requirePositiveInteger(event.outputTokens, "outputTokens");
    requireNonnegativeInteger(event.costMinorUnits, "costMinorUnits");
  }
}

function authorizationMatches(
  row: AuthorizationRow,
  request: AiCostAuthorizationRequest,
  periodStart?: string,
): boolean {
  return row.requestKey === request.requestKey &&
    row.tenantId === request.tenantId &&
    row.aiAgentKey === request.aiAgentKey &&
    row.monthlyLimitMinorUnits === request.monthlyLimitMinorUnits &&
    row.currency === request.currency &&
    (periodStart === undefined || row.periodStart === periodStart);
}

function usageMatches(row: UsageRow, request: AiCostUsageRequest): boolean {
  return row.requestKey === request.requestKey &&
    row.tenantId === request.tenantId &&
    row.aiAgentKey === request.aiAgentKey &&
    row.inputTokens === request.usage.inputTokens &&
    row.outputTokens === request.usage.outputTokens &&
    row.costMinorUnits === request.usage.costMinorUnits &&
    row.currency === request.usage.currency;
}

function auditMatches(row: AiRuntimeAuditEvent, event: AiRuntimeAuditEvent): boolean {
  return row.auditKey === event.auditKey &&
    row.requestKey === event.requestKey &&
    row.tenantId === event.tenantId &&
    row.conversationKey === event.conversationKey &&
    row.inboundMessageKey === event.inboundMessageKey &&
    row.expectedConversationVersion === event.expectedConversationVersion &&
    row.aiAgentKey === event.aiAgentKey &&
    row.aiAgentVersionKey === event.aiAgentVersionKey &&
    row.outcome === event.outcome &&
    row.reason === event.reason &&
    row.responseMode === event.responseMode &&
    row.groundingScoreBasisPoints === event.groundingScoreBasisPoints &&
    row.inputTokens === event.inputTokens &&
    row.outputTokens === event.outputTokens &&
    row.costMinorUnits === event.costMinorUnits &&
    row.currency === event.currency;
}

async function sumUsage(
  queries: PostgresQueryExecutor,
  tenantId: number,
  aiAgentKey: string,
  periodStart: string,
  currency: string,
): Promise<number> {
  const row = await loadOne(queries, postgresAiRuntimeSql.sumUsage, [
    tenantId,
    aiAgentKey,
    periodStart,
    currency,
  ]);
  if (row === null) {
    throw new Error("PostgreSQL returned a missing AI usage aggregate");
  }
  const exact = requireExactPostgresRow(row, ["costMinorUnits"]);
  return parsePostgresNonnegativeInteger(exact.costMinorUnits);
}

function handoffStateMatches(
  conversation: ConversationRow,
  expectedVersion: number,
): boolean {
  return conversation.status === "waiting_for_agent" &&
    conversation.assignedExternalUserId === null &&
    conversation.version === expectedVersion + 1;
}

export function createPostgresAiRuntimePersistence(
  dependencies: Readonly<PostgresAiRuntimeRepositoryDependencies>,
  options: Readonly<PostgresAiRuntimeRepositoryOptions> = {},
): AiRuntimePersistence {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function" ||
    (options.now !== undefined && typeof options.now !== "function")
  ) {
    throw new Error("PostgreSQL AI runtime repository dependencies are invalid");
  }
  const now = options.now ?? (() => new Date());

  return Object.freeze({
    costGate: Object.freeze({
      async authorize(
        request: AiCostAuthorizationRequest,
      ): Promise<AiCostAuthorizationResult> {
        assertAuthorizationRequest(request);
        return dependencies.transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const initial = await loadOne(
              transaction,
              postgresAiRuntimeSql.findAuthorizationForUpdate,
              [request.tenantId, request.requestKey],
            );
            if (initial !== null) {
              if (!authorizationMatches(parseAuthorization(initial), request)) {
                throw new Error(
                  "PostgreSQL returned a conflicting AI cost authorization",
                );
              }
              return Object.freeze({ outcome: "authorized" as const });
            }

            const agentRow = await loadOne(
              transaction,
              postgresAiRuntimeSql.lockAgent,
              [request.tenantId, request.aiAgentKey],
            );
            if (agentRow === null) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            const agent = parseAgentLock(agentRow);
            if (agent.aiAgentKey !== request.aiAgentKey || agent.status !== "active") {
              return Object.freeze({ outcome: "unavailable" as const });
            }

            const replay = await loadOne(
              transaction,
              postgresAiRuntimeSql.findAuthorizationForUpdate,
              [request.tenantId, request.requestKey],
            );
            if (replay !== null) {
              if (!authorizationMatches(parseAuthorization(replay), request)) {
                throw new Error(
                  "PostgreSQL returned a conflicting AI cost authorization",
                );
              }
              return Object.freeze({ outcome: "authorized" as const });
            }

            const periodStart = periodStartUtc(now());
            const spent = await sumUsage(
              transaction,
              request.tenantId,
              request.aiAgentKey,
              periodStart,
              request.currency,
            );
            if (spent >= request.monthlyLimitMinorUnits) {
              return Object.freeze({ outcome: "exhausted" as const });
            }
            const inserted = await loadOne(
              transaction,
              postgresAiRuntimeSql.insertAuthorization,
              [
                request.requestKey,
                request.tenantId,
                request.aiAgentKey,
                periodStart,
                request.monthlyLimitMinorUnits,
                request.currency,
              ],
            );
            if (
              inserted === null ||
              !authorizationMatches(parseAuthorization(inserted), request, periodStart)
            ) {
              throw new Error("PostgreSQL failed to persist AI cost authorization");
            }
            return Object.freeze({ outcome: "authorized" as const });
          },
        );
      },

      async recordUsage(request: AiCostUsageRequest): Promise<AiCostUsageResult> {
        assertUsageRequest(request);
        return dependencies.transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const existing = await loadOne(
              transaction,
              postgresAiRuntimeSql.findUsageForUpdate,
              [request.tenantId, request.requestKey],
            );
            if (existing !== null) {
              const usage = parseUsage(existing);
              if (!usageMatches(usage, request)) {
                throw new Error("PostgreSQL returned conflicting AI usage");
              }
              return Object.freeze({
                outcome: "recorded" as const,
                withinLimit: usage.withinLimit,
              });
            }

            const agentRow = await loadOne(
              transaction,
              postgresAiRuntimeSql.lockAgent,
              [request.tenantId, request.aiAgentKey],
            );
            if (agentRow === null) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            const agent = parseAgentLock(agentRow);
            if (agent.aiAgentKey !== request.aiAgentKey) {
              return Object.freeze({ outcome: "unavailable" as const });
            }

            const replay = await loadOne(
              transaction,
              postgresAiRuntimeSql.findUsageForUpdate,
              [request.tenantId, request.requestKey],
            );
            if (replay !== null) {
              const usage = parseUsage(replay);
              if (!usageMatches(usage, request)) {
                throw new Error("PostgreSQL returned conflicting AI usage");
              }
              return Object.freeze({
                outcome: "recorded" as const,
                withinLimit: usage.withinLimit,
              });
            }

            const authorizationRow = await loadOne(
              transaction,
              postgresAiRuntimeSql.findAuthorizationForUpdate,
              [request.tenantId, request.requestKey],
            );
            if (authorizationRow === null) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            const authorization = parseAuthorization(authorizationRow);
            if (
              authorization.aiAgentKey !== request.aiAgentKey ||
              authorization.currency !== request.usage.currency
            ) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            const spent = await sumUsage(
              transaction,
              request.tenantId,
              request.aiAgentKey,
              authorization.periodStart,
              request.usage.currency,
            );
            const withinLimit =
              spent <= authorization.monthlyLimitMinorUnits &&
              request.usage.costMinorUnits <=
                authorization.monthlyLimitMinorUnits - spent;
            const inserted = await loadOne(
              transaction,
              postgresAiRuntimeSql.insertUsage,
              [
                request.requestKey,
                request.tenantId,
                request.aiAgentKey,
                authorization.periodStart,
                request.usage.inputTokens,
                request.usage.outputTokens,
                request.usage.costMinorUnits,
                request.usage.currency,
                withinLimit,
              ],
            );
            if (inserted === null) {
              throw new Error("PostgreSQL failed to persist AI usage");
            }
            const usage = parseUsage(inserted);
            if (!usageMatches(usage, request) || usage.withinLimit !== withinLimit) {
              throw new Error("PostgreSQL returned conflicting AI usage");
            }
            return Object.freeze({
              outcome: "recorded" as const,
              withinLimit,
            });
          },
        );
      },
    }),
    auditSink: Object.freeze({
      async record(event: AiRuntimeAuditEvent): Promise<unknown> {
        assertAuditEvent(event);
        return dependencies.transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const existing = await loadOne(
              transaction,
              postgresAiRuntimeSql.findAuditForUpdate,
              [event.tenantId, event.auditKey],
            );
            if (existing !== null) {
              const audit = parseAudit(existing);
              if (!auditMatches(audit, event)) {
                return Object.freeze({ outcome: "unavailable" as const });
              }
              if (event.outcome !== "handoff") {
                return Object.freeze({ outcome: "recorded" as const });
              }
              const state = await loadOne(
                transaction,
                postgresAiRuntimeSql.lockConversation,
                [event.tenantId, event.conversationKey],
              );
              return Object.freeze({
                outcome:
                  state !== null &&
                  handoffStateMatches(
                    parseConversation(state),
                    event.expectedConversationVersion,
                  )
                    ? "recorded" as const
                    : "unavailable" as const,
              });
            }

            const conversationRow = await loadOne(
              transaction,
              postgresAiRuntimeSql.lockConversation,
              [event.tenantId, event.conversationKey],
            );
            if (conversationRow === null) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            const conversation = parseConversation(conversationRow);
            const replay = await loadOne(
              transaction,
              postgresAiRuntimeSql.findAuditForUpdate,
              [event.tenantId, event.auditKey],
            );
            if (replay !== null) {
              const audit = parseAudit(replay);
              return Object.freeze({
                outcome:
                  auditMatches(audit, event) &&
                  (event.outcome !== "handoff" ||
                    handoffStateMatches(
                      conversation,
                      event.expectedConversationVersion,
                    ))
                    ? "recorded" as const
                    : "unavailable" as const,
              });
            }
            if (
              conversation.version !== event.expectedConversationVersion ||
              conversation.assignedExternalUserId !== null ||
              (conversation.status !== "new" && conversation.status !== "bot_active")
            ) {
              return Object.freeze({ outcome: "unavailable" as const });
            }

            const inserted = await loadOne(
              transaction,
              postgresAiRuntimeSql.insertAudit,
              [
                event.auditKey,
                event.requestKey,
                event.tenantId,
                event.conversationKey,
                event.inboundMessageKey,
                event.aiAgentKey,
                event.aiAgentVersionKey,
                event.expectedConversationVersion,
                event.outcome,
                event.reason,
                event.responseMode,
                event.groundingScoreBasisPoints,
                event.inputTokens,
                event.outputTokens,
                event.costMinorUnits,
                event.currency,
              ],
            );
            if (inserted === null) {
              return Object.freeze({ outcome: "unavailable" as const });
            }
            if (!auditMatches(parseAudit(inserted), event)) {
              throw new Error("PostgreSQL returned conflicting AI runtime audit");
            }
            if (event.outcome !== "handoff") {
              return Object.freeze({ outcome: "recorded" as const });
            }
            const updated = await loadOne(
              transaction,
              postgresAiRuntimeSql.applyHandoff,
              [
                event.tenantId,
                event.conversationKey,
                event.expectedConversationVersion,
                event.auditKey,
              ],
            );
            if (
              updated === null ||
              !handoffStateMatches(
                parseConversation(updated),
                event.expectedConversationVersion,
              )
            ) {
              throw new Error("PostgreSQL AI runtime handoff failed");
            }
            return Object.freeze({ outcome: "recorded" as const });
          },
        );
      },
    }),
  });
}
