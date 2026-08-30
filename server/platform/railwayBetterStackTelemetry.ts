import {
  SeverityNumber,
  type LogAttributes,
} from "@opentelemetry/api-logs";
import {
  createBetterStackOtlpLogsRuntime,
  normalizeBetterStackOtlpLogsConfiguration,
  type BetterStackOtlpLoggerProviderRuntime,
  type BetterStackOtlpLogsConfiguration,
  type BetterStackServiceName,
} from "./betterStackOtlpLogs.ts";
import {
  createBetterStackOtlpApiSignalsRuntime,
  type BetterStackOtlpApiSignalsRuntime,
} from "./betterStackOtlpApiSignals.ts";
import {
  createBetterStackOtlpWorkerSignalsRuntime,
  createRailwayWorkerEventOpenTelemetryContext,
  type BetterStackOtlpWorkerSignalsRuntime,
} from "./betterStackOtlpWorkerSignals.ts";

import {
  createRailwayWorkerStructuredLogger,
  isRailwayWorkerLogEvent,
  type RailwayWorkerLogEvent,
  type RailwayWorkerStructuredLogger,
} from "./railwayWorkerTelemetry.ts";
import type {
  RailwayApiRequestLogEvent,
} from "./railwayApiHttpHandler.ts";
import {
  createOpenTelemetryLogContext,
} from "./w3cTraceContext.ts";

export interface RailwayBetterStackTelemetryEnvironment {
  readonly APP_RUNTIME_ENVIRONMENT?: string;
  readonly APP_RELEASE_SHA?: string;
  readonly BETTER_STACK_OTLP_LOGS_ENDPOINT?: string;
  readonly BETTER_STACK_SOURCE_TOKEN?: string;
}

export type RailwayBetterStackTelemetryConfigurationState =
  | Readonly<{
      status: "stdout-only";
      runtimeEnvironment: "development" | "test";
    }>
  | Readonly<{
      status: "configured";
      runtimeEnvironment: "staging" | "production";
      releaseSha: string;
      endpoint: string;
      sourceToken: string;
    }>
  | Readonly<{
      status: "configuration-required";
      missingKeys: readonly string[];
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly string[];
    }>;

export interface RailwayWorkerTelemetryRuntime {
  readonly logger: RailwayWorkerStructuredLogger;
  readonly forceFlush: () => Promise<boolean>;
  readonly shutdown: () => Promise<boolean>;
}

export type RailwayApiSignalLogEvent = Readonly<{
  version: 1;
  service: "connect-railway-api";
  kind: "api-signal";
  code:
    | "postgres-idle-client-failure"
    | "meta-webhook-queue-connection-failure"
    | "meta-webhook-queue-publisher-failure"
    | "team-invitation-queue-connection-failure"
    | "team-invitation-queue-publisher-failure"
    | "bot-reply-staging-queue-connection-failure"
    | "bot-reply-staging-queue-publisher-failure"
    | "shutdown-failure";
}>;

export type RailwayApiLogEvent =
  | RailwayApiSignalLogEvent
  | RailwayApiRequestLogEvent;

export interface RailwayApiTelemetryRuntime {
  readonly logger: Readonly<{
    record(event: RailwayApiLogEvent): boolean;
  }>;
  readonly forceFlush: () => Promise<boolean>;
  readonly shutdown: () => Promise<boolean>;
}

interface RailwayBetterStackTelemetryDependencies<Event> {
  readonly stdoutLogger: Readonly<{
    record(event: Event): boolean;
  }>;
  readonly createOtlpRuntime: (
    configuration: Readonly<BetterStackOtlpLogsConfiguration>,
    serviceName?: BetterStackServiceName,
  ) => BetterStackOtlpLoggerProviderRuntime;
}

interface RailwayBetterStackWorkerTelemetryDependencies extends
RailwayBetterStackTelemetryDependencies<RailwayWorkerLogEvent> {
  readonly createOtlpWorkerSignalsRuntime: (
    configuration: Readonly<BetterStackOtlpLogsConfiguration>,
  ) => BetterStackOtlpWorkerSignalsRuntime;
}

