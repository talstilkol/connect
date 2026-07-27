import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateActionHandler,
} from "../server/templates/messageTemplateActionHandler.ts";
import {
  MessageTemplateInputError,
} from "../server/templates/messageTemplateService.ts";
import {
  MessageTemplateSubmissionError,
} from "../server/templates/messageTemplateSubmissionService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  MessageTemplateLockedError,
} from "../db/messageTemplateRepository.ts";

const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "owner",
};

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
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 09:00:00",
    header: "",
    body: "שלום",
    footer: "",
    variableExamples: {},
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

function fixture(options = {}) {
  const calls = [];
  const handler = createMessageTemplateActionHandler({
    applicationConfigured: () =>
      options.applicationConfigured ?? true,
    readSubmissionReadiness: () =>
      options.submissionReadiness ?? {
        status: "configured",
      },
    async createDraftContext() {
      calls.push("draft-context");

      if (options.draftContextError) {
        throw options.draftContextError;
      }

      return {
        session,
        service: {
          async list() {
            throw new Error("must-not-run");
          },
          async saveDraft() {
            calls.push("save");

            if (options.saveError) {
              throw options.saveError;
            }

            return template();
          },
        },
      };
    },
    async createSubmissionContext() {
      calls.push("submission-context");

      if (options.submissionContextError) {
        throw options.submissionContextError;
      }

      return {
        session,
        service: {
          async submit() {
            calls.push("submit");

            if (options.submitError) {
              throw options.submitError;
            }

            return template({
              metaTemplateId: "123456789",
              status: "pending_review",
              submissionKey:
                `template_submission_v1_${"b".repeat(64)}`,
              submissionStartedAt:
                "2026-07-25 10:00:00",
              submittedAt: "2026-07-25 10:01:00",
              version: 3,
            });
          },
        },
      };
    },
  });

  return {
    calls,
    handler,
  };
}

test("stops both actions before context when the application is not configured", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.saveDraft({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.submit("template-key"),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns a bounded browser DTO after saving a draft", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.saveDraft({
    name: "service_update",
  });

  assert.equal(result.status, "saved");
  assert.equal(result.template.name, "service_update");
  assert.equal("tenantId" in result.template, false);
  assert.deepEqual(testFixture.calls, [
    "draft-context",
    "save",
  ]);
});

test("maps draft validation and tenant failures without exposing errors", async () => {
  const invalidDraft = fixture({
    saveError: new MessageTemplateInputError([
      "invalid-name",
    ]),
  });
  const missingTenant = fixture({
    draftContextError: new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "internal membership detail",
    ),
  });
  const lockedTemplate = fixture({
    saveError: new MessageTemplateLockedError(),
  });

  assert.deepEqual(
    await invalidDraft.handler.saveDraft({}),
    {
      status: "validation-error",
      issues: ["invalid-name"],
    },
  );
  assert.deepEqual(
    await missingTenant.handler.saveDraft({}),
    { status: "onboarding-required" },
  );
  assert.deepEqual(
    await lockedTemplate.handler.saveDraft({}),
    { status: "not-editable" },
  );
});

test("checks Meta submission readiness before creating context", async () => {
  const disabled = fixture({
    submissionReadiness: { status: "disabled" },
  });
  const incomplete = fixture({
    submissionReadiness: { status: "incomplete" },
  });

  assert.deepEqual(
    await disabled.handler.submit("template-key"),
    { status: "meta-configuration-required" },
  );
  assert.deepEqual(
    await incomplete.handler.submit("template-key"),
    { status: "meta-configuration-invalid" },
  );
  assert.deepEqual(disabled.calls, []);
  assert.deepEqual(incomplete.calls, []);
});

test("returns a pending review DTO after submission", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.submit(
    `template_v1_${"a".repeat(64)}`,
  );

  assert.equal(result.status, "submitted");
  assert.equal(result.template.status, "pending_review");
  assert.equal("metaTemplateId" in result.template, false);
  assert.deepEqual(testFixture.calls, [
    "submission-context",
    "submit",
  ]);
});

test("maps every submission failure to a bounded public status", async () => {
  const mappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["TEMPLATE_NOT_FOUND", "not-found"],
    ["TEMPLATE_NOT_EDITABLE", "not-editable"],
    ["META_NOT_CONNECTED", "meta-not-connected"],
    ["CREDENTIAL_UNAVAILABLE", "credential-unavailable"],
    ["STATE_CONFLICT", "state-conflict"],
    ["SUBMISSION_REJECTED", "submission-rejected"],
    ["SUBMISSION_UNCERTAIN", "submission-uncertain"],
    ["SERVICE_UNAVAILABLE", "server-error"],
  ];

  for (const [code, status] of mappings) {
    const testFixture = fixture({
      submitError: new MessageTemplateSubmissionError(
        code,
        "provider detail must not escape",
      ),
    });
    const result = await testFixture.handler.submit(
      `template_v1_${"a".repeat(64)}`,
    );

    assert.deepEqual(result, { status });
    assert.doesNotMatch(
      JSON.stringify(result),
      /provider detail/,
    );
  }
});
