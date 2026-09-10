import { unzip, type UnzipFileInfo, type Unzipped } from "fflate";
import { readSheet } from "read-excel-file/universal";
import {
  CsvParseError,
  parseCsv,
  type ParsedCsv,
} from "../csv/parseCsv.ts";
import { deriveContactImportSourceDigest } from "../csv/sourceDigest.ts";
import {
  CONTACT_IMPORT_MAX_ARCHIVE_ENTRIES,
  CONTACT_IMPORT_MAX_CELL_CHARACTERS,
  CONTACT_IMPORT_MAX_COLUMNS,
  CONTACT_IMPORT_MAX_DATA_ROWS,
  CONTACT_IMPORT_MAX_DIMENSION_CELLS,
  CONTACT_IMPORT_MAX_FILE_BYTES,
  CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS,
  CONTACT_IMPORT_MAX_UNCOMPRESSED_BYTES,
  type ContactImportSourceFormat,
} from "./sourcePolicy.ts";

export type { ContactImportSourceFormat } from "./sourcePolicy.ts";

export type ParsedContactImportSource = ParsedCsv & {
  format: ContactImportSourceFormat;
  sourceDigest: string;
};

export interface ContactImportSourceFile {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ContactImportSourceErrorCode =
  | "unsupported-format"
  | "invalid-file-name"
  | "empty-file"
  | "file-too-large"
  | "file-changed"
  | "invalid-text-encoding"
  | "invalid-csv"
  | "invalid-xlsx"
  | "unsafe-archive"
  | "archive-entry-limit"
  | "archive-size-limit"
  | "unsupported-xlsx-content"
  | "formula-not-allowed"
  | "external-link-not-allowed"
  | "macro-not-allowed"
  | "single-sheet-required"
  | "hidden-sheet-not-allowed"
  | "row-limit"
  | "column-limit"
  | "dimension-limit"
  | "cell-length-limit";

export class ContactImportSourceError extends Error {
  readonly code: ContactImportSourceErrorCode;

  constructor(code: ContactImportSourceErrorCode, message: string) {
    super(message);
    this.name = "ContactImportSourceError";
    this.code = code;
  }
}

const xlsxXmlPathPattern = /(?:\.xml|\.rels)$/i;
const worksheetPathPattern = /^xl\/worksheets\/[^/]+\.xml$/i;
const formulaElementPattern = /<(?:[A-Za-z_][\w.-]*:)?f(?:\s|\/?>)/i;
const sheetElementPattern = /<(?:[A-Za-z_][\w.-]*:)?sheet\b[^>]*>/gi;
const cellElementPattern = /<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>/gi;
const xmlDoctypePattern = /<!DOCTYPE|<!ENTITY/i;
const dimensionElementPattern =
  /<(?:[A-Za-z_][\w.-]*:)?dimension\b[^>]*\bref\s*=\s*["']([^"']+)["'][^>]*>/i;
const cellReferencePattern = /\br\s*=\s*["']([A-Za-z]{1,3}[1-9]\d*)["']/i;

const requiredXlsxEntries = [
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
] as const;

const rejectedXlsxPaths = [
  /^EncryptionInfo$/i,
  /^EncryptedPackage$/i,
  /(?:^|\/)vbaProject\.bin$/i,
  /^xl\/externalLinks\//i,
  /^xl\/embeddings\//i,
  /^xl\/activeX\//i,
  /^xl\/connections\.xml$/i,
];

export async function parseContactImportSourceFile(
  file: ContactImportSourceFile,
): Promise<ParsedContactImportSource> {
  const format = resolveSourceFormat(file.name);

  assertSafeFileSize(file.size);

  const sourceBytes = await file.arrayBuffer();

  if (sourceBytes.byteLength !== file.size) {
    throw new ContactImportSourceError(
      "file-changed",
      "הקובץ השתנה בזמן הקריאה. יש לבחור אותו מחדש.",
    );
  }

  const parsed =
    format === "csv"
      ? parseCsvBytes(sourceBytes)
      : await parseXlsxBytes(sourceBytes);

  validateParsedRows(parsed);

  return {
    ...parsed,
    format,
    sourceDigest: await deriveContactImportSourceDigest(sourceBytes),
  };
}

function resolveSourceFormat(fileName: string): ContactImportSourceFormat {
  const normalizedName = fileName.trim().toLowerCase();

  if (
    !normalizedName ||
    normalizedName.length > CONTACT_IMPORT_MAX_FILE_NAME_CHARACTERS ||
    /[\0-\x1f]/.test(normalizedName)
  ) {
    throw new ContactImportSourceError(
      "invalid-file-name",
      "שם הקובץ ריק, ארוך מדי או מכיל תווים שאינם מותרים.",
    );
  }

  if (normalizedName.endsWith(".csv")) {
    return "csv";
  }

  if (normalizedName.endsWith(".xlsx")) {
    return "xlsx";
  }

  throw new ContactImportSourceError(
    "unsupported-format",
    "נתמכים רק קובצי CSV או XLSX. קובצי XLS ישנים אינם נתמכים.",
  );
}

function assertSafeFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new ContactImportSourceError("empty-file", "הקובץ ריק.");
  }

