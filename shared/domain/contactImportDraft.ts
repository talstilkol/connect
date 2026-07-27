import type { ContactRowQualitySummary } from "../validation/contactRows";
import type { CsvSchemaAudit } from "../validation/csvSchema";

export type ContactField =
  | "phoneNumber"
  | "firstName"
  | "lastName"
  | "email"
  | "company"
  | "consentStatusRaw"
  | "consentSourceRaw"
  | "consentRecordedAtRaw";

export type ContactColumnMapping = Record<ContactField, number | null>;

export interface ContactImportDraft {
  fileName: string;
  sourceDigest: string;
  headers: string[];
  rows: string[][];
  mapping: ContactColumnMapping;
  quality: ContactRowQualitySummary;
  schema: CsvSchemaAudit;
}
