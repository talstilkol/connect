import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayNodeProcess,
  inspectRailwayNodeProcessConfiguration,
  RailwayNodeProcessError,
} from "../server/platform/railwayNodeProcess.ts";

function runtime() {
  return {
    handler: { async handle() {} },
    readiness: { async check() { return { status: "ready" }; } },
    async close() {},
  };
}

function fixture(overrides = {}) {
  const calls = [];
  const listeners = new Map();
  const controller = createRailwayNodeProcess(
    {
      environment: { PORT: "3001" },
      runtime: runtime(),
    },
    {
      createService(options) {
        calls.push(["create", options.port]);
        return {
          async start() {
            calls.push("service.start");
          },
          async close() {
            calls.push("service.close");
            if (overrides.closeFailure) {
              throw new Error("shutdown detail");
            }
          },
        };
      },
      signals: {
        on(signal, listener) {
          calls.push(["on", signal]);
          listeners.set(signal, listener);
        },
        off(signal, listener) {
          calls.push(["off", signal]);
          assert.equal(listeners.get(signal), listener);
          listeners.delete(signal);
        },
      },
      recordShutdownFailure() {
        calls.push("shutdown.failure");
      },
    },
  );

  return { calls, controller, listeners };
}

test("accepts only one explicit bounded Railway port", () => {
  assert.deepEqual(
    inspectRailwayNodeProcessConfiguration({ PORT: "3001" }),
    { status: "configured", port: 3001 },
  );

  for (const environment of [
    {},
    { PORT: "" },
    { PORT: "0" },
    { PORT: "65536" },
    { PORT: "03001" },
    { PORT: "3001", HOST: "attacker.example.com" },
  ]) {
    assert.notEqual(
      inspectRailwayNodeProcessConfiguration(environment).status,
      "configured",
    );
  }
});

test("registers both shutdown signals only after one successful start", async () => {
  const testFixture = fixture();

  await testFixture.controller.start();
  await testFixture.controller.start();
  await testFixture.controller.close();
  await testFixture.controller.close();

  assert.deepEqual(testFixture.calls, [
    ["create", 3001],
    "service.start",
    ["on", "SIGINT"],
    ["on", "SIGTERM"],
    ["off", "SIGINT"],
    ["off", "SIGTERM"],
    "service.close",
  ]);
  await assert.rejects(
    testFixture.controller.start(),
    (error) =>
      error instanceof RailwayNodeProcessError &&
      error.code === "already-closed",
  );
});

test("uses the same idempotent close path for SIGTERM", async () => {
  const testFixture = fixture();
  await testFixture.controller.start();

  testFixture.listeners.get("SIGTERM")();
  await testFixture.controller.close();

  assert.equal(
    testFixture.calls.filter((value) => value === "service.close").length,
    1,
  );
  assert.equal(testFixture.calls.includes("shutdown.failure"), false);
});

test("records one bounded process failure when signal shutdown fails", async () => {
  const testFixture = fixture({ closeFailure: true });
  await testFixture.controller.start();

  testFixture.listeners.get("SIGINT")();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(testFixture.calls.includes("shutdown.failure"), true);
});

test("fails closed before service construction for invalid configuration", () => {
  let serviceCalls = 0;

  assert.throws(
    () =>
      createRailwayNodeProcess(
        { environment: {}, runtime: runtime() },
        {
          createService() {
            serviceCalls += 1;
          },
          signals: { on() {}, off() {} },
          recordShutdownFailure() {},
        },
      ),
    (error) =>
      error instanceof RailwayNodeProcessError &&
      error.code === "configuration-disabled",
  );
  assert.equal(serviceCalls, 0);
});

test("removes partial signal wiring and closes after a startup failure", async () => {
  const calls = [];
  const controller = createRailwayNodeProcess(
    { environment: { PORT: "3001" }, runtime: runtime() },
    {
      createService() {
        return {
          async start() {
            calls.push("service.start");
          },
          async close() {
            calls.push("service.close");
          },
        };
      },
      signals: {
        on(signal) {
          calls.push(["on", signal]);
          if (signal === "SIGTERM") {
            throw new Error("signal detail");
          }
        },
        off(signal) {
          calls.push(["off", signal]);
        },
      },
      recordShutdownFailure() {},
    },
  );

  await assert.rejects(
    controller.start(),
    (error) =>
      error instanceof RailwayNodeProcessError &&
      error.code === "start-failed" &&
      !error.message.includes("signal detail"),
  );
  assert.deepEqual(calls, [
    "service.start",
    ["on", "SIGINT"],
    ["on", "SIGTERM"],
    ["off", "SIGINT"],
    "service.close",
  ]);
});
