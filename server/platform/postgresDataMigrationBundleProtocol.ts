import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationSnapshot,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const evidenceKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const identifierPattern = /^[a-z][a-z0-9-]*$/;
const versionPattern = /^connect_postgres_[a-z0-9_]+_v[1-9][0-9]*$/;
const kindPattern =
  /^postgres-[a-z0-9]+(?:-[a-z0-9]+)*-migration-bundle-(?:plan|evidence)$/;
const digestPattern = /^hmac_sha256_v1_[0-9a-f]{64}$/;
const childDigestPattern = /^[0-9a-f]{64}$/;
const maximumPlanLifetimeMilliseconds = 15 * 60 * 1_000;
const receiptTableName = "data_migration_bundle_receipts";
const receiptExecutionScope = "full-d1-cutover";

export interface PostgresDataMigrationBundleSliceDefinition {
  readonly id: string;
  readonly requires: readonly string[];
  readonly version: string;
  readonly planKind: string;
  readonly evidenceKind: string;
  readonly createPlan: (input: Readonly<{
    snapshot: PostgresDataMigrationSnapshot;
    createdAt: string;
    expiresAt: string;
    evidenceHmacKey: string;
  }>) => PostgresDataMigrationPlan;
  readonly execute: (input: Readonly<{
    plan: PostgresDataMigrationPlan;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    now: string;
  }>) => Promise<PostgresDataMigrationEvidence>;
}

export interface PostgresDataMigrationBundleConfiguration {
  readonly version: string;
  readonly planKind: string;
  readonly evidenceKind: string;
  readonly advisoryLockKeys: readonly (readonly [number, number])[];
  readonly slices: readonly PostgresDataMigrationBundleSliceDefinition[];
}

export interface PostgresDataMigrationBundleSnapshotSlice {
  readonly id: string;
  readonly requires: readonly string[];
  readonly snapshot: PostgresDataMigrationSnapshot;
}

export interface PostgresDataMigrationBundleManifestSlice {
  readonly id: string;
  readonly requires: readonly string[];
  readonly planKind: string;
  readonly planVersion: string;
  readonly planId: string;
  readonly manifestDigest: string;
  readonly tableCount: number;
  readonly totalRowCount: number;
}

export interface PostgresDataMigrationBundlePlanSlice {
  readonly id: string;
  readonly requires: readonly string[];
  readonly plan: PostgresDataMigrationPlan;
}

export interface PostgresDataMigrationBundlePlan {
  readonly kind: string;
  readonly version: string;
  readonly bundleId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly sourceDigest: string;
  readonly bundleDigest: string;
  readonly manifest: readonly PostgresDataMigrationBundleManifestSlice[];
  readonly slices: readonly PostgresDataMigrationBundlePlanSlice[];
}

export interface PostgresDataMigrationBundleEvidenceSlice {
  readonly id: string;
  readonly requires: readonly string[];
  readonly evidence: PostgresDataMigrationEvidence;
}

export interface PostgresDataMigrationBundleEvidence {
  readonly kind: string;
  readonly version: string;
  readonly bundleId: string;
  readonly sourceDigest: string;
  readonly bundleDigest: string;
  readonly evidenceDigest: string;
  readonly completedAt: string;
  readonly sliceCount: number;
  readonly tableCount: number;
  readonly totalRowCount: number;
  readonly slices: readonly PostgresDataMigrationBundleEvidenceSlice[];
}

export type PostgresDataMigrationBundleErrorCode =
  | "bundle-expired"
  | "bundle-invalid"
  | "bundle-mismatch"
  | "bundle-replayed"
  | "configuration-invalid"
  | "dependency-invalid"
  | "evidence-key-invalid"
  | "receipt-unavailable"
  | "receipt-write-failed"
  | "slice-execution-failed";

export class PostgresDataMigrationBundleError extends Error {
  readonly code: PostgresDataMigrationBundleErrorCode;
  readonly sliceId: string | null;

