export type OperationalQueueKind =
  | "meta-webhook"
  | "campaign-delivery";

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

function isTelemetryEventValid(
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
  if (!isTelemetryEventValid(event)) {
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
