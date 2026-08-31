import { timingSafeEqual } from "node:crypto";

import type {
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
  createPostgresFullDataMigrationBundlePlan,
  executePostgresFullDataMigrationBundle,
} from "./postgresFullDataMigrationBundle.ts";
import {
  PostgresDataMigrationBundleError,
} from "./postgresDataMigrationBundleProtocol.ts";

export const POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION =
  "connect_postgres_full_data_migration_cutover_v1";
export const POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION =
  "execute-full-d1-cutover";

const planLifetimeMilliseconds = 10 * 60 * 1_000;
const digestPattern = /^hmac_sha256_v1_[a-f0-9]{64}$/;

type FullDataMigrationSnapshots = Parameters<
  typeof createPostgresFullDataMigrationBundlePlan
>[0]["snapshots"];

export type PostgresFullDataMigrationTargetEnvironment =
  | "staging"
  | "production";

export type PostgresFullDataMigrationCutoverErrorCode =
  | "approval-mismatch"
  | "approval-required"
  | "clock-invalid"
  | "dependency-invalid"
  | "evidence-key-invalid"
  | "execution-failed"
  | "input-invalid"
  | "plan-expired"
  | "source-invalid"
  | "target-already-cut-over"
  | "target-environment-invalid"
  | "target-not-ready";

export class PostgresFullDataMigrationCutoverError extends Error {
  readonly code: PostgresFullDataMigrationCutoverErrorCode;

  constructor(code: PostgresFullDataMigrationCutoverErrorCode) {
    super(`PostgreSQL full data migration cutover failed: ${code}`);
    this.name = "PostgresFullDataMigrationCutoverError";
    this.code = code;
  }
}

export interface PostgresFullDataMigrationCutoverSliceSummary {
  readonly id: string;
  readonly tableCount: number;
  readonly totalRowCount: number;
}

export interface PostgresFullDataMigrationCutoverPreflight {
  readonly kind: "postgres-full-data-migration-cutover-preflight";
  readonly version: typeof POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION;
  readonly bundleVersion: typeof POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION;
  readonly sourceDigest: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly sliceCount: number;
  readonly tableCount: number;
  readonly totalRowCount: number;
  readonly slices: readonly PostgresFullDataMigrationCutoverSliceSummary[];
}

export interface PostgresFullDataMigrationCutoverEvidence {
  readonly kind: "postgres-full-data-migration-cutover-evidence";
  readonly version: typeof POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION;
  readonly bundleVersion: typeof POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION;
  readonly targetEnvironment: PostgresFullDataMigrationTargetEnvironment;
  readonly bundleId: string;
  readonly sourceDigest: string;
  readonly bundleDigest: string;
  readonly evidenceDigest: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly sliceCount: number;
  readonly tableCount: number;
  readonly totalRowCount: number;
}

function fail(code: PostgresFullDataMigrationCutoverErrorCode): never {
  throw new PostgresFullDataMigrationCutoverError(code);
}

function requireExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    fail("input-invalid");
  }
}

function normalizeStartedAt(value: unknown): string {
  if (typeof value !== "string") fail("clock-invalid");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail("clock-invalid");
  const normalized = new Date(timestamp).toISOString();
  if (normalized !== value) fail("clock-invalid");
  return normalized;
}

function requireEvidenceKey(value: unknown): string {
  const decoded = typeof value === "string"
    ? Buffer.from(value, "base64")
    : Buffer.alloc(0);
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9+/]{43}=$/.test(value) ||
    decoded.length !== 32 ||
    decoded.toString("base64") !== value
  ) {
    fail("evidence-key-invalid");
  }
  return value;
}

