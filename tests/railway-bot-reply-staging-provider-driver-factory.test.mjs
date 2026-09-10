import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBotReplyStagingProviderDriverFactory,
} from "../server/platform/railwayBotReplyStagingProviderDriverFactory.ts";

const validKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;

const caseRequirements = [
  ["text-send", "text-send"],
  ["button-send", "button-send"],
  ["button-reply", "button-send"],
  ["status-sent", "button-send"],
  ["status-delivered", "button-send"],
  ["status-read", "button-send"],
  ["customer-window-expired", "customer-window-expired"],
  ["provider-retry", "provider-retry"],
  ["pair-limit", "pair-limit"],
  ["duplicate-safety", "duplicate-safety"],
  ["kill-switch", "kill-switch"],
];

function delivery(index, buttons = false) {
  const digit = ((index % 9) + 1).toString();
  return {
    conversationKey: `conversation_v1_${digit.repeat(64)}`,
    inboundMessageKey: `message_v1_${digit.repeat(64)}`,
    botFlowKey: `bot_flow_v1_${digit.repeat(64)}`,
    botFlowVersionKey: `bot_flow_version_v1_${digit.repeat(64)}`,
    replyIndex: index + 1,
    senderPhoneNumberId: "123456789",
    reply: buttons
      ? {
          kind: "buttons",
          text: "בחר פעולה מאושרת",
          options: [{
            optionKey: `bot_option_v1_${"f".repeat(64)}`,
            label: "אישור",
          }],
        }
      : { kind: "text", text: `בדיקה מאושרת ${index + 1}` },
  };
}

function privateInventory() {
  const buttonDelivery = delivery(1, true);
  return {
    schemaVersion: 1,
    source: "private-staging-inventory",
    environment: "staging",
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion: "v24.0",
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    preparedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-21T15:00:00.000Z",
    cases: caseRequirements.map(([caseName, subjectCaseName], index) => ({
      caseName,
      subjectCaseName,
      recipientPhoneNumber: "+972501111111",
      delivery: subjectCaseName === "button-send"
        ? structuredClone(buttonDelivery)
        : delivery(index),
    })),
  };
}

function validEnvironment() {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    META_GRAPH_API_VERSION: "v24.0",
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_PRIVATE_CASES_JSON: JSON.stringify(privateInventory()),
    BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: validKey,
    BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1: validKey,
  };
}

function graphObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async readAssets() {},
    async readThroughput() {},
  };
}

function durableObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async readScenario() {},
    async readProviderRetry() {},
    async readPairLimit() {},
    async readDuplicateSafety() {},
    async readKillSwitch() {},
  };
}

function securityObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async readCredentialBoundary() {},
    async readRedaction() {},
  };
}

function webhookObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async recordStatus() {},
  };
}

function providerDeferralObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async recordDeferral() {},
  };
}

function sendObservations(configured = true) {
  return {
    isConfigured() {
      return configured;
    },
    async recordAcceptedSend() {},
    async recordButtonReply() {},
    async recordDuplicateSafety() {},
    async recordKillSwitch() {},
    async recordServiceWindowRejection() {},
  };
}

function options(overrides = {}) {
  return {
    environment: validEnvironment(),
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  return {
    deliveryWorker: {
      isConfigured() {
        return true;
      },
      async dispatch() {
        throw new Error("No live delivery was requested");
      },
    },
    deliveries: {
      async stage() {
        throw new Error("No live delivery was staged");
      },
    },
    graphObservations: graphObservations(),
    securityObservations: securityObservations(),
    durableObservations: durableObservations(),
    webhookObservations: webhookObservations(),
    providerDeferralObservations: providerDeferralObservations(),
    sendObservations: sendObservations(),
    killSwitch: {
      isConfigured() {
        return true;
      },
      async disable() {
        throw new Error("No live kill switch was requested");
      },
    },
    serviceWindows: {
      isConfigured() {
        return true;
      },
      async read() {
        throw new Error("No live service window was requested");
      },
    },
    clock: {
      now() {
        return new Date("2026-08-21T13:30:00.000Z");
      },
    },
    ...overrides,
  };
}

test("composes the provider driver from explicit live-only ports", () => {
  const factory = createRailwayBotReplyStagingProviderDriverFactory(
    options(),
  );
  const driver = factory(dependencies());
  assert.deepEqual(Object.keys(driver).sort(), [
    "executeScenario",
    "inspectAssets",
    "inspectThroughput",
    "verifyCredentialBoundary",
    "verifyDuplicateSafety",
    "verifyKillSwitch",
    "verifyPairLimit",
    "verifyProviderRetry",
    "verifyRedaction",
  ]);
  assert.ok(Object.isFrozen(driver));
});

test("rejects a missing HMAC key or unavailable provider port", () => {
  assert.throws(
    () => createRailwayBotReplyStagingProviderDriverFactory(options({
      environment: {},
    })),
    /provider driver is unavailable/,
  );
  assert.throws(
    () => createRailwayBotReplyStagingProviderDriverFactory(options())(
      dependencies({ graphObservations: graphObservations(false) }),
    ),
    /provider driver is unavailable/,
  );
  assert.throws(
    () => createRailwayBotReplyStagingProviderDriverFactory(options())(
      dependencies({ securityObservations: securityObservations(false) }),
    ),
    /provider driver is unavailable/,
  );
  const factory = createRailwayBotReplyStagingProviderDriverFactory(options({
    environment: {
      ...validEnvironment(),
      BOT_REPLY_STAGING_PRIVATE_CASES_JSON: "",
    },
  }));
  assert.throws(
    () => factory(dependencies()),
    /provider driver is unavailable/,
  );
});
