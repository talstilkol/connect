import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayBullMqConfiguration,
  railwayBullMqEnvironmentKeys,
} from "../server/platform/railwayBullMqConfiguration.ts";

function environment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "test",
    REDIS_URL: "redis://default:secret@127.0.0.1:6379/0",
    BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
    BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
    BULLMQ_FAILED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_COUNT: "2000",
    BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
    BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
    ...overrides,
  };
}

test("creates one isolated dual-stack BullMQ configuration", () => {
  const state = inspectRailwayBullMqConfiguration(environment());

  assert.equal(state.status, "configured");
  assert.equal(state.configuration.runtimeEnvironment, "test");
  assert.equal(state.configuration.prefix, "connect-test-v1");
  assert.deepEqual(state.configuration.connection, {
    url: "redis://default:secret@127.0.0.1:6379/0",
    family: 0,
    connectTimeout: 5000,
    keepAlive: 10000,
    noDelay: true,
  });
  assert.deepEqual(state.configuration.retention, {
    completedSeconds: 86400,
    completedCount: 1000,
    failedSeconds: 604800,
    failedCount: 2000,
    deadLetterSeconds: 2592000,
    deadLetterCleanBatchSize: 100,
  });
});

test("accepts authenticated Railway private Redis in production", () => {
  const state = inspectRailwayBullMqConfiguration(environment({
    APP_RUNTIME_ENVIRONMENT: "production",
    REDIS_URL:
      "redis://default:secret@redis.railway.internal:6379/0",
  }));

  assert.equal(state.status, "configured");
  assert.equal(state.configuration.prefix, "connect-production-v1");
});

test("fails closed when BullMQ configuration is absent or partial", () => {
  assert.deepEqual(inspectRailwayBullMqConfiguration({}), {
    status: "disabled",
    missingKeys: railwayBullMqEnvironmentKeys,
    invalidKeys: [],
    configuration: null,
  });

  const partial = inspectRailwayBullMqConfiguration({
    APP_RUNTIME_ENVIRONMENT: "test",
  });
  assert.equal(partial.status, "incomplete");
  assert.equal(partial.missingKeys.includes("REDIS_URL"), true);
  assert.equal(partial.configuration, null);
});

test("rejects public production Redis, URL extensions and missing credentials", () => {
  for (const REDIS_URL of [
    "redis://default:secret@127.0.0.1:6379/0",
    "redis://default:secret@public.example.com:6379/0",
    "rediss://default:secret@public.example.com:6379/0",
    "redis://redis.railway.internal:6379/0",
    "redis://default:secret@redis.railway.internal:6379/1",
    "redis://default:secret@redis.railway.internal:6379/0?family=0",
  ]) {
    const state = inspectRailwayBullMqConfiguration(environment({
      APP_RUNTIME_ENVIRONMENT: "production",
      REDIS_URL,
    }));
    assert.equal(state.status, "invalid");
    assert.deepEqual(state.invalidKeys, ["REDIS_URL"]);
    assert.equal(JSON.stringify(state).includes("secret"), false);
  }
});

test("rejects invalid retention values and unsafe retention ordering", () => {
  const scenarios = [
    ["BULLMQ_COMPLETED_RETENTION_SECONDS", "0"],
    ["BULLMQ_COMPLETED_RETENTION_COUNT", "1.5"],
    ["BULLMQ_FAILED_RETENTION_SECONDS", "3599"],
    ["BULLMQ_FAILED_RETENTION_COUNT", "-1"],
    ["BULLMQ_DLQ_RETENTION_SECONDS", "86399"],
    ["BULLMQ_DLQ_CLEAN_BATCH_SIZE", "10001"],
  ];

  for (const [key, value] of scenarios) {
    const state = inspectRailwayBullMqConfiguration(environment({
      [key]: value,
    }));
    assert.equal(state.status, "invalid");
    assert.equal(state.invalidKeys.includes(key), true);
  }

  const reversed = inspectRailwayBullMqConfiguration(environment({
    BULLMQ_COMPLETED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_SECONDS: "86400",
  }));
  assert.equal(reversed.status, "invalid");
  assert.equal(
    reversed.invalidKeys.includes("BULLMQ_FAILED_RETENTION_SECONDS"),
    true,
  );
});

test("rejects unknown configuration fields without reflecting their values", () => {
  const state = inspectRailwayBullMqConfiguration({
    ...environment(),
    PRIVATE_EXTENSION: "must-not-leak",
  });

  assert.equal(state.status, "invalid");
  assert.equal(state.configuration, null);
  assert.equal(JSON.stringify(state).includes("must-not-leak"), false);
});
