import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const idempotencyKeyPattern = /^contact_import_v1_[0-9a-f]{64}$/;
const fingerprintPattern = /^[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const acceptedStatuses = new Set(["created", "updated", "unchanged"]);
const rejectionReasons = new Set(["missing_phone", "invalid_phone"]);

function invalid(): never {
  throw new Error("contact-organization-import-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function nullableInteger(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = row[name];
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) <= 0) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): number {
  const milliseconds = Date.parse(text(row, name));
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = nullableText(row, name);
  if (value === null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function requireTrimmedText(value: string, maximum = Infinity): void {
  if (
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
  ) {
    invalid();
  }
}

function validateGroup(row: PostgresDataMigrationRow): void {
  requireTrimmedText(text(row, "name"));
  requireTrimmedText(text(row, "normalized_name"));
  if (timestamp(row, "updated_at") < timestamp(row, "created_at")) invalid();
}

function validateImportJob(row: PostgresDataMigrationRow): void {
  const idempotencyKey = text(row, "idempotency_key");
  const fileName = text(row, "file_name");
  const totalRows = integer(row, "total_rows");
  const processedRows = integer(row, "processed_rows");
  const outcomeCounts = [
    "created_rows",
    "updated_rows",
    "unchanged_rows",
    "rejected_rows",
    "duplicate_rows",
  ].map((name) => integer(row, name));
  const status = text(row, "status");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  const completedAt = nullableTimestamp(row, "completed_at");

  requireTrimmedText(fileName, 255);
  requireTrimmedText(text(row, "created_by_external_user_id"), 512);
  if (
    !idempotencyKeyPattern.test(idempotencyKey) ||
    !/\.(?:csv|xlsx)$/iu.test(fileName) ||
    totalRows < 1 ||
    totalRows > 50_000 ||
    processedRows > totalRows ||
    outcomeCounts.some((count) => count > totalRows) ||
    processedRows !== outcomeCounts.reduce((sum, count) => sum + count, 0) ||
    updatedAt < createdAt ||
    (completedAt !== null && completedAt < createdAt)
  ) {
    invalid();
  }
  if (
    (status === "processing" &&
      (processedRows >= totalRows || completedAt !== null)) ||
    (status === "completed" &&
      (processedRows !== totalRows || completedAt === null)) ||
    (status !== "processing" && status !== "completed")
  ) {
    invalid();
  }
}

function validateImportRow(row: PostgresDataMigrationRow): void {
  const sourceRowNumber = integer(row, "source_row_number");
  const contactId = nullableInteger(row, "contact_id");
  const fingerprint = nullableText(row, "phone_fingerprint");
  const status = text(row, "status");
  const reason = nullableText(row, "reason");
  const accepted = acceptedStatuses.has(status);
  const duplicate = status === "duplicate";
  const rejected = status === "rejected";

  if (
    sourceRowNumber < 2 ||
    sourceRowNumber > 50_001 ||
    (fingerprint !== null && !fingerprintPattern.test(fingerprint)) ||
    !(
      (accepted && contactId !== null && fingerprint !== null && reason === null) ||
      (duplicate && fingerprint !== null && reason === "duplicate_in_file") ||
      (rejected && contactId === null && fingerprint === null &&
        reason !== null && rejectionReasons.has(reason))
    )
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: "nonnegative-integer" | "positive-integer" | "text" | "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

const groupColumns = Object.freeze([
  column("id", "positive-integer"),
  column("tenant_id", "positive-integer"),
  column("name", "text"),
  column("normalized_name", "text"),
  column("created_at", "timestamp"),
  column("updated_at", "timestamp"),
]);

export const POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "contact_tags",
      columns: groupColumns,
      orderBy: Object.freeze(["tenant_id", "id"]),
      identityColumn: "id",
      validate: validateGroup,
    }),
    Object.freeze({
      name: "contact_lists",
      columns: groupColumns,
      orderBy: Object.freeze(["tenant_id", "id"]),
      identityColumn: "id",
      validate: validateGroup,
    }),
    Object.freeze({
      name: "contact_tag_assignments",
      columns: Object.freeze([
        column("tenant_id", "positive-integer"),
        column("contact_id", "positive-integer"),
        column("tag_id", "positive-integer"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "contact_id", "tag_id"]),
    }),
    Object.freeze({
      name: "contact_list_memberships",
      columns: Object.freeze([
        column("tenant_id", "positive-integer"),
        column("contact_id", "positive-integer"),
        column("list_id", "positive-integer"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "contact_id", "list_id"]),
    }),
    Object.freeze({
      name: "contact_import_jobs",
      columns: Object.freeze([
        column("id", "positive-integer"),
        column("tenant_id", "positive-integer"),
        column("idempotency_key", "text"),
        column("file_name", "text"),
        column("total_rows", "positive-integer"),
        column("processed_rows", "nonnegative-integer"),
        column("created_rows", "nonnegative-integer"),
        column("updated_rows", "nonnegative-integer"),
        column("unchanged_rows", "nonnegative-integer"),
        column("rejected_rows", "nonnegative-integer"),
        column("duplicate_rows", "nonnegative-integer"),
        column("status", "text"),
        column("created_by_external_user_id", "text"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
        column("completed_at", "timestamp", true),
      ]),
      orderBy: Object.freeze(["tenant_id", "id"]),
      identityColumn: "id",
      validate: validateImportJob,
    }),
    Object.freeze({
      name: "contact_import_rows",
      columns: Object.freeze([
        column("id", "positive-integer"),
        column("tenant_id", "positive-integer"),
        column("job_id", "positive-integer"),
        column("source_row_number", "positive-integer"),
        column("contact_id", "positive-integer", true),
        column("phone_fingerprint", "text", true),
        column("status", "text"),
        column("reason", "text", true),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "job_id", "source_row_number"]),
      identityColumn: "id",
      validate: validateImportRow,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireNoRows(
  transaction: PostgresQueryExecutor,
  query: string,
): Promise<void> {
  const result = await transaction.query(query, []);
  if (result.rowCount !== 0) {
    throw new Error("contact-organization-import-state-invalid");
  }
}

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireNoRows(
    transaction,
    `WITH row_counts AS (
       SELECT
         tenant_id,
         job_id,
         count(*)::integer AS processed_rows,
         count(*) FILTER (WHERE status = 'created')::integer AS created_rows,
         count(*) FILTER (WHERE status = 'updated')::integer AS updated_rows,
         count(*) FILTER (WHERE status = 'unchanged')::integer AS unchanged_rows,
         count(*) FILTER (WHERE status = 'rejected')::integer AS rejected_rows,
         count(*) FILTER (WHERE status = 'duplicate')::integer AS duplicate_rows
       FROM contact_import_rows
       GROUP BY tenant_id, job_id
     )
     SELECT 1
     FROM contact_import_jobs AS job
     LEFT JOIN row_counts AS actual
       ON actual.tenant_id = job.tenant_id
       AND actual.job_id = job.id
     WHERE job.processed_rows IS DISTINCT FROM COALESCE(actual.processed_rows, 0)
       OR job.created_rows IS DISTINCT FROM COALESCE(actual.created_rows, 0)
       OR job.updated_rows IS DISTINCT FROM COALESCE(actual.updated_rows, 0)
       OR job.unchanged_rows IS DISTINCT FROM COALESCE(actual.unchanged_rows, 0)
       OR job.rejected_rows IS DISTINCT FROM COALESCE(actual.rejected_rows, 0)
       OR job.duplicate_rows IS DISTINCT FROM COALESCE(actual.duplicate_rows, 0)
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `SELECT 1
     FROM contact_import_rows AS import_row
     INNER JOIN contact_import_jobs AS job
       ON job.tenant_id = import_row.tenant_id
       AND job.id = import_row.job_id
     WHERE import_row.source_row_number > job.total_rows + 1
     LIMIT 1`,
  );
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_contact_organization_import_data_v1",
  planKind: "postgres-contact-organization-import-data-migration-plan",
  evidenceKind: "postgres-contact-organization-import-data-migration-evidence",
  advisoryLockKey: [1129270867, 1],
  tables: POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
  verifyLoadedState,
});

export type PostgresContactOrganizationImportDataSnapshot =
  PostgresDataMigrationSnapshot;
export type PostgresContactOrganizationImportDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresContactOrganizationImportDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresContactOrganizationImportDataSnapshot =
  protocol.createSnapshot;
export const createPostgresContactOrganizationImportDataMigrationPlan =
  protocol.createPlan;
export const executePostgresContactOrganizationImportDataMigration =
  protocol.execute;

export async function migratePostgresContactOrganizationImportData(
  input: Readonly<{
    snapshot: PostgresContactOrganizationImportDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresContactOrganizationImportDataMigrationEvidence> {
  const plan = createPostgresContactOrganizationImportDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresContactOrganizationImportDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
