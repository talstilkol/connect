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

const evidenceKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const identifierPattern = /^[a-z][a-z0-9_]*$/;
const versionPattern = /^connect_postgres_[a-z0-9_]+_v[1-9][0-9]*$/;
const kindPattern = /^postgres-[a-z0-9]+(?:-[a-z0-9]+)*-migration-(?:plan|evidence)$/;
const maximumPlanLifetimeMilliseconds = 15 * 60 * 1_000;
const maximumTables = 20;
const maximumColumns = 64;
const batchSize = 200;

export type PostgresDataMigrationColumnKind =
  | "boolean-integer"
  | "date"
  | "json"
  | "nonnegative-integer"
  | "positive-integer"
  | "text"
  | "timestamp";

export interface PostgresDataMigrationColumnContract {
  readonly name: string;
  readonly kind: PostgresDataMigrationColumnKind;
  readonly nullable?: true;
}

export type PostgresDataMigrationValue = number | string | null;
export type PostgresDataMigrationRow = Readonly<
  Record<string, PostgresDataMigrationValue>
>;

export interface PostgresDataMigrationTableContract {
  readonly name: string;
  readonly columns: readonly PostgresDataMigrationColumnContract[];
  readonly orderBy: readonly string[];
  readonly identityColumn?: string;
  readonly validate?: (row: PostgresDataMigrationRow) => void;
}

export interface PostgresDataMigrationProtocolConfiguration {
  readonly version: string;
  readonly planKind: string;
  readonly evidenceKind: string;
  readonly advisoryLockKey: readonly [number, number];
  readonly tables: readonly PostgresDataMigrationTableContract[];
  readonly triggerDisabledTables?: readonly string[];
  readonly verifyTargetReady?: (
    transaction: PostgresQueryExecutor,
  ) => Promise<void>;
  readonly verifyLoadedState?: (
    transaction: PostgresQueryExecutor,
  ) => Promise<void>;
}

export interface PostgresDataMigrationSnapshot {
  readonly version: string;
  readonly tables: Readonly<
    Record<string, readonly PostgresDataMigrationRow[]>
  >;
}

export interface PostgresDataMigrationManifestTable {
  readonly name: string;
  readonly rowCount: number;
  readonly sourceDigest: string;
}

export interface PostgresDataMigrationPlan {
  readonly kind: string;
  readonly version: string;
  readonly planId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly manifestDigest: string;
  readonly manifest: readonly PostgresDataMigrationManifestTable[];
  readonly payload: PostgresDataMigrationSnapshot;
}

export interface PostgresDataMigrationEvidenceTable {
  readonly name: string;
  readonly rowCount: number;
  readonly sourceDigest: string;
  readonly targetDigest: string;
}

export interface PostgresDataMigrationEvidence {
  readonly kind: string;
  readonly version: string;
  readonly planId: string;
  readonly manifestDigest: string;
  readonly completedAt: string;
  readonly tableCount: number;
  readonly totalRowCount: number;
  readonly tables: readonly PostgresDataMigrationEvidenceTable[];
}

export type PostgresDataMigrationErrorCode =
  | "configuration-invalid"
  | "dependency-invalid"
  | "evidence-key-invalid"
  | "manifest-mismatch"
  | "plan-expired"
  | "plan-invalid"
  | "row-invalid"
  | "snapshot-invalid"
  | "target-not-empty"
  | "target-verification-failed";

export class PostgresDataMigrationError extends Error {
  readonly code: PostgresDataMigrationErrorCode;
  readonly table: string | null;
  readonly rowIndex: number | null;

  constructor(
    code: PostgresDataMigrationErrorCode,
    context: Readonly<{ table?: string; rowIndex?: number }> = {},
  ) {
    super(`PostgreSQL data migration failed: ${code}`);
    this.name = "PostgresDataMigrationError";
    this.code = code;
    this.table = context.table ?? null;
    this.rowIndex = context.rowIndex ?? null;
  }
}

