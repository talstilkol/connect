import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTemplateVariableValues,
  containsTemplateVariableSyntax,
  inspectTemplateVariables,
} from "../shared/validation/templateVariables.ts";

test("accepts an empty template body without variables", () => {
  assert.deepEqual(inspectTemplateVariables(""), {
    numbers: [],
    error: null,
  });
});

test("accepts sequential variables and rejects a missing first variable", () => {
  assert.deepEqual(inspectTemplateVariables("{{1}}{{2}}"), {
    numbers: [1, 2],
    error: null,
  });

  assert.match(
    inspectTemplateVariables("{{2}}").error ?? "",
    /המשתנה הבא צריך להיות \{\{1\}\}/,
  );
});

test("replaces only variables with a supplied non-empty value", () => {
  assert.equal(applyTemplateVariableValues("{{1}}", { 1: "1" }), "1");
  assert.equal(applyTemplateVariableValues("{{1}}", { 1: "" }), "{{1}}");
});

test("detects variable syntax in unsupported template components", () => {
  assert.equal(containsTemplateVariableSyntax(""), false);
  assert.equal(containsTemplateVariableSyntax("{{1}}"), true);
  assert.equal(containsTemplateVariableSyntax("}}"), true);
});