  constructor(
    code: PostgresDataMigrationBundleErrorCode,
    context: Readonly<{ sliceId?: string }> = {},
  ) {
    super(`PostgreSQL data migration bundle failed: ${code}`);
    this.name = "PostgresDataMigrationBundleError";
    this.code = code;
    this.sliceId = context.sliceId ?? null;
  }
}

export interface PostgresDataMigrationBundleProtocol {
  readonly version: string;
  readonly sliceDefinitions: readonly Readonly<{
    id: string;
    requires: readonly string[];
    version: string;
    planKind: string;
    evidenceKind: string;
  }>[];
  readonly createPlan: (input: Readonly<{
    snapshots: readonly PostgresDataMigrationBundleSnapshotSlice[];
    createdAt: string;
    expiresAt: string;
    evidenceHmacKey: string;
  }>) => PostgresDataMigrationBundlePlan;
  readonly execute: (input: Readonly<{
    plan: PostgresDataMigrationBundlePlan;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    now: string;
  }>) => Promise<PostgresDataMigrationBundleEvidence>;
}

function fail(
  code: PostgresDataMigrationBundleErrorCode,
  context?: Readonly<{ sliceId?: string }>,
): never {
  throw new PostgresDataMigrationBundleError(code, context);
}

function requireExactKeys(
  value: unknown,
  keys: readonly string[],
  code: PostgresDataMigrationBundleErrorCode,
): void {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...keys].sort())
  ) {
    fail(code);
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("bundle-invalid");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => (
      `${JSON.stringify(key)}:${canonicalJson(entry)}`
    )).join(",")}}`;
  }
  fail("bundle-invalid");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function requireEvidenceKey(encoded: string): Buffer {
  if (typeof encoded !== "string" || !evidenceKeyPattern.test(encoded)) {
    fail("evidence-key-invalid");
  }
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length !== 32) fail("evidence-key-invalid");
  return decoded;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    fail("bundle-invalid");
  }
  const zonedIso =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!zonedIso.test(value)) fail("bundle-invalid");
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) fail("bundle-invalid");
  return parsed.toISOString();
}

function requirePlanWindow(createdAt: string, expiresAt: string): void {
  const createdTime = Date.parse(createdAt);
  const expiresTime = Date.parse(expiresAt);
  if (
    expiresTime <= createdTime ||
    expiresTime - createdTime > maximumPlanLifetimeMilliseconds
  ) {
    fail("bundle-invalid");
  }
}

function digest(value: unknown, key: Buffer): string {
  return `hmac_sha256_v1_${createHmac("sha256", key)
    .update(canonicalJson(value))
    .digest("hex")}`;
}

function validateConfiguration(
  configuration: Readonly<PostgresDataMigrationBundleConfiguration>,
): readonly PostgresDataMigrationBundleSliceDefinition[] {
  if (
    !configuration ||
    typeof configuration !== "object" ||
    !versionPattern.test(configuration.version) ||
    !kindPattern.test(configuration.planKind) ||
    !configuration.planKind.endsWith("-plan") ||
    !kindPattern.test(configuration.evidenceKind) ||
    !configuration.evidenceKind.endsWith("-evidence") ||
    !Array.isArray(configuration.advisoryLockKeys) ||
    configuration.advisoryLockKeys.length === 0 ||
    configuration.advisoryLockKeys.length > 20 ||
    !Array.isArray(configuration.slices) ||
    configuration.slices.length === 0 ||
    configuration.slices.length > 20
  ) {
    fail("configuration-invalid");
  }

  const serializedLocks = configuration.advisoryLockKeys.map((lock) => {
    if (
      !Array.isArray(lock) ||
      lock.length !== 2 ||
      !lock.every((value) => Number.isSafeInteger(value) && value > 0)
    ) {
      fail("configuration-invalid");
    }
    return lock.join(":");
  });
  if (new Set(serializedLocks).size !== serializedLocks.length) {
    fail("configuration-invalid");
  }

  const ids = new Set<string>();
  for (const slice of configuration.slices) {
    if (
      !slice ||
      typeof slice !== "object" ||
      !identifierPattern.test(slice.id) ||
      ids.has(slice.id) ||
      !versionPattern.test(slice.version) ||
      typeof slice.planKind !== "string" ||
      !slice.planKind.endsWith("-plan") ||
      typeof slice.evidenceKind !== "string" ||
      !slice.evidenceKind.endsWith("-evidence") ||
      !Array.isArray(slice.requires) ||
      new Set(slice.requires).size !== slice.requires.length ||
      !slice.requires.every(
        (dependency: unknown) =>
          typeof dependency === "string" && ids.has(dependency),
      ) ||
      typeof slice.createPlan !== "function" ||
      typeof slice.execute !== "function"
    ) {
      fail("configuration-invalid");
    }
    ids.add(slice.id);
  }

  return Object.freeze(configuration.slices.map((slice) => Object.freeze({
    ...slice,
    requires: Object.freeze([...slice.requires]),
  })));
}

function manifestForPlans(
  slices: readonly PostgresDataMigrationBundleSliceDefinition[],
  plans: readonly PostgresDataMigrationBundlePlanSlice[],
): readonly PostgresDataMigrationBundleManifestSlice[] {
  return Object.freeze(plans.map(({ id, requires, plan }, index) => {
    const definition = slices[index];
    return Object.freeze({
      id,
      requires,
      planKind: definition.planKind,
      planVersion: definition.version,
      planId: plan.planId,
      manifestDigest: plan.manifestDigest,
      tableCount: plan.manifest.length,
      totalRowCount: plan.manifest.reduce(
        (total, table) => total + table.rowCount,
        0,
      ),
    });
  }));
}

function sourceDigestInput(
  version: string,
  plans: readonly PostgresDataMigrationBundlePlanSlice[],
): unknown {
  return {
    version,
    slices: plans.map(({ id, requires, plan }) => ({
      id,
      requires,
      planKind: plan.kind,
      planVersion: plan.version,
      manifest: plan.manifest,
    })),
  };
}

function bundleDigestInput(
  configuration: Readonly<PostgresDataMigrationBundleConfiguration>,
  createdAt: string,
  expiresAt: string,
  sourceDigest: string,
  manifest: readonly PostgresDataMigrationBundleManifestSlice[],
): unknown {
  return {
    kind: configuration.planKind,
    version: configuration.version,
    createdAt,
    expiresAt,
    sourceDigest,
    manifest,
  };
}

function bundleId(version: string, bundleDigest: string): string {
  return `${version}_${bundleDigest.slice("hmac_sha256_v1_".length)}`;
}

function requireSnapshotCoverage(
  definitions: readonly PostgresDataMigrationBundleSliceDefinition[],
  snapshots: readonly PostgresDataMigrationBundleSnapshotSlice[],
): void {
  if (!Array.isArray(snapshots) || snapshots.length !== definitions.length) {
    fail("bundle-invalid");
  }
  for (const [index, definition] of definitions.entries()) {
    const snapshot = snapshots[index];
    requireExactKeys(snapshot, ["id", "requires", "snapshot"], "bundle-invalid");
    if (
      snapshot.id !== definition.id ||
      canonicalJson(snapshot.requires) !== canonicalJson(definition.requires)
    ) {
      fail("bundle-invalid");
    }
  }
}

function requireChildPlan(
  definition: PostgresDataMigrationBundleSliceDefinition,
  slice: PostgresDataMigrationBundlePlanSlice,
  createdAt: string,
  expiresAt: string,
  evidenceHmacKey: string,
): PostgresDataMigrationPlan {
  requireExactKeys(slice, ["id", "requires", "plan"], "bundle-mismatch");
  if (
    slice.id !== definition.id ||
    canonicalJson(slice.requires) !== canonicalJson(definition.requires) ||
    slice.plan?.kind !== definition.planKind ||
    slice.plan.version !== definition.version ||
    slice.plan.createdAt !== createdAt ||
    slice.plan.expiresAt !== expiresAt ||
    !childDigestPattern.test(slice.plan.manifestDigest)
  ) {
    fail("bundle-mismatch", { sliceId: definition.id });
  }
  let recreated: PostgresDataMigrationPlan;
  try {
    recreated = definition.createPlan({
      snapshot: slice.plan.payload,
      createdAt,
      expiresAt,
      evidenceHmacKey,
    });
  } catch {
    fail("bundle-mismatch", { sliceId: definition.id });
  }
  if (!safeEqual(canonicalJson(recreated), canonicalJson(slice.plan))) {
    fail("bundle-mismatch", { sliceId: definition.id });
  }
  return recreated;
}

function requireChildEvidence(
  definition: PostgresDataMigrationBundleSliceDefinition,
  plan: PostgresDataMigrationPlan,
  evidence: PostgresDataMigrationEvidence,
  now: string,
): void {
  requireExactKeys(
    evidence,
    [
      "kind",
      "version",
      "planId",
      "manifestDigest",
      "completedAt",
      "tableCount",
      "totalRowCount",
      "tables",
    ],
    "slice-execution-failed",
  );
  if (
    evidence.kind !== definition.evidenceKind ||
    evidence.version !== definition.version ||
    evidence.planId !== plan.planId ||
    evidence.manifestDigest !== plan.manifestDigest ||
    evidence.completedAt !== now ||
    evidence.tableCount !== plan.manifest.length ||
    !Array.isArray(evidence.tables) ||
    evidence.tables.length !== plan.manifest.length
  ) {
    fail("slice-execution-failed", { sliceId: definition.id });
  }
  let totalRowCount = 0;
  for (const [index, table] of evidence.tables.entries()) {
    requireExactKeys(
      table,
      ["name", "rowCount", "sourceDigest", "targetDigest"],
      "slice-execution-failed",
    );
    const source = plan.manifest[index];
    if (
      table.name !== source.name ||
      table.rowCount !== source.rowCount ||
      table.sourceDigest !== source.sourceDigest ||
      table.targetDigest !== source.sourceDigest
    ) {
      fail("slice-execution-failed", { sliceId: definition.id });
    }
    totalRowCount += table.rowCount;
  }
  if (evidence.totalRowCount !== totalRowCount) {
    fail("slice-execution-failed", { sliceId: definition.id });
  }
}

async function requireUnusedReceipt(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  let result;
  try {
    result = await transaction.query(
      `SELECT bundle_id
       FROM ${receiptTableName}
       WHERE execution_scope = $1
       LIMIT 1
       FOR UPDATE`,
      [receiptExecutionScope],
    );
  } catch {
    fail("receipt-unavailable");
  }
  if (result.rowCount !== 0) fail("bundle-replayed");
}

function nestedTransactionManager(
  transaction: PostgresQueryExecutor,
): PostgresTransactionManager {
  return Object.freeze({
    async transaction<TResult>(
      options: Readonly<{ isolationLevel: "read-committed" }>,
      execute: (nested: PostgresQueryExecutor) => Promise<TResult>,
    ): Promise<TResult> {
      if (options?.isolationLevel !== "read-committed" ||
          typeof execute !== "function") {
        fail("dependency-invalid");
      }
      return execute(transaction);
    },
  });
}

export function createPostgresDataMigrationBundleProtocol(
  configuration: Readonly<PostgresDataMigrationBundleConfiguration>,
): Readonly<PostgresDataMigrationBundleProtocol> {
  const slices = validateConfiguration(configuration);

  function createPlan(input: Readonly<{
    snapshots: readonly PostgresDataMigrationBundleSnapshotSlice[];
    createdAt: string;
    expiresAt: string;
    evidenceHmacKey: string;
  }>): PostgresDataMigrationBundlePlan {
    const key = requireEvidenceKey(input?.evidenceHmacKey);
    const createdAt = normalizeTimestamp(input?.createdAt);
    const expiresAt = normalizeTimestamp(input?.expiresAt);
    requirePlanWindow(createdAt, expiresAt);
    requireSnapshotCoverage(slices, input?.snapshots);

    const plans = Object.freeze(slices.map((definition, index) =>
      Object.freeze({
        id: definition.id,
        requires: definition.requires,
        plan: definition.createPlan({
          snapshot: input.snapshots[index].snapshot,
          createdAt,
          expiresAt,
          evidenceHmacKey: input.evidenceHmacKey,
        }),
      })));
    const manifest = manifestForPlans(slices, plans);
    const sourceDigest = digest(
      sourceDigestInput(configuration.version, plans),
      key,
    );
    const bundleDigest = digest(
      bundleDigestInput(
        configuration,
        createdAt,
        expiresAt,
        sourceDigest,
        manifest,
      ),
      key,
    );
    return Object.freeze({
      kind: configuration.planKind,
      version: configuration.version,
      bundleId: bundleId(configuration.version, bundleDigest),
      createdAt,
      expiresAt,
      sourceDigest,
      bundleDigest,
      manifest,
      slices: plans,
    });
  }

  function verifyPlan(
    plan: PostgresDataMigrationBundlePlan,
    evidenceHmacKey: string,
    now: string,
  ): readonly PostgresDataMigrationBundlePlanSlice[] {
    requireExactKeys(
      plan,
      [
        "kind",
        "version",
        "bundleId",
        "createdAt",
        "expiresAt",
        "sourceDigest",
        "bundleDigest",
        "manifest",
        "slices",
      ],
      "bundle-invalid",
    );
    const key = requireEvidenceKey(evidenceHmacKey);
    const createdAt = normalizeTimestamp(plan.createdAt);
    const expiresAt = normalizeTimestamp(plan.expiresAt);
    requirePlanWindow(createdAt, expiresAt);
    if (
      plan.kind !== configuration.planKind ||
      plan.version !== configuration.version ||
      createdAt !== plan.createdAt ||
      expiresAt !== plan.expiresAt ||
      !digestPattern.test(plan.sourceDigest) ||
      !digestPattern.test(plan.bundleDigest) ||
      !Array.isArray(plan.slices) ||
      plan.slices.length !== slices.length ||
      !Array.isArray(plan.manifest) ||
      plan.manifest.length !== slices.length
    ) {
      fail("bundle-invalid");
    }
    const normalizedNow = normalizeTimestamp(now);
    const nowTime = Date.parse(normalizedNow);
    if (nowTime < Date.parse(createdAt) || nowTime > Date.parse(expiresAt)) {
      fail("bundle-expired");
    }

    const verifiedPlans = Object.freeze(slices.map((definition, index) =>
      Object.freeze({
        id: definition.id,
        requires: definition.requires,
        plan: requireChildPlan(
          definition,
          plan.slices[index],
          createdAt,
          expiresAt,
          evidenceHmacKey,
        ),
      })));
    const expectedManifest = manifestForPlans(slices, verifiedPlans);
    const expectedSourceDigest = digest(
      sourceDigestInput(configuration.version, verifiedPlans),
      key,
    );
    const expectedBundleDigest = digest(
      bundleDigestInput(
        configuration,
        createdAt,
        expiresAt,
        expectedSourceDigest,
        expectedManifest,
      ),
      key,
    );
    if (
      !safeEqual(canonicalJson(expectedManifest), canonicalJson(plan.manifest)) ||
      !safeEqual(expectedSourceDigest, plan.sourceDigest) ||
      !safeEqual(expectedBundleDigest, plan.bundleDigest) ||
      plan.bundleId !== bundleId(configuration.version, expectedBundleDigest)
    ) {
      fail("bundle-mismatch");
    }
    return verifiedPlans;
  }

  async function execute(input: Readonly<{
    plan: PostgresDataMigrationBundlePlan;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    now: string;
  }>): Promise<PostgresDataMigrationBundleEvidence> {
    if (typeof input?.transactions?.transaction !== "function") {
      fail("dependency-invalid");
    }
    const verifiedPlans = verifyPlan(
      input.plan,
      input.evidenceHmacKey,
      input.now,
    );
    const completedAt = normalizeTimestamp(input.now);
    const key = requireEvidenceKey(input.evidenceHmacKey);

    return input.transactions.transaction(
      { isolationLevel: "read-committed" },
      async (transaction) => {
        for (const lock of configuration.advisoryLockKeys) {
          await transaction.query(
            "SELECT pg_advisory_xact_lock($1, $2)",
            [...lock],
          );
        }
        await transaction.query(
          `LOCK TABLE ${receiptTableName} IN SHARE ROW EXCLUSIVE MODE`,
          [],
        );
        await requireUnusedReceipt(transaction);

        const transactions = nestedTransactionManager(transaction);
        const evidenceSlices: PostgresDataMigrationBundleEvidenceSlice[] = [];
        for (const [index, definition] of slices.entries()) {
          let evidence: PostgresDataMigrationEvidence;
          try {
            evidence = await definition.execute({
              plan: verifiedPlans[index].plan,
              transactions,
              evidenceHmacKey: input.evidenceHmacKey,
              now: completedAt,
            });
            requireChildEvidence(
              definition,
              verifiedPlans[index].plan,
              evidence,
              completedAt,
            );
          } catch (error) {
            if (
              error instanceof PostgresDataMigrationBundleError &&
              error.code === "slice-execution-failed"
            ) {
              throw error;
            }
            fail("slice-execution-failed", { sliceId: definition.id });
          }
          evidenceSlices.push(Object.freeze({
            id: definition.id,
            requires: definition.requires,
            evidence,
          }));
        }

        const frozenSlices = Object.freeze(evidenceSlices);
        const tableCount = frozenSlices.reduce(
          (total, slice) => total + slice.evidence.tableCount,
          0,
        );
        const totalRowCount = frozenSlices.reduce(
          (total, slice) => total + slice.evidence.totalRowCount,
          0,
        );
        const evidenceCore = Object.freeze({
          kind: configuration.evidenceKind,
          version: configuration.version,
          bundleId: input.plan.bundleId,
          sourceDigest: input.plan.sourceDigest,
          bundleDigest: input.plan.bundleDigest,
          completedAt,
          sliceCount: frozenSlices.length,
          tableCount,
          totalRowCount,
          slices: frozenSlices,
        });
        const evidenceDigest = digest(evidenceCore, key);

        let receipt;
        try {
          receipt = await transaction.query(
            `INSERT INTO ${receiptTableName} (
               execution_scope,
               bundle_id,
               bundle_version,
               source_digest,
               bundle_digest,
               plan_created_at,
               plan_expires_at,
               executed_at,
               slice_count,
               table_count,
               total_row_count,
               evidence_digest
             ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz,
               $7::timestamptz, $8::timestamptz, $9, $10, $11, $12)`,
            [
              receiptExecutionScope,
              input.plan.bundleId,
              configuration.version,
              input.plan.sourceDigest,
              input.plan.bundleDigest,
              input.plan.createdAt,
              input.plan.expiresAt,
              completedAt,
              frozenSlices.length,
              tableCount,
              totalRowCount,
              evidenceDigest,
            ],
          );
        } catch {
          fail("receipt-write-failed");
        }
        if (receipt.rowCount !== 1) fail("receipt-write-failed");

        return Object.freeze({
          ...evidenceCore,
          evidenceDigest,
        });
      },
    );
  }

  return Object.freeze({
    version: configuration.version,
    sliceDefinitions: Object.freeze(slices.map((slice) => Object.freeze({
      id: slice.id,
      requires: slice.requires,
      version: slice.version,
      planKind: slice.planKind,
      evidenceKind: slice.evidenceKind,
    }))),
    createPlan,
    execute,
  });
}
