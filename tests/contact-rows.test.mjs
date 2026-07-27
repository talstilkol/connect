import assert from "node:assert/strict";
import test from "node:test";
import { inspectContactRows } from "../shared/validation/contactRows.ts";

test("returns an empty quality summary for an empty contact file", () => {
  assert.deepEqual(inspectContactRows([], 0), {
    totalRows: 0,
    rowsWithPhone: 0,
    rowsWithoutPhone: 0,
    exactDuplicateRows: 0,
  });
});

test("counts blank phone cells and exact trimmed duplicates separately", () => {
  assert.deepEqual(
    inspectContactRows([[""], ["  "], ["1"], [" 1 "], ["2"]], 0),
    {
      totalRows: 5,
      rowsWithPhone: 3,
      rowsWithoutPhone: 2,
      exactDuplicateRows: 1,
    },
  );
});
