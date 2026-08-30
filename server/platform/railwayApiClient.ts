import {
  parseRailwayApiRequestEnvelope,
  parseRailwayApiResponseEnvelope,
  RAILWAY_API_ENDPOINT_PATH,
  type RailwayApiRequestEnvelope,
  type RailwayApiResponseEnvelope,
  VERCEL_OIDC_HEADER,
} from "./railwayApiContract.ts";
import type {
  VercelDeploymentEnvironment,
} from "./railwayApiHttpHandler.ts";
import {
  readCurrentVercelBetterStackTelemetrySink,
  type VercelWebRailwayApiCallEvent,
  type VercelWebTelemetrySink,
} from "./vercelBetterStackTelemetry.ts";
import {
  readCurrentVercelOpaqueTraceContext,
} from "./currentVercelOpaqueTraceContext.ts";
import {
  parseW3cTraceparent,
  W3C_TRACEPARENT_HEADER,
  type W3cTraceContext,
} from "./w3cTraceContext.ts";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAXIMUM_REQUEST_BYTES = 262_144;
const DEFAULT_MAXIMUM_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_TOKEN_LENGTH = 8_192;
const COMPACT_JWT_PATTERN =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export type RailwayApiClientErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_UNAVAILABLE"
  | "CORRELATION_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export class RailwayApiClientError extends Error {
  readonly code: RailwayApiClientErrorCode;

  constructor(code: RailwayApiClientErrorCode) {
    super("Railway API client failed");
    this.name = "RailwayApiClientError";
    this.code = code;
  }
}

export interface RailwayApiTokenProvider {
  getToken(): Promise<string | null>;
}

export interface RailwayApiClient {
  call(
    request: Readonly<RailwayApiRequestEnvelope>,
  ): Promise<Readonly<RailwayApiResponseEnvelope>>;
}

export interface RailwayApiTraceparentProvider {
  getTraceparent(): Promise<string | null>;
}

export interface RailwayApiClientOptions {
  readonly apiOrigin: string;
  readonly deploymentEnvironment: VercelDeploymentEnvironment;
  readonly oidcTokenProvider: RailwayApiTokenProvider;
  readonly userSessionTokenProvider: RailwayApiTokenProvider;
  readonly fetchImplementation?: typeof fetch;
  readonly requestTimeoutMs?: number;
  readonly maximumRequestBytes?: number;
  readonly maximumResponseBytes?: number;
  readonly telemetry?: VercelWebTelemetrySink;
  readonly traceparentProvider?: RailwayApiTraceparentProvider;
  readonly clock?: () => number;
}

const currentTraceparentProvider: RailwayApiTraceparentProvider =
  Object.freeze({
    async getTraceparent(): Promise<string | null> {
      return (await readCurrentVercelOpaqueTraceContext())?.traceparent ?? null;
    },
  });

function invalidConfiguration(): never {
  throw new RailwayApiClientError("INVALID_CONFIGURATION");
}

function requirePositiveInteger(
  value: number,
): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    invalidConfiguration();
  }

  return value;
}

function readClock(clock: () => number): number | null {
  try {
    const value = clock();
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function boundedDuration(
  startedAt: number | null,
  completedAt: number | null,
): number {
  if (
    startedAt === null ||
    completedAt === null ||
    completedAt < startedAt
  ) {
    return 0;
  }

  return Math.min(completedAt - startedAt, 300_000);
}

function isDevelopmentLoopback(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]")
  );
}

function parseApiOrigin(
  value: string,
  environment: VercelDeploymentEnvironment,
): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    invalidConfiguration();
  }

  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    (url.protocol !== "https:" &&
      !(
        environment === "development" &&
        isDevelopmentLoopback(url)
      ))
  ) {
    invalidConfiguration();
  }

  return new URL(RAILWAY_API_ENDPOINT_PATH, url.origin);
}

function validCompactJwt(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAXIMUM_TOKEN_LENGTH &&
    COMPACT_JWT_PATTERN.test(value)
  );
}

async function requireToken(
  provider: RailwayApiTokenProvider,
): Promise<string> {
  let token: string | null;

  try {
    token = await provider.getToken();
  } catch {
    throw new RailwayApiClientError(
      "AUTHENTICATION_UNAVAILABLE",
    );
  }

  if (!validCompactJwt(token)) {
    throw new RailwayApiClientError(
      "AUTHENTICATION_UNAVAILABLE",
    );
  }

  return token;
}

async function readTraceContext(
  provider: RailwayApiTraceparentProvider,
): Promise<W3cTraceContext | null> {
  let traceparent: string | null;

  try {
    traceparent = await provider.getTraceparent();
  } catch {
    throw new RailwayApiClientError("CORRELATION_UNAVAILABLE");
  }

  if (traceparent === null) {
    return null;
  }

  const parsed = parseW3cTraceparent(traceparent);
  if (parsed === null) {
    throw new RailwayApiClientError("CORRELATION_UNAVAILABLE");
  }

  return parsed;
}

function inspectResponseLength(
  response: Response,
  maximumResponseBytes: number,
): void {
  const value = response.headers.get("content-length");

  if (value === null) {
    return;
  }

  if (!/^[0-9]+$/.test(value)) {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }

  const length = Number(value);

  if (
    !Number.isSafeInteger(length) ||
    length > maximumResponseBytes
  ) {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }
}

