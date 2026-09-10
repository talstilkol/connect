import assert from "node:assert/strict";
import test from "node:test";
import { createRailwayMessageTemplateSyncHandler } from "../server/templates/railwayMessageTemplateSyncHandler.ts";

import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayMessageTemplateSubmissionHandler,
} from "../server/templates/railwayMessageTemplateSubmissionHandler.ts";

const templateKey = `template_v1_${"a".repeat(64)}`;
const submissionKey = `template_submission_v1_${"b".repeat(64)}`;
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

function success(data = {
  replayed: false,
  submissionKey,
  status: "pending",
}) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data,
  };
}

function fixture({
  handlerFactory = createRailwayMessageTemplateSubmissionHandler,
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  responseFor = () => success(),
  clientError = null,
} = {}) {
  const calls = { configurations: 0, identities: 0, requests: [] };
  const handler = handlerFactory({
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

test("stages one deterministic Railway submission request", async () => {
  const testFixture = fixture();
  const expectedIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "templates.submit",
      { templateKey, expectedVersion: 1 },
    );

  assert.deepEqual(await testFixture.handler.submit(templateKey, 1), {
    status: "submission-staged",
    submissionKey,
  });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "templates.submit",
    requestKind: "mutation",
    idempotencyKey: expectedIdempotencyKey,
    payload: { templateKey, expectedVersion: 1 },
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|accessToken|wabaId/,
  );
});

test("sync handler preserves request identity and parses only a bounded atomic response", async () => {
  const requestedAt = new Date().toISOString();
  const state = { templates: [], summary: { received: 0, eligible: 0, updated: 0,
    unchanged: 0, stale: 0, unmatched: 0, unsupported: 0, observedAt: requestedAt } };
  const f = fixture({ handlerFactory: createRailwayMessageTemplateSyncHandler,
    responseFor: () => success({ ...state, replayed: false }) });
  assert.deepEqual(await f.handler.sync(requestedAt), { status: "synced", ...state });
  await f.handler.sync(requestedAt);
  assert.equal(f.calls.requests[0].operation, "templates.sync");
  assert.equal(f.calls.requests[0].idempotencyKey, f.calls.requests[1].idempotencyKey);
  assert.deepEqual(f.calls.requests[0].payload, { requestedAt });
  for (const data of [
    { ...state, replayed: "false" },
    { ...state, replayed: false, accessToken: "forbidden" },
    { ...state, replayed: false, summary: { ...state.summary, updated: 1 } },
    { ...state, replayed: false, summary: { ...state.summary, observedAt: "invalid" } },
  ]) {
    const invalid = fixture({ handlerFactory: createRailwayMessageTemplateSyncHandler, responseFor: () => success(data) });
    assert.equal((await invalid.handler.sync(requestedAt)).status, "server-error");
  }
});

test("sync handler fails closed before API access and maps configuration and authorization failures", async () => {
  const requestedAt = new Date().toISOString();
  const unauthenticated = fixture({ handlerFactory: createRailwayMessageTemplateSyncHandler,
    identityState: { status: "unauthenticated" } });
  assert.equal((await unauthenticated.handler.sync(requestedAt)).status, "unauthenticated");
  assert.equal(unauthenticated.calls.requests.length, 0);
  const invalid = fixture({ handlerFactory: createRailwayMessageTemplateSyncHandler });
  assert.equal((await invalid.handler.sync("invalid")).status, "sync-failed");
  assert.equal(invalid.calls.identities, 0);
  for (const [code, status] of [["CONFIGURATION_REQUIRED", "meta-configuration-required"],
    ["STALE_SESSION", "permission-denied"], ["RATE_LIMITED", "sync-failed"]]) {
    const f = fixture({ handlerFactory: createRailwayMessageTemplateSyncHandler,
      responseFor: () => ({ contractVersion: "connect.railway-api.v1", outcome: "error", code }) });
    assert.equal((await f.handler.sync(requestedAt)).status, status);
  }
});

test("stops invalid input and missing configuration before identity", async () => {
  const invalid = fixture();
  const disabled = fixture({ applicationConfigured: false });

  assert.deepEqual(await invalid.handler.submit("invalid"), {
    status: "invalid-input",
  });
  assert.deepEqual(await disabled.handler.submit(templateKey, 1), {
    status: "configuration-required",
  });
  assert.equal(invalid.calls.identities, 0);
  assert.equal(disabled.calls.configurations, 0);
});

test("separates revised drafts while replaying the same version deterministically", async () => {
  const testFixture = fixture();
  for (const version of [1, 1, 2]) {
    await testFixture.handler.submit(templateKey, version);
  }
  const keys = testFixture.calls.requests.map((request) => request.idempotencyKey);
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);

  for (const version of [undefined, null, "1", 0, -1, 1.5, Infinity]) {
    const invalid = fixture();
    assert.deepEqual(await invalid.handler.submit(templateKey, version), {
      status: "invalid-input",
    });
    assert.equal(invalid.calls.identities, 0);
    assert.equal(invalid.calls.requests.length, 0);
  }
});

test("maps bounded API failures and rejects malformed success payloads", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["INVALID_TRANSITION", "not-editable"],
    ["CONFLICT", "state-conflict"],
    ["CONFIGURATION_REQUIRED", "meta-configuration-required"],
    ["RATE_LIMITED", "server-error"],
  ]) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.submit(templateKey, 1), { status });
  }

  for (const responseFor of [
    () => success({ replayed: false, submissionKey: "invalid", status: "pending" }),
    () => success({ replayed: false, submissionKey, status: "submitted" }),
    () => success({ replayed: "false", submissionKey, status: "pending" }),
    () => success({ replayed: false, submissionKey, status: "pending", tenantId: 7 }),
  ]) {
    assert.deepEqual(
      await fixture({ responseFor }).handler.submit(templateKey, 1),
      { status: "server-error" },
    );
  }
});

test("sanitizes client failures and rejects fallback dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });
  assert.deepEqual(await failed.handler.submit(templateKey, 1), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayMessageTemplateSubmissionHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});

test("blocks an unauthenticated submission before any API request", async () => {
  const testFixture = fixture({ identityState: { status: "unauthenticated" } });
  assert.deepEqual(await testFixture.handler.submit(templateKey, 1), {
    status: "unauthenticated",
  });
  assert.equal(testFixture.calls.requests.length, 0);
});
