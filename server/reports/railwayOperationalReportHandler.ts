import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";
import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import type {
  LoadOperationalReportActionResult,
} from "./operationalReportActionResult.ts";
import {
  createDefaultOperationalReportPeriod,
  OperationalReportInputError,
  validateOperationalReportInput,
  type OperationalReportPeriod,
} from "./operationalReportService.ts";

const operationId = "reports.read";
const reportKeys = Object.freeze([
  "ai",
  "aiUsage",
  "bot",
  "campaigns",
  "conversations",
  "generatedAt",
  "messages",
  "period",
]);
const periodKeys = Object.freeze(["endDate", "startDate"]);
const campaignKeys = Object.freeze([
  "cancelled",
  "completed",
  "draft",
  "failed",
  "paused",
  "recipientCount",
  "running",
  "scheduled",
  "total",
]);
const messageKeys = Object.freeze([
  "delivered",
  "failed",
  "inbound",
  "outbound",
  "read",
  "received",
  "sent",
  "total",
]);
const conversationKeys = Object.freeze([
  "active",
  "agentActive",
  "botActive",
  "closed",
  "new",
  "unreadCount",
  "waitingForAgent",
  "waitingForContact",
]);
const botKeys = Object.freeze([
  "accepted",
  "ambiguous",
  "pending",
  "rejected",
  "sending",
  "total",
]);
const aiKeys = Object.freeze([
  "handoff",
  "replyPlanned",
  "totalTurns",
]);
const usageKeys = Object.freeze([
  "costMinorUnits",
  "currency",
  "inputTokens",
  "outputTokens",
  "requestCount",
]);
const currencyPattern = /^[A-Z]{3}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type RailwayCurrentOperationalReportResult =
  | Readonly<{
      status: "ready";
      report: Readonly<OperationalReportView>;
    }>
  | Readonly<{
      status: Exclude<OperationalReportStatus, "ready">;
      report: null;
    }>;

export interface RailwayOperationalReportHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () =>
    RailwayApiClientConfigurationState;
  readonly resolveIdentity: () =>
    Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
  readonly now?: () => Date;
}

export interface RailwayOperationalReportHandler {
  readonly read: () => Promise<RailwayCurrentOperationalReportResult>;
  readonly load: (
    input: unknown,
  ) => Promise<LoadOperationalReportActionResult>;
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const actualKeys = Object.keys(value).sort();

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key, index) => key === keys[index])
  );
}

function normalizeInput(input: unknown): OperationalReportPeriod {
  if (
    !isExactRecord(input, periodKeys) ||
    typeof input.startDate !== "string" ||
    typeof input.endDate !== "string"
  ) {
    throw new OperationalReportInputError();
  }

  validateOperationalReportInput(input);

  return Object.freeze({
    startDate: input.startDate,
    endDate: input.endDate,
  });
}

function parseCountRecord(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, number>> | null {
  if (!isExactRecord(value, keys)) {
    return null;
  }

  const parsed: Record<string, number> = {};

  for (const key of keys) {
    const count = value[key];

    if (!Number.isSafeInteger(count) || Number(count) < 0) {
      return null;
    }

    parsed[key] = Number(count);
  }

  return Object.freeze(parsed);
}

function hasSum(
  total: number,
  parts: readonly number[],
): boolean {
  return total === parts.reduce((sum, value) => sum + value, 0);
}

function parseGeneratedAt(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value)
  ) {
    return null;
  }

  const milliseconds = Date.parse(value);

  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? value
    : null;
}

function parseUsage(value: unknown) {
  if (!Array.isArray(value) || value.length > 256) {
    return null;
  }

  let previousCurrency: string | null = null;
  const usage = [];

  for (const item of value) {
    if (!isExactRecord(item, usageKeys)) {
      return null;
    }

    const counts = parseCountRecord(
      {
        costMinorUnits: item.costMinorUnits,
        inputTokens: item.inputTokens,
        outputTokens: item.outputTokens,
        requestCount: item.requestCount,
      },
      [
        "costMinorUnits",
        "inputTokens",
        "outputTokens",
        "requestCount",
      ],
    );

    if (
      counts === null ||
      typeof item.currency !== "string" ||
      !currencyPattern.test(item.currency) ||
      (previousCurrency !== null && item.currency <= previousCurrency)
    ) {
      return null;
    }

    previousCurrency = item.currency;
    usage.push(Object.freeze({
      currency: item.currency,
      requestCount: counts.requestCount,
      inputTokens: counts.inputTokens,
      outputTokens: counts.outputTokens,
      costMinorUnits: counts.costMinorUnits,
    }));
  }

  return Object.freeze(usage);
}

