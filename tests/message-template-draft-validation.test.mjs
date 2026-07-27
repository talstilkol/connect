import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMessageTemplateDraft,
} from "../shared/validation/messageTemplateDraft.ts";

function draft(overrides = {}) {
  return {
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: {
      1: "שם איש קשר",
    },
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
    ...overrides,
  };
}

test("normalizes a supported message template draft", () => {
  const result = validateMessageTemplateDraft(
    draft({
      name: " service_update ",
      header: " עדכון ",
      body: " שלום {{1}} ",
      footer: " צוות השירות ",
      variableExamples: {
        1: " שם איש קשר ",
      },
      quickReplies: ["ignored hidden value"],
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.value.name, "service_update");
  assert.equal(result.value.header, "עדכון");
  assert.equal(result.value.body, "שלום {{1}}");
  assert.deepEqual(result.value.variableExamples, {
    1: "שם איש קשר",
  });
  assert.deepEqual(result.value.quickReplies, []);
});

test("rejects unsupported names, authentication, and missing variable examples", () => {
  const result = validateMessageTemplateDraft(
    draft({
      name: "Service Update",
      category: "AUTHENTICATION",
      variableExamples: {},
    }),
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    "invalid-name",
    "unsupported-category",
    "invalid-variable-examples",
  ]);
});

test("normalizes the bounded quick reply path", () => {
  const result = validateMessageTemplateDraft(
    draft({
      buttonMode: "quick_reply",
      quickReplies: [" אישור ", " הסרה "],
    }),
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.value.quickReplies, [
    "אישור",
    "הסרה",
  ]);
  assert.equal(result.value.urlButton.enabled, false);
  assert.equal(result.value.phoneButton.enabled, false);
});

test("validates static, dynamic, and phone call-to-action values", () => {
  const valid = validateMessageTemplateDraft(
    draft({
      buttonMode: "call_to_action",
      urlButton: {
        enabled: true,
        mode: "dynamic",
        text: "פתיחה",
        value: "https://example.invalid/{{1}}",
        example: "reference",
      },
      phoneButton: {
        enabled: true,
        text: "חיוג",
        value: "+972501234567",
      },
    }),
  );
  const invalid = validateMessageTemplateDraft(
    draft({
      buttonMode: "call_to_action",
      urlButton: {
        enabled: true,
        mode: "static",
        text: "פתיחה",
        value: "http://example.invalid",
        example: "",
      },
    }),
  );

  assert.equal(valid.success, true);
  assert.equal(valid.value.urlButton.mode, "dynamic");
  assert.equal(valid.value.phoneButton.enabled, true);
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.issues, ["invalid-buttons"]);
});
