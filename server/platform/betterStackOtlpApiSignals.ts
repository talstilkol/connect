import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
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
  type BetterStackServiceName,
} from "./betterStackOtlpLogs.ts";
import {
  createOpenTelemetryLogContext,
  deriveLocalSpanId,
  parseW3cTraceparent,
  type W3cTraceContext,
} from "./w3cTraceContext.ts";
import {
  createPrimeableDeterministicIdGenerator,
} from "./deterministicOtlpIds.ts";

export type BetterStackApiSignalRole =
  | "vercel-client"
  | "railway-server";

export type BetterStackApiRequestSignal = Readonly<{
  role: BetterStackApiSignalRole;
  operation: string | null;
  requestKind: "query" | "mutation" | null;
  outcome: "ok" | "remote-error" | "client-error" | "rejected" | "error";
  code: string;
  durationMilliseconds: number;
  traceContext: W3cTraceContext | null;
}>;

export interface BetterStackOtlpApiSignalsRuntime {
  readonly record: (event: BetterStackApiRequestSignal) => boolean;
  readonly forceFlush: () => Promise<void>;
  readonly shutdown: () => Promise<void>;
}

interface BetterStackOtlpApiSignalsDependencies {
  readonly createTraceExporter: (
    endpoint: string,
    sourceToken: string,
  ) => SpanExporter;
  readonly createMetricExporter: (
    endpoint: string,
    sourceToken: string,
  ) => PushMetricExporter;
  readonly clock: () => number;
}

const operationPattern =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){1,3}$/;
const codePattern = /^[A-Z][A-Z0-9_]{1,63}$/;
const maximumDurationMilliseconds = 300_000;

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
  clock: Date.now,
}) satisfies BetterStackOtlpApiSignalsDependencies;

function requireDependencies(
  dependencies: Readonly<BetterStackOtlpApiSignalsDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "clock,createMetricExporter,createTraceExporter" ||
    typeof dependencies.createTraceExporter !== "function" ||
    typeof dependencies.createMetricExporter !== "function" ||
    typeof dependencies.clock !== "function"
  ) {
    throw new Error("Better Stack API signals dependencies are invalid");
  }
}

function validSignal(event: BetterStackApiRequestSignal): boolean {
  if (!event || typeof event !== "object") {
    return false;
  }
  const parsedTraceContext = event.traceContext === null
    ? null
    : parseW3cTraceparent(event.traceContext?.traceparent ?? null);
  const validOutcome = event.role === "vercel-client"
    ? ["ok", "remote-error", "client-error"].includes(event.outcome)
    : ["ok", "rejected", "error"].includes(event.outcome);
  return (
    ["vercel-client", "railway-server"].includes(event.role) &&
    (event.operation === null || (
      event.operation.length <= 128 &&
      operationPattern.test(event.operation)
    )) &&
    (event.requestKind === null ||
      event.requestKind === "query" ||
      event.requestKind === "mutation") &&
    validOutcome &&
    codePattern.test(event.code) &&
    Number.isSafeInteger(event.durationMilliseconds) &&
    event.durationMilliseconds >= 0 &&
    event.durationMilliseconds <= maximumDurationMilliseconds &&
    (event.traceContext === null || (
      parsedTraceContext !== null &&
      parsedTraceContext.traceId === event.traceContext.traceId &&
      parsedTraceContext.parentSpanId === event.traceContext.parentSpanId &&
      parsedTraceContext.traceFlags === event.traceContext.traceFlags
    ))
  );
}

function attributesForSignal(
  event: BetterStackApiRequestSignal,
): Readonly<Attributes> {
  const attributes: Attributes = {
    "connect.schema.version": 1,
    "connect.operation.outcome": event.outcome,
    "connect.event.code": event.code,
    "connect.request.role": event.role,
  };
  if (event.operation !== null) {
    attributes["connect.operation.name"] = event.operation;
  }
  if (event.requestKind !== null) {
    attributes["connect.request.kind"] = event.requestKind;
  }
  return Object.freeze(attributes);
}

function parentContextForSignal(event: BetterStackApiRequestSignal): Context {
  if (event.role === "vercel-client" || event.traceContext === null) {
    return ROOT_CONTEXT;
  }
  return createOpenTelemetryLogContext(event.traceContext) ?? ROOT_CONTEXT;
}

export function createBetterStackOtlpApiSignalsRuntime(
  configuration: Readonly<BetterStackOtlpLogsConfiguration>,
  serviceName: Extract<
    BetterStackServiceName,
    "connect-vercel-web" | "connect-railway-api"
  >,
  dependencies: Readonly<BetterStackOtlpApiSignalsDependencies> =
    defaultDependencies,
): Readonly<BetterStackOtlpApiSignalsRuntime> {
  requireDependencies(dependencies);
  const normalized = normalizeBetterStackOtlpLogsConfiguration(configuration);
  if (normalized === null) {
    throw new Error("Better Stack API signals configuration is invalid");
  }

  const resource = resourceFromAttributes({
    "service.name": serviceName,
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
  const instrumentationName = serviceName.replaceAll("-", ".");
  const tracer = tracerProvider.getTracer(instrumentationName, "1");
  const meter = meterProvider.getMeter(instrumentationName, "1");
  const requestCounter = meter.createCounter(
    "connect.railway_api.requests",
    { description: "Bounded Vercel to Railway API requests", unit: "{request}" },
  );
  const durationHistogram = meter.createHistogram(
    "connect.railway_api.duration",
    { description: "Bounded Vercel to Railway API duration", unit: "ms" },
  );
  let shutdown: Promise<void> | null = null;

  return Object.freeze({
    record(event: BetterStackApiRequestSignal) {
      if (!validSignal(event)) {
        return false;
      }

      const attributes = attributesForSignal(event);
      try {
        const endedAt = dependencies.clock();
        if (!Number.isSafeInteger(endedAt) || endedAt < 0) {
          return false;
        }
        requestCounter.add(1, attributes);
        durationHistogram.record(event.durationMilliseconds, attributes);
        if (event.traceContext !== null) {
          const spanId = deriveLocalSpanId(
            event.traceContext,
            event.role === "vercel-client" ? "vercel" : "railway",
          );
          const span = idGenerator.withIds(
            event.role === "vercel-client"
              ? event.traceContext.traceId
              : null,
            spanId,
            () => tracer.startSpan(
              event.role === "vercel-client"
                ? "connect.railway-api.client"
                : "connect.railway-api.server",
              {
                root: event.role === "vercel-client",
                kind: event.role === "vercel-client"
                  ? SpanKind.CLIENT
                  : SpanKind.SERVER,
                startTime: endedAt - event.durationMilliseconds,
                attributes,
              },
              parentContextForSignal(event),
            ),
          );
          span.setStatus({
            code: event.outcome === "ok"
              ? SpanStatusCode.OK
              : SpanStatusCode.ERROR,
          });
          span.end(endedAt);
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
