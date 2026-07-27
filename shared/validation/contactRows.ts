export interface ContactRowQualitySummary {
  totalRows: number;
  rowsWithPhone: number;
  rowsWithoutPhone: number;
  exactDuplicateRows: number;
}

export function inspectContactRows(
  rows: readonly (readonly string[])[],
  phoneColumnIndex: number,
): ContactRowQualitySummary {
  const seenPhoneValues = new Set<string>();
  let rowsWithPhone = 0;
  let rowsWithoutPhone = 0;
  let exactDuplicateRows = 0;

  for (const row of rows) {
    const phoneValue = (row[phoneColumnIndex] ?? "").trim();

    if (!phoneValue) {
      rowsWithoutPhone += 1;
      continue;
    }

    rowsWithPhone += 1;

    if (seenPhoneValues.has(phoneValue)) {
      exactDuplicateRows += 1;
    } else {
      seenPhoneValues.add(phoneValue);
    }
  }

  return {
    totalRows: rows.length,
    rowsWithPhone,
    rowsWithoutPhone,
    exactDuplicateRows,
  };
}