  if (size > CONTACT_IMPORT_MAX_FILE_BYTES) {
    throw new ContactImportSourceError(
      "file-too-large",
      "הקובץ גדול מ־5 MiB. יש לפצל אותו לפני הייבוא.",
    );
  }
}

function parseCsvBytes(sourceBytes: ArrayBuffer): ParsedCsv {
  let sourceText: string;

  try {
    sourceText = new TextDecoder("utf-8", { fatal: true }).decode(sourceBytes);
  } catch {
    throw new ContactImportSourceError(
      "invalid-text-encoding",
      "קובץ ה־CSV חייב להיות מקודד ב־UTF-8 תקין.",
    );
  }

  if (sourceText.includes("\0")) {
    throw new ContactImportSourceError(
      "invalid-text-encoding",
      "קובץ ה־CSV מכיל תווי Null ואינו קובץ טקסט תקין.",
    );
  }

  try {
    return parseCsv(sourceText);
  } catch (error) {
    if (error instanceof CsvParseError) {
      throw new ContactImportSourceError("invalid-csv", error.message);
    }

    throw error;
  }
}

async function parseXlsxBytes(sourceBytes: ArrayBuffer): Promise<ParsedCsv> {
  const bytes = new Uint8Array(sourceBytes);

  if (
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b
  ) {
    throw new ContactImportSourceError(
      "invalid-xlsx",
      "הקובץ אינו ארכיון XLSX תקין.",
    );
  }

  try {
    const inspectedFiles = await inspectXlsxArchive(bytes);
    validateXlsxContents(inspectedFiles);

    const sheet = await readSheet<string>(sourceBytes, 1, {
      parseNumber: (value) => value,
      trim: false,
    });
    const rows = sheet.map((row) => row.map(toSourceString));
    const [rawHeaders, ...rawRows] = rows;
    const headers = rawHeaders?.map((header) => header.trim()) ?? [];

    if (headers.length === 0 || headers.every((header) => !header)) {
      throw new ContactImportSourceError(
        "invalid-xlsx",
        "לא נמצאה שורת כותרות בגיליון.",
      );
    }

    return {
      headers,
      rows: rawRows.filter((row) =>
        row.some((value) => value.trim().length > 0),
      ),
    };
  } catch (error) {
    if (error instanceof ContactImportSourceError) {
      throw error;
    }

    throw new ContactImportSourceError(
      "invalid-xlsx",
      "לא ניתן לקרוא את קובץ ה־XLSX. יש לשמור אותו מחדש ללא הגנה או רכיבים פעילים.",
    );
  }
}

async function inspectXlsxArchive(bytes: Uint8Array): Promise<Unzipped> {
  let archiveEntryCount = 0;
  let totalUncompressedBytes = 0;
  const entryNames = new Set<string>();

  return new Promise((resolve, reject) => {
    try {
      unzip(
        bytes,
        {
          filter: (entry) => {
            archiveEntryCount += 1;

            if (archiveEntryCount > CONTACT_IMPORT_MAX_ARCHIVE_ENTRIES) {
              throw new ContactImportSourceError(
                "archive-entry-limit",
                "קובץ ה־XLSX מכיל יותר מדי רכיבים פנימיים.",
              );
            }

            validateArchiveEntry(entry, entryNames);
            totalUncompressedBytes += entry.originalSize;

            if (
              totalUncompressedBytes > CONTACT_IMPORT_MAX_UNCOMPRESSED_BYTES
            ) {
              throw new ContactImportSourceError(
                "archive-size-limit",
                "תוכן ה־XLSX לאחר פתיחה גדול מהמגבלה הבטוחה.",
              );
            }

            return xlsxXmlPathPattern.test(entry.name);
          },
        },
        (error, files) => {
          if (error) {
            reject(error);
            return;
          }

          const actualBytes = Object.values(files).reduce(
            (total, fileBytes) => total + fileBytes.byteLength,
            0,
          );

          if (actualBytes > CONTACT_IMPORT_MAX_UNCOMPRESSED_BYTES) {
            reject(
              new ContactImportSourceError(
                "archive-size-limit",
                "תוכן ה־XLSX לאחר פתיחה גדול מהמגבלה הבטוחה.",
              ),
            );
            return;
          }

          resolve(files);
        },
      );
    } catch (error) {
      reject(error);
    }
  });
}

