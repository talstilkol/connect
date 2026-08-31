import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  createRailwayMessageTemplateProviderRuntime,
  RailwayMessageTemplateProviderRuntimeError,
} from "../server/platform/railwayMessageTemplateProviderRuntime.ts";

const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const tenantId = 7;
const templateKey = `template_v1_${"a".repeat(64)}`;

function draft(overrides = {}) {
  return {
    templateKey,
    tenantId,
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
    createdAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T09:00:00.000Z",
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

function connectedMetaRepository() {
  return {
    async findConnectionByTenantId(requestedTenantId) {
      assert.equal(requestedTenantId, tenantId);
      return {
        tenantId,
        businessPortfolioId: "100001",
        wabaId: "200002",
        phoneNumberId: "300003",
        status: "connected",
        webhookSubscribedAt: "2026-08-21T08:00:00.000Z",
        connectedAt: "2026-08-21T08:00:00.000Z",
        version: 2,
        createdAt: "2026-08-21T08:00:00.000Z",
        updatedAt: "2026-08-21T08:00:00.000Z",
      };
    },
  };
}

function session() {
  return {
    externalUserId: "external-user-id",
    tenantId,
    displayName: "tenant-name",
    status: "active",
    role: "owner",
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
    "railway-provider-access-token",
  );

  return repository;
}

test("composes encrypted PostgreSQL-style credentials with Railway Meta template services", async () => {
  const requests = [];
  let claimedTemplate = null;
  const templates = {
    async findByKey() {
      return draft();
    },
    async claimSubmission(
      requestedTenantId,
      requestedTemplateKey,
      expectedVersion,
      submissionKey,
    ) {
      assert.equal(requestedTenantId, tenantId);
      assert.equal(requestedTemplateKey, templateKey);
      claimedTemplate = draft({
        status: "submitting",
        submissionKey,
        submissionStartedAt: "2026-08-21T09:01:00.000Z",
        version: expectedVersion + 1,
      });
      return claimedTemplate;
    },
    async completeSubmission(
      requestedTenantId,
      requestedTemplateKey,
      submissionKey,
      metaTemplateId,
    ) {
      assert.equal(requestedTenantId, tenantId);
      assert.equal(requestedTemplateKey, templateKey);
      assert.equal(submissionKey, claimedTemplate.submissionKey);
      return draft({
        ...claimedTemplate,
        metaTemplateId,
        status: "pending_review",
        submittedAt: "2026-08-21T09:02:00.000Z",
        version: claimedTemplate.version + 1,
      });
    },
    async releaseSubmission() {
      throw new Error("must-not-run");
    },
    async applyStatusEvent() {
      throw new Error("must-not-run");
    },
    async listByTenant() {
      return [];
    },
  };
  const runtime = createRailwayMessageTemplateProviderRuntime({
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    templates,
    metaConnections: connectedMetaRepository(),
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
  });

  const submitted = await runtime.submission.submit(
    session(),
    templateKey,
  );

  assert.equal(submitted.status, "pending_review");
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url.pathname,
    "/v21.0/200002/message_templates",
  );
  assert.equal(
    requests[0].init.headers.authorization,
    "Bearer railway-provider-access-token",
  );
  assert.doesNotMatch(
    JSON.stringify(runtime),
    /railway-provider-access-token|AAECAwQF/,
  );
});

test("fails closed for disabled, incomplete, or extended provider configuration", () => {
  const dependencies = {
    templates: {
      findByKey() {},
      claimSubmission() {},
      completeSubmission() {},
      releaseSubmission() {},
      applyStatusEvent() {},
      listByTenant() {},
    },
    metaConnections: connectedMetaRepository(),
    credentials: {
      findByTenantId() {},
      store() {},
    },
  };

  assert.throws(
    () =>
      createRailwayMessageTemplateProviderRuntime({
        environment: {},
        ...dependencies,
      }),
    (error) =>
      error instanceof RailwayMessageTemplateProviderRuntimeError &&
      error.code === "configuration-disabled",
  );
  assert.throws(
    () =>
      createRailwayMessageTemplateProviderRuntime({
        environment: { META_GRAPH_API_VERSION: "v21.0" },
        ...dependencies,
      }),
    (error) =>
      error instanceof RailwayMessageTemplateProviderRuntimeError &&
      error.code === "configuration-incomplete",
  );
  assert.throws(
    () =>
      createRailwayMessageTemplateProviderRuntime({
        environment: {
          META_GRAPH_API_VERSION: "v21.0",
          META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
        },
        ...dependencies,
        tenantId,
      }),
    (error) =>
      error instanceof RailwayMessageTemplateProviderRuntimeError &&
      error.code === "dependencies-invalid",
  );
});