export interface PostgresDataMigrationProtocol {
  readonly version: string;
  readonly tableContracts: readonly PostgresDataMigrationTableContract[];
  readonly createSnapshot: (
    input: Readonly<Record<string, readonly unknown[]>>,
  ) => PostgresDataMigrationSnapshot;
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

function fail(
  code: PostgresDataMigrationErrorCode,
  context?: Readonly<{ table?: string; rowIndex?: number }>,
): never {
  throw new PostgresDataMigrationError(code, context);
}

function requireConfiguration(
  configuration: Readonly<PostgresDataMigrationProtocolConfiguration>,
): readonly PostgresDataMigrationTableContract[] {
  if (
    !configuration ||
    typeof configuration !== "object" ||
    !versionPattern.test(configuration.version) ||
    !kindPattern.test(configuration.planKind) ||
    !configuration.planKind.endsWith("-plan") ||
    !kindPattern.test(configuration.evidenceKind) ||
    !configuration.evidenceKind.endsWith("-evidence") ||
    !Array.isArray(configuration.advisoryLockKey) ||
    configuration.advisoryLockKey.length !== 2 ||
    !configuration.advisoryLockKey.every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    !Array.isArray(configuration.tables) ||
    configuration.tables.length === 0 ||
    configuration.tables.length > maximumTables ||
    (configuration.triggerDisabledTables !== undefined &&
      !Array.isArray(configuration.triggerDisabledTables)) ||
    (configuration.verifyTargetReady !== undefined &&
      typeof configuration.verifyTargetReady !== "function") ||
    (configuration.verifyLoadedState !== undefined &&
      typeof configuration.verifyLoadedState !== "function")
  ) {
    fail("configuration-invalid");
  }

  const configuredTables = configuration.tables as readonly (
    PostgresDataMigrationTableContract
  )[];
  const tableNames = new Set<string>();
  for (const table of configuredTables) {
    if (
      !table ||
      typeof table !== "object" ||
      !identifierPattern.test(table.name) ||
      tableNames.has(table.name) ||
      !Array.isArray(table.columns) ||
      table.columns.length === 0 ||
      table.columns.length > maximumColumns ||
      !Array.isArray(table.orderBy) ||
      table.orderBy.length === 0 ||
      (table.validate !== undefined && typeof table.validate !== "function")
    ) {
      fail("configuration-invalid");
    }
    tableNames.add(table.name);

    const columnNames = new Set<string>();
    for (const column of table.columns) {
      if (
        !column ||
        typeof column !== "object" ||
        Object.keys(column).some(
          (key) => !["kind", "name", "nullable"].includes(key),
        ) ||
        !identifierPattern.test(column.name) ||
        columnNames.has(column.name) ||
        ![
          "boolean-integer",
          "date",
          "json",
          "nonnegative-integer",
          "positive-integer",
          "text",
          "timestamp",
        ].includes(column.kind) ||
        (column.nullable !== undefined && column.nullable !== true)
      ) {
        fail("configuration-invalid");
      }
      columnNames.add(column.name);
    }

    if (
      new Set(table.orderBy).size !== table.orderBy.length ||
      !table.orderBy.every((name) => columnNames.has(name)) ||
      (table.identityColumn !== undefined &&
        (!columnNames.has(table.identityColumn) ||
          table.columns.find(({ name }) => name === table.identityColumn)
            ?.kind !== "positive-integer"))
    ) {
      fail("configuration-invalid");
    }
  }

  const triggerDisabledTables = configuration.triggerDisabledTables ?? [];
  if (
    new Set(triggerDisabledTables).size !== triggerDisabledTables.length ||
    !triggerDisabledTables.every((tableName) => tableNames.has(tableName))
  ) {
    fail("configuration-invalid");
  }

  return Object.freeze(configuredTables.map((table) => Object.freeze({
    ...table,
    columns: Object.freeze(table.columns.map((column) => Object.freeze({
      ...column,
    }))),
    orderBy: Object.freeze([...table.orderBy]),
  })));
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
    if (!Number.isFinite(value.getTime())) fail("row-invalid");
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
  const parsed = new Date(
    sqliteUtc.test(value) ? `${value.replace(" ", "T")}Z` : value,
  );
  if (!Number.isFinite(parsed.getTime())) fail("row-invalid");
  return parsed.toISOString();
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail("row-invalid");
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    fail("row-invalid");
  }
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("row-invalid");
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
  fail("row-invalid");
}

function normalizeJson(value: unknown): string {
  if (typeof value !== "string") return canonicalJson(value);
  try {
    return canonicalJson(JSON.parse(value) as unknown);
  } catch (error) {
    if (error instanceof PostgresDataMigrationError) throw error;
    fail("row-invalid");
  }
}

