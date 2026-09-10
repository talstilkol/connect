import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Context,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from
  "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from
  "@opentelemetry/exporter-trace-otlp-http";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  TracerProvider,
  type SpanExporter,
} from "@opentelemetry/sdk-trace";

import {
  normalizeBetterStackOtlpLogsConfiguration,
  type BetterStackOtlpLogsConfiguration,
} from "./betterStackOtlpLogs.ts";
import {
  createPrimeableDeterministicIdGenerator,
  deriveDeterministicOtlpIds,
} from "./deterministicOtlpIds.ts";
import {
  isRailwayWorkerLogEvent,
  type RailwayWorkerLogEvent,
} from "./railwayWorkerTelemetry.ts";
import type {
  ProviderRequestTelemetry,
} from "../operations/operationalTelemetry.ts";

export interface BetterStackOtlpWorkerSignalsRuntime {
  readonly record: (event: RailwayWorkerLogEvent) => boolean;
  readonly forceFlush: () => Promise<void>;
  readonly shutdown: () => Promise<void>;
}

interface BetterStackOtlpWorkerSignalsDependencies {
  readonly createTraceExporter: (
    endpoint: string,
    sourceToken: string,
  ) => SpanExporter;
  readonly createMetricExporter: (
    endpoint: string,
    sourceToken: string,
  ) => PushMetricExporter;
}

function signalEndpoint(logsEndpoint: string, signal: "traces" | "metrics"):
string {
  const url = new URL(logsEndpoint);
  url.pathname = `/v1/${signal}`;
  return url.toString();
}

function createTraceExporter(
  endpoint: string,
  sourceToken: string,
): SpanExporter {
  return new OTLPTraceExporter({
    url: endpoint,
    headers: { Authorization: `Bearer ${sourceToken}` },
    compression: CompressionAlgorithm.GZIP,
    concurrencyLimit: 1,
    timeoutMillis: 5_000,
  });
}

function createMetricExporter(
  endpoint: string,
  sourceToken: string,
): PushMetricExporter {
  return new OTLPMetricExporter({
    url: endpoint,
    headers: { Authorization: `Bearer ${sourceToken}` },
    compression: CompressionAlgorithm.GZIP,
    concurrencyLimit: 1,
    timeoutMillis: 5_000,
  });
}

const defaultDependencies = Object.freeze({
  createTraceExporter,
  createMetricExporter,
}) satisfies BetterStackOtlpWorkerSignalsDependencies;

function requireDependencies(
  dependencies: Readonly<BetterStackOtlpWorkerSignalsDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createMetricExporter,createTraceExporter" ||
    typeof dependencies.createTraceExporter !== "function" ||
    typeof dependencies.createMetricExporter !== "function"
  ) {
    throw new Error("Better Stack Worker signals dependencies are invalid");
  }
}

function attributesForEvent(event: RailwayWorkerLogEvent): Readonly<Attributes> {
  const attributes: Attributes = {
    "connect.schema.version": 1,
    "connect.event.kind": event.kind,
  };
  if (event.kind === "worker-signal") {
    attributes["connect.event.code"] = event.code;
  } else if (event.kind === "queue-signal") {
    attributes["connect.queue"] = event.queue;
    attributes["connect.event.code"] = event.code;
    if (event.reason !== undefined) {
      attributes["connect.reason"] = event.reason;
    }
  } else {
    attributes["connect.operation.kind"] = event.event.kind;
    attributes["connect.operation.outcome"] = event.event.outcome;
    if (
      event.event.kind === "queue-batch" ||
      event.event.kind === "delivery-attempt"
    ) {
      attributes["connect.queue"] = event.event.queue;
    }
  }
  return Object.freeze(attributes);
}

