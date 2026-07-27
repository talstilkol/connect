export const CONTACT_IMPORT_CHUNK_SIZE = 6;

export type ContactImportJobStatus = "processing" | "completed";

export interface ContactImportJobSummary {
  id: number;
  fileName: string;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  status: ContactImportJobStatus;
}

export interface ContactImportCandidate {
  sourceRowNumber: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

export interface ContactImportProfileMapping {
  phoneNumber: number;
  firstName: number | null;
  lastName: number | null;
  email: number | null;
  company: number | null;
}
