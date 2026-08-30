import {
  SeverityNumber,
  type LogAttributes,
} from "@opentelemetry/api-logs";
import { after } from "next/server.js";

import {
  railwayApiFailureCodes,
  type RailwayApiFailureCode,
  type RailwayApiRequestKind,
} from "./railwayApiContract.ts";
import {
  createBetterStackOtlpLogsRuntime,
  normalizeBetterStackOtlpLogsConfiguration,
  type BetterStackOtlpLoggerProviderRuntime,
  type BetterStackOtlpLogsConfiguration,
} from "./betterStackOtlpLogs.ts";
import {
  createBetterStackOtlpApiSignalsRuntime,
  type BetterStackOtlpApiSignalsRuntime,
} from "./betterStackOtlpApiSignals.ts";
import {
  createOpenTelemetryLogContext,
  parseW3cTraceparent,
  type W3cTraceContext,
} from "./w3cTraceContext.ts";

export interface VercelBetterStackTelemetryEnvironment {
  readonly VERCEL?: string;
  readonly VERCEL_ENV?: string;
  readonly VERCEL_GIT_COMMIT_SHA?: string;
  readonly BETTER_STACK_OTLP_LOGS_ENDPOINT?: string;
  readonly BETTER_STACK_SOURCE_TOKEN?: string;
}

export type VercelBetterStackTelemetryConfigurationState =
  | Readonly<{
      status: "disabled";
      runtimeEnvironment: "development" | "local";
    }>
  | Readonly<{
      status: "configured";
      runtimeEnvironment: "preview" | "production";
      releaseSha: string;
      endpoint: string;
      sourceToken: string;
    }>
  | Readonly<{
      status: "configuration-required" | "invalid";
      missingKeys: readonly string[];
    }>;

export type VercelRailwayApiClientFailureCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_UNAVAILABLE"
  | "CORRELATION_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export type VercelWebRailwayApiCallEvent = Readonly<{
  version: 1;
  service: "connect-vercel-web";
  kind: "railway-api-call";
  operation: string | null;
  requestKind: RailwayApiRequestKind | null;
  outcome: "ok" | "remote-error" | "client-error";
  code:
    | "OK"
    | RailwayApiFailureCode
    | VercelRailwayApiClientFailureCode;
  traceContext: W3cTraceContext | null;
  durationMilliseconds: number;
}>;

export interface VercelWebTelemetrySink {
  readonly record: (event: VercelWebRailwayApiCallEvent) => boolean;
  readonly scheduleFlush: () => boolean;
}

interface VercelBetterStackTelemetryDependencies {
  readonly stdoutLogger: Readonly<{
    record(event: VercelWebRailwayApiCallEvent): boolean;
  }>;
  readonly createOtlpRuntime: (
    configuration: Readonly<BetterStackOtlpLogsConfiguration>,
    serviceName: "connect-vercel-web",
  ) => BetterStackOtlpLoggerProviderRuntime;
  readonly createOtlpSignalsRuntime: (
    configuration: Readonly<BetterStackOtlpLogsConfiguration>,
    serviceName: "connect-vercel-web",
  ) => BetterStackOtlpApiSignalsRuntime;
  readonly scheduleAfterResponse: (
    callback: () => Promise<void>,
  ) => void;
}

const operationPattern =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){1,3}$/;
const clientFailureCodes = Object.freeze([
  "INVALID_CONFIGURATION",
  "INVALID_REQUEST",
  "AUTHENTICATION_UNAVAILABLE",
  "CORRELATION_UNAVAILABLE",
  "TIMEOUT",
  "NETWORK_ERROR",
  "INVALID_RESPONSE",
] as const);
const maximumDurationMilliseconds = 300_000;

function readProcessEnvironment(): VercelBetterStackTelemetryEnvironment {
  return {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    BETTER_STACK_OTLP_LOGS_ENDPOINT:
      process.env.BETTER_STACK_OTLP_LOGS_ENDPOINT,
    BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
  };
}

function blank(value: string | undefined): boolean {
  return value === undefined || value === "";
}

