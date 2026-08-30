export const RAILWAY_API_CONTRACT_VERSION =
  "connect.railway-api.v1" as const;
export const RAILWAY_API_ENDPOINT_PATH = "/v1/connect" as const;
export const VERCEL_OIDC_HEADER =
  "x-vercel-oidc-token" as const;

export const railwayApiRequestKinds = [
  "query",
  "mutation",
] as const;

export type RailwayApiRequestKind =
  (typeof railwayApiRequestKinds)[number];

export const railwayApiFailureCodes = [
  "INVALID_REQUEST",
  "CONFIGURATION_REQUIRED",
  "SERVICE_AUTHENTICATION_REQUIRED",
  "USER_AUTHENTICATION_REQUIRED",
  "IDENTITY_VERIFICATION_REQUIRED",
  "AUTHORIZATION_DENIED",
  "TENANT_MEMBERSHIP_REQUIRED",
  "TENANT_SELECTION_REQUIRED",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_TRANSITION",
  "INVITATION_UNAVAILABLE",
  "STALE_SESSION",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "SERVER_ERROR",
] as const;

export type RailwayApiFailureCode =
  (typeof railwayApiFailureCodes)[number];

export type RailwayApiJsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type RailwayApiJsonValue =
  | RailwayApiJsonPrimitive
  | readonly RailwayApiJsonValue[]
  | RailwayApiJsonObject;

export interface RailwayApiJsonObject {
  readonly [key: string]: RailwayApiJsonValue;
}

export interface RailwayApiRequestEnvelope {
  readonly contractVersion: typeof RAILWAY_API_CONTRACT_VERSION;
  readonly operation: string;
  readonly requestKind: RailwayApiRequestKind;
  readonly idempotencyKey: string | null;
  readonly payload: RailwayApiJsonObject;
}

export interface RailwayApiSuccessEnvelope {
  readonly contractVersion: typeof RAILWAY_API_CONTRACT_VERSION;
  readonly outcome: "ok";
  readonly data: RailwayApiJsonValue;
}

export interface RailwayApiFailureEnvelope {
  readonly contractVersion: typeof RAILWAY_API_CONTRACT_VERSION;
  readonly outcome: "error";
  readonly code: RailwayApiFailureCode;
}

export type RailwayApiResponseEnvelope =
  | RailwayApiSuccessEnvelope
  | RailwayApiFailureEnvelope;

export class RailwayApiContractError extends Error {
  constructor() {
    super("Railway API contract validation failed");
    this.name = "RailwayApiContractError";
  }
}

const OPERATION_PATTERN =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){1,3}$/;
const IDEMPOTENCY_KEY_PATTERN =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;
const MAXIMUM_OPERATION_LENGTH = 128;
const MAXIMUM_KEY_LENGTH = 128;
const MAXIMUM_STRING_LENGTH = 16_384;
const MAXIMUM_ARRAY_LENGTH = 1_000;
const MAXIMUM_OBJECT_KEYS = 128;
const MAXIMUM_JSON_DEPTH = 12;
const MAXIMUM_JSON_NODES = 4_096;

const forbiddenPayloadKeys = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "awsaccesskeyid",
  "awssecretaccesskey",
  "blobreadwritetoken",
  "clientsecret",
  "cookie",
  "databaseurl",
  "externaluserid",
  "metaaccesstoken",
  "metaappsecret",
  "organizationid",
  "password",
  "phonenumberid",
  "privatekey",
  "refreshtoken",
  "redisurl",
  "secret",
  "secretkey",
  "sessionid",
  "tenantid",
  "userid",
  "wabaid",
]);

const dangerousObjectKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function invalidContract(): never {
  throw new RailwayApiContractError();
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

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every(
      (key, index) => key === sortedExpectedKeys[index],
    )
  );
}

function normalizedSecurityKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface JsonNormalizationState {
  nodes: number;
  readonly seen: WeakSet<object>;
}