function normalizeValue(
  column: Readonly<PostgresDataMigrationColumnContract>,
  value: unknown,
): PostgresDataMigrationValue {
  if (value === null || value === undefined) {
    if (column.nullable) return null;
    fail("row-invalid");
  }
  if (
    column.kind === "boolean-integer"
  ) {
    if (value === true || value === 1 || value === "1") return 1;
    if (value === false || value === 0 || value === "0") return 0;
    fail("row-invalid");
  }
  if (
    column.kind === "positive-integer" ||
    column.kind === "nonnegative-integer"
  ) {
    const normalized = typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : value;
    const minimum = column.kind === "positive-integer" ? 1 : 0;
    if (!Number.isSafeInteger(normalized) || Number(normalized) < minimum) {
      fail("row-invalid");
    }
    return Number(normalized);
  }
  if (column.kind === "date") return normalizeDate(value);
  if (column.kind === "timestamp") return normalizeTimestamp(value);
  if (column.kind === "json") return normalizeJson(value);
  if (typeof value !== "string") fail("row-invalid");
  return value;
}

function normalizeRow(
  table: Readonly<PostgresDataMigrationTableContract>,
  row: unknown,
  rowIndex: number,
): PostgresDataMigrationRow {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    fail("row-invalid", { table: table.name, rowIndex });
  }
  const record = row as Record<string, unknown>;
  const expected = table.columns.map(({ name }) => name).sort();
  const actual = Object.keys(record).sort();
  if (
    expected.length !== actual.length ||
    !expected.every((name, index) => name === actual[index])
  ) {
    fail("row-invalid", { table: table.name, rowIndex });
  }

  try {
    const normalized = Object.freeze(Object.fromEntries(
      table.columns.map((column) => [
        column.name,
        normalizeValue(column, record[column.name]),
      ]),
    ));
    table.validate?.(normalized);
    return normalized;
  } catch (error) {
    if (error instanceof PostgresDataMigrationError) {
      fail(error.code, { table: table.name, rowIndex });
    }
    fail("row-invalid", { table: table.name, rowIndex });
  }
}

function compareRows(
  table: Readonly<PostgresDataMigrationTableContract>,
  left: PostgresDataMigrationRow,
  right: PostgresDataMigrationRow,
): number {
  for (const column of table.orderBy) {
    if (left[column] === right[column]) continue;
    if (typeof left[column] === "number" && typeof right[column] === "number") {
      return Number(left[column]) - Number(right[column]);
    }
    return String(left[column]) < String(right[column]) ? -1 : 1;
  }
  return 0;
}

function safeDigestEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function placeholders(
  columns: readonly PostgresDataMigrationColumnContract[],
  rowOffset: number,
): string {
  return `(${columns.map((column, index) => {
    const placeholder = `$${rowOffset + index + 1}`;
    if (column.kind === "boolean-integer") {
      return `(${placeholder}::integer)::boolean`;
    }
    if (column.kind === "date") return `${placeholder}::date`;
    if (column.kind === "timestamp") return `${placeholder}::timestamptz`;
    if (column.kind === "json") return `${placeholder}::jsonb`;
    return placeholder;
  }).join(", ")})`;
}

