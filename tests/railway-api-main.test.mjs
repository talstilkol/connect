import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RailwayApiMainError,
  startRailwayApiExecutable,
} from "../server/platform/railwayApiMain.ts";
import {
  requireLocalStartupRehearsalUrl,
  requireStartupRehearsalPort,
} from "../scripts/verify-railway-api-startup.mjs";

function runtime(calls, overrides = {}) {
  return {
    handler: { async handle() {} },
    readiness: { async check() { return { status: "ready" }; } },
    async close() {
      calls.push("runtime.close");
      if (overrides.closeFailure) {
        throw new Error("runtime close detail");
      }
    },
  };
}

function fixture(overrides = {}) {
  const calls = [];
  const ownedRuntime = runtime(calls, overrides);
  let telemetry = null;
  const controller = {
    async start() {
      calls.push("process.start");
      if (overrides.startFailure) {
        throw new Error("process start detail");
      }
    },
    async close() {
      calls.push("process.close");
    },
  };
  const dependencies = {
    readEnvironment() {
      calls.push("environment.read");
      if (overrides.environmentFailure) {
        throw new Error("environment detail");
      }
      return overrides.environment ?? { PORT: "3001" };
    },
    async createRuntime(options) {
      calls.push("runtime.create");
      telemetry = options.postgresTelemetry;
      if (overrides.runtimeFailure) {
        throw new Error("runtime create detail");
      }
      return ownedRuntime;
    },
    createProcess(options) {
      calls.push(["process.create", options.environment.PORT]);
      assert.equal(options.runtime, ownedRuntime);
      if (overrides.processFailure) {
        throw new Error("process create detail");
      }
      return controller;
    },
    recordIdleClientError() {
      calls.push("postgres.idle-client-failure");
      if (overrides.telemetryFailure) {
        throw new Error("telemetry detail");
      }
    },
  };

  return {
    calls,
    controller,
    dependencies,
    get telemetry() {
      return telemetry;
    },
  };
}

test("composes and starts the Railway process after validating PORT", async () => {
  const testFixture = fixture();

  assert.equal(
    await startRailwayApiExecutable(testFixture.dependencies),
    testFixture.controller,
  );
  testFixture.telemetry.recordIdleClientError();

  assert.deepEqual(testFixture.calls, [
    "environment.read",
    "runtime.create",
    ["process.create", "3001"],
    "process.start",
    "postgres.idle-client-failure",
  ]);
});

test("rejects invalid or absent PORT before creating PostgreSQL", async () => {
  for (const [environment, code] of [
    [{}, "configuration-disabled"],
    [{ PORT: "03001" }, "configuration-invalid"],
    [{ PORT: "3001", HOST: "attacker.example" }, "configuration-invalid"],
  ]) {
    const testFixture = fixture({ environment });
    await assert.rejects(
      startRailwayApiExecutable(testFixture.dependencies),
      (error) => (
        error instanceof RailwayApiMainError && error.code === code
      ),
    );
    assert.deepEqual(testFixture.calls, ["environment.read"]);
  }
});

test("closes an owned runtime after process construction or start fails", async () => {
  for (const overrides of [
    { processFailure: true },
    { startFailure: true },
    { startFailure: true, closeFailure: true },
  ]) {
    const testFixture = fixture(overrides);
    await assert.rejects(
      startRailwayApiExecutable(testFixture.dependencies),
      (error) => (
        error instanceof RailwayApiMainError &&
        error.code === "startup-failed" &&
        !error.message.includes("detail")
      ),
    );
    assert.equal(testFixture.calls.includes("runtime.close"), true);
  }
});

test("bounds environment, runtime, and telemetry failures", async () => {
  for (const overrides of [
    { environmentFailure: true },
    { runtimeFailure: true },
  ]) {
    const testFixture = fixture(overrides);
    await assert.rejects(
      startRailwayApiExecutable(testFixture.dependencies),
      (error) => (
        error instanceof RailwayApiMainError &&
        error.code === "startup-failed" &&
        !error.message.includes("detail")
      ),
    );
  }

  const telemetryFixture = fixture({ telemetryFailure: true });
  await startRailwayApiExecutable(telemetryFixture.dependencies);
  assert.doesNotThrow(
    () => telemetryFixture.telemetry.recordIdleClientError(),
  );
});

test("rejects an extended dependency surface", async () => {
  const testFixture = fixture();
  await assert.rejects(
    startRailwayApiExecutable({
      ...testFixture.dependencies,
      tenantId: 7,
    }),
    (error) => (
      error instanceof RailwayApiMainError &&
      error.code === "dependencies-invalid"
    ),
  );
  assert.deepEqual(testFixture.calls, []);
});

test("keeps the PostgreSQL-only command connected to the bounded executable", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const source = readFileSync("scripts/start-railway-api.mjs", "utf8");

  assert.equal(
    packageJson.scripts["start:railway-api:postgres-only"],
    "node scripts/start-railway-api.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:railway-api-startup"],
    "node scripts/verify-railway-api-startup.mjs",
  );
  assert.match(source, /startRailwayApiExecutable/);
  assert.match(source, /Railway API startup failed/);
  assert.doesNotMatch(source, /DATABASE_URL|CLERK_SECRET_KEY/);
});

test("restricts startup rehearsal to separate local ports and database", () => {
  const databaseUrl = requireLocalStartupRehearsalUrl(
    "postgresql://127.0.0.1:55439/connect_startup_rehearsal",
  );
  assert.equal(requireStartupRehearsalPort("55440", databaseUrl), 55440);

  for (const invalidUrl of [
    "postgresql://database.example:55439/connect_startup_rehearsal",
    "postgresql://tal:x@127.0.0.1:55439/connect_startup_rehearsal",
    "postgresql://127.0.0.1:55439/connect_driver_integration",
  ]) {
    assert.throws(
      () => requireLocalStartupRehearsalUrl(invalidUrl),
      /RAILWAY_API_STARTUP_REHEARSAL_URL_INVALID/,
    );
  }
  for (const invalidPort of ["", "055440", "55439", "65536"]) {
    assert.throws(
      () => requireStartupRehearsalPort(invalidPort, databaseUrl),
      /RAILWAY_API_STARTUP_REHEARSAL_PORT_INVALID/,
    );
  }
});
