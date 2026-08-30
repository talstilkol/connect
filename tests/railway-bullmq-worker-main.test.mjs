import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RailwayBullMqWorkerMainError,
  startRailwayBullMqWorkerMain,
} from "../server/platform/railwayBullMqWorkerMain.ts";

const environment = Object.freeze({
  APP_RUNTIME_ENVIRONMENT: "production",
  APP_RELEASE_SHA: "a".repeat(40),
  BETTER_STACK_OTLP_LOGS_ENDPOINT:
    "https://in.logs.betterstack.com/v1/logs",
  BETTER_STACK_SOURCE_TOKEN: "bounded-source-token",
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "publishable-key",
  CLERK_SECRET_KEY: "secret-key",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  CLERK_INVITATION_RATE_LIMIT_POLICY_VERSION: "1",
  CLERK_INVITATION_RATE_LIMIT_CAPACITY: "125",
  CLERK_INVITATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "3600",
  NODE_ENV: "production",
});

function dependencies(overrides = {}) {
  const captured = { logEvents: [] };
  const controller = { async start() {}, async close() {} };
  const retryEvidenceSource = {
    isConfigured() {
      return true;
    },
    load() {
      return null;
    },
  };
  return {
    captured,
    controller,
    value: {
      async startWorker(options) {
        captured.options = options;
        if (overrides.startFailure) {
          throw new Error("private worker startup failure");
        }
        return controller;
      },
      readEnvironment() {
        if (overrides.environmentFailure) {
          throw new Error("private environment failure");
        }
        return Object.hasOwn(overrides, "environment")
          ? overrides.environment
          : environment;
      },
      createInvitationProviderFactory(configuration, policy) {
        captured.identityConfiguration = configuration;
        captured.rateLimitPolicy = policy;
        return overrides.createProvider ?? (() => ({
          isConfigured() {
            return true;
          },
          async invite() {
            return { status: "submitted" };
          },
          async lookup() {
            return { status: "submitted" };
          },
        }));
      },
      retryEvidenceSource:
        overrides.retryEvidenceSource ?? retryEvidenceSource,
      createTelemetryRuntime(configuration) {
        captured.telemetryConfiguration = configuration;
        return {
          logger: {
            record(event) {
              captured.logEvents.push(event);
              return true;
            },
          },
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
    },
  };
}

test("composes the four-queue worker from explicit identity and rate-limit policy", async () => {
  const fixture = dependencies();
  const controller = await startRailwayBullMqWorkerMain(fixture.value);

  assert.notEqual(controller, fixture.controller);
  assert.equal(typeof controller.close, "function");
  assert.equal(
    fixture.captured.telemetryConfiguration.status,
    "configured",
  );
  assert.equal(fixture.captured.options.environment, environment);
  assert.deepEqual(Object.keys(fixture.captured.options).sort(), [
    "campaignDeliveries",
    "environment",
    "messageTemplateSubmissions",
    "metaWebhooks",
    "teamInvitations",
    "telemetry",
  ]);
  assert.equal(
    fixture.captured.identityConfiguration.appPublicOrigin,
    "https://connect.example.com",
  );
  assert.deepEqual(fixture.captured.rateLimitPolicy, {
    policyId: "clerk-organization-invitation",
    policyVersion: 1,
    capacity: 125,
    refillPeriodSeconds: 3_600,
  });
  assert.equal(
    fixture.captured.options.campaignDeliveries.retryEvidenceSource,
    fixture.value.retryEvidenceSource,
  );
  assert.equal(
    fixture.captured.options.campaignDeliveries.telemetrySink,
    fixture.captured.options.metaWebhooks.telemetrySink,
  );
  assert.equal(
    fixture.captured.options.messageTemplateSubmissions.telemetrySink,
    fixture.captured.options.metaWebhooks.telemetrySink,
  );
  assert.equal(
    fixture.captured.options.teamInvitations.telemetrySink,
    fixture.captured.options.metaWebhooks.telemetrySink,
  );
  assert.equal(
    typeof fixture.captured.options.teamInvitations.createProvider,
    "function",
  );

  for (const section of [
    fixture.captured.options.campaignDeliveries,
    fixture.captured.options.messageTemplateSubmissions,
    fixture.captured.options.metaWebhooks,
    fixture.captured.options.teamInvitations,
  ]) {
    assert.equal(typeof section.queueTelemetry.recordConnectionFailure, "function");
    assert.equal(typeof section.queueTelemetry.recordDeadLetter, "function");
    assert.equal(
      typeof section.queueTelemetry.recordDeadLetterCleanup,
      "function",
    );
  }
});

test("flushes and shuts down Better Stack telemetry once with the worker", async () => {
  const fixture = dependencies();
  const controller = await startRailwayBullMqWorkerMain(fixture.value);

  await controller.close();
  await controller.close();

  assert.equal(fixture.captured.telemetryFlushes, 1);
  assert.equal(fixture.captured.telemetryShutdowns, 1);
});

test("never reads dormant bot staging dependencies even when they report ready 7/7", async () => {
  const accesses = [];
  const fixture = dependencies({
    environment: {
      ...environment,
      BOT_REPLY_STAGING_ENABLED: "true",
    },
  });
  const legacyDependencies = new Proxy(fixture.value, {
    get(target, property, receiver) {
      if (property === "inspectBotReplyStagingActivation") {
        accesses.push("preflight-read");
        return () => {
          accesses.push("preflight-call");
          return {
            status: "ready",
            passedCheckCount: 7,
            requiredCheckCount: 7,
          };
        };
      }
      if (property === "createBotReplyStagingDriverFactory") {
        accesses.push("factory-read");
        return () => {
          accesses.push("factory-call");
          throw new Error("dormant factory must not run");
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });

  await startRailwayBullMqWorkerMain(legacyDependencies);

  assert.deepEqual(accesses, []);
  assert.equal(
    Object.hasOwn(fixture.captured.options, "botReplyStaging"),
    false,
  );
  assert.equal(Object.hasOwn(fixture.captured.options, "botReplies"), false);
});

test("emits bounded scheduler and queue telemetry without configuration values", async () => {
  const fixture = dependencies();
  await startRailwayBullMqWorkerMain(fixture.value);

  fixture.captured.options.telemetry.recordSchedulerRunFailure();
  fixture.captured.options.teamInvitations.queueTelemetry
    .recordDeadLetter("invalid-envelope");

  assert.deepEqual(fixture.captured.logEvents, [
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "worker-signal",
      code: "scheduler-run-failure",
    },
    {
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue: "team-invitation",
      code: "dead-letter",
      reason: "invalid-envelope",
    },
  ]);
  assert.equal(
    JSON.stringify(fixture.captured.logEvents).includes("secret-key"),
    false,
  );
});

test("fails before worker startup when identity or Clerk policy is missing", async () => {
  for (const [missingKey, expectedCode] of [
    ["CLERK_SECRET_KEY", "identity-configuration-required"],
    [
      "CLERK_INVITATION_RATE_LIMIT_CAPACITY",
      "rate-limit-configuration-required",
    ],
  ]) {
    const incomplete = { ...environment };
    delete incomplete[missingKey];
    const fixture = dependencies({ environment: incomplete });

    await assert.rejects(
      startRailwayBullMqWorkerMain(fixture.value),
      (error) =>
        error instanceof RailwayBullMqWorkerMainError &&
        error.code === expectedCode,
    );
    assert.equal(fixture.captured.options, undefined);
  }
});

test("fails closed before worker startup when production telemetry is missing", async () => {
  const incomplete = { ...environment };
  delete incomplete.BETTER_STACK_SOURCE_TOKEN;
  const fixture = dependencies({ environment: incomplete });

  await assert.rejects(
    startRailwayBullMqWorkerMain(fixture.value),
    (error) =>
      error instanceof RailwayBullMqWorkerMainError &&
      error.code === "telemetry-configuration-required",
  );
  assert.equal(fixture.captured.options, undefined);
});

test("rejects unavailable dependencies and sanitizes private startup failures", async () => {
  const unavailableRetry = dependencies({
    retryEvidenceSource: {
      isConfigured() {
        return false;
      },
      load() {
        return null;
      },
    },
  });
  await assert.rejects(
    startRailwayBullMqWorkerMain(unavailableRetry.value),
    (error) =>
      error instanceof RailwayBullMqWorkerMainError &&
      error.code === "dependencies-invalid",
  );

  const throwingRetry = dependencies({
    retryEvidenceSource: {
      isConfigured() {
        throw new Error("private provider configuration failure");
      },
      load() {
        return null;
      },
    },
  });
  await assert.rejects(
    startRailwayBullMqWorkerMain(throwingRetry.value),
    (error) =>
      error instanceof RailwayBullMqWorkerMainError &&
      error.code === "dependencies-invalid" &&
      !error.message.includes("private"),
  );

  const invalidEnvironment = dependencies({ environment: null });
  await assert.rejects(
    startRailwayBullMqWorkerMain(invalidEnvironment.value),
    (error) =>
      error instanceof RailwayBullMqWorkerMainError &&
      error.code === "startup-failed",
  );

  const startupFailure = dependencies({ startFailure: true });
  await assert.rejects(
    startRailwayBullMqWorkerMain(startupFailure.value),
    (error) =>
      error instanceof RailwayBullMqWorkerMainError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
});

test("exposes one package command without embedding environment values", async () => {
  const packageJson = JSON.parse(await readFile(
    new URL("../package.json", import.meta.url),
    "utf8",
  ));
  const script = await readFile(
    new URL("../scripts/start-railway-bullmq-worker.mjs", import.meta.url),
    "utf8",
  );
  const environmentExample = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.equal(
    packageJson.scripts["start:railway-worker:bullmq"],
    "node scripts/start-railway-bullmq-worker.mjs",
  );
  assert.match(script, /startRailwayBullMqWorkerMain/);
  assert.match(script, /process\.on\("SIGINT"/);
  assert.match(script, /process\.on\("SIGTERM"/);
  assert.match(script, /closeActiveController/);
  assert.doesNotMatch(script, /DATABASE_URL=|REDIS_URL=|CLERK_SECRET_KEY=/);
  assert.match(
    environmentExample,
    /^RAILWAY_WORKER_SCHEDULER_OWNER_KEY=$/m,
  );
  for (const key of [
    "APP_RELEASE_SHA",
    "BETTER_STACK_OTLP_LOGS_ENDPOINT",
    "BETTER_STACK_SOURCE_TOKEN",
  ]) {
    assert.match(environmentExample, new RegExp(`^${key}=$`, "m"));
  }
});
