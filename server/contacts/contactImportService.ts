import type {
  ContactImportRepository,
  PersistedContactImportJob,
} from "../../db/contactImportRepository";
import type {
  ContactRepository,
  PersistedContact,
} from "../../db/contactRepository";
import {
  CONTACT_IMPORT_CHUNK_SIZE,
  type ContactImportCandidate,
  type ContactImportJobSummary,
  type ContactImportProfileMapping,
} from "../../shared/domain/contactImportJob.ts";
import {
  CONTACT_IMPORT_MAX_COLUMNS,
  CONTACT_IMPORT_MAX_DATA_ROWS,
  CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS,
  isSupportedContactImportFileName,
} from "../../shared/contactImport/sourcePolicy.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveContactImportJobKey,
  deriveContactPhoneFingerprint,
} from "./contactImportKey.ts";

export type ContactImportInputIssue =
  | "invalid-start-input"
  | "invalid-chunk-input"
  | "chunk-too-large"
  | "source-row-out-of-range"
  | "duplicate-source-row";

export class ContactImportInputError extends Error {
  readonly issue: ContactImportInputIssue;

  constructor(issue: ContactImportInputIssue) {
    super(`Contact import input failed: ${issue}`);
    this.name = "ContactImportInputError";
    this.issue = issue;
  }
}

export class ContactImportJobNotFoundError extends Error {
  constructor() {
    super("Contact import job not found in the current tenant");
    this.name = "ContactImportJobNotFoundError";
  }
}

export class ContactImportJobConflictError extends Error {
  constructor() {
    super("Contact import idempotency metadata conflict");
    this.name = "ContactImportJobConflictError";
  }
}

export interface StartContactImportRequest {
  fileName: string;
  sourceDigest: string;
  totalRows: number;
  mapping: ContactImportProfileMapping;
}

export interface ProcessContactImportChunkRequest {
  jobId: number;
  rows: readonly ContactImportCandidate[];
}

export interface ProcessContactImportChunkResult {
  job: ContactImportJobSummary;
  contacts: readonly PersistedContact[];
}

export interface ContactImportService {
  start(
    session: TenantSession,
    input: unknown,
  ): Promise<ContactImportJobSummary>;
  processChunk(
    session: TenantSession,
    input: unknown,
  ): Promise<ProcessContactImportChunkResult>;
}

export interface ContactImportServiceDependencies {
  contacts: Pick<ContactRepository, "findByTenantAndPhone">;
  imports: ContactImportRepository;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isColumnIndex(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 0 &&
    Number(value) < CONTACT_IMPORT_MAX_COLUMNS
  );
}

function isOptionalColumnIndex(
  value: unknown,
): value is number | null {
  return value === null || isColumnIndex(value);
}

function parseStartInput(input: unknown): StartContactImportRequest {
  if (
    !isRecord(input) ||
    typeof input.fileName !== "string" ||
    !input.fileName.trim() ||
    input.fileName.trim().length > CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS ||
    !isSupportedContactImportFileName(input.fileName) ||
    typeof input.sourceDigest !== "string" ||
    !/^[0-9a-f]{64}$/.test(input.sourceDigest) ||
    !Number.isSafeInteger(input.totalRows) ||
    Number(input.totalRows) <= 0 ||
    Number(input.totalRows) > CONTACT_IMPORT_MAX_DATA_ROWS ||
    !isRecord(input.mapping)
  ) {
    throw new ContactImportInputError("invalid-start-input");
  }

  const mapping = input.mapping;

  if (
    !isColumnIndex(mapping.phoneNumber) ||
    !isOptionalColumnIndex(mapping.firstName) ||
    !isOptionalColumnIndex(mapping.lastName) ||
    !isOptionalColumnIndex(mapping.email) ||
    !isOptionalColumnIndex(mapping.company)
  ) {
    throw new ContactImportInputError("invalid-start-input");
  }

  const mappedColumns = [
    mapping.phoneNumber,
    mapping.firstName,
    mapping.lastName,
    mapping.email,
    mapping.company,
  ].filter((value): value is number => value !== null);

  if (new Set(mappedColumns).size !== mappedColumns.length) {
    throw new ContactImportInputError("invalid-start-input");
  }

  return {
    fileName: input.fileName.trim(),
    sourceDigest: input.sourceDigest,
    totalRows: Number(input.totalRows),
    mapping: {
      phoneNumber: mapping.phoneNumber,
      firstName: mapping.firstName,
      lastName: mapping.lastName,
      email: mapping.email,
      company: mapping.company,
    },
  };
}

