import assert from "node:assert/strict";
import test from "node:test";

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
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  responseFor = () => success(),
  clientError = null,
} = {}) {
  const calls = { configurations: 0, identities: 0, requests: [] };
  const handler = createRailwayMessageTemplateSubmissionHandler({
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
