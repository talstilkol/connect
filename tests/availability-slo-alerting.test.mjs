import assert from "node:assert/strict";
import test from "node:test";

import {
  AvailabilitySloMeasurementError,
  measureAvailabilitySlo,
} from "../server/operations/availabilitySlo.ts";
import {
  evaluateSloAlert,
  inspectSloAlertPolicyConfiguration,
  sendOperationalAlert,
} from "../server/operations/sloAlertPolicy.ts";
import {
  createSloMonitoringService,
  SloMonitoringError,
} from "../server/operations/sloMonitoringService.ts";

const window = {
  startedAt: "2026-07-26T09:00:00.000Z",
  endedAt: "2026-07-26T10:00:00.000Z",
};

function source(
  goodEvents,
  validEvents,
) {
  return {
    async read(requestedWindow) {
      return {
        windowStartedAt:
          requestedWindow.startedAt,
        windowEndedAt:
          requestedWindow.endedAt,
        goodEvents,
        validEvents,
      };
    },
  };
}

const alertConfiguration = {
  measurementWindowMinutes: 60,
  minimumValidEvents: 100,
  owner: "operations-team",
  escalationRoute: "incident-primary",
};

test("measures the specified 99.5 percent availability objective exactly", async () => {
  const result = await measureAvailabilitySlo(
    source(995, 1000),
    window,
  );

  assert.deepEqual(result, {
    status: "measured",
    window,
    targetBasisPoints: 9950,
    availabilityBasisPoints: 9950,
    goodEvents: 995,
    validEvents: 1000,
    badEvents: 5,
    errorBudgetRemainingEvents: 0,
    objectiveMet: true,
  });
});

test("reports an exhausted error budget without rounding a breach upward", async () => {
  const result = await measureAvailabilitySlo(
    source(994, 1000),
    window,
  );

  assert.equal(
    result.availabilityBasisPoints,
    9940,
  );
  assert.equal(
    result.errorBudgetRemainingEvents,
    -1,
  );
  assert.equal(result.objectiveMet, false);
});

test("keeps an empty SLO window separate from healthy availability", async () => {
  assert.deepEqual(
    await measureAvailabilitySlo(
      source(0, 0),
      window,
    ),
    {
      status: "no-data",
      window,
      targetBasisPoints: 9950,
      goodEvents: 0,
      validEvents: 0,
    },
  );
});

test("rejects mismatched or extended metric snapshots", async () => {
  await assert.rejects(
    measureAvailabilitySlo(
      {
        async read() {
          return {
            windowStartedAt:
              window.startedAt,
            windowEndedAt: window.endedAt,
            goodEvents: 995,
            validEvents: 1000,
            tenantId: 7,
          };
        },
      },
      window,
    ),
    (error) =>
      error instanceof
        AvailabilitySloMeasurementError &&
      error.code === "INVALID_SNAPSHOT",
  );
});

test("requires explicit measurement and escalation policy without defaults", () => {
  assert.deepEqual(
    inspectSloAlertPolicyConfiguration({}),
    {
      status: "configuration-required",
      issues: [
        "WINDOW_MINUTES_REQUIRED",
        "MINIMUM_EVENTS_REQUIRED",
        "OWNER_REQUIRED",
        "ESCALATION_ROUTE_REQUIRED",
      ],
    },
  );

  assert.deepEqual(
    inspectSloAlertPolicyConfiguration({
      SLO_MEASUREMENT_WINDOW_MINUTES: "60",
      SLO_MINIMUM_VALID_EVENTS: "100",
      SLO_ALERT_OWNER: "operations-team",
      SLO_ALERT_ESCALATION_ROUTE:
        "incident-primary",
    }),
    {
      status: "configured",
      configuration: alertConfiguration,
    },
  );
});

test("distinguishes healthy, breach, and insufficient-data alert decisions", async () => {
  const healthy = await measureAvailabilitySlo(
    source(995, 1000),
    window,
  );
  const breach = await measureAvailabilitySlo(
    source(994, 1000),
    window,
  );
  const insufficient =
    await measureAvailabilitySlo(
      source(49, 50),
      window,
    );

  assert.deepEqual(
    evaluateSloAlert(
      alertConfiguration,
      healthy,
    ),
    { outcome: "healthy" },
  );
  assert.equal(
    evaluateSloAlert(
      alertConfiguration,
      breach,
    ).alert.code,
    "SLO_BREACH",
  );
  assert.equal(
    evaluateSloAlert(
      alertConfiguration,
      insufficient,
    ).alert.code,
    "SLO_INSUFFICIENT_DATA",
  );
});

