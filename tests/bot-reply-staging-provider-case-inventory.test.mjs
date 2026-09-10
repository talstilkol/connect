import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingProviderCaseInventory,
} from "../server/operations/botReplyStagingProviderCaseInventory.ts";
import {
  deriveBotReplyStagingStepDeliveryKey,
} from "../server/operations/botReplyStagingScenarioExecutor.ts";

const recipientFingerprint = `sha256:${"e".repeat(64)}`;
const openedAt = "2026-08-21T12:00:00.000Z";
const expiresAt = "2026-08-22T12:00:00.000Z";

function request(caseName = "text-send", overrides = {}) {
  return {
    caseName,
    runKey: `bot_reply_staging_run_v1_${"a".repeat(64)}`,
    operationKey: `bot_reply_staging_step_v1_${"b".repeat(64)}`,
    deliveryKey: `bot_reply_delivery_v1_${"c".repeat(64)}`,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    releaseId: `connect_release_v1_${"5".repeat(64)}`,
    commitSha: "6".repeat(40),
    artifactDigest: `sha256:${"7".repeat(64)}`,
    graphApiVersion: "v24.0",
    recipientFingerprint,
    claimVersion: 2,
    leaseExpiresAt: "2026-08-21T14:00:00.000Z",
    ...overrides,
  };
}

function expectedSubject(caseName) {
  return ["button-reply", "status-sent", "status-delivered", "status-read"]
      .includes(caseName)
    ? "button-send"
    : caseName;
}

function definition(input, overrides = {}) {
  return {
    schemaVersion: 1,
    source: "private-staging-inventory",
    caseName: input.caseName,
    subjectCaseName: expectedSubject(input.caseName),
    targetTenantId: input.targetTenantId,
    connectionVersion: input.connectionVersion,
    policyVersion: input.policyVersion,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    artifactDigest: input.artifactDigest,
    graphApiVersion: input.graphApiVersion,
    recipientPhoneNumber: "+972501111111",
    inventoryExpiresAt: "2026-08-21T15:00:00.000Z",
    caseFingerprint: `sha256:${"d".repeat(64)}`,
    delivery: {
      conversationKey: `conversation_v1_${"1".repeat(64)}`,
      inboundMessageKey: `message_v1_${"2".repeat(64)}`,
      botFlowKey: `bot_flow_v1_${"3".repeat(64)}`,
      botFlowVersionKey: `bot_flow_version_v1_${"4".repeat(64)}`,
      replyIndex: 1,
      senderPhoneNumberId: "123456789",
      reply: { kind: "text", text: "בדיקת מערכת מאושרת" },
    },
    ...overrides,
  };
}

function persistedDelivery(stageInput, overrides = {}) {
  return {
    ...stageInput,
    status: "pending",
    attemptCount: 0,
    claimVersion: 0,
    nextAttemptAt: null,
    deferredAt: null,
    lastDeferralReasonCode: null,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt: "2026-08-21T13:00:00.000Z",
    updatedAt: "2026-08-21T13:00:00.000Z",
    ...overrides,
  };
}

function fixture({
  configured = true,
  definitionOverride = {},
  derivedFingerprint = recipientFingerprint,
  stageOverride = null,
  windowOverride = {},
} = {}) {
  const calls = [];
  const inventory = createBotReplyStagingProviderCaseInventory({
    definitions: {
      isConfigured() {
        return configured;
      },
      async resolve(input) {
        calls.push({ kind: "definition", input });
        return definition(input, definitionOverride);
      },
    },
    deliveries: {
      async stage(input) {
        calls.push({ kind: "stage", input });
        if (stageOverride !== null) return stageOverride(input);
        return {
          outcome: "created",
          delivery: persistedDelivery(input),
        };
      },
    },
    recipientFingerprints: {
      isConfigured() {
        return configured;
      },
      async derive(phoneNumber) {
        calls.push({ kind: "fingerprint", phoneNumber });
        return derivedFingerprint;
      },
    },
    serviceWindows: {
      isConfigured() {
        return configured;
      },
      async read(input) {
        calls.push({ kind: "window", input });
        return {
          source: "durable-postgres",
          serviceWindowOpenedAt: openedAt,
          serviceWindowExpiresAt: expiresAt,
          ...windowOverride,
        };
      },
    },
  });
  return { inventory, calls };
}

