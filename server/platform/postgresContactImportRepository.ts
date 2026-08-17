import type {
  ContactImportAcceptedStatus,
  ContactImportRejectedReason,
  ContactImportRepository,
  PersistedContactImportJob,
  PersistedContactImportRow,
  RecordAcceptedImportRowInput,
  StartContactImportInput,
} from "../../db/contactImportRepository.ts";
import {
  CONTACT_IMPORT_MAX_DATA_ROWS,
  CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS,
  isSupportedContactImportFileName,
} from "../../shared/contactImport/sourcePolicy.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const jobRowKeys = Object.freeze([
  "id",
  "tenantId",
  "idempotencyKey",
  "fileName",
  "totalRows",
  "processedRows",
  "createdRows",
  "updatedRows",
  "unchangedRows",
  "rejectedRows",
  "duplicateRows",
  "status",
  "createdByExternalUserId",
  "createdAt",
  "updatedAt",
  "completedAt",
]);
const importRowKeys = Object.freeze([
  "id",
  "tenantId",
  "jobId",
  "sourceRowNumber",
  "contactId",
  "phoneFingerprint",
  "status",
  "reason",
]);
const contactProfileRowKeys = Object.freeze([
  "id",
  "tenantId",
  "phoneNumber",
  "firstName",
  "lastName",
  "email",
  "company",
]);
const countRowKeys = Object.freeze([
  "processedRows",
  "createdRows",
  "updatedRows",
  "unchangedRows",
  "rejectedRows",
  "duplicateRows",
]);

const jobColumns = `
  id,
  tenant_id AS "tenantId",
  idempotency_key AS "idempotencyKey",
  file_name AS "fileName",
  total_rows AS "totalRows",
  processed_rows AS "processedRows",
  created_rows AS "createdRows",
  updated_rows AS "updatedRows",
  unchanged_rows AS "unchangedRows",
  rejected_rows AS "rejectedRows",
  duplicate_rows AS "duplicateRows",
  status,
  created_by_external_user_id AS "createdByExternalUserId",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  completed_at AS "completedAt"
`;
const importRowColumns = `
  id,
  tenant_id AS "tenantId",
  job_id AS "jobId",
  source_row_number AS "sourceRowNumber",
  contact_id AS "contactId",
  phone_fingerprint AS "phoneFingerprint",
  status,
  reason
`;
const contactProfileColumns = `
  id,
  tenant_id AS "tenantId",
  phone_e164 AS "phoneNumber",
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  company
`;

