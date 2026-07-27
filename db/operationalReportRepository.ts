import type {
  AiReportMetrics,
  AiUsageCurrencyMetrics,
  BotReportMetrics,
  CampaignReportMetrics,
  ConversationReportMetrics,
  MessageReportMetrics,
  OperationalReportSnapshot,
  OperationalReportWindow,
} from "../shared/domain/operationalReport.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const MAXIMUM_WINDOW_MILLISECONDS =
  366 * 24 * 60 * 60 * 1_000;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const CAMPAIGN_METRICS_SQL = `
  SELECT
    count(*) AS total,
    coalesce(sum(recipient_count), 0)
      AS recipientCount,
    coalesce(sum(
      CASE WHEN status = 'draft' THEN 1 ELSE 0 END
    ), 0) AS draft,
    coalesce(sum(
      CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END
    ), 0) AS scheduled,
    coalesce(sum(
      CASE WHEN status = 'running' THEN 1 ELSE 0 END
    ), 0) AS running,
    coalesce(sum(
      CASE WHEN status = 'paused' THEN 1 ELSE 0 END
    ), 0) AS paused,
    coalesce(sum(
      CASE WHEN status = 'completed' THEN 1 ELSE 0 END
    ), 0) AS completed,
    coalesce(sum(
      CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END
    ), 0) AS cancelled,
    coalesce(sum(
      CASE WHEN status = 'failed' THEN 1 ELSE 0 END
    ), 0) AS failed
  FROM campaigns
  WHERE tenant_id = ?1
    AND unixepoch(created_at) >= unixepoch(?2)
    AND unixepoch(created_at) < unixepoch(?3)
`;

const MESSAGE_METRICS_SQL = `
  SELECT
    count(*) AS total,
    coalesce(sum(
      CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END
    ), 0) AS inbound,
    coalesce(sum(
      CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END
    ), 0) AS outbound,
    coalesce(sum(
      CASE WHEN status = 'received' THEN 1 ELSE 0 END
    ), 0) AS received,
    coalesce(sum(
      CASE WHEN status = 'sent' THEN 1 ELSE 0 END
    ), 0) AS sent,
    coalesce(sum(
      CASE WHEN status = 'delivered' THEN 1 ELSE 0 END
    ), 0) AS delivered,
    coalesce(sum(
      CASE WHEN status = 'read' THEN 1 ELSE 0 END
    ), 0) AS read,
    coalesce(sum(
      CASE WHEN status = 'failed' THEN 1 ELSE 0 END
    ), 0) AS failed
  FROM messages
  WHERE tenant_id = ?1
    AND unixepoch(occurred_at) >= unixepoch(?2)
    AND unixepoch(occurred_at) < unixepoch(?3)
`;

const CONVERSATION_METRICS_SQL = `
  SELECT
    count(*) AS active,
    coalesce(sum(unread_count), 0)
      AS unreadCount,
    coalesce(sum(
      CASE WHEN status = 'new' THEN 1 ELSE 0 END
    ), 0) AS newCount,
    coalesce(sum(
      CASE WHEN status = 'bot_active' THEN 1 ELSE 0 END
    ), 0) AS botActive,
    coalesce(sum(
      CASE WHEN status = 'waiting_for_agent' THEN 1 ELSE 0 END
    ), 0) AS waitingForAgent,
    coalesce(sum(
      CASE WHEN status = 'agent_active' THEN 1 ELSE 0 END
    ), 0) AS agentActive,
    coalesce(sum(
      CASE WHEN status = 'waiting_for_contact' THEN 1 ELSE 0 END
    ), 0) AS waitingForContact,
    coalesce(sum(
      CASE WHEN status = 'closed' THEN 1 ELSE 0 END
    ), 0) AS closed
  FROM conversations
  WHERE tenant_id = ?1
    AND last_message_at IS NOT NULL
    AND unixepoch(last_message_at) >= unixepoch(?2)
    AND unixepoch(last_message_at) < unixepoch(?3)
`;

const BOT_METRICS_SQL = `
  SELECT
    count(*) AS total,
    coalesce(sum(
      CASE WHEN status = 'pending' THEN 1 ELSE 0 END
    ), 0) AS pending,
    coalesce(sum(
      CASE WHEN status = 'sending' THEN 1 ELSE 0 END
    ), 0) AS sending,
    coalesce(sum(
      CASE WHEN status = 'accepted' THEN 1 ELSE 0 END
    ), 0) AS accepted,
    coalesce(sum(
      CASE WHEN status = 'rejected' THEN 1 ELSE 0 END
    ), 0) AS rejected,
    coalesce(sum(
      CASE WHEN status = 'ambiguous' THEN 1 ELSE 0 END
    ), 0) AS ambiguous
  FROM bot_reply_deliveries
  WHERE tenant_id = ?1
    AND unixepoch(created_at) >= unixepoch(?2)
    AND unixepoch(created_at) < unixepoch(?3)
`;