export function inspectVercelBetterStackTelemetryConfiguration(
  environment: VercelBetterStackTelemetryEnvironment,
): VercelBetterStackTelemetryConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  const providerValues = [
    environment.VERCEL,
    environment.VERCEL_GIT_COMMIT_SHA,
    environment.BETTER_STACK_OTLP_LOGS_ENDPOINT,
    environment.BETTER_STACK_SOURCE_TOKEN,
  ];
  if (environment.VERCEL_ENV === undefined) {
    return providerValues.every(blank)
      ? Object.freeze({ status: "disabled", runtimeEnvironment: "local" })
      : Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }
  if (environment.VERCEL_ENV === "development") {
    return providerValues.every((value, index) =>
      index === 0 ? value === undefined || value === "" || value === "1" : blank(value)
    )
      ? Object.freeze({ status: "disabled", runtimeEnvironment: "development" })
      : Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }
  if (
    environment.VERCEL_ENV !== "preview" &&
    environment.VERCEL_ENV !== "production"
  ) {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  const requiredValues: readonly (readonly [string, string | undefined])[] = [
    ["VERCEL", environment.VERCEL],
    ["VERCEL_GIT_COMMIT_SHA", environment.VERCEL_GIT_COMMIT_SHA],
    [
      "BETTER_STACK_OTLP_LOGS_ENDPOINT",
      environment.BETTER_STACK_OTLP_LOGS_ENDPOINT,
    ],
    ["BETTER_STACK_SOURCE_TOKEN", environment.BETTER_STACK_SOURCE_TOKEN],
  ];
  const missingKeys = Object.freeze(
    requiredValues.filter(([, value]) => blank(value)).map(([key]) => key),
  );
  if (missingKeys.length > 0) {
    return Object.freeze({ status: "configuration-required", missingKeys });
  }
  if (environment.VERCEL !== "1") {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  const normalized = normalizeBetterStackOtlpLogsConfiguration({
    runtimeEnvironment: environment.VERCEL_ENV,
    releaseSha: environment.VERCEL_GIT_COMMIT_SHA!,
    endpoint: environment.BETTER_STACK_OTLP_LOGS_ENDPOINT!,
    sourceToken: environment.BETTER_STACK_SOURCE_TOKEN!,
  });
  if (normalized === null) {
    return Object.freeze({ status: "invalid", missingKeys: Object.freeze([]) });
  }

  return Object.freeze({
    status: "configured",
    runtimeEnvironment: environment.VERCEL_ENV,
    releaseSha: normalized.releaseSha,
    endpoint: normalized.endpoint,
    sourceToken: normalized.sourceToken,
  });
}

function validEvent(event: VercelWebRailwayApiCallEvent): boolean {
  const validCode =
    event.code === "OK" ||
    railwayApiFailureCodes.includes(event.code as RailwayApiFailureCode) ||
    clientFailureCodes.includes(event.code as VercelRailwayApiClientFailureCode);
  const parsedTraceContext = event.traceContext === null
    ? null
    : parseW3cTraceparent(event.traceContext?.traceparent ?? null);
  const validTraceContext = event.traceContext === null || (
    parsedTraceContext !== null &&
    parsedTraceContext.traceId === event.traceContext.traceId &&
    parsedTraceContext.parentSpanId === event.traceContext.parentSpanId &&
    parsedTraceContext.traceFlags === event.traceContext.traceFlags
  );
  return (
    event.version === 1 &&
    event.service === "connect-vercel-web" &&
    event.kind === "railway-api-call" &&
    (event.operation === null ||
      (event.operation.length <= 128 && operationPattern.test(event.operation))) &&
    (event.requestKind === null ||
      event.requestKind === "query" ||
      event.requestKind === "mutation") &&
    ["ok", "remote-error", "client-error"].includes(event.outcome) &&
    validCode &&
    validTraceContext &&
    Number.isSafeInteger(event.durationMilliseconds) &&
    event.durationMilliseconds >= 0 &&
    event.durationMilliseconds <= maximumDurationMilliseconds &&
    ((event.outcome === "ok" && event.code === "OK") ||
      (event.outcome === "remote-error" &&
        railwayApiFailureCodes.includes(event.code as RailwayApiFailureCode)) ||
      (event.outcome === "client-error" &&
        clientFailureCodes.includes(event.code as VercelRailwayApiClientFailureCode)))
  );
}

function attributesForEvent(
  event: VercelWebRailwayApiCallEvent,
): Readonly<LogAttributes> {
  const attributes: LogAttributes = {
    "connect.schema.version": event.version,
    "connect.event.kind": event.kind,
    "connect.operation.outcome": event.outcome,
    "connect.event.code": event.code,
    "connect.duration.ms": event.durationMilliseconds,
  };
  if (event.operation !== null) {
    attributes["connect.operation.name"] = event.operation;
  }
  if (event.requestKind !== null) {
    attributes["connect.request.kind"] = event.requestKind;
  }
  return Object.freeze(attributes);
}

function createStdoutLogger(): Readonly<{
  record(event: VercelWebRailwayApiCallEvent): boolean;
}> {
  return Object.freeze({
    record(event: VercelWebRailwayApiCallEvent) {
      try {
        process.stdout.write(`${JSON.stringify(event)}\n`);
        return true;
      } catch {
        return false;
      }
    },
  });
}

const defaultDependencies = Object.freeze({
  stdoutLogger: createStdoutLogger(),
  createOtlpRuntime: createBetterStackOtlpLogsRuntime,
  createOtlpSignalsRuntime: createBetterStackOtlpApiSignalsRuntime,
  scheduleAfterResponse(callback: () => Promise<void>) {
    after(callback);
  },
}) satisfies VercelBetterStackTelemetryDependencies;

function requireDependencies(
  dependencies: Readonly<VercelBetterStackTelemetryDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createOtlpRuntime,createOtlpSignalsRuntime,scheduleAfterResponse,stdoutLogger" ||
    typeof dependencies.stdoutLogger?.record !== "function" ||
    typeof dependencies.createOtlpRuntime !== "function" ||
    typeof dependencies.createOtlpSignalsRuntime !== "function" ||
    typeof dependencies.scheduleAfterResponse !== "function"
  ) {
    throw new Error("Vercel Better Stack telemetry dependencies are invalid");
  }
}

