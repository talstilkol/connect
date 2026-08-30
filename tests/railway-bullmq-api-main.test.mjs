import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RailwayBullMqApiMainError,
  startRailwayBullMqApiExecutable,
} from "../server/platform/railwayBullMqApiMain.ts";

function fixture(overrides = {}) {
  const calls = [];
  const controller = { async start() {}, async close() {} };
  const captured = {};
  const dependencies = {
    async startApi(input) {
      calls.push("api.start");
      captured.api = input;
      if (overrides.startFailure) {
        throw new Error("private startup detail");
      }
      return input.createRuntime({
        postgresTelemetry: { recordIdleClientError() {} },
      }).then(() => controller);
    },
    async createRuntime(input) {
      calls.push("runtime.create");
      captured.runtime = input;
      return {
        handler: { async handle() {} },
        metaWebhookHandler: { async handle() {} },
        readiness: { async check() {} },
        async close() {},
      };
    },
    createProcess() {
      return controller;
    },
    readNodeEnvironment() {
      return { PORT: "3001" };
    },
    readBullMqEnvironment() {
      calls.push("redis-environment.read");
      return { REDIS_URL: "redis://127.0.0.1:6379/0" };
    },
    readMetaWebhookEnvironment() {
      calls.push("meta-environment.read");
      return { META_APP_SECRET: "secret" };
    },
    readTelemetryEnvironment() {
      return overrides.telemetryEnvironment ?? {
        APP_RUNTIME_ENVIRONMENT: "production",
        APP_RELEASE_SHA: "a".repeat(40),
        BETTER_STACK_OTLP_LOGS_ENDPOINT:
          "https://in.logs.betterstack.com/v1/logs",
        BETTER_STACK_SOURCE_TOKEN: "bounded-source-token",
      };
    },
    readReleaseEvidenceEnvironment() {
      return overrides.releaseEvidenceEnvironment ?? {};
    },
    createTelemetryRuntime(configuration) {
      calls.push("telemetry.create");
      captured.telemetryConfiguration = configuration;
      const logger = {
        record(event) {
          captured.logEvents ??= [];
          captured.logEvents.push(event);
          return true;
        },
      };
      captured.telemetryLogger = logger;
      return {
        logger,
        async forceFlush() {
          captured.telemetryFlushes =
            (captured.telemetryFlushes ?? 0) + 1;
          return true;
        },
        async shutdown() {
          captured.telemetryShutdowns =
            (captured.telemetryShutdowns ?? 0) + 1;
          return true;
        },
      };
    },
  };
  return { calls, captured, controller, dependencies };
}

test("binds bounded process, Redis and Meta configuration to the provider API", async () => {
  const testFixture = fixture();
  const controller = await startRailwayBullMqApiExecutable(
    testFixture.dependencies,
  );
  assert.notEqual(controller, testFixture.controller);
  assert.deepEqual(testFixture.calls, [
    "telemetry.create",
    "api.start",
    "redis-environment.read",
    "meta-environment.read",
    "runtime.create",
  ]);
  assert.equal(
    testFixture.captured.runtime.bullMqEnvironment.REDIS_URL,
    "redis://127.0.0.1:6379/0",
  );
  assert.equal(
    testFixture.captured.runtime.metaWebhookEnvironment.META_APP_SECRET,
    "secret",
  );
  assert.equal(
    testFixture.captured.runtime.requestTelemetry,
    testFixture.captured.telemetryLogger,
  );
  assert.equal(testFixture.captured.runtime.botReplyStaging, undefined);
  assert.equal(
    testFixture.captured.runtime.botReplyStagingQueueTelemetry,
    undefined,
  );
  testFixture.captured.runtime.requestTelemetry.record({
    version: 1,
    service: "connect-railway-api",
    kind: "api-request",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 1,
    traceContext: null,
  });

  testFixture.captured.runtime.metaWebhookQueueTelemetry
    .recordConnectionFailure();
  testFixture.captured.runtime.metaWebhookQueueTelemetry
    .recordPublisherFailure();
  testFixture.captured.runtime.teamInvitationQueueTelemetry
    .recordConnectionFailure();
  testFixture.captured.runtime.teamInvitationQueueTelemetry
    .recordPublisherFailure();
  assert.deepEqual(testFixture.captured.logEvents, [
    {
      version: 1,
      service: "connect-railway-api",
      kind: "api-request",
      operation: "contacts.list",
      requestKind: "query",
      outcome: "ok",
      code: "OK",
      durationMilliseconds: 1,
      traceContext: null,
    },
    {
      version: 1,
      service: "connect-railway-api",
      kind: "api-signal",
      code: "meta-webhook-queue-connection-failure",
    },
    {
      version: 1,
      service: "connect-railway-api",
      kind: "api-signal",
      code: "meta-webhook-queue-publisher-failure",
    },
    {
      version: 1,
      service: "connect-railway-api",
      kind: "api-signal",
      code: "team-invitation-queue-connection-failure",
    },
    {
      version: 1,
      service: "connect-railway-api",
      kind: "api-signal",
      code: "team-invitation-queue-publisher-failure",
    },
  ]);
});

