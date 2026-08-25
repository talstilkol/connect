import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  deriveBotReplyStagingReceiptDigest,
  serializeCanonicalBotReplyStagingReceipt,
} from "../operations/botReplyStagingReceiptAttestation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresQueryResult,
} from "./postgresTransaction.ts";

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;
const maximumReceiptBytes = 48_000;
const maximumPostgresInteger = 2_147_483_647;

const dependencyKeys = Object.freeze(["queries"]);
const claimInputKeys = Object.freeze([
  "actorExternalUserId",
  "artifactDigest",
  "auditKey",
  "commitSha",
  "connectionVersion",
  "graphApiVersion",
  "leaseDurationSeconds",
  "policyVersion",
  "rateLimitMethodFingerprint",
  "recipientFingerprint",
  "releaseId",
  "requestDigest",
  "runKey",
  "tenantId",
]);
const readInputKeys = Object.freeze([
  "artifactDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "releaseId",
  "requestDigest",
  "runKey",
  "tenantId",
]);
const completeInputKeys = Object.freeze([
  ...readInputKeys,
  "leaseExpiresAt",
  "receipt",
]);
const rowKeys = Object.freeze([
  "auditKey",
  "claimVersion",
  "completedAt",
  "leaseExpiresAt",
  "outcome",
  "receiptDigest",
  "receiptJson",
  "requestDigest",
  "runKey",
]);

export const postgresBotReplyStagingRunCapabilitySql = Object.freeze({
  claim: `
    SELECT capability.*
    FROM public.claim_bot_reply_staging_run_v1(
      $1::TEXT,
      $2::BIGINT,
      $3::TEXT,
      $4::TEXT,
      $5::INTEGER,
      $6::INTEGER,
      $7::TEXT,
      $8::TEXT,
      $9::TEXT,
      $10::TEXT,
      $11::TEXT,
      $12::TEXT,
      $13::INTEGER,
      $14::TEXT
    ) AS capability
    LIMIT 2
  `,
  read: `
    SELECT capability.*
    FROM public.read_bot_reply_staging_run_v1(
      $1::BIGINT,
      $2::TEXT,
      $3::TEXT,
      $4::TEXT,
      $5::TEXT,
      $6::TEXT,
      $7::TEXT,
      $8::INTEGER
    ) AS capability
    LIMIT 2
  `,
  complete: `
    SELECT capability.*
    FROM public.complete_bot_reply_staging_run_v1(
      $1::BIGINT,
      $2::TEXT,
      $3::TEXT,
      $4::TEXT,
      $5::TEXT,
      $6::TEXT,
      $7::TEXT,
      $8::INTEGER,
      $9::TIMESTAMPTZ,
      $10::TEXT,
      $11::TEXT
    ) AS capability
    LIMIT 2
  `,
});

export interface PostgresBotReplyStagingRunCapabilityClaimInput {
  readonly runKey: string;
  readonly tenantId: number;
  readonly requestDigest: string;
  readonly actorExternalUserId: string;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly recipientFingerprint: string;
  readonly rateLimitMethodFingerprint: string;
  readonly leaseDurationSeconds: number;
  readonly auditKey: string;
}

export interface PostgresBotReplyStagingRunCapabilityReadInput {
  readonly tenantId: number;
  readonly runKey: string;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly claimVersion: number;
}

export interface PostgresBotReplyStagingRunCapabilityCompleteInput
  extends PostgresBotReplyStagingRunCapabilityReadInput {
  readonly leaseExpiresAt: string;
  readonly receipt: unknown;
}

export type PostgresBotReplyStagingRunCapabilityClaimResult = Readonly<
  | {
      outcome: "claimed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict" | "in-progress";
      runKey: string;
    }
>;

export type PostgresBotReplyStagingRunCapabilityReadResult = Readonly<
  | {
      outcome: "running";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "completed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "expired" | "missing-or-conflict";
      runKey: string;
    }
>;

export type PostgresBotReplyStagingRunCapabilityCompleteResult = Readonly<
  | {
      outcome: "completed" | "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict" | "lease-expired";
      runKey: string;
    }
