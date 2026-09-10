import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateSubmissionReconciliation,
  MessageTemplateSubmissionReconciliationError,
} from "../server/templates/messageTemplateSubmissionReconciliation.ts";

const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const createdAt = "2026-08-21T09:00:00.000Z";
const claimedAt = "2026-08-21T09:01:00.000Z";
const beforeGraceAt = "2026-08-21T09:15:59.999Z";
const afterGraceAt = "2026-08-21T09:16:00.000Z";

function ambiguousOutbox(overrides = {}) {
  return {
    submissionKey,
    tenantId,
    templateKey,
    templateVersion: 2,
    metaConnectionVersion: 3,
    wabaId: "123456789",
    graphApiVersion: "v23.0",
    requestOperation: "templates.submit",
    requestIdempotencyKey: `connect_idempotency_v1_${"c".repeat(64)}`,
    status: "ambiguous",
    stateVersion: 3,
    attemptCount: 1,
    lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN",
    metaTemplateId: null,
    claimedAt,
    settledAt: null,
    createdAt,
    updatedAt: claimedAt,
    ...overrides,
  };
}

function submittingTemplate(overrides = {}) {
  return {
    templateKey,
    tenantId,
    metaTemplateId: null,
    name: "service_update",
    language: "he",
    category: "UTILITY",
    status: "submitting",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: { 1: "שם איש קשר" },
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
    submissionKey,
    submissionStartedAt: claimedAt,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 2,
    submittedAt: null,
    reviewedAt: null,
    createdAt,
    updatedAt: claimedAt,
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    category: "UTILITY",
    providerStatus: "PENDING",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = {
    find: [],
    findTemplate: [],
    vault: [],
    list: [],
    submitted: [],
    rejected: [],
  };
  const outboxRecord = options.outboxRecord === undefined
    ? ambiguousOutbox()
    : options.outboxRecord;
  const templateRecord = options.templateRecord === undefined
    ? submittingTemplate()
    : options.templateRecord;

  const reconciler = createMessageTemplateSubmissionReconciliation({
    outbox: {
      async find(...args) {
        calls.find.push(args);
        if (options.findError) {
          throw options.findError;
        }
        return outboxRecord;
      },
      async claim() {
        throw new Error("must-not-claim");
      },
      async markSubmitted() {
        throw new Error("must-not-submit");
      },
      async markRejected() {
        throw new Error("must-not-reject");
      },
      async markAmbiguous() {
        throw new Error("must-not-mark-ambiguous");
      },
      async reconcileSubmitted(...args) {
        calls.submitted.push(args);
        if (options.settlementError) {
          throw options.settlementError;
        }
        return ambiguousOutbox({
          status: "submitted",
          stateVersion: 4,
          lastErrorCode: null,
          metaTemplateId: args[2],
          settledAt: args[3],
          updatedAt: args[3],
        });
      },
      async reconcileRejected(...args) {
        calls.rejected.push(args);
        if (options.settlementError) {
          throw options.settlementError;
        }
        return ambiguousOutbox({
          status: "rejected",
          stateVersion: 4,
          lastErrorCode: args[2],
          settledAt: args[3],
          updatedAt: args[3],
        });
      },
    },
    templates: {
      async findByKey(...args) {
        calls.findTemplate.push(args);
        if (options.templateFindError) {
          throw options.templateFindError;
        }
        return templateRecord;
      },
    },
    credentialVault: {
      async withAccessToken(currentTenantId, operation) {
        calls.vault.push(currentTenantId);
        if (options.vaultError) {
          throw options.vaultError;
        }
        return operation("secret-access-token");
      },
    },
    lister: {
      async list(input) {
        calls.list.push(input);
        if (options.listError) {
          throw options.listError;
        }
        return options.snapshots === undefined
          ? [snapshot()]
          : options.snapshots;
      },
    },
    clock: () => options.observedAt ?? afterGraceAt,
    notFoundGraceSeconds: options.notFoundGraceSeconds,
  });

  return { calls, reconciler };
}

test("resolves one exact provider identity as submitted without a second POST", async () => {
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "resolved-submitted" },
  );
  assert.deepEqual(testFixture.calls.find, [[tenantId, submissionKey]]);
  assert.deepEqual(testFixture.calls.findTemplate, [[tenantId, templateKey]]);
  assert.equal(testFixture.calls.list.length, 1);
  assert.equal(testFixture.calls.list[0].wabaId, "123456789");
  assert.equal(testFixture.calls.list[0].accessToken, "secret-access-token");
  assert.deepEqual(testFixture.calls.submitted, [[
    tenantId,
    submissionKey,
    "400004",
    afterGraceAt,
  ]]);
  assert.equal(testFixture.calls.rejected.length, 0);
});

