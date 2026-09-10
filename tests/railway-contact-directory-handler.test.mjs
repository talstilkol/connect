import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayContactDirectoryHandler,
} from "../server/contacts/railwayContactDirectoryHandler.ts";

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

function contact(id = 23, overrides = {}) {
  return {
    id,
    phoneNumber: `+972500000${String(id).padStart(3, "0")}`,
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    consentSource: "website",
    consentRecordedAt: "2026-08-17T10:00:00.000Z",
    consentWithdrawnAt: null,
    version: 4,
    ...overrides,
  };
}

function page(overrides = {}) {
  return {
    contacts: [contact()],
    nextCursor: null,
    organization: {
      scopeContactIds: [23],
      tags: [{ id: 5, name: "Customers", contactCount: 1 }],
      lists: [{ id: 8, name: "August", contactCount: 1 }],
      tagAssignments: [{ contactId: 23, tagId: 5 }],
      listMemberships: [{ contactId: 23, listId: 8 }],
    },
    ...overrides,
  };
}

function success(data = page()) {
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
  const handler = createRailwayContactDirectoryHandler({
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

test("loads one bounded contact page through Railway without tenant identity", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.load(51);

  assert.deepEqual(result, {
    status: "loaded",
    ...page(),
  });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.list",
    requestKind: "query",
    idempotencyKey: null,
    payload: { beforeContactId: 51 },
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("loads the initial directory with an explicit null cursor", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.read();

  assert.equal(result.status, "ready");
  assert.deepEqual(result.contacts, page().contacts);
  assert.equal(testFixture.calls.requests[0].payload.beforeContactId, null);
});

test("stops before identity for unavailable configuration and invalid cursors", async () => {
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

  assert.equal((await disabled.handler.read()).status, "configuration-required");
  assert.deepEqual(await incomplete.handler.load(51), {
    status: "configuration-required",
  });
  assert.deepEqual(await invalid.handler.load("51"), {
    status: "validation-error",
  });
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

  assert.deepEqual(await signedOut.handler.load(null), {
    status: "unauthenticated",
  });
  assert.deepEqual(await unavailable.handler.load(null), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.load(null), {
    status: "server-error",
  });
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps every tenant-session failure without collapsing action recovery states", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["INVALID_REQUEST", "validation-error"],
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

    assert.deepEqual(await testFixture.handler.load(null), { status });
  }
});

test("rejects extended, inconsistent, cross-scope, and unordered responses", async () => {
  const invalidPages = [
    page({ internalTenantId: 7 }),
    page({ contacts: [contact(23), contact(24)] }),
    page({ organization: { ...page().organization, scopeContactIds: [24] } }),
    page({ organization: {
      ...page().organization,
      tags: [
        { id: 5, name: "Customers", contactCount: 1 },
        { id: 5, name: "Duplicate", contactCount: 0 },
      ],
    } }),
    page({ organization: {
      ...page().organization,
      tagAssignments: [{ contactId: 23, tagId: 99 }],
    } }),
    page({ contacts: [contact(23, { firstName: " Tal " })] }),
    page({ contacts: [contact(23, { consentRecordedAt: "invalid" })] }),
    page({ nextCursor: 23 }),
  ];

  for (const invalidPage of invalidPages) {
    const testFixture = fixture({
      responseFor: () => success(invalidPage),
    });

    assert.deepEqual(await testFixture.handler.load(null), {
      status: "server-error",
    });
  }
});

test("accepts a full page only when its cursor equals the final contact", async () => {
  const contacts = Array.from(
    { length: 50 },
    (_, index) => contact(100 - index),
  );
  const data = page({
    contacts,
    nextCursor: 51,
    organization: {
      scopeContactIds: contacts.map(({ id }) => id),
      tags: [],
      lists: [],
      tagAssignments: [],
      listMemberships: [],
    },
  });
  const testFixture = fixture({ responseFor: () => success(data) });

  assert.equal((await testFixture.handler.load(null)).status, "loaded");
});

test("sanitizes client failures and rejects missing or extended dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.load(null), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayContactDirectoryHandler(null),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createRailwayContactDirectoryHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
