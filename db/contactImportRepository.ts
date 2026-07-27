import type {
  ContactImportJobStatus,
} from "../shared/domain/contactImportJob";
import type { PersistedContactProfile } from "../shared/validation/persistedContact";
import type { D1DatabaseBinding, D1Result } from "./d1";

const INSERT_JOB_SQL = `
  INSERT INTO contact_import_jobs (
    tenant_id,
    idempotency_key,
    file_name,
    total_rows,
    created_by_external_user_id
  )
  VALUES (?1, ?2, ?3, ?4, ?5)
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
`;

const SELECT_JOB_BY_KEY_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    idempotency_key AS idempotencyKey,
    file_name AS fileName,
    total_rows AS totalRows,
    processed_rows AS processedRows,
    created_rows AS createdRows,
    updated_rows AS updatedRows,
    unchanged_rows AS unchangedRows,
    rejected_rows AS rejectedRows,
    duplicate_rows AS duplicateRows,
    status,
    created_by_external_user_id AS createdByExternalUserId,
    created_at AS createdAt,
    updated_at AS updatedAt,
    completed_at AS completedAt
  FROM contact_import_jobs
  WHERE tenant_id = ?1
    AND idempotency_key = ?2
  LIMIT 1
`;

const SELECT_JOB_BY_ID_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    idempotency_key AS idempotencyKey,
    file_name AS fileName,
    total_rows AS totalRows,
    processed_rows AS processedRows,
    created_rows AS createdRows,
    updated_rows AS updatedRows,
    unchanged_rows AS unchangedRows,
    rejected_rows AS rejectedRows,
    duplicate_rows AS duplicateRows,
    status,
    created_by_external_user_id AS createdByExternalUserId,
    created_at AS createdAt,
    updated_at AS updatedAt,
    completed_at AS completedAt
  FROM contact_import_jobs
  WHERE tenant_id = ?1
    AND id = ?2
  LIMIT 1
`;

const SELECT_ROW_BY_SOURCE_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    job_id AS jobId,
    source_row_number AS sourceRowNumber,
    contact_id AS contactId,
    phone_fingerprint AS phoneFingerprint,
    status,
    reason
  FROM contact_import_rows
  WHERE tenant_id = ?1
    AND job_id = ?2
    AND source_row_number = ?3
  LIMIT 1
`;

const SELECT_ROW_BY_FINGERPRINT_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    job_id AS jobId,
    source_row_number AS sourceRowNumber,
    contact_id AS contactId,
    phone_fingerprint AS phoneFingerprint,
    status,
    reason
  FROM contact_import_rows
  WHERE tenant_id = ?1
    AND job_id = ?2
    AND phone_fingerprint = ?3
  ORDER BY source_row_number ASC
  LIMIT 1
`;

const UPSERT_CONTACT_PROFILE_SQL = `
  INSERT INTO contacts (
    tenant_id,
    phone_e164,
    first_name,
    last_name,
    email,
    company
  )
  VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    company = excluded.company,
    version = contacts.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE contacts.first_name IS NOT excluded.first_name
    OR contacts.last_name IS NOT excluded.last_name
    OR contacts.email IS NOT excluded.email
    OR contacts.company IS NOT excluded.company
`;

const INSERT_ACCEPTED_ROW_SQL = `
  INSERT INTO contact_import_rows (
    tenant_id,
    job_id,
    source_row_number,
    contact_id,
    phone_fingerprint,
    status,
    reason
  )
  SELECT
    ?1,
    ?2,
    ?3,
    id,
    ?4,
    ?5,
    NULL
  FROM contacts
  WHERE tenant_id = ?1
    AND phone_e164 = ?6
  ON CONFLICT (job_id, source_row_number) DO NOTHING
`;

const INSERT_REJECTED_ROW_SQL = `
  INSERT INTO contact_import_rows (
    tenant_id,
    job_id,
    source_row_number,
    contact_id,
    phone_fingerprint,
    status,
    reason
  )
  VALUES (?1, ?2, ?3, NULL, NULL, 'rejected', ?4)
  ON CONFLICT (job_id, source_row_number) DO NOTHING
`;

const INSERT_DUPLICATE_ROW_SQL = `
  INSERT INTO contact_import_rows (
    tenant_id,
    job_id,
    source_row_number,
    contact_id,
    phone_fingerprint,
    status,
    reason
  )
  VALUES (?1, ?2, ?3, ?4, ?5, 'duplicate', 'duplicate_in_file')
  ON CONFLICT (job_id, source_row_number) DO NOTHING
`;

