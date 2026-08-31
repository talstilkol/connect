import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../server/meta/metaGraphTransport.ts";
import {
  MetaMessageTemplateContractError,
} from "../server/templates/metaMessageTemplateAdapter.ts";
import {
  createMessageTemplateSubmissionWorker,
  MessageTemplateSubmissionWorkerError,
} from "../server/templates/messageTemplateSubmissionWorker.ts";

const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const occurredAt = "2026-08-17T08:02:00.000Z";

function template() {
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
    submissionStartedAt: "2026-08-17T08:01:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 2,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-17T08:01:00.000Z",
  };
}

function outbox() {
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
    status: "submitting",
    stateVersion: 2,
    attemptCount: 1,
    lastErrorCode: null,
    metaTemplateId: null,
    claimedAt: "2026-08-17T08:01:00.000Z",
    settledAt: null,
    createdAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-17T08:01:00.000Z",
  };
}

function fixture(options = {}) {
  const calls = {
    claim: [],
    submitted: [],
    rejected: [],
    ambiguous: [],
    vault: [],
    provider: [],
    telemetry: [],
  };
  const claimResult = options.claimResult ?? {
    outcome: "claimed",
    prepared: { outbox: outbox(), template: template() },
  };
  const outboxRepository = {
    async find() {
      return null;
    },
    async claim(...args) {
      calls.claim.push(args);
      if (options.claimError) {
        throw options.claimError;
      }
      return claimResult;
    },
    async markSubmitted(...args) {
      calls.submitted.push(args);
      if (options.settlementError) {
        throw options.settlementError;
      }
      return { ...outbox(), status: "submitted" };
    },
    async markRejected(...args) {
      calls.rejected.push(args);
      if (options.settlementError) {
        throw options.settlementError;
      }
      return { ...outbox(), status: "rejected" };
    },
    async markAmbiguous(...args) {
      calls.ambiguous.push(args);
      if (options.settlementError) {
        throw options.settlementError;
      }
      return { ...outbox(), status: "ambiguous" };
    },
    async reconcileSubmitted() {
      throw new Error("not used");
    },
    async reconcileRejected() {
      throw new Error("not used");
    },
  };
  const worker = createMessageTemplateSubmissionWorker({
    outbox: outboxRepository,
    credentialVault: {
      async withAccessToken(currentTenantId, operation) {
        calls.vault.push(currentTenantId);
        if (options.vaultError) {
          throw options.vaultError;
        }
        return operation("secret-access-token");
      },
    },
    submitter: {
      async submit(input) {
        calls.provider.push(input);
        if (options.providerError) {
          throw options.providerError;
        }
        return options.providerResult ?? {
          metaTemplateId: "400004",
          status: "pending_review",
          category: "UTILITY",
        };
      },
    },
    graphApiVersion: "v23.0",
    clock: () => occurredAt,
    ...(options.telemetryTimestamps
      ? {
          telemetry: {
            sink: {
              async record(event) {
                calls.telemetry.push(event);
                return { outcome: "recorded" };
              },
            },
            clock: {
              now() {
                const value = options.telemetryTimestamps.shift();
                if (value === undefined) {
                  throw new Error("telemetry clock exhausted");
                }
                return new Date(value);
              },
            },
          },
        }
      : {}),
  });

  return { calls, worker };
}

test("claims, submits once, and atomically settles provider success", async () => {
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.worker.process(tenantId, submissionKey),
    { outcome: "submitted" },
  );
  assert.deepEqual(testFixture.calls.claim, [[
    tenantId,
    submissionKey,
    "v23.0",
    occurredAt,
  ]]);
  assert.equal(testFixture.calls.provider.length, 1);
  assert.equal(testFixture.calls.provider[0].wabaId, "123456789");
  assert.equal(testFixture.calls.provider[0].template.templateKey, templateKey);
  assert.deepEqual(testFixture.calls.submitted, [[
    tenantId,
    submissionKey,
    "400004",
    occurredAt,
  ]]);
  assert.equal("accessToken" in testFixture.calls.submitted[0], false);
});

