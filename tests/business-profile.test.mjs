import assert from "node:assert/strict";
import test from "node:test";
import { inspectBusinessProfileCompleteness } from "../shared/validation/businessProfile.ts";

test("reports an empty business profile as incomplete", () => {
  const result = inspectBusinessProfileCompleteness({
    businessName: "",
    timezone: "",
    interfaceLanguage: "",
    isDraftSaved: false,
  });

  assert.equal(result.completedCount, 0);
  assert.equal(result.isComplete, false);
});

test("requires saving after all business profile fields are filled", () => {
  const result = inspectBusinessProfileCompleteness({
    businessName: "1",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    isDraftSaved: false,
  });

  assert.equal(result.completedCount, 3);
  assert.equal(result.draftSaved, false);
  assert.equal(result.isComplete, false);
});

test("completes a filled and locally saved business profile", () => {
  const result = inspectBusinessProfileCompleteness({
    businessName: "1",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    isDraftSaved: true,
  });

  assert.equal(result.completedCount, 4);
  assert.equal(result.isComplete, true);
});
