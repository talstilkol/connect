import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createRailwayBullMqPostgresApiRuntime,
  RailwayBullMqPostgresApiRuntimeError,
} from "../server/platform/railwayBullMqPostgresApiRuntime.ts";

function options(overrides = {}) {
  return {
    postgresTelemetry: { recordIdleClientError() {} },
    bullMqEnvironment: {
      APP_RUNTIME_ENVIRONMENT: "test",
      REDIS_URL: "redis://127.0.0.1:6379/0",
      BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
      BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
      BULLMQ_FAILED_RETENTION_SECONDS: "604800",
      BULLMQ_FAILED_RETENTION_COUNT: "2000",
      BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
      BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
    },
    metaWebhookEnvironment: {
      META_APP_SECRET: "app-secret",
      META_WEBHOOK_VERIFY_TOKEN: "verify-token",
      META_WEBHOOK_RATE_LIMIT_POLICY_VERSION: "1",
      META_WEBHOOK_RATE_LIMIT_CAPACITY: "960",
      META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS: "1",
    },
    metaWebhookQueueTelemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
    teamInvitationQueueTelemetry: {
      recordConnectionFailure() {},
      recordPublisherFailure() {},
    },
    ...overrides,
  };
}

function fixture(overrides = {}) {
  const calls = [];
  const queue = { async publish() {} };
  const metaWebhookPublisher = {
    queue,
    async start() {
      calls.push("meta-publisher.start");
      if (overrides.metaPublisherStartFailure) {
        throw new Error("private Redis startup detail");
      }
    },
    async close() {
      calls.push("meta-publisher.close");
      if (overrides.metaPublisherCloseFailure) {
        throw new Error("private Redis shutdown detail");
      }
    },
  };
  const invitationPublisher = { async publish() {} };
  const teamInvitationPublisher = {
    publisher: invitationPublisher,
    async start() {
      calls.push("invitation-publisher.start");
      if (overrides.invitationPublisherStartFailure) {
        throw new Error("private Redis invitation startup detail");
      }
    },
    async close() {
      calls.push("invitation-publisher.close");
      if (overrides.invitationPublisherCloseFailure) {
        throw new Error("private Redis invitation shutdown detail");
      }
    },
  };
  const api = {
    handler: { async handle() {} },
    metaWebhookHandler: { async handle() {} },
    readiness: { async check() {} },
    async close() {
      calls.push("api.close");
      if (overrides.apiCloseFailure) {
        throw new Error("private PostgreSQL shutdown detail");
      }
    },
  };
  const captured = {};
  return {
    calls,
    captured,
    metaWebhookPublisher,
    teamInvitationPublisher,
    api,
    dependencies: {
      createMetaWebhookPublisherRuntime(input) {
        captured.metaWebhookPublisher = input;
        return metaWebhookPublisher;
      },
      createTeamInvitationPublisherRuntime(input) {
        captured.teamInvitationPublisher = input;
        return teamInvitationPublisher;
      },
      async createApiRuntime(input) {
        calls.push("api.create");
        captured.api = input;
        if (overrides.apiStartFailure) {
          throw new Error("private PostgreSQL startup detail");
        }
        return api;
      },
    },
  };
}

test("proves Redis ready before exposing the Meta-enabled PostgreSQL API", async () => {
  const testFixture = fixture();
  const runtimeOptions = options();
  const runtime = await createRailwayBullMqPostgresApiRuntime(
    runtimeOptions,
    testFixture.dependencies,
  );

  assert.deepEqual(testFixture.calls, [
    "meta-publisher.start",
    "invitation-publisher.start",
    "api.create",
  ]);
  assert.equal(
    testFixture.captured.metaWebhookPublisher.environment,
    runtimeOptions.bullMqEnvironment,
  );
  assert.equal(
    testFixture.captured.teamInvitationPublisher.environment,
    runtimeOptions.bullMqEnvironment,
  );
  assert.equal(
    testFixture.captured.api.metaWebhook.environment,
    runtimeOptions.metaWebhookEnvironment,
  );
  assert.equal(
    testFixture.captured.api.metaWebhook.queue,
    testFixture.metaWebhookPublisher.queue,
  );
  assert.equal(
    testFixture.captured.api.teamInvitationPublisher,
    testFixture.teamInvitationPublisher.publisher,
  );
  assert.equal(
    Object.hasOwn(testFixture.captured.api, "bullMqEnvironment"),
    false,
  );
  assert.equal(
    Object.hasOwn(testFixture.captured.api, "botReplyStaging"),
    false,
  );
  assert.equal(
    Object.hasOwn(testFixture.captured.api, "botReplyStagingQueueTelemetry"),
    false,
  );
  assert.equal(runtime.metaWebhookHandler, testFixture.api.metaWebhookHandler);

  await runtime.close();
  await runtime.close();
  assert.deepEqual(testFixture.calls, [
    "meta-publisher.start",
    "invitation-publisher.start",
    "api.create",
    "meta-publisher.close",
    "invitation-publisher.close",
    "api.close",
  ]);
});