function normalizeJsonValue(
  value: unknown,
  depth: number,
  state: JsonNormalizationState,
): RailwayApiJsonValue {
  state.nodes += 1;

  if (
    depth > MAXIMUM_JSON_DEPTH ||
    state.nodes > MAXIMUM_JSON_NODES
  ) {
    invalidContract();
  }

  if (
    value === null ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalidContract();
    }

    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === "string") {
    if (value.length > MAXIMUM_STRING_LENGTH) {
      invalidContract();
    }

    return value;
  }

  if (typeof value !== "object" || value === null) {
    invalidContract();
  }

  if (state.seen.has(value)) {
    invalidContract();
  }

  state.seen.add(value);

  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);

      if (
        value.length > MAXIMUM_ARRAY_LENGTH ||
        ownKeys.length !== value.length + 1 ||
        ownKeys.some(
          (key) =>
            key !== "length" &&
            (typeof key !== "string" ||
              !/^(?:0|[1-9][0-9]*)$/.test(key)),
        )
      ) {
        invalidContract();
      }

      const normalizedItems: RailwayApiJsonValue[] = [];

      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          invalidContract();
        }

        normalizedItems.push(
          normalizeJsonValue(value[index], depth + 1, state),
        );
      }

      return Object.freeze(normalizedItems);
    }

    const prototype = Object.getPrototypeOf(value);
    const ownKeys = Reflect.ownKeys(value);

    if (
      (prototype !== Object.prototype && prototype !== null) ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      invalidContract();
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries = Object.entries(descriptors);

    if (entries.length > MAXIMUM_OBJECT_KEYS) {
      invalidContract();
    }

    const normalized: Record<string, RailwayApiJsonValue> = {};

    for (const [key, descriptor] of entries) {
      if (
        key.length === 0 ||
        key.length > MAXIMUM_KEY_LENGTH ||
        /[\u0000-\u001f\u007f]/.test(key) ||
        dangerousObjectKeys.has(key) ||
        forbiddenPayloadKeys.has(normalizedSecurityKey(key)) ||
        !("value" in descriptor)
      ) {
        invalidContract();
      }

      normalized[key] = normalizeJsonValue(
        descriptor.value,
        depth + 1,
        state,
      );
    }

    return Object.freeze(normalized);
  } finally {
    state.seen.delete(value);
  }
}

export function normalizeRailwayApiJson(
  value: unknown,
): RailwayApiJsonValue {
  return normalizeJsonValue(value, 0, {
    nodes: 0,
    seen: new WeakSet<object>(),
  });
}

export function parseRailwayApiRequestEnvelope(
  value: unknown,
): Readonly<RailwayApiRequestEnvelope> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "contractVersion",
      "operation",
      "requestKind",
      "idempotencyKey",
      "payload",
    ]) ||
    value.contractVersion !== RAILWAY_API_CONTRACT_VERSION ||
    typeof value.operation !== "string" ||
    value.operation.length > MAXIMUM_OPERATION_LENGTH ||
    !OPERATION_PATTERN.test(value.operation) ||
    !railwayApiRequestKinds.includes(
      value.requestKind as RailwayApiRequestKind,
    ) ||
    !isRecord(value.payload)
  ) {
    invalidContract();
  }

  const requestKind = value.requestKind as RailwayApiRequestKind;

  if (
    (requestKind === "query" &&
      value.idempotencyKey !== null) ||
    (requestKind === "mutation" &&
      (typeof value.idempotencyKey !== "string" ||
        !IDEMPOTENCY_KEY_PATTERN.test(value.idempotencyKey)))
  ) {
    invalidContract();
  }

  const normalizedPayload = normalizeRailwayApiJson(
    value.payload,
  );

  if (!isRecord(normalizedPayload)) {
    invalidContract();
  }

  return Object.freeze({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: value.operation,
    requestKind,
    idempotencyKey: value.idempotencyKey as string | null,
    payload: normalizedPayload,
  });
}

export function createRailwayApiSuccessEnvelope(
  data: unknown,
): Readonly<RailwayApiSuccessEnvelope> {
  return Object.freeze({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: normalizeRailwayApiJson(data),
  });
}

export function createRailwayApiFailureEnvelope(
  code: RailwayApiFailureCode,
): Readonly<RailwayApiFailureEnvelope> {
  if (!railwayApiFailureCodes.includes(code)) {
    invalidContract();
  }

  return Object.freeze({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "error",
    code,
  });
}

export function parseRailwayApiResponseEnvelope(
  value: unknown,
): Readonly<RailwayApiResponseEnvelope> {
  if (
    !isRecord(value) ||
    value.contractVersion !== RAILWAY_API_CONTRACT_VERSION
  ) {
    invalidContract();
  }

  if (
    value.outcome === "ok" &&
    hasExactKeys(value, [
      "contractVersion",
      "outcome",
      "data",
    ])
  ) {
    return createRailwayApiSuccessEnvelope(value.data);
  }

  if (
    value.outcome === "error" &&
    hasExactKeys(value, [
      "contractVersion",
      "outcome",
      "code",
    ]) &&
    railwayApiFailureCodes.includes(
      value.code as RailwayApiFailureCode,
    )
  ) {
    return createRailwayApiFailureEnvelope(
      value.code as RailwayApiFailureCode,
    );
  }

  invalidContract();
}
