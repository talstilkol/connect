import {
  aiAgentFallbackReasons,
  aiResponseModes,
} from "../shared/domain/aiAgent.ts";
import type {
  AiCostAuthorizationRequest,
  AiCostAuthorizationResult,
  AiCostGate,
  AiCostUsageRequest,
  AiCostUsageResult,
  AiRuntimeAuditEvent,
  AiRuntimeAuditSink,
} from "../shared/domain/aiRuntime.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const REQUEST_KEY_PATTERN =
  /^ai_provider_request_v1_[0-9a-f]{64}$/;
const AUDIT_KEY_PATTERN =
  /^ai_runtime_audit_v1_[0-9a-f]{64}$/;
const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const AI_AGENT_KEY_PATTERN =
  /^ai_agent_v1_[0-9a-f]{64}$/;
const AI_AGENT_VERSION_KEY_PATTERN =
  /^ai_agent_version_v1_[0-9a-f]{64}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const PERIOD_START_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-01$/;

const SELECT_COST_AUTHORIZATION_SQL = `
  SELECT
    request_key AS requestKey,
    tenant_id AS tenantId,
    ai_agent_key AS aiAgentKey,
    period_start AS periodStart,
    monthly_limit_minor_units AS monthlyLimitMinorUnits,
    currency
  FROM ai_runtime_cost_authorizations
  WHERE tenant_id = ?1
    AND request_key = ?2
  LIMIT 1
`;

const INSERT_COST_AUTHORIZATION_SQL = `
  INSERT INTO ai_runtime_cost_authorizations (
    request_key,
    tenant_id,
    ai_agent_key,
    period_start,
    monthly_limit_minor_units,
    currency
  )
  SELECT
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6
  FROM ai_agents
  WHERE ai_agents.tenant_id = ?2
    AND ai_agents.ai_agent_key = ?3
    AND ai_agents.status = 'active'
    AND COALESCE(
      (
        SELECT SUM(cost_minor_units)
        FROM ai_runtime_usage
        WHERE ai_runtime_usage.tenant_id = ?2
          AND ai_runtime_usage.ai_agent_key = ?3
          AND ai_runtime_usage.period_start = ?4
          AND ai_runtime_usage.currency = ?6
      ),
      0
    ) < ?5
  ON CONFLICT (request_key) DO NOTHING
`;

const SELECT_ACTIVE_AGENT_SQL = `
  SELECT ai_agent_key AS aiAgentKey
  FROM ai_agents
  WHERE tenant_id = ?1
    AND ai_agent_key = ?2
    AND status = 'active'
  LIMIT 1
`;

const INSERT_USAGE_SQL = `
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
  )
  SELECT
    authorization.request_key,
    authorization.tenant_id,
    authorization.ai_agent_key,
    authorization.period_start,
    ?4,
    ?5,
    ?6,
    ?7,
    CASE
      WHEN COALESCE(
        (
          SELECT SUM(existing.cost_minor_units)
          FROM ai_runtime_usage AS existing
          WHERE existing.tenant_id =
              authorization.tenant_id
            AND existing.ai_agent_key =
              authorization.ai_agent_key
            AND existing.period_start =
              authorization.period_start
            AND existing.currency =
              authorization.currency
        ),
        0
      ) + ?6 <=
        authorization.monthly_limit_minor_units
      THEN 1
      ELSE 0
    END
  FROM ai_runtime_cost_authorizations AS authorization
  WHERE authorization.tenant_id = ?2
    AND authorization.request_key = ?1
    AND authorization.ai_agent_key = ?3
    AND authorization.currency = ?7
  ON CONFLICT (request_key) DO NOTHING
`;

const SELECT_USAGE_SQL = `
  SELECT
    request_key AS requestKey,
    tenant_id AS tenantId,
    ai_agent_key AS aiAgentKey,
    input_tokens AS inputTokens,
    output_tokens AS outputTokens,
    cost_minor_units AS costMinorUnits,
    currency,
    within_limit AS withinLimit
  FROM ai_runtime_usage
  WHERE tenant_id = ?1
    AND request_key = ?2
  LIMIT 1
`;

const INSERT_AUDIT_EVENT_SQL = `
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
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6,
    ?7,
    ?8,
    ?9,
    ?10,
    ?11,
    ?12,
    ?13,
    ?14,
    ?15,
    ?16
  FROM conversations
  INNER JOIN messages
    ON messages.tenant_id = conversations.tenant_id
    AND messages.conversation_key =
      conversations.conversation_key
    AND messages.message_key = ?5
    AND messages.direction = 'inbound'
    AND messages.status = 'received'
  INNER JOIN ai_agents
    ON ai_agents.tenant_id = conversations.tenant_id
    AND ai_agents.ai_agent_key = ?6
    AND ai_agents.status = 'active'
    AND ai_agents.active_version_key = ?7
  INNER JOIN ai_agent_versions
    ON ai_agent_versions.tenant_id =
      conversations.tenant_id
    AND ai_agent_versions.ai_agent_key = ?6
    AND ai_agent_versions.ai_agent_version_key = ?7
    AND ai_agent_versions.status = 'published'
  WHERE conversations.tenant_id = ?3
    AND conversations.conversation_key = ?4
    AND conversations.version = ?8
    AND conversations.assigned_external_user_id IS NULL
    AND conversations.status IN ('new', 'bot_active')
  ON CONFLICT (audit_key) DO NOTHING
`;