export const postgresContactImportSql = Object.freeze({
  insertJob: `
    INSERT INTO contact_import_jobs (
      tenant_id,
      idempotency_key,
      file_name,
      total_rows,
      created_by_external_user_id
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING id
  `,
  findJobByKey: `
    SELECT ${jobColumns}
    FROM contact_import_jobs
    WHERE tenant_id = $1
      AND idempotency_key = $2
    LIMIT 1
  `,
  findJobById: `
    SELECT ${jobColumns}
    FROM contact_import_jobs
    WHERE tenant_id = $1
      AND id = $2
    LIMIT 1
  `,
  lockJobById: `
    SELECT ${jobColumns}
    FROM contact_import_jobs
    WHERE tenant_id = $1
      AND id = $2
    FOR UPDATE
  `,
  findRowBySource: `
    SELECT ${importRowColumns}
    FROM contact_import_rows
    WHERE tenant_id = $1
      AND job_id = $2
      AND source_row_number = $3
    LIMIT 1
  `,
  findRowByFingerprint: `
    SELECT ${importRowColumns}
    FROM contact_import_rows
    WHERE tenant_id = $1
      AND job_id = $2
      AND phone_fingerprint = $3
    ORDER BY source_row_number ASC
    LIMIT 1
  `,
  insertContactIfAbsent: `
    INSERT INTO contacts (
      tenant_id,
      phone_e164,
      first_name,
      last_name,
      email,
      company
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, phone_e164) DO NOTHING
    RETURNING id
  `,
  lockContactByPhone: `
    SELECT ${contactProfileColumns}
    FROM contacts
    WHERE tenant_id = $1
      AND phone_e164 = $2
    FOR UPDATE
  `,
  lockContactById: `
    SELECT ${contactProfileColumns}
    FROM contacts
    WHERE tenant_id = $1
      AND id = $2
    FOR UPDATE
  `,
  updateContactProfile: `
    UPDATE contacts
    SET
      first_name = $3,
      last_name = $4,
      email = $5,
      company = $6,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND id = $2
      AND (
        first_name IS DISTINCT FROM $3
        OR last_name IS DISTINCT FROM $4
        OR email IS DISTINCT FROM $5
        OR company IS DISTINCT FROM $6
      )
    RETURNING id
  `,
  insertAcceptedRow: `
    INSERT INTO contact_import_rows (
      tenant_id,
      job_id,
      source_row_number,
      contact_id,
      phone_fingerprint,
      status,
      reason
    )
    VALUES ($1, $2, $3, $4, $5, $6, NULL)
    RETURNING id
  `,
  insertRejectedRow: `
    INSERT INTO contact_import_rows (
      tenant_id,
      job_id,
      source_row_number,
      contact_id,
      phone_fingerprint,
      status,
      reason
    )
    VALUES ($1, $2, $3, NULL, NULL, 'rejected', $4)
    RETURNING id
  `,
  insertDuplicateRow: `
    INSERT INTO contact_import_rows (
      tenant_id,
      job_id,
      source_row_number,
      contact_id,
      phone_fingerprint,
      status,
      reason
    )
    VALUES ($1, $2, $3, $4, $5, 'duplicate', 'duplicate_in_file')
    RETURNING id
  `,
  countRows: `
    SELECT
      count(*) AS "processedRows",
      count(*) FILTER (WHERE status = 'created') AS "createdRows",
      count(*) FILTER (WHERE status = 'updated') AS "updatedRows",
      count(*) FILTER (WHERE status = 'unchanged') AS "unchangedRows",
      count(*) FILTER (WHERE status = 'rejected') AS "rejectedRows",
      count(*) FILTER (WHERE status = 'duplicate') AS "duplicateRows"
    FROM contact_import_rows
    WHERE tenant_id = $1
      AND job_id = $2
  `,
  updateJobCounts: `
    UPDATE contact_import_jobs
    SET
      processed_rows = $3,
      created_rows = $4,
      updated_rows = $5,
      unchanged_rows = $6,
      rejected_rows = $7,
      duplicate_rows = $8,
      status = CASE
        WHEN $3 = total_rows THEN 'completed'
        ELSE 'processing'
      END,
      completed_at = CASE
        WHEN $3 = total_rows
        THEN coalesce(
          completed_at,
          date_trunc('milliseconds', CURRENT_TIMESTAMP)
        )
        ELSE NULL
      END,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND id = $2
    RETURNING ${jobColumns}
  `,
});

export interface PostgresContactImportDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

interface ContactProfileRow {
  readonly id: number;
  readonly tenantId: number;
  readonly profile: Readonly<PersistedContactProfile>;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function parseNonnegativeInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("PostgreSQL returned an invalid import count");
  }

  return Number(normalized);
}

function requireFingerprint(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("phoneFingerprint must be a lowercase SHA-256 digest");
  }

  return value;
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("createdByExternalUserId is invalid");
  }

  return value;
}

function requireAcceptedStatus(
  value: unknown,
): ContactImportAcceptedStatus {
  if (value !== "created" && value !== "updated" && value !== "unchanged") {
    throw new Error("accepted import status is invalid");
  }

  return value;
}

function requireRejectedReason(
  value: unknown,
): ContactImportRejectedReason {
  if (value !== "missing_phone" && value !== "invalid_phone") {
    throw new Error("rejected import reason is invalid");
  }

  return value;
}

