export type OperationalQueueKind =
  | "meta-webhook"
  | "bot-reply"
  | "campaign-delivery"
  | "message-template-submission"
  | "team-invitation";

export type DeliveryAttemptTelemetryOutcome =
  | "accepted"
  | "submitted"
  | "rejected"
  | "blocked"
  | "ambiguous"
  | "deferred"
  | "duplicate"
  | "cancelled"
  | "not-found"
  | "failed";

export type ProviderRequestTelemetryOperation =
  | "campaign-message.send"
  | "bot-reply.send"
  | "message-template.submit"
  | "message-template.list"
  | "organization-invitation.list"
  | "organization-invitation.create";

export interface ProviderRequestTelemetry {
  readonly provider: "meta" | "clerk";
  readonly operation: ProviderRequestTelemetryOperation;
  readonly outcome: "completed" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMilliseconds: number;
}

export interface MetaWebhookQueueTelemetryCounts {
  processed: number;
  discarded: number;
  retried: number;
}

export interface CampaignDeliveryQueueTelemetryCounts {
  accepted: number;
  rejected: number;
  deferred: number;
  skipped: number;
  duplicates: number;
  ambiguous: number;
  discarded: number;
  retried: number;
}

export interface MessageTemplateSubmissionMaintenanceTelemetryCounts {
  pendingCandidates: number;
  published: number;
  ambiguousCandidates: number;
  resolvedSubmitted: number;
  resolvedRejected: number;
  deferred: number;
  duplicates: number;
  missing: number;
  failed: number;
}

export type OperationalTelemetryEvent =
  | {
      version: 1;
      kind: "queue-batch";
      queue: "meta-webhook";
      outcome: "completed" | "failed";
      startedAt: string;
      completedAt: string;
      durationMilliseconds: number;
      counts: MetaWebhookQueueTelemetryCounts;
    }
  | {
      version: 1;
      kind: "queue-batch";
      queue: "campaign-delivery";
      outcome: "completed" | "failed";
      startedAt: string;
      completedAt: string;
      durationMilliseconds: number;
      counts:
        CampaignDeliveryQueueTelemetryCounts;
    }
  | {
      version: 1;
      kind: "knowledge-scan-recovery";
      outcome:
        | "retry-later"
        | "scan-clean"
        | "rejected"
        | "failed";
      startedAt: string;
      completedAt: string;
      durationMilliseconds: number;
    }
  | {
      version: 1;
      kind: "message-template-submission-maintenance";
      outcome: "completed" | "failed";
      startedAt: string;
      completedAt: string;
      durationMilliseconds: number;
      counts: MessageTemplateSubmissionMaintenanceTelemetryCounts;
      providerRequests?: readonly ProviderRequestTelemetry[];
    }
  | {
      version: 1;
      kind: "delivery-attempt";
      queue:
        | "bot-reply"
        | "campaign-delivery"
        | "message-template-submission"
        | "team-invitation";
      outcome: DeliveryAttemptTelemetryOutcome;
      startedAt: string;
      completedAt: string;
      durationMilliseconds: number;
      providerRequests?: readonly ProviderRequestTelemetry[];
    };

export interface OperationalTelemetrySink {
  record(
    event: OperationalTelemetryEvent,
  ): Promise<unknown>;
}

export type OperationalTelemetryRecordResult =
  | { outcome: "recorded" }
  | { outcome: "unavailable" };

const META_COUNT_KEYS = [
  "processed",
  "discarded",
  "retried",
] as const;
const CAMPAIGN_COUNT_KEYS = [
  "accepted",
  "rejected",
  "deferred",
  "skipped",
  "duplicates",
  "ambiguous",
  "discarded",
  "retried",
] as const;
const MESSAGE_TEMPLATE_MAINTENANCE_COUNT_KEYS = [
  "pendingCandidates",
  "published",
  "ambiguousCandidates",
  "resolvedSubmitted",
  "resolvedRejected",
  "deferred",
  "duplicates",
  "missing",
  "failed",
] as const;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function isUtcTimestamp(value: unknown): boolean {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    )
  ) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function areCountsValid(
  value: unknown,
  keys: readonly string[],
): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, keys) &&
    keys.every(
      (key) =>
        Number.isSafeInteger(value[key]) &&
        Number(value[key]) >= 0,
    )
  );
}

