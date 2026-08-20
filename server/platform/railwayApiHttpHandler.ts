import type {
  AuthenticatedIdentity,
} from "../auth/tenantSession.ts";
import {
  createRailwayApiFailureEnvelope,
  createRailwayApiSuccessEnvelope,
  parseRailwayApiRequestEnvelope,
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiFailureCode,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
  type RailwayApiRequestKind,
  VERCEL_OIDC_HEADER,
} from "./railwayApiContract.ts";

const DEFAULT_MAXIMUM_BODY_BYTES = 262_144;
const DEFAULT_MAXIMUM_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_TOKEN_LENGTH = 8_192;
const COMPACT_JWT_PATTERN =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SAFE_IDENTITY_VALUE_PATTERN = /^[a-zA-Z0-9._-]+$/;
const RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export const vercelDeploymentEnvironments = [
  "development",
  "preview",
  "production",
] as const;

export type VercelDeploymentEnvironment =
  (typeof vercelDeploymentEnvironments)[number];

export interface ExpectedVercelServiceIdentity {
  readonly teamSlug: string;
  readonly projectName: string;
  readonly environment: VercelDeploymentEnvironment;
}

export interface VerifiedVercelServiceIdentity
  extends ExpectedVercelServiceIdentity {
  readonly provider: "vercel";
  readonly subject: string;
}

export interface VercelOidcVerifier {
  verify(
    token: string,
    expectedIdentity: Readonly<ExpectedVercelServiceIdentity>,
  ): Promise<Readonly<VerifiedVercelServiceIdentity> | null>;
}

export interface EndUserSessionVerifier {
  verify(
    sessionToken: string,
  ): Promise<Readonly<AuthenticatedIdentity> | null>;
}

export interface RailwayApiDispatchContext {
  readonly serviceIdentity: Readonly<VerifiedVercelServiceIdentity>;
  readonly userIdentity: Readonly<AuthenticatedIdentity>;
}

export interface RailwayApiOperation {
  readonly id: string;
  readonly requestKind: RailwayApiRequestKind;
  execute(
    context: Readonly<RailwayApiDispatchContext>,
    payload: RailwayApiJsonObject,
    request: Readonly<RailwayApiRequestEnvelope>,
  ): Promise<unknown>;
}

export interface RailwayApiHttpHandler {
  handle(request: Request): Promise<Response>;
}

export interface RailwayApiHttpHandlerOptions {
  readonly expectedServiceIdentity: Readonly<ExpectedVercelServiceIdentity>;
  readonly oidcVerifier: VercelOidcVerifier;
  readonly endUserSessionVerifier: EndUserSessionVerifier;
  readonly operations: readonly Readonly<RailwayApiOperation>[];
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
}

export type RailwayApiDispatchFailureCode =
  | "INVALID_REQUEST"
  | "AUTHORIZATION_DENIED"
  | "TENANT_MEMBERSHIP_REQUIRED"
  | "TENANT_SELECTION_REQUIRED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE";

const railwayApiDispatchFailureCodes = [
  "INVALID_REQUEST",
  "AUTHORIZATION_DENIED",
  "TENANT_MEMBERSHIP_REQUIRED",
  "TENANT_SELECTION_REQUIRED",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_TRANSITION",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
] as const satisfies readonly RailwayApiDispatchFailureCode[];

export class RailwayApiDispatchError extends Error {
  readonly code: RailwayApiDispatchFailureCode;

  constructor(code: RailwayApiDispatchFailureCode) {
    if (!railwayApiDispatchFailureCodes.includes(code)) {
      throw new Error("Railway API dispatch error code is invalid");
    }

    super("Railway API operation failed");
    this.name = "RailwayApiDispatchError";
    this.code = code;
  }
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

function requireIdentityValue(
  value: string,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 128 ||
    !SAFE_IDENTITY_VALUE_PATTERN.test(value)
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function normalizeExpectedIdentity(
  identity: Readonly<ExpectedVercelServiceIdentity>,
): Readonly<ExpectedVercelServiceIdentity> {
  if (
    !vercelDeploymentEnvironments.includes(
      identity.environment,
    )
  ) {
    throw new Error("Vercel environment is invalid");
  }

  return Object.freeze({
    teamSlug: requireIdentityValue(
      identity.teamSlug,
      "Vercel team slug",
    ),
    projectName: requireIdentityValue(
      identity.projectName,
      "Vercel project name",
    ),
    environment: identity.environment,
  });
}

function isCompactJwt(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAXIMUM_TOKEN_LENGTH &&
    COMPACT_JWT_PATTERN.test(value)
  );
}

function readUserSessionToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
    header,
  );

  return match && isCompactJwt(match[1])
    ? match[1]
    : null;
}

