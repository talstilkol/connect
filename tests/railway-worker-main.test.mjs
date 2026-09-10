import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayWorkerMainConfiguration,
  RailwayWorkerMainError,
  startRailwayWorkerBootstrap,
} from "../server/platform/railwayWorkerMain.ts";

const ownerKey = `scheduler_owner_v1_${"d".repeat(64)}`;

function fixture(overrides = {}) {
  const events = [];
  let serviceOptions;
  const service = {
    async start() {
      events.push("service-start");
    },
    async close() {
      events.push("service-close");
      if (overrides.closeFailure) {
        throw new Error("private service close failure");
      }
    },
  };
  const controller = {
    async start() {
      events.push("process-start");
      if (overrides.processStartFailure) {
        throw new Error("private process start failure");
      }
    },
    async close() {
      events.push("process-close");
    },
  };
  const dependencies = {
    readEnvironment() {
      events.push("environment-read");
      if (overrides.environmentFailure) {
        throw new Error("private environment failure");
      }
      return {
        RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
      };
    },
    async createService(options) {
      events.push("service-create");
      serviceOptions = options;
      if (overrides.serviceFailure) {
        throw new Error("private service failure");
      }
      return service;
    },
    createProcess(options) {
      events.push("process-create");
      assert.equal(options.service, service);
      if (overrides.processFailure) {
        throw new Error("private process failure");
      }
      return controller;
    },
    telemetry: {
      recordPostgresIdleClientError() {
        events.push("postgres-idle-failure");
        if (overrides.telemetryFailure) {
          throw new Error("private telemetry failure");
        }
      },
      recordSchedulerRunFailure() {
        events.push("scheduler-run-failure");
      },
      recordSchedulerTimerFailure() {
        events.push("scheduler-timer-failure");
      },
      recordSchedulerOverlapSuppressed() {
        events.push("scheduler-overlap");
      },
    },
  };

  return {
    controller,
    dependencies,
    events,
    serviceOptions() {
      return serviceOptions;
    },
  };
}

test("accepts exactly one deterministic scheduler owner key", () => {
  assert.deepEqual(inspectRailwayWorkerMainConfiguration({}), {
    status: "disabled",
    ownerKey: null,
  });
  assert.deepEqual(inspectRailwayWorkerMainConfiguration({
    RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
  }), {
    status: "configured",
    ownerKey,
  });
  for (const environment of [
    null,
    { RAILWAY_WORKER_SCHEDULER_OWNER_KEY: "plain-owner" },
    {
      RAILWAY_WORKER_SCHEDULER_OWNER_KEY: ownerKey,
      EXTRA: "blocked",
    },
  ]) {
    assert.deepEqual(inspectRailwayWorkerMainConfiguration(environment), {
      status: "invalid",
      ownerKey: null,
    });
  }
});

test("starts the provider-bound service and process in order", async () => {
  const testFixture = fixture();
  const controller = await startRailwayWorkerBootstrap(
    testFixture.dependencies,
  );

  assert.equal(controller, testFixture.controller);
  assert.deepEqual(testFixture.events, [
    "environment-read",
    "service-create",
    "process-create",
    "process-start",
  ]);
  assert.equal(testFixture.serviceOptions().ownerKey, ownerKey);
});

test("keeps injected telemetry failures outside worker control flow", async () => {
  const testFixture = fixture({ telemetryFailure: true });
  await startRailwayWorkerBootstrap(testFixture.dependencies);
  const options = testFixture.serviceOptions();

  assert.doesNotThrow(
    options.postgresTelemetry.recordIdleClientError,
  );
  assert.doesNotThrow(
    options.schedulerTelemetry.recordRunFailure,
  );
  assert.doesNotThrow(
    options.schedulerTelemetry.recordTimerFailure,
  );
  assert.doesNotThrow(
    options.schedulerTelemetry.recordOverlapSuppressed,
  );
});

test("maps configuration and dependency failures without private details", async () => {
  const disabled = fixture();
  disabled.dependencies.readEnvironment = () => ({});
  await assert.rejects(
    startRailwayWorkerBootstrap(disabled.dependencies),
    (error) =>
      error instanceof RailwayWorkerMainError &&
      error.code === "configuration-disabled",
  );

  const invalid = fixture();
  invalid.dependencies.readEnvironment = () => ({
    RAILWAY_WORKER_SCHEDULER_OWNER_KEY: "invalid",
  });
  await assert.rejects(
    startRailwayWorkerBootstrap(invalid.dependencies),
    (error) =>
      error instanceof RailwayWorkerMainError &&
      error.code === "configuration-invalid",
  );

  await assert.rejects(
    startRailwayWorkerBootstrap({}),
    (error) =>
      error instanceof RailwayWorkerMainError &&
      error.code === "dependencies-invalid",
  );
});

test("closes the service after process construction or startup failure", async () => {
  for (const overrides of [
    { processFailure: true },
    { processStartFailure: true },
    { processStartFailure: true, closeFailure: true },
  ]) {
    const testFixture = fixture(overrides);
    await assert.rejects(
      startRailwayWorkerBootstrap(testFixture.dependencies),
      (error) =>
        error instanceof RailwayWorkerMainError &&
        error.code === "startup-failed" &&
        !error.message.includes("private"),
    );
    assert.equal(
      testFixture.events.filter(
        (event) => event === "service-close",
      ).length,
      1,
    );
  }
});

test("maps environment and service creation failures without cleanup leaks", async () => {
  for (const overrides of [
    { environmentFailure: true },
    { serviceFailure: true },
  ]) {
    const testFixture = fixture(overrides);
    await assert.rejects(
      startRailwayWorkerBootstrap(testFixture.dependencies),
      (error) =>
        error instanceof RailwayWorkerMainError &&
        error.code === "startup-failed" &&
        !error.message.includes("private"),
    );
    assert.equal(testFixture.events.includes("service-close"), false);
  }
});