test("cleans Redis after API composition failure and bounds private detail", async () => {
  const testFixture = fixture({ apiStartFailure: true });
  await assert.rejects(
    createRailwayBullMqPostgresApiRuntime(
      options(),
      testFixture.dependencies,
    ),
    (error) =>
      error instanceof RailwayBullMqPostgresApiRuntimeError &&
      error.code === "startup-failed" &&
      !error.message.includes("private"),
  );
  assert.deepEqual(testFixture.calls, [
    "meta-publisher.start",
    "invitation-publisher.start",
    "api.create",
    "meta-publisher.close",
    "invitation-publisher.close",
  ]);
});

test("passes release evidence configuration only to the PostgreSQL API", async () => {
  const testFixture = fixture();
  const releaseEvidence = {
    environment: {
      BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
      APP_RELEASE_ID: `connect_release_v1_${"a".repeat(64)}`,
      APP_DEPLOYED_COMMIT_SHA: "b".repeat(40),
      APP_DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"c".repeat(64)}`,
    },
  };
  const runtime = await createRailwayBullMqPostgresApiRuntime(
    options({ botReplyStagingReleaseEvidence: releaseEvidence }),
    testFixture.dependencies,
  );

  assert.equal(
    testFixture.captured.api.botReplyStagingReleaseEvidence,
    releaseEvidence,
  );
  assert.equal(
    Object.hasOwn(
      testFixture.captured.metaWebhookPublisher,
      "botReplyStagingReleaseEvidence",
    ),
    false,
  );
  await runtime.close();
});

test("rejects legacy staging options before I/O and never resolves its publisher factory", async () => {
  for (const forbiddenKeys of [
    ["botReplyStaging"],
    ["botReplyStagingQueueTelemetry"],
    ["botReplyStaging", "botReplyStagingQueueTelemetry"],
  ]) {
    const testFixture = fixture();
    let forbiddenOptionReads = 0;
    const runtimeOptions = options();
    for (const key of forbiddenKeys) {
      Object.defineProperty(runtimeOptions, key, {
        enumerable: true,
        get() {
          forbiddenOptionReads += 1;
          throw new Error("legacy staging option must not be read");
        },
      });
    }

    await assert.rejects(
      createRailwayBullMqPostgresApiRuntime(
        runtimeOptions,
        testFixture.dependencies,
      ),
      (error) =>
        error instanceof RailwayBullMqPostgresApiRuntimeError &&
        error.code === "options-invalid",
    );
    assert.equal(forbiddenOptionReads, 0);
    assert.deepEqual(testFixture.calls, []);
    assert.deepEqual(testFixture.captured, {});
  }

  const testFixture = fixture();
  let legacyFactoryReads = 0;
  const dependencies = new Proxy(testFixture.dependencies, {
    get(target, property, receiver) {
      if (property === "createBotReplyStagingPublisherRuntime") {
        legacyFactoryReads += 1;
        throw new Error("legacy staging factory must remain unreachable");
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const runtime = await createRailwayBullMqPostgresApiRuntime(
    options(),
    dependencies,
  );
  assert.equal(legacyFactoryReads, 0);
  assert.deepEqual(testFixture.calls.slice(0, 3), [
    "meta-publisher.start",
    "invitation-publisher.start",
    "api.create",
  ]);
  await runtime.close();
});

test("attempts both shutdowns and rejects malformed provider composition", async () => {
  const testFixture = fixture({
    metaPublisherCloseFailure: true,
    invitationPublisherCloseFailure: true,
    apiCloseFailure: true,
  });
  const runtime = await createRailwayBullMqPostgresApiRuntime(
    options(),
    testFixture.dependencies,
  );
  await assert.rejects(
    runtime.close(),
    (error) =>
      error instanceof RailwayBullMqPostgresApiRuntimeError &&
      error.code === "shutdown-failed" &&
      !error.message.includes("private"),
  );
  assert.equal(testFixture.calls.includes("meta-publisher.close"), true);
  assert.equal(testFixture.calls.includes("invitation-publisher.close"), true);
  assert.equal(testFixture.calls.includes("api.close"), true);

  await assert.rejects(
    createRailwayBullMqPostgresApiRuntime({}, fixture().dependencies),
    (error) =>
      error instanceof RailwayBullMqPostgresApiRuntimeError &&
      error.code === "options-invalid",
  );
  await assert.rejects(
    createRailwayBullMqPostgresApiRuntime(
      options(),
      { ...fixture().dependencies, extension: true },
    ),
    (error) =>
      error instanceof RailwayBullMqPostgresApiRuntimeError &&
      error.code === "dependencies-invalid",
  );
});

test("has no static import or option surface for the legacy staging publisher", () => {
  const source = readFileSync(
    "server/platform/railwayBullMqPostgresApiRuntime.ts",
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /railwayBullMqBotReplyStagingQueue|createRailwayBullMqBotReplyStagingPublisherRuntime|createBotReplyStagingPublisherRuntime|botReplyStagingQueueTelemetry/,
  );
});