function jsonResponse(
  code: RailwayApiFailureCode,
  status: number,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(
    JSON.stringify(createRailwayApiFailureEnvelope(code)),
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        ...extraHeaders,
      },
    },
  );
}

function isJsonContentType(value: string | null): boolean {
  return /^application\/json(?:\s*;|$)/i.test(
    value?.trim() ?? "",
  );
}

function inspectDeclaredBodyLength(
  request: Request,
  maximumBodyBytes: number,
): "accepted" | "invalid" | "oversized" {
  const value = request.headers.get("content-length");

  if (value === null) {
    return "accepted";
  }

  if (!/^[0-9]+$/.test(value)) {
    return "invalid";
  }

  const length = Number(value);

  if (!Number.isSafeInteger(length)) {
    return "invalid";
  }

  return length > maximumBodyBytes
    ? "oversized"
    : "accepted";
}

function identityMatches(
  identity: Readonly<VerifiedVercelServiceIdentity>,
  expected: Readonly<ExpectedVercelServiceIdentity>,
): boolean {
  return (
    identity.provider === "vercel" &&
    identity.teamSlug === expected.teamSlug &&
    identity.projectName === expected.projectName &&
    identity.environment === expected.environment &&
    identity.subject ===
      `owner:${expected.teamSlug}:project:${expected.projectName}:environment:${expected.environment}`
  );
}

function validUserIdentity(
  identity: Readonly<AuthenticatedIdentity> | null,
): identity is Readonly<AuthenticatedIdentity> {
  return (
    identity !== null &&
    typeof identity.externalUserId === "string" &&
    identity.externalUserId.length > 0 &&
    identity.externalUserId.length <= 255
  );
}

function dispatchFailureStatus(
  code: RailwayApiDispatchFailureCode,
): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "AUTHORIZATION_DENIED":
    case "TENANT_MEMBERSHIP_REQUIRED":
    case "TENANT_SELECTION_REQUIRED":
    case "PERMISSION_DENIED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "INVALID_TRANSITION":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "DEPENDENCY_UNAVAILABLE":
      return 503;
  }
}

function createOperationMap(
  operations: readonly Readonly<RailwayApiOperation>[],
): ReadonlyMap<string, Readonly<RailwayApiOperation>> {
  if (operations.length === 0 || operations.length > 256) {
    throw new Error("Railway API operations are invalid");
  }

  const operationMap = new Map<string, Readonly<RailwayApiOperation>>();

  for (const operation of operations) {
    parseRailwayApiRequestEnvelope({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation: operation.id,
      requestKind: operation.requestKind,
      idempotencyKey:
        operation.requestKind === "mutation"
          ? `connect_idempotency_v1_${"0".repeat(64)}`
          : null,
      payload: {},
    });

    if (
      typeof operation.execute !== "function" ||
      operationMap.has(operation.id)
    ) {
      throw new Error("Railway API operations are invalid");
    }

    operationMap.set(
      operation.id,
      Object.freeze({ ...operation }),
    );
  }

  return operationMap;
}

class RailwayApiRequestBodyError extends Error {
  readonly code: "INVALID" | "OVERSIZED";

  constructor(code: "INVALID" | "OVERSIZED") {
    super("Railway API request body is invalid");
    this.name = "RailwayApiRequestBodyError";
    this.code = code;
  }
}

async function readBoundedRequestBody(
  request: Request,
  maximumBodyBytes: number,
): Promise<Uint8Array> {
  if (!request.body) {
    throw new RailwayApiRequestBodyError("INVALID");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      totalBytes += result.value.byteLength;

      if (totalBytes > maximumBodyBytes) {
        await reader.cancel();
        throw new RailwayApiRequestBodyError("OVERSIZED");
      }

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new RailwayApiRequestBodyError("INVALID");
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

async function readJsonBody(
  request: Request,
  maximumBodyBytes: number,
): Promise<unknown> {
  const bytes = await readBoundedRequestBody(
    request,
    maximumBodyBytes,
  );

  let text: string;

  try {
    text = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);

    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RailwayApiRequestBodyError) {
      throw error;
    }

    throw new RailwayApiRequestBodyError("INVALID");
  }
}

