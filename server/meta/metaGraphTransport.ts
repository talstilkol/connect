import type { MetaGraphConfiguration } from "./metaGraphConfiguration";
import type { SensitiveMetaAccessToken } from "./metaPorts";

const META_GRAPH_ORIGIN = "https://graph.facebook.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_MAX_REQUEST_BYTES = 1_048_576;

export type MetaGraphErrorCode =
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "API_ERROR";

export class MetaGraphError extends Error {
  readonly code: MetaGraphErrorCode;
  readonly httpStatus: number | null;
  readonly graphCode: number | null;
  readonly graphSubcode: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: MetaGraphErrorCode,
    message: string,
    details: {
      httpStatus?: number | null;
      graphCode?: number | null;
      graphSubcode?: number | null;
      retryAfterSeconds?: number | null;
    } = {},
  ) {
    super(message);
    this.name = "MetaGraphError";
    this.code = code;
    this.httpStatus = details.httpStatus ?? null;
    this.graphCode = details.graphCode ?? null;
    this.graphSubcode = details.graphSubcode ?? null;
    this.retryAfterSeconds =
      details.retryAfterSeconds ?? null;
  }
}

export interface MetaGraphRequest {
  method: "GET" | "POST" | "DELETE";
  pathSegments: readonly string[];
  accessToken: SensitiveMetaAccessToken;
  query?: Readonly<Record<string, string>>;
  jsonBody?: unknown;
}

export interface MetaGraphTransport {
  requestJson<TResult>(request: MetaGraphRequest): Promise<TResult>;
}

export interface MetaGraphTransportOptions {
  fetchImplementation?: typeof fetch;
  requestTimeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
}

interface GraphErrorShape {
  code?: unknown;
  error_subcode?: unknown;
}

function requirePositiveInteger(
  value: number,
  fieldName: string,
): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
}

function invalidRequest(message: string): never {
  throw new MetaGraphError("INVALID_REQUEST", message);
}

function encodePathSegment(value: string, index: number): string {
  const normalizedValue = value.trim();

  if (
    normalizedValue.length === 0 ||
    normalizedValue.length > 255 ||
    normalizedValue === "." ||
    normalizedValue === ".."
  ) {
    invalidRequest(`Meta Graph path segment ${index} is invalid`);
  }

  return encodeURIComponent(normalizedValue);
}

function buildRequestUrl(
  configuration: MetaGraphConfiguration,
  request: MetaGraphRequest,
): URL {
  if (request.pathSegments.length === 0) {
    invalidRequest("Meta Graph request requires a path");
  }

  const encodedPath = request.pathSegments
    .map(encodePathSegment)
    .join("/");
  const url = new URL(
    `/${configuration.apiVersion}/${encodedPath}`,
    META_GRAPH_ORIGIN,
  );

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) ||
      key.toLowerCase() === "access_token" ||
      value.length > 4096
    ) {
      invalidRequest("Meta Graph query parameter is invalid");
    }

    url.searchParams.set(key, value);
  }

  return url;
}

function requireAccessToken(
  accessToken: SensitiveMetaAccessToken,
): SensitiveMetaAccessToken {
  if (
    typeof accessToken !== "string" ||
    accessToken.trim().length === 0 ||
    accessToken.length > 8192
  ) {
    invalidRequest("Meta Graph access token is invalid");
  }

  return accessToken;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function graphErrorShape(value: unknown): GraphErrorShape | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  return value.error;
}

function validateJsonBodyValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (depth > 32) {
    invalidRequest("Meta Graph JSON body is too deeply nested");
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }

  if (typeof value !== "object") {
    invalidRequest("Meta Graph JSON body contains an invalid value");
  }

  if (seen.has(value)) {
    invalidRequest("Meta Graph JSON body is circular");
  }

  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > 10_000) {
      invalidRequest("Meta Graph JSON array is too large");
    }

    for (const item of value) {
      validateJsonBodyValue(item, seen, depth + 1);
    }
  } else {
    const entries = Object.entries(value);

    if (entries.length > 10_000) {
      invalidRequest("Meta Graph JSON object is too large");
    }

    for (const [key, item] of entries) {
      if (key.toLowerCase() === "access_token") {
        invalidRequest(
          "Meta Graph access token is not allowed in a JSON body",
        );
      }

      validateJsonBodyValue(item, seen, depth + 1);
    }
  }

  seen.delete(value);
}