function requireProfile(value: unknown): Readonly<PersistedContactProfile> {
  const validation = validatePersistedContact(value);

  if (!validation.success) {
    throw new Error("contact import profile is invalid");
  }

  return Object.freeze(validation.value);
}

function profilesEqual(
  first: Readonly<PersistedContactProfile>,
  second: Readonly<PersistedContactProfile>,
): boolean {
  return (
    first.phoneNumber === second.phoneNumber &&
    first.firstName === second.firstName &&
    first.lastName === second.lastName &&
    first.email === second.email &&
    first.company === second.company
  );
}

function parseJob(value: unknown): Readonly<PersistedContactImportJob> {
  const row = requireExactPostgresRow(value, jobRowKeys);
  const totalRows = parseNonnegativeInteger(row.totalRows);
  const processedRows = parseNonnegativeInteger(row.processedRows);
  const createdRows = parseNonnegativeInteger(row.createdRows);
  const updatedRows = parseNonnegativeInteger(row.updatedRows);
  const unchangedRows = parseNonnegativeInteger(row.unchangedRows);
  const rejectedRows = parseNonnegativeInteger(row.rejectedRows);
  const duplicateRows = parseNonnegativeInteger(row.duplicateRows);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  const completedAt = row.completedAt === null
    ? null
    : parsePostgresTimestamp(row.completedAt);

  if (
    totalRows < 1 ||
    totalRows > CONTACT_IMPORT_MAX_DATA_ROWS ||
    processedRows > totalRows ||
    processedRows !==
      createdRows +
        updatedRows +
        unchangedRows +
        rejectedRows +
        duplicateRows ||
    (row.status !== "processing" && row.status !== "completed") ||
    (row.status === "processing" &&
      (processedRows >= totalRows || completedAt !== null)) ||
    (row.status === "completed" &&
      (processedRows !== totalRows || completedAt === null)) ||
    typeof row.idempotencyKey !== "string" ||
    !/^contact_import_v1_[0-9a-f]{64}$/.test(row.idempotencyKey) ||
    typeof row.fileName !== "string" ||
    row.fileName !== row.fileName.trim() ||
    !isSupportedContactImportFileName(row.fileName) ||
    row.fileName.length > CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS ||
    updatedAt < createdAt ||
    (completedAt !== null && completedAt < createdAt)
  ) {
    throw new Error("PostgreSQL returned an invalid contact import job");
  }

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    idempotencyKey: row.idempotencyKey,
    fileName: row.fileName,
    totalRows,
    processedRows,
    createdRows,
    updatedRows,
    unchangedRows,
    rejectedRows,
    duplicateRows,
    status: row.status,
    createdByExternalUserId: requireActor(row.createdByExternalUserId),
    createdAt,
    updatedAt,
    completedAt,
  });
}

function parseImportRow(value: unknown): Readonly<PersistedContactImportRow> {
  const row = requireExactPostgresRow(value, importRowKeys);
  const contactId = row.contactId === null
    ? null
    : parsePostgresPositiveInteger(row.contactId);
  const phoneFingerprint = row.phoneFingerprint === null
    ? null
    : requireFingerprint(row.phoneFingerprint);
  const accepted =
    row.status === "created" ||
    row.status === "updated" ||
    row.status === "unchanged";
  const duplicate = row.status === "duplicate";
  const rejected = row.status === "rejected";
  const outcomeValid =
    (accepted &&
      contactId !== null &&
      phoneFingerprint !== null &&
      row.reason === null) ||
    (duplicate &&
      phoneFingerprint !== null &&
      row.reason === "duplicate_in_file") ||
    (rejected &&
      contactId === null &&
      phoneFingerprint === null &&
      (row.reason === "missing_phone" || row.reason === "invalid_phone"));

  if (!outcomeValid) {
    throw new Error("PostgreSQL returned an invalid import row outcome");
  }

  const sourceRowNumber = requirePositiveInteger(
    row.sourceRowNumber,
    "sourceRowNumber",
  );

  if (
    sourceRowNumber < 2 ||
    sourceRowNumber > CONTACT_IMPORT_MAX_DATA_ROWS + 1
  ) {
    throw new Error("PostgreSQL returned an invalid import source row");
  }

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    jobId: parsePostgresPositiveInteger(row.jobId),
    sourceRowNumber,
    contactId,
    phoneFingerprint,
    status: row.status,
    reason: row.reason,
  }) as Readonly<PersistedContactImportRow>;
}