interface RailwayBetterStackApiTelemetryDependencies extends
RailwayBetterStackTelemetryDependencies<RailwayApiLogEvent> {
  readonly createOtlpSignalsRuntime: (
    configuration: Readonly<BetterStackOtlpLogsConfiguration>,
    serviceName: "connect-railway-api",
  ) => BetterStackOtlpApiSignalsRuntime;
}

export function inspectRailwayBetterStackTelemetryConfiguration(
  environment: RailwayBetterStackTelemetryEnvironment,
): RailwayBetterStackTelemetryConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  const runtimeEnvironment = environment.APP_RUNTIME_ENVIRONMENT;
  if (runtimeEnvironment === "development" || runtimeEnvironment === "test") {
    const providerValues = [
      environment.APP_RELEASE_SHA,
      environment.BETTER_STACK_OTLP_LOGS_ENDPOINT,
      environment.BETTER_STACK_SOURCE_TOKEN,
    ];
    return providerValues.every((value) => value === undefined || value === "")
      ? Object.freeze({ status: "stdout-only", runtimeEnvironment })
      : Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  if (runtimeEnvironment !== "staging" && runtimeEnvironment !== "production") {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  const requiredValues: readonly (readonly [string, string | undefined])[] = [
    ["APP_RELEASE_SHA", environment.APP_RELEASE_SHA],
    ["BETTER_STACK_OTLP_LOGS_ENDPOINT", environment.BETTER_STACK_OTLP_LOGS_ENDPOINT],
    ["BETTER_STACK_SOURCE_TOKEN", environment.BETTER_STACK_SOURCE_TOKEN],
  ];
  const missingKeys = Object.freeze(requiredValues
    .filter(([, value]) => value === undefined || value === "")
    .map(([key]) => key));
  if (missingKeys.length > 0) {
    return Object.freeze({ status: "configuration-required", missingKeys });
  }

  const normalized = normalizeBetterStackOtlpLogsConfiguration({
    runtimeEnvironment,
    releaseSha: environment.APP_RELEASE_SHA!,
    endpoint: environment.BETTER_STACK_OTLP_LOGS_ENDPOINT!,
    sourceToken: environment.BETTER_STACK_SOURCE_TOKEN!,
  });
  if (normalized === null) {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  return Object.freeze({
    status: "configured",
    runtimeEnvironment,
    releaseSha: normalized.releaseSha,
    endpoint: normalized.endpoint,
    sourceToken: normalized.sourceToken,
  });
}

type RailwayBetterStackLogEvent = RailwayWorkerLogEvent | RailwayApiLogEvent;

function severityForEvent(event: RailwayBetterStackLogEvent): SeverityNumber {
  if (event.kind === "api-request") {
    return event.outcome === "ok"
      ? SeverityNumber.INFO
      : event.outcome === "rejected"
        ? SeverityNumber.WARN
        : SeverityNumber.ERROR;
  }

  if (
    event.kind === "api-signal" ||
    event.kind === "worker-signal" ||
    (event.kind === "queue-signal" && event.code !== "dead-letter-cleanup") ||
    (event.kind === "operational-event" && event.event.outcome === "failed")
  ) {
    return SeverityNumber.ERROR;
  }

  return SeverityNumber.INFO;
}

function attributesForEvent(
  event: RailwayBetterStackLogEvent,
): Readonly<LogAttributes> {
  const attributes: LogAttributes = {
    "connect.schema.version": event.version,
    "connect.event.kind": event.kind,
  };

  if (event.kind === "worker-signal" || event.kind === "api-signal") {
    attributes["connect.event.code"] = event.code;
  } else if (event.kind === "api-request") {
    attributes["connect.event.code"] = event.code;
    attributes["connect.operation.outcome"] = event.outcome;
    attributes["connect.duration.ms"] = event.durationMilliseconds;
    if (event.operation !== null) {
      attributes["connect.operation.name"] = event.operation;
    }
    if (event.requestKind !== null) {
      attributes["connect.request.kind"] = event.requestKind;
    }
  } else if (event.kind === "queue-signal") {
    attributes["connect.event.code"] = event.code;
    attributes["connect.queue"] = event.queue;
    if (event.reason !== undefined) {
      attributes["connect.reason"] = event.reason;
    }
    if (event.count !== undefined) {
      attributes["connect.count"] = event.count;
    }
  } else {
    attributes["connect.operation.kind"] = event.event.kind;
    attributes["connect.operation.outcome"] = event.event.outcome;
    attributes["connect.duration.ms"] = event.event.durationMilliseconds;
    if (
      event.event.kind === "queue-batch" ||
      event.event.kind === "delivery-attempt"
    ) {
      attributes["connect.queue"] = event.event.queue;
    }
    if ("counts" in event.event) {
      for (const [key, value] of Object.entries(event.event.counts)) {
        attributes[`connect.count.${key}`] = value;
      }
    }
  }

  return Object.freeze(attributes);
}

function createDefaultOtlpRuntime(
  configuration: Readonly<BetterStackOtlpLogsConfiguration>,
  serviceName: BetterStackServiceName =
    "connect-railway-worker",
): BetterStackOtlpLoggerProviderRuntime {
  return createBetterStackOtlpLogsRuntime(configuration, serviceName);
}

const defaultDependencies = Object.freeze({
  stdoutLogger: createRailwayWorkerStructuredLogger(),
  createOtlpRuntime: createDefaultOtlpRuntime,
  createOtlpWorkerSignalsRuntime: createBetterStackOtlpWorkerSignalsRuntime,
}) satisfies RailwayBetterStackWorkerTelemetryDependencies;

function requireDependencies(
  dependencies: Readonly<RailwayBetterStackWorkerTelemetryDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createOtlpRuntime,createOtlpWorkerSignalsRuntime,stdoutLogger" ||
    typeof dependencies.stdoutLogger?.record !== "function" ||
    typeof dependencies.createOtlpRuntime !== "function" ||
    typeof dependencies.createOtlpWorkerSignalsRuntime !== "function"
  ) {
    throw new Error("Railway Better Stack telemetry dependencies are invalid");
  }
}

export function createRailwayBetterStackTelemetryRuntime(
  configuration: Exclude<
    RailwayBetterStackTelemetryConfigurationState,
    { status: "configuration-required" | "invalid" }
  >,
  dependencies: Readonly<RailwayBetterStackWorkerTelemetryDependencies> =
    defaultDependencies,
): Readonly<RailwayWorkerTelemetryRuntime> {
  requireDependencies(dependencies);
  if (configuration.status === "stdout-only") {
    return Object.freeze({
      logger: dependencies.stdoutLogger,
      async forceFlush() {
        return true;
      },
      async shutdown() {
        return true;
      },
    });
  }

  const otlp = dependencies.createOtlpRuntime(
    configuration,
    "connect-railway-worker",
  );
  const signals = dependencies.createOtlpWorkerSignalsRuntime(configuration);
  if (
    typeof otlp?.logger?.emit !== "function" ||
    typeof otlp.forceFlush !== "function" ||
    typeof otlp.shutdown !== "function" ||
    typeof signals?.record !== "function" ||
    typeof signals.forceFlush !== "function" ||
    typeof signals.shutdown !== "function"
  ) {
    throw new Error("Railway Better Stack telemetry runtime is invalid");
  }

  let shutdown: Promise<boolean> | null = null;
  const logger = Object.freeze({
    record(event: RailwayWorkerLogEvent) {
      if (!isRailwayWorkerLogEvent(event)) {
        return false;
      }
      const stdoutRecorded = dependencies.stdoutLogger.record(event);
      try {
        const signalsRecorded = signals.record(event);
        otlp.logger.emit({
          eventName: `connect.${event.kind}`,
          severityNumber: severityForEvent(event),
          severityText: severityForEvent(event) === SeverityNumber.ERROR
            ? "ERROR"
            : "INFO",
          body: event.kind,
          attributes: attributesForEvent(event),
          context: createRailwayWorkerEventOpenTelemetryContext(event),
          timestamp: event.kind === "operational-event"
            ? new Date(event.event.completedAt)
            : undefined,
        });
        return stdoutRecorded && signalsRecorded;
      } catch {
        return false;
      }
    },
  });

  return Object.freeze({
    logger,
    async forceFlush() {
      if (shutdown !== null) {
        return shutdown;
      }
      try {
        await Promise.all([otlp.forceFlush(), signals.forceFlush()]);
        return true;
      } catch {
        return false;
      }
    },
    async shutdown() {
      if (shutdown === null) {
        shutdown = (async () => {
          try {
            await Promise.all([otlp.shutdown(), signals.shutdown()]);
            return true;
          } catch {
            return false;
          }
        })();
      }
      return shutdown;
    },
  });
}

function createRailwayApiStdoutLogger(): Readonly<{
  record(event: RailwayApiLogEvent): boolean;
}> {
  return Object.freeze({
    record(event: RailwayApiLogEvent) {
      try {
        process.stdout.write(`${JSON.stringify(event)}\n`);
        return true;
      } catch {
        return false;
      }
    },
  });
}

const defaultApiDependencies = Object.freeze({
  stdoutLogger: createRailwayApiStdoutLogger(),
  createOtlpRuntime: createDefaultOtlpRuntime,
  createOtlpSignalsRuntime: createBetterStackOtlpApiSignalsRuntime,
}) satisfies RailwayBetterStackApiTelemetryDependencies;

function requireApiDependencies(
  dependencies: Readonly<RailwayBetterStackApiTelemetryDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createOtlpRuntime,createOtlpSignalsRuntime,stdoutLogger" ||
    typeof dependencies.stdoutLogger?.record !== "function" ||
    typeof dependencies.createOtlpRuntime !== "function" ||
    typeof dependencies.createOtlpSignalsRuntime !== "function"
  ) {
    throw new Error("Railway Better Stack API dependencies are invalid");
  }
}