async function readBoundedResponseBody(
  response: Response,
  maximumResponseBytes: number,
): Promise<Uint8Array> {
  inspectResponseLength(response, maximumResponseBytes);

  if (!response.body) {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      totalBytes += result.value.byteLength;

      if (totalBytes > maximumResponseBytes) {
        await reader.cancel();
        throw new RailwayApiClientError("INVALID_RESPONSE");
      }

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

function isJsonContentType(value: string | null): boolean {
  return /^application\/json(?:\s*;|$)/i.test(
    value?.trim() ?? "",
  );
}

function parseResponseBody(
  body: Uint8Array,
): Readonly<RailwayApiResponseEnvelope> {
  let value: unknown;

  try {
    const text = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(body);
    value = JSON.parse(text) as unknown;
  } catch {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }

  try {
    return parseRailwayApiResponseEnvelope(value);
  } catch {
    throw new RailwayApiClientError("INVALID_RESPONSE");
  }
}

export function createRailwayApiClient(
  options: Readonly<RailwayApiClientOptions>,
): RailwayApiClient {
  const endpoint = parseApiOrigin(
    options.apiOrigin,
    options.deploymentEnvironment,
  );
  const requestTimeoutMs = requirePositiveInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  );
  const maximumRequestBytes = requirePositiveInteger(
    options.maximumRequestBytes ?? DEFAULT_MAXIMUM_REQUEST_BYTES,
  );
  const maximumResponseBytes = requirePositiveInteger(
    options.maximumResponseBytes ?? DEFAULT_MAXIMUM_RESPONSE_BYTES,
  );
  const fetchImplementation =
    options.fetchImplementation ?? fetch;
  const clock = options.clock ?? Date.now;
  const traceparentProvider =
    options.traceparentProvider ?? currentTraceparentProvider;
  let telemetry: VercelWebTelemetrySink;

  try {
    telemetry =
      options.telemetry ?? readCurrentVercelBetterStackTelemetrySink();
  } catch {
    invalidConfiguration();
  }

  if (
    typeof fetchImplementation !== "function" ||
    typeof clock !== "function" ||
    typeof options.oidcTokenProvider?.getToken !== "function" ||
    typeof options.userSessionTokenProvider?.getToken !== "function" ||
    typeof traceparentProvider.getTraceparent !== "function" ||
    typeof telemetry.record !== "function" ||
    typeof telemetry.scheduleFlush !== "function"
  ) {
    invalidConfiguration();
  }

  return {
    async call(request) {
      const startedAt = readClock(clock);
      let operation: string | null = null;
      let requestKind: RailwayApiRequestEnvelope["requestKind"] | null = null;
      let outcome: VercelWebRailwayApiCallEvent["outcome"] = "client-error";
      let code: VercelWebRailwayApiCallEvent["code"] = "INVALID_REQUEST";
      let traceContext: W3cTraceContext | null = null;

      try {
        let envelope;

        try {
          envelope = parseRailwayApiRequestEnvelope(request);
        } catch {
          throw new RailwayApiClientError("INVALID_REQUEST");
        }
        operation = envelope.operation;
        requestKind = envelope.requestKind;

        const requestBody = JSON.stringify(envelope);

        if (
          new TextEncoder().encode(requestBody).byteLength >
          maximumRequestBytes
        ) {
          throw new RailwayApiClientError("INVALID_REQUEST");
        }

        traceContext = await readTraceContext(traceparentProvider);

        const [oidcToken, userSessionToken] = await Promise.all([
          requireToken(options.oidcTokenProvider),
          requireToken(options.userSessionTokenProvider),
        ]);
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          requestTimeoutMs,
        );
        let response: Response;

        try {
          const requestHeaders: Record<string, string> = {
            authorization: `Bearer ${userSessionToken}`,
            "content-type": "application/json; charset=utf-8",
            [VERCEL_OIDC_HEADER]: oidcToken,
          };
          if (traceContext !== null) {
            requestHeaders[W3C_TRACEPARENT_HEADER] =
              traceContext.traceparent;
          }

          response = await fetchImplementation(endpoint, {
            method: "POST",
            headers: requestHeaders,
            body: requestBody,
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
            signal: controller.signal,
          });
        } catch {
          if (controller.signal.aborted) {
            throw new RailwayApiClientError("TIMEOUT");
          }

          throw new RailwayApiClientError("NETWORK_ERROR");
        } finally {
          clearTimeout(timeout);
        }

        if (!isJsonContentType(response.headers.get("content-type"))) {
          throw new RailwayApiClientError("INVALID_RESPONSE");
        }

        const parsedResponse = parseResponseBody(
          await readBoundedResponseBody(
            response,
            maximumResponseBytes,
          ),
        );

        if (
          (parsedResponse.outcome === "ok" && response.status !== 200) ||
          (parsedResponse.outcome === "error" && response.status < 400)
        ) {
          throw new RailwayApiClientError("INVALID_RESPONSE");
        }

        outcome = parsedResponse.outcome === "ok" ? "ok" : "remote-error";
        code = parsedResponse.outcome === "ok" ? "OK" : parsedResponse.code;
        return parsedResponse;
      } catch (error) {
        outcome = "client-error";
        code = error instanceof RailwayApiClientError
          ? error.code
          : "INVALID_RESPONSE";
        throw error;
      } finally {
        const event = Object.freeze({
          version: 1,
          service: "connect-vercel-web",
          kind: "railway-api-call",
          operation,
          requestKind,
          outcome,
          code,
          traceContext,
          durationMilliseconds: boundedDuration(
            startedAt,
            readClock(clock),
          ),
        }) satisfies VercelWebRailwayApiCallEvent;
        try {
          telemetry.record(event);
        } catch {
          // Telemetry cannot change an API result.
        }
        try {
          telemetry.scheduleFlush();
        } catch {
          // Telemetry cannot change an API result.
        }
      }
    },
  };
}
