import type {
  ContactImportJobSummary,
} from "../../shared/domain/contactImportJob.ts";
import type { ContactRecord } from "../../shared/domain/contactRecord.ts";
import {
  CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS,
  isSupportedContactImportFileName,
} from "../../shared/contactImport/sourcePolicy.ts";
import { validatePersistedContact } from "../../shared/validation/persistedContact.ts";

const jobKeys = Object.freeze([
  "completedAt",
  "createdRows",
  "duplicateRows",
  "fileName",
  "id",
  "processedRows",
  "rejectedRows",
  "status",
  "totalRows",
  "unchangedRows",
  "updatedRows",
]);

const publicJobKeys = Object.freeze(
  jobKeys.filter((key) => key !== "completedAt"),
);

const contactKeys = Object.freeze([
  "company",
  "consentRecordedAt",
  "consentSource",
  "consentStatus",
  "consentWithdrawnAt",
  "email",
  "firstName",
  "id",
  "lastName",
  "mailingStatus",
  "phoneNumber",
  "version",
]);

export interface RailwayContactImportResponse {
  readonly job: ContactImportJobSummary;
  readonly contacts: readonly ContactRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();

  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function isNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function parseRailwayContactImportJob(
  value: unknown,
): Readonly<ContactImportJobSummary> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, publicJobKeys) ||
    !Number.isSafeInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.fileName !== "string" ||
    value.fileName.length === 0 ||
    value.fileName.length > CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS ||
    value.fileName !== value.fileName.trim() ||
    !isSupportedContactImportFileName(value.fileName) ||
    !Number.isSafeInteger(value.totalRows) ||
    Number(value.totalRows) <= 0 ||
    !isNonnegativeInteger(value.processedRows) ||
    !isNonnegativeInteger(value.createdRows) ||
    !isNonnegativeInteger(value.updatedRows) ||
    !isNonnegativeInteger(value.unchangedRows) ||
    !isNonnegativeInteger(value.rejectedRows) ||
    !isNonnegativeInteger(value.duplicateRows) ||
    (value.status !== "processing" && value.status !== "completed")
  ) {
    return null;
  }

  const totalRows = Number(value.totalRows);
  const outcomeTotal = value.createdRows + value.updatedRows +
    value.unchangedRows + value.rejectedRows + value.duplicateRows;

  if (
    value.processedRows !== outcomeTotal ||
    value.processedRows > totalRows ||
    (value.status === "completed" && value.processedRows !== totalRows) ||
    (value.status === "processing" && value.processedRows >= totalRows)
  ) {
    return null;
  }

  return Object.freeze({
    id: Number(value.id),
    fileName: value.fileName,
    totalRows,
    processedRows: Number(value.processedRows),
    createdRows: Number(value.createdRows),
    updatedRows: Number(value.updatedRows),
    unchangedRows: Number(value.unchangedRows),
    rejectedRows: Number(value.rejectedRows),
    duplicateRows: Number(value.duplicateRows),
    status: value.status,
  });
}

export function parseRailwayContactImportResponse(
  value: unknown,
): Readonly<RailwayContactImportResponse> | null {
  if (!isRecord(value) || !hasExactKeys(value, ["contacts", "job"])) {
    return null;
  }

  const job = parseRailwayContactImportJob(value.job);

  if (job === null || !Array.isArray(value.contacts) || value.contacts.length > 6) {
    return null;
  }

  const contacts: ContactRecord[] = [];
  const contactIds = new Set<number>();

  for (const candidate of value.contacts) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, contactKeys) ||
      !Number.isSafeInteger(candidate.id) ||
      Number(candidate.id) <= 0 ||
      !Number.isSafeInteger(candidate.version) ||
      Number(candidate.version) <= 0 ||
      contactIds.has(Number(candidate.id)) ||
      (candidate.mailingStatus !== "subscribed" &&
        candidate.mailingStatus !== "unsubscribed") ||
      (candidate.consentStatus !== "unknown" &&
        candidate.consentStatus !== "granted" &&
        candidate.consentStatus !== "withdrawn") ||
      (candidate.consentSource !== null &&
        typeof candidate.consentSource !== "string") ||
      (candidate.consentRecordedAt !== null &&
        typeof candidate.consentRecordedAt !== "string") ||
      (candidate.consentWithdrawnAt !== null &&
        typeof candidate.consentWithdrawnAt !== "string")
    ) {
      return null;
    }

    const profile = validatePersistedContact(candidate);

    if (!profile.success) {
      return null;
    }

    const consentStateValid =
      (candidate.consentStatus === "unknown" &&
        candidate.mailingStatus === "unsubscribed" &&
        candidate.consentSource === null &&
        candidate.consentRecordedAt === null &&
        candidate.consentWithdrawnAt === null) ||
      (candidate.consentStatus === "granted" &&
        candidate.mailingStatus === "subscribed" &&
        typeof candidate.consentSource === "string" &&
        typeof candidate.consentRecordedAt === "string" &&
        candidate.consentWithdrawnAt === null) ||
      (candidate.consentStatus === "withdrawn" &&
        candidate.mailingStatus === "unsubscribed" &&
        typeof candidate.consentSource === "string" &&
        typeof candidate.consentRecordedAt === "string" &&
        typeof candidate.consentWithdrawnAt === "string" &&
        candidate.consentWithdrawnAt >= candidate.consentRecordedAt);

    if (!consentStateValid) {
      return null;
    }

    contactIds.add(Number(candidate.id));
    contacts.push(Object.freeze({
      id: Number(candidate.id),
      ...profile.value,
      mailingStatus: candidate.mailingStatus,
      consentStatus: candidate.consentStatus,
      consentSource: candidate.consentSource,
      consentRecordedAt: candidate.consentRecordedAt,
      consentWithdrawnAt: candidate.consentWithdrawnAt,
      version: Number(candidate.version),
    }));
  }

  return Object.freeze({ job, contacts: Object.freeze(contacts) });
}
