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

export interface RailwayApiClientOptions {
  readonly apiOrigin: string;
  readonly deploymentEnvironment: VercelDeploymentEnvironment;
  readonly oidcTokenProvider: RailwayApiTokenProvider;
  readonly userSessionTokenProvider: RailwayApiTokenProvider;
  readonly fetchImplementation?: typeof fetch;
  readonly requestTimeoutMs?: number;
  readonly maximumRequestBytes?: number;
  readonly maximumResponseBytes?: number;
}

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

  if (
    typeof fetchImplementation !== "function" ||
    typeof options.oidcTokenProvider?.getToken !== "function" ||
    typeof options.userSessionTokenProvider?.getToken !== "function"
  ) {
    invalidConfiguration();
  }

  return {
    async call(request) {
      let envelope;

      try {
        envelope = parseRailwayApiRequestEnvelope(request);
      } catch {
        throw new RailwayApiClientError("INVALID_REQUEST");
      }

      const requestBody = JSON.stringify(envelope);

      if (
        new TextEncoder().encode(requestBody).byteLength >
        maximumRequestBytes
      ) {
        throw new RailwayApiClientError("INVALID_REQUEST");
      }

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
        response = await fetchImplementation(endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${userSessionToken}`,
            "content-type": "application/json; charset=utf-8",
            [VERCEL_OIDC_HEADER]: oidcToken,
          },
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

      return parsedResponse;
    },
  };
}