function isTimingValid(
  value: Record<string, unknown>,
): boolean {
  if (
    !isUtcTimestamp(value.startedAt) ||
    !isUtcTimestamp(value.completedAt) ||
    !Number.isSafeInteger(
      value.durationMilliseconds,
    ) ||
    Number(value.durationMilliseconds) < 0
  ) {
    return false;
  }

  const startedAt = Date.parse(
    String(value.startedAt),
  );
  const completedAt = Date.parse(
    String(value.completedAt),
  );

  return (
    completedAt >= startedAt &&
    completedAt - startedAt ===
      value.durationMilliseconds
  );
}

function isDeliveryOutcomeValid(
  queue: unknown,
  outcome: unknown,
): outcome is DeliveryAttemptTelemetryOutcome {
  if (outcome === "failed") {
    return true;
  }

  return queue === "campaign-delivery"
    ? outcome === "accepted" ||
        outcome === "rejected" ||
        outcome === "deferred" ||
        outcome === "duplicate" ||
        outcome === "ambiguous"
    : queue === "bot-reply"
      ? outcome === "accepted" ||
        outcome === "rejected" ||
        outcome === "deferred"
      : queue === "team-invitation"
        ? outcome === "submitted" ||
          outcome === "blocked" ||
          outcome === "ambiguous" ||
          outcome === "deferred" ||
          outcome === "duplicate" ||
          outcome === "cancelled" ||
          outcome === "not-found"
        : queue === "message-template-submission"
          ? outcome === "submitted" ||
            outcome === "rejected" ||
            outcome === "blocked" ||
            outcome === "ambiguous" ||
            outcome === "duplicate" ||
            outcome === "not-found"
          : false;
}

function providerOperationIsValid(
  provider: unknown,
  operation: unknown,
): boolean {
  return provider === "meta"
    ? operation === "campaign-message.send" ||
        operation === "bot-reply.send" ||
        operation === "message-template.submit" ||
        operation === "message-template.list"
    : provider === "clerk"
      ? operation === "organization-invitation.list" ||
          operation === "organization-invitation.create"
      : false;
}

export function isProviderRequestTelemetryValid(
  value: unknown,
  parent?: Record<string, unknown>,
): value is ProviderRequestTelemetry {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "provider",
      "operation",
      "outcome",
      "startedAt",
      "completedAt",
      "durationMilliseconds",
    ]) ||
    !providerOperationIsValid(value.provider, value.operation) ||
    (value.outcome !== "completed" && value.outcome !== "failed") ||
    !isTimingValid(value)
  ) {
    return false;
  }

  return parent === undefined || (
    Date.parse(value.startedAt as string) >=
      Date.parse(parent.startedAt as string) &&
    Date.parse(value.completedAt as string) <=
      Date.parse(parent.completedAt as string)
  );
}

function areProviderRequestsValid(
  value: unknown,
  parent: Record<string, unknown>,
  expectedQueue: unknown,
): value is readonly ProviderRequestTelemetry[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 64 ||
    !value.every((request) =>
      isProviderRequestTelemetryValid(request, parent)
    )
  ) {
    return false;
  }

  return value.every((request) =>
    expectedQueue === "campaign-delivery"
      ? request.provider === "meta" &&
        request.operation === "campaign-message.send"
      : expectedQueue === "bot-reply"
        ? request.provider === "meta" &&
          request.operation === "bot-reply.send"
      : expectedQueue === "message-template-submission"
        ? request.provider === "meta" &&
          request.operation === "message-template.submit"
        : expectedQueue === "team-invitation"
          ? request.provider === "clerk" &&
            (request.operation === "organization-invitation.list" ||
              request.operation === "organization-invitation.create")
          : expectedQueue === "message-template-submission-maintenance"
            ? request.provider === "meta" &&
              request.operation === "message-template.list"
            : false
  );
}

