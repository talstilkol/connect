export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

export function parseCsv(source: string): ParsedCsv {
  const input = source.replace(/^\uFEFF/, "");

  if (input.trim().length === 0) {
    throw new CsvParseError("הקובץ ריק.");
  }

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (inQuotes) {
      if (character === '"' && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new CsvParseError(
          `נמצאה מירכאה לא תקינה בשורה ${records.length + 1}.`,
        );
      }

      inQuotes = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";

      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new CsvParseError("הקובץ מסתיים בתוך שדה מוקף במירכאות.");
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [rawHeaders, ...rawRows] = records;
  const headers = rawHeaders?.map((header) => header.trim()) ?? [];

  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    throw new CsvParseError("לא נמצאה שורת כותרות בקובץ.");
  }

  const rows = rawRows.filter((row) =>
    row.some((value) => value.trim().length > 0),
  );

  return { headers, rows };
}