export function createRailwayApiHttpHandler(
  options: Readonly<RailwayApiHttpHandlerOptions>,
): RailwayApiHttpHandler {
  const expectedIdentity = normalizeExpectedIdentity(
    options.expectedServiceIdentity,
  );
  const operations = createOperationMap(options.operations);
  const maximumBodyBytes = requirePositiveInteger(
    options.maximumBodyBytes ?? DEFAULT_MAXIMUM_BODY_BYTES,
    "maximumBodyBytes",
  );
  const maximumResponseBytes = requirePositiveInteger(
    options.maximumResponseBytes ?? DEFAULT_MAXIMUM_RESPONSE_BYTES,
    "maximumResponseBytes",
  );

  if (
    typeof options.oidcVerifier?.verify !== "function" ||
    typeof options.endUserSessionVerifier?.verify !== "function"
  ) {
    throw new Error("Railway API identity verifiers are invalid");
  }

  return {
    async handle(request) {
      if (request.method !== "POST") {
        return jsonResponse("INVALID_REQUEST", 405, {
          allow: "POST",
        });
      }

      if (!isJsonContentType(request.headers.get("content-type"))) {
        return jsonResponse("INVALID_REQUEST", 415);
      }

      const contentEncoding = request.headers.get("content-encoding");

      if (
        contentEncoding !== null &&
        contentEncoding.trim().toLowerCase() !== "identity"
      ) {
        return jsonResponse("INVALID_REQUEST", 415);
      }

      const declaredLength = inspectDeclaredBodyLength(
        request,
        maximumBodyBytes,
      );

      if (declaredLength === "oversized") {
        return jsonResponse("INVALID_REQUEST", 413);
      }

      if (declaredLength === "invalid") {
        return jsonResponse("INVALID_REQUEST", 400);
      }

      const oidcToken = request.headers.get(VERCEL_OIDC_HEADER);

      if (!isCompactJwt(oidcToken)) {
        return jsonResponse(
          "SERVICE_AUTHENTICATION_REQUIRED",
          401,
        );
      }

      let serviceIdentity;

      try {
        serviceIdentity = await options.oidcVerifier.verify(
          oidcToken,
          expectedIdentity,
        );
      } catch {
        return jsonResponse("DEPENDENCY_UNAVAILABLE", 503);
      }

      if (
        serviceIdentity === null ||
        !identityMatches(serviceIdentity, expectedIdentity)
      ) {
        return jsonResponse(
          "SERVICE_AUTHENTICATION_REQUIRED",
          401,
        );
      }

      const userSessionToken = readUserSessionToken(request);

      if (!userSessionToken) {
        return jsonResponse(
          "USER_AUTHENTICATION_REQUIRED",
          401,
        );
      }

      let userIdentity;

      try {
        userIdentity = await options.endUserSessionVerifier.verify(
          userSessionToken,
        );
      } catch {
        return jsonResponse("DEPENDENCY_UNAVAILABLE", 503);
      }

      if (!validUserIdentity(userIdentity)) {
        return jsonResponse(
          "USER_AUTHENTICATION_REQUIRED",
          401,
        );
      }

      let envelope;

      try {
        envelope = parseRailwayApiRequestEnvelope(
          await readJsonBody(request, maximumBodyBytes),
        );
      } catch (error) {
        if (
          error instanceof RailwayApiRequestBodyError &&
          error.code === "OVERSIZED"
        ) {
          return jsonResponse("INVALID_REQUEST", 413);
        }

        return jsonResponse("INVALID_REQUEST", 400);
      }

      const operation = operations.get(envelope.operation);

      if (
        !operation ||
        operation.requestKind !== envelope.requestKind
      ) {
        return jsonResponse("INVALID_REQUEST", 400);
      }

      const context = Object.freeze({
        serviceIdentity: Object.freeze({ ...serviceIdentity }),
        userIdentity: Object.freeze({ ...userIdentity }),
      });

      try {
        const result = await operation.execute(
          context,
          envelope.payload,
          envelope,
        );
        const responseBody = JSON.stringify(
          createRailwayApiSuccessEnvelope(result),
        );

        if (
          new TextEncoder().encode(responseBody).byteLength >
          maximumResponseBytes
        ) {
          return jsonResponse("SERVER_ERROR", 500);
        }

        return new Response(responseBody, {
          status: 200,
          headers: RESPONSE_HEADERS,
        });
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) {
          return jsonResponse(
            error.code,
            dispatchFailureStatus(error.code),
          );
        }

        return jsonResponse("SERVER_ERROR", 500);
      }
    },
  };
}