function validateArchiveEntry(
  entry: UnzipFileInfo,
  entryNames: Set<string>,
): void {
  const normalizedName = entry.name.toLowerCase();

  if (
    !entry.name ||
    entry.name.includes("\\") ||
    entry.name.startsWith("/") ||
    entry.name.split("/").includes("..") ||
    /[\0-\x1f]/.test(entry.name) ||
    entryNames.has(normalizedName) ||
    !Number.isSafeInteger(entry.size) ||
    entry.size < 0 ||
    !Number.isSafeInteger(entry.originalSize) ||
    entry.originalSize < 0 ||
    (entry.compression !== 0 && entry.compression !== 8)
  ) {
    throw new ContactImportSourceError(
      "unsafe-archive",
      "מבנה ארכיון ה־XLSX אינו בטוח או מכיל שמות רכיבים כפולים.",
    );
  }

  entryNames.add(normalizedName);

  if (rejectedXlsxPaths.some((pattern) => pattern.test(entry.name))) {
    if (/vbaProject\.bin$/i.test(entry.name)) {
      throw new ContactImportSourceError(
        "macro-not-allowed",
        "קובצי XLSX עם Macros אינם מותרים.",
      );
    }

    if (/externalLinks/i.test(entry.name)) {
      throw new ContactImportSourceError(
        "external-link-not-allowed",
        "קובצי XLSX עם קישורים חיצוניים אינם מותרים.",
      );
    }

    throw new ContactImportSourceError(
      "unsupported-xlsx-content",
      "קובץ ה־XLSX מכיל חיבורים, אובייקטים או תוכן פעיל שאינם נתמכים.",
    );
  }
}

