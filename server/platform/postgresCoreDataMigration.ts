import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const migrationVersion = "connect_postgres_core_data_v1";
const evidenceKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const consentEventKeyPattern = /^contact_consent_v1_[0-9a-f]{64}$/;
const maximumPlanLifetimeMs = 15 * 60 * 1_000;
const batchSize = 200;

type CoreDataKind = "integer" | "json" | "text" | "timestamp";

interface CoreDataColumn {
  readonly name: string;
  readonly kind: CoreDataKind;
  readonly nullable?: true;
}

interface CoreDataTableContract {
  readonly name: string;
  readonly columns: readonly CoreDataColumn[];
  readonly orderBy: readonly string[];
  readonly identityColumn?: "id";
}

type CoreDataValue = number | string | null;
type CoreDataRow = Readonly<Record<string, CoreDataValue>>;
type CoreDataTables = Readonly<Record<string, readonly CoreDataRow[]>>;

export interface PostgresCoreDataSnapshot {
  readonly version: typeof migrationVersion;
  readonly tables: CoreDataTables;
}

export interface PostgresCoreDataMigrationManifestTable {
  readonly name: string;
  readonly rowCount: number;
  readonly sourceDigest: string;
}

export interface PostgresCoreDataMigrationPlan {
  readonly kind: "postgres-core-data-migration-plan";
  readonly version: typeof migrationVersion;
  readonly planId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly manifestDigest: string;
  readonly manifest: readonly PostgresCoreDataMigrationManifestTable[];
  readonly payload: PostgresCoreDataSnapshot;
}

export interface PostgresCoreDataMigrationEvidenceTable {
  readonly name: string;
  readonly rowCount: number;
  readonly sourceDigest: string;
  readonly targetDigest: string;
}

export interface PostgresCoreDataMigrationEvidence {
  readonly kind: "postgres-core-data-migration-evidence";
  readonly version: typeof migrationVersion;
  readonly planId: string;
  readonly manifestDigest: string;
  readonly completedAt: string;
  readonly tableCount: number;
  readonly totalRowCount: number;
  readonly tables: readonly PostgresCoreDataMigrationEvidenceTable[];
}

export type PostgresCoreDataMigrationErrorCode =
  | "dependency-invalid"
  | "evidence-key-invalid"
  | "manifest-mismatch"
  | "plan-expired"
  | "plan-invalid"
  | "row-invalid"
  | "snapshot-invalid"
  | "target-not-empty"
  | "target-verification-failed";

export class PostgresCoreDataMigrationError extends Error {
  readonly code: PostgresCoreDataMigrationErrorCode;
  readonly table: string | null;
  readonly rowIndex: number | null;

  constructor(
    code: PostgresCoreDataMigrationErrorCode,
    context: Readonly<{
      table?: string;
      rowIndex?: number;
    }> = {},
  ) {
    super(`PostgreSQL core data migration failed: ${code}`);
    this.name = "PostgresCoreDataMigrationError";
    this.code = code;
    this.table = context.table ?? null;
    this.rowIndex = context.rowIndex ?? null;
  }
}