function canonicalOperationalEvent(
  event: Extract<RailwayWorkerLogEvent, { kind: "operational-event" }>,
): string {
  const counts = "counts" in event.event
    ? Object.entries(event.event.counts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("\u0000")
    : "";
  const providerRequests = providerRequestsForEvent(event)
    .map((request) => [
      request.provider,
      request.operation,
      request.outcome,
      request.startedAt,
      request.completedAt,
      String(request.durationMilliseconds),
    ].join("\u0000"))
    .join("\u0001");
  return [
    event.event.kind,
    event.event.kind === "queue-batch" ||
        event.event.kind === "delivery-attempt"
      ? event.event.queue
      : "",
    event.event.outcome,
    event.event.startedAt,
    event.event.completedAt,
    String(event.event.durationMilliseconds),
    counts,
    providerRequests,
  ].join("\u0000");
}

function providerRequestsForEvent(
  event: Extract<RailwayWorkerLogEvent, { kind: "operational-event" }>,
): readonly ProviderRequestTelemetry[] {
  return (
    (event.event.kind === "delivery-attempt" ||
      event.event.kind === "message-template-submission-maintenance") &&
    event.event.providerRequests !== undefined
  )
    ? event.event.providerRequests
    : [];
}

function workerEventIds(
  event: RailwayWorkerLogEvent,
): Readonly<{ traceId: string; spanId: string }> | null {
  return event.kind === "operational-event"
    ? deriveDeterministicOtlpIds(
        "railway-worker.operation",
        canonicalOperationalEvent(event),
      )
    : null;
}

export function createRailwayWorkerEventOpenTelemetryContext(
  event: RailwayWorkerLogEvent,
): Context | undefined {
  if (!isRailwayWorkerLogEvent(event)) {
    return undefined;
  }
  const ids = workerEventIds(event);
  return ids === null
    ? undefined
    : trace.setSpanContext(ROOT_CONTEXT, {
        traceId: ids.traceId,
        spanId: ids.spanId,
        traceFlags: 1,
        isRemote: false,
      });
}

function spanName(
  event: Extract<RailwayWorkerLogEvent, { kind: "operational-event" }>,
): string {
  return `connect.worker.${event.event.kind}`;
}

function providerSpanId(
  event: Extract<RailwayWorkerLogEvent, { kind: "operational-event" }>,
  index: number,
): string | null {
  if (!Number.isSafeInteger(index) || index < 0) {
    return null;
  }

  return deriveDeterministicOtlpIds(
    "railway-worker.provider-request",
    `${canonicalOperationalEvent(event)}\u0000${index}`,
  )?.spanId ?? null;
}

export function createBetterStackOtlpWorkerSignalsRuntime(
  configuration: Readonly<BetterStackOtlpLogsConfiguration>,
  dependencies: Readonly<BetterStackOtlpWorkerSignalsDependencies> =
    defaultDependencies,
): Readonly<BetterStackOtlpWorkerSignalsRuntime> {
  requireDependencies(dependencies);
  const normalized = normalizeBetterStackOtlpLogsConfiguration(configuration);
  if (normalized === null) {
    throw new Error("Better Stack Worker signals configuration is invalid");
  }

  const resource = resourceFromAttributes({
    "service.name": "connect-railway-worker",
    "service.version": normalized.releaseSha,
    "deployment.environment.name": normalized.runtimeEnvironment,
  });
  const traceExporter = dependencies.createTraceExporter(
    signalEndpoint(normalized.endpoint, "traces"),
    normalized.sourceToken,
  );
  const metricExporter = dependencies.createMetricExporter(
    signalEndpoint(normalized.endpoint, "metrics"),
    normalized.sourceToken,
  );
  const idGenerator = createPrimeableDeterministicIdGenerator();
  const tracerProvider = new TracerProvider({
    resource,
    idGenerator,
    forceFlushTimeoutMillis: 5_000,
    spanLimits: {
      attributeCountLimit: 16,
      attributeValueLengthLimit: 128,
      eventCountLimit: 0,
      linkCountLimit: 0,
    },
    spanProcessors: [new BatchSpanProcessor({
      exporter: traceExporter,
      maxQueueSize: 1_024,
      maxExportBatchSize: 128,
      scheduledDelayMillis: 1_000,
      exportTimeoutMillis: 5_000,
    })],
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000,
    exportTimeoutMillis: 5_000,
    maxExportBatchSize: 128,
    cardinalityLimits: { default: 128 },
  });
  const meterProvider = new MeterProvider({
    resource,
    readers: [metricReader],
  });
  const tracer = tracerProvider.getTracer("connect.railway.worker", "1");
  const meter = meterProvider.getMeter("connect.railway.worker", "1");
  const eventCounter = meter.createCounter("connect.worker.events", {
    description: "Bounded Railway Worker events",
    unit: "{event}",
  });
  const durationHistogram = meter.createHistogram(
    "connect.worker.operation.duration",
    { description: "Bounded Railway Worker operation duration", unit: "ms" },
  );
  const providerDurationHistogram = meter.createHistogram(
    "connect.worker.provider.duration",
    { description: "Bounded Railway Worker provider duration", unit: "ms" },
  );
  const itemCounter = meter.createCounter("connect.worker.items", {
    description: "Bounded Railway Worker operation item outcomes",
    unit: "{item}",
  });
  let shutdown: Promise<void> | null = null;

  return Object.freeze({
    record(event: RailwayWorkerLogEvent) {
      if (!isRailwayWorkerLogEvent(event)) {
        return false;
      }
      const attributes = attributesForEvent(event);
      try {
        eventCounter.add(1, attributes);
        if (
          event.kind === "queue-signal" &&
          event.code === "dead-letter-cleanup"
        ) {
          itemCounter.add(event.count ?? 0, {
            ...attributes,
            "connect.count.kind": "removed",
          });
        }
        if (event.kind === "operational-event") {
          durationHistogram.record(
            event.event.durationMilliseconds,
            attributes,
          );
          if ("counts" in event.event) {
            for (const [kind, count] of Object.entries(event.event.counts)) {
              itemCounter.add(count, {
                ...attributes,
                "connect.count.kind": kind,
              });
            }
          }

          const ids = workerEventIds(event);
          if (ids === null) {
            return false;
          }
          const span = idGenerator.withIds(ids.traceId, ids.spanId, () =>
            tracer.startSpan(spanName(event), {
              root: true,
              kind: event.event.kind === "queue-batch" ||
                  event.event.kind === "delivery-attempt"
                ? SpanKind.CONSUMER
                : SpanKind.INTERNAL,
              startTime: new Date(event.event.startedAt),
              attributes,
            }, ROOT_CONTEXT));
          span.setStatus({
            code: event.event.outcome === "failed"
              ? SpanStatusCode.ERROR
              : SpanStatusCode.OK,
          });
          const providerRequests = providerRequestsForEvent(event);
          for (const [index, request] of providerRequests.entries()) {
            const childSpanId = providerSpanId(event, index);
            if (childSpanId === null) {
              return false;
            }
            const providerAttributes = Object.freeze({
              "connect.schema.version": 1,
              "connect.event.kind": "provider-request",
              "connect.provider": request.provider,
              "connect.provider.operation": request.operation,
              "connect.operation.outcome": request.outcome,
            });
            providerDurationHistogram.record(
              request.durationMilliseconds,
              providerAttributes,
            );
            const parentContext = trace.setSpan(ROOT_CONTEXT, span);
            const providerSpan = idGenerator.withIds(
              ids.traceId,
              childSpanId,
              () => tracer.startSpan(
                `connect.provider.${request.provider}.${request.operation}`,
                {
                  kind: SpanKind.CLIENT,
                  startTime: new Date(request.startedAt),
                  attributes: providerAttributes,
                },
                parentContext,
              ),
            );
            providerSpan.setStatus({
              code: request.outcome === "failed"
                ? SpanStatusCode.ERROR
                : SpanStatusCode.OK,
            });
            providerSpan.end(new Date(request.completedAt));
          }
          span.end(new Date(event.event.completedAt));
        }
        return true;
      } catch {
        return false;
      }
    },
    async forceFlush() {
      if (shutdown !== null) {
        return shutdown;
      }
      await Promise.all([
        tracerProvider.forceFlush(),
        meterProvider.forceFlush(),
      ]);
    },
    async shutdown() {
      if (shutdown === null) {
        shutdown = Promise.all([
          tracerProvider.shutdown(),
          meterProvider.shutdown(),
        ]).then(() => undefined);
      }
      return shutdown;
    },
  });
}