function validateXlsxContents(files: Unzipped): void {
  for (const requiredEntry of requiredXlsxEntries) {
    if (!files[requiredEntry]) {
      throw new ContactImportSourceError(
        "invalid-xlsx",
        "חסר רכיב חובה במבנה קובץ ה־XLSX.",
      );
    }
  }

  const decodedFiles = new Map<string, string>();

  for (const [path, bytes] of Object.entries(files)) {
    let content: string;

    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ContactImportSourceError(
        "invalid-xlsx",
        "קובץ ה־XLSX מכיל XML שאינו מקודד באופן תקין.",
      );
    }

    if (xmlDoctypePattern.test(content)) {
      throw new ContactImportSourceError(
        "unsafe-archive",
        "קובץ ה־XLSX מכיל הצהרת XML חיצונית שאינה מותרת.",
      );
    }

    decodedFiles.set(path, content);
  }

  const contentTypes = decodedFiles.get("[Content_Types].xml") ?? "";

  if (/macroEnabled|vbaProject/i.test(contentTypes)) {
    throw new ContactImportSourceError(
      "macro-not-allowed",
      "קובצי XLSX עם Macros אינם מותרים.",
    );
  }

  for (const [path, content] of decodedFiles) {
    if (path.toLowerCase().endsWith(".rels") && /TargetMode\s*=\s*["']External["']/i.test(content)) {
      throw new ContactImportSourceError(
        "external-link-not-allowed",
        "קובצי XLSX עם קישורים חיצוניים אינם מותרים.",
      );
    }
  }

  const workbook = decodedFiles.get("xl/workbook.xml") ?? "";
  const sheetElements = workbook.match(sheetElementPattern) ?? [];

  if (sheetElements.length !== 1) {
    throw new ContactImportSourceError(
      "single-sheet-required",
      "קובץ ה־XLSX חייב להכיל גיליון אחד בלבד.",
    );
  }

  if (/\bstate\s*=\s*["'](?:hidden|veryHidden)["']/i.test(sheetElements[0])) {
    throw new ContactImportSourceError(
      "hidden-sheet-not-allowed",
      "הגיליון היחיד בקובץ חייב להיות גלוי.",
    );
  }

  const worksheets = Array.from(decodedFiles.entries()).filter(([path]) =>
    worksheetPathPattern.test(path),
  );

  if (worksheets.length !== 1) {
    throw new ContactImportSourceError(
      "single-sheet-required",
      "קובץ ה־XLSX חייב להכיל גיליון נתונים אחד בלבד.",
    );
  }

  validateWorksheetXml(worksheets[0][1]);
}

function validateWorksheetXml(content: string): void {
  if (formulaElementPattern.test(content)) {
    throw new ContactImportSourceError(
      "formula-not-allowed",
      "נוסחאות Excel אינן מותרות. יש להדביק את התוצאות כערכים בלבד.",
    );
  }

  const cellElements = content.match(cellElementPattern) ?? [];

  if (cellElements.length > CONTACT_IMPORT_MAX_DIMENSION_CELLS) {
    throw new ContactImportSourceError(
      "dimension-limit",
      "הגיליון מכיל יותר מדי תאים מאוכלסים.",
    );
  }

  let maximumRow = 0;
  let maximumColumn = 0;

  for (const cellElement of cellElements) {
    const reference = cellReferencePattern.exec(cellElement)?.[1];

    if (!reference) {
      throw new ContactImportSourceError(
        "invalid-xlsx",
        "נמצא תא ללא כתובת תקינה בגיליון.",
      );
    }

    const coordinates = parseCellReference(reference);
    maximumRow = Math.max(maximumRow, coordinates.row);
    maximumColumn = Math.max(maximumColumn, coordinates.column);
  }

  const dimensionReference = dimensionElementPattern.exec(content)?.[1];

  if (dimensionReference) {
    const bottomRight = dimensionReference.split(":").at(-1);

    if (!bottomRight) {
      throw new ContactImportSourceError(
        "invalid-xlsx",
        "טווח הגיליון אינו תקין.",
      );
    }

    const dimension = parseCellReference(bottomRight.replace(/\$/g, ""));
    maximumRow = Math.max(maximumRow, dimension.row);
    maximumColumn = Math.max(maximumColumn, dimension.column);
  }

  validateDimensions(maximumRow, maximumColumn);
}

function parseCellReference(reference: string): {
  row: number;
  column: number;
} {
  const match = /^([A-Za-z]{1,3})([1-9]\d*)$/.exec(reference);

  if (!match) {
    throw new ContactImportSourceError(
      "invalid-xlsx",
      "כתובת תא בגיליון אינה תקינה.",
    );
  }

  let column = 0;

  for (const character of match[1].toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }

  const row = Number(match[2]);

  if (!Number.isSafeInteger(row)) {
    throw new ContactImportSourceError(
      "invalid-xlsx",
      "מספר שורה בגיליון אינו תקין.",
    );
  }

  return { row, column };
}

function validateParsedRows(parsed: ParsedCsv): void {
  const rowCount = parsed.rows.length;
  let maximumColumnCount = parsed.headers.length;

  for (const row of parsed.rows) {
    maximumColumnCount = Math.max(maximumColumnCount, row.length);
  }

  validateDimensions(rowCount + 1, maximumColumnCount);
  validateCellLengths(parsed.headers, 1);

  for (const [rowIndex, row] of parsed.rows.entries()) {
    validateCellLengths(row, rowIndex + 2);
  }
}

function validateCellLengths(row: readonly string[], rowNumber: number): void {
  for (const [columnIndex, value] of row.entries()) {
    if (value.length > CONTACT_IMPORT_MAX_CELL_CHARACTERS) {
      throw new ContactImportSourceError(
        "cell-length-limit",
        `הערך בשורה ${rowNumber}, עמודה ${columnIndex + 1} ארוך מ־2,000 תווים.`,
      );
    }
  }
}

function validateDimensions(rowCount: number, columnCount: number): void {
  if (rowCount > CONTACT_IMPORT_MAX_DATA_ROWS + 1) {
    throw new ContactImportSourceError(
      "row-limit",
      "הקובץ מכיל יותר מ־50,000 שורות נתונים.",
    );
  }

  if (columnCount > CONTACT_IMPORT_MAX_COLUMNS) {
    throw new ContactImportSourceError(
      "column-limit",
      "הקובץ מכיל יותר מ־100 עמודות.",
    );
  }

  if (rowCount * columnCount > CONTACT_IMPORT_MAX_DIMENSION_CELLS) {
    throw new ContactImportSourceError(
      "dimension-limit",
      "טווח הגיליון גדול מ־500,000 תאים. יש להסיר שורות או עמודות ריקות.",
    );
  }
}

function toSourceString(value: unknown): string {
  if (value === null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "string") {
    return value;
  }

  throw new ContactImportSourceError(
    "invalid-xlsx",
    "הגיליון מכיל סוג תא שאינו נתמך בייבוא אנשי קשר.",
  );
}