function parseContactProfile(value: unknown): Readonly<ContactProfileRow> {
  const row = requireExactPostgresRow(value, contactProfileRowKeys);
  const profile = requireProfile({
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    company: row.company,
  });

  if (
    profile.phoneNumber !== row.phoneNumber ||
    profile.firstName !== row.firstName ||
    profile.lastName !== row.lastName ||
    profile.email !== row.email ||
    profile.company !== row.company
  ) {
    throw new Error("PostgreSQL returned a non-canonical contact profile");
  }

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    profile,
  });
}

async function loadJob(
  database: PostgresQueryExecutor,
  tenantId: number,
  jobId: number,
  lock: boolean,
): Promise<Readonly<PersistedContactImportJob> | null> {
  const result = await database.query<Record<string, unknown>>(
    lock
      ? postgresContactImportSql.lockJobById
      : postgresContactImportSql.findJobById,
    [tenantId, jobId],
  );
  const rows = requirePostgresRows(result, 1);
  const job = rows.length === 0 ? null : parseJob(rows[0]);

  if (job !== null && job.tenantId !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant import job");
  }

  return job;
}

async function loadImportRowBySource(
  database: PostgresQueryExecutor,
  tenantId: number,
  jobId: number,
  sourceRowNumber: number,
): Promise<Readonly<PersistedContactImportRow> | null> {
  const result = await database.query<Record<string, unknown>>(
    postgresContactImportSql.findRowBySource,
    [tenantId, jobId, sourceRowNumber],
  );
  const rows = requirePostgresRows(result, 1);
  const importRow = rows.length === 0 ? null : parseImportRow(rows[0]);

  if (
    importRow !== null &&
    (importRow.tenantId !== tenantId || importRow.jobId !== jobId)
  ) {
    throw new Error("PostgreSQL returned a cross-tenant import row");
  }

  return importRow;
}

function requireJobRow(
  job: Readonly<PersistedContactImportJob> | null,
  sourceRowNumber: number,
): Readonly<PersistedContactImportJob> {
  if (job === null) {
    throw new Error("PostgreSQL contact import job was not found");
  }
  if (sourceRowNumber < 2 || sourceRowNumber > job.totalRows + 1) {
    throw new Error("sourceRowNumber is outside the import job");
  }

  return job;
}

async function loadContact(
  database: PostgresQueryExecutor,
  tenantId: number,
  value: number | string,
): Promise<Readonly<ContactProfileRow> | null> {
  const byId = typeof value === "number";
  const result = await database.query<Record<string, unknown>>(
    byId
      ? postgresContactImportSql.lockContactById
      : postgresContactImportSql.lockContactByPhone,
    [tenantId, value],
  );
  const rows = requirePostgresRows(result, 1);
  const contact = rows.length === 0 ? null : parseContactProfile(rows[0]);

  if (
    contact !== null &&
    (contact.tenantId !== tenantId ||
      (byId && contact.id !== value) ||
      (!byId && contact.profile.phoneNumber !== value))
  ) {
    throw new Error("PostgreSQL returned a cross-scope contact profile");
  }

  return contact;
}

async function requireSingleWrite(
  database: PostgresQueryExecutor,
  sql: string,
  parameters: readonly (boolean | number | string | null)[],
  message: string,
): Promise<number> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length !== 1) {
    throw new Error(message);
  }

  const row = requireExactPostgresRow(rows[0], ["id"]);
  return parsePostgresPositiveInteger(row.id);
}