export function createVercelBetterStackTelemetrySink(
  configuration: Extract<
    VercelBetterStackTelemetryConfigurationState,
    { status: "configured" }
  >,
  dependencies: Readonly<VercelBetterStackTelemetryDependencies> =
    defaultDependencies,
): VercelWebTelemetrySink {
  requireDependencies(dependencies);
  const otlp = dependencies.createOtlpRuntime(
    configuration,
    "connect-vercel-web",
  );
  const signals = dependencies.createOtlpSignalsRuntime(
    configuration,
    "connect-vercel-web",
  );
  if (
    typeof otlp?.logger?.emit !== "function" ||
    typeof otlp.forceFlush !== "function" ||
    typeof otlp.shutdown !== "function" ||
    typeof signals?.record !== "function" ||
    typeof signals.forceFlush !== "function" ||
    typeof signals.shutdown !== "function"
  ) {
    throw new Error("Vercel Better Stack telemetry runtime is invalid");
  }

  async function forceFlush(): Promise<void> {
    try {
      await Promise.all([otlp.forceFlush(), signals.forceFlush()]);
    } catch {
      // Telemetry must never change an API result or expose provider details.
    }
  }

  return Object.freeze({
    record(event: VercelWebRailwayApiCallEvent) {
      if (!validEvent(event)) {
        return false;
      }
      const stdoutRecorded = dependencies.stdoutLogger.record(event);
      try {
        const severityNumber = event.outcome === "ok"
          ? SeverityNumber.INFO
          : event.outcome === "remote-error"
            ? SeverityNumber.WARN
            : SeverityNumber.ERROR;
        otlp.logger.emit({
          eventName: "connect.railway-api-call",
          severityNumber,
          severityText: event.outcome === "ok"
            ? "INFO"
            : event.outcome === "remote-error"
              ? "WARN"
              : "ERROR",
          body: event.kind,
          attributes: attributesForEvent(event),
          context: createOpenTelemetryLogContext(event.traceContext),
        });
        const signalsRecorded = signals.record({
          role: "vercel-client",
          operation: event.operation,
          requestKind: event.requestKind,
          outcome: event.outcome,
          code: event.code,
          durationMilliseconds: event.durationMilliseconds,
          traceContext: event.traceContext,
        });
        return stdoutRecorded && signalsRecorded;
      } catch {
        return false;
      }
    },
    scheduleFlush() {
      try {
        dependencies.scheduleAfterResponse(forceFlush);
        return true;
      } catch {
        return false;
      }
    },
  });
}

const disabledSink: VercelWebTelemetrySink = Object.freeze({
  record: () => true,
  scheduleFlush: () => true,
});
let currentSink: VercelWebTelemetrySink | undefined;

export function readCurrentVercelBetterStackTelemetrySink():
VercelWebTelemetrySink {
  if (currentSink !== undefined) {
    return currentSink;
  }

  const configuration =
    inspectVercelBetterStackTelemetryConfiguration(readProcessEnvironment());
  if (configuration.status === "disabled") {
    currentSink = disabledSink;
    return currentSink;
  }
  if (configuration.status !== "configured") {
    throw new Error("Vercel Better Stack telemetry configuration is required");
  }

  currentSink = createVercelBetterStackTelemetrySink(configuration);
  return currentSink;
}
