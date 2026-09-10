import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type {
  BotReplyStagingProviderFenceFinalizeInput,
  BotReplyStagingProviderFenceFinalizeResult,
  BotReplyStagingProviderFenceReserveInput,
  BotReplyStagingProviderFenceReserveResult,
  BotReplyStagingProviderFenceWorkerCapabilityPort,
} from "../operations/botReplyStagingProviderFenceCapabilityPorts.ts";
import {
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryResult,
} from "./postgresTransaction.ts";

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const operationKeyPattern = /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[a-f0-9]{64}$/;
const providerRequestKeyPattern =
  /^bot_reply_provider_request_v1_[a-f0-9]{64}$/;
const observationKeyPattern =
  /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/;
const providerRequestKeyDomain =
  "connect-bot-reply-staging-provider-operation-request-v1";
const maximumPostgresInteger = 2_147_483_647;
const NativeDate = Date;
const nativeDateParse = Date.parse;
const nativeDateGetTime = Date.prototype.getTime;
const nativeDateToISOString = Date.prototype.toISOString;

const dependencyKeys = Object.freeze(["committedQueries"]);
const inputKeys = Object.freeze([
  "artifactDigest",
  "auditKey",
  "commitSha",
  "deliveryClaimVersion",
  "deliveryKey",
  "operationKey",
  "operationKind",
  "releaseId",
  "requestDigest",
  "reservationKey",
  "runClaimVersion",
  "runKey",
  "runLeaseExpiresAt",
  "tenantId",
]);
const reserveRowKeys = Object.freeze([
  "operationKey",
  "outcome",
  "providerRequestKey",
  "requestedAt",
  "state",
]);
const finalizeRowKeys = Object.freeze([
  "finalizedAt",
  "observationKey",
  "operationKey",
  "outcome",
  "providerOutcomeKind",
  "state",
]);
const operationKinds = Object.freeze(new Set([
  "text-send",
  "button-send",
  "customer-window-expired",
  "provider-retry",
  "pair-limit",
  "duplicate-safety",
]));
const completedProviderOutcomeKinds = Object.freeze(new Set([
  "accepted",
  "sender-deferred",
  "pair-deferred",
  "service-window-rejected",
]));
const indeterminateProviderOutcomeKinds = Object.freeze(new Set([
  "ambiguous",
  "lease-expired-without-outcome",
]));

const postgresBotReplyStagingProviderFenceCapabilitySql = Object.freeze({
  reserve: `
    SELECT capability.*
    FROM public.reserve_bot_reply_staging_provider_operation_v1(
      $1::TEXT,
      $2::BIGINT,
      $3::TEXT,
      $4::TEXT,
      $5::TEXT,
      $6::TEXT,
      $7::TEXT,
      $8::INTEGER,
      $9::TIMESTAMPTZ,
      $10::TEXT,
      $11::TEXT,
      $12::TEXT,
      $13::INTEGER,
      $14::TEXT
    ) AS capability
    LIMIT 2
  `,
  finalize: `
    SELECT capability.*
    FROM public.finalize_bot_reply_staging_provider_operation_v1(
      $1::TEXT,
      $2::BIGINT,
      $3::TEXT,
      $4::TEXT,
      $5::TEXT,
      $6::TEXT,
      $7::TEXT,
      $8::INTEGER,
      $9::TIMESTAMPTZ,
      $10::TEXT,
      $11::TEXT,
      $12::TEXT,
      $13::INTEGER,
      $14::TEXT
    ) AS capability
    LIMIT 2
  `,
});

type ExactRecord = Readonly<Record<string, unknown>>;

interface PostgresCommittedQueryExecutor {
  queryCommitted<TRow>(
    sql: string,
    parameters: readonly PostgresParameter[],
  ): Promise<Readonly<PostgresQueryResult<TRow>>>;
}

function requireExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): ExactRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    throw new Error(`${label} is invalid`);
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${label} is invalid`);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new Error(`${label} is invalid`);
    }
    const actualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== normalizedExpectedKeys.length ||
      actualKeys.some(
        (key, index) => key !== normalizedExpectedKeys[index],
      )
    ) {
      throw new Error(`${label} is invalid`);
    }

    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new Error(`${label} is invalid`);
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof Error && error.message === `${label} is invalid`) {
      throw error;
    }
    throw new Error(`${label} is invalid`);
  }
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  label: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requirePositiveInteger(
  value: unknown,
  label: string,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  ) {
    throw new Error(`${label} is invalid`);
  }
  return Number(value);
}

function requireCanonicalTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error(`${label} is invalid`);
  }
  const milliseconds = Reflect.apply(nativeDateParse, NativeDate, [value]);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`${label} is invalid`);
  }
  const normalized = new NativeDate(milliseconds);
  if (Reflect.apply(nativeDateToISOString, normalized, []) !== value) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function parseCanonicalPostgresTimestamp(value: unknown): string {
  let milliseconds: number;
  if (typeof value === "string") {
    if (value.length > 64) {
      throw new Error("PostgreSQL returned an invalid timestamp");
    }
    milliseconds = Reflect.apply(nativeDateParse, NativeDate, [value]);
  } else if (
    nodeUtilTypes.isDate(value) &&
    !nodeUtilTypes.isProxy(value) &&
    Object.getPrototypeOf(value) === Date.prototype &&
    Reflect.ownKeys(value).length === 0
  ) {
    try {
      milliseconds = Reflect.apply(nativeDateGetTime, value, []);
    } catch {
      throw new Error("PostgreSQL returned an invalid timestamp");
    }
  } else {
    throw new Error("PostgreSQL returned an invalid timestamp");
  }

  if (!Number.isFinite(milliseconds)) {
    throw new Error("PostgreSQL returned an invalid timestamp");
  }
  const normalized = new NativeDate(milliseconds);
  try {
    return Reflect.apply(nativeDateToISOString, normalized, []);
  } catch {
    throw new Error("PostgreSQL returned an invalid timestamp");
  }
}

function requireOperationKind(
  value: unknown,
): BotReplyStagingProviderFenceReserveInput["operationKind"] {
  if (typeof value !== "string" || !operationKinds.has(value)) {
    throw new Error("operationKind is invalid");
  }
  return value as BotReplyStagingProviderFenceReserveInput["operationKind"];
}

function deriveAuditKey(runKey: string, requestDigest: string): string {
  const digest = createHash("sha256")
    .update(runKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${digest}`;
}

function deriveProviderRequestKey(
  input: Readonly<BotReplyStagingProviderFenceReserveInput>,
  requestedAt: string,
): string {
  const digest = createHash("sha256")
    .update(providerRequestKeyDomain, "utf8")
    .update("\0", "utf8")
    .update(input.runKey, "utf8")
    .update("\0", "utf8")
    .update(input.requestDigest, "utf8")
    .update("\0", "utf8")
    .update(input.operationKey, "utf8")
    .update("\0", "utf8")
    .update(input.deliveryKey, "utf8")
    .update("\0", "utf8")
    .update(String(input.deliveryClaimVersion), "utf8")
    .update("\0", "utf8")
    .update(input.reservationKey, "utf8")
    .update("\0", "utf8")
    .update(requestedAt, "utf8")
    .digest("hex");
  return `bot_reply_provider_request_v1_${digest}`;
}

function normalizeInput(
  value: unknown,
  label: string,
): Readonly<BotReplyStagingProviderFenceReserveInput> {
  const input = requireExactDataRecord(value, inputKeys, label);
  const normalized = Object.freeze({
    runKey: requirePattern(input.runKey, runKeyPattern, "runKey"),
    tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
    requestDigest: requirePattern(
      input.requestDigest,
      digestPattern,
      "requestDigest",
    ),
    auditKey: requirePattern(input.auditKey, auditKeyPattern, "auditKey"),
    releaseId: requirePattern(input.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(input.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      input.artifactDigest,
      digestPattern,
      "artifactDigest",
    ),
    runClaimVersion: requirePositiveInteger(
      input.runClaimVersion,
      "runClaimVersion",
      maximumPostgresInteger,
    ),
    runLeaseExpiresAt: requireCanonicalTimestamp(
      input.runLeaseExpiresAt,
      "runLeaseExpiresAt",
    ),
    operationKey: requirePattern(
      input.operationKey,
      operationKeyPattern,
      "operationKey",
    ),
    operationKind: requireOperationKind(input.operationKind),
    deliveryKey: requirePattern(
      input.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    deliveryClaimVersion: requirePositiveInteger(
      input.deliveryClaimVersion,
      "deliveryClaimVersion",
      maximumPostgresInteger,
    ),
    reservationKey: requirePattern(
      input.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
  });

  if (
    normalized.auditKey !== deriveAuditKey(
      normalized.runKey,
      normalized.requestDigest,
    )
  ) {
    throw new Error(`${label} identity is invalid`);
  }
  return normalized;
}

function requireNullFields(
  row: ExactRecord,
  fields: readonly string[],
  label: string,
): void {
  if (fields.some((field) => row[field] !== null)) {
    throw new Error(`${label} null matrix is invalid`);
  }
}

function requireOperationIdentity(
  row: ExactRecord,
  operationKey: string,
): void {
  if (row.operationKey !== operationKey) {
    throw new Error(
      "PostgreSQL returned inconsistent staging provider operation identity",
    );
  }
}

function snapshotDenseRows(value: unknown): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0 ||
      Number(lengthDescriptor.value) > 2
    ) {
      throw new Error("invalid");
    }
    const length = Number(lengthDescriptor.value);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.some((key) => typeof key !== "string") ||
      ownKeys.length !== length + 1 ||
      !ownKeys.includes("length")
    ) {
      throw new Error("invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new Error("invalid");
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    throw new Error("PostgreSQL returned an invalid result");
  }
}

function snapshotQueryResult(
  value: unknown,
): Readonly<PostgresQueryResult<unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }
  try {
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new Error("invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    if (
      Object.values(descriptors).some(
        (descriptor) => !("value" in descriptor),
      )
    ) {
      throw new Error("invalid");
    }
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (
      rowCountDescriptor === undefined ||
      !("value" in rowCountDescriptor) ||
      rowCountDescriptor.enumerable !== true ||
      rowsDescriptor === undefined ||
      !("value" in rowsDescriptor) ||
      rowsDescriptor.enumerable !== true
    ) {
      throw new Error("invalid");
    }
    return Object.freeze({
      rowCount: rowCountDescriptor.value as number,
      rows: snapshotDenseRows(rowsDescriptor.value),
    });
  } catch {
    throw new Error("PostgreSQL returned an invalid result");
  }
}

