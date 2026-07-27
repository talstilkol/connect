import assert from "node:assert/strict";
import test from "node:test";
import { inspectAudiencePersonalization } from "../shared/validation/audiencePersonalization.ts";

test("waits for complete mappings before auditing audience rows", () => {
  assert.deepEqual(
    inspectAudiencePersonalization({
      rows: [["1"]],
      templateVariableNumbers: [1],
      variableColumnMapping: {},
      requiresDynamicUrlValue: false,
      dynamicUrlColumnIndex: null,
    }),
    {
      totalRows: 1,
      mappingComplete: false,
      auditedRows: 0,
      completeRows: 0,
      incompleteRows: 0,
      rowsMissingBodyValues: 0,
      rowsMissingDynamicUrlValue: 0,
      issueSamples: [],
    },
  );
});

test("counts rows with all body and dynamic URL values", () => {
  const result = inspectAudiencePersonalization({
    rows: [
      ["1", "a"],
      ["2", "b"],
    ],
    templateVariableNumbers: [1],
    variableColumnMapping: { 1: 0 },
    requiresDynamicUrlValue: true,
    dynamicUrlColumnIndex: 1,
  });

  assert.equal(result.mappingComplete, true);
  assert.equal(result.auditedRows, 2);
  assert.equal(result.completeRows, 2);
  assert.equal(result.incompleteRows, 0);
});

test("counts one incomplete row even when two value types are missing", () => {
  const result = inspectAudiencePersonalization({
    rows: [
      ["", ""],
      ["1", ""],
      ["", "a"],
      ["2", "b"],
    ],
    templateVariableNumbers: [1],
    variableColumnMapping: { 1: 0 },
    requiresDynamicUrlValue: true,
    dynamicUrlColumnIndex: 1,
  });

  assert.equal(result.auditedRows, 4);
  assert.equal(result.completeRows, 1);
  assert.equal(result.incompleteRows, 3);
  assert.equal(result.rowsMissingBodyValues, 2);
  assert.equal(result.rowsMissingDynamicUrlValue, 2);
  assert.deepEqual(result.issueSamples[0], {
    rowIndex: 0,
    sourceRowNumber: 2,
    missingBodyVariableNumbers: [1],
    missingDynamicUrlValue: true,
  });
});

test("limits issue details to the first five source rows", () => {
  const result = inspectAudiencePersonalization({
    rows: [[""], [""], [""], [""], [""], [""], [""]],
    templateVariableNumbers: [1],
    variableColumnMapping: { 1: 0 },
    requiresDynamicUrlValue: false,
    dynamicUrlColumnIndex: null,
  });

  assert.equal(result.incompleteRows, 7);
  assert.equal(result.issueSamples.length, 5);
  assert.equal(result.issueSamples[0].sourceRowNumber, 2);
  assert.equal(result.issueSamples[4].sourceRowNumber, 6);
});