const APPLY_AUDITED_HANDOFF_SQL = `
  UPDATE conversations
  SET
    status = 'waiting_for_agent',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND version = ?3
    AND assigned_external_user_id IS NULL
    AND status IN ('new', 'bot_active')
    AND EXISTS (
      SELECT 1
      FROM ai_runtime_audit_events
      WHERE ai_runtime_audit_events.tenant_id = ?1
        AND ai_runtime_audit_events.audit_key = ?4
        AND ai_runtime_audit_events.outcome = 'handoff'
        AND ai_runtime_audit_events.expected_conversation_version =
          ?3
    )
`;

const SELECT_AUDIT_EVENT_SQL = `
  SELECT
    audit_key AS auditKey,
    request_key AS requestKey,
    tenant_id AS tenantId,
    conversation_key AS conversationKey,
    inbound_message_key AS inboundMessageKey,
    ai_agent_key AS aiAgentKey,
    ai_agent_version_key AS aiAgentVersionKey,
    expected_conversation_version AS expectedConversationVersion,
    outcome,
    reason,
    response_mode AS responseMode,
    grounding_score_basis_points AS groundingScoreBasisPoints,
    input_tokens AS inputTokens,
    output_tokens AS outputTokens,
    cost_minor_units AS costMinorUnits,
    currency
  FROM ai_runtime_audit_events
  WHERE tenant_id = ?1
    AND audit_key = ?2
  LIMIT 1
`;

const SELECT_CONVERSATION_HANDOFF_STATE_SQL = `
  SELECT
    status,
    assigned_external_user_id AS assignedExternalUserId,
    version
  FROM conversations
  WHERE tenant_id = ?1
    AND conversation_key = ?2
  LIMIT 1
`;

interface CostAuthorizationRow {
  requestKey: string;
  tenantId: number;
  aiAgentKey: string;
  periodStart: string;
  monthlyLimitMinorUnits: number;
  currency: string;
}

interface UsageRow {
  requestKey: string;
  tenantId: number;
  aiAgentKey: string;
  inputTokens: number;
  outputTokens: number;
  costMinorUnits: number;
  currency: string;
  withinLimit: number;
}

type AuditEventRow = AiRuntimeAuditEvent;

interface ConversationHandoffStateRow {
  status: string;
  assignedExternalUserId: string | null;
  version: number;
}

interface AiRuntimeRepositoryOptions {
  now?: () => Date;
}

export interface AiRuntimePersistence {
  costGate: AiCostGate;
  auditSink: AiRuntimeAuditSink;
}

function assertPositiveSafeInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${fieldName} must be a positive safe integer`,
    );
  }
}

function assertNonnegativeSafeInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a nonnegative safe integer`,
    );
  }
}

