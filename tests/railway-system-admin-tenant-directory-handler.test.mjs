import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwaySystemAdminTenantDirectoryHandler,
} from "../server/admin/railwaySystemAdminTenantDirectoryHandler.ts";

const operationId = "system-admin.tenant-directory.list";
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
  afterTenantId: null,
  search: " Connect ",
  tenantStatus: "active",
  subscription: "with-subscription",
});

function tenant(overrides = {}) {
  return {
    targetTenantId: 19,
    displayName: "Connect Support",
    tenantStatus: "active",
    businessProfile: {
      businessName: "Connect Support",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 2,
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
    subscription: {
      status: "active",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-10-01T00:00:00.000Z",
      cancelledAt: null,
      version: 2,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
    ...overrides,
  };
}

function success(tenants = [tenant()], nextCursor = null) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      directory: {
        tenants,
        nextCursor,
      },
    },
  };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  identityError = null,
  clientError = null,
  responseFor = () => success(),
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwaySystemAdminTenantDirectoryHandler({
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
          return responseFor(request);
        },
      };
    },
  });

  return { calls, handler };
}

test("sends one normalized bounded query and maps target tenant aliases", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.load(input);

  assert.equal(result.status, "loaded");
  assert.equal(result.directory.tenants[0].tenantId, 19);
  assert.equal(result.directory.tenants[0].displayName, "Connect Support");
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "query",
    idempotencyKey: null,
    payload: {
      afterTenantId: null,
      search: "connect",
      tenantStatus: "active",
      subscription: "with-subscription",
    },
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /externalUserId|actorExternalUserId/,
  );
});

test("loads the initial directory through the same Railway query", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.read();

  assert.equal(result.status, "ready");
  assert.equal(result.directory.tenants[0].tenantId, 19);
  assert.deepEqual(testFixture.calls.requests[0].payload, {
    afterTenantId: null,
    search: "",
    tenantStatus: "all",
    subscription: "all",
  });
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
    directory: { tenants: [], nextCursor: null },
  });
  assert.deepEqual(await incomplete.handler.load(input), {
    status: "configuration-required",
  });
  assert.deepEqual(
    await invalid.handler.load({
      ...input,
      externalUserId: "forged-admin",
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

  assert.deepEqual(await signedOut.handler.load(input), {
    status: "unauthenticated",
  });
  assert.deepEqual(await unavailable.handler.load(input), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.load(input), {
    status: "server-error",
  });
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps Railway authentication, authorization, validation and dependency failures", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["INVALID_REQUEST", "invalid-input"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
  ];

  for (const [code, status] of scenarios) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.load(input), { status });
  }
});

test("rejects malformed, mismatched, unordered, and extended directory responses", async () => {
  const invalidResponses = [
    success([{ ...tenant(), tenantId: 19, targetTenantId: undefined }]),
    success([tenant({ displayName: "Different Business" })]),
    success([tenant({ targetTenantId: 20 }), tenant({ targetTenantId: 19 })]),
    success([tenant()], 19),
    success([tenant({
      businessProfile: {
        ...tenant().businessProfile,
        internalVersion: 2,
      },
    })]),
    success([tenant({
      subscription: {
        ...tenant().subscription,
        status: "suspended",
      },
    })]),
  ];

  for (const response of invalidResponses) {
    const testFixture = fixture({ responseFor: () => response });
    assert.deepEqual(await testFixture.handler.load(input), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects extended dependencies", async () => {
  const failed = fixture({
    clientError: new Error("private Railway address"),
  });
  assert.deepEqual(await failed.handler.load(input), {
    status: "server-error",
  });

  assert.throws(
    () =>
      createRailwaySystemAdminTenantDirectoryHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