export const POSTGRES_CORE_DATA_TABLE_CONTRACTS = Object.freeze([
  Object.freeze({
    name: "tenants",
    columns: Object.freeze([
      column("id", "integer"),
      column("display_name", "text"),
      column("status", "text"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
      column("provisioning_key", "text", true),
    ]),
    orderBy: Object.freeze(["id"]),
    identityColumn: "id",
  }),
  Object.freeze({
    name: "tenant_memberships",
    columns: Object.freeze([
      column("id", "integer"),
      column("tenant_id", "integer"),
      column("external_user_id", "text"),
      column("role", "text"),
      column("status", "text"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
      column("version", "integer"),
    ]),
    orderBy: Object.freeze(["id"]),
    identityColumn: "id",
  }),
  Object.freeze({
    name: "tenant_selections",
    columns: Object.freeze([
      column("external_user_id", "text"),
      column("tenant_id", "integer"),
      column("version", "integer"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["external_user_id"]),
  }),
  Object.freeze({
    name: "business_profiles",
    columns: Object.freeze([
      column("tenant_id", "integer"),
      column("business_name", "text"),
      column("timezone", "text"),
      column("interface_language", "text"),
      column("version", "integer"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id"]),
  }),
  Object.freeze({
    name: "contacts",
    columns: Object.freeze([
      column("id", "integer"),
      column("tenant_id", "integer"),
      column("phone_e164", "text"),
      column("first_name", "text", true),
      column("last_name", "text", true),
      column("email", "text", true),
      column("company", "text", true),
      column("mailing_status", "text"),
      column("consent_status", "text"),
      column("consent_source", "text", true),
      column("consent_recorded_at", "timestamp", true),
      column("consent_withdrawn_at", "timestamp", true),
      column("consent_evidence_reference", "text", true),
      column("version", "integer"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["id"]),
    identityColumn: "id",
  }),
  Object.freeze({
    name: "contact_consent_events",
    columns: Object.freeze([
      column("id", "integer"),
      column("tenant_id", "integer"),
      column("contact_id", "integer"),
      column("event_type", "text"),
      column("source", "text"),
      column("occurred_at", "timestamp"),
      column("evidence_reference", "text", true),
      column("actor_external_user_id", "text"),
      column("idempotency_key", "text"),
      column("created_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["id"]),
    identityColumn: "id",
  }),
  Object.freeze({
    name: "audit_logs",
    columns: Object.freeze([
      column("id", "integer"),
      column("tenant_id", "integer"),
      column("actor_external_user_id", "text", true),
      column("action", "text"),
      column("target_type", "text"),
      column("target_id", "text", true),
      column("metadata_json", "json", true),
      column("created_at", "timestamp"),
      column("idempotency_key", "text", true),
    ]),
    orderBy: Object.freeze(["id"]),
    identityColumn: "id",
  }),
] satisfies readonly CoreDataTableContract[]);

function column(
  name: string,
  kind: CoreDataKind,
  nullable = false,
): Readonly<CoreDataColumn> {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

function fail(
  code: PostgresCoreDataMigrationErrorCode,
  context?: Readonly<{ table?: string; rowIndex?: number }>,
): never {
  throw new PostgresCoreDataMigrationError(code, context);
}

function requireEvidenceKey(encoded: string): Buffer {
  if (typeof encoded !== "string" || !evidenceKeyPattern.test(encoded)) {
    fail("evidence-key-invalid");
  }

  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length !== 32) {
    fail("evidence-key-invalid");
  }

  return decoded;
}

function normalizeTimestamp(value: unknown): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      fail("row-invalid");
    }
    return value.toISOString();
  }

  if (typeof value !== "string" || value.length === 0) {
    fail("row-invalid");
  }

  const sqliteUtc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
  const zonedIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!sqliteUtc.test(value) && !zonedIso.test(value)) {
    fail("row-invalid");
  }
  const parseable = sqliteUtc.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const timestamp = new Date(parseable);
  if (!Number.isFinite(timestamp.getTime())) {
    fail("row-invalid");
  }
  return timestamp.toISOString();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("row-invalid");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (
        left < right ? -1 : left > right ? 1 : 0
      ));
    return `{${entries.map(([key, entry]) => (
      `${JSON.stringify(key)}:${canonicalJson(entry)}`
    )).join(",")}}`;
  }
  fail("row-invalid");
}

function normalizeJson(value: unknown): string {
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      fail("row-invalid");
    }
    return canonicalJson(parsed);
  }
  return canonicalJson(value);
}

function normalizeValue(
  columnContract: Readonly<CoreDataColumn>,
  value: unknown,
): CoreDataValue {
  if (value === null || value === undefined) {
    if (columnContract.nullable) {
      return null;
    }
    fail("row-invalid");
  }

  if (columnContract.kind === "integer") {
    const normalized = typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : value;
    if (!Number.isSafeInteger(normalized) || Number(normalized) < 1) {
      fail("row-invalid");
    }
    return Number(normalized);
  }

  if (columnContract.kind === "timestamp") {
    return normalizeTimestamp(value);
  }

  if (columnContract.kind === "json") {
    return normalizeJson(value);
  }

  if (typeof value !== "string") {
    fail("row-invalid");
  }
  return value;
}

function normalizeRow(
  table: Readonly<CoreDataTableContract>,
  row: unknown,
  rowIndex: number,
): CoreDataRow {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    fail("row-invalid", { table: table.name, rowIndex });
  }

  const record = row as Record<string, unknown>;
  const expectedColumns = table.columns.map(({ name }) => name);
  const actualColumns = Object.keys(record).sort();
  if (
    actualColumns.length !== expectedColumns.length ||
    !expectedColumns.slice().sort().every(
      (name, index) => name === actualColumns[index],
    )
  ) {
    fail("row-invalid", { table: table.name, rowIndex });
  }

  try {
    const normalized = Object.fromEntries(
      table.columns.map((columnContract) => [
        columnContract.name,
        normalizeValue(columnContract, record[columnContract.name]),
      ]),
    ) as Record<string, CoreDataValue>;

    if (
      table.name === "contact_consent_events" &&
      !consentEventKeyPattern.test(String(normalized.idempotency_key))
    ) {
      fail("row-invalid");
    }

    return Object.freeze(normalized);
  } catch (error) {
    if (error instanceof PostgresCoreDataMigrationError) {
      fail(error.code, { table: table.name, rowIndex });
    }
    throw error;
  }
}

function compareRows(
  table: Readonly<CoreDataTableContract>,
  left: CoreDataRow,
  right: CoreDataRow,
): number {
  for (const columnName of table.orderBy) {
    const leftValue = left[columnName];
    const rightValue = right[columnName];
    if (leftValue === rightValue) {
      continue;
    }
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue - rightValue;
    }
    const leftText = String(leftValue);
    const rightText = String(rightValue);
    return leftText < rightText ? -1 : 1;
  }
  return 0;
}

export function createPostgresCoreDataSnapshot(
  input: Readonly<Record<string, readonly unknown[]>>,
): PostgresCoreDataSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("snapshot-invalid");
  }
  const tableNames = POSTGRES_CORE_DATA_TABLE_CONTRACTS.map(({ name }) => name);
  if (
    Object.keys(input).sort().join("\n") !==
    tableNames.slice().sort().join("\n")
  ) {
    fail("snapshot-invalid");
  }

  const tables = Object.fromEntries(
    POSTGRES_CORE_DATA_TABLE_CONTRACTS.map((table) => {
      const inputRows = input[table.name];
      if (!Array.isArray(inputRows)) {
        fail("snapshot-invalid");
      }
      const rows = inputRows
        .map((row, index) => normalizeRow(table, row, index))
        .sort((left, right) => compareRows(table, left, right));
      return [table.name, Object.freeze(rows)];
    }),
  );

  return Object.freeze({
    version: migrationVersion,
    tables: Object.freeze(tables),
  });
}

