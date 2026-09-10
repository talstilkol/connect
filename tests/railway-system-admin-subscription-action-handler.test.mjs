import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwaySystemAdminSubscriptionActionHandler,
} from "../server/billing/railwaySystemAdminSubscriptionActionHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const oidcToken = "oidcHeader.oidcPayload.oidcSignature";
const userSessionToken = "userHeader.userPayload.userSignature";
const startsAt = "2026-08-01T00:00:00.000Z";
const endsAt = "2026-09-01T00:00:00.000Z";
const newEndsAt = "2026-10-01T00:00:00.000Z";
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
const inputs = Object.freeze({
  create: Object.freeze({
    tenantId: 7,
    status: "active",
    startsAt,
    endsAt,
  }),
  extend: Object.freeze({
    tenantId: 7,
    expectedVersion: 3,
    newEndsAt,
  }),
  changeStatus: Object.freeze({
    tenantId: 7,
    expectedVersion: 3,
    status: "suspended",
  }),
  cancel: Object.freeze({
    tenantId: 7,
    expectedVersion: 3,
  }),
});

function successFor(operation, overrides = {}) {
  const create = operation === "system-admin.subscription.create";
  const cancel = operation === "system-admin.subscription.cancel";
  const statusChange =
    operation === "system-admin.subscription.status.change";

  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      outcome: create ? "created" : "updated",
      subscription: {
        status: cancel
          ? "cancelled"
          : statusChange
            ? "suspended"
            : "active",
        startsAt,
        endsAt:
          operation === "system-admin.subscription.extend" || cancel
            ? newEndsAt
            : endsAt,
        cancelledAt: cancel
          ? "2026-08-20T09:00:00.000Z"
          : null,
        version: create ? 1 : 4,
        createdAt: "2026-08-01T00:00:00.000Z",
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
  responseFor = successFor,
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwaySystemAdminSubscriptionActionHandler({
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

test("sends four bounded mutations with operation-specific deterministic idempotency", async () => {
  const testFixture = fixture();

  for (const operation of [
    "create",
    "extend",
    "changeStatus",
    "cancel",
  ]) {
    const result = await testFixture.handler[operation](inputs[operation]);
    assert.equal(result.status, "saved");
  }

  const expectedRequests = [
    {
      operation: "system-admin.subscription.create",
      payload: {
        targetTenantId: 7,
        status: "active",
        startsAt,
        endsAt,
      },
    },
    {
      operation: "system-admin.subscription.extend",
      payload: {
        targetTenantId: 7,
        expectedVersion: 3,
        newEndsAt,
      },
    },
    {
      operation: "system-admin.subscription.status.change",
      payload: {
        targetTenantId: 7,
        expectedVersion: 3,
        status: "suspended",
      },
    },
    {
      operation: "system-admin.subscription.cancel",
      payload: {
        targetTenantId: 7,
        expectedVersion: 3,
      },
    },
  ];

  assert.equal(testFixture.calls.requests.length, expectedRequests.length);
  for (const [index, expected] of expectedRequests.entries()) {
    const request = testFixture.calls.requests[index];
    assert.equal(request.operation, expected.operation);
    assert.equal(request.requestKind, "mutation");
    assert.deepEqual(request.payload, expected.payload);
    assert.equal(
      request.idempotencyKey,
      await deriveRailwayApiDeterministicIdempotencyKey(
        expected.operation,
        expected.payload,
      ),
    );
    assert.doesNotMatch(
      JSON.stringify(request),
      /actorExternalUserId|occurredAt|databaseUrl/,
    );
  }
  assert.deepEqual(testFixture.calls.clientConfigurations, [
    {
      apiOrigin: "https://connect-api.up.railway.app",
      deploymentEnvironment: "production",
      oidcToken,
      userSessionToken,
    },
    {
      apiOrigin: "https://connect-api.up.railway.app",
      deploymentEnvironment: "production",
      oidcToken,
      userSessionToken,
    },
    {
      apiOrigin: "https://connect-api.up.railway.app",
      deploymentEnvironment: "production",
      oidcToken,
      userSessionToken,
    },
    {
      apiOrigin: "https://connect-api.up.railway.app",
      deploymentEnvironment: "production",
      oidcToken,
      userSessionToken,
    },
  ]);
});

test("stops before identity when application, Railway configuration or input is invalid", async () => {
  const disabled = fixture({ applicationConfigured: false });
  const incomplete = fixture({
    configurationState: {
      status: "incomplete",
      missingKeys: ["RAILWAY_API_ORIGIN"],
      invalidKeys: [],
      configuration: null,
    },
  });
  const malformed = fixture();

  assert.deepEqual(await disabled.handler.create(inputs.create), {
    status: "configuration-required",
  });
  assert.deepEqual(await incomplete.handler.create(inputs.create), {
    status: "configuration-required",
  });
  assert.deepEqual(
    await malformed.handler.cancel({
      ...inputs.cancel,
      actorExternalUserId: "forged-admin",
    }),
    { status: "invalid-input" },
  );
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(malformed.calls.identities, 0);
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

  assert.deepEqual(await signedOut.handler.cancel(inputs.cancel), {
    status: "unauthenticated",
  });
  assert.deepEqual(await unavailable.handler.cancel(inputs.cancel), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.cancel(inputs.cancel), {
    status: "server-error",
  });
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps every actionable Railway failure to the existing subscription UI contract", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["INVALID_REQUEST", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "conflict"],
    ["INVALID_TRANSITION", "invalid-transition"],
    ["RATE_LIMITED", "server-error"],
    ["SERVICE_AUTHENTICATION_REQUIRED", "server-error"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
    ["SERVER_ERROR", "server-error"],
  ];

  for (const [code, status] of scenarios) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });

    assert.deepEqual(await testFixture.handler.cancel(inputs.cancel), {
      status,
    });
  }
});

test("rejects malformed, cross-operation and internally extended success payloads", async () => {
  const invalidResponses = [
    successFor("system-admin.subscription.extend", {
      data: {
        ...successFor("system-admin.subscription.extend").data,
        subscription: {
          ...successFor("system-admin.subscription.extend").data.subscription,
          version: 3,
        },
      },
    }),
    successFor("system-admin.subscription.extend", {
      data: {
        ...successFor("system-admin.subscription.extend").data,
        subscription: {
          ...successFor("system-admin.subscription.extend").data.subscription,
          endsAt,
        },
      },
    }),
    successFor("system-admin.subscription.extend", {
      data: {
        ...successFor("system-admin.subscription.extend").data,
        subscription: {
          ...successFor("system-admin.subscription.extend").data.subscription,
          tenantId: 7,
        },
      },
    }),
    successFor("system-admin.subscription.extend", {
      data: {
        ...successFor("system-admin.subscription.extend").data,
        subscription: {
          ...successFor("system-admin.subscription.extend").data.subscription,
          updatedAt: "not-a-timestamp",
        },
      },
    }),
  ];

  for (const response of invalidResponses) {
    const testFixture = fixture({ responseFor: () => response });
    assert.deepEqual(await testFixture.handler.extend(inputs.extend), {
      status: "server-error",
    });
  }
});

test("sanitizes client construction and network failures", async () => {
  const failedCall = fixture({
    clientError: new Error("private Railway address"),
  });
  const failedCreation = createRailwaySystemAdminSubscriptionActionHandler({
    applicationConfigured: () => true,
    inspectConfiguration: () => configuredState,
    resolveIdentity: async () => authenticatedState,
    createClient() {
      throw new Error("private client configuration");
    },
  });

  assert.deepEqual(await failedCall.handler.cancel(inputs.cancel), {
    status: "server-error",
  });
  assert.deepEqual(await failedCreation.cancel(inputs.cancel), {
    status: "server-error",
  });
});

test("rejects extended action handler dependencies", () => {
  assert.throws(
    () =>
      createRailwaySystemAdminSubscriptionActionHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