const AI_METRICS_SQL = `
  SELECT
    count(*) AS totalTurns,
    coalesce(sum(
      CASE WHEN outcome = 'reply-planned' THEN 1 ELSE 0 END
    ), 0) AS replyPlanned,
    coalesce(sum(
      CASE WHEN outcome = 'handoff' THEN 1 ELSE 0 END
    ), 0) AS handoff
  FROM ai_runtime_audit_events
  WHERE tenant_id = ?1
    AND unixepoch(created_at) >= unixepoch(?2)
    AND unixepoch(created_at) < unixepoch(?3)
`;

const AI_USAGE_METRICS_SQL = `
  SELECT
    currency,
    count(*) AS requestCount,
    coalesce(sum(input_tokens), 0)
      AS inputTokens,
    coalesce(sum(output_tokens), 0)
      AS outputTokens,
    coalesce(sum(cost_minor_units), 0)
      AS costMinorUnits
  FROM ai_runtime_usage
  WHERE tenant_id = ?1
    AND unixepoch(created_at) >= unixepoch(?2)
    AND unixepoch(created_at) < unixepoch(?3)
  GROUP BY currency
  ORDER BY currency ASC
`;

type AggregateRow =
  Record<string, unknown>;

function canonicalTimestamp(
  value: unknown,
): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    )
  ) {
    return false;
  }

  const milliseconds = Date.parse(value);

  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() ===
      value
  );
}

function validateWindow(
  window: OperationalReportWindow,
): OperationalReportWindow {
  if (
    typeof window !== "object" ||
    window === null ||
    !canonicalTimestamp(window.startAt) ||
    !canonicalTimestamp(window.endAt)
  ) {
    throw new Error(
      "report window is invalid",
    );
  }

  const start = Date.parse(window.startAt);
  const end = Date.parse(window.endAt);

  if (
    start >= end ||
    end - start >
      MAXIMUM_WINDOW_MILLISECONDS
  ) {
    throw new Error(
      "report window is invalid",
    );
  }

  return {
    startAt: window.startAt,
    endAt: window.endAt,
  };
}

function count(
  row: AggregateRow,
  key: string,
): number {
  const value = row[key];

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "D1 returned invalid report metrics",
    );
  }

  return value;
}

async function aggregate(
  database: D1DatabaseBinding,
  sql: string,
  tenantId: number,
  window: OperationalReportWindow,
): Promise<AggregateRow> {
  const row = await database
    .prepare(sql)
    .bind(
      tenantId,
      window.startAt,
      window.endAt,
    )
    .first<AggregateRow>();

  if (!row) {
    throw new Error(
      "D1 did not return report metrics",
    );
  }

  return row;
}

function campaignMetrics(
  row: AggregateRow,
): CampaignReportMetrics {
  const metrics = {
    total: count(row, "total"),
    recipientCount: count(
      row,
      "recipientCount",
    ),
    draft: count(row, "draft"),
    scheduled: count(row, "scheduled"),
    running: count(row, "running"),
    paused: count(row, "paused"),
    completed: count(row, "completed"),
    cancelled: count(row, "cancelled"),
    failed: count(row, "failed"),
  };

  if (
    metrics.total !==
    metrics.draft +
      metrics.scheduled +
      metrics.running +
      metrics.paused +
      metrics.completed +
      metrics.cancelled +
      metrics.failed
  ) {
    throw new Error(
      "D1 returned inconsistent campaign metrics",
    );
  }

  return metrics;
}

function messageMetrics(
  row: AggregateRow,
): MessageReportMetrics {
  const metrics = {
    total: count(row, "total"),
    inbound: count(row, "inbound"),
    outbound: count(row, "outbound"),
    received: count(row, "received"),
    sent: count(row, "sent"),
    delivered: count(row, "delivered"),
    read: count(row, "read"),
    failed: count(row, "failed"),
  };

  if (
    metrics.total !==
      metrics.inbound + metrics.outbound ||
    metrics.total !==
      metrics.received +
        metrics.sent +
        metrics.delivered +
        metrics.read +
        metrics.failed
  ) {
    throw new Error(
      "D1 returned inconsistent message metrics",
    );
  }

  return metrics;
}

