import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwaySystemAdminWhatsappDeliveryPolicyHandler,
} from "../server/campaigns/railwaySystemAdminWhatsappDeliveryPolicyHandler.ts";
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
const approvalInput = Object.freeze({
  tenantId: 19,
  expectedConnectionVersion: 2,
  expectedPolicyVersion: 1,
  businessPortfolioId: "portfolio-19",
  wabaId: "waba-19",
  phoneNumberId: "phone-19",
  portfolioLimitKind: "bounded",
  portfolioLimitValue: 2000,
  phoneThroughputMessagesPerSecond: 80,
  maximumOutboundMessagesPerSecond: 65,
  reservationDurationSeconds: 60,
  metaGraphApiVersion: "v23.0",
  evidenceDigest: "f".repeat(64),
  evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
  evidenceExpiresAt: "2026-08-22T04:00:00.000Z",
});

function policyRecord(overrides = {}) {
  return {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
    connectionVersion: 2,
    policyVersion: 2,
    deliveryState: "enabled",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 2000,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 65,
    },
    reservationDurationSeconds: 60,
    metaGraphApiVersion: "v23.0",
    evidenceDigest: "f".repeat(64),
    evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
    evidenceExpiresAt: "2026-08-22T04:00:00.000Z",
    recordedAt: "2026-08-21T05:00:00.000Z",
    ...overrides,
  };
}

function success(data) {
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
  response = success({
    outcome: "updated",
    record: policyRecord(),
  }),
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler =
    createRailwaySystemAdminWhatsappDeliveryPolicyHandler({
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

test("reads one bounded WhatsApp policy without exposing Railway identity", async () => {
  const testFixture = fixture({
    response: success({
      connection: {
        businessPortfolioIdentifier: "portfolio-19",
        wabaIdentifier: "waba-19",
        phoneNumberIdentifier: "phone-19",
        status: "connected",
        version: 2,
      },
      record: policyRecord({ policyVersion: 1 }),
    }),
  });
  const result = await testFixture.handler.read(19);

  assert.equal(result.status, "ready");
  assert.equal(result.connection.tenantId, 19);
  assert.equal(result.connection.phoneNumberId, "phone-19");
  assert.equal(result.record.tenantId, 19);
  assert.equal(result.record.policyVersion, 1);
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "system-admin.whatsapp-delivery-policy.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: { targetTenantId: 19 },
  }]);
  assert.deepEqual(testFixture.calls.clientConfigurations, [{
    apiOrigin: "https://connect-api.up.railway.app",
    deploymentEnvironment: "production",
    oidcToken,
    userSessionToken,
  }]);
});

test("approves normalized evidence with a deterministic mutation key", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.approve(approvalInput);

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "updated");
  assert.equal(result.record.tenantId, 19);
  const [request] = testFixture.calls.requests;
  const expectedPayload = {
    targetTenantId: 19,
    expectedConnectionVersion: 2,
    expectedPolicyVersion: 1,
    expectedBusinessPortfolioIdentifier: "portfolio-19",
    expectedWabaIdentifier: "waba-19",
    expectedPhoneNumberIdentifier: "phone-19",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 2000,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 65,
    reservationDurationSeconds: 60,
    metaGraphApiVersion: "v23.0",
    evidenceDigest: "f".repeat(64),
    evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
    evidenceExpiresAt: "2026-08-22T04:00:00.000Z",
  };

  assert.deepEqual(request.payload, expectedPayload);
  assert.equal(
    request.operation,
    "system-admin.whatsapp-delivery-policy.approve",
  );
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      request.operation,
      expectedPayload,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(request.payload),
    /"businessPortfolioId"|"wabaId"|"phoneNumberId"|externalUserId/,
  );
});

test("accepts an unchanged next-version response for a completed retry", async () => {
  const testFixture = fixture({
    response: success({
      outcome: "unchanged",
      record: policyRecord({ policyVersion: 2 }),
    }),
  });
  const result = await testFixture.handler.approve(approvalInput);

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "unchanged");
  assert.equal(result.record.policyVersion, 2);
});

test("stops before identity for unavailable configuration or invalid input", async () => {
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

  assert.deepEqual(
    await disabled.handler.approve(approvalInput),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await incomplete.handler.approve(approvalInput),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await invalid.handler.approve({
      ...approvalInput,
      actorExternalUserId: "forged-admin",
    }),
    { status: "invalid-input" },
  );
  assert.equal(disabled.calls.identities, 0);
  assert.equal(incomplete.calls.identities, 0);
  assert.equal(invalid.calls.identities, 0);
});

test("maps identity and Railway failures without leaking dependency detail", async () => {
  const signedOut = fixture({
    identityState: {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  const identityFailure = fixture({
    identityError: new Error("private identity detail"),
  });
  const networkFailure = fixture({
    clientError: new Error("private Railway detail"),
  });

  assert.deepEqual(
    await signedOut.handler.approve(approvalInput),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await identityFailure.handler.approve(approvalInput),
    { status: "server-error" },
  );
  assert.deepEqual(
    await networkFailure.handler.approve(approvalInput),
    { status: "server-error" },
  );
});

test("maps actionable policy failures to the existing UI contract", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["AUTHORIZATION_DENIED", "permission-denied"],
    ["INVALID_REQUEST", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["INVALID_TRANSITION", "connection-not-ready"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "server-error"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
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
      await testFixture.handler.approve(approvalInput),
      { status },
    );
  }
});

test("rejects cross-contract or mismatched policy success data", async () => {
  const invalidResponses = [
    success({
      outcome: "updated",
      record: policyRecord({ policyVersion: 1 }),
    }),
    success({
      outcome: "updated",
      record: policyRecord({ evidenceDigest: "0".repeat(64) }),
    }),
    success({
      outcome: "updated",
      record: policyRecord({ tenantId: 19 }),
    }),
    success({
      outcome: "updated",
      record: policyRecord({ recordedAt: "not-a-timestamp" }),
    }),
  ];

  for (const response of invalidResponses) {
    const testFixture = fixture({ response });

    assert.deepEqual(
      await testFixture.handler.approve(approvalInput),
      { status: "server-error" },
    );
  }
});

test("rejects extended handler dependencies", () => {
  assert.throws(
    () =>
      createRailwaySystemAdminWhatsappDeliveryPolicyHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