async function queryExactlyOneRow(
  committedQueries: PostgresCommittedQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  rowKeys: readonly string[],
): Promise<ExactRecord> {
  const rawResult = await committedQueries.queryCommitted<unknown>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(snapshotQueryResult(rawResult), 1);
  if (rows.length !== 1) {
    throw new Error(
      "PostgreSQL staging provider capability returned no row",
    );
  }
  return requireExactDataRecord(
    rows[0],
    rowKeys,
    "staging provider capability row",
  );
}

function parseReserveResult(
  row: ExactRecord,
  input: Readonly<BotReplyStagingProviderFenceReserveInput>,
): BotReplyStagingProviderFenceReserveResult {
  requireOperationIdentity(row, input.operationKey);
  if (row.outcome === "authorized") {
    if (row.state !== "reserved") {
      throw new Error(
        "PostgreSQL returned invalid staging provider reserve state",
      );
    }
    const requestedAt = parseCanonicalPostgresTimestamp(row.requestedAt);
    if (
      Reflect.apply(nativeDateParse, NativeDate, [requestedAt]) >=
        Reflect.apply(nativeDateParse, NativeDate, [input.runLeaseExpiresAt])
    ) {
      throw new Error(
        "PostgreSQL returned staging provider authorization outside its lease",
      );
    }
    const providerRequestKey = requirePattern(
      row.providerRequestKey,
      providerRequestKeyPattern,
      "providerRequestKey",
    );
    if (
      providerRequestKey !== deriveProviderRequestKey(input, requestedAt)
    ) {
      throw new Error(
        "PostgreSQL returned inconsistent staging provider request identity",
      );
    }
    return Object.freeze({
      outcome: "authorized" as const,
      operationKey: input.operationKey,
      providerRequestKey,
      state: "reserved" as const,
      requestedAt,
    });
  }
  if (row.outcome === "replay-blocked") {
    if (
      row.state !== "reserved" &&
      row.state !== "completed" &&
      row.state !== "indeterminate"
    ) {
      throw new Error(
        "PostgreSQL returned invalid staging provider reserve state",
      );
    }
    requireNullFields(
      row,
      ["providerRequestKey", "requestedAt"],
      "replay-blocked staging provider reserve",
    );
    return Object.freeze({
      outcome: "replay-blocked" as const,
      operationKey: input.operationKey,
      state: row.state,
    });
  }
  throw new Error(
    "PostgreSQL returned invalid staging provider reserve outcome",
  );
}

