import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwaySystemAdminBusinessProfileActionHandler,
} from "../server/admin/railwaySystemAdminBusinessProfileActionHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const operationId =
  "system-admin.business-profile.update";
const oidcToken =
  "oidcHeader.oidcPayload.oidcSignature";
const userSessionToken =
  "userHeader.userPayload.userSignature";
const configuredState = Object.freeze({
  status: "configured",
  missingKeys: [],
  invalidKeys: [],
  configuration: Object.freeze({
    apiOrigin:
      "https://connect-api.up.railway.app",
    deploymentEnvironment: "production",
  }),
});
const authenticatedState = Object.freeze({
  status: "authenticated",
  oidcToken,
  userSessionToken,
});
const validInput = Object.freeze({
  tenantId: 7,
  expectedVersion: 3,
  businessName: " Connect Operations ",
  timezone: " Asia/Jerusalem ",
  interfaceLanguage: "he",
});

function railwaySuccess(overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      outcome: "updated",
      profile: {
        businessName: "Connect Operations",
        timezone: "Asia/Jerusalem",
        interfaceLanguage: "he",
        version: 4,
        createdAt: "2026-08-01T09:00:00.000Z",
        updatedAt: "2026-08-20T09:00:00.000Z",
      },
    },
    ...overrides,
  };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  identityError = null,
  clientError = null,
  response = railwaySuccess(),
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler =
    createRailwaySystemAdminBusinessProfileActionHandler({
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
            return response;
          },
        };
      },
    });

  return { calls, handler };
}

test("sends one normalized bounded mutation with deterministic idempotency", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.update(validInput);

  assert.deepEqual(result, {
    status: "saved",
    outcome: "updated",
    profile: {
      businessName: "Connect Operations",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 4,
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
  });
  assert.equal(testFixture.calls.requests.length, 1);
  const [request] = testFixture.calls.requests;
  const expectedPayload = {
    targetTenantId: 7,
    expectedVersion: 3,
    businessName: "Connect Operations",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };

  assert.deepEqual(request.payload, expectedPayload);
  assert.equal(request.operation, operationId);
  assert.equal(request.requestKind, "mutation");
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      expectedPayload,
    ),
  );
  assert.deepEqual(testFixture.calls.clientConfigurations, [
    {
      apiOrigin:
        "https://connect-api.up.railway.app",
      deploymentEnvironment: "production",
      oidcToken,
      userSessionToken,
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(request),
    /actorExternalUserId|occurredAt|previousProfileDigest|newProfileDigest/,
  );
});

test("stops before identity when configuration or input is invalid", async () => {
  const disabled = fixture({
    applicationConfigured: false,
  });
  const incomplete = fixture({
    configurationState: {
      status: "incomplete",
      missingKeys: ["RAILWAY_API_ORIGIN"],
      invalidKeys: [],
      configuration: null,
    },
  });
  const malformed = fixture();

  assert.deepEqual(
    await disabled.handler.update(validInput),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await incomplete.handler.update(validInput),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await malformed.handler.update({
      ...validInput,
      actorExternalUserId: "forged-admin",
    }),
    { status: "invalid-input" },
  );
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(disabled.calls.identities, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(malformed.calls.identities, 0);
  assert.deepEqual(malformed.calls.requests, []);
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

  assert.deepEqual(
    await signedOut.handler.update(validInput),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await unavailable.handler.update(validInput),
    { status: "server-error" },
  );
  assert.deepEqual(
    await failed.handler.update(validInput),
    { status: "server-error" },
  );
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps every actionable Railway failure to the existing UI contract", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["INVALID_REQUEST", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "server-error"],
    ["SERVICE_AUTHENTICATION_REQUIRED", "server-error"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
    ["SERVER_ERROR", "server-error"],
  ];

  for (const [code, status] of scenarios) {
    const testFixture = fixture({
      response: {
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      },
    });

    assert.deepEqual(
      await testFixture.handler.update(validInput),
      { status },
    );
  }
});

test("rejects malformed or mismatched Railway success without updating React state", async () => {
  const invalidResponses = [
    railwaySuccess({
      data: {
        outcome: "updated",
        profile: {
          ...railwaySuccess().data.profile,
          version: 3,
        },
      },
    }),
    railwaySuccess({
      data: {
        outcome: "updated",
        profile: {
          ...railwaySuccess().data.profile,
          businessName: "Another Business",
        },
      },
    }),
    railwaySuccess({
      data: {
        outcome: "updated",
        profile: {
          ...railwaySuccess().data.profile,
          updatedAt: "not-a-timestamp",
        },
      },
    }),
    railwaySuccess({
      data: {
        outcome: "updated",
        profile: {
          ...railwaySuccess().data.profile,
          tenantId: 7,
        },
      },
    }),
  ];

  for (const response of invalidResponses) {
    const testFixture = fixture({ response });

    assert.deepEqual(
      await testFixture.handler.update(validInput),
      { status: "server-error" },
    );
  }
});

test("sanitizes client construction and network failures", async () => {
  const failedCall = fixture({
    clientError: new Error("private Railway address"),
  });
  const failedCreationCalls = [];
  const failedCreation =
    createRailwaySystemAdminBusinessProfileActionHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient(configuration) {
        failedCreationCalls.push(configuration);
        throw new Error("private client configuration");
      },
    });

  assert.deepEqual(
    await failedCall.handler.update(validInput),
    { status: "server-error" },
  );
  assert.deepEqual(
    await failedCreation.update(validInput),
    { status: "server-error" },
  );
  assert.equal(failedCreationCalls.length, 1);
});

test("rejects extended action handler dependencies", () => {
  assert.throws(
    () =>
      createRailwaySystemAdminBusinessProfileActionHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
