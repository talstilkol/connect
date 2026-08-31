import assert from "node:assert/strict";
import test from "node:test";

import {
  createBetterStackIncidentAlertSink,
  inspectBetterStackIncidentAlertConfiguration,
} from "../server/platform/betterStackIncidentAlertSink.ts";

const apiToken = `token_${"a".repeat(24)}`;
const alertPolicy = Object.freeze({
  measurementWindowMinutes: 60,
  minimumValidEvents: 100,
  owner: "operations-oncall",
  escalationRoute: "better-stack-primary",
});

function environment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    SLO_MEASUREMENT_WINDOW_MINUTES: "60",
    SLO_MINIMUM_VALID_EVENTS: "100",
    SLO_ALERT_OWNER: "operations-oncall",
    SLO_ALERT_ESCALATION_ROUTE: "better-stack-primary",
    BETTER_STACK_INCIDENT_API_TOKEN: apiToken,
    BETTER_STACK_INCIDENT_REQUESTER_EMAIL: "operations@example.com",
    BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID: "primary_policy_123",
    BETTER_STACK_INCIDENT_NOTIFY_CALL: "false",
    BETTER_STACK_INCIDENT_NOTIFY_SMS: "false",
    BETTER_STACK_INCIDENT_NOTIFY_EMAIL: "true",
    BETTER_STACK_INCIDENT_NOTIFY_PUSH: "true",
    BETTER_STACK_INCIDENT_NOTIFY_CRITICAL: "false",
    BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS: "300",
    ...overrides,
  };
}

function configuration() {
  const inspection = inspectBetterStackIncidentAlertConfiguration(
    environment(),
  );
  assert.equal(inspection.status, "configured");
  return inspection.configuration;
}

function alert(overrides = {}) {
  return {
    version: 1,
    code: "SLO_BREACH",
    owner: alertPolicy.owner,
    escalationRoute: alertPolicy.escalationRoute,
    windowStartedAt: "2026-08-21T12:00:00.000Z",
    windowEndedAt: "2026-08-21T13:00:00.000Z",
    targetBasisPoints: 9_950,
    observedBasisPoints: 9_940,
    validEvents: 1_000,
    ...overrides,
  };
}

