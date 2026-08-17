import type {
  ContactRecord,
} from "../../shared/domain/contactRecord.ts";
import type {
  PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
} from "./railwayApiContract.ts";

export const RAILWAY_API_MUTATION_REQUEST_DIGEST_PREFIX =
  "railway_mutation_request_v1_" as const;

export interface RailwayApiContactSaveCommand {
  readonly session: Readonly<TenantSession>;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly profile: Readonly<PersistedContactProfile>;
}

export type RailwayApiContactSaveResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      contact: ContactRecord;
    }>
  | Readonly<{
      outcome: "conflict" | "unavailable";
      tenantId: null;
      contact: null;
    }>;

/**
 * The production adapter must execute the business mutation, immutable audit
 * write, idempotency claim, request-digest comparison, and replay-result write
 * in one PostgreSQL transaction. The claim must be scoped by tenant, operation,
 * and idempotency key. A reused key with another digest must return `conflict`;
 * an identical completed request must return `replayed`.
 */
export interface RailwayApiMutationExecutor {
  saveContact(
    command: Readonly<RailwayApiContactSaveCommand>,
  ): Promise<RailwayApiContactSaveResult>;
}

function requireCrypto(
  value: Pick<Crypto, "subtle"> | undefined,
): Pick<Crypto, "subtle"> {
  const cryptoObject =
    value ??
    (typeof crypto === "undefined" ? undefined : crypto);

  if (
    !cryptoObject?.subtle ||
    typeof cryptoObject.subtle.digest !== "function"
  ) {
    throw new Error(
      "Railway mutation request digest is unavailable",
    );
  }

  return cryptoObject;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Railway mutation request is invalid");
    }

    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (typeof value !== "object" || value === null) {
    throw new Error("Railway mutation request is invalid");
  }

  const entries = Object.entries(value).sort(
    ([left], [right]) =>
      left === right ? 0 : left < right ? -1 : 1,
  );

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${canonicalJson(entryValue)}`,
    )
    .join(",")}}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveRailwayApiMutationRequestDigest(
  operation: string,
  payload: Readonly<object>,
  cryptoOverride?: Pick<Crypto, "subtle">,
): Promise<string> {
  if (
    typeof operation !== "string" ||
    operation.length === 0 ||
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Railway mutation request is invalid");
  }

  const digest = await requireCrypto(cryptoOverride).subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      canonicalJson({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation,
        payload,
        requestKind: "mutation",
      }),
    ),
  );

  return `${RAILWAY_API_MUTATION_REQUEST_DIGEST_PREFIX}${bytesToHex(
    new Uint8Array(digest),
  )}`;
}
