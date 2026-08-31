import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  createRailwayMessageTemplateSubmissionMaintenanceRuntime,
} from "../server/platform/railwayMessageTemplateSubmissionMaintenanceRuntime.ts";

const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const now = "2026-08-21T10:00:00.000Z";

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

async function credentialRepository() {
  let envelope = null;
  const repository = {
    async store(value) {
      envelope = {
        ...value,
        createdAt: "2026-08-21T08:00:00.000Z",
        updatedAt: "2026-08-21T08:00:00.000Z",
      };
    },
    async findByTenantId() {
      return envelope;
    },
  };
  const vault = createMetaCredentialVault(repository, {
    META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
  });

  await vault.storeAccessToken(tenantId, "maintenance-access-token");
  return repository;
}

function outboxRepository(calls) {
  return {
    async listPendingBefore(...args) {
      calls.push(["pending", args]);
      return [];
    },
    async listAmbiguousBefore(...args) {
      calls.push(["ambiguous", args]);
      return [ambiguousOutbox()];
    },
    async find(...args) {
      calls.push(["find", args]);
      return ambiguousOutbox();
    },
    async reconcileSubmitted(...args) {
      calls.push(["submitted", args]);
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
      throw new Error("must-not-reject");
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
  };
}

test("composes a bounded Railway maintenance cycle without requiring a queue vendor", async () => {
  const calls = [];
  const requests = [];
  const published = [];
  const runtime = createRailwayMessageTemplateSubmissionMaintenanceRuntime({
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    outbox: outboxRepository(calls),
    templates: {
      async findByKey() {
        return template();
      },
    },
    credentials: await credentialRepository(),
    publisher: {
      async publish(messages) {
        published.push(messages);
      },
    },
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
    clock: () => now,
  });

  assert.deepEqual(await runtime.run(), {
    pendingCandidates: 0,
    published: 0,
    ambiguousCandidates: 1,
    resolvedSubmitted: 1,
    resolvedRejected: 0,
    deferred: 0,
    duplicates: 0,
    missing: 0,
    failed: 0,
  });
  assert.equal(published.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, "GET");
  assert.deepEqual(calls, [
    ["pending", ["2026-08-21T09:59:55.000Z", 10]],
    ["ambiguous", ["2026-08-21T09:59:00.000Z", 10]],
    ["find", [tenantId, submissionKey]],
    ["submitted", [tenantId, submissionKey, "400004", now]],
  ]);
});
