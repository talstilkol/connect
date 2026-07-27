import assert from "node:assert/strict";
import test from "node:test";

import {
  toMessageTemplateView,
} from "../server/templates/messageTemplateView.ts";

test("removes tenant, Meta, submission, and event internals from the browser DTO", () => {
  const view = toMessageTemplateView({
    templateKey: `template_v1_${"a".repeat(64)}`,
    tenantId: 7,
    metaTemplateId: "123456789",
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "pending_review",
    submissionKey:
      `template_submission_v1_${"b".repeat(64)}`,
    submissionStartedAt: "2026-07-25 10:00:00",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 4,
    submittedAt: "2026-07-25 10:01:00",
    reviewedAt: null,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:01:00",
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
  });
  const serialized = JSON.stringify(view);

  assert.equal(view.status, "pending_review");
  assert.equal(view.body, "שלום {{1}}");
  assert.doesNotMatch(
    serialized,
    /tenantId|metaTemplateId|submissionKey|submissionStartedAt|lastSubmissionErrorCode|lastStatusEventKey|lastStatusEventAt|createdAt|version/,
  );
});
