import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwaySystemAdminProductionDecisionHandler,
} from "../server/operations/railwaySystemAdminProductionDecisionHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const listOperationId = "system-admin.production-decisions.list";
const saveOperationId = "system-admin.production-decisions.save";
const oidcToken = "oidcHeader.oidcPayload.oidcSignature";
const userSessionToken = "userHeader.userPayload.userSignature";
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
  oidcToken,
  userSessionToken,
});
const input = Object.freeze({
  checkId: "ai.provider",
  expectedVersion: 0,
  selection: " Provider choice approved ",
  rationale:
    " The decision passed product and security review. ",
});

function record(overrides = {}) {
  return {
    checkId: "ai.provider",
    selection: "Provider choice approved",
    rationale:
      "The decision passed product and security review.",
    version: 1,
    decidedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
    ...overrides,
  };
}

function successFor(operation) {
  return operation === listOperationId
    ? {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: { records: [record()] },
      }
    : {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          outcome: "created",
          record: record(),
        },
      };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  identityError = null,
  clientError = null,
  responseFor = successFor,
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwaySystemAdminProductionDecisionHandler({
    applicationConfigured() {
      return applicationConfigured;
    },
    inspectConfiguration() {
      calls.configurations += 1;
      return configurationState;
    },
    async resolveIdentity() {
      calls.identities += 1;
      if (identityError) throw identityError;
      return identityState;
    },
    createClient(configuration) {
      calls.clientConfigurations.push(configuration);
      return {
        async call(request) {
          calls.requests.push(request);
          if (clientError) throw clientError;
          return responseFor(request.operation);
        },
      };
    },
  });

  return { calls, handler };
}

test("sends one bounded query and one normalized deterministic mutation", async () => {
  const testFixture = fixture();
  const readResult = await testFixture.handler.read();
  const saveResult = await testFixture.handler.save(input);

  assert.deepEqual(readResult, {
    status: "ready",
    records: [record()],
  });
  assert.deepEqual(saveResult, {
    status: "saved",
    outcome: "created",
    record: record(),
  });
  assert.equal(testFixture.calls.requests.length, 2);
  assert.deepEqual(testFixture.calls.requests[0], {
    contractVersion: "connect.railway-api.v1",
    operation: listOperationId,
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
  });
  const saveRequest = testFixture.calls.requests[1];
  const expectedPayload = {
    checkId: "ai.provider",
    expectedVersion: 0,
    selection: "Provider choice approved",
    rationale:
      "The decision passed product and security review.",
  };
  assert.deepEqual(saveRequest.payload, expectedPayload);
  assert.equal(saveRequest.operation, saveOperationId);
  assert.equal(
    saveRequest.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      saveOperationId,
      expectedPayload,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /actorExternalUserId|occurredAt|lastEventKey/,
  );
});

test("stops before identity for unavailable configuration and invalid input", async () => {
  const disabled = fixture({ applicationConfigured: false });
  const incomplete = fixture({
    configurationState: {
      status: "incomplete",
      missingKeys: ["RAILWAY_API_ORIGIN"],
      invalidKeys: [],
      configuration: null,
    },
  });
  const invalid = fixture();

  assert.deepEqual(await disabled.handler.read(), {
    status: "configuration-required",
    records: [],
  });
  assert.deepEqual(await incomplete.handler.save(input), {
    status: "configuration-required",
  });
  assert.deepEqual(
    await invalid.handler.save({
      ...input,
      actorExternalUserId: "forged-admin",
    }),
    { status: "invalid-input" },
  );
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(invalid.calls.identities, 0);
});

test("separates signed-out identity from unavailable identity dependencies", async () => {
  const signedOut = fixture({
    identityState: {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  const unavailable = fixture({
    identityState: {
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  const failed = fixture({
    identityError: new Error("private identity failure"),
  });

  assert.deepEqual(await signedOut.handler.read(), {
    status: "unauthenticated",
    records: [],
  });
  assert.deepEqual(await unavailable.handler.save(input), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.save(input), {
    status: "server-error",
  });
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps Railway authentication, authorization, validation and conflict failures", async () => {
  const readScenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
  ];
  for (const [code, status] of readScenarios) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.read(), {
      status,
      records: [],
    });
  }

  const saveScenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["INVALID_REQUEST", "invalid-input"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "server-error"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
  ];
  for (const [code, status] of saveScenarios) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.save(input), { status });
  }
});

test("rejects malformed, duplicate and internally extended list responses", async () => {
  const invalidResponses = [
    { records: [record({ updatedAt: "2026-08-20T09:01:00.000Z" })] },
    { records: [record(), record()] },
    { records: [record({ lastEventKey: `production_decision_event_v1_${"a".repeat(64)}` })] },
    { records: [record({ checkId: "unknown.decision" })] },
  ];

  for (const data of invalidResponses) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data,
      }),
    });
    assert.deepEqual(await testFixture.handler.read(), {
      status: "server-error",
      records: [],
    });
  }
});

test("rejects mismatched save responses before updating React state", async () => {
  const invalidRecords = [
    record({ version: 2 }),
    record({ checkId: "billing.provider" }),
    record({ selection: "Another selection" }),
    record({ decidedByExternalUserId: "private-admin" }),
  ];

  for (const invalidRecord of invalidRecords) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          outcome: "created",
          record: invalidRecord,
        },
      }),
    });
    assert.deepEqual(await testFixture.handler.save(input), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects extended dependencies", async () => {
  const failed = fixture({
    clientError: new Error("private Railway address"),
  });
  assert.deepEqual(await failed.handler.read(), {
    status: "server-error",
    records: [],
  });

  assert.throws(
    () =>
      createRailwaySystemAdminProductionDecisionHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