test("delivers only explicit alerts and sanitizes provider failure", async () => {
  const result = await measureAvailabilitySlo(
    source(994, 1000),
    window,
  );
  const decision = evaluateSloAlert(
    alertConfiguration,
    result,
  );
  const alerts = [];

  assert.deepEqual(
    await sendOperationalAlert(
      {
        async send(alert) {
          alerts.push(alert);
          return { outcome: "accepted" };
        },
      },
      decision,
    ),
    { outcome: "accepted" },
  );
  assert.equal(alerts.length, 1);
  assert.doesNotMatch(
    JSON.stringify(alerts[0]),
    /tenant|phone|payload|content|messageId/i,
  );

  assert.deepEqual(
    await sendOperationalAlert(
      {
        async send() {
          throw new Error(
            "private alert provider failure",
          );
        },
      },
      decision,
    ),
    { outcome: "unavailable" },
  );
});

test("runs one deterministic healthy SLO window without sending an alert", async () => {
  let alertCalls = 0;
  const service = createSloMonitoringService({
    source: source(995, 1000),
    alertSink: {
      async send() {
        alertCalls += 1;
        return { outcome: "accepted" };
      },
    },
    configuration: alertConfiguration,
    clock: {
      now() {
        return new Date(
          "2026-07-26T10:00:00.000Z",
        );
      },
    },
  });

  const result = await service.run();

  assert.equal(
    result.measurement.window.startedAt,
    "2026-07-26T09:00:00.000Z",
  );
  assert.equal(
    result.alertDelivery,
    "not-required",
  );
  assert.equal(alertCalls, 0);
});

test("delivers a breach alert from the measured SLO window", async () => {
  const alerts = [];
  const service = createSloMonitoringService({
    source: source(994, 1000),
    alertSink: {
      async send(alert) {
        alerts.push(alert);
        return { outcome: "accepted" };
      },
    },
    configuration: alertConfiguration,
    clock: {
      now() {
        return new Date(
          "2026-07-26T10:00:00.000Z",
        );
      },
    },
  });

  const result = await service.run();

  assert.equal(
    result.alertDelivery,
    "accepted",
  );
  assert.equal(
    alerts[0].code,
    "SLO_BREACH",
  );
});

test("fails closed when an alert cannot be delivered", async () => {
  const service = createSloMonitoringService({
    source: source(994, 1000),
    alertSink: {
      async send() {
        return { outcome: "unavailable" };
      },
    },
    configuration: alertConfiguration,
    clock: {
      now() {
        return new Date(
          "2026-07-26T10:00:00.000Z",
        );
      },
    },
  });

  await assert.rejects(
    service.run(),
    (error) =>
      error instanceof SloMonitoringError &&
      error.code ===
        "ALERT_DELIVERY_UNAVAILABLE",
  );
});

test("maps invalid clock and source failures to bounded monitoring errors", async () => {
  const validDependencies = {
    source: {
      async read() {
        throw new Error("private source error");
      },
    },
    alertSink: {
      async send() {
        return { outcome: "accepted" };
      },
    },
    configuration: alertConfiguration,
    clock: {
      now() {
        return new Date(
          "2026-07-26T10:00:00.000Z",
        );
      },
    },
  };

  await assert.rejects(
    createSloMonitoringService(
      validDependencies,
    ).run(),
    (error) =>
      error instanceof SloMonitoringError &&
      error.code ===
        "MEASUREMENT_UNAVAILABLE",
  );

  await assert.rejects(
    createSloMonitoringService({
      ...validDependencies,
      source: source(995, 1000),
      clock: {
        now() {
          return new Date("invalid");
        },
      },
    }).run(),
    (error) =>
      error instanceof SloMonitoringError &&
      error.code === "CLOCK_UNAVAILABLE",
  );
});
