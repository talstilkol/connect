import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayContactOrganizationHandler,
} from "../server/contacts/railwayContactOrganizationHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

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

function organization(contactIds = [], overrides = {}) {
  return {
    scopeContactIds: contactIds,
    tags: [],
    lists: [],
    tagAssignments: [],
    listMemberships: [],
    ...overrides,
  };
}

function success(snapshot, replayed = false) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: { replayed, organization: snapshot },
  };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  identityError = null,
  clientError = null,
  responseFor = (request) => success(
    organization(
      "contactId" in request.payload
        ? [request.payload.contactId]
        : [],
    ),
  ),
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwayContactOrganizationHandler({
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

test("normalizes a tag and derives the exact deterministic request", async () => {
  const snapshot = organization([], {
    tags: [{ id: 5, name: "Priority", contactCount: 0 }],
  });
  const testFixture = fixture({
    responseFor: () => success(snapshot),
  });
  const saved = await testFixture.handler.saveTag("  Priority  ");
  const payload = { name: "Priority" };
  const expectedKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "contacts.organization.tag.save",
    payload,
  );

  assert.deepEqual(saved, { status: "saved", organization: snapshot });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.organization.tag.save",
    requestKind: "mutation",
    idempotencyKey: expectedKey,
    payload,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("keeps list and relationship operations separate", async () => {
  const testFixture = fixture();

  await testFixture.handler.saveList("Pilot");
  await testFixture.handler.setTagAssignment({
    contactId: 23,
    groupId: 5,
    assigned: true,
  });
  await testFixture.handler.setListMembership({
    contactId: 23,
    groupId: 8,
    assigned: false,
  });

  assert.deepEqual(
    testFixture.calls.requests.map(({ operation }) => operation),
    [
      "contacts.organization.list.save",
      "contacts.organization.tag-assignment",
      "contacts.organization.list-membership",
    ],
  );
});

test("stops before identity for configuration and validation failures", async () => {
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

  assert.deepEqual(await disabled.handler.saveTag("Priority"), {
    status: "configuration-required",
  });
  assert.deepEqual(await incomplete.handler.saveTag("Priority"), {
    status: "configuration-required",
  });
  assert.deepEqual(await invalid.handler.saveTag("A".repeat(129)), {
    status: "validation-error",
    issue: "invalid-name",
  });
  assert.deepEqual(await invalid.handler.setTagAssignment({
    contactId: 23,
    groupId: 5,
    assigned: true,
    tenantId: 7,
  }), {
    status: "validation-error",
    issue: "invalid-assignment",
  });
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(invalid.calls.identities, 0);
});

test("separates signed-out identity from unavailable dependencies", async () => {
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
  const failed = fixture({ identityError: new Error("private identity") });

  assert.deepEqual(await signedOut.handler.saveList("Pilot"), {
    status: "unauthenticated",
  });
  assert.deepEqual(await unavailable.handler.saveList("Pilot"), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.saveList("Pilot"), {
    status: "server-error",
  });
});

test("maps bounded Railway failures and rejects unsafe responses", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "server-error"],
    ["RATE_LIMITED", "server-error"],
  ];

  for (const [code, status] of scenarios) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.saveList("Pilot"), { status });
  }

  const invalidResponses = [
    { replayed: false, organization: organization([]), tenantId: 7 },
    { replayed: "false", organization: organization([]) },
    { replayed: false, organization: organization([23]) },
    {
      replayed: false,
      organization: organization([], {
        tags: [{ id: 5, name: " Priority ", contactCount: 0 }],
      }),
    },
  ];

  for (const data of invalidResponses) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data,
      }),
    });
    assert.deepEqual(await testFixture.handler.saveList("Pilot"), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects unsafe dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.saveTag("Priority"), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayContactOrganizationHandler(null),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createRailwayContactOrganizationHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
