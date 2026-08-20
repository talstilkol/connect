import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayContactConsentHandler,
} from "../server/contacts/railwayContactConsentHandler.ts";
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
const input = Object.freeze({
  source: "website-form",
  occurredAt: "2026-08-20T20:05:00.000Z",
  evidenceReference: "consent-evidence-v1",
});

function contact(overrides = {}) {
  return {
    id: 23,
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    consentSource: input.source,
    consentRecordedAt: input.occurredAt,
    consentWithdrawnAt: null,
    version: 2,
    ...overrides,
  };
}

function success(data = { contact: contact() }) {
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
  const handler = createRailwayContactConsentHandler({
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

test("records normalized grant evidence with a deterministic Railway key", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.grant(23, {
    source: " website-form ",
    occurredAt: "2026-08-20T20:05:00Z",
    evidenceReference: " consent-evidence-v1 ",
  });
  const payload = {
    contactId: 23,
    ...input,
  };
  const expectedKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "contacts.consent.grant",
    payload,
  );

  assert.deepEqual(result, { status: "saved", contact: contact() });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.consent.grant",
    requestKind: "mutation",
    idempotencyKey: expectedKey,
    payload,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("keeps unsubscribe separate and returns the current bounded contact", async () => {
  const withdrawn = contact({
    mailingStatus: "unsubscribed",
    consentStatus: "withdrawn",
    consentWithdrawnAt: input.occurredAt,
    version: 3,
  });
  const testFixture = fixture({
    responseFor: () => success({ contact: withdrawn }),
  });

  assert.deepEqual(await testFixture.handler.unsubscribe(23, input), {
    status: "saved",
    contact: withdrawn,
  });
  assert.equal(
    testFixture.calls.requests[0].operation,
    "contacts.consent.unsubscribe",
  );
});

test("stops before identity for configuration and input failures", async () => {
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

  assert.deepEqual(await disabled.handler.grant(23, input), {
    status: "configuration-required",
  });
  assert.deepEqual(await incomplete.handler.grant(23, input), {
    status: "configuration-required",
  });
  assert.deepEqual(await invalid.handler.grant(0, input), {
    status: "server-error",
  });
  assert.deepEqual(await invalid.handler.grant(23, {
    ...input,
    occurredAt: "invalid",
  }), {
    status: "validation-error",
    issues: [{ field: "occurredAt", code: "unsupported" }],
  });
  assert.deepEqual(await invalid.handler.grant(23, {
    ...input,
    tenantId: 7,
  }), {
    status: "server-error",
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
  const failed = fixture({ identityError: new Error("private identity") });

  assert.deepEqual(await signedOut.handler.grant(23, input), {
    status: "unauthenticated",
  });
  assert.deepEqual(await unavailable.handler.grant(23, input), {
    status: "server-error",
  });
  assert.deepEqual(await failed.handler.grant(23, input), {
    status: "server-error",
  });
  assert.deepEqual(signedOut.calls.requests, []);
  assert.deepEqual(unavailable.calls.requests, []);
  assert.deepEqual(failed.calls.requests, []);
});

test("maps bounded Railway failures without exposing provider details", async () => {
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
    assert.deepEqual(await testFixture.handler.grant(23, input), { status });
  }
});

test("rejects extended, cross-contact, and malformed success responses", async () => {
  const invalidResponses = [
    { contact: contact(), internalTenantId: 7 },
    { contact: contact({ id: 24 }) },
    { contact: contact({ version: 0 }) },
    { contact: contact({ internalEventKey: "private" }) },
  ];

  for (const data of invalidResponses) {
    const testFixture = fixture({ responseFor: () => success(data) });
    assert.deepEqual(await testFixture.handler.grant(23, input), {
      status: "server-error",
    });
  }
});

test("sanitizes client failures and rejects missing or extended dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.grant(23, input), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayContactConsentHandler(null),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createRailwayContactConsentHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
