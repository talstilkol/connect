import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayBotReplyStagingApiConfiguration,
} from "../server/platform/railwayBotReplyStagingApiConfiguration.ts";
import {
  inspectRailwayBotReplyStagingCrossServiceActivation,
  railwayBotReplyStagingCrossServiceActivationVersion,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";

function apiEnvironment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    BOT_REPLY_STAGING_ENABLED: "true",
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID: "clerk-user-tal",
    BOT_REPLY_STAGING_LEASE_DURATION_SECONDS: "600",
    BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS: "100",
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS: '["clerk-user-tal"]',
    ...overrides,
  };
}

function workerEnvironment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    BOT_REPLY_STAGING_ENABLED: "true",
    BOT_REPLY_STAGING_TENANT_ID: "7",
    PRIVATE_WORKER_SECRET: "must-not-leak",
    ...overrides,
  };
}

function workerReport(status = "quarantined") {
  return {
    schemaVersion: 2,
    preflightVersion:
      "connect-railway-bot-reply-staging-activation-preflight-v2",
    activationAllowed: false,
    status,
    code: status === "quarantined"
      ? "BOT_REPLY_STAGING_LEGACY_EXECUTION_QUARANTINED"
      : status === "disabled"
      ? "BOT_REPLY_STAGING_ACTIVATION_DISABLED"
      : "BOT_REPLY_STAGING_ACTIVATION_REQUIRED",
    passedCheckCount: status === "quarantined" ? 7 : 0,
    requiredCheckCount: 7,
    checks: [],
  };
}

function dependencies(workerStatus = "quarantined") {
  return {
    inspectApiConfiguration:
      inspectRailwayBotReplyStagingApiConfiguration,
    inspectWorkerActivation() {
      return workerReport(workerStatus);
    },
  };
}

test("keeps two explicitly disabled services separate from a failure", () => {
  const result = inspectRailwayBotReplyStagingCrossServiceActivation({
    apiEnvironment: { BOT_REPLY_STAGING_ENABLED: "false" },
    workerEnvironment: { BOT_REPLY_STAGING_ENABLED: "false" },
  });

  assert.equal(result.status, "disabled");
  assert.equal(result.code, "BOT_REPLY_STAGING_CROSS_SERVICE_DISABLED");
  assert.deepEqual(result.checks, []);
});

test("never authorizes cross-service activation through the legacy preflight", () => {
  const result = inspectRailwayBotReplyStagingCrossServiceActivation(
    {
      apiEnvironment: apiEnvironment(),
      workerEnvironment: workerEnvironment(),
    },
    undefined,
    dependencies(),
  );

  assert.deepEqual(result, {
    schemaVersion: 1,
    activationVersion:
      railwayBotReplyStagingCrossServiceActivationVersion,
    status: "blocked",
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_REQUIRED",
    passedCheckCount: 3,
    requiredCheckCount: 4,
    checks: [
      { id: "api-configuration", status: "passed" },
      { id: "worker-activation", status: "blocked" },
      { id: "runtime-environment-alignment", status: "passed" },
      { id: "tenant-alignment", status: "passed" },
    ],
  });
});

test("blocks a tenant mismatch without returning either tenant", () => {
  const result = inspectRailwayBotReplyStagingCrossServiceActivation(
    {
      apiEnvironment: apiEnvironment(),
      workerEnvironment: workerEnvironment({
        BOT_REPLY_STAGING_TENANT_ID: "8",
      }),
    },
    undefined,
    dependencies(),
  );

  assert.equal(result.status, "blocked");
  assert.equal(
    result.checks.find(({ id }) => id === "tenant-alignment").status,
    "blocked",
  );
  assert.doesNotMatch(JSON.stringify(result), /clerk-user|must-not-leak|7|8/);
});

test("blocks asymmetric activation and a failed Worker preflight", () => {
  for (const [api, worker, workerStatus] of [
    [
      { BOT_REPLY_STAGING_ENABLED: "false" },
      workerEnvironment(),
      "quarantined",
    ],
    [apiEnvironment(), workerEnvironment(), "blocked"],
  ]) {
    const result = inspectRailwayBotReplyStagingCrossServiceActivation(
      { apiEnvironment: api, workerEnvironment: worker },
      undefined,
      dependencies(workerStatus),
    );
    assert.equal(result.status, "blocked");
  }
});

test("uses the real Worker inspector and fails closed without its secrets", () => {
  const result = inspectRailwayBotReplyStagingCrossServiceActivation({
    apiEnvironment: apiEnvironment(),
    workerEnvironment: workerEnvironment(),
  });

  assert.equal(result.status, "blocked");
  assert.equal(
    result.checks.find(({ id }) => id === "worker-activation").status,
    "blocked",
  );
  assert.doesNotMatch(JSON.stringify(result), /must-not-leak|PRIVATE|secret/i);
});

test("rejects malformed input and altered dependencies with bounded output", () => {
  assert.equal(
    inspectRailwayBotReplyStagingCrossServiceActivation({
      apiEnvironment: {},
      workerEnvironment: {},
      extension: "must-not-leak",
    }).status,
    "blocked",
  );
  assert.throws(
    () => inspectRailwayBotReplyStagingCrossServiceActivation(
      { apiEnvironment: {}, workerEnvironment: {} },
      undefined,
      { ...dependencies(), extension: true },
    ),
    (error) =>
      error instanceof Error &&
      !error.message.includes("must-not-leak"),
  );
});