function parseSuccess(
  data: unknown,
  input: Readonly<OperationalReportPeriod>,
): Readonly<OperationalReportView> | null {
  if (
    !isExactRecord(data, reportKeys) ||
    !isExactRecord(data.period, periodKeys) ||
    data.period.startDate !== input.startDate ||
    data.period.endDate !== input.endDate
  ) {
    return null;
  }

  const generatedAt = parseGeneratedAt(data.generatedAt);
  const campaigns = parseCountRecord(data.campaigns, campaignKeys);
  const messages = parseCountRecord(data.messages, messageKeys);
  const conversations = parseCountRecord(
    data.conversations,
    conversationKeys,
  );
  const bot = parseCountRecord(data.bot, botKeys);
  const ai = parseCountRecord(data.ai, aiKeys);
  const aiUsage = parseUsage(data.aiUsage);

  if (
    generatedAt === null ||
    campaigns === null ||
    messages === null ||
    conversations === null ||
    bot === null ||
    ai === null ||
    aiUsage === null ||
    !hasSum(campaigns.total, [
      campaigns.draft,
      campaigns.scheduled,
      campaigns.running,
      campaigns.paused,
      campaigns.completed,
      campaigns.cancelled,
      campaigns.failed,
    ]) ||
    !hasSum(messages.total, [messages.inbound, messages.outbound]) ||
    !hasSum(messages.total, [
      messages.received,
      messages.sent,
      messages.delivered,
      messages.read,
      messages.failed,
    ]) ||
    !hasSum(conversations.active, [
      conversations.new,
      conversations.botActive,
      conversations.waitingForAgent,
      conversations.agentActive,
      conversations.waitingForContact,
      conversations.closed,
    ]) ||
    !hasSum(bot.total, [
      bot.pending,
      bot.sending,
      bot.accepted,
      bot.rejected,
      bot.ambiguous,
    ]) ||
    !hasSum(ai.totalTurns, [ai.replyPlanned, ai.handoff])
  ) {
    return null;
  }

  return Object.freeze({
    period: Object.freeze({ ...input }),
    generatedAt,
    campaigns: Object.freeze({
      total: campaigns.total,
      recipientCount: campaigns.recipientCount,
      draft: campaigns.draft,
      scheduled: campaigns.scheduled,
      running: campaigns.running,
      paused: campaigns.paused,
      completed: campaigns.completed,
      cancelled: campaigns.cancelled,
      failed: campaigns.failed,
    }),
    messages: Object.freeze({
      total: messages.total,
      inbound: messages.inbound,
      outbound: messages.outbound,
      received: messages.received,
      sent: messages.sent,
      delivered: messages.delivered,
      read: messages.read,
      failed: messages.failed,
    }),
    conversations: Object.freeze({
      active: conversations.active,
      unreadCount: conversations.unreadCount,
      new: conversations.new,
      botActive: conversations.botActive,
      waitingForAgent: conversations.waitingForAgent,
      agentActive: conversations.agentActive,
      waitingForContact: conversations.waitingForContact,
      closed: conversations.closed,
    }),
    bot: Object.freeze({
      total: bot.total,
      pending: bot.pending,
      sending: bot.sending,
      accepted: bot.accepted,
      rejected: bot.rejected,
      ambiguous: bot.ambiguous,
    }),
    ai: Object.freeze({
      totalTurns: ai.totalTurns,
      replyPlanned: ai.replyPlanned,
      handoff: ai.handoff,
    }),
    aiUsage,
  });
}

function mapFailure(code: string): LoadOperationalReportActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<RailwayOperationalReportHandlerDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object"
  ) {
    throw new Error("Railway operational report dependencies are invalid");
  }

  const keys = Object.keys(dependencies).sort();

  if (
    keys.some((key) =>
      ![
        "applicationConfigured",
        "createClient",
        "inspectConfiguration",
        "now",
        "resolveIdentity",
      ].includes(key),
    ) ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function" ||
    (dependencies.now !== undefined &&
      typeof dependencies.now !== "function")
  ) {
    throw new Error("Railway operational report dependencies are invalid");
  }
}

export function createRailwayOperationalReportHandler(
  dependencies: Readonly<RailwayOperationalReportHandlerDependencies>,
): Readonly<RailwayOperationalReportHandler> {
  requireDependencies(dependencies);

  async function load(
    input: unknown,
  ): Promise<LoadOperationalReportActionResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }

    const configurationState = dependencies.inspectConfiguration();

    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
    }

    let period: OperationalReportPeriod;

    try {
      period = normalizeInput(input);
    } catch (error) {
      return error instanceof OperationalReportInputError
        ? { status: "invalid-input" }
        : { status: "server-error" };
    }

    let identityState: RailwayApiServerIdentityState;

    try {
      identityState = await dependencies.resolveIdentity();
    } catch {
      return { status: "server-error" };
    }

    if (identityState.status === "unauthenticated") {
      return { status: "unauthenticated" };
    }

    if (identityState.status !== "authenticated") {
      return { status: "server-error" };
    }

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation: operationId,
      requestKind: "query",
      idempotencyKey: null,
      payload: Object.freeze({ ...period }),
    } satisfies RailwayApiRequestEnvelope);

    try {
      const client = dependencies.createClient({
        ...configurationState.configuration,
        oidcToken: identityState.oidcToken,
        userSessionToken: identityState.userSessionToken,
      });
      const response = await client.call(request);

      if (response.outcome === "error") {
        return mapFailure(response.code);
      }

      const report = parseSuccess(response.data, period);

      return report === null
        ? { status: "server-error" }
        : Object.freeze({ status: "loaded", report });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    load,
    async read(): Promise<RailwayCurrentOperationalReportResult> {
      let period: OperationalReportPeriod;

      try {
        period = createDefaultOperationalReportPeriod(
          dependencies.now,
        );
      } catch {
        return { status: "server-error", report: null };
      }

      const result = await load(period);

      return result.status === "loaded"
        ? Object.freeze({ status: "ready", report: result.report })
        : Object.freeze({
            status:
              result.status === "invalid-input"
                ? "server-error"
                : result.status,
            report: null,
          });
    },
  });
}
