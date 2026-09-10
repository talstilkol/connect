import type {
  OperationalTelemetryEvent,
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import {
  isOperationalTelemetryEventValid,
} from "../operations/operationalTelemetry.ts";

export const railwayWorkerQueueNames = Object.freeze([
  "campaign-delivery",
  "bot-reply-staging",
  "message-template-submission",
  "meta-webhook",
  "team-invitation",
] as const);

export type RailwayWorkerQueueName =
  (typeof railwayWorkerQueueNames)[number];

export type RailwayWorkerLogEvent =
  | Readonly<{
      version: 1;
      service: "connect-railway-worker";
      kind: "worker-signal";
      code:
        | "postgres-idle-client-failure"
        | "scheduler-run-failure"
        | "scheduler-timer-failure"
        | "scheduler-overlap-suppressed"
        | "shutdown-failure";
    }>
  | Readonly<{
      version: 1;
      service: "connect-railway-worker";
      kind: "queue-signal";
      queue: RailwayWorkerQueueName;
      code:
        | "connection-failure"
        | "worker-failure"
        | "worker-runtime-failure"
        | "publisher-failure"
        | "dead-letter"
        | "dead-letter-cleanup";
      reason?:
        | "invalid-envelope"
        | "retry-exhausted"
        | "lease-expired"
        | "consumer-failed";
      count?: number;
    }>
  | Readonly<{
      version: 1;
      service: "connect-railway-worker";
      kind: "operational-event";
      event: OperationalTelemetryEvent;
    }>;

export interface RailwayWorkerStructuredLogWriter {
  readonly write: (line: string) => void;
}

export interface RailwayWorkerStructuredLogger {
  readonly record: (event: RailwayWorkerLogEvent) => boolean;
}

const workerSignalCodes = Object.freeze([
  "postgres-idle-client-failure",
  "scheduler-run-failure",
  "scheduler-timer-failure",
  "scheduler-overlap-suppressed",
  "shutdown-failure",
] as const);
const queueSignalCodes = Object.freeze([
  "connection-failure",
  "worker-failure",
  "worker-runtime-failure",
  "publisher-failure",
  "dead-letter",
  "dead-letter-cleanup",
] as const);
const deadLetterReasons = Object.freeze([
  "invalid-envelope",
  "retry-exhausted",
  "lease-expired",
  "consumer-failed",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

export function isRailwayWorkerLogEvent(
  event: unknown,
): event is RailwayWorkerLogEvent {
  if (
    !isRecord(event) ||
    event.version !== 1 ||
    event.service !== "connect-railway-worker"
  ) {
    return false;
  }

  if (event.kind === "worker-signal") {
    return hasExactKeys(event, ["version", "service", "kind", "code"]) &&
      workerSignalCodes.includes(event.code as never);
  }

  if (event.kind === "operational-event") {
    return hasExactKeys(event, ["version", "service", "kind", "event"]) &&
      isOperationalTelemetryEventValid(event.event);
  }

  if (
    event.kind !== "queue-signal" ||
    !railwayWorkerQueueNames.includes(event.queue as never) ||
    !queueSignalCodes.includes(event.code as never)
  ) {
    return false;
  }

  const baseKeys = ["version", "service", "kind", "queue", "code"];
  if (event.code === "dead-letter") {
    return hasExactKeys(event, [...baseKeys, "reason"]) &&
      deadLetterReasons.includes(event.reason as never);
  }
  if (event.code === "dead-letter-cleanup") {
    return hasExactKeys(event, [...baseKeys, "count"]) &&
      Number.isSafeInteger(event.count) &&
      Number(event.count) >= 0 &&
      Number(event.count) <= 1_000_000;
  }
  return hasExactKeys(event, baseKeys);
}

const defaultWriter = Object.freeze({
  write(line: string) {
    process.stdout.write(line);
  },
});

export function createRailwayWorkerStructuredLogger(
  writer: Readonly<RailwayWorkerStructuredLogWriter> = defaultWriter,
): Readonly<RailwayWorkerStructuredLogger> {
  if (
    !writer ||
    typeof writer !== "object" ||
    Object.keys(writer).join(",") !== "write" ||
    typeof writer.write !== "function"
  ) {
    throw new Error("Railway worker structured log writer is invalid");
  }

  return Object.freeze({
    record(event: RailwayWorkerLogEvent) {
      if (!isRailwayWorkerLogEvent(event)) {
        return false;
      }
      try {
        writer.write(`${JSON.stringify(event)}\n`);
        return true;
      } catch {
        return false;
      }
    },
  });
}

export function createRailwayWorkerOperationalTelemetrySink(
  logger: Readonly<RailwayWorkerStructuredLogger>,
): Readonly<OperationalTelemetrySink> {
  if (typeof logger?.record !== "function") {
    throw new Error("Railway worker telemetry logger is invalid");
  }

  return Object.freeze({
    async record(event: OperationalTelemetryEvent) {
      return logger.record(Object.freeze({
        version: 1,
        service: "connect-railway-worker",
        kind: "operational-event",
        event: structuredClone(event),
      }))
        ? { outcome: "recorded" }
        : { outcome: "unavailable" };
    },
  });
}

export function createRailwayWorkerQueueTelemetry(
  logger: Readonly<RailwayWorkerStructuredLogger>,
  queue: RailwayWorkerQueueName,
) {
  if (
    typeof logger?.record !== "function" ||
    !railwayWorkerQueueNames.includes(queue)
  ) {
    throw new Error("Railway worker queue telemetry is invalid");
  }

  function record(
    code: Extract<RailwayWorkerLogEvent, { kind: "queue-signal" }>["code"],
    details: Readonly<{
      reason?:
        | "invalid-envelope"
        | "retry-exhausted"
        | "lease-expired"
        | "consumer-failed";
      count?: number;
    }> = {},
  ): void {
    logger.record(Object.freeze({
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue,
      code,
      ...details,
    }));
  }

  return Object.freeze({
    recordConnectionFailure() {
      record("connection-failure");
    },
    recordWorkerFailure() {
      record("worker-failure");
    },
    recordWorkerRuntimeFailure() {
      record("worker-runtime-failure");
    },
    recordPublisherFailure() {
      record("publisher-failure");
    },
    recordDeadLetter(
      reason:
        | "invalid-envelope"
        | "retry-exhausted"
        | "lease-expired"
        | "consumer-failed",
    ) {
      record("dead-letter", { reason });
    },
    recordDeadLetterCleanup(count: number) {
      record("dead-letter-cleanup", {
        count: Number.isSafeInteger(count) && count >= 0 ? count : 0,
      });
    },
  });
}

export function recordRailwayWorkerSignal(
  logger: Readonly<RailwayWorkerStructuredLogger>,
  code: Extract<RailwayWorkerLogEvent, { kind: "worker-signal" }>["code"],
): void {
  if (typeof logger?.record !== "function") {
    return;
  }

  logger.record(Object.freeze({
    version: 1,
    service: "connect-railway-worker",
    kind: "worker-signal",
    code,
  }));
}