function validateStartInput(
  input: StartContactImportInput,
): Readonly<StartContactImportInput> {
  if (!input || typeof input !== "object") {
    throw new Error("contact import start input is invalid");
  }

  const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
  const totalRows = requirePositiveInteger(input.totalRows, "totalRows");

  if (
    totalRows > CONTACT_IMPORT_MAX_DATA_ROWS ||
    typeof input.idempotencyKey !== "string" ||
    !/^contact_import_v1_[0-9a-f]{64}$/.test(input.idempotencyKey) ||
    typeof input.fileName !== "string" ||
    input.fileName !== input.fileName.trim() ||
    !isSupportedContactImportFileName(input.fileName)
  ) {
    throw new Error("contact import start input is invalid");
  }

  return Object.freeze({
    tenantId,
    idempotencyKey: input.idempotencyKey,
    fileName: input.fileName,
    totalRows,
    createdByExternalUserId: requireActor(input.createdByExternalUserId),
  });
}

async function recordAcceptedTransaction(
  transaction: PostgresTransaction,
  input: Readonly<RecordAcceptedImportRowInput>,
): Promise<void> {
  const job = requireJobRow(
    await loadJob(transaction, input.tenantId, input.jobId, true),
    input.sourceRowNumber,
  );
  const existing = await loadImportRowBySource(
    transaction,
    input.tenantId,
    input.jobId,
    input.sourceRowNumber,
  );

  if (existing !== null) {
    const contact = existing.contactId === null
      ? null
      : await loadContact(transaction, input.tenantId, existing.contactId);

    if (
      contact === null ||
      !["created", "updated", "unchanged"].includes(existing.status) ||
      existing.phoneFingerprint !== input.phoneFingerprint ||
      !profilesEqual(contact.profile, input.profile)
    ) {
      throw new Error("contact import source row conflicts with stored data");
    }

    return;
  }

  if (job.status === "completed") {
    throw new Error("completed contact import job cannot accept rows");
  }

  const inserted = await transaction.query<Record<string, unknown>>(
    postgresContactImportSql.insertContactIfAbsent,
    [
      input.tenantId,
      input.profile.phoneNumber,
      input.profile.firstName,
      input.profile.lastName,
      input.profile.email,
      input.profile.company,
    ],
  );
  const insertedRows = requirePostgresRows(inserted, 1);
  const insertedContactId = insertedRows.length === 0
    ? null
    : parsePostgresPositiveInteger(
        requireExactPostgresRow(insertedRows[0], ["id"]).id,
      );
  const contact = await loadContact(
    transaction,
    input.tenantId,
    insertedContactId ?? input.profile.phoneNumber,
  );

  if (contact === null) {
    throw new Error("PostgreSQL did not return the imported contact");
  }

  const status: ContactImportAcceptedStatus = insertedContactId !== null
    ? "created"
    : profilesEqual(contact.profile, input.profile)
      ? "unchanged"
      : "updated";

  if (status === "updated") {
    const updatedContactId = await requireSingleWrite(
      transaction,
      postgresContactImportSql.updateContactProfile,
      [
        input.tenantId,
        contact.id,
        input.profile.firstName,
        input.profile.lastName,
        input.profile.email,
        input.profile.company,
      ],
      "PostgreSQL did not update the imported contact",
    );

    if (updatedContactId !== contact.id) {
      throw new Error("PostgreSQL returned a mismatched imported contact");
    }
  }

  await requireSingleWrite(
    transaction,
    postgresContactImportSql.insertAcceptedRow,
    [
      input.tenantId,
      input.jobId,
      input.sourceRowNumber,
      contact.id,
      input.phoneFingerprint,
      status,
    ],
    "PostgreSQL did not store the accepted import row",
  );
}