test("records one delivery attempt with an exact nested Meta request", async () => {
  const testFixture = fixture({
    telemetryTimestamps: [
      "2026-08-21T10:00:00.000Z",
      "2026-08-21T10:00:00.020Z",
      "2026-08-21T10:00:00.070Z",
      "2026-08-21T10:00:00.090Z",
    ],
  });

  assert.deepEqual(
    await testFixture.worker.process(tenantId, submissionKey),
    { outcome: "submitted" },
  );
  assert.deepEqual(testFixture.calls.telemetry, [{
    version: 1,
    kind: "delivery-attempt",
    queue: "message-template-submission",
    outcome: "submitted",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.090Z",
    durationMilliseconds: 90,
    providerRequests: [{
      provider: "meta",
      operation: "message-template.submit",
      outcome: "completed",
      startedAt: "2026-08-21T10:00:00.020Z",
      completedAt: "2026-08-21T10:00:00.070Z",
      durationMilliseconds: 50,
    }],
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.telemetry),
    /tenant|submissionKey|templateKey|waba|token|payload|url/i,
  );
});

test("records a failed Meta child measurement under an ambiguous delivery", async () => {
  const testFixture = fixture({
    providerError: new MetaGraphError("TIMEOUT", "private timeout"),
    telemetryTimestamps: [
      "2026-08-21T10:00:00.000Z",
      "2026-08-21T10:00:00.010Z",
      "2026-08-21T10:00:00.040Z",
      "2026-08-21T10:00:00.050Z",
    ],
  });

  assert.deepEqual(
    await testFixture.worker.process(tenantId, submissionKey),
    { outcome: "ambiguous" },
  );
  assert.equal(testFixture.calls.telemetry[0].outcome, "ambiguous");
  assert.equal(
    testFixture.calls.telemetry[0].providerRequests[0].outcome,
    "failed",
  );
  assert.equal(
    testFixture.calls.telemetry[0].providerRequests[0].durationMilliseconds,
    30,
  );
});

test("never invokes Meta for terminal, blocked, missing, or ambiguous claims", async () => {
  for (const outcome of ["blocked", "duplicate", "not-found", "ambiguous"]) {
    const claimResult = outcome === "not-found"
      ? { outcome }
      : { outcome, outbox: outbox() };
    const testFixture = fixture({ claimResult });

    assert.deepEqual(
      await testFixture.worker.process(tenantId, submissionKey),
      { outcome },
    );
    assert.equal(testFixture.calls.vault.length, 0);
    assert.equal(testFixture.calls.provider.length, 0);
  }
});

test("records known provider and credential failures without retrying Meta", async () => {
  const cases = [
    [
      { providerError: new MetaMessageTemplateContractError("INVALID_TEMPLATE_REQUEST") },
      "META_TEMPLATE_REQUEST_INVALID",
    ],
    [
      { providerError: new MetaGraphError("API_ERROR", "rejected", { httpStatus: 400 }) },
      "META_TEMPLATE_REJECTED",
    ],
    [
      { providerError: new MetaGraphError("API_ERROR", "rate limited", { httpStatus: 429 }) },
      "META_RATE_LIMITED",
    ],
    [
      {
        vaultError: new MetaCredentialVaultError(
          "CREDENTIAL_NOT_FOUND",
          "unavailable",
        ),
      },
      "CREDENTIAL_UNAVAILABLE",
    ],
  ];

  for (const [options, expectedCode] of cases) {
    const testFixture = fixture(options);
    assert.deepEqual(
      await testFixture.worker.process(tenantId, submissionKey),
      { outcome: "rejected" },
    );
    assert.equal(testFixture.calls.rejected[0][2], expectedCode);
    assert.equal(testFixture.calls.ambiguous.length, 0);
  }
});

test("marks timeout, malformed response, and unknown failures as ambiguous", async () => {
  const cases = [
    { providerError: new MetaGraphError("TIMEOUT", "timeout") },
    { providerError: new Error("private provider detail") },
    {
      providerResult: {
        metaTemplateId: "400004",
        status: "pending_review",
        category: "MARKETING",
      },
    },
  ];

  for (const options of cases) {
    const testFixture = fixture(options);
    assert.deepEqual(
      await testFixture.worker.process(tenantId, submissionKey),
      { outcome: "ambiguous" },
    );
    assert.deepEqual(testFixture.calls.ambiguous[0], [
      tenantId,
      submissionKey,
      "PROVIDER_OUTCOME_UNKNOWN",
      occurredAt,
    ]);
  }
});

test("fails closed when input, claim, or settlement is invalid", async () => {
  const invalidInput = fixture();
  await assert.rejects(
    invalidInput.worker.process(tenantId, "invalid"),
    (error) => error instanceof MessageTemplateSubmissionWorkerError,
  );

  const claimFailure = fixture({ claimError: new Error("database detail") });
  await assert.rejects(
    claimFailure.worker.process(tenantId, submissionKey),
    (error) => error instanceof MessageTemplateSubmissionWorkerError,
  );

  const settlementFailure = fixture({
    settlementError: new Error("database detail"),
  });
  await assert.rejects(
    settlementFailure.worker.process(tenantId, submissionKey),
    (error) => error instanceof MessageTemplateSubmissionWorkerError,
  );
});
