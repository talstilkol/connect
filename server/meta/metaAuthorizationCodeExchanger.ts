import {
  requireMetaAuthorizationCodeExchangeConfiguration,
  type MetaAuthorizationCodeExchangeConfiguration,
} from "./metaAuthorizationCodeExchangeConfiguration.ts";
import {
  toSensitiveMetaAccessToken,
  type MetaAuthorizationCodeExchanger,
} from "./metaPorts.ts";

const META_GRAPH_ORIGIN = "https://graph.facebook.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_AUTHORIZATION_CODE_LENGTH = 4096;

export type MetaAuthorizationCodeExchangeErrorCode =
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "EXCHANGE_REJECTED";

export class MetaAuthorizationCodeExchangeError extends Error {
  readonly code: MetaAuthorizationCodeExchangeErrorCode;
  readonly httpStatus: number | null;
  readonly graphCode: number | null;
  readonly graphSubcode: number | null;

  constructor(
    code: MetaAuthorizationCodeExchangeErrorCode,
    message: string,
    details: {
      httpStatus?: number | null;
      graphCode?: number | null;
      graphSubcode?: number | null;
    } = {},
  ) {
    super(message);
    this.name = "MetaAuthorizationCodeExchangeError";
    this.code = code;
    this.httpStatus = details.httpStatus ?? null;
    this.graphCode = details.graphCode ?? null;
    this.graphSubcode = details.graphSubcode ?? null;
  }
}

export interface MetaAuthorizationCodeExchangerOptions {
  fetchImplementation?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
}

interface MetaGraphErrorShape {
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

function requireAuthorizationCode(
  value: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > MAX_AUTHORIZATION_CODE_LENGTH
  ) {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_REQUEST",
      "Meta authorization code is invalid",
    );
  }

  return value;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function graphErrorShape(
  value: unknown,
): MetaGraphErrorShape | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  return value.error;
}

function safeGraphNumber(value: unknown): number | null {
  return Number.isSafeInteger(value) ? (value as number) : null;
}

function buildExchangeUrl(
  configuration: MetaAuthorizationCodeExchangeConfiguration,
  authorizationCode: string,
): URL {
  const url = new URL(
    `/${configuration.apiVersion}/oauth/access_token`,
    META_GRAPH_ORIGIN,
  );

  url.searchParams.set("client_id", configuration.appId);
  url.searchParams.set(
    "client_secret",
    configuration.appSecret,
  );
  url.searchParams.set("code", authorizationCode);

  return url;
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
      throw new MetaAuthorizationCodeExchangeError(
        "INVALID_RESPONSE",
        "Meta code exchange response size is invalid",
        { httpStatus: response.status },
      );
    }
  }

  let responseText: string;

  try {
    responseText = await response.text();
  } catch {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_RESPONSE",
      "Meta code exchange response could not be read",
      { httpStatus: response.status },
    );
  }

  if (
    responseText.length === 0 ||
    new TextEncoder().encode(responseText).byteLength >
      maximumBytes
  ) {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_RESPONSE",
      "Meta code exchange response body is invalid",
      { httpStatus: response.status },
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_RESPONSE",
      "Meta code exchange response is not valid JSON",
      { httpStatus: response.status },
    );
  }
}

function requireAccessToken(
  responsePayload: unknown,
  httpStatus: number,
): ReturnType<typeof toSensitiveMetaAccessToken> {
  if (
    !isRecord(responsePayload) ||
    typeof responsePayload.access_token !== "string"
  ) {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_RESPONSE",
      "Meta code exchange response does not contain a token",
      { httpStatus },
    );
  }

  try {
    return toSensitiveMetaAccessToken(
      responsePayload.access_token,
    );
  } catch {
    throw new MetaAuthorizationCodeExchangeError(
      "INVALID_RESPONSE",
      "Meta code exchange returned an invalid token",
      { httpStatus },
    );
  }
}

export function createMetaAuthorizationCodeExchanger(
  configuration: MetaAuthorizationCodeExchangeConfiguration,
  options: MetaAuthorizationCodeExchangerOptions = {},
): MetaAuthorizationCodeExchanger {
  const validatedConfiguration =
    requireMetaAuthorizationCodeExchangeConfiguration({
      META_APP_ID: configuration.appId,
      META_APP_SECRET: configuration.appSecret,
      META_GRAPH_API_VERSION: configuration.apiVersion,
    });
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const requestTimeoutMs = requirePositiveInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    "requestTimeoutMs",
  );
  const maxResponseBytes = requirePositiveInteger(
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    "maxResponseBytes",
  );

  return {
    async exchangeAuthorizationCode(authorizationCode) {
      const normalizedCode = requireAuthorizationCode(
        authorizationCode,
      );
      const requestUrl = buildExchangeUrl(
        validatedConfiguration,
        normalizedCode,
      );
      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        requestTimeoutMs,
      );
      let response: Response;
      let responsePayload: unknown;

      try {
        response = await fetchImplementation(requestUrl, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: abortController.signal,
        });
        responsePayload = await readBoundedJson(
          response,
          maxResponseBytes,
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          throw new MetaAuthorizationCodeExchangeError(
            "TIMEOUT",
            "Meta code exchange timed out",
          );
        }

        if (error instanceof MetaAuthorizationCodeExchangeError) {
          throw error;
        }

        throw new MetaAuthorizationCodeExchangeError(
          "NETWORK_ERROR",
          "Meta code exchange request failed",
        );
      } finally {
        clearTimeout(timeout);
      }

      const graphError = graphErrorShape(responsePayload);

      if (!response.ok || graphError) {
        throw new MetaAuthorizationCodeExchangeError(
          "EXCHANGE_REJECTED",
          "Meta authorization code was rejected",
          {
            httpStatus: response.status,
            graphCode: safeGraphNumber(graphError?.code),
            graphSubcode: safeGraphNumber(
              graphError?.error_subcode,
            ),
          },
        );
      }

      return requireAccessToken(
        responsePayload,
        response.status,
      );
    },
  };
}
