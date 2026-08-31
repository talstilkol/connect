import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayNodeService,
  RailwayNodeServiceError,
} from "../server/platform/railwayNodeService.ts";

function fixture(overrides = {}) {
  const calls = [];
  const runtime = {
    handler: { async handle() {} },
    readiness: { async check() { return { status: "ready" }; } },
    async close() {
      calls.push("runtime.close");
      if (overrides.runtimeCloseFailure) {
        throw new Error("runtime detail");
      }
    },
  };
  const service = createRailwayNodeService(
    { port: 3001, runtime },
    {
      createHttpServer(options) {
        calls.push(["create", options.port]);
        return {
          async start() {
            calls.push("server.start");
            if (overrides.serverStartFailure) {
              throw new Error("listen detail");
            }
          },
          async close() {
            calls.push("server.close");
            if (overrides.serverCloseFailure) {
              throw new Error("close detail");
            }
          },
        };
      },
    },
  );

  return { calls, service };
}

test("starts once and shuts HTTP before PostgreSQL exactly once", async () => {
  const testFixture = fixture();

  await testFixture.service.start();
  await testFixture.service.start();
  await testFixture.service.close();
  await testFixture.service.close();

  assert.deepEqual(testFixture.calls, [
    ["create", 3001],
    "server.start",
    "server.close",
    "runtime.close",
  ]);
  await assert.rejects(
    testFixture.service.start(),
    (error) =>
      error instanceof RailwayNodeServiceError &&
      error.code === "already-closed",
  );
});

test("closes the PostgreSQL runtime after a listen failure", async () => {
  const testFixture = fixture({ serverStartFailure: true });

  await assert.rejects(
    testFixture.service.start(),
    (error) =>
      error instanceof RailwayNodeServiceError &&
      error.code === "start-failed" &&
      !error.message.includes("listen detail"),
  );
  assert.deepEqual(testFixture.calls, [
    ["create", 3001],
    "server.start",
    "runtime.close",
  ]);
});

test("attempts both shutdown layers and returns one bounded failure", async () => {
  const testFixture = fixture({
    serverCloseFailure: true,
    runtimeCloseFailure: true,
  });
  await testFixture.service.start();

  await assert.rejects(
    testFixture.service.close(),
    (error) =>
      error instanceof RailwayNodeServiceError &&
      error.code === "shutdown-failed" &&
      !error.message.includes("detail"),
  );
  assert.deepEqual(testFixture.calls, [
    ["create", 3001],
    "server.start",
    "server.close",
    "runtime.close",
  ]);
});

test("rejects missing runtime ownership and extended options", () => {
  assert.throws(
    () =>
      createRailwayNodeService({
        port: 3001,
        runtime: {},
      }),
    (error) =>
      error instanceof RailwayNodeServiceError &&
      error.code === "options-invalid",
  );
  assert.throws(
    () =>
      createRailwayNodeService({
        port: 3001,
        runtime: {
          handler: { async handle() {} },
          readiness: { async check() {} },
          async close() {},
        },
        tenantId: 7,
      }),
    (error) =>
      error instanceof RailwayNodeServiceError &&
      error.code === "options-invalid",
  );
});