>;

export interface PostgresBotReplyStagingRunCapabilityRepository {
  claim(
    input: Readonly<PostgresBotReplyStagingRunCapabilityClaimInput>,
  ): Promise<PostgresBotReplyStagingRunCapabilityClaimResult>;
  read(
    input: Readonly<PostgresBotReplyStagingRunCapabilityReadInput>,
  ): Promise<PostgresBotReplyStagingRunCapabilityReadResult>;
  complete(
    input: Readonly<PostgresBotReplyStagingRunCapabilityCompleteInput>,
  ): Promise<PostgresBotReplyStagingRunCapabilityCompleteResult>;
}

interface NormalizedIdentity {
  readonly tenantId: number;
  readonly runKey: string;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly claimVersion: number;
}

type ExactRecord = Readonly<Record<string, unknown>>;

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
    const normalizedActualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      normalizedActualKeys.length !== normalizedExpectedKeys.length ||
      normalizedActualKeys.some(
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
    for (const key of normalizedActualKeys) {
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

function parsePostgresCapabilityVersion(value: unknown): number {
  const parsed = parsePostgresPositiveInteger(value);
  if (parsed > maximumPostgresInteger) {
    throw new Error(
      "PostgreSQL returned an invalid staging capability version",
    );
  }
  return parsed;
}

function requireLeaseDuration(value: unknown): number {
  const duration = requirePositiveInteger(value, "leaseDurationSeconds");
  if (duration < 60 || duration > 3_600) {
    throw new Error("leaseDurationSeconds is invalid");
  }
  return duration;
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    value.trim() !== value ||
    unsafeControlCharacters.test(value)
  ) {
    throw new Error("actorExternalUserId is invalid");
  }
  return value;
}

function requireCanonicalTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error(`${label} is invalid`);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function deriveAuditKey(runKey: string, requestDigest: string): string {
  const digest = createHash("sha256")
    .update(runKey, "utf8")
    .update("\0", "utf8")
    .update(requestDigest, "utf8")
    .digest("hex");
  return `bot_reply_staging_audit_v1_${digest}`;
}

function normalizeClaimInput(
  value: unknown,
): Readonly<PostgresBotReplyStagingRunCapabilityClaimInput> {
  const input = requireExactDataRecord(value, claimInputKeys, "claim input");
  const normalized = Object.freeze({
    runKey: requirePattern(input.runKey, runKeyPattern, "runKey"),
    tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
    requestDigest: requirePattern(
      input.requestDigest,
      digestPattern,
      "requestDigest",
    ),
    actorExternalUserId: requireActor(input.actorExternalUserId),
    connectionVersion: requirePositiveInteger(
      input.connectionVersion,
      "connectionVersion",
      maximumPostgresInteger,
    ),
    policyVersion: requirePositiveInteger(
      input.policyVersion,
      "policyVersion",
      maximumPostgresInteger,
    ),
    releaseId: requirePattern(input.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(input.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      input.artifactDigest,
      digestPattern,
      "artifactDigest",
    ),
    graphApiVersion: requirePattern(
      input.graphApiVersion,
      graphApiVersionPattern,
      "graphApiVersion",
    ),
    recipientFingerprint: requirePattern(
      input.recipientFingerprint,
      digestPattern,
      "recipientFingerprint",
    ),
    rateLimitMethodFingerprint: requirePattern(
      input.rateLimitMethodFingerprint,
      digestPattern,
      "rateLimitMethodFingerprint",
    ),
    leaseDurationSeconds: requireLeaseDuration(input.leaseDurationSeconds),
    auditKey: requirePattern(input.auditKey, auditKeyPattern, "auditKey"),
  });

  if (
    normalized.auditKey !== deriveAuditKey(
      normalized.runKey,
      normalized.requestDigest,
    )
  ) {
    throw new Error("claim identity is invalid");
  }
  return normalized;
}

function normalizeIdentity(value: unknown, label: string): NormalizedIdentity {
  const input = requireExactDataRecord(value, readInputKeys, label);
  const normalized = Object.freeze({
    tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
    runKey: requirePattern(input.runKey, runKeyPattern, "runKey"),
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
    claimVersion: requirePositiveInteger(
      input.claimVersion,
      "claimVersion",
      maximumPostgresInteger,
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

function requireReceiptObject(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("receipt is invalid");
  }
  try {
    serializeCanonicalBotReplyStagingReceipt(value);
    return value;
  } catch {
    throw new Error("receipt is invalid");
  }
}

function normalizeCompleteInput(
  value: unknown,
): Readonly<PostgresBotReplyStagingRunCapabilityCompleteInput> {
  const input = requireExactDataRecord(
    value,
    completeInputKeys,
    "complete input",
  );
  const identity = normalizeIdentity(
    {
      tenantId: input.tenantId,
      runKey: input.runKey,
      requestDigest: input.requestDigest,
      auditKey: input.auditKey,
      releaseId: input.releaseId,
      commitSha: input.commitSha,
      artifactDigest: input.artifactDigest,
      claimVersion: input.claimVersion,
    },
    "complete input",
  );
  return Object.freeze({
    ...identity,
    leaseExpiresAt: requireCanonicalTimestamp(
      input.leaseExpiresAt,
      "leaseExpiresAt",
    ),
    receipt: requireReceiptObject(input.receipt),
  });
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

function requireRowIdentity(
  row: ExactRecord,
  runKey: string,
  requestDigest: string,
): void {
  if (row.runKey !== runKey || row.requestDigest !== requestDigest) {
    throw new Error("PostgreSQL returned inconsistent staging identity");
  }
}

function requireAuditIdentity(row: ExactRecord, auditKey: string): void {
  if (row.auditKey !== auditKey) {
    throw new Error("PostgreSQL returned inconsistent staging audit identity");
  }
}

function deepFreezeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const entry of value) deepFreezeJson(entry);
    return Object.freeze(value);
  }
  if (typeof value === "object" && value !== null) {
    for (const entry of Object.values(value)) deepFreezeJson(entry);
    return Object.freeze(value);
  }
  return value;
}

function parseReceipt(row: ExactRecord): unknown {
  if (
    typeof row.receiptJson !== "string" ||
    row.receiptJson.length < 2 ||
    Buffer.byteLength(row.receiptJson, "utf8") > maximumReceiptBytes ||
    typeof row.receiptDigest !== "string" ||
    !digestPattern.test(row.receiptDigest)
  ) {
    throw new Error("PostgreSQL returned invalid staging receipt");
  }
  try {
    const receipt = JSON.parse(row.receiptJson) as unknown;
    if (
      typeof receipt !== "object" ||
      receipt === null ||
      Array.isArray(receipt) ||
      serializeCanonicalBotReplyStagingReceipt(receipt) !== row.receiptJson ||
      deriveBotReplyStagingReceiptDigest(receipt) !== row.receiptDigest
    ) {
      throw new Error("invalid");
    }
    return deepFreezeJson(receipt);
  } catch {
    throw new Error("PostgreSQL returned inconsistent staging receipt");
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
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<ExactRecord> {
  const rawResult = await queries.query<unknown>(sql, parameters);
  const rows = requirePostgresRows(
    snapshotQueryResult(rawResult),
    1,
  );
  if (rows.length !== 1) {
    throw new Error("PostgreSQL staging capability returned no row");
  }
  return requireExactDataRecord(rows[0], rowKeys, "staging capability row");
}

function parseClaimResult(
  row: ExactRecord,
  input: Readonly<PostgresBotReplyStagingRunCapabilityClaimInput>,
): PostgresBotReplyStagingRunCapabilityClaimResult {
  requireRowIdentity(row, input.runKey, input.requestDigest);
  if (row.outcome === "claimed") {
    requireAuditIdentity(row, input.auditKey);
    requireNullFields(
      row,
      ["completedAt", "receiptJson", "receiptDigest"],
      "claimed staging capability",
    );
    return Object.freeze({
      outcome: "claimed" as const,
      runKey: input.runKey,
      auditKey: input.auditKey,
      claimVersion: parsePostgresCapabilityVersion(row.claimVersion),
      leaseExpiresAt: parsePostgresTimestamp(row.leaseExpiresAt),
    });
  }
  if (row.outcome === "replayed") {
    requireAuditIdentity(row, input.auditKey);
    requireNullFields(
      row,
      ["claimVersion", "leaseExpiresAt"],
      "replayed staging claim",
    );
    return Object.freeze({
      outcome: "replayed" as const,
      runKey: input.runKey,
      auditKey: input.auditKey,
      completedAt: parsePostgresTimestamp(row.completedAt),
      receipt: parseReceipt(row),
    });
  }
  if (row.outcome === "conflict" || row.outcome === "in-progress") {
    requireNullFields(
      row,
      [
        "auditKey",
        "claimVersion",
        "leaseExpiresAt",
        "completedAt",
        "receiptJson",
        "receiptDigest",
      ],
      `${row.outcome} staging claim`,
    );
    return Object.freeze({ outcome: row.outcome, runKey: input.runKey });
  }
  throw new Error("PostgreSQL returned invalid staging claim outcome");
}

function parseReadResult(
  row: ExactRecord,
  input: Readonly<NormalizedIdentity>,
): PostgresBotReplyStagingRunCapabilityReadResult {
  requireRowIdentity(row, input.runKey, input.requestDigest);
  if (row.outcome === "running") {
    requireAuditIdentity(row, input.auditKey);
    const claimVersion = parsePostgresCapabilityVersion(row.claimVersion);
    if (claimVersion !== input.claimVersion) {
      throw new Error("PostgreSQL returned inconsistent staging claim fence");
    }
    requireNullFields(
      row,
      ["completedAt", "receiptJson", "receiptDigest"],
      "running staging read",
    );
    return Object.freeze({
      outcome: "running" as const,
      runKey: input.runKey,
      auditKey: input.auditKey,
      claimVersion,
      leaseExpiresAt: parsePostgresTimestamp(row.leaseExpiresAt),
    });
  }
  if (row.outcome === "completed") {
    requireAuditIdentity(row, input.auditKey);
    const claimVersion = parsePostgresCapabilityVersion(row.claimVersion);
    if (claimVersion !== input.claimVersion) {
      throw new Error("PostgreSQL returned inconsistent staging claim fence");
    }
    requireNullFields(row, ["leaseExpiresAt"], "completed staging read");
    return Object.freeze({
      outcome: "completed" as const,
      runKey: input.runKey,
      auditKey: input.auditKey,
      claimVersion,
      completedAt: parsePostgresTimestamp(row.completedAt),
      receipt: parseReceipt(row),
    });
  }
  if (
    row.outcome === "expired" ||
    row.outcome === "missing-or-conflict"
  ) {
    requireNullFields(
      row,
      [
        "auditKey",
        "claimVersion",
        "leaseExpiresAt",
        "completedAt",
        "receiptJson",
        "receiptDigest",
      ],
      `${row.outcome} staging read`,
    );
    return Object.freeze({ outcome: row.outcome, runKey: input.runKey });
  }
  throw new Error("PostgreSQL returned invalid staging read outcome");
}

function parseCompleteResult(
  row: ExactRecord,
  input: Readonly<PostgresBotReplyStagingRunCapabilityCompleteInput>,
  canonicalReceiptJson: string,
  receiptDigest: string,
): PostgresBotReplyStagingRunCapabilityCompleteResult {
  requireRowIdentity(row, input.runKey, input.requestDigest);
  if (row.outcome === "completed" || row.outcome === "replayed") {
    requireAuditIdentity(row, input.auditKey);
    requireNullFields(
      row,
      ["claimVersion", "leaseExpiresAt"],
      `${row.outcome} staging completion`,
    );
    if (
      row.receiptJson !== canonicalReceiptJson ||
      row.receiptDigest !== receiptDigest
    ) {
      throw new Error("PostgreSQL returned a different staging receipt");
    }
    const completedAt = parsePostgresTimestamp(row.completedAt);
    if (Date.parse(completedAt) >= Date.parse(input.leaseExpiresAt)) {
      throw new Error("PostgreSQL returned completion outside its lease");
    }
    return Object.freeze({
      outcome: row.outcome,
      runKey: input.runKey,
      auditKey: input.auditKey,
      completedAt,
      receipt: parseReceipt(row),
    });
  }
  if (row.outcome === "conflict" || row.outcome === "lease-expired") {
    requireNullFields(
      row,
      [
        "auditKey",
        "claimVersion",
        "leaseExpiresAt",
        "completedAt",
        "receiptJson",
        "receiptDigest",
      ],
      `${row.outcome} staging completion`,
    );
    return Object.freeze({ outcome: row.outcome, runKey: input.runKey });
  }
  throw new Error("PostgreSQL returned invalid staging completion outcome");
}

export function createPostgresBotReplyStagingRunCapabilityRepository(
  dependencies: Readonly<{ queries: PostgresQueryExecutor }>,
): PostgresBotReplyStagingRunCapabilityRepository {
  const checkedDependencies = requireExactDataRecord(
    dependencies,
    dependencyKeys,
    "staging capability dependencies",
  );
  const queries = checkedDependencies.queries;
  const queryRecord = requireExactDataRecord(
    queries,
    ["query"],
    "staging capability queries",
  );
  if (typeof queryRecord.query !== "function") {
    throw new Error("staging capability queries are invalid");
  }
  const capturedQuery = queryRecord.query as PostgresQueryExecutor["query"];
  const checkedQueries: PostgresQueryExecutor = Object.freeze({
    query<TRow>(sql: string, parameters: readonly PostgresParameter[]) {
      return Reflect.apply(capturedQuery, queries, [
        sql,
        parameters,
      ]) as Promise<Readonly<PostgresQueryResult<TRow>>>;
    },
  });

  return Object.freeze({
    async claim(rawInput: Readonly<PostgresBotReplyStagingRunCapabilityClaimInput>) {
      const input = normalizeClaimInput(rawInput);
      const row = await queryExactlyOneRow(
        checkedQueries,
        postgresBotReplyStagingRunCapabilitySql.claim,
        [
          input.runKey,
          input.tenantId,
          input.requestDigest,
          input.actorExternalUserId,
          input.connectionVersion,
          input.policyVersion,
          input.releaseId,
          input.commitSha,
          input.artifactDigest,
          input.graphApiVersion,
          input.recipientFingerprint,
          input.rateLimitMethodFingerprint,
          input.leaseDurationSeconds,
          input.auditKey,
        ],
      );
      return parseClaimResult(row, input);
    },

    async read(rawInput: Readonly<PostgresBotReplyStagingRunCapabilityReadInput>) {
      const input = normalizeIdentity(rawInput, "read input");
      const row = await queryExactlyOneRow(
        checkedQueries,
        postgresBotReplyStagingRunCapabilitySql.read,
        [
          input.tenantId,
          input.runKey,
          input.requestDigest,
          input.auditKey,
          input.releaseId,
          input.commitSha,
          input.artifactDigest,
          input.claimVersion,
        ],
      );
      return parseReadResult(row, input);
    },

    async complete(
      rawInput: Readonly<PostgresBotReplyStagingRunCapabilityCompleteInput>,
    ) {
      const input = normalizeCompleteInput(rawInput);
      const canonicalReceiptJson = serializeCanonicalBotReplyStagingReceipt(
        input.receipt,
      );
      const receiptDigest = deriveBotReplyStagingReceiptDigest(input.receipt);
      const row = await queryExactlyOneRow(
        checkedQueries,
        postgresBotReplyStagingRunCapabilitySql.complete,
        [
          input.tenantId,
          input.runKey,
          input.requestDigest,
          input.auditKey,
          input.releaseId,
          input.commitSha,
          input.artifactDigest,
          input.claimVersion,
          input.leaseExpiresAt,
          canonicalReceiptJson,
          receiptDigest,
        ],
      );
      return parseCompleteResult(
        row,
        input,
        canonicalReceiptJson,
        receiptDigest,
      );
    },
  });
}