function digestRows(
  table: Readonly<CoreDataTableContract>,
  rows: readonly CoreDataRow[],
  key: Buffer,
): string {
  const hmac = createHmac("sha256", key);
  hmac.update(`${migrationVersion}\n${table.name}\n`);
  for (const row of rows) {
    hmac.update(canonicalJson(row));
    hmac.update("\n");
  }
  return `hmac_sha256_v1_${hmac.digest("hex")}`;
}

function digestManifest(
  manifest: readonly PostgresCoreDataMigrationManifestTable[],
  createdAt: string,
  expiresAt: string,
): string {
  return createHash("sha256")
    .update(canonicalJson({
      version: migrationVersion,
      createdAt,
      expiresAt,
      manifest,
    }))
    .digest("hex");
}

function requirePlanWindow(createdAt: string, expiresAt: string): void {
  const createdTime = new Date(createdAt).getTime();
  const expiresTime = new Date(expiresAt).getTime();
  if (
    !Number.isFinite(createdTime) ||
    !Number.isFinite(expiresTime) ||
    expiresTime <= createdTime ||
    expiresTime - createdTime > maximumPlanLifetimeMs
  ) {
    fail("plan-invalid");
  }
}

export function createPostgresCoreDataMigrationPlan(input: Readonly<{
  snapshot: PostgresCoreDataSnapshot;
  createdAt: string;
  expiresAt: string;
  evidenceHmacKey: string;
}>): PostgresCoreDataMigrationPlan {
  if (input?.snapshot?.version !== migrationVersion) {
    fail("snapshot-invalid");
  }
  const key = requireEvidenceKey(input.evidenceHmacKey);
  const createdAt = normalizeTimestamp(input.createdAt);
  const expiresAt = normalizeTimestamp(input.expiresAt);
  requirePlanWindow(createdAt, expiresAt);

  const checkedSnapshot = createPostgresCoreDataSnapshot(
    input.snapshot.tables,
  );
  const manifest = Object.freeze(
    POSTGRES_CORE_DATA_TABLE_CONTRACTS.map((table) => Object.freeze({
      name: table.name,
      rowCount: checkedSnapshot.tables[table.name].length,
      sourceDigest: digestRows(
        table,
        checkedSnapshot.tables[table.name],
        key,
      ),
    })),
  );
  const manifestDigest = digestManifest(manifest, createdAt, expiresAt);

  return Object.freeze({
    kind: "postgres-core-data-migration-plan",
    version: migrationVersion,
    planId: `${migrationVersion}_${manifestDigest}`,
    createdAt,
    expiresAt,
    manifestDigest,
    manifest,
    payload: checkedSnapshot,
  });
}

function safeDigestEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPlan(
  plan: PostgresCoreDataMigrationPlan,
  key: Buffer,
  now: string,
): void {
  if (
    plan?.kind !== "postgres-core-data-migration-plan" ||
    plan.version !== migrationVersion ||
    plan.payload?.version !== migrationVersion ||
    !Array.isArray(plan.manifest)
  ) {
    fail("plan-invalid");
  }
  requirePlanWindow(plan.createdAt, plan.expiresAt);
  const nowTime = new Date(normalizeTimestamp(now)).getTime();
  if (
    nowTime < new Date(plan.createdAt).getTime() ||
    nowTime > new Date(plan.expiresAt).getTime()
  ) {
    fail("plan-expired");
  }

  const expectedManifest = POSTGRES_CORE_DATA_TABLE_CONTRACTS.map(
    (table) => ({
      name: table.name,
      rowCount: plan.payload.tables[table.name]?.length,
      sourceDigest: digestRows(
        table,
        plan.payload.tables[table.name] ?? [],
        key,
      ),
    }),
  );
  const expectedManifestDigest = digestManifest(
    expectedManifest,
    plan.createdAt,
    plan.expiresAt,
  );
  if (
    !safeDigestEqual(expectedManifestDigest, plan.manifestDigest) ||
    !safeDigestEqual(
      canonicalJson(expectedManifest),
      canonicalJson(plan.manifest),
    ) ||
    plan.planId !== `${migrationVersion}_${expectedManifestDigest}`
  ) {
    fail("manifest-mismatch");
  }
}

function placeholders(
  columns: readonly CoreDataColumn[],
  rowOffset: number,
): string {
  return `(${columns.map((columnContract, columnIndex) => {
    const placeholder = `$${rowOffset + columnIndex + 1}`;
    if (columnContract.kind === "timestamp") {
      return `${placeholder}::timestamptz`;
    }
    if (columnContract.kind === "json") {
      return `${placeholder}::jsonb`;
    }
    return placeholder;
  }).join(", ")})`;
}

async function requireEmptyTarget(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  for (const table of POSTGRES_CORE_DATA_TABLE_CONTRACTS) {
    const result = await transaction.query<{ count: number | string }>(
      `SELECT count(*)::bigint AS count FROM ${table.name}`,
      [],
    );
    if (result.rowCount !== 1 || Number(result.rows[0]?.count) !== 0) {
      fail("target-not-empty", { table: table.name });
    }
  }
}

async function insertRows(
  transaction: PostgresQueryExecutor,
  table: Readonly<CoreDataTableContract>,
  rows: readonly CoreDataRow[],
): Promise<void> {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const parameters: PostgresParameter[] = [];
    const values = batch.map((row) => {
      const rowOffset = parameters.length;
      for (const columnContract of table.columns) {
        parameters.push(row[columnContract.name]);
      }
      return placeholders(table.columns, rowOffset);
    });
    const result = await transaction.query(
      `INSERT INTO ${table.name} (${table.columns.map(
        ({ name }) => name,
      ).join(", ")}) VALUES ${values.join(", ")}`,
      parameters,
    );
    if (result.rowCount !== batch.length) {
      fail("target-verification-failed", { table: table.name });
    }
  }
}

