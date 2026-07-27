import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageTemplateTransitionError,
} from "../db/messageTemplateRepository.ts";
import {
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../server/meta/metaGraphTransport.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  createMessageTemplateSubmissionService,
  MessageTemplateSubmissionError,
} from "../server/templates/messageTemplateSubmissionService.ts";

const templateKey = `template_v1_${"a".repeat(64)}`;
const accessToken = toSensitiveMetaAccessToken(
  "submission-service-access-token",
);

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function template(overrides = {}) {
  return {
    templateKey,
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

function connectedMeta(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "100001",
    wabaId: "200002",
    phoneNumberId: "300003",
    status: "connected",
    webhookSubscribedAt: "2026-07-25 09:00:00",
    connectedAt: "2026-07-25 09:00:00",
    version: 2,
    createdAt: "2026-07-25 08:00:00",
    updatedAt: "2026-07-25 09:00:00",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const draftTemplate =
    options.template ?? template();
  let claimedTemplate;
  const templates = {
    async saveDraft() {
      throw new Error("must-not-run");
    },
    async listByTenant() {
      throw new Error("must-not-run");
    },
    async findByKey(tenantId, requestedTemplateKey) {
      calls.push({
        operation: "find-template",
        tenantId,
        templateKey: requestedTemplateKey,
      });
      return draftTemplate;
    },
    async claimSubmission(
      tenantId,
      requestedTemplateKey,
      expectedVersion,
      submissionKey,
    ) {
      calls.push({
        operation: "claim",
        tenantId,
        templateKey: requestedTemplateKey,
        expectedVersion,
        submissionKey,
      });

      if (options.claimError) {
        throw options.claimError;
      }

      claimedTemplate = template({
        status: "submitting",
        submissionKey,
        submissionStartedAt: "2026-07-25 10:01:00",
        version: expectedVersion + 1,
      });
      return claimedTemplate;
    },
    async completeSubmission(
      tenantId,
      requestedTemplateKey,
      submissionKey,
      metaTemplateId,
    ) {
      calls.push({
        operation: "complete",
        tenantId,
        templateKey: requestedTemplateKey,
        submissionKey,
        metaTemplateId,
      });

      if (options.completeError) {
        throw options.completeError;
      }

      return {
        ...claimedTemplate,
        metaTemplateId,
        status: "pending_review",
        submittedAt: "2026-07-25 10:02:00",
        version: claimedTemplate.version + 1,
      };
    },
    async releaseSubmission(
      tenantId,
      requestedTemplateKey,
      submissionKey,
      errorCode,
    ) {
      calls.push({
        operation: "release",
        tenantId,
        templateKey: requestedTemplateKey,
        submissionKey,
        errorCode,
      });

      if (options.releaseError) {
        throw options.releaseError;
      }

      return template({
        lastSubmissionErrorCode: errorCode,
        version: 5,
      });
    },
  };
  const service = createMessageTemplateSubmissionService({
    templates,
    metaConnections: {
      async findConnectionByTenantId(tenantId) {
        calls.push({
          operation: "find-connection",
          tenantId,
        });
        return options.connection === undefined
          ? connectedMeta()
          : options.connection;
      },
    },
    credentialVault: {
      async storeAccessToken() {
        throw new Error("must-not-run");
      },
      async withAccessToken(tenantId, operation) {
        calls.push({
          operation: "read-credential",
          tenantId,
        });

        if (options.credentialError) {
          throw options.credentialError;
        }

        return operation(accessToken);
      },
    },
    submitter: {
      async submit(input) {
        calls.push({
          operation: "submit",
          input,
        });

        if (options.submitError) {
          throw options.submitError;
        }

        return {
          metaTemplateId: "400004",
          status: "pending_review",
          category: "UTILITY",
        };
      },
    },
  });

  return {
    calls,
    service,
  };
}

test("claims, submits, and completes in a fail-closed order", async () => {
  const testFixture = fixture();

  const result = await testFixture.service.submit(
    session(),
    templateKey,
  );

  assert.equal(result.status, "pending_review");
  assert.equal(result.metaTemplateId, "400004");
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-template",
      "find-connection",
      "read-credential",
      "claim",
      "submit",
      "complete",
    ],
  );
  assert.match(
    testFixture.calls[3].submissionKey,
    /^template_submission_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    testFixture.calls[4].input.template.status,
    "submitting",
  );
});

test("checks permission and input before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.submit(session("viewer"), templateKey),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    testFixture.service.submit(session(), "../template"),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("requires a connected Meta account before reading credentials", async () => {
  const testFixture = fixture({
    connection: connectedMeta({
      status: "restricted",
    }),
  });

  await assert.rejects(
    testFixture.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "META_NOT_CONNECTED",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find-template", "find-connection"],
  );
});

test("releases an explicit client rejection back to draft", async () => {
  const testFixture = fixture({
    submitError: new MetaGraphError(
      "API_ERROR",
      "provider details must not escape",
      {
        httpStatus: 400,
        graphCode: 100,
      },
    ),
  });

  await assert.rejects(
    testFixture.service.submit(session(), templateKey),
    (error) => {
      assert.equal(
        error instanceof MessageTemplateSubmissionError,
        true,
      );
      assert.equal(error.code, "SUBMISSION_REJECTED");
      assert.doesNotMatch(error.message, /provider details/);
      return true;
    },
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-template",
      "find-connection",
      "read-credential",
      "claim",
      "submit",
      "release",
    ],
  );
  assert.equal(
    testFixture.calls.at(-1).errorCode,
    "META_TEMPLATE_REJECTED",
  );
});

test("keeps an ambiguous timeout in submitting state", async () => {
  const testFixture = fixture({
    submitError: new MetaGraphError(
      "TIMEOUT",
      "Meta Graph request timed out",
    ),
  });

  await assert.rejects(
    testFixture.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "SUBMISSION_UNCERTAIN",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-template",
      "find-connection",
      "read-credential",
      "claim",
      "submit",
    ],
  );
});

test("does not resubmit a template already marked submitting", async () => {
  const testFixture = fixture({
    template: template({
      status: "submitting",
      submissionKey:
        `template_submission_v1_${"b".repeat(64)}`,
      submissionStartedAt: "2026-07-25 10:01:00",
      version: 4,
    }),
  });

  await assert.rejects(
    testFixture.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "SUBMISSION_UNCERTAIN",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find-template"],
  );
});

test("maps credential and concurrent-state failures safely", async () => {
  const credentialFailure = fixture({
    credentialError: new MetaCredentialVaultError(
      "CREDENTIAL_NOT_FOUND",
      "encrypted storage detail",
    ),
  });
  const stateFailure = fixture({
    claimError: new MessageTemplateTransitionError(),
  });

  await assert.rejects(
    credentialFailure.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "CREDENTIAL_UNAVAILABLE",
  );
  await assert.rejects(
    stateFailure.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "STATE_CONFLICT",
  );
});

test("keeps a confirmed Meta result locked if local completion fails", async () => {
  const testFixture = fixture({
    completeError: new Error("D1 unavailable"),
  });

  await assert.rejects(
    testFixture.service.submit(session(), templateKey),
    (error) =>
      error instanceof MessageTemplateSubmissionError &&
      error.code === "SUBMISSION_UNCERTAIN",
  );
  assert.equal(
    testFixture.calls.at(-1).operation,
    "complete",
  );
  assert.equal(
    testFixture.calls.some(
      (call) => call.operation === "release",
    ),
    false,
  );
});