const REFRESH_JOB_COUNTS_SQL = `
  UPDATE contact_import_jobs
  SET
    processed_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2
    ),
    created_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2 AND status = 'created'
    ),
    updated_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2 AND status = 'updated'
    ),
    unchanged_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2 AND status = 'unchanged'
    ),
    rejected_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2 AND status = 'rejected'
    ),
    duplicate_rows = (
      SELECT count(*)
      FROM contact_import_rows
      WHERE tenant_id = ?1 AND job_id = ?2 AND status = 'duplicate'
    ),
    status = CASE
      WHEN (
        SELECT count(*)
        FROM contact_import_rows
        WHERE tenant_id = ?1 AND job_id = ?2
      ) = total_rows
      THEN 'completed'
      ELSE 'processing'
    END,
    completed_at = CASE
      WHEN (
        SELECT count(*)
        FROM contact_import_rows
        WHERE tenant_id = ?1 AND job_id = ?2
      ) = total_rows
      THEN coalesce(completed_at, CURRENT_TIMESTAMP)
      ELSE NULL
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND id = ?2
`;

export type ContactImportAcceptedStatus =
  | "created"
  | "updated"
  | "unchanged";
export type ContactImportRejectedReason =
  | "missing_phone"
  | "invalid_phone";

export interface PersistedContactImportJob {
  id: number;
  tenantId: number;
  idempotencyKey: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  status: ContactImportJobStatus;
  createdByExternalUserId: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PersistedContactImportRow {
  id: number;
  tenantId: number;
  jobId: number;
  sourceRowNumber: number;
  contactId: number | null;
  phoneFingerprint: string | null;
  status:
    | ContactImportAcceptedStatus
    | "rejected"
    | "duplicate";
  reason: ContactImportRejectedReason | "duplicate_in_file" | null;
}

export interface StartContactImportInput {
  tenantId: number;
  idempotencyKey: string;
  fileName: string;
  totalRows: number;
  createdByExternalUserId: string;
}

export interface RecordAcceptedImportRowInput {
  tenantId: number;
  jobId: number;
  sourceRowNumber: number;
  phoneFingerprint: string;
  status: ContactImportAcceptedStatus;
  profile: PersistedContactProfile;
}

export interface ContactImportRepository {
  startOrFind(
    input: StartContactImportInput,
  ): Promise<PersistedContactImportJob>;
  findJob(
    tenantId: number,
    jobId: number,
  ): Promise<PersistedContactImportJob | null>;
  findRowBySource(
    tenantId: number,
    jobId: number,
    sourceRowNumber: number,
  ): Promise<PersistedContactImportRow | null>;
  findRowByPhoneFingerprint(
    tenantId: number,
    jobId: number,
    phoneFingerprint: string,
  ): Promise<PersistedContactImportRow | null>;
  recordAccepted(input: RecordAcceptedImportRowInput): Promise<void>;
  recordRejected(
    tenantId: number,
    jobId: number,
    sourceRowNumber: number,
    reason: ContactImportRejectedReason,
  ): Promise<void>;
  recordDuplicate(
    tenantId: number,
    jobId: number,
    sourceRowNumber: number,
    contactId: number | null,
    phoneFingerprint: string,
  ): Promise<void>;
  refreshJob(
    tenantId: number,
    jobId: number,
  ): Promise<PersistedContactImportJob>;
}

interface JobRow extends Omit<PersistedContactImportJob, "status"> {
  status: string;
}

interface ImportRow
  extends Omit<PersistedContactImportRow, "status" | "reason"> {
  status: string;
  reason: string | null;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertD1Result(
  result: D1Result,
  fallbackMessage: string,
): void {
  if (!result.success) {
    throw new Error(result.error ?? fallbackMessage);
  }
}

function parseJob(row: JobRow): PersistedContactImportJob {
  if (row.status !== "processing" && row.status !== "completed") {
    throw new Error("D1 returned an invalid contact import job status");
  }

  const counts = [
    row.totalRows,
    row.processedRows,
    row.createdRows,
    row.updatedRows,
    row.unchangedRows,
    row.rejectedRows,
    row.duplicateRows,
  ];

  if (
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    counts.some((count) => !Number.isSafeInteger(count) || count < 0)
  ) {
    throw new Error("D1 returned invalid contact import job counters");
  }

  return {
    ...row,
    status: row.status,
  };
}

function parseImportRow(row: ImportRow): PersistedContactImportRow {
  const validStatus = [
    "created",
    "updated",
    "unchanged",
    "rejected",
    "duplicate",
  ].includes(row.status);
  const validReason =
    row.reason === null ||
    ["missing_phone", "invalid_phone", "duplicate_in_file"].includes(
      row.reason,
    );

  if (!validStatus || !validReason) {
    throw new Error("D1 returned an invalid contact import row outcome");
  }

  return row as PersistedContactImportRow;
}

export function createContactImportRepository(
  database: D1DatabaseBinding,
): ContactImportRepository {
  return {
    async startOrFind(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertPositiveInteger(input.totalRows, "totalRows");

      const insertResult = await database
        .prepare(INSERT_JOB_SQL)
        .bind(
          input.tenantId,
          input.idempotencyKey,
          input.fileName,
          input.totalRows,
          input.createdByExternalUserId,
        )
        .run();
      assertD1Result(insertResult, "D1 contact import job write failed");

      const row = await database
        .prepare(SELECT_JOB_BY_KEY_SQL)
        .bind(input.tenantId, input.idempotencyKey)
        .first<JobRow>();

      if (!row) {
        throw new Error("D1 did not return the contact import job");
      }

      return parseJob(row);
    },

    async findJob(tenantId, jobId) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(jobId, "jobId");
      const row = await database
        .prepare(SELECT_JOB_BY_ID_SQL)
        .bind(tenantId, jobId)
        .first<JobRow>();

      return row ? parseJob(row) : null;
    },

    async findRowBySource(tenantId, jobId, sourceRowNumber) {
      const row = await database
        .prepare(SELECT_ROW_BY_SOURCE_SQL)
        .bind(tenantId, jobId, sourceRowNumber)
        .first<ImportRow>();

      return row ? parseImportRow(row) : null;
    },

    async findRowByPhoneFingerprint(
      tenantId,
      jobId,
      phoneFingerprint,
    ) {
      const row = await database
        .prepare(SELECT_ROW_BY_FINGERPRINT_SQL)
        .bind(tenantId, jobId, phoneFingerprint)
        .first<ImportRow>();

      return row ? parseImportRow(row) : null;
    },

    async recordAccepted(input) {
      const results = await database.batch([
        database
          .prepare(UPSERT_CONTACT_PROFILE_SQL)
          .bind(
            input.tenantId,
            input.profile.phoneNumber,
            input.profile.firstName,
            input.profile.lastName,
            input.profile.email,
            input.profile.company,
          ),
        database
          .prepare(INSERT_ACCEPTED_ROW_SQL)
          .bind(
            input.tenantId,
            input.jobId,
            input.sourceRowNumber,
            input.phoneFingerprint,
            input.status,
            input.profile.phoneNumber,
          ),
      ]);

      for (const result of results) {
        assertD1Result(result, "D1 accepted contact import row failed");
      }
    },

    async recordRejected(
      tenantId,
      jobId,
      sourceRowNumber,
      reason,
    ) {
      const result = await database
        .prepare(INSERT_REJECTED_ROW_SQL)
        .bind(tenantId, jobId, sourceRowNumber, reason)
        .run();
      assertD1Result(result, "D1 rejected contact import row failed");
    },

    async recordDuplicate(
      tenantId,
      jobId,
      sourceRowNumber,
      contactId,
      phoneFingerprint,
    ) {
      const result = await database
        .prepare(INSERT_DUPLICATE_ROW_SQL)
        .bind(
          tenantId,
          jobId,
          sourceRowNumber,
          contactId,
          phoneFingerprint,
        )
        .run();
      assertD1Result(result, "D1 duplicate contact import row failed");
    },

    async refreshJob(tenantId, jobId) {
      const result = await database
        .prepare(REFRESH_JOB_COUNTS_SQL)
        .bind(tenantId, jobId)
        .run();
      assertD1Result(result, "D1 contact import counters failed");

      const job = await this.findJob(tenantId, jobId);

      if (!job) {
        throw new Error("D1 did not return the refreshed import job");
      }

      return job;
    },
  };
}
