import type {
  OperationalReportRepository,
} from "../../db/operationalReportRepository.ts";
import type {
  AiUsageCurrencyMetrics,
  OperationalReportSnapshot,
  OperationalReportWindow,
} from "../../shared/domain/operationalReport.ts";
import {
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumWindowMilliseconds =
  366 * 24 * 60 * 60 * 1_000;
const currencyPattern = /^[A-Z]{3}$/;

const reportRowKeys = Object.freeze([
  "campaignTotal",
  "campaignRecipientCount",
  "campaignDraft",
  "campaignScheduled",
  "campaignRunning",
  "campaignPaused",
  "campaignCompleted",
  "campaignCancelled",
  "campaignFailed",
  "messageTotal",
  "messageInbound",
  "messageOutbound",
  "messageReceived",
  "messageSent",
  "messageDelivered",
  "messageRead",
  "messageFailed",
  "conversationActive",
  "conversationUnreadCount",
  "conversationNew",
  "conversationBotActive",
  "conversationWaitingForAgent",
  "conversationAgentActive",
  "conversationWaitingForContact",
  "conversationClosed",
  "botTotal",
  "botPending",
  "botSending",
  "botAccepted",
  "botRejected",
  "botAmbiguous",
  "aiTotalTurns",
  "aiReplyPlanned",
  "aiHandoff",
  "aiUsage",
]);

const usageRowKeys = Object.freeze([
  "currency",
  "requestCount",
  "inputTokens",
  "outputTokens",
  "costMinorUnits",
]);

export const postgresOperationalReportSql = `
  WITH campaign_metrics AS (
    SELECT
      count(*)::text AS total,
      coalesce(sum(recipient_count), 0)::text AS recipient_count,
      count(*) FILTER (WHERE status = 'draft')::text AS draft,
      count(*) FILTER (WHERE status = 'scheduled')::text AS scheduled,
      count(*) FILTER (WHERE status = 'running')::text AS running,
      count(*) FILTER (WHERE status = 'paused')::text AS paused,
      count(*) FILTER (WHERE status = 'completed')::text AS completed,
      count(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
      count(*) FILTER (WHERE status = 'failed')::text AS failed
    FROM campaigns
    WHERE tenant_id = $1
      AND created_at >= $2::timestamptz
      AND created_at < $3::timestamptz
  ),
  message_metrics AS (
    SELECT
      count(*)::text AS total,
      count(*) FILTER (WHERE direction = 'inbound')::text AS inbound,
      count(*) FILTER (WHERE direction = 'outbound')::text AS outbound,
      count(*) FILTER (WHERE status = 'received')::text AS received,
      count(*) FILTER (WHERE status = 'sent')::text AS sent,
      count(*) FILTER (WHERE status = 'delivered')::text AS delivered,
      count(*) FILTER (WHERE status = 'read')::text AS read,
      count(*) FILTER (WHERE status = 'failed')::text AS failed
    FROM messages
    WHERE tenant_id = $1
      AND occurred_at >= $2::timestamptz
      AND occurred_at < $3::timestamptz
  ),
  conversation_metrics AS (
    SELECT
      count(*)::text AS active,
      coalesce(sum(unread_count), 0)::text AS unread_count,
      count(*) FILTER (WHERE status = 'new')::text AS new_count,
      count(*) FILTER (WHERE status = 'bot_active')::text AS bot_active,
      count(*) FILTER (
        WHERE status = 'waiting_for_agent'
      )::text AS waiting_for_agent,
      count(*) FILTER (WHERE status = 'agent_active')::text AS agent_active,
      count(*) FILTER (
        WHERE status = 'waiting_for_contact'
      )::text AS waiting_for_contact,
      count(*) FILTER (WHERE status = 'closed')::text AS closed
    FROM conversations
    WHERE tenant_id = $1
      AND last_message_at IS NOT NULL
      AND last_message_at >= $2::timestamptz
      AND last_message_at < $3::timestamptz
  ),
  bot_metrics AS (
    SELECT
      count(*)::text AS total,
      count(*) FILTER (WHERE status = 'pending')::text AS pending,
      count(*) FILTER (WHERE status = 'sending')::text AS sending,
      count(*) FILTER (WHERE status = 'accepted')::text AS accepted,
      count(*) FILTER (WHERE status = 'rejected')::text AS rejected,
      count(*) FILTER (WHERE status = 'ambiguous')::text AS ambiguous
    FROM bot_reply_deliveries
    WHERE tenant_id = $1
      AND created_at >= $2::timestamptz
      AND created_at < $3::timestamptz
  ),
  ai_metrics AS (
    SELECT
      count(*)::text AS total_turns,
      count(*) FILTER (
        WHERE outcome = 'reply-planned'
      )::text AS reply_planned,
      count(*) FILTER (WHERE outcome = 'handoff')::text AS handoff
    FROM ai_runtime_audit_events
    WHERE tenant_id = $1
      AND created_at >= $2::timestamptz
      AND created_at < $3::timestamptz
  ),
  ai_usage_metrics AS (
    SELECT
      currency,
      count(*)::text AS request_count,
      coalesce(sum(input_tokens), 0)::text AS input_tokens,
      coalesce(sum(output_tokens), 0)::text AS output_tokens,
      coalesce(sum(cost_minor_units), 0)::text AS cost_minor_units
    FROM ai_runtime_usage
    WHERE tenant_id = $1
      AND created_at >= $2::timestamptz
      AND created_at < $3::timestamptz
    GROUP BY currency
  ),
  ai_usage_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency', currency,
          'requestCount', request_count,
          'inputTokens', input_tokens,
          'outputTokens', output_tokens,
          'costMinorUnits', cost_minor_units
        )
        ORDER BY currency ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM ai_usage_metrics
  )
  SELECT
    campaign.total AS "campaignTotal",
    campaign.recipient_count AS "campaignRecipientCount",
    campaign.draft AS "campaignDraft",
    campaign.scheduled AS "campaignScheduled",
    campaign.running AS "campaignRunning",
    campaign.paused AS "campaignPaused",
    campaign.completed AS "campaignCompleted",
    campaign.cancelled AS "campaignCancelled",
    campaign.failed AS "campaignFailed",
    message.total AS "messageTotal",
    message.inbound AS "messageInbound",
    message.outbound AS "messageOutbound",
    message.received AS "messageReceived",
    message.sent AS "messageSent",
    message.delivered AS "messageDelivered",
    message.read AS "messageRead",
    message.failed AS "messageFailed",
    conversation.active AS "conversationActive",
    conversation.unread_count AS "conversationUnreadCount",
    conversation.new_count AS "conversationNew",
    conversation.bot_active AS "conversationBotActive",
    conversation.waiting_for_agent AS "conversationWaitingForAgent",
    conversation.agent_active AS "conversationAgentActive",
    conversation.waiting_for_contact AS "conversationWaitingForContact",
    conversation.closed AS "conversationClosed",
    bot.total AS "botTotal",
    bot.pending AS "botPending",
    bot.sending AS "botSending",
    bot.accepted AS "botAccepted",
    bot.rejected AS "botRejected",
    bot.ambiguous AS "botAmbiguous",
    ai.total_turns AS "aiTotalTurns",
    ai.reply_planned AS "aiReplyPlanned",
    ai.handoff AS "aiHandoff",
    usage.value AS "aiUsage"
  FROM campaign_metrics AS campaign
  CROSS JOIN message_metrics AS message
  CROSS JOIN conversation_metrics AS conversation
  CROSS JOIN bot_metrics AS bot
  CROSS JOIN ai_metrics AS ai
  CROSS JOIN ai_usage_json AS usage
`;

function canonicalTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function validateWindow(
  window: Readonly<OperationalReportWindow>,
): OperationalReportWindow {
  if (
    !window ||
    typeof window !== "object" ||
    !canonicalTimestamp(window.startAt) ||
    !canonicalTimestamp(window.endAt)
  ) {
    throw new Error("PostgreSQL report window is invalid");
  }

  const start = Date.parse(window.startAt);
  const end = Date.parse(window.endAt);
  if (start >= end || end - start > maximumWindowMilliseconds) {
    throw new Error("PostgreSQL report window is invalid");
  }

  return Object.freeze({
    startAt: window.startAt,
    endAt: window.endAt,
  });
}

function parseCount(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("PostgreSQL returned invalid report metrics");
  }

  return Number(normalized);
}

