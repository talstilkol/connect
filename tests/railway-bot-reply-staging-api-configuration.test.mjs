import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayBotReplyStagingApiConfiguration,
  railwayBotReplyStagingApiEnvironmentKeys,
} from "../server/platform/railwayBotReplyStagingApiConfiguration.ts";

function environment(overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    BOT_REPLY_STAGING_ENABLED: "true",
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID: "clerk-user-tal",
    BOT_REPLY_STAGING_LEASE_DURATION_SECONDS: "600",
    BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS: "100",
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
      '["clerk-user-tal","clerk-user-backup"]',
    ...overrides,
  };
}

test("keeps Bot reply staging API disabled without an exact opt-in", () => {
  for (const BOT_REPLY_STAGING_ENABLED of [undefined, "", "false"]) {
    assert.deepEqual(
      inspectRailwayBotReplyStagingApiConfiguration({
        BOT_REPLY_STAGING_ENABLED,
      }),
      {
        status: "disabled",
        missingKeys: [],
        invalidKeys: [],
        configuration: null,
      },
    );
  }
});

test("binds one explicit staging tenant and Tal identity", () => {
  assert.deepEqual(
    inspectRailwayBotReplyStagingApiConfiguration(environment()),
    {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        stagingTenantId: 7,
        talExternalUserId: "clerk-user-tal",
        leaseDurationSeconds: 600,
        pollIntervalMilliseconds: 100,
      },
    },
  );
});

test("fails closed when an opted-in configuration is incomplete", () => {
  const state = inspectRailwayBotReplyStagingApiConfiguration({
    BOT_REPLY_STAGING_ENABLED: "true",
  });

  assert.equal(state.status, "incomplete");
  assert.equal(
    state.missingKeys.includes("BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID"),
    true,
  );
  assert.equal(state.configuration, null);
});

test("rejects unsafe bounds, non-staging activation and a non-admin Tal", () => {
  const scenarios = [
    ["APP_RUNTIME_ENVIRONMENT", "production"],
    ["BOT_REPLY_STAGING_ENABLED", "TRUE"],
    ["BOT_REPLY_STAGING_TENANT_ID", "0"],
    ["BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID", " clerk-user-tal"],
    ["BOT_REPLY_STAGING_LEASE_DURATION_SECONDS", "59"],
    ["BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS", "5001"],
    ["CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS", '["clerk-user-backup"]'],
  ];

  for (const [key, value] of scenarios) {
    const state = inspectRailwayBotReplyStagingApiConfiguration(
      environment({ [key]: value }),
    );
    assert.equal(state.status, "invalid");
    assert.equal(state.invalidKeys.includes(key), true);
    assert.equal(state.configuration, null);
  }
});

test("rejects extension fields without reflecting their values", () => {
  const state = inspectRailwayBotReplyStagingApiConfiguration({
    ...environment(),
    PRIVATE_EXTENSION: "must-not-leak",
  });

  assert.equal(state.status, "invalid");
  assert.deepEqual(state.invalidKeys, railwayBotReplyStagingApiEnvironmentKeys);
  assert.equal(JSON.stringify(state).includes("must-not-leak"), false);
});