function acceptedResponse(value = {
  data: {
    id: "incident_123",
    type: "incident",
    attributes: {
      summary: "provider-owned response field",
    },
  },
}) {
  return new Response(JSON.stringify(value), {
    status: 201,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function dependencies(fetchImplementation) {
  return {
    fetchImplementation,
    createTimeoutSignal(timeoutMilliseconds) {
      assert.equal(timeoutMilliseconds, 5_000);
      return new AbortController().signal;
    },
  };
}

test("keeps local alerting disabled and rejects partial local secrets", () => {
  assert.deepEqual(
    inspectBetterStackIncidentAlertConfiguration({
      APP_RUNTIME_ENVIRONMENT: "development",
    }),
    {
      status: "disabled",
      runtimeEnvironment: "development",
    },
  );
  assert.deepEqual(
    inspectBetterStackIncidentAlertConfiguration({
      APP_RUNTIME_ENVIRONMENT: "test",
    }),
    {
      status: "disabled",
      runtimeEnvironment: "test",
    },
  );
  assert.equal(
    inspectBetterStackIncidentAlertConfiguration({
      APP_RUNTIME_ENVIRONMENT: "development",
      BETTER_STACK_INCIDENT_API_TOKEN: apiToken,
    }).status,
    "invalid",
  );
});

test("requires every hosted routing decision without defaults", () => {
  const inspection = inspectBetterStackIncidentAlertConfiguration({
    APP_RUNTIME_ENVIRONMENT: "staging",
  });

  assert.equal(inspection.status, "configuration-required");
  assert.deepEqual(inspection.missingKeys, [
    "SLO_MEASUREMENT_WINDOW_MINUTES",
    "SLO_MINIMUM_VALID_EVENTS",
    "SLO_ALERT_OWNER",
    "SLO_ALERT_ESCALATION_ROUTE",
    "BETTER_STACK_INCIDENT_API_TOKEN",
    "BETTER_STACK_INCIDENT_REQUESTER_EMAIL",
    "BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID",
    "BETTER_STACK_INCIDENT_NOTIFY_CALL",
    "BETTER_STACK_INCIDENT_NOTIFY_SMS",
    "BETTER_STACK_INCIDENT_NOTIFY_EMAIL",
    "BETTER_STACK_INCIDENT_NOTIFY_PUSH",
    "BETTER_STACK_INCIDENT_NOTIFY_CRITICAL",
    "BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS",
  ]);
});

test("accepts one explicit Better Stack incident routing policy", () => {
  const inspection = inspectBetterStackIncidentAlertConfiguration(
    environment(),
  );

  assert.equal(inspection.status, "configured");
  assert.deepEqual(inspection.configuration, {
    runtimeEnvironment: "staging",
    alertPolicy,
    apiToken,
    requesterEmail: "operations@example.com",
    escalationPolicyId: "primary_policy_123",
    channels: {
      call: false,
      sms: false,
      email: true,
      push: true,
      criticalAlert: false,
    },
    teamWaitSeconds: 300,
  });
  assert.ok(Object.isFrozen(inspection));
  assert.ok(Object.isFrozen(inspection.configuration));
  assert.ok(Object.isFrozen(inspection.configuration.alertPolicy));
  assert.ok(Object.isFrozen(inspection.configuration.channels));
});

test("rejects malformed credentials, routing and notification policy", () => {
  const cases = [
    { BETTER_STACK_INCIDENT_API_TOKEN: "short" },
    { BETTER_STACK_INCIDENT_REQUESTER_EMAIL: "not-an-email" },
    { BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID: "unsafe policy" },
    { BETTER_STACK_INCIDENT_NOTIFY_EMAIL: "yes" },
    {
      BETTER_STACK_INCIDENT_NOTIFY_EMAIL: "false",
      BETTER_STACK_INCIDENT_NOTIFY_PUSH: "false",
    },
    {
      BETTER_STACK_INCIDENT_NOTIFY_PUSH: "false",
      BETTER_STACK_INCIDENT_NOTIFY_CRITICAL: "true",
    },
    { BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS: "0" },
    { BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS: "86401" },
    { SLO_MEASUREMENT_WINDOW_MINUTES: "0" },
  ];

  for (const overrides of cases) {
    assert.equal(
      inspectBetterStackIncidentAlertConfiguration(
        environment(overrides),
      ).status,
      "invalid",
    );
  }
});

test("posts one bounded incident to the fixed Better Stack endpoint", async () => {
  const requests = [];
  const sink = createBetterStackIncidentAlertSink(
    configuration(),
    dependencies(async (input, init) => {
      requests.push({ input, init });
      return acceptedResponse();
    }),
  );

  assert.deepEqual(await sink.send(alert()), { outcome: "accepted" });
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].input,
    "https://uptime.betterstack.com/api/v3/incidents",
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.redirect, "error");
  assert.ok(requests[0].init.signal instanceof AbortSignal);
  assert.deepEqual(requests[0].init.headers, {
    Accept: "application/json",
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  });

  const body = JSON.parse(requests[0].init.body);
  assert.deepEqual(body, {
    summary: "Connect staging availability SLO breach",
    requester_email: "operations@example.com",
    description: [
      "Code: SLO_BREACH",
      "Window start: 2026-08-21T12:00:00.000Z",
      "Window end: 2026-08-21T13:00:00.000Z",
      "Target basis points: 9950",
      "Observed basis points: 9940",
      "Valid events: 1000",
    ].join("\n"),
    call: false,
    sms: false,
    email: true,
    push: true,
    critical_alert: false,
    team_wait: 300,
    policy_id: "primary_policy_123",
  });
  assert.doesNotMatch(
    requests[0].init.body,
    /tenant|phone|recipient|payload|message|trace|token_/i,
  );
});

test("delivers an insufficient-data alert without inventing an observation", async () => {
  let body;
  const sink = createBetterStackIncidentAlertSink(
    configuration(),
    dependencies(async (_input, init) => {
      body = JSON.parse(init.body);
      return acceptedResponse();
    }),
  );

  assert.deepEqual(
    await sink.send(alert({
      code: "SLO_INSUFFICIENT_DATA",
      observedBasisPoints: null,
      validEvents: 0,
    })),
    { outcome: "accepted" },
  );
  assert.equal(
    body.summary,
    "Connect staging SLO insufficient data",
  );
  assert.match(body.description, /Observed basis points: unavailable/);
});

test("rejects forged or inconsistent alerts before network access", async () => {
  let calls = 0;
  const sink = createBetterStackIncidentAlertSink(
    configuration(),
    dependencies(async () => {
      calls += 1;
      return acceptedResponse();
    }),
  );
  const cases = [
    { ...alert(), tenantId: "forbidden" },
    alert({ owner: "other-owner" }),
    alert({ escalationRoute: "other-route" }),
    alert({ windowEndedAt: "2026-08-21T12:59:59.999Z" }),
    alert({ targetBasisPoints: 9_900 }),
    alert({ observedBasisPoints: 9_950 }),
    alert({ validEvents: 99 }),
    alert({
      code: "SLO_INSUFFICIENT_DATA",
      observedBasisPoints: 9_940,
      validEvents: 100,
    }),
  ];

  for (const value of cases) {
    assert.deepEqual(await sink.send(value), { outcome: "unavailable" });
  }
  assert.equal(calls, 0);
});

test("sanitizes HTTP, network, timeout and response contract failures", async () => {
  const failures = [
    async () => new Response("unauthorized", { status: 401 }),
    async () => new Response("{}", {
      status: 201,
      headers: { "Content-Type": "text/plain" },
    }),
    async () => new Response("{broken", {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
    async () => acceptedResponse({ data: { id: "unsafe id", type: "incident" } }),
    async () => new Response("{}", {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "32769",
      },
    }),
    async () => {
      throw new Error("private provider failure with token");
    },
  ];

  for (const fetchImplementation of failures) {
    const sink = createBetterStackIncidentAlertSink(
      configuration(),
      dependencies(fetchImplementation),
    );
    assert.deepEqual(await sink.send(alert()), { outcome: "unavailable" });
  }

  const invalidSignalSink = createBetterStackIncidentAlertSink(
    configuration(),
    {
      async fetchImplementation() {
        throw new Error("must not run");
      },
      createTimeoutSignal() {
        return {};
      },
    },
  );
  assert.deepEqual(
    await invalidSignalSink.send(alert()),
    { outcome: "unavailable" },
  );
});

test("rejects malformed adapter configuration and dependencies", () => {
  assert.throws(
    () => createBetterStackIncidentAlertSink({
      ...configuration(),
      teamWaitSeconds: 0,
    }),
    /BETTER_STACK_INCIDENT_CONFIGURATION_INVALID/,
  );
  assert.throws(
    () => createBetterStackIncidentAlertSink(
      configuration(),
      {
        fetchImplementation: async () => acceptedResponse(),
        createTimeoutSignal: () => new AbortController().signal,
        extra: true,
      },
    ),
    /BETTER_STACK_INCIDENT_CONFIGURATION_INVALID/,
  );
});
