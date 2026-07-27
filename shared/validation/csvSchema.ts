export interface CsvDuplicateHeader {
  header: string;
  columnNumbers: number[];
}

export interface CsvRowWidthIssue {
  rowIndex: number;
  sourceRowNumber: number;
  expectedColumnCount: number;
  actualColumnCount: number;
}

export interface CsvSchemaAudit {
  headerColumnCount: number;
  emptyHeaderColumns: number[];
  duplicateHeaders: CsvDuplicateHeader[];
  rowsWithColumnCountMismatch: number;
  shortRows: number;
  longRows: number;
  rowIssueSamples: CsvRowWidthIssue[];
  isConsistent: boolean;
}

const rowIssueSampleLimit = 5;

export function inspectCsvSchema(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): CsvSchemaAudit {
  const emptyHeaderColumns: number[] = [];
  const headerColumns = new Map<string, number[]>();

  headers.forEach((rawHeader, columnIndex) => {
    const header = rawHeader.trim();
    const columnNumber = columnIndex + 1;

    if (!header) {
      emptyHeaderColumns.push(columnNumber);
      return;
    }

    const existingColumns = headerColumns.get(header) ?? [];
    existingColumns.push(columnNumber);
    headerColumns.set(header, existingColumns);
  });

  const duplicateHeaders = Array.from(headerColumns.entries())
    .filter(([, columnNumbers]) => columnNumbers.length > 1)
    .map(([header, columnNumbers]) => ({
      header,
      columnNumbers: [...columnNumbers],
    }));
  let rowsWithColumnCountMismatch = 0;
  let shortRows = 0;
  let longRows = 0;
  const rowIssueSamples: CsvRowWidthIssue[] = [];

  rows.forEach((row, rowIndex) => {
    if (row.length === headers.length) {
      return;
    }

    rowsWithColumnCountMismatch += 1;

    if (row.length < headers.length) {
      shortRows += 1;
    } else {
      longRows += 1;
    }

    if (rowIssueSamples.length < rowIssueSampleLimit) {
      rowIssueSamples.push({
        rowIndex,
        sourceRowNumber: rowIndex + 2,
        expectedColumnCount: headers.length,
        actualColumnCount: row.length,
      });
    }
  });

  return {
    headerColumnCount: headers.length,
    emptyHeaderColumns,
    duplicateHeaders,
    rowsWithColumnCountMismatch,
    shortRows,
    longRows,
    rowIssueSamples,
    isConsistent:
      emptyHeaderColumns.length === 0 &&
      duplicateHeaders.length === 0 &&
      rowsWithColumnCountMismatch === 0,
  };
}