function parseFinalizeResult(
  row: ExactRecord,
  input: Readonly<BotReplyStagingProviderFenceFinalizeInput>,
): BotReplyStagingProviderFenceFinalizeResult {
  requireOperationIdentity(row, input.operationKey);
  if (row.outcome === "pending") {
    if (row.state !== "reserved") {
      throw new Error(
        "PostgreSQL returned invalid staging provider finalize state",
      );
    }
    requireNullFields(
      row,
      ["providerOutcomeKind", "observationKey", "finalizedAt"],
      "pending staging provider finalize",
    );
    return Object.freeze({
      outcome: "pending" as const,
      operationKey: input.operationKey,
      state: "reserved" as const,
    });
  }
  if (row.outcome === "finalized" || row.outcome === "replayed") {
    const observationKey = requirePattern(
      row.observationKey,
      observationKeyPattern,
      "observationKey",
    );
    const finalizedAt = parseCanonicalPostgresTimestamp(row.finalizedAt);
    if (
      row.state === "completed" &&
      typeof row.providerOutcomeKind === "string" &&
      completedProviderOutcomeKinds.has(row.providerOutcomeKind)
    ) {
      return Object.freeze({
        outcome: row.outcome,
        operationKey: input.operationKey,
        state: "completed" as const,
        providerOutcomeKind: row.providerOutcomeKind as
          | "accepted"
          | "sender-deferred"
          | "pair-deferred"
          | "service-window-rejected",
        observationKey,
        finalizedAt,
      });
    }
    if (
      row.state === "indeterminate" &&
      typeof row.providerOutcomeKind === "string" &&
      indeterminateProviderOutcomeKinds.has(row.providerOutcomeKind)
    ) {
      return Object.freeze({
        outcome: row.outcome,
        operationKey: input.operationKey,
        state: "indeterminate" as const,
        providerOutcomeKind: row.providerOutcomeKind as
          | "ambiguous"
          | "lease-expired-without-outcome",
        observationKey,
        finalizedAt,
      });
    }
    throw new Error(
      "PostgreSQL returned invalid staging provider terminal matrix",
    );
  }
  throw new Error(
    "PostgreSQL returned invalid staging provider finalize outcome",
  );
}

function createCheckedCommittedQueries(
  dependencies: Readonly<{
    committedQueries: PostgresCommittedQueryExecutor;
  }>,
): PostgresCommittedQueryExecutor {
  const checkedDependencies = requireExactDataRecord(
    dependencies,
    dependencyKeys,
    "staging provider capability dependencies",
  );
  const committedQueries = checkedDependencies.committedQueries;
  const committedQueryRecord = requireExactDataRecord(
    committedQueries,
    ["queryCommitted"],
    "staging provider committed queries",
  );
  if (typeof committedQueryRecord.queryCommitted !== "function") {
    throw new Error("staging provider committed queries are invalid");
  }
  const capturedQueryCommitted = committedQueryRecord.queryCommitted as
    PostgresCommittedQueryExecutor["queryCommitted"];
  return Object.freeze({
    queryCommitted<TRow>(
      sql: string,
      parameters: readonly PostgresParameter[],
    ) {
      return Reflect.apply(capturedQueryCommitted, committedQueries, [
        sql,
        parameters,
      ]) as Promise<Readonly<PostgresQueryResult<TRow>>>;
    },
  });
}

function parametersForInput(
  input: Readonly<BotReplyStagingProviderFenceReserveInput>,
): readonly PostgresParameter[] {
  return Object.freeze([
    input.runKey,
    input.tenantId,
    input.requestDigest,
    input.auditKey,
    input.releaseId,
    input.commitSha,
    input.artifactDigest,
    input.runClaimVersion,
    input.runLeaseExpiresAt,
    input.operationKey,
    input.operationKind,
    input.deliveryKey,
    input.deliveryClaimVersion,
    input.reservationKey,
  ]);
}

export function createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository(
  dependencies: Readonly<{
    committedQueries: PostgresCommittedQueryExecutor;
  }>,
): BotReplyStagingProviderFenceWorkerCapabilityPort {
  const checkedCommittedQueries = createCheckedCommittedQueries(dependencies);

  return Object.freeze({
    async reserve(
      rawInput: Readonly<BotReplyStagingProviderFenceReserveInput>,
    ) {
      const input = normalizeInput(rawInput, "reserve input");
      const row = await queryExactlyOneRow(
        checkedCommittedQueries,
        postgresBotReplyStagingProviderFenceCapabilitySql.reserve,
        parametersForInput(input),
        reserveRowKeys,
      );
      return parseReserveResult(row, input);
    },

    async finalize(
      rawInput: Readonly<BotReplyStagingProviderFenceFinalizeInput>,
    ) {
      const input = normalizeInput(rawInput, "finalize input");
      const row = await queryExactlyOneRow(
        checkedCommittedQueries,
        postgresBotReplyStagingProviderFenceCapabilitySql.finalize,
        parametersForInput(input),
        finalizeRowKeys,
      );
      return parseFinalizeResult(row, input);
    },
  });
}