export function createRailwayBetterStackApiTelemetryRuntime(
  configuration: Exclude<
    RailwayBetterStackTelemetryConfigurationState,
    { status: "configuration-required" | "invalid" }
  >,
  dependencies: Readonly<RailwayBetterStackApiTelemetryDependencies> =
    defaultApiDependencies,
): Readonly<RailwayApiTelemetryRuntime> {
  requireApiDependencies(dependencies);
  if (configuration.status === "stdout-only") {
    return Object.freeze({
      logger: dependencies.stdoutLogger,
      async forceFlush() {
        return true;
      },
      async shutdown() {
        return true;
      },
    });
  }

  const otlp = dependencies.createOtlpRuntime(
    configuration,
    "connect-railway-api",
  );
  const signals = dependencies.createOtlpSignalsRuntime(
    configuration,
    "connect-railway-api",
  );
  if (
    typeof otlp?.logger?.emit !== "function" ||
    typeof otlp.forceFlush !== "function" ||
    typeof otlp.shutdown !== "function" ||
    typeof signals?.record !== "function" ||
    typeof signals.forceFlush !== "function" ||
    typeof signals.shutdown !== "function"
  ) {
    throw new Error("Railway Better Stack API telemetry runtime is invalid");
  }

  let shutdown: Promise<boolean> | null = null;
  return Object.freeze({
    logger: Object.freeze({
      record(event: RailwayApiLogEvent) {
        const stdoutRecorded = dependencies.stdoutLogger.record(event);
        try {
          const severityNumber = severityForEvent(event);
          otlp.logger.emit({
            eventName: `connect.${event.kind}`,
            severityNumber,
            severityText: severityNumber === SeverityNumber.INFO
              ? "INFO"
              : severityNumber === SeverityNumber.WARN
                ? "WARN"
                : "ERROR",
            body: event.kind,
            attributes: attributesForEvent(event),
            context: event.kind === "api-request"
              ? createOpenTelemetryLogContext(event.traceContext, "railway")
              : undefined,
          });
          const signalsRecorded = event.kind === "api-request"
            ? signals.record({
                role: "railway-server",
                operation: event.operation,
                requestKind: event.requestKind,
                outcome: event.outcome,
                code: event.code,
                durationMilliseconds: event.durationMilliseconds,
                traceContext: event.traceContext,
              })
            : true;
          return stdoutRecorded && signalsRecorded;
        } catch {
          return false;
        }
      },
    }),
    async forceFlush() {
      if (shutdown !== null) {
        return shutdown;
      }
      try {
        await Promise.all([otlp.forceFlush(), signals.forceFlush()]);
        return true;
      } catch {
        return false;
      }
    },
    async shutdown() {
      if (shutdown === null) {
        shutdown = (async () => {
          try {
            await Promise.all([otlp.shutdown(), signals.shutdown()]);
            return true;
          } catch {
            return false;
          }
        })();
      }
      return shutdown;
    },
  });
}
