import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  createRailwayMessageTemplateSubmissionWorkerRuntime,
  RailwayMessageTemplateSubmissionWorkerRuntimeError,
} from "../server/platform/railwayMessageTemplateSubmissionWorkerRuntime.ts";

const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
const occurredAt = "2026-08-21T09:02:00.000Z";

function prepared() {
  return {
    outbox: {
      submissionKey,
      tenantId,
      templateKey,
      templateVersion: 2,
      metaConnectionVersion: 2,
      wabaId: "200002",
      graphApiVersion: "v21.0",
      requestOperation: "templates.submit",
      requestIdempotencyKey: `connect_idempotency_v1_${"c".repeat(64)}`,
      status: "submitting",
      stateVersion: 2,
      attemptCount: 1,
      lastErrorCode: null,
      metaTemplateId: null,
      claimedAt: "2026-08-21T09:01:00.000Z",
      settledAt: null,
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:01:00.000Z",
    },
    template: {
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

  await vault.storeAccessToken(tenantId, "railway-worker-access-token");
  return repository;
}

function outboxRepository(calls) {
  return {
    async find() {
      return null;
    },
    async claim(...args) {
      calls.push(["claim", args]);
      return { outcome: "claimed", prepared: prepared() };
    },
    async markSubmitted(...args) {
      calls.push(["submitted", args]);
      return prepared().outbox;
    },
    async markRejected() {
      throw new Error("must-not-reject");
    },
    async markAmbiguous() {
      throw new Error("must-not-be-ambiguous");
    },
    async reconcileSubmitted() {
      throw new Error("must-not-reconcile");
    },
    async reconcileRejected() {
      throw new Error("must-not-reconcile");
    },
  };
}

test("composes encrypted credentials, outbox, and Graph adapter inside Railway", async () => {
  const calls = [];
  const requests = [];
  const telemetryEvents = [];
  const telemetryTimes = [
    "2026-08-21T09:02:00.000Z",
    "2026-08-21T09:02:00.010Z",
    "2026-08-21T09:02:00.030Z",
    "2026-08-21T09:02:00.040Z",
  ];
  const runtime = createRailwayMessageTemplateSubmissionWorkerRuntime({
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    outbox: outboxRepository(calls),
    credentials: await encryptedCredentialRepository(),
    transportOptions: {
      async fetchImplementation(url, init) {
        requests.push({ url, init });
        return Response.json({
          id: "400004",
          status: "PENDING",
          category: "UTILITY",
        });
      },
    },
    clock: () => occurredAt,
    telemetrySink: {
      async record(event) {
        telemetryEvents.push(event);
        return { outcome: "recorded" };
      },
    },
    telemetryClock: {
      now() {
        const value = telemetryTimes.shift();
        if (value === undefined) {
          throw new Error("telemetry clock exhausted");
        }
        return new Date(value);
      },
    },
  });

  assert.deepEqual(await runtime.process(tenantId, submissionKey), {
    outcome: "submitted",
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, "/v21.0/200002/message_templates");
  assert.equal(
    requests[0].init.headers.authorization,
    "Bearer railway-worker-access-token",
  );
  assert.equal(calls[0][0], "claim");
  assert.deepEqual(calls[1], [
    "submitted",
    [tenantId, submissionKey, "400004", occurredAt],
  ]);
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /railway-worker-access-token|AAECAwQF/,
  );
  assert.equal(telemetryEvents[0].kind, "delivery-attempt");
  assert.equal(telemetryEvents[0].providerRequests[0].provider, "meta");
  assert.equal(
    telemetryEvents[0].providerRequests[0].durationMilliseconds,
    20,
  );
});

test("fails closed for disabled, incomplete, or extended worker configuration", async () => {
  const dependencies = {
    outbox: outboxRepository([]),
    credentials: await encryptedCredentialRepository(),
  };

  assert.throws(
    () => createRailwayMessageTemplateSubmissionWorkerRuntime({
      environment: {},
      ...dependencies,
    }),
    (error) =>
      error instanceof RailwayMessageTemplateSubmissionWorkerRuntimeError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () => createRailwayMessageTemplateSubmissionWorkerRuntime({
      environment: { META_GRAPH_API_VERSION: "v21.0" },
      ...dependencies,
    }),
    (error) =>
      error instanceof RailwayMessageTemplateSubmissionWorkerRuntimeError &&
      error.code === "configuration-incomplete",
  );
  assert.throws(
    () => createRailwayMessageTemplateSubmissionWorkerRuntime({
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      ...dependencies,
      unsupported: true,
    }),
    (error) =>
      error instanceof RailwayMessageTemplateSubmissionWorkerRuntimeError &&
      error.code === "dependencies-invalid",
  );
  assert.throws(
    () => createRailwayMessageTemplateSubmissionWorkerRuntime({
      environment: {
        META_GRAPH_API_VERSION: "v21.0",
        META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      },
      ...dependencies,
      telemetrySink: { async record() {} },
    }),
    (error) =>
      error instanceof RailwayMessageTemplateSubmissionWorkerRuntimeError &&
      error.code === "dependencies-invalid",
  );
});