async function synchronizeIdentity(
  transaction: PostgresQueryExecutor,
  table: Readonly<CoreDataTableContract>,
): Promise<void> {
  if (!table.identityColumn) {
    return;
  }
  const result = await transaction.query(
    `SELECT setval(
       pg_get_serial_sequence('public.${table.name}', 'id'),
       COALESCE(max(id), 1),
       count(*) > 0
     )
     FROM ${table.name}`,
    [],
  );
  if (result.rowCount !== 1) {
    fail("target-verification-failed", { table: table.name });
  }
}

async function readTargetRows(
  transaction: PostgresQueryExecutor,
  table: Readonly<CoreDataTableContract>,
): Promise<readonly CoreDataRow[]> {
  const result = await transaction.query<Record<string, unknown>>(
    `SELECT ${table.columns.map(({ name }) => name).join(", ")}
     FROM ${table.name}
     ORDER BY ${table.orderBy.join(", ")}`,
    [],
  );
  return Object.freeze(
    result.rows
      .map((row, index) => normalizeRow(table, row, index))
      .sort((left, right) => compareRows(table, left, right)),
  );
}

export async function executePostgresCoreDataMigration(input: Readonly<{
  plan: PostgresCoreDataMigrationPlan;
  transactions: PostgresTransactionManager;
  evidenceHmacKey: string;
  now: string;
}>): Promise<PostgresCoreDataMigrationEvidence> {
  if (typeof input?.transactions?.transaction !== "function") {
    fail("dependency-invalid");
  }
  const key = requireEvidenceKey(input.evidenceHmacKey);
  verifyPlan(input.plan, key, input.now);

  return input.transactions.transaction(
    { isolationLevel: "read-committed" },
    async (transaction) => {
      await transaction.query(
        "SELECT pg_advisory_xact_lock(1129270867, 1)",
        [],
      );
      await transaction.query(
        `LOCK TABLE ${POSTGRES_CORE_DATA_TABLE_CONTRACTS.map(
          ({ name }) => name,
        ).join(", ")} IN ACCESS EXCLUSIVE MODE`,
        [],
      );
      await requireEmptyTarget(transaction);

      for (const table of POSTGRES_CORE_DATA_TABLE_CONTRACTS) {
        await insertRows(
          transaction,
          table,
          input.plan.payload.tables[table.name],
        );
      }
      for (const table of POSTGRES_CORE_DATA_TABLE_CONTRACTS) {
        await synchronizeIdentity(transaction, table);
      }

      const evidenceTables: PostgresCoreDataMigrationEvidenceTable[] = [];
      for (
        let index = 0;
        index < POSTGRES_CORE_DATA_TABLE_CONTRACTS.length;
        index += 1
      ) {
        const table = POSTGRES_CORE_DATA_TABLE_CONTRACTS[index];
        const targetRows = await readTargetRows(transaction, table);
        const targetDigest = digestRows(table, targetRows, key);
        const sourceManifest = input.plan.manifest[index];
        if (
          targetRows.length !== sourceManifest.rowCount ||
          !safeDigestEqual(targetDigest, sourceManifest.sourceDigest)
        ) {
          fail("target-verification-failed", { table: table.name });
        }
        evidenceTables.push(Object.freeze({
          name: table.name,
          rowCount: targetRows.length,
          sourceDigest: sourceManifest.sourceDigest,
          targetDigest,
        }));
      }

      return Object.freeze({
        kind: "postgres-core-data-migration-evidence",
        version: migrationVersion,
        planId: input.plan.planId,
        manifestDigest: input.plan.manifestDigest,
        completedAt: normalizeTimestamp(input.now),
        tableCount: evidenceTables.length,
        totalRowCount: evidenceTables.reduce(
          (total, { rowCount }) => total + rowCount,
          0,
        ),
        tables: Object.freeze(evidenceTables),
      });
    },
  );
}
