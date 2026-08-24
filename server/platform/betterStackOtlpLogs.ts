import type { Logger } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

export type BetterStackDeploymentEnvironment =
  | "preview"
  | "staging"
  | "production";

export type BetterStackServiceName =
  | "connect-vercel-web"
  | "connect-railway-api"
  | "connect-railway-worker";

export interface BetterStackOtlpLogsConfiguration {
  readonly runtimeEnvironment: BetterStackDeploymentEnvironment;
  readonly releaseSha: string;
  readonly endpoint: string;
  readonly sourceToken: string;
}

export interface BetterStackOtlpLoggerProviderRuntime {
  readonly logger: Logger;
  readonly forceFlush: () => Promise<void>;
  readonly shutdown: () => Promise<void>;
}

const releaseShaPattern = /^[a-f0-9]{40}$/;
const sourceTokenPattern = /^[\x21-\x7e]{16,256}$/;
const betterStackHostnamePattern =
  /(?:^|\.)(?:betterstack\.com|betterstackdata\.com)$/;

function canonicalBetterStackEndpoint(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      url.pathname !== "/v1/logs" ||
      !betterStackHostnamePattern.test(url.hostname)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeBetterStackOtlpLogsConfiguration(
  input: Readonly<BetterStackOtlpLogsConfiguration>,
): Readonly<BetterStackOtlpLogsConfiguration> | null {
  if (
    !input ||
    typeof input !== "object" ||
    !["preview", "staging", "production"].includes(
      input.runtimeEnvironment,
    ) ||
    !releaseShaPattern.test(input.releaseSha) ||
    !sourceTokenPattern.test(input.sourceToken)
  ) {
    return null;
  }

  const endpoint = canonicalBetterStackEndpoint(input.endpoint);
  if (endpoint === null) {
    return null;
  }

  return Object.freeze({ ...input, endpoint });
}

export function createBetterStackOtlpLogsRuntime(
  configuration: Readonly<BetterStackOtlpLogsConfiguration>,
  serviceName: BetterStackServiceName,
): BetterStackOtlpLoggerProviderRuntime {
  const normalized = normalizeBetterStackOtlpLogsConfiguration(configuration);
  if (normalized === null) {
    throw new Error("Better Stack OTLP Logs configuration is invalid");
  }

  const exporter = new OTLPLogExporter({
    url: normalized.endpoint,
    headers: { Authorization: `Bearer ${normalized.sourceToken}` },
    compression: CompressionAlgorithm.GZIP,
    concurrencyLimit: 1,
    timeoutMillis: 5_000,
  });
  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
      "service.version": normalized.releaseSha,
      "deployment.environment.name": normalized.runtimeEnvironment,
    }),
    forceFlushTimeoutMillis: 5_000,
    logRecordLimits: {
      attributeCountLimit: 32,
      attributeValueLengthLimit: 128,
    },
    processors: [new BatchLogRecordProcessor({
      exporter,
      maxQueueSize: 1_024,
      maxExportBatchSize: 128,
      scheduledDelayMillis: 1_000,
      exportTimeoutMillis: 5_000,
    })],
  });

  return Object.freeze({
    logger: provider.getLogger(serviceName.replaceAll("-", "."), "1"),
    forceFlush: () => provider.forceFlush(),
    shutdown: () => provider.shutdown(),
  });
}
