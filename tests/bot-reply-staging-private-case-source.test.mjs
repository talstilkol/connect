import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  botReplyStagingPrivateCaseSourceVersion,
  createBotReplyStagingPrivateCaseSource,
} from "../server/operations/botReplyStagingPrivateCaseSource.ts";

const releaseId = `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest = `sha256:${"c".repeat(64)}`;
const graphApiVersion = "v24.0";
const validHmacKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
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

function cases() {
  const buttonDelivery = delivery(1, true);
  return caseRequirements.map(([caseName, subjectCaseName], index) => ({
    caseName,
    subjectCaseName,
    recipientPhoneNumber: "+972501111111",
    delivery: subjectCaseName === "button-send"
      ? structuredClone(buttonDelivery)
      : delivery(index),
  }));
}

function inventory(overrides = {}) {
  return {
    schemaVersion: 1,
    source: "private-staging-inventory",
    environment: "staging",
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    preparedAt: "2026-08-21T13:00:00.000Z",
    expiresAt: "2026-08-21T15:00:00.000Z",
    cases: cases(),
    ...overrides,
  };
}

function environment(value = inventory(), overrides = {}) {
  return {
    APP_RUNTIME_ENVIRONMENT: "staging",
    APP_RELEASE_ID: releaseId,
    APP_DEPLOYED_COMMIT_SHA: commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: artifactDigest,
    META_GRAPH_API_VERSION: graphApiVersion,
    BOT_REPLY_STAGING_TENANT_ID: "7",
    BOT_REPLY_STAGING_PRIVATE_CASES_JSON: JSON.stringify(value),
    BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: validHmacKey,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    caseName: "text-send",
    runKey: `bot_reply_staging_run_v1_${"1".repeat(64)}`,
    operationKey: `bot_reply_staging_step_v1_${"2".repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${"3".repeat(64)}`,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    releaseId,
    commitSha,
    artifactDigest,
    graphApiVersion,
    recipientFingerprint: `sha256:${"4".repeat(64)}`,
    claimVersion: 2,
    leaseExpiresAt: "2026-08-21T14:00:00.000Z",
    ...overrides,
  };
}

function clock(now = "2026-08-21T13:30:00.000Z") {
  return { now: () => new Date(now) };
}

test("loads an exact release-bound private case from the staging secret", async () => {
  const source = createBotReplyStagingPrivateCaseSource(
    environment(),
    clock(),
  );
  assert.equal(source.isConfigured(), true);
  const resolved = await source.resolve(request());
  assert.equal(resolved.source, "private-staging-inventory");
  assert.equal(resolved.releaseId, releaseId);
  assert.equal(resolved.commitSha, commitSha);
  assert.equal(resolved.artifactDigest, artifactDigest);
  assert.equal(resolved.graphApiVersion, graphApiVersion);
  assert.equal(resolved.inventoryExpiresAt, "2026-08-21T15:00:00.000Z");
  assert.match(resolved.caseFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(resolved.recipientPhoneNumber, "+972501111111");
  assert.ok(Object.isFrozen(resolved));
  assert.ok(Object.isFrozen(resolved.delivery));
  assert.equal(
    botReplyStagingPrivateCaseSourceVersion,
    "connect-bot-reply-staging-private-case-source-v1",
  );
});

test("fails closed outside staging or when release identity differs", async () => {
  for (const candidate of [
    environment(inventory(), { APP_RUNTIME_ENVIRONMENT: "production" }),
    environment(inventory(), { APP_RELEASE_ID: `connect_release_v1_${"9".repeat(64)}` }),
    environment(inventory(), { META_GRAPH_API_VERSION: "v25.0" }),
    environment(inventory(), { BOT_REPLY_STAGING_TENANT_ID: "8" }),
    environment(inventory(), { BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: "invalid" }),
  ]) {
    const source = createBotReplyStagingPrivateCaseSource(candidate, clock());
    assert.equal(source.isConfigured(), false);
    await assert.rejects(
      () => source.resolve(request()),
      /private case is unavailable/,
    );
  }
});

test("expires the entire source and refuses a lease beyond the inventory", async () => {
  const activeSource = createBotReplyStagingPrivateCaseSource(
    environment(),
    clock(),
  );
  await assert.rejects(
    () => activeSource.resolve(request({
      leaseExpiresAt: "2026-08-21T15:00:00.001Z",
    })),
    /private case is unavailable/,
  );
  const expiredSource = createBotReplyStagingPrivateCaseSource(
    environment(),
    clock("2026-08-21T15:00:00.000Z"),
  );
  assert.equal(expiredSource.isConfigured(), false);
});

test("rejects extension fields, long-lived inventories and subject drift", () => {
  const extended = inventory({ unexpectedCredential: "forbidden" });
  const longLived = inventory({ expiresAt: "2026-08-21T15:00:00.001Z" });
  const driftedCases = cases();
  driftedCases[3].delivery.reply.text = "תוכן שאינו שייך ל-button-send";
  for (const candidate of [
    extended,
    longLived,
    inventory({ cases: driftedCases }),
  ]) {
    assert.equal(
      createBotReplyStagingPrivateCaseSource(
        environment(candidate),
        clock(),
      ).isConfigured(),
      false,
    );
  }
});

test("binds every resolution to connection, policy and release versions", async () => {
  const source = createBotReplyStagingPrivateCaseSource(
    environment(),
    clock(),
  );
  for (const overrides of [
    { connectionVersion: 5 },
    { policyVersion: 5 },
    { releaseId: `connect_release_v1_${"9".repeat(64)}` },
    { commitSha: "9".repeat(40) },
    { artifactDigest: `sha256:${"9".repeat(64)}` },
    { graphApiVersion: "v25.0" },
  ]) {
    await assert.rejects(
      () => source.resolve(request(overrides)),
      /private case is unavailable/,
    );
  }
});

test("reports missing private configuration without printing secret fields", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-bot-reply-staging-private-cases.mjs"],
    {
      cwd: new URL("../", import.meta.url),
      env: {},
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: "blocked",
    code: "BOT_REPLY_STAGING_PRIVATE_CASES_REQUIRED",
    sourceVersion: "connect-bot-reply-staging-private-case-source-v1",
  });
  assert.equal(result.stderr, "");
  assert.doesNotMatch(result.stdout, /recipient|phone|payload|token/i);
});