export function createPostgresContactImportRepository(
  dependencies: Readonly<PostgresContactImportDependencies>,
): Readonly<ContactImportRepository> {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL contact import dependencies are invalid");
  }

  return Object.freeze({
    async startOrFind(input: StartContactImportInput) {
      const normalized = validateStartInput(input);

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const insert = await transaction.query<Record<string, unknown>>(
            postgresContactImportSql.insertJob,
            [
              normalized.tenantId,
              normalized.idempotencyKey,
              normalized.fileName,
              normalized.totalRows,
              normalized.createdByExternalUserId,
            ],
          );
          const insertedRows = requirePostgresRows(insert, 1);

          if (insertedRows.length === 1) {
            parsePostgresPositiveInteger(
              requireExactPostgresRow(insertedRows[0], ["id"]).id,
            );
          }

          const result = await transaction.query<Record<string, unknown>>(
            postgresContactImportSql.findJobByKey,
            [normalized.tenantId, normalized.idempotencyKey],
          );
          const rows = requirePostgresRows(result, 1);

          if (rows.length !== 1) {
            throw new Error("PostgreSQL did not return the contact import job");
          }

          const job = parseJob(rows[0]);
          if (job.tenantId !== normalized.tenantId) {
            throw new Error("PostgreSQL returned a cross-tenant import job");
          }

          return job;
        },
      );
    },

    async findJob(tenantIdInput: number, jobIdInput: number) {
      return loadJob(
        dependencies.queries,
        requirePositiveInteger(tenantIdInput, "tenantId"),
        requirePositiveInteger(jobIdInput, "jobId"),
        false,
      );
    },

    async findRowBySource(
      tenantIdInput: number,
      jobIdInput: number,
      sourceRowNumberInput: number,
    ) {
      return loadImportRowBySource(
        dependencies.queries,
        requirePositiveInteger(tenantIdInput, "tenantId"),
        requirePositiveInteger(jobIdInput, "jobId"),
        requirePositiveInteger(sourceRowNumberInput, "sourceRowNumber"),
      );
    },

    async findRowByPhoneFingerprint(
      tenantIdInput: number,
      jobIdInput: number,
      phoneFingerprintInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const jobId = requirePositiveInteger(jobIdInput, "jobId");
      const phoneFingerprint = requireFingerprint(phoneFingerprintInput);
      const result = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresContactImportSql.findRowByFingerprint, [
        tenantId,
        jobId,
        phoneFingerprint,
      ]);
      const rows = requirePostgresRows(result, 1);
      const importRow = rows.length === 0 ? null : parseImportRow(rows[0]);

      if (
        importRow !== null &&
        (importRow.tenantId !== tenantId || importRow.jobId !== jobId)
      ) {
        throw new Error("PostgreSQL returned a cross-tenant import row");
      }

      return importRow;
    },

    async recordAccepted(input: RecordAcceptedImportRowInput) {
      if (!input || typeof input !== "object") {
        throw new Error("accepted contact import input is invalid");
      }

      const normalized = Object.freeze({
        tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
        jobId: requirePositiveInteger(input.jobId, "jobId"),
        sourceRowNumber: requirePositiveInteger(
          input.sourceRowNumber,
          "sourceRowNumber",
        ),
        phoneFingerprint: requireFingerprint(input.phoneFingerprint),
        status: requireAcceptedStatus(input.status),
        profile: requireProfile(input.profile),
      });

      await dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        (transaction) => recordAcceptedTransaction(transaction, normalized),
      );
    },

    async recordRejected(
      tenantIdInput: number,
      jobIdInput: number,
      sourceRowNumberInput: number,
      reasonInput: ContactImportRejectedReason,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const jobId = requirePositiveInteger(jobIdInput, "jobId");
      const sourceRowNumber = requirePositiveInteger(
        sourceRowNumberInput,
        "sourceRowNumber",
      );
      const reason = requireRejectedReason(reasonInput);

      await dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const job = requireJobRow(
            await loadJob(transaction, tenantId, jobId, true),
            sourceRowNumber,
          );
          const existing = await loadImportRowBySource(
            transaction,
            tenantId,
            jobId,
            sourceRowNumber,
          );

          if (existing !== null) {
            if (existing.status !== "rejected" || existing.reason !== reason) {
              throw new Error(
                "contact import source row conflicts with stored data",
              );
            }
            return;
          }
          if (job.status === "completed") {
            throw new Error("completed contact import job cannot accept rows");
          }

          await requireSingleWrite(
            transaction,
            postgresContactImportSql.insertRejectedRow,
            [tenantId, jobId, sourceRowNumber, reason],
            "PostgreSQL did not store the rejected import row",
          );
        },
      );
    },

    async recordDuplicate(
      tenantIdInput: number,
      jobIdInput: number,
      sourceRowNumberInput: number,
      contactIdInput: number | null,
      phoneFingerprintInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const jobId = requirePositiveInteger(jobIdInput, "jobId");
      const sourceRowNumber = requirePositiveInteger(
        sourceRowNumberInput,
        "sourceRowNumber",
      );
      const contactId = contactIdInput === null
        ? null
        : requirePositiveInteger(contactIdInput, "contactId");
      const phoneFingerprint = requireFingerprint(phoneFingerprintInput);

      await dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const job = requireJobRow(
            await loadJob(transaction, tenantId, jobId, true),
            sourceRowNumber,
          );
          const existing = await loadImportRowBySource(
            transaction,
            tenantId,
            jobId,
            sourceRowNumber,
          );

          if (existing !== null) {
            if (
              existing.status !== "duplicate" ||
              existing.reason !== "duplicate_in_file" ||
              existing.contactId !== contactId ||
              existing.phoneFingerprint !== phoneFingerprint
            ) {
              throw new Error(
                "contact import source row conflicts with stored data",
              );
            }
            return;
          }
          if (job.status === "completed") {
            throw new Error("completed contact import job cannot accept rows");
          }

          await requireSingleWrite(
            transaction,
            postgresContactImportSql.insertDuplicateRow,
            [
              tenantId,
              jobId,
              sourceRowNumber,
              contactId,
              phoneFingerprint,
            ],
            "PostgreSQL did not store the duplicate import row",
          );
        },
      );
    },

    async refreshJob(tenantIdInput: number, jobIdInput: number) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const jobId = requirePositiveInteger(jobIdInput, "jobId");

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const job = await loadJob(transaction, tenantId, jobId, true);

          if (job === null) {
            throw new Error("PostgreSQL contact import job was not found");
          }

          const countResult = await transaction.query<
            Record<string, unknown>
          >(postgresContactImportSql.countRows, [tenantId, jobId]);
          const countRows = requirePostgresRows(countResult, 1);

          if (countRows.length !== 1) {
            throw new Error("PostgreSQL did not return import counters");
          }

          const countRow = requireExactPostgresRow(
            countRows[0],
            countRowKeys,
          );
          const counts = [
            "processedRows",
            "createdRows",
            "updatedRows",
            "unchangedRows",
            "rejectedRows",
            "duplicateRows",
          ].map((key) => parseNonnegativeInteger(countRow[key]));

          if (counts[0]! > job.totalRows) {
            throw new Error("PostgreSQL returned excessive import counters");
          }

          const updateResult = await transaction.query<
            Record<string, unknown>
          >(postgresContactImportSql.updateJobCounts, [
            tenantId,
            jobId,
            ...counts,
          ]);
          const updatedRows = requirePostgresRows(updateResult, 1);

          if (updatedRows.length !== 1) {
            throw new Error("PostgreSQL did not return the refreshed import job");
          }

          const refreshed = parseJob(updatedRows[0]);
          if (refreshed.tenantId !== tenantId || refreshed.id !== jobId) {
            throw new Error("PostgreSQL returned a mismatched refreshed job");
          }

          return refreshed;
        },
      );
    },
  });
}
