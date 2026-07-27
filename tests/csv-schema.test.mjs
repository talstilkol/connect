import assert from "node:assert/strict";
import test from "node:test";
import { inspectCsvSchema } from "../shared/validation/csvSchema.ts";

test("accepts a CSV schema with unique headers and consistent row widths", () => {
  assert.deepEqual(inspectCsvSchema(["a", "b"], [["1", "2"]]), {
    headerColumnCount: 2,
    emptyHeaderColumns: [],
    duplicateHeaders: [],
    rowsWithColumnCountMismatch: 0,
    shortRows: 0,
    longRows: 0,
    rowIssueSamples: [],
    isConsistent: true,
  });
});

test("reports empty and exact duplicate headers by column number", () => {
  const result = inspectCsvSchema(["a", "", "a", "A"], []);

  assert.deepEqual(result.emptyHeaderColumns, [2]);
  assert.deepEqual(result.duplicateHeaders, [
    { header: "a", columnNumbers: [1, 3] },
  ]);
  assert.equal(result.isConsistent, false);
});

test("counts short and long rows and limits structural samples", () => {
  const result = inspectCsvSchema(
    ["a", "b"],
    [["1"], ["1", "2", "3"], ["1"], ["1"], ["1"], ["1"], ["1"]],
  );

  assert.equal(result.rowsWithColumnCountMismatch, 7);
  assert.equal(result.shortRows, 6);
  assert.equal(result.longRows, 1);
  assert.equal(result.rowIssueSamples.length, 5);
  assert.deepEqual(result.rowIssueSamples[0], {
    rowIndex: 0,
    sourceRowNumber: 2,
    expectedColumnCount: 2,
    actualColumnCount: 1,
  });
  assert.equal(result.rowIssueSamples[4].sourceRowNumber, 6);
});