test("persists a real dispatch case and returns only bounded identity", async () => {
  const { inventory, calls } = fixture();
  const input = request();
  const allocated = await inventory.allocate(input);
  assert.equal(allocated.source, "durable-postgres");
  assert.equal(allocated.deliveryKey, input.deliveryKey);
  assert.equal(allocated.subjectDeliveryKey, input.deliveryKey);
  assert.equal(allocated.executionMode, "dispatch");
  assert.equal(allocated.serviceWindowOpenedAt, openedAt);
  assert.equal(allocated.serviceWindowExpiresAt, expiresAt);
  assert.deepEqual(calls.map(({ kind }) => kind), [
    "definition",
    "fingerprint",
    "stage",
    "window",
  ]);
  assert.doesNotMatch(JSON.stringify(allocated), /972501111111/);
  assert.ok(Object.isFrozen(allocated));
});

test("binds observe-only evidence to the durable button delivery", async () => {
  const { inventory, calls } = fixture({
    stageOverride(stageInput) {
      return {
        outcome: "duplicate",
        delivery: persistedDelivery(stageInput, {
          status: "accepted",
          attemptCount: 1,
          claimVersion: 1,
          providerMessageId: "wamid.persisted",
          acceptedAt: "2026-08-21T13:05:00.000Z",
          updatedAt: "2026-08-21T13:05:00.000Z",
        }),
      };
    },
  });
  const input = request("status-delivered");
  const allocated = await inventory.allocate(input);
  const expectedSubjectDeliveryKey =
    deriveBotReplyStagingStepDeliveryKey(
      input.runKey,
      "scenario:button-send",
    );
  assert.equal(allocated.executionMode, "observe-only");
  assert.equal(allocated.deliveryKey, input.deliveryKey);
  assert.equal(allocated.subjectDeliveryKey, expectedSubjectDeliveryKey);
  assert.equal(allocated.serviceWindowOpenedAt, null);
  assert.equal(allocated.serviceWindowExpiresAt, null);
  const stageCall = calls.find(({ kind }) => kind === "stage");
  assert.equal(stageCall.input.deliveryKey, expectedSubjectDeliveryKey);
});

test("rejects a recipient that does not match the approved fingerprint", async () => {
  const { inventory, calls } = fixture({
    derivedFingerprint: `sha256:${"9".repeat(64)}`,
  });
  await assert.rejects(
    () => inventory.allocate(request()),
    /recipient is not authorized/,
  );
  assert.equal(calls.some(({ kind }) => kind === "stage"), false);
});

test("rejects an inventory that cannot cover the durable lease", async () => {
  const { inventory, calls } = fixture({
    definitionOverride: {
      inventoryExpiresAt: "2026-08-21T13:59:59.999Z",
    },
  });
  await assert.rejects(
    () => inventory.allocate(request()),
    /private case is expired/,
  );
  assert.equal(calls.some(({ kind }) => kind === "fingerprint"), false);
});

test("rejects a non-durable or malformed service window", async () => {
  const { inventory } = fixture({
    windowOverride: {
      serviceWindowExpiresAt: "2026-08-22T11:59:59.999Z",
    },
  });
  await assert.rejects(
    () => inventory.allocate(request()),
    /service window is invalid/,
  );
});

test("fails closed when private definitions or fingerprints are unavailable", async () => {
  const { inventory, calls } = fixture({ configured: false });
  assert.equal(inventory.isConfigured(), false);
  await assert.rejects(
    () => inventory.allocate(request()),
    /provider case is unavailable/,
  );
  assert.deepEqual(calls, []);
});
