import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayWorkerProcess,
  RailwayWorkerProcessError,
} from "../server/platform/railwayWorkerProcess.ts";

function processFixture(overrides = {}) {
  const events = [];
  const listeners = new Map();
  const service = {
    async start() {
      events.push("service-start");
      if (overrides.startFailure) {
        throw new Error("private start failure");
      }
    },
    async close() {
      events.push("service-close");
      if (overrides.closeFailure) {
        throw new Error("private close failure");
      }
    },
  };
  const dependencies = {
    signals: {
      on(signal, listener) {
        events.push(`on:${signal}`);
        if (overrides.signalFailure === signal) {
          throw new Error("private signal failure");
        }
        listeners.set(signal, listener);
      },
      off(signal, listener) {
        events.push(`off:${signal}`);
        assert.equal(listeners.get(signal), listener);
        listeners.delete(signal);
      },
    },
    recordShutdownFailure() {
      events.push("shutdown-failure");
    },
  };

  return { events, listeners, service, dependencies };
}

test("starts once and closes through one ordered signal lifecycle", async () => {
  const fixture = processFixture();
  const processController = createRailwayWorkerProcess(
    { service: fixture.service },
    fixture.dependencies,
  );

  await processController.start();
  await processController.start();
  assert.deepEqual(fixture.events, [
    "service-start",
    "on:SIGINT",
    "on:SIGTERM",
  ]);

  await processController.close();
  await processController.close();
  assert.deepEqual(fixture.events, [
    "service-start",
    "on:SIGINT",
    "on:SIGTERM",
    "off:SIGINT",
    "off:SIGTERM",
    "service-close",
  ]);
  assert.equal(fixture.listeners.size, 0);
  await assert.rejects(
    processController.start(),
    (error) =>
      error instanceof RailwayWorkerProcessError &&
      error.code === "already-closed",
  );
});

test("uses SIGTERM for the same idempotent close path", async () => {
  const fixture = processFixture();
  const processController = createRailwayWorkerProcess(
    { service: fixture.service },
    fixture.dependencies,
  );
  await processController.start();

  fixture.listeners.get("SIGTERM")();
  await Promise.resolve();
  await Promise.resolve();
  await processController.close();

  assert.equal(
    fixture.events.filter((event) => event === "service-close").length,
    1,
  );
  assert.equal(fixture.listeners.size, 0);
  assert.equal(fixture.events.includes("shutdown-failure"), false);
});

test("cleans up a partially registered process after startup failure", async () => {
  const fixture = processFixture({ signalFailure: "SIGTERM" });
  const processController = createRailwayWorkerProcess(
    { service: fixture.service },
    fixture.dependencies,
  );

  await assert.rejects(
    processController.start(),
    (error) =>
      error instanceof RailwayWorkerProcessError &&
      error.code === "start-failed" &&
      !error.message.includes("private"),
  );
  assert.deepEqual(fixture.events, [
    "service-start",
    "on:SIGINT",
    "on:SIGTERM",
    "off:SIGINT",
    "service-close",
  ]);
  assert.equal(fixture.listeners.size, 0);
});

test("maps explicit and signalled shutdown failures without reopening", async () => {
  const explicitFixture = processFixture({ closeFailure: true });
  const explicit = createRailwayWorkerProcess(
    { service: explicitFixture.service },
    explicitFixture.dependencies,
  );
  await explicit.start();
  await assert.rejects(
    explicit.close(),
    (error) =>
      error instanceof RailwayWorkerProcessError &&
      error.code === "shutdown-failed" &&
      !error.message.includes("private"),
  );

  const signalFixture = processFixture({ closeFailure: true });
  const signalled = createRailwayWorkerProcess(
    { service: signalFixture.service },
    signalFixture.dependencies,
  );
  await signalled.start();
  signalFixture.listeners.get("SIGINT")();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(signalFixture.events.includes("shutdown-failure"), true);
});

test("rejects malformed dependencies before starting a service", () => {
  assert.throws(
    () => createRailwayWorkerProcess({ service: {} }, {}),
    (error) =>
      error instanceof RailwayWorkerProcessError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () =>
      createRailwayWorkerProcess(
        {
          service: {
            async start() {},
            async close() {},
          },
          extra: true,
        },
        {
          signals: { on() {}, off() {} },
          recordShutdownFailure() {},
        },
      ),
    (error) =>
      error instanceof RailwayWorkerProcessError &&
      error.code === "options-invalid",
  );
});
