import type { CampaignVariableColumnMapping } from "../domain/campaignDraft";

export interface AudiencePersonalizationAuditInput {
  rows: readonly (readonly string[])[];
  templateVariableNumbers: readonly number[];
  variableColumnMapping: Readonly<CampaignVariableColumnMapping>;
  requiresDynamicUrlValue: boolean;
  dynamicUrlColumnIndex: number | null;
}

export interface AudiencePersonalizationAudit {
  totalRows: number;
  mappingComplete: boolean;
  auditedRows: number;
  completeRows: number;
  incompleteRows: number;
  rowsMissingBodyValues: number;
  rowsMissingDynamicUrlValue: number;
  issueSamples: AudienceRowIssue[];
}

export interface AudienceRowIssue {
  rowIndex: number;
  sourceRowNumber: number;
  missingBodyVariableNumbers: number[];
  missingDynamicUrlValue: boolean;
}

const issueSampleLimit = 5;

export function inspectAudiencePersonalization(
  input: AudiencePersonalizationAuditInput,
): AudiencePersonalizationAudit {
  const bodyMappingComplete = input.templateVariableNumbers.every(
    (variableNumber) => {
      const columnIndex = input.variableColumnMapping[variableNumber];
      return columnIndex !== undefined && columnIndex !== null;
    },
  );
  const dynamicUrlMappingComplete =
    !input.requiresDynamicUrlValue || input.dynamicUrlColumnIndex !== null;
  const mappingComplete = bodyMappingComplete && dynamicUrlMappingComplete;
  const emptyAudit = {
    totalRows: input.rows.length,
    mappingComplete,
    auditedRows: 0,
    completeRows: 0,
    incompleteRows: 0,
    rowsMissingBodyValues: 0,
    rowsMissingDynamicUrlValue: 0,
    issueSamples: [],
  };

  if (!mappingComplete) {
    return emptyAudit;
  }

  let completeRows = 0;
  let incompleteRows = 0;
  let rowsMissingBodyValues = 0;
  let rowsMissingDynamicUrlValue = 0;
  const issueSamples: AudienceRowIssue[] = [];

  for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex += 1) {
    const row = input.rows[rowIndex];
    const missingBodyVariableNumbers = input.templateVariableNumbers.filter(
      (variableNumber) => {
        const columnIndex = input.variableColumnMapping[variableNumber];
        return (
          columnIndex === undefined ||
          columnIndex === null ||
          !(row[columnIndex] ?? "").trim()
        );
      },
    );
    const missingBodyValue = missingBodyVariableNumbers.length > 0;
    const missingDynamicUrlValue =
      input.requiresDynamicUrlValue &&
      (input.dynamicUrlColumnIndex === null ||
        !(row[input.dynamicUrlColumnIndex] ?? "").trim());

    if (missingBodyValue) {
      rowsMissingBodyValues += 1;
    }

    if (missingDynamicUrlValue) {
      rowsMissingDynamicUrlValue += 1;
    }

    if (missingBodyValue || missingDynamicUrlValue) {
      incompleteRows += 1;

      if (issueSamples.length < issueSampleLimit) {
        issueSamples.push({
          rowIndex,
          sourceRowNumber: rowIndex + 2,
          missingBodyVariableNumbers,
          missingDynamicUrlValue,
        });
      }
    } else {
      completeRows += 1;
    }
  }

  return {
    totalRows: input.rows.length,
    mappingComplete,
    auditedRows: input.rows.length,
    completeRows,
    incompleteRows,
    rowsMissingBodyValues,
    rowsMissingDynamicUrlValue,
    issueSamples,
  };
}
