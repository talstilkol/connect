import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMessageTemplateSubmissionKey,
} from "../server/templates/messageTemplateSubmissionKey.ts";

function template(overrides = {}) {
  return {
    templateKey: `template_v1_${"a".repeat(64)}`,
    tenantId: 7,
    metaTemplateId: null,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "draft",
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 3,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
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

test("derives the same bounded key for the same draft version", async () => {
  const first = await deriveMessageTemplateSubmissionKey(
    template(),
  );
  const second = await deriveMessageTemplateSubmissionKey(
    template(),
  );

  assert.match(
    first,
    /^template_submission_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, second);
});

test("changes with content or version and rejects non-drafts", async () => {
  const original = await deriveMessageTemplateSubmissionKey(
    template(),
  );
  const changedContent =
    await deriveMessageTemplateSubmissionKey(
      template({
        body: "שלום {{1}}, הפנייה עודכנה",
      }),
    );
  const changedVersion =
    await deriveMessageTemplateSubmissionKey(
      template({
        version: 4,
      }),
    );

  assert.notEqual(original, changedContent);
  assert.notEqual(original, changedVersion);
  await assert.rejects(
    deriveMessageTemplateSubmissionKey(
      template({
        status: "submitting",
      }),
    ),
    /cannot be prepared/,
  );
});
