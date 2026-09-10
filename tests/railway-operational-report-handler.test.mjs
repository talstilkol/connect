import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayOperationalReportHandler,
} from "../server/reports/railwayOperationalReportHandler.ts";

const operationId = "reports.read";
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
  startDate: "2026-07-01",
  endDate: "2026-07-31",
});

function report(overrides = {}) {
  return {
    period: { ...input },
    generatedAt: "2026-07-31T10:00:00.000Z",
    campaigns: {
      total: 1,
      recipientCount: 4,
      draft: 0,
      scheduled: 0,
      running: 0,
      paused: 0,
      completed: 1,
      cancelled: 0,
      failed: 0,
    },
    messages: {
      total: 2,
      inbound: 1,
      outbound: 1,
      received: 1,
      sent: 0,
      delivered: 0,
      read: 1,
      failed: 0,
    },
    conversations: {
      active: 1,
      unreadCount: 0,
      new: 0,
      botActive: 0,
      waitingForAgent: 0,
      agentActive: 0,
      waitingForContact: 0,
      closed: 1,
    },
    bot: {
      total: 1,
      pending: 0,
      sending: 0,
      accepted: 1,
      rejected: 0,
      ambiguous: 0,
    },
    ai: {
      totalTurns: 1,
      replyPlanned: 1,
      handoff: 0,
    },
    aiUsage: [{
      currency: "ILS",
      requestCount: 1,
      inputTokens: 120,
      outputTokens: 30,
      costMinorUnits: 8,
    }],
    ...overrides,
  };
}

function success(data = report()) {
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
  now = () => new Date("2026-07-31T23:59:59.000Z"),
} = {}) {
  const calls = {
    configurations: 0,
    identities: 0,
    clientConfigurations: [],
    requests: [],
  };
  const handler = createRailwayOperationalReportHandler({
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
    now,
  });

  return { calls, handler };
}

test("sends one bounded report query and accepts a fully consistent view", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.load(input);

  assert.deepEqual(result, {
    status: "loaded",
    report: report(),
  });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "query",
    idempotencyKey: null,
    payload: input,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("loads the deterministic initial thirty-day UTC period through Railway", async () => {
  const defaultPeriod = {
    startDate: "2026-07-02",
    endDate: "2026-07-31",
  };
  const testFixture = fixture({
    responseFor: () => success(report({ period: defaultPeriod })),
  });
  const result = await testFixture.handler.read();

  assert.equal(result.status, "ready");
  assert.deepEqual(result.report.period, defaultPeriod);
  assert.deepEqual(testFixture.calls.requests[0].payload, defaultPeriod);
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
    report: null,
  });
  assert.deepEqual(await incomplete.handler.load(input), {
    status: "configuration-required",
  });
  assert.deepEqual(
    await invalid.handler.load({ ...input, tenantId: 7 }),
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

test("maps every tenant-session failure without collapsing UI recovery states", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
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

test("rejects mismatched, inconsistent, unordered, and extended report responses", async () => {
  const invalidReports = [
    report({ period: { startDate: "2026-07-02", endDate: input.endDate } }),
    report({ generatedAt: "not-a-timestamp" }),
    report({ campaigns: { ...report().campaigns, total: 2 } }),
    report({ messages: { ...report().messages, outbound: 2 } }),
    report({ aiUsage: [
      { ...report().aiUsage[0], currency: "USD" },
      { ...report().aiUsage[0], currency: "ILS" },
    ] }),
    report({ internalTenantId: 7 }),
    report({
      aiUsage: [{
        ...report().aiUsage[0],
        internalCostReference: "private",
      }],
    }),
  ];

  for (const invalidReport of invalidReports) {
    const testFixture = fixture({
      responseFor: () => success(invalidReport),
    });
    assert.deepEqual(await testFixture.handler.load(input), {
      status: "server-error",
    });
  }
});

test("sanitizes client and clock failures and rejects extended dependencies", async () => {
  const clientFailed = fixture({
    clientError: new Error("private Railway address"),
  });
  const clockFailed = fixture({
    now: () => new Date(Number.NaN),
  });

  assert.deepEqual(await clientFailed.handler.load(input), {
    status: "server-error",
  });
  assert.deepEqual(await clockFailed.handler.read(), {
    status: "server-error",
    report: null,
  });
  assert.throws(
    () => createRailwayOperationalReportHandler(null),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwayOperationalReportHandler({
        applicationConfigured: () => true,
        inspectConfiguration: () => configuredState,
        resolveIdentity: async () => authenticatedState,
        createClient() {},
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
