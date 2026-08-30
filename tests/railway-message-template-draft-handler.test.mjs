import assert from "node:assert/strict";
import test from "node:test";

import { deriveRailwayApiDeterministicIdempotencyKey } from "../server/platform/railwayApiMutationExecutor.ts";
import { createRailwayMessageTemplateDraftHandler } from "../server/templates/railwayMessageTemplateDraftHandler.ts";
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

function success(responseTemplate = template, replayed = false) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: { replayed, template: responseTemplate },
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
  const handler = createRailwayMessageTemplateDraftHandler({
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

test("saves a draft through one deterministic Railway request", async () => {
  const testFixture = fixture();
  const saved = await testFixture.handler.save(draft);
  const expectedKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "templates.draft.save",
    draft,
  );

  assert.deepEqual(saved, { status: "saved", template });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "templates.draft.save",
    requestKind: "mutation",
    idempotencyKey: expectedKey,
    payload: draft,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("stops unsafe input and missing configuration before identity", async () => {
  const invalid = fixture();
  const disabled = fixture({ applicationConfigured: false });

  assert.deepEqual(await invalid.handler.save({ ...draft, tenantId: 7 }), {
    status: "validation-error",
    issues: ["invalid-input"],
  });
  assert.deepEqual(await disabled.handler.save(draft), {
    status: "configuration-required",
  });
  assert.equal(invalid.calls.identities, 0);
  assert.equal(disabled.calls.configurations, 0);
});

test("maps bounded failures and rejects malformed success payloads", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["INVALID_TRANSITION", "not-editable"],
    ["CONFLICT", "server-error"],
    ["RATE_LIMITED", "server-error"],
  ]) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });

    assert.deepEqual(await testFixture.handler.save(draft), { status });
  }

  for (const responseFor of [
    () => success({ ...template, tenantId: 7 }),
    () => success({ ...template, status: "approved" }),
    () => ({
      contractVersion: "connect.railway-api.v1",
      outcome: "ok",
      data: { replayed: "false", template },
    }),
  ]) {
    assert.deepEqual(await fixture({ responseFor }).handler.save(draft), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects fallback dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.save(draft), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayMessageTemplateDraftHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
