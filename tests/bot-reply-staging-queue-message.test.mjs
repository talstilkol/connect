import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingQueueMessage,
  deriveBotReplyStagingQueueJobId,
  parseBotReplyStagingQueueMessage,
} from "../server/operations/botReplyStagingQueueMessage.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../server/operations/botReplyStagingDurableRunner.ts";

const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;

function run(overrides = {}) {
  return {
    runKey,
    targetTenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 4,
    releaseId: `connect_release_v1_${"b".repeat(64)}`,
    commitSha: "c".repeat(40),
    artifactDigest: `sha256:${"d".repeat(64)}`,
    graphApiVersion: "v24.0",
    requestedAt: "2026-08-21T13:25:00.000Z",
    recipientFingerprint: `sha256:${"e".repeat(64)}`,
    rateLimitMethodFingerprint: `sha256:${"f".repeat(64)}`,
    actorExternalUserId: "system-admin-primary",
    ...overrides,
  };
}

function claim(input = run(), overrides = {}) {
  const requestDigest = deriveBotReplyStagingDurableRequestDigest(input);
  return {
    runKey: input.runKey,
    auditKey: deriveBotReplyStagingDurableAuditKey(
      input.runKey,
      requestDigest,
    ),
    claimVersion: 2,
    leaseExpiresAt: "2026-08-21T14:00:00.000Z",
    ...overrides,
  };
}

test("creates one closed queue envelope bound to the durable claim", () => {
  const input = run();
  const message = createBotReplyStagingQueueMessage(input, claim(input));

  assert.deepEqual(Object.keys(message).sort(), [
    "auditKey",
    "claimVersion",
    "leaseExpiresAt",
    "messageVersion",
    "requestDigest",
    "run",
    "schemaVersion",
  ]);
  assert.equal(message.schemaVersion, 1);
  assert.equal(message.claimVersion, 2);
  assert.equal(message.run.actorExternalUserId, "system-admin-primary");
  assert.equal(Object.isFrozen(message), true);
  assert.equal(Object.isFrozen(message.run), true);
  assert.equal(
    deriveBotReplyStagingQueueJobId(message),
    `${runKey}_2`,
  );
});

test("parses a detached exact envelope and preserves renewed confirmation", () => {
  const renewed = run({ requestedAt: "2026-08-21T13:29:00.000Z" });
  const message = createBotReplyStagingQueueMessage(
    renewed,
    claim(renewed),
  );
  const parsed = parseBotReplyStagingQueueMessage(
    JSON.parse(JSON.stringify(message)),
  );

  assert.deepEqual(parsed, message);
  assert.equal(parsed.run.requestedAt, renewed.requestedAt);
});

test("rejects an extension that could carry credentials", () => {
  const input = run();
  const message = createBotReplyStagingQueueMessage(input, claim(input));

  assert.equal(parseBotReplyStagingQueueMessage({
    ...message,
    accessToken: "must-not-enter-redis",
  }), null);
  assert.equal(parseBotReplyStagingQueueMessage({
    ...message,
    run: { ...message.run, phoneNumberId: "provider-identity" },
  }), null);
});

test("rejects a forged request digest, audit key, actor or claim", () => {
  const input = run();
  const message = createBotReplyStagingQueueMessage(input, claim(input));

  for (const candidate of [
    { ...message, requestDigest: `sha256:${"0".repeat(64)}` },
    {
      ...message,
      auditKey: `bot_reply_staging_audit_v1_${"0".repeat(64)}`,
    },
    { ...message, claimVersion: 0 },
    { ...message, run: { ...message.run, actorExternalUserId: " owner " } },
  ]) {
    assert.equal(parseBotReplyStagingQueueMessage(candidate), null);
  }
});

test("rejects an expired-before-request lease and noncanonical time", () => {
  const input = run();
  const message = createBotReplyStagingQueueMessage(input, claim(input));

  assert.equal(parseBotReplyStagingQueueMessage({
    ...message,
    leaseExpiresAt: "2026-08-21T13:24:59.000Z",
  }), null);
  assert.equal(parseBotReplyStagingQueueMessage({
    ...message,
    leaseExpiresAt: "2026-08-21T14:00:00Z",
  }), null);
});

test("rejects a claim for another run before queue publication", () => {
  const input = run();
  assert.throws(
    () => createBotReplyStagingQueueMessage(input, claim(input, {
      runKey: `bot_reply_staging_run_v1_${"1".repeat(64)}`,
    })),
    /queue message is invalid/,
  );
});

test("rejects malformed messages before deriving a BullMQ job id", () => {
  assert.equal(parseBotReplyStagingQueueMessage(null), null);
  assert.throws(
    () => deriveBotReplyStagingQueueJobId({}),
    /queue message is invalid/,
  );
});