function parseChunkInput(
  input: unknown,
): ProcessContactImportChunkRequest {
  if (
    !isRecord(input) ||
    !Number.isSafeInteger(input.jobId) ||
    Number(input.jobId) <= 0 ||
    !Array.isArray(input.rows) ||
    input.rows.length === 0
  ) {
    throw new ContactImportInputError("invalid-chunk-input");
  }

  if (input.rows.length > CONTACT_IMPORT_CHUNK_SIZE) {
    throw new ContactImportInputError("chunk-too-large");
  }

  const rows: ContactImportCandidate[] = [];

  for (const row of input.rows) {
    if (
      !isRecord(row) ||
      !Number.isSafeInteger(row.sourceRowNumber) ||
      typeof row.phoneNumber !== "string" ||
      typeof row.firstName !== "string" ||
      typeof row.lastName !== "string" ||
      typeof row.email !== "string" ||
      typeof row.company !== "string"
    ) {
      throw new ContactImportInputError("invalid-chunk-input");
    }

    rows.push({
      sourceRowNumber: Number(row.sourceRowNumber),
      phoneNumber: row.phoneNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      company: row.company,
    });
  }

  return {
    jobId: Number(input.jobId),
    rows,
  };
}

function toSummary(
  job: PersistedContactImportJob,
): ContactImportJobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    createdRows: job.createdRows,
    updatedRows: job.updatedRows,
    unchangedRows: job.unchangedRows,
    rejectedRows: job.rejectedRows,
    duplicateRows: job.duplicateRows,
    status: job.status,
  };
}

function profilesEqual(
  contact: PersistedContact,
  profile: PersistedContactProfile,
): boolean {
  return (
    contact.phoneNumber === profile.phoneNumber &&
    contact.firstName === profile.firstName &&
    contact.lastName === profile.lastName &&
    contact.email === profile.email &&
    contact.company === profile.company
  );
}

export function createContactImportService(
  dependencies: ContactImportServiceDependencies,
): ContactImportService {
  return {
    async start(session, input) {
      requireTenantPermission(session, "contacts.write");
      const request = parseStartInput(input);
      const idempotencyKey = deriveContactImportJobKey({
        tenantId: session.tenantId,
        sourceDigest: request.sourceDigest,
        mapping: request.mapping,
      });
      const job = await dependencies.imports.startOrFind({
        tenantId: session.tenantId,
        idempotencyKey,
        fileName: request.fileName,
        totalRows: request.totalRows,
        createdByExternalUserId: session.externalUserId,
      });

      if (job.totalRows !== request.totalRows) {
        throw new ContactImportJobConflictError();
      }

      return toSummary(job);
    },

    async processChunk(session, input) {
      requireTenantPermission(session, "contacts.write");
      const request = parseChunkInput(input);
      const job = await dependencies.imports.findJob(
        session.tenantId,
        request.jobId,
      );

      if (!job) {
        throw new ContactImportJobNotFoundError();
      }

      if (job.status === "completed") {
        return {
          job: toSummary(job),
          contacts: [],
        };
      }

      const sourceRows = new Set<number>();
      const savedContacts: PersistedContact[] = [];

      for (const row of request.rows) {
        if (
          row.sourceRowNumber < 2 ||
          row.sourceRowNumber > job.totalRows + 1
        ) {
          throw new ContactImportInputError("source-row-out-of-range");
        }

        if (sourceRows.has(row.sourceRowNumber)) {
          throw new ContactImportInputError("duplicate-source-row");
        }

        sourceRows.add(row.sourceRowNumber);

        const recordedRow = await dependencies.imports.findRowBySource(
          session.tenantId,
          job.id,
          row.sourceRowNumber,
        );

        if (recordedRow) {
          continue;
        }

        const validation = validatePersistedContact(row);

        if (!validation.success) {
          await dependencies.imports.recordRejected(
            session.tenantId,
            job.id,
            row.sourceRowNumber,
            row.phoneNumber.trim() ? "invalid_phone" : "missing_phone",
          );
          continue;
        }

        const phoneFingerprint = deriveContactPhoneFingerprint(
          validation.value.phoneNumber,
        );
        const previousPhoneRow =
          await dependencies.imports.findRowByPhoneFingerprint(
            session.tenantId,
            job.id,
            phoneFingerprint,
          );

        if (previousPhoneRow) {
          await dependencies.imports.recordDuplicate(
            session.tenantId,
            job.id,
            row.sourceRowNumber,
            previousPhoneRow.contactId,
            phoneFingerprint,
          );
          continue;
        }

        const existingContact =
          await dependencies.contacts.findByTenantAndPhone(
            session.tenantId,
            validation.value.phoneNumber,
          );
        const status = existingContact
          ? profilesEqual(existingContact, validation.value)
            ? "unchanged"
            : "updated"
          : "created";

        await dependencies.imports.recordAccepted({
          tenantId: session.tenantId,
          jobId: job.id,
          sourceRowNumber: row.sourceRowNumber,
          phoneFingerprint,
          status,
          profile: validation.value,
        });

        const savedContact =
          await dependencies.contacts.findByTenantAndPhone(
            session.tenantId,
            validation.value.phoneNumber,
          );

        if (!savedContact) {
          throw new Error("Imported contact was not returned by D1");
        }

        savedContacts.push(savedContact);
      }

      const refreshedJob = await dependencies.imports.refreshJob(
        session.tenantId,
        job.id,
      );

      return {
        job: toSummary(refreshedJob),
        contacts: savedContacts,
      };
    },
  };
}
