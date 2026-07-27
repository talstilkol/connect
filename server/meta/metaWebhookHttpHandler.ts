import {
  MetaWebhookEnvelopeError,
} from "./metaWebhookEnvelope.ts";
import {
  MetaWebhookIngressError,
} from "./metaWebhookIngress.ts";
import {
  MetaWebhookQueuePublisherError,
} from "./metaWebhookQueuePublisher.ts";
import {
  verifyMetaWebhookChallenge,
} from "./metaWebhookSecurity.ts";

const DEFAULT_MAXIMUM_BODY_BYTES = 1_048_576;
const MAXIMUM_QUERY_VALUE_LENGTH = 4096;
const RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/plain; charset=utf-8",
  "x-content-type-options": "nosniff",
} as const;

export interface MetaWebhookHttpHandler {
  handle(request: Request): Promise<Response>;
}

export interface MetaWebhookReceiver {
  receive(
    rawPayload: Uint8Array,
    signatureHeader: string | null,
  ): Promise<unknown>;
}

export interface MetaWebhookHttpHandlerOptions {
  maximumBodyBytes?: number;
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

function plainTextResponse(
  body: string,
  status: number,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      ...RESPONSE_HEADERS,
      ...extraHeaders,
    },
  });
}

function readSingleQueryValue(
  searchParams: URLSearchParams,
  name: string,
): string | null {
  const values = searchParams.getAll(name);

  if (
    values.length !== 1 ||
    values[0].length > MAXIMUM_QUERY_VALUE_LENGTH
  ) {
    return null;
  }

  return values[0];
}

function handleChallenge(
  request: Request,
  verifyToken: string,
): Response {
  const requestUrl = new URL(request.url);
  const result = verifyMetaWebhookChallenge(
    {
      mode: readSingleQueryValue(
        requestUrl.searchParams,
        "hub.mode",
      ),
      verifyToken: readSingleQueryValue(
        requestUrl.searchParams,
        "hub.verify_token",
      ),
      challenge: readSingleQueryValue(
        requestUrl.searchParams,
        "hub.challenge",
      ),
    },
    verifyToken,
  );

  if (!result.accepted) {
    return plainTextResponse("FORBIDDEN", 403);
  }

  return plainTextResponse(result.challenge, 200);
}

function isJsonContentType(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return /^application\/json(?:\s*;|$)/i.test(value.trim());
}

function inspectDeclaredBodyLength(
  request: Request,
  maximumBodyBytes: number,
): "accepted" | "invalid" | "oversized" {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength === null) {
    return "accepted";
  }

  if (!/^[0-9]+$/.test(declaredLength)) {
    return "invalid";
  }

  const parsedLength = Number(declaredLength);

  if (!Number.isSafeInteger(parsedLength)) {
    return "invalid";
  }

  return parsedLength > maximumBodyBytes
    ? "oversized"
    : "accepted";
}

function mapIngressFailure(error: unknown): Response {
  if (error instanceof MetaWebhookEnvelopeError) {
    return plainTextResponse("INVALID_EVENT", 400);
  }

  if (error instanceof MetaWebhookIngressError) {
    if (error.code === "INVALID_SIGNATURE") {
      return plainTextResponse("INVALID_SIGNATURE", 401);
    }

    if (error.code === "CONNECTION_NOT_FOUND") {
      return plainTextResponse("CONNECTION_NOT_FOUND", 404);
    }

    return plainTextResponse("RETRY_LATER", 503);
  }

  if (error instanceof MetaWebhookQueuePublisherError) {
    if (error.code === "PAYLOAD_TOO_LARGE") {
      return plainTextResponse("PAYLOAD_TOO_LARGE", 413);
    }

    if (error.code === "RATE_LIMITED") {
      return plainTextResponse("RATE_LIMITED", 429);
    }

    return plainTextResponse("RETRY_LATER", 503);
  }

  return plainTextResponse("SERVER_ERROR", 500);
}

async function handleEvent(
  request: Request,
  ingress: MetaWebhookReceiver,
  maximumBodyBytes: number,
): Promise<Response> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return plainTextResponse("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const contentEncoding = request.headers.get("content-encoding");

  if (
    contentEncoding !== null &&
    contentEncoding.trim().toLowerCase() !== "identity"
  ) {
    return plainTextResponse("UNSUPPORTED_CONTENT_ENCODING", 415);
  }

  const signatureHeader = request.headers.get(
    "x-hub-signature-256",
  );

  if (!/^sha256=[0-9a-f]{64}$/.test(signatureHeader ?? "")) {
    return plainTextResponse("INVALID_SIGNATURE", 401);
  }

  const declaredLength = inspectDeclaredBodyLength(
    request,
    maximumBodyBytes,
  );

  if (declaredLength === "invalid") {
    return plainTextResponse("INVALID_CONTENT_LENGTH", 400);
  }

  if (declaredLength === "oversized") {
    return plainTextResponse("PAYLOAD_TOO_LARGE", 413);
  }

  let rawPayload: Uint8Array;

  try {
    rawPayload = new Uint8Array(await request.arrayBuffer());
  } catch {
    return plainTextResponse("INVALID_BODY", 400);
  }

  if (rawPayload.byteLength === 0) {
    return plainTextResponse("INVALID_BODY", 400);
  }

  if (rawPayload.byteLength > maximumBodyBytes) {
    return plainTextResponse("PAYLOAD_TOO_LARGE", 413);
  }

  try {
    await ingress.receive(rawPayload, signatureHeader);

    return plainTextResponse("EVENT_RECEIVED", 200);
  } catch (error) {
    return mapIngressFailure(error);
  }
}

export function createMetaWebhookHttpHandler(
  ingress: MetaWebhookReceiver,
  verifyToken: string,
  options: MetaWebhookHttpHandlerOptions = {},
): MetaWebhookHttpHandler {
  if (
    typeof verifyToken !== "string" ||
    verifyToken.trim().length === 0
  ) {
    throw new Error("META_WEBHOOK_VERIFY_TOKEN must be configured");
  }

  const maximumBodyBytes = requirePositiveInteger(
    options.maximumBodyBytes ?? DEFAULT_MAXIMUM_BODY_BYTES,
    "maximumBodyBytes",
  );

  return {
    async handle(request) {
      if (request.method === "GET") {
        return handleChallenge(request, verifyToken);
      }

      if (request.method === "POST") {
        return handleEvent(
          request,
          ingress,
          maximumBodyBytes,
        );
      }

      return plainTextResponse("METHOD_NOT_ALLOWED", 405, {
        allow: "GET, POST",
      });
    },
  };
}