export function isOperationalTelemetryEventValid(
  event: unknown,
): event is OperationalTelemetryEvent {
  if (
    !isRecord(event) ||
    event.version !== 1
  ) {
    return false;
  }

  if (
    event.kind ===
    "knowledge-scan-recovery"
  ) {
    return (
      hasExactKeys(event, [
        "version",
        "kind",
        "outcome",
        "startedAt",
        "completedAt",
        "durationMilliseconds",
      ]) &&
      (event.outcome === "retry-later" ||
        event.outcome === "scan-clean" ||
        event.outcome === "rejected" ||
        event.outcome === "failed") &&
      isTimingValid(event)
    );
  }

  if (event.kind === "message-template-submission-maintenance") {
    const baseKeys = [
      "version",
      "kind",
      "outcome",
      "startedAt",
      "completedAt",
      "durationMilliseconds",
      "counts",
    ];
    const hasProviderRequests = Object.hasOwn(event, "providerRequests");
    return (
      hasExactKeys(
        event,
        hasProviderRequests
          ? [...baseKeys, "providerRequests"]
          : baseKeys,
      ) &&
      (event.outcome === "completed" || event.outcome === "failed") &&
      isTimingValid(event) &&
      areCountsValid(
        event.counts,
        MESSAGE_TEMPLATE_MAINTENANCE_COUNT_KEYS,
      ) &&
      (!hasProviderRequests || areProviderRequestsValid(
        event.providerRequests,
        event,
        "message-template-submission-maintenance",
      ))
    );
  }

  if (event.kind === "delivery-attempt") {
    const baseKeys = [
      "version",
      "kind",
      "queue",
      "outcome",
      "startedAt",
      "completedAt",
      "durationMilliseconds",
    ];
    const hasProviderRequests = Object.hasOwn(event, "providerRequests");

    return (
      hasExactKeys(
        event,
        hasProviderRequests
          ? [...baseKeys, "providerRequests"]
          : baseKeys,
      ) &&
      isDeliveryOutcomeValid(event.queue, event.outcome) &&
      isTimingValid(event) &&
      (!hasProviderRequests || areProviderRequestsValid(
        event.providerRequests,
        event,
        event.queue,
      ))
    );
  }

  if (
    !hasExactKeys(event, [
      "version",
      "kind",
      "queue",
      "outcome",
      "startedAt",
      "completedAt",
      "durationMilliseconds",
      "counts",
    ]) ||
    event.kind !== "queue-batch" ||
    (event.outcome !== "completed" &&
      event.outcome !== "failed") ||
    !isTimingValid(event)
  ) {
    return false;
  }

  return event.queue === "meta-webhook"
    ? areCountsValid(
        event.counts,
        META_COUNT_KEYS,
      )
    : event.queue === "campaign-delivery"
      ? areCountsValid(
          event.counts,
          CAMPAIGN_COUNT_KEYS,
        )
      : false;
}

function parseSinkResult(
  value: unknown,
): OperationalTelemetryRecordResult {
  if (
    isRecord(value) &&
    hasExactKeys(value, ["outcome"]) &&
    value.outcome === "recorded"
  ) {
    return { outcome: "recorded" };
  }

  return { outcome: "unavailable" };
}

export async function recordOperationalTelemetry(
  sink: OperationalTelemetrySink,
  event: OperationalTelemetryEvent,
): Promise<OperationalTelemetryRecordResult> {
  if (!isOperationalTelemetryEventValid(event)) {
    return { outcome: "unavailable" };
  }

  try {
    return parseSinkResult(
      await sink.record(
        structuredClone(event),
      ),
    );
  } catch {
    return { outcome: "unavailable" };
  }
}

export const unavailableOperationalTelemetrySink:
OperationalTelemetrySink = {
  async record() {
    return { outcome: "unavailable" };
  },
};