export function createPostgresDataMigrationProtocol(
  configuration: Readonly<PostgresDataMigrationProtocolConfiguration>,
): Readonly<PostgresDataMigrationProtocol> {
  const tables = requireConfiguration(configuration);
  const tableNames = tables.map(({ name }) => name);
  const triggerDisabledTables = Object.freeze([
    ...(configuration.triggerDisabledTables ?? []),
  ]);

  function createSnapshot(
    input: Readonly<Record<string, readonly unknown[]>>,
  ): PostgresDataMigrationSnapshot {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).sort().join("\n") !==
        tableNames.slice().sort().join("\n")
    ) {
      fail("snapshot-invalid");
    }
    const normalizedTables = Object.fromEntries(tables.map((table) => {
      const inputRows = input[table.name];
      if (!Array.isArray(inputRows)) fail("snapshot-invalid");
      const rows = inputRows
        .map((row, index) => normalizeRow(table, row, index))
        .sort((left, right) => compareRows(table, left, right));
      return [table.name, Object.freeze(rows)];
    }));
    return Object.freeze({
      version: configuration.version,
      tables: Object.freeze(normalizedTables),
    });
  }

  function digestRows(
    table: Readonly<PostgresDataMigrationTableContract>,
    rows: readonly PostgresDataMigrationRow[],
    key: Buffer,
  ): string {
    const hmac = createHmac("sha256", key);
    hmac.update(`${configuration.version}\n${table.name}\n`);
    for (const row of rows) {
      hmac.update(canonicalJson(row));
      hmac.update("\n");
    }
    return `hmac_sha256_v1_${hmac.digest("hex")}`;
  }

  function digestManifest(
    manifest: readonly PostgresDataMigrationManifestTable[],
    createdAt: string,
    expiresAt: string,
  ): string {
    return createHash("sha256")
      .update(canonicalJson({
        version: configuration.version,
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
      expiresTime - createdTime > maximumPlanLifetimeMilliseconds
    ) {
      fail("plan-invalid");
    }
  }

  function createPlan(input: Readonly<{
    snapshot: PostgresDataMigrationSnapshot;
    createdAt: string;
    expiresAt: string;
    evidenceHmacKey: string;
  }>): PostgresDataMigrationPlan {
    if (input?.snapshot?.version !== configuration.version) {
      fail("snapshot-invalid");
    }
    const key = requireEvidenceKey(input.evidenceHmacKey);
    const createdAt = normalizeTimestamp(input.createdAt);
    const expiresAt = normalizeTimestamp(input.expiresAt);
    requirePlanWindow(createdAt, expiresAt);
    const snapshot = createSnapshot(input.snapshot.tables);
    const manifest = Object.freeze(tables.map((table) => Object.freeze({
      name: table.name,
      rowCount: snapshot.tables[table.name].length,
      sourceDigest: digestRows(table, snapshot.tables[table.name], key),
    })));
    const manifestDigest = digestManifest(manifest, createdAt, expiresAt);
    return Object.freeze({
      kind: configuration.planKind,
      version: configuration.version,
      planId: `${configuration.version}_${manifestDigest}`,
      createdAt,
      expiresAt,
      manifestDigest,
      manifest,
      payload: snapshot,
    });
  }

  function verifyPlan(
    plan: PostgresDataMigrationPlan,
    key: Buffer,
    now: string,
  ): PostgresDataMigrationSnapshot {
    if (
      plan?.kind !== configuration.planKind ||
      plan.version !== configuration.version ||
      plan.payload?.version !== configuration.version ||
      !Array.isArray(plan.manifest) ||
      typeof plan.planId !== "string" ||
      typeof plan.createdAt !== "string" ||
      typeof plan.expiresAt !== "string" ||
      typeof plan.manifestDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(plan.manifestDigest)
    ) {
      fail("plan-invalid");
    }
    const createdAt = normalizeTimestamp(plan.createdAt);
    const expiresAt = normalizeTimestamp(plan.expiresAt);
    if (createdAt !== plan.createdAt || expiresAt !== plan.expiresAt) {
      fail("plan-invalid");
    }
    requirePlanWindow(createdAt, expiresAt);
    const nowTime = new Date(normalizeTimestamp(now)).getTime();
    if (
      nowTime < new Date(createdAt).getTime() ||
      nowTime > new Date(expiresAt).getTime()
    ) {
      fail("plan-expired");
    }
    let snapshot: PostgresDataMigrationSnapshot;
    try {
      snapshot = createSnapshot(plan.payload.tables);
    } catch {
      fail("plan-invalid");
    }
    const expectedManifest = tables.map((table) => ({
      name: table.name,
      rowCount: snapshot.tables[table.name].length,
      sourceDigest: digestRows(
        table,
        snapshot.tables[table.name],
        key,
      ),
    }));
    const expectedDigest = digestManifest(
      expectedManifest,
      createdAt,
      expiresAt,
    );
    if (
      !safeDigestEqual(expectedDigest, plan.manifestDigest) ||
      !safeDigestEqual(
        canonicalJson(expectedManifest),
        canonicalJson(plan.manifest),
      ) ||
      plan.planId !== `${configuration.version}_${expectedDigest}`
    ) {
      fail("manifest-mismatch");
    }
    return snapshot;
  }

  async function requireEmptyTarget(
    transaction: PostgresQueryExecutor,
  ): Promise<void> {
    for (const table of tables) {
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
    table: Readonly<PostgresDataMigrationTableContract>,
    rows: readonly PostgresDataMigrationRow[],
  ): Promise<void> {
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const parameters: PostgresParameter[] = [];
      const values = batch.map((row) => {
        const offset = parameters.length;
        for (const column of table.columns) {
          parameters.push(row[column.name]);
        }
        return placeholders(table.columns, offset);
      });
      const result = await transaction.query(
        `INSERT INTO ${table.name} (${table.columns.map(
          ({ name }) => name,
        ).join(", ")}) VALUES ${values.join(", ")}`,
        parameters,
      ).catch(() => {
        fail("target-verification-failed", { table: table.name });
      });
      if (result.rowCount !== batch.length) {
        fail("target-verification-failed", { table: table.name });
      }
    }
  }

  async function synchronizeIdentity(
    transaction: PostgresQueryExecutor,
    table: Readonly<PostgresDataMigrationTableContract>,
  ): Promise<void> {
    if (!table.identityColumn) return;
    const result = await transaction.query(
      `SELECT setval(
         pg_get_serial_sequence('public.${table.name}', '${table.identityColumn}'),
         COALESCE(max(${table.identityColumn}), 1),
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
    table: Readonly<PostgresDataMigrationTableContract>,
  ): Promise<readonly PostgresDataMigrationRow[]> {
    const result = await transaction.query<Record<string, unknown>>(
      `SELECT ${table.columns.map(({ name, kind }) => (
        kind === "date" ? `${name}::text AS ${name}` : name
      )).join(", ")}
       FROM ${table.name}
       ORDER BY ${table.orderBy.join(", ")}`,
      [],
    );
    return Object.freeze(result.rows
      .map((row, index) => normalizeRow(table, row, index))
      .sort((left, right) => compareRows(table, left, right)));
  }

  async function execute(input: Readonly<{
    plan: PostgresDataMigrationPlan;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    now: string;
  }>): Promise<PostgresDataMigrationEvidence> {
    if (typeof input?.transactions?.transaction !== "function") {
      fail("dependency-invalid");
    }
    const key = requireEvidenceKey(input.evidenceHmacKey);
    const verifiedSnapshot = verifyPlan(input.plan, key, input.now);
    return input.transactions.transaction(
      { isolationLevel: "read-committed" },
      async (transaction) => {
        await transaction.query(
          "SELECT pg_advisory_xact_lock($1, $2)",
          [...configuration.advisoryLockKey],
        );
        await transaction.query(
          `LOCK TABLE ${tableNames.join(", ")} IN ACCESS EXCLUSIVE MODE`,
          [],
        );
        await requireEmptyTarget(transaction);
        if (configuration.verifyTargetReady) {
          try {
            await configuration.verifyTargetReady(transaction);
          } catch {
            fail("target-verification-failed");
          }
        }
        for (const tableName of triggerDisabledTables) {
          await transaction.query(
            `ALTER TABLE ${tableName} DISABLE TRIGGER USER`,
            [],
          );
        }
        for (const table of tables) {
          await insertRows(
            transaction,
            table,
            verifiedSnapshot.tables[table.name],
          );
        }
        for (const tableName of triggerDisabledTables) {
          await transaction.query(
            `ALTER TABLE ${tableName} ENABLE TRIGGER USER`,
            [],
          );
        }
        if (configuration.verifyLoadedState) {
          try {
            await configuration.verifyLoadedState(transaction);
          } catch {
            fail("target-verification-failed");
          }
        }
        for (const table of tables) {
          await synchronizeIdentity(transaction, table);
        }

        const evidenceTables: PostgresDataMigrationEvidenceTable[] = [];
        for (const [index, table] of tables.entries()) {
          const targetRows = await readTargetRows(transaction, table);
          const targetDigest = digestRows(table, targetRows, key);
          const source = input.plan.manifest[index];
          if (
            targetRows.length !== source.rowCount ||
            !safeDigestEqual(targetDigest, source.sourceDigest)
          ) {
            fail("target-verification-failed", { table: table.name });
          }
          evidenceTables.push(Object.freeze({
            name: table.name,
            rowCount: targetRows.length,
            sourceDigest: source.sourceDigest,
            targetDigest,
          }));
        }
        return Object.freeze({
          kind: configuration.evidenceKind,
          version: configuration.version,
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

  return Object.freeze({
    version: configuration.version,
    tableContracts: tables,
    createSnapshot,
    createPlan,
    execute,
  });
}
