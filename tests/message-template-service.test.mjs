import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateService,
  MessageTemplateInputError,
} from "../server/templates/messageTemplateService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function draft(overrides = {}) {
  return {
    name: "service_update",
    category: "UTILITY",
    language: "he",
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

function fixture() {
  const state = {
    saved: [],
    listCalls: [],
  };
  const persisted = {
    templateKey: `template_v1_${"a".repeat(64)}`,
    tenantId: 7,
    metaTemplateId: null,
    status: "draft",
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "created-at",
    updatedAt: "updated-at",
    ...draft(),
  };

  return {
    state,
    persisted,
    service: createMessageTemplateService({
      async saveDraft(input) {
        state.saved.push(input);
        return {
          ...persisted,
          templateKey: input.templateKey,
          ...input,
        };
      },
      async findByKey() {
        return persisted;
      },
      async listByTenant(tenantId, limit) {
        state.listCalls.push({
          tenantId,
          limit,
        });
        return [persisted];
      },
      async claimSubmission() {
        throw new Error("must-not-run");
      },
      async completeSubmission() {
        throw new Error("must-not-run");
      },
      async releaseSubmission() {
        throw new Error("must-not-run");
      },
    }),
  };
}

test("derives tenant scope and a deterministic template key on save", async () => {
  const firstFixture = fixture();
  const secondFixture = fixture();

  await firstFixture.service.saveDraft(
    session(),
    draft(),
  );
  await secondFixture.service.saveDraft(
    session(),
    draft(),
  );

  assert.equal(firstFixture.state.saved[0].tenantId, 7);
  assert.match(
    firstFixture.state.saved[0].templateKey,
    /^template_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    firstFixture.state.saved[0].templateKey,
    secondFixture.state.saved[0].templateKey,
  );
});

test("lists templates through the tenant read permission", async () => {
  const testFixture = fixture();

  const templates = await testFixture.service.list(
    session("viewer"),
  );

  assert.equal(templates.length, 1);
  assert.deepEqual(testFixture.state.listCalls, [
    {
      tenantId: 7,
      limit: 100,
    },
  ]);
});

test("rejects invalid input before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.saveDraft(
      session(),
      draft({
        name: "Invalid Name",
      }),
    ),
    (error) => error instanceof MessageTemplateInputError,
  );
  assert.deepEqual(testFixture.state.saved, []);
});

test("enforces template write permission", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.saveDraft(
      session("viewer"),
      draft(),
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.throws(
    () => testFixture.service.list(session("agent")),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.state.saved, []);
  assert.deepEqual(testFixture.state.listCalls, []);
});