function conversationMetrics(
  row: AggregateRow,
): ConversationReportMetrics {
  const metrics = {
    active: count(row, "active"),
    unreadCount: count(
      row,
      "unreadCount",
    ),
    new: count(row, "newCount"),
    botActive: count(row, "botActive"),
    waitingForAgent: count(
      row,
      "waitingForAgent",
    ),
    agentActive: count(
      row,
      "agentActive",
    ),
    waitingForContact: count(
      row,
      "waitingForContact",
    ),
    closed: count(row, "closed"),
  };

  if (
    metrics.active !==
    metrics.new +
      metrics.botActive +
      metrics.waitingForAgent +
      metrics.agentActive +
      metrics.waitingForContact +
      metrics.closed
  ) {
    throw new Error(
      "D1 returned inconsistent conversation metrics",
    );
  }

  return metrics;
}

function botMetrics(
  row: AggregateRow,
): BotReportMetrics {
  const metrics = {
    total: count(row, "total"),
    pending: count(row, "pending"),
    sending: count(row, "sending"),
    accepted: count(row, "accepted"),
    rejected: count(row, "rejected"),
    ambiguous: count(row, "ambiguous"),
  };

  if (
    metrics.total !==
    metrics.pending +
      metrics.sending +
      metrics.accepted +
      metrics.rejected +
      metrics.ambiguous
  ) {
    throw new Error(
      "D1 returned inconsistent bot metrics",
    );
  }

  return metrics;
}

function aiMetrics(
  row: AggregateRow,
): AiReportMetrics {
  const metrics = {
    totalTurns: count(row, "totalTurns"),
    replyPlanned: count(
      row,
      "replyPlanned",
    ),
    handoff: count(row, "handoff"),
  };

  if (
    metrics.totalTurns !==
    metrics.replyPlanned + metrics.handoff
  ) {
    throw new Error(
      "D1 returned inconsistent AI metrics",
    );
  }

  return metrics;
}

function usageMetrics(
  rows: readonly AggregateRow[],
): readonly AiUsageCurrencyMetrics[] {
  const currencies = new Set<string>();
  let previousCurrency: string | null =
    null;

  return rows.map((row) => {
    const currency = row.currency;

    if (
      typeof currency !== "string" ||
      !CURRENCY_PATTERN.test(currency) ||
      currencies.has(currency) ||
      (previousCurrency !== null &&
        currency <= previousCurrency)
    ) {
      throw new Error(
        "D1 returned invalid AI usage metrics",
      );
    }

    currencies.add(currency);
    previousCurrency = currency;

    return {
      currency,
      requestCount: count(
        row,
        "requestCount",
      ),
      inputTokens: count(
        row,
        "inputTokens",
      ),
      outputTokens: count(
        row,
        "outputTokens",
      ),
      costMinorUnits: count(
        row,
        "costMinorUnits",
      ),
    };
  });
}

export interface OperationalReportRepository {
  read(
    tenantId: number,
    window: OperationalReportWindow,
  ): Promise<OperationalReportSnapshot>;
}

export function createOperationalReportRepository(
  database: D1DatabaseBinding,
  options: {
    now(): Date;
  } = {
    now: () => new Date(),
  },
): OperationalReportRepository {
  return {
    async read(tenantId, requestedWindow) {
      if (
        !Number.isSafeInteger(tenantId) ||
        tenantId <= 0
      ) {
        throw new Error(
          "tenantId must be a positive safe integer",
        );
      }

      const window =
        validateWindow(requestedWindow);
      const generatedAtDate = options.now();

      if (
        !(generatedAtDate instanceof Date) ||
        !Number.isFinite(
          generatedAtDate.getTime(),
        )
      ) {
        throw new Error(
          "report clock is invalid",
        );
      }

      const [
        campaigns,
        messages,
        conversations,
        bot,
        ai,
        aiUsageResult,
      ] = await Promise.all([
        aggregate(
          database,
          CAMPAIGN_METRICS_SQL,
          tenantId,
          window,
        ),
        aggregate(
          database,
          MESSAGE_METRICS_SQL,
          tenantId,
          window,
        ),
        aggregate(
          database,
          CONVERSATION_METRICS_SQL,
          tenantId,
          window,
        ),
        aggregate(
          database,
          BOT_METRICS_SQL,
          tenantId,
          window,
        ),
        aggregate(
          database,
          AI_METRICS_SQL,
          tenantId,
          window,
        ),
        database
          .prepare(AI_USAGE_METRICS_SQL)
          .bind(
            tenantId,
            window.startAt,
            window.endAt,
          )
          .all<AggregateRow>(),
      ]);

      if (!aiUsageResult.success) {
        throw new Error(
          "D1 AI usage report failed",
        );
      }

      return {
        window,
        generatedAt:
          generatedAtDate.toISOString(),
        campaigns:
          campaignMetrics(campaigns),
        messages:
          messageMetrics(messages),
        conversations:
          conversationMetrics(
            conversations,
          ),
        bot: botMetrics(bot),
        ai: aiMetrics(ai),
        aiUsage: usageMetrics(
          aiUsageResult.results ?? [],
        ),
      };
    },
  };
}