test("defers a missing provider identity during the bounded grace window", async () => {
  const testFixture = fixture({
    snapshots: [],
    observedAt: beforeGraceAt,
  });

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "deferred" },
  );
  assert.equal(testFixture.calls.submitted.length, 0);
  assert.equal(testFixture.calls.rejected.length, 0);
});

test("releases an unresolved identity only after the grace window expires", async () => {
  const testFixture = fixture({
    snapshots: [],
    observedAt: afterGraceAt,
  });

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "resolved-rejected" },
  );
  assert.deepEqual(testFixture.calls.rejected, [[
    tenantId,
    submissionKey,
    "PROVIDER_CONFIRMED_NOT_SUBMITTED",
    afterGraceAt,
  ]]);
});

test("defers multiple exact matches instead of choosing an arbitrary provider record", async () => {
  const testFixture = fixture({
    snapshots: [
      snapshot({ metaTemplateId: "400004" }),
      snapshot({ metaTemplateId: "400005" }),
    ],
  });

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "deferred" },
  );
  assert.equal(testFixture.calls.submitted.length, 0);
  assert.equal(testFixture.calls.rejected.length, 0);
});

test("ignores nonmatching identities and rejects only after the grace window", async () => {
  const testFixture = fixture({
    snapshots: [
      snapshot({ name: "another_template" }),
      snapshot({ language: "en_US" }),
      snapshot({ category: "MARKETING" }),
    ],
  });

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "resolved-rejected" },
  );
  assert.equal(testFixture.calls.submitted.length, 0);
  assert.equal(testFixture.calls.rejected.length, 1);
});

test("never contacts Meta for missing, terminal, or mismatched local state", async () => {
  const cases = [
    { outboxRecord: null, expected: "not-found" },
    {
      outboxRecord: ambiguousOutbox({
        status: "submitted",
        stateVersion: 4,
        lastErrorCode: null,
        metaTemplateId: "400004",
        settledAt: afterGraceAt,
      }),
      expected: "duplicate",
    },
    { templateRecord: null, expected: "deferred" },
    {
      templateRecord: submittingTemplate({ status: "draft", submissionKey: null }),
      expected: "deferred",
    },
    {
      templateRecord: submittingTemplate({
        submissionKey: `template_submission_v1_${"d".repeat(64)}`,
      }),
      expected: "deferred",
    },
  ];

  for (const current of cases) {
    const testFixture = fixture(current);
    assert.deepEqual(
      await testFixture.reconciler.process(tenantId, submissionKey),
      { outcome: current.expected },
    );
    assert.equal(testFixture.calls.vault.length, 0);
    assert.equal(testFixture.calls.list.length, 0);
  }
});

test("defers credential and provider reads because their outcome is not proof of absence", async () => {
  for (const options of [
    { vaultError: new Error("private vault detail") },
    { listError: new Error("private provider detail") },
  ]) {
    const testFixture = fixture(options);
    assert.deepEqual(
      await testFixture.reconciler.process(tenantId, submissionKey),
      { outcome: "deferred" },
    );
    assert.equal(testFixture.calls.submitted.length, 0);
    assert.equal(testFixture.calls.rejected.length, 0);
  }
});

test("defers a malformed provider-list contract without settling state", async () => {
  const testFixture = fixture({ snapshots: null });

  assert.deepEqual(
    await testFixture.reconciler.process(tenantId, submissionKey),
    { outcome: "deferred" },
  );
  assert.equal(testFixture.calls.submitted.length, 0);
  assert.equal(testFixture.calls.rejected.length, 0);
});

test("fails closed with a sanitized error for invalid input or storage failures", async () => {
  const cases = [
    () => fixture().reconciler.process(tenantId, "invalid"),
    () => fixture({ findError: new Error("database detail") })
      .reconciler.process(tenantId, submissionKey),
    () => fixture({ templateFindError: new Error("database detail") })
      .reconciler.process(tenantId, submissionKey),
    () => fixture({ settlementError: new Error("database detail") })
      .reconciler.process(tenantId, submissionKey),
    () => fixture({ observedAt: "invalid" })
      .reconciler.process(tenantId, submissionKey),
  ];

  for (const execute of cases) {
    await assert.rejects(
      execute(),
      (error) =>
        error instanceof MessageTemplateSubmissionReconciliationError &&
        error.message ===
          "Message template submission reconciliation could not complete",
    );
  }
});

test("rejects unsafe grace-window configuration at construction", () => {
  for (const notFoundGraceSeconds of [0, 59, 86_401, 1.5]) {
    assert.throws(
      () => fixture({ notFoundGraceSeconds }),
      (error) => error instanceof MessageTemplateSubmissionReconciliationError,
    );
  }
});