test("binds PostgreSQL release evidence identity without publishing JSON variables", async () => {
  const releaseEnvironment = {
    BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
    APP_RELEASE_ID: `connect_release_v1_${"a".repeat(64)}`,
    APP_DEPLOYED_COMMIT_SHA: "b".repeat(40),
    APP_DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"c".repeat(64)}`,
  };
  const testFixture = fixture({
    releaseEvidenceEnvironment: releaseEnvironment,
  });

  await startRailwayBullMqApiExecutable(testFixture.dependencies);

  assert.deepEqual(
    testFixture.captured.runtime.botReplyStagingReleaseEvidence,
    {
      environment: {
        BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
        APP_RELEASE_ID: releaseEnvironment.APP_RELEASE_ID,
        APP_DEPLOYED_COMMIT_SHA:
          releaseEnvironment.APP_DEPLOYED_COMMIT_SHA,
        APP_DEPLOYMENT_ARTIFACT_DIGEST:
          releaseEnvironment.APP_DEPLOYMENT_ARTIFACT_DIGEST,
      },
    },
  );
  assert.equal(
    Object.hasOwn(
      testFixture.captured.runtime
        .botReplyStagingReleaseEvidence.environment,
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON",
    ),
    false,
  );
});

test("fails closed before startup for an invalid release evidence store", async () => {
  const testFixture = fixture({
    releaseEvidenceEnvironment: {
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "POSTGRESQL",
    },
  });

  await assert.rejects(
    startRailwayBullMqApiExecutable(testFixture.dependencies),
    (error) =>
      error instanceof RailwayBullMqApiMainError &&
      error.code === "release-evidence-configuration-required",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("does not read legacy staging activation fields or compose a send path", async () => {
  const forbiddenKeys = new Set([
    "APP_RUNTIME_ENVIRONMENT",
    "BOT_REPLY_STAGING_ENABLED",
    "BOT_REPLY_STAGING_TENANT_ID",
    "BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID",
    "BOT_REPLY_STAGING_LEASE_DURATION_SECONDS",
    "BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS",
    "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  ]);
  let forbiddenReads = 0;
  const releaseEvidenceEnvironment = new Proxy({
    BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
    APP_RELEASE_ID: `connect_release_v1_${"a".repeat(64)}`,
    APP_DEPLOYED_COMMIT_SHA: "b".repeat(40),
    APP_DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"c".repeat(64)}`,
    APP_RUNTIME_ENVIRONMENT: "staging",
    BOT_REPLY_STAGING_ENABLED: "true",
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID: "clerk-user-tal",
    BOT_REPLY_STAGING_LEASE_DURATION_SECONDS: "600",
    BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS: "100",
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
      '["clerk-user-tal","clerk-user-backup"]',
  }, {
    get(target, property, receiver) {
      if (forbiddenKeys.has(property)) {
        forbiddenReads += 1;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const testFixture = fixture({ releaseEvidenceEnvironment });

  await startRailwayBullMqApiExecutable(testFixture.dependencies);

  assert.equal(forbiddenReads, 0);
  assert.equal(testFixture.captured.runtime.botReplyStaging, undefined);
  assert.equal(
    testFixture.captured.runtime.botReplyStagingQueueTelemetry,
    undefined,
  );
  assert.equal(testFixture.calls.includes("runtime.create"), true);
});

test("flushes and shuts down API telemetry exactly once", async () => {
  const testFixture = fixture();
  const controller = await startRailwayBullMqApiExecutable(
    testFixture.dependencies,
  );

  await controller.close();
  await controller.close();

  assert.equal(testFixture.captured.telemetryFlushes, 1);
  assert.equal(testFixture.captured.telemetryShutdowns, 1);
});

test("fails closed before API startup when production telemetry is missing", async () => {
  const testFixture = fixture({
    telemetryEnvironment: { APP_RUNTIME_ENVIRONMENT: "production" },
  });

  await assert.rejects(
    startRailwayBullMqApiExecutable(testFixture.dependencies),
    (error) =>
      error instanceof RailwayBullMqApiMainError &&
      error.code === "telemetry-configuration-required",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("rejects altered dependencies and bounds startup failure", async () => {
  await assert.rejects(
    startRailwayBullMqApiExecutable({
      ...fixture().dependencies,
      extension: true,
    }),
    (error) =>
      error instanceof RailwayBullMqApiMainError &&
      error.code === "dependencies-invalid",
  );
  await assert.rejects(
    startRailwayBullMqApiExecutable(
      fixture({ startFailure: true }).dependencies,
    ),
    (error) =>
      error instanceof RailwayBullMqApiMainError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
});

test("keeps the canonical and explicit BullMQ commands connected to the full executable", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const source = readFileSync(
    "scripts/start-railway-bullmq-api.mjs",
    "utf8",
  );
  const mainSource = readFileSync(
    "server/platform/railwayBullMqApiMain.ts",
    "utf8",
  );
  assert.equal(
    packageJson.scripts["start:railway-api:bullmq"],
    "node scripts/start-railway-bullmq-api.mjs",
  );
  assert.equal(
    packageJson.scripts["start:railway-api"],
    "node scripts/start-railway-bullmq-api.mjs",
  );
  assert.match(source, /startRailwayBullMqApiExecutable/);
  assert.match(source, /Railway BullMQ API startup failed/);
  assert.match(source, /process\.on\("SIGINT"/);
  assert.match(source, /process\.on\("SIGTERM"/);
  assert.match(source, /closeActiveController/);
  assert.match(mainSource, /createRailwayBullMqPostgresApiRuntime/);
  assert.match(mainSource, /botReplyStagingReleaseEvidence/);
  assert.match(mainSource, /readReleaseEvidenceEnvironment/);
  assert.doesNotMatch(
    mainSource,
    /BOT_REPLY_STAGING_ENABLED|BOT_REPLY_STAGING_TENANT_ID|BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID|BOT_REPLY_STAGING_LEASE_DURATION_SECONDS|BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS|botReplyStagingQueueTelemetry|inspectRailwayBotReplyStagingApiConfiguration|readBotReplyStagingEnvironment/,
  );
  assert.doesNotMatch(source, /REDIS_URL|META_APP_SECRET/);
});