function planWindow(startedAt: string): Readonly<{
  createdAt: string;
  expiresAt: string;
}> {
  const expiresAt = new Date(
    Date.parse(startedAt) + planLifetimeMilliseconds,
  );
  if (!Number.isFinite(expiresAt.getTime())) fail("clock-invalid");
  return Object.freeze({
    createdAt: startedAt,
    expiresAt: expiresAt.toISOString(),
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function createPlan(input: Readonly<{
  snapshots: FullDataMigrationSnapshots;
  startedAt: string;
  evidenceHmacKey: string;
}>) {
  const window = planWindow(input.startedAt);
  try {
    return createPostgresFullDataMigrationBundlePlan({
      snapshots: input.snapshots,
      ...window,
      evidenceHmacKey: input.evidenceHmacKey,
    });
  } catch {
    fail("source-invalid");
  }
}

function preflightFromPlan(
  plan: ReturnType<typeof createPostgresFullDataMigrationBundlePlan>,
): PostgresFullDataMigrationCutoverPreflight {
  const slices = Object.freeze(plan.manifest.map((slice) => Object.freeze({
    id: slice.id,
    tableCount: slice.tableCount,
    totalRowCount: slice.totalRowCount,
  })));
  return Object.freeze({
    kind: "postgres-full-data-migration-cutover-preflight",
    version: POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION,
    bundleVersion: POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
    sourceDigest: plan.sourceDigest,
    createdAt: plan.createdAt,
    expiresAt: plan.expiresAt,
    sliceCount: slices.length,
    tableCount: slices.reduce(
      (total, slice) => total + slice.tableCount,
      0,
    ),
    totalRowCount: slices.reduce(
      (total, slice) => total + slice.totalRowCount,
      0,
    ),
    slices,
  });
}

export function createPostgresFullDataMigrationCutoverPreflight(
  input: Readonly<{
    snapshots: FullDataMigrationSnapshots;
    startedAt: string;
    evidenceHmacKey: string;
  }>,
): PostgresFullDataMigrationCutoverPreflight {
  requireExactKeys(input, [
    "evidenceHmacKey",
    "snapshots",
    "startedAt",
  ]);
  const startedAt = normalizeStartedAt(input.startedAt);
  const evidenceHmacKey = requireEvidenceKey(input.evidenceHmacKey);
  return preflightFromPlan(createPlan({
    snapshots: input.snapshots,
    startedAt,
    evidenceHmacKey,
  }));
}

function mapExecutionFailure(error: unknown): never {
  if (error instanceof PostgresDataMigrationBundleError) {
    if (error.code === "bundle-replayed") {
      fail("target-already-cut-over");
    }
    if (
      error.code === "receipt-unavailable" ||
      error.code === "receipt-write-failed"
    ) {
      fail("target-not-ready");
    }
    if (error.code === "bundle-expired") fail("plan-expired");
  }
  fail("execution-failed");
}

export async function executePostgresFullDataMigrationCutover(
  input: Readonly<{
    snapshots: FullDataMigrationSnapshots;
    startedAt: string;
    evidenceHmacKey: string;
    approvedSourceDigest: string;
    confirmation: string;
    targetEnvironment: PostgresFullDataMigrationTargetEnvironment;
    transactions: PostgresTransactionManager;
  }>,
): Promise<PostgresFullDataMigrationCutoverEvidence> {
  requireExactKeys(input, [
    "approvedSourceDigest",
    "confirmation",
    "evidenceHmacKey",
    "snapshots",
    "startedAt",
    "targetEnvironment",
    "transactions",
  ]);
  if (!(["staging", "production"] as const).includes(
    input.targetEnvironment,
  )) {
    fail("target-environment-invalid");
  }
  if (input.confirmation !== POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION) {
    fail("approval-required");
  }
  if (
    typeof input.approvedSourceDigest !== "string" ||
    !digestPattern.test(input.approvedSourceDigest)
  ) {
    fail("approval-mismatch");
  }
  if (typeof input.transactions?.transaction !== "function") {
    fail("dependency-invalid");
  }

  const startedAt = normalizeStartedAt(input.startedAt);
  const evidenceHmacKey = requireEvidenceKey(input.evidenceHmacKey);
  const plan = createPlan({
    snapshots: input.snapshots,
    startedAt,
    evidenceHmacKey,
  });
  if (!safeEqual(plan.sourceDigest, input.approvedSourceDigest)) {
    fail("approval-mismatch");
  }

  let evidence;
  try {
    evidence = await executePostgresFullDataMigrationBundle({
      plan,
      transactions: input.transactions,
      evidenceHmacKey,
      now: startedAt,
    });
  } catch (error) {
    mapExecutionFailure(error);
  }

  return Object.freeze({
    kind: "postgres-full-data-migration-cutover-evidence",
    version: POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION,
    bundleVersion: POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
    targetEnvironment: input.targetEnvironment,
    bundleId: evidence.bundleId,
    sourceDigest: evidence.sourceDigest,
    bundleDigest: evidence.bundleDigest,
    evidenceDigest: evidence.evidenceDigest,
    startedAt,
    completedAt: evidence.completedAt,
    sliceCount: evidence.sliceCount,
    tableCount: evidence.tableCount,
    totalRowCount: evidence.totalRowCount,
  });
}