function assertCostAuthorizationRequest(
  request: AiCostAuthorizationRequest,
): void {
  assertPositiveSafeInteger(
    request.tenantId,
    "tenantId",
  );
  assertPositiveSafeInteger(
    request.monthlyLimitMinorUnits,
    "monthlyLimitMinorUnits",
  );

  if (
    !REQUEST_KEY_PATTERN.test(
      request.requestKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(
      request.aiAgentKey,
    ) ||
    !CURRENCY_PATTERN.test(request.currency)
  ) {
    throw new Error(
      "AI cost authorization request is invalid",
    );
  }
}

function assertCostUsageRequest(
  request: AiCostUsageRequest,
): void {
  assertPositiveSafeInteger(
    request.tenantId,
    "tenantId",
  );
  assertNonnegativeSafeInteger(
    request.usage.inputTokens,
    "inputTokens",
  );
  assertPositiveSafeInteger(
    request.usage.outputTokens,
    "outputTokens",
  );
  assertNonnegativeSafeInteger(
    request.usage.costMinorUnits,
    "costMinorUnits",
  );

  if (
    !REQUEST_KEY_PATTERN.test(
      request.requestKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(
      request.aiAgentKey,
    ) ||
    !CURRENCY_PATTERN.test(
      request.usage.currency,
    )
  ) {
    throw new Error(
      "AI cost usage request is invalid",
    );
  }
}

function assertAuditEvent(
  event: AiRuntimeAuditEvent,
): void {
  assertPositiveSafeInteger(
    event.tenantId,
    "tenantId",
  );
  assertPositiveSafeInteger(
    event.expectedConversationVersion,
    "expectedConversationVersion",
  );

  if (
    !AUDIT_KEY_PATTERN.test(event.auditKey) ||
    !REQUEST_KEY_PATTERN.test(
      event.requestKey,
    ) ||
    !CONVERSATION_KEY_PATTERN.test(
      event.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      event.inboundMessageKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(
      event.aiAgentKey,
    ) ||
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      event.aiAgentVersionKey,
    ) ||
    !aiResponseModes.includes(
      event.responseMode,
    ) ||
    !CURRENCY_PATTERN.test(event.currency) ||
    (event.outcome === "reply-planned" &&
      event.reason !== null) ||
    (event.outcome === "handoff" &&
      (event.reason === null ||
        !aiAgentFallbackReasons.includes(
          event.reason,
        ))) ||
    (event.groundingScoreBasisPoints !==
      null &&
      (!Number.isSafeInteger(
        event.groundingScoreBasisPoints,
      ) ||
        event.groundingScoreBasisPoints < 0 ||
        event.groundingScoreBasisPoints >
          10_000))
  ) {
    throw new Error(
      "AI runtime audit event is invalid",
    );
  }

  const usageValues = [
    event.inputTokens,
    event.outputTokens,
    event.costMinorUnits,
  ];
  const hasUsage = usageValues.every(
    (value) => value !== null,
  );
  const hasNoUsage = usageValues.every(
    (value) => value === null,
  );

  if (
    (!hasUsage && !hasNoUsage) ||
    (event.outcome === "reply-planned" &&
      (!hasUsage ||
        event.groundingScoreBasisPoints ===
          null))
  ) {
    throw new Error(
      "AI runtime audit usage is invalid",
    );
  }

  if (hasUsage) {
    assertNonnegativeSafeInteger(
      event.inputTokens as number,
      "inputTokens",
    );
    assertPositiveSafeInteger(
      event.outputTokens as number,
      "outputTokens",
    );
    assertNonnegativeSafeInteger(
      event.costMinorUnits as number,
      "costMinorUnits",
    );
  }
}

function periodStartUtc(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error(
      "AI runtime clock returned an invalid date",
    );
  }

  return `${now.toISOString().slice(0, 7)}-01`;
}

function authorizationMatches(
  row: CostAuthorizationRow,
  request: AiCostAuthorizationRequest,
  periodStart?: string,
): boolean {
  return (
    row.requestKey === request.requestKey &&
    row.tenantId === request.tenantId &&
    row.aiAgentKey === request.aiAgentKey &&
    PERIOD_START_PATTERN.test(
      row.periodStart,
    ) &&
    (periodStart === undefined ||
      row.periodStart === periodStart) &&
    Number.isSafeInteger(
      row.monthlyLimitMinorUnits,
    ) &&
    row.monthlyLimitMinorUnits ===
      request.monthlyLimitMinorUnits &&
    row.currency === request.currency
  );
}

function usageMatches(
  row: UsageRow,
  request: AiCostUsageRequest,
): boolean {
  return (
    row.requestKey === request.requestKey &&
    row.tenantId === request.tenantId &&
    row.aiAgentKey === request.aiAgentKey &&
    row.inputTokens ===
      request.usage.inputTokens &&
    row.outputTokens ===
      request.usage.outputTokens &&
    row.costMinorUnits ===
      request.usage.costMinorUnits &&
    row.currency === request.usage.currency &&
    (row.withinLimit === 0 ||
      row.withinLimit === 1)
  );
}

function auditMatches(
  row: AuditEventRow,
  event: AiRuntimeAuditEvent,
): boolean {
  return (
    row.auditKey === event.auditKey &&
    row.requestKey === event.requestKey &&
    row.tenantId === event.tenantId &&
    row.conversationKey ===
      event.conversationKey &&
    row.inboundMessageKey ===
      event.inboundMessageKey &&
    row.aiAgentKey === event.aiAgentKey &&
    row.aiAgentVersionKey ===
      event.aiAgentVersionKey &&
    row.expectedConversationVersion ===
      event.expectedConversationVersion &&
    row.outcome === event.outcome &&
    row.reason === event.reason &&
    row.responseMode ===
      event.responseMode &&
    row.groundingScoreBasisPoints ===
      event.groundingScoreBasisPoints &&
    row.inputTokens === event.inputTokens &&
    row.outputTokens === event.outputTokens &&
    row.costMinorUnits ===
      event.costMinorUnits &&
    row.currency === event.currency
  );
}

function batchSucceeded(
  results: readonly D1Result[],
): boolean {
  return (
    results.length === 2 &&
    results.every((result) => result.success)
  );
}

export function createAiRuntimePersistence(
  database: D1DatabaseBinding,
  options: AiRuntimeRepositoryOptions = {},
): AiRuntimePersistence {
  const now = options.now ?? (() => new Date());

  const costGate: AiCostGate = {
    async authorize(
      request,
    ): Promise<AiCostAuthorizationResult> {
      assertCostAuthorizationRequest(request);
      const existingAuthorization =
        await database
          .prepare(
            SELECT_COST_AUTHORIZATION_SQL,
          )
          .bind(
            request.tenantId,
            request.requestKey,
          )
          .first<CostAuthorizationRow>();

      if (existingAuthorization) {
        if (
          !authorizationMatches(
            existingAuthorization,
            request,
          )
        ) {
          throw new Error(
            "D1 returned a conflicting AI cost authorization",
          );
        }

        return { outcome: "authorized" };
      }

      const periodStart = periodStartUtc(now());

      const insertResult = await database
        .prepare(
          INSERT_COST_AUTHORIZATION_SQL,
        )
        .bind(
          request.requestKey,
          request.tenantId,
          request.aiAgentKey,
          periodStart,
          request.monthlyLimitMinorUnits,
          request.currency,
        )
        .run();

      if (!insertResult.success) {
        throw new Error(
          insertResult.error ??
            "D1 AI cost authorization failed",
        );
      }

      const authorization = await database
        .prepare(
          SELECT_COST_AUTHORIZATION_SQL,
        )
        .bind(
          request.tenantId,
          request.requestKey,
        )
        .first<CostAuthorizationRow>();

      if (authorization) {
        if (
          !authorizationMatches(
            authorization,
            request,
            periodStart,
          )
        ) {
          throw new Error(
            "D1 returned a conflicting AI cost authorization",
          );
        }

        return { outcome: "authorized" };
      }

      const activeAgent = await database
        .prepare(SELECT_ACTIVE_AGENT_SQL)
        .bind(
          request.tenantId,
          request.aiAgentKey,
        )
        .first<{ aiAgentKey: string }>();

      return activeAgent
        ? { outcome: "exhausted" }
        : { outcome: "unavailable" };
    },

    async recordUsage(
      request,
    ): Promise<AiCostUsageResult> {
      assertCostUsageRequest(request);

      const insertResult = await database
        .prepare(INSERT_USAGE_SQL)
        .bind(
          request.requestKey,
          request.tenantId,
          request.aiAgentKey,
          request.usage.inputTokens,
          request.usage.outputTokens,
          request.usage.costMinorUnits,
          request.usage.currency,
        )
        .run();

      if (!insertResult.success) {
        throw new Error(
          insertResult.error ??
            "D1 AI usage write failed",
        );
      }

      const usage = await database
        .prepare(SELECT_USAGE_SQL)
        .bind(
          request.tenantId,
          request.requestKey,
        )
        .first<UsageRow>();

      if (!usage) {
        return { outcome: "unavailable" };
      }

      if (!usageMatches(usage, request)) {
        throw new Error(
          "D1 returned conflicting AI usage",
        );
      }

      return {
        outcome: "recorded",
        withinLimit: usage.withinLimit === 1,
      };
    },
  };

  const auditSink: AiRuntimeAuditSink = {
    async record(event) {
      assertAuditEvent(event);

      const results = await database.batch([
        database
          .prepare(INSERT_AUDIT_EVENT_SQL)
          .bind(
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
          ),
        database
          .prepare(
            APPLY_AUDITED_HANDOFF_SQL,
          )
          .bind(
            event.tenantId,
            event.conversationKey,
            event.expectedConversationVersion,
            event.auditKey,
          ),
      ]);

      if (!batchSucceeded(results)) {
        throw new Error(
          "D1 AI runtime audit batch failed",
        );
      }

      const storedEvent = await database
        .prepare(SELECT_AUDIT_EVENT_SQL)
        .bind(event.tenantId, event.auditKey)
        .first<AuditEventRow>();

      if (
        !storedEvent ||
        !auditMatches(storedEvent, event)
      ) {
        return { outcome: "unavailable" };
      }

      if (event.outcome === "handoff") {
        const conversation = await database
          .prepare(
            SELECT_CONVERSATION_HANDOFF_STATE_SQL,
          )
          .bind(
            event.tenantId,
            event.conversationKey,
          )
          .first<ConversationHandoffStateRow>();

        if (
          !conversation ||
          conversation.status !==
            "waiting_for_agent" ||
          conversation.assignedExternalUserId !==
            null ||
          conversation.version !==
            event.expectedConversationVersion + 1
        ) {
          return { outcome: "unavailable" };
        }
      }

      return { outcome: "recorded" };
    },
  };

  return {
    costGate,
    auditSink,
  };
}