function serializeJsonBody(
  request: MetaGraphRequest,
  maximumBytes: number,
): string | undefined {
  if (request.jsonBody === undefined) {
    return undefined;
  }

  if (
    request.method !== "POST" ||
    !isRecord(request.jsonBody)
  ) {
    invalidRequest(
      "Meta Graph JSON body is allowed only for POST objects",
    );
  }

  validateJsonBodyValue(
    request.jsonBody,
    new WeakSet<object>(),
    0,
  );

  let body: string;

  try {
    body = JSON.stringify(request.jsonBody);
  } catch {
    invalidRequest("Meta Graph JSON body could not be serialized");
  }

  const bodyBytes = new TextEncoder().encode(body).byteLength;

  if (bodyBytes < 2 || bodyBytes > maximumBytes) {
    invalidRequest("Meta Graph JSON body size is invalid");
  }

  return body;
}

function safeGraphNumber(value: unknown): number | null {
  return Number.isSafeInteger(value) ? (value as number) : null;
}

function safeRetryAfterSeconds(
  value: string | null,
): number | null {
  if (!value || !/^[1-9][0-9]{0,5}$/.test(value)) {
    return null;
  }

  const seconds = Number(value);

  return Number.isSafeInteger(seconds) &&
    seconds <= 24 * 60 * 60
    ? seconds
    : null;
}

async function readBoundedJson(
  response: Response,
  maximumBytes: number,
): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");

  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);

    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maximumBytes
    ) {
      throw new MetaGraphError(
        "INVALID_RESPONSE",
        "Meta Graph response size is invalid",
        { httpStatus: response.status },
      );
    }
  }

  let responseText: string;

  try {
    responseText = await response.text();
  } catch {
    throw new MetaGraphError(
      "INVALID_RESPONSE",
      "Meta Graph response could not be read",
      { httpStatus: response.status },
    );
  }

  if (
    responseText.length === 0 ||
    new TextEncoder().encode(responseText).byteLength > maximumBytes
  ) {
    throw new MetaGraphError(
      "INVALID_RESPONSE",
      "Meta Graph response body is invalid",
      { httpStatus: response.status },
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new MetaGraphError(
      "INVALID_RESPONSE",
      "Meta Graph response is not valid JSON",
      { httpStatus: response.status },
    );
  }
}

export function createMetaGraphTransport(
  configuration: MetaGraphConfiguration,
  options: MetaGraphTransportOptions = {},
): MetaGraphTransport {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const requestTimeoutMs = requirePositiveInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    "requestTimeoutMs",
  );
  const maxRequestBytes = requirePositiveInteger(
    options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES,
    "maxRequestBytes",
  );
  const maxResponseBytes = requirePositiveInteger(
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    "maxResponseBytes",
  );

  return {
    async requestJson<TResult>(
      request: MetaGraphRequest,
    ): Promise<TResult> {
      const accessToken = requireAccessToken(request.accessToken);
      const requestUrl = buildRequestUrl(configuration, request);
      const requestBody = serializeJsonBody(
        request,
        maxRequestBytes,
      );
      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        requestTimeoutMs,
      );
      let response: Response;
      const headers: Record<string, string> = {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      };

      if (requestBody !== undefined) {
        headers["content-type"] = "application/json";
      }

      try {
        response = await fetchImplementation(requestUrl, {
          method: request.method,
          headers,
          body: requestBody,
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: abortController.signal,
        });
      } catch {
        if (abortController.signal.aborted) {
          throw new MetaGraphError(
            "TIMEOUT",
            "Meta Graph request timed out",
          );
        }

        throw new MetaGraphError(
          "NETWORK_ERROR",
          "Meta Graph request failed",
        );
      } finally {
        clearTimeout(timeout);
      }

      const responsePayload = await readBoundedJson(
        response,
        maxResponseBytes,
      );
      const graphError = graphErrorShape(responsePayload);

      if (!response.ok || graphError) {
        throw new MetaGraphError(
          "API_ERROR",
          "Meta Graph request was rejected",
          {
            httpStatus: response.status,
            graphCode: safeGraphNumber(graphError?.code),
            graphSubcode: safeGraphNumber(
              graphError?.error_subcode,
            ),
            retryAfterSeconds:
              safeRetryAfterSeconds(
                response.headers.get("retry-after"),
              ),
          },
        );
      }

      return responsePayload as TResult;
    },
  };
}
