import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayMessageTemplateDirectoryHandler } from "../server/templates/railwayMessageTemplateDirectoryHandler.ts";
import { deriveMessageTemplateKey } from "../server/templates/messageTemplateKey.ts";

const configuredState = Object.freeze({
  status: "configured",
  missingKeys: [],
  invalidKeys: [],
  configuration: Object.freeze({
    apiOrigin: "https://connect-api.up.railway.app",
    deploymentEnvironment: "production",
  }),
});
const authenticatedState = Object.freeze({
  status: "authenticated",
  oidcToken: "oidcHeader.oidcPayload.oidcSignature",
  userSessionToken: "userHeader.userPayload.userSignature",
});
const draft = Object.freeze({
  name: "service_update",
  category: "UTILITY",
  language: "he",
  header: "",
  body: "שלום {{1}}",
  footer: "",
  variableExamples: Object.freeze({ 1: "טל" }),
  buttonMode: "none",
  quickReplies: Object.freeze([]),
  urlButton: Object.freeze({
    enabled: false,
    mode: "static",
    text: "",
    value: "",
    example: "",
  }),
  phoneButton: Object.freeze({
    enabled: false,
    text: "",
    value: "",
  }),
});
const template = Object.freeze({
  templateKey: await deriveMessageTemplateKey(7, draft.name, draft.language),
  ...draft,
  status: "draft",
  submittedAt: null,
  reviewedAt: null,
  updatedAt: "2026-08-21T08:00:00.000Z",
});

function success(templates = [template], canWrite = true) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: { templates, canWrite },
  };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  responseFor = () => success(),
  clientError = null,
} = {}) {
  const calls = { configurations: 0, identities: 0, requests: [] };
  const handler = createRailwayMessageTemplateDirectoryHandler({
    applicationConfigured() {
      return applicationConfigured;
    },
    inspectConfiguration() {
      calls.configurations += 1;
      return configurationState;
    },
    async resolveIdentity() {
      calls.identities += 1;
      return identityState;
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (clientError) throw clientError;
          return responseFor(request);
        },
      };
    },
  });

  return { calls, handler };
}

test("reads an ordered bounded directory through Railway", async () => {
  const testFixture = fixture();

  assert.deepEqual(await testFixture.handler.read(), {
    status: "ready",
    templates: [template],
    canWrite: true,
  });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "templates.list",
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
  }]);
});

test("maps configuration and identity failures without API access", async () => {
  const disabled = fixture({ applicationConfigured: false });
  const unauthenticated = fixture({
    identityState: { status: "unauthenticated" },
  });

  assert.deepEqual(await disabled.handler.read(), {
    status: "configuration-required",
    templates: [],
    canWrite: false,
  });
  assert.deepEqual(await unauthenticated.handler.read(), {
    status: "server-error",
    templates: [],
    canWrite: false,
  });
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(unauthenticated.calls.requests.length, 0);
});

test("maps bounded API failures", async () => {
  for (const [code, status] of [
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
  ]) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });

    assert.deepEqual(await testFixture.handler.read(), {
      status,
      templates: [],
      canWrite: false,
    });
  }
});

test("rejects malformed, duplicate, and incorrectly ordered responses", async () => {
  const older = {
    ...template,
    templateKey: `template_v1_${"f".repeat(64)}`,
    name: "older_update",
    updatedAt: "2026-08-21T07:00:00.000Z",
  };
  const invalidResponses = [
    () => success([{ ...template, tenantId: 7 }]),
    () => success([{ ...template, status: "approved" }]),
    () => success([template, template]),
    () => success([older, template]),
    () => ({
      contractVersion: "connect.railway-api.v1",
      outcome: "ok",
      data: { templates: [template], canWrite: "true" },
    }),
  ];

  for (const responseFor of invalidResponses) {
    assert.deepEqual(await fixture({ responseFor }).handler.read(), {
      status: "server-error",
      templates: [],
      canWrite: false,
    });
  }
});

test("sanitizes client failures and rejects fallback dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.read(), {
    status: "server-error",
    templates: [],
    canWrite: false,
  });
  assert.throws(
    () => createRailwayMessageTemplateDirectoryHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
