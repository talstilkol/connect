import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  createRailwayMessageTemplateSubmissionReconciliationRuntime,
  RailwayMessageTemplateSubmissionReconciliationRuntimeError,
} from "../server/platform/railwayMessageTemplateSubmissionReconciliationRuntime.ts";

const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const occurredAt = "2026-08-21T09:20:00.000Z";

function ambiguousOutbox() {
  return {
    submissionKey,
    tenantId,
    templateKey,
    templateVersion: 2,
    metaConnectionVersion: 2,
    wabaId: "200002",
    graphApiVersion: "v21.0",
    requestOperation: "templates.submit",
    requestIdempotencyKey: `connect_idempotency_v1_${"c".repeat(64)}`,
    status: "ambiguous",
    stateVersion: 3,
    attemptCount: 1,
    lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN",
    metaTemplateId: null,
    claimedAt: "2026-08-21T09:01:00.000Z",
    settledAt: null,
    createdAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T09:02:00.000Z",
  };
}

function template() {
  return {
    templateKey,
    tenantId,
    metaTemplateId: null,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "submitting",
    submissionKey,
    submissionStartedAt: "2026-08-21T09:01:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 2,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T09:01:00.000Z",
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
  };
}

async function encryptedCredentialRepository() {
  let envelope = null;
  const repository = {
    async store(value) {
      envelope = {
        ...value,
        createdAt: "2026-08-21T08:00:00.000Z",
        updatedAt: "2026-08-21T08:00:00.000Z",
      };
    },
    async findByTenantId(requestedTenantId) {
      assert.equal(requestedTenantId, tenantId);
      return envelope;
    },
  };
  const vault = createMetaCredentialVault(repository, {
    META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
  });

  await vault.storeAccessToken(
    tenantId,
    "railway-reconciliation-access-token",
  );
  return repository;
}

function outboxRepository(calls) {
  return {
    async find(...args) {
      calls.push(["find", args]);
      return ambiguousOutbox();
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
      calls.push(["reconciled", args]);
      return {
        ...ambiguousOutbox(),
        status: "submitted",
        stateVersion: 4,
        lastErrorCode: null,
        metaTemplateId: args[2],
        settledAt: args[3],
        updatedAt: args[3],
      };
    },
    async reconcileRejected() {
      throw new Error("must-not-reconcile-rejected");
    },
  };
}

test("composes encrypted credentials and GET-only reconciliation inside Railway", async () => {
  const calls = [];
  const requests = [];
  const runtime =
    createRailwayMessageTemplateSubmissionReconciliationRuntime({
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      outbox: outboxRepository(calls),
      templates: {
        async findByKey(currentTenantId, currentTemplateKey) {
          assert.equal(currentTenantId, tenantId);
          assert.equal(currentTemplateKey, templateKey);
          return template();
        },
      },
      credentials: await encryptedCredentialRepository(),
      transportOptions: {
        async fetchImplementation(url, init) {
          requests.push({ url, init });
          return Response.json({
            data: [{
              id: "400004",
              name: "service_update",
              language: "he",
              status: "PENDING",
              category: "UTILITY",
            }],
          });
        },
      },
      clock: () => occurredAt,
    });

  assert.deepEqual(await runtime.process(tenantId, submissionKey), {
    outcome: "resolved-submitted",
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, "GET");
  assert.equal(requests[0].url.pathname, "/v21.0/200002/message_templates");
  assert.equal(requests[0].url.searchParams.get("limit"), "100");
  assert.equal(
    requests[0].init.headers.authorization,
    "Bearer railway-reconciliation-access-token",
  );
  assert.equal(requests[0].init.body, undefined);
  assert.deepEqual(calls, [
    ["find", [tenantId, submissionKey]],
    ["reconciled", [tenantId, submissionKey, "400004", occurredAt]],
  ]);
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /railway-reconciliation-access-token|AAECAwQF/,
  );
});

test("fails closed for disabled, incomplete, or extended reconciliation configuration", async () => {
  const dependencies = {
    outbox: outboxRepository([]),
    templates: {
      async findByKey() {
        return template();
      },
    },
    credentials: await encryptedCredentialRepository(),
  };

  assert.throws(
    () => createRailwayMessageTemplateSubmissionReconciliationRuntime({
      environment: {},
      ...dependencies,
    }),
    (error) =>
      error instanceof
        RailwayMessageTemplateSubmissionReconciliationRuntimeError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayMessageTemplateSubmissionReconciliationRuntime({
      environment: { META_GRAPH_API_VERSION: "v21.0" },
      ...dependencies,
    }),
    (error) =>
      error instanceof
        RailwayMessageTemplateSubmissionReconciliationRuntimeError &&
      error.code === "configuration-incomplete",
  );
  assert.throws(
    () => createRailwayMessageTemplateSubmissionReconciliationRuntime({
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      ...dependencies,
      unsupported: true,
    }),
    (error) =>
      error instanceof
        RailwayMessageTemplateSubmissionReconciliationRuntimeError &&
      error.code === "dependencies-invalid",
  );
});