function parseUsage(value: unknown): readonly AiUsageCurrencyMetrics[] {
  if (!Array.isArray(value)) {
    throw new Error("PostgreSQL returned invalid AI usage metrics");
  }

  let previousCurrency: string | null = null;
  const rows = value.map((item) => {
    const row = requireExactPostgresRow(item, usageRowKeys);
    const currency = row.currency;
    if (
      typeof currency !== "string" ||
      !currencyPattern.test(currency) ||
      (previousCurrency !== null && currency <= previousCurrency)
    ) {
      throw new Error("PostgreSQL returned invalid AI usage metrics");
    }

    previousCurrency = currency;
    return Object.freeze({
      currency,
      requestCount: parseCount(row.requestCount),
      inputTokens: parseCount(row.inputTokens),
      outputTokens: parseCount(row.outputTokens),
      costMinorUnits: parseCount(row.costMinorUnits),
    });
  });

  return Object.freeze(rows);
}

function requireSum(
  total: number,
  parts: readonly number[],
  metric: string,
): void {
  if (total !== parts.reduce((sum, value) => sum + value, 0)) {
    throw new Error(`PostgreSQL returned inconsistent ${metric} metrics`);
  }
}

function parseSnapshot(
  value: unknown,
  window: OperationalReportWindow,
  generatedAt: string,
): Readonly<OperationalReportSnapshot> {
  const row = requireExactPostgresRow(value, reportRowKeys);
  const campaigns = Object.freeze({
    total: parseCount(row.campaignTotal),
    recipientCount: parseCount(row.campaignRecipientCount),
    draft: parseCount(row.campaignDraft),
    scheduled: parseCount(row.campaignScheduled),
    running: parseCount(row.campaignRunning),
    paused: parseCount(row.campaignPaused),
    completed: parseCount(row.campaignCompleted),
    cancelled: parseCount(row.campaignCancelled),
    failed: parseCount(row.campaignFailed),
  });
  requireSum(campaigns.total, [
    campaigns.draft,
    campaigns.scheduled,
    campaigns.running,
    campaigns.paused,
    campaigns.completed,
    campaigns.cancelled,
    campaigns.failed,
  ], "campaign");

  const messages = Object.freeze({
    total: parseCount(row.messageTotal),
    inbound: parseCount(row.messageInbound),
    outbound: parseCount(row.messageOutbound),
    received: parseCount(row.messageReceived),
    sent: parseCount(row.messageSent),
    delivered: parseCount(row.messageDelivered),
    read: parseCount(row.messageRead),
    failed: parseCount(row.messageFailed),
  });
  requireSum(messages.total, [messages.inbound, messages.outbound], "message");
  requireSum(messages.total, [
    messages.received,
    messages.sent,
    messages.delivered,
    messages.read,
    messages.failed,
  ], "message");

  const conversations = Object.freeze({
    active: parseCount(row.conversationActive),
    unreadCount: parseCount(row.conversationUnreadCount),
    new: parseCount(row.conversationNew),
    botActive: parseCount(row.conversationBotActive),
    waitingForAgent: parseCount(row.conversationWaitingForAgent),
    agentActive: parseCount(row.conversationAgentActive),
    waitingForContact: parseCount(row.conversationWaitingForContact),
    closed: parseCount(row.conversationClosed),
  });
  requireSum(conversations.active, [
    conversations.new,
    conversations.botActive,
    conversations.waitingForAgent,
    conversations.agentActive,
    conversations.waitingForContact,
    conversations.closed,
  ], "conversation");

  const bot = Object.freeze({
    total: parseCount(row.botTotal),
    pending: parseCount(row.botPending),
    sending: parseCount(row.botSending),
    accepted: parseCount(row.botAccepted),
    rejected: parseCount(row.botRejected),
    ambiguous: parseCount(row.botAmbiguous),
  });
  requireSum(bot.total, [
    bot.pending,
    bot.sending,
    bot.accepted,
    bot.rejected,
    bot.ambiguous,
  ], "bot");

  const ai = Object.freeze({
    totalTurns: parseCount(row.aiTotalTurns),
    replyPlanned: parseCount(row.aiReplyPlanned),
    handoff: parseCount(row.aiHandoff),
  });
  requireSum(ai.totalTurns, [ai.replyPlanned, ai.handoff], "AI");

  return Object.freeze({
    window,
    generatedAt,
    campaigns,
    messages,
    conversations,
    bot,
    ai,
    aiUsage: parseUsage(row.aiUsage),
  });
}

