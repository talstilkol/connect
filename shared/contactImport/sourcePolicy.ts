export const CONTACT_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const CONTACT_IMPORT_MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
export const CONTACT_IMPORT_MAX_ARCHIVE_ENTRIES = 2_000;
export const CONTACT_IMPORT_MAX_DATA_ROWS = 50_000;
export const CONTACT_IMPORT_MAX_COLUMNS = 100;
export const CONTACT_IMPORT_MAX_DIMENSION_CELLS = 500_000;
export const CONTACT_IMPORT_MAX_CELL_CHARACTERS = 2_000;
export const CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS = 255;

export type ContactImportSourceFormat = "csv" | "xlsx";

export function isSupportedContactImportFileName(fileName: string): boolean {
  const normalizedName = fileName.trim().toLowerCase();
  return (
    normalizedName.length > 0 &&
    normalizedName.length <= CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS &&
    !/[\0-\x1f]/.test(normalizedName) &&
    (normalizedName.endsWith(".csv") || normalizedName.endsWith(".xlsx"))
  );
}
