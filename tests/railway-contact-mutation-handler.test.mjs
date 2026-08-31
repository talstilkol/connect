import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayContactMutationHandler,
} from "../server/contacts/railwayContactMutationHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

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
  phoneNumber: "+972501234567",
  firstName: "Tal",
  lastName: null,
  email: null,
  company: "Connect",
  submissionOccurredAt: "2026-08-20T20:00:00.000Z",
});

function contact(overrides = {}) {
  return {
    id: 23,
    phoneNumber: input.phoneNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    company: input.company,
    mailingStatus: "subscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    version: 1,
    ...overrides,
  };
}

function success(data = { replayed: false, contact: contact() }) {
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
  const handler = createRailwayContactMutationHandler({
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

test("saves a normalized contact through a deterministic Railway mutation", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.save({
    phoneNumber: "  +972501234567 ",
    firstName: " Tal ",
    lastName: " ",
    email: "",
    company: " Connect ",
    submissionOccurredAt: input.submissionOccurredAt,
  });
  const expectedKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "contacts.save",
    input,
  );

  assert.deepEqual(result, { status: "saved", contact: contact() });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.save",
    requestKind: "mutation",
    idempotencyKey: expectedKey,
    payload: input,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("accepts an exact replay without weakening the public action result", async () => {
  const testFixture = fixture({
    responseFor: () => success({ replayed: true, contact: contact() }),
  });

  assert.deepEqual(await testFixture.handler.save(input), {
    status: "saved",
    contact: contact(),
  });
});

test("separates a new submission from a retry of the same submission", async () => {
  const testFixture = fixture();

  await testFixture.handler.save(input);
  await testFixture.handler.save(input);
  await testFixture.handler.save({
    ...input,
    submissionOccurredAt: "2026-08-20T20:00:00.001Z",
  });

  assert.equal(
    testFixture.calls.requests[0].idempotencyKey,
    testFixture.calls.requests[1].idempotencyKey,
  );
  assert.notEqual(
    testFixture.calls.requests[0].idempotencyKey,
    testFixture.calls.requests[2].idempotencyKey,
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

  assert.deepEqual(await disabled.handler.save(input), {
    status: "configuration-required",
  });
  assert.deepEqual(await incomplete.handler.save(input), {
    status: "configuration-required",
  });
  assert.deepEqual(await invalid.handler.save({ ...input, phoneNumber: "050" }), {
    status: "validation-error",
    issues: [{ field: "phoneNumber", code: "unsupported" }],
  });
  assert.equal(disabled.calls.configurations, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(invalid.calls.identities, 0);
  assert.deepEqual(
    await invalid.handler.save({
      ...input,
      submissionOccurredAt: "not-a-timestamp",
    }),
    { status: "server-error" },
  );
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
  const failed = fixture({ identityError: new Error("private identity") });

  assert.deepEqual(await signedOut.handler.save(input), {
    status: "unauthenticated",
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

test("maps bounded Railway failures without exposing internal state", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "server-error"],
    ["RATE_LIMITED", "server-error"],
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

    assert.deepEqual(await testFixture.handler.save(input), { status });
  }
});

test("rejects extended, mismatched, and malformed successful responses", async () => {
  const invalidResponses = [
    { replayed: false, contact: contact(), internalTenantId: 7 },
    { replayed: "false", contact: contact() },
    { replayed: false, contact: contact({ phoneNumber: "+972509999999" }) },
    { replayed: false, contact: contact({ version: 0 }) },
    { replayed: false, contact: contact({ internalEventKey: "private" }) },
  ];

  for (const data of invalidResponses) {
    const testFixture = fixture({ responseFor: () => success(data) });

    assert.deepEqual(await testFixture.handler.save(input), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects missing or extended dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.save(input), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayContactMutationHandler(null),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createRailwayContactMutationHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