export function createPostgresOperationalReportRepository(
  queries: PostgresQueryExecutor,
  options: Readonly<{ now(): Date }> = { now: () => new Date() },
): OperationalReportRepository {
  if (
    typeof queries?.query !== "function" ||
    !options ||
    typeof options !== "object" ||
    Object.keys(options).length !== 1 ||
    typeof options.now !== "function"
  ) {
    throw new Error("PostgreSQL report dependencies are invalid");
  }

  return Object.freeze({
    async read(
      tenantId: number,
      requestedWindow: OperationalReportWindow,
    ) {
      if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
        throw new Error("tenantId must be a positive safe integer");
      }

      const window = validateWindow(requestedWindow);
      const generatedAtDate = options.now();
      if (
        !(generatedAtDate instanceof Date) ||
        !Number.isFinite(generatedAtDate.getTime())
      ) {
        throw new Error("PostgreSQL report clock is invalid");
      }

      const result = await queries.query<Record<string, unknown>>(
        postgresOperationalReportSql,
        [tenantId, window.startAt, window.endAt],
      );
      const [row] = requirePostgresRows(result, 1);
      if (!row || result.rowCount !== 1) {
        throw new Error("PostgreSQL did not return report metrics");
      }

      return parseSnapshot(row, window, generatedAtDate.toISOString());
    },
  });
}
