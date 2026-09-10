import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresCampaignDispatchRepository,
  postgresCampaignDispatchSql,
} from "../server/platform/postgresCampaignDispatchRepository.ts";

const campaignKey = `campaign_v1_${"a".repeat(64)}`;
const firstDeliveryKey = `campaign_delivery_v1_${"b".repeat(64)}`;
const secondDeliveryKey = `campaign_delivery_v1_${"c".repeat(64)}`;
const activatedAt = "2026-08-17T10:00:00.000Z";
const runningAt = "2026-08-17T10:01:00.000Z";

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];

  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const response = remaining.shift();
        if (!response) {
          throw new Error("Unexpected PostgreSQL query");
        }
        return response;
      },
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function dispatchRow(overrides = {}) {
  return {
    campaignKey,
    tenantId: "7",
    status: "scheduled",
    version: 2,
    activatedAt: new Date(activatedAt),
    startedAt: null,
    ...overrides,
  };
}

function recipientRow(overrides = {}) {
  return {
    campaignKey,
    tenantId: "7",
    contactId: "17",
    contactVersion: 2,
    phoneNumber: "+972501234567",
    personalizationJson: {},
    personalizationKey: "d".repeat(64),
    deliveryKey: firstDeliveryKey,
    status: "sending",
    attemptCount: 1,
    lastErrorCode: null,
    queuedAt: new Date(runningAt),
    acceptedAt: null,
    createdAt: new Date("2026-08-17T09:00:00.000Z"),
    updatedAt: new Date(runningAt),
    ...overrides,
  };
}

test("runs the bounded PostgreSQL campaign dispatch lifecycle", async () => {
  const fixture = queryFixture([
    { rows: [dispatchRow()], rowCount: 1 },
    {
      rows: [
        dispatchRow({
          status: "running",
          version: "3",
          startedAt: new Date(runningAt),
        }),
      ],
      rowCount: 1,
    },
    {
      rows: [
        { deliveryKey: firstDeliveryKey },
        { deliveryKey: secondDeliveryKey },
      ],
      rowCount: 2,
    },
    { rows: [{ campaignKey }], rowCount: 1 },
    {
      rows: [
        { deliveryKey: firstDeliveryKey },
        { deliveryKey: secondDeliveryKey },
      ],
      rowCount: 2,
    },
    {
      rows: [{
        campaignKey,
        tenantId: 7,
        recipientPhoneNumber: "+972501234567",
        attemptCount: "0",
      }],
      rowCount: 1,
    },
    { rows: [recipientRow()], rowCount: 1 },
    { rows: [{ deliveryKey: firstDeliveryKey }], rowCount: 1 },
    { rows: [{ deliveryKey: firstDeliveryKey }], rowCount: 1 },
    { rows: [{ deliveryKey: firstDeliveryKey }], rowCount: 1 },
  ]);
  const repository = createPostgresCampaignDispatchRepository(
    fixture.queries,
  );

  assert.deepEqual(
    await repository.activateCampaign(7, campaignKey, 1, activatedAt),
    {
      campaignKey,
      tenantId: 7,
      status: "scheduled",
      version: 2,
      activatedAt,
      startedAt: null,
    },
  );
  assert.equal(
    (await repository.promoteDueCampaigns(runningAt, 50))[0]?.status,
    "running",
  );
  assert.deepEqual(
    await repository.claimPendingRecipients(runningAt, 2),
    [
      { deliveryKey: firstDeliveryKey },
      { deliveryKey: secondDeliveryKey },
    ],
  );
  assert.equal(await repository.completeSettledCampaigns(runningAt, 50), 1);
  await repository.releaseQueuedRecipients(
    [firstDeliveryKey, secondDeliveryKey],
    runningAt,
  );
  assert.deepEqual(
    await repository.findQueuedDeliveryContext(firstDeliveryKey),
    {
      campaignKey,
      tenantId: 7,
      recipientPhoneNumber: "+972501234567",
      nextDeliveryAttemptNumber: 1,
    },
  );
  const prepared = await repository.prepareDelivery(
    firstDeliveryKey,
    runningAt,
  );
  assert.equal(prepared.outcome, "claimed");
  assert.equal(prepared.recipient.deliveryKey, firstDeliveryKey);
  await repository.markRejected(
    firstDeliveryKey,
    "PROVIDER_REJECTED",
    runningAt,
  );
  await repository.markDeferred(
    firstDeliveryKey,
    "PROVIDER_THROTTLED",
    runningAt,
  );
  await repository.markAmbiguous(
    firstDeliveryKey,
    "PROVIDER_UNCERTAIN",
    runningAt,
  );

  assert.deepEqual(fixture.calls[0].parameters, [
    7,
    campaignKey,
    1,
    activatedAt,
  ]);
  assert.deepEqual(fixture.calls[4].parameters, [
    runningAt,
    JSON.stringify([firstDeliveryKey, secondDeliveryKey]),
  ]);
  fixture.assertConsumed();
});

test("returns bounded null, duplicate, and skipped outcomes", async () => {
  const fixture = queryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    {
      rows: [recipientRow({
        status: "skipped",
        attemptCount: 0,
        lastErrorCode: "CONSENT_NOT_GRANTED",
      })],
      rowCount: 1,
    },
  ]);
  const repository = createPostgresCampaignDispatchRepository(
    fixture.queries,
  );

  assert.equal(
    await repository.activateCampaign(7, campaignKey, 1, activatedAt),
    null,
  );
  assert.equal(
    await repository.findQueuedDeliveryContext(firstDeliveryKey),
    null,
  );
  assert.deepEqual(
    await repository.prepareDelivery(firstDeliveryKey, runningAt),
    { outcome: "duplicate" },
  );
  assert.deepEqual(
    await repository.prepareDelivery(firstDeliveryKey, runningAt),
    { outcome: "skipped" },
  );
  fixture.assertConsumed();
});

test("serializes campaign and recipient claims in PostgreSQL", () => {
  assert.match(
    postgresCampaignDispatchSql.promoteDueCampaigns,
    /FOR UPDATE SKIP LOCKED[\s\S]*UPDATE campaigns/,
  );
  assert.match(
    postgresCampaignDispatchSql.claimPendingRecipients,
    /FOR UPDATE OF recipients SKIP LOCKED[\s\S]*UPDATE campaign_recipients/,
  );
  assert.match(
    postgresCampaignDispatchSql.completeSettledCampaigns,
    /NOT EXISTS[\s\S]*FOR UPDATE SKIP LOCKED[\s\S]*status = 'completed'/,
  );
  assert.match(
    postgresCampaignDispatchSql.prepareDelivery,
    /message_templates\.status = 'approved'[\s\S]*contacts\.consent_status = 'granted'/,
  );
});

test("validates every command before PostgreSQL access", async () => {
  const repository = createPostgresCampaignDispatchRepository({
    async query() {
      throw new Error("must not query");
    },
  });

  await assert.rejects(
    repository.activateCampaign(0, campaignKey, 1, activatedAt),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    repository.promoteDueCampaigns(runningAt, 51),
    /limit must not exceed 50/,
  );
  await assert.rejects(
    repository.claimPendingRecipients("invalid", 1),
    /timestamp is invalid/,
  );
  await assert.rejects(
    repository.releaseQueuedRecipients(
      [firstDeliveryKey, firstDeliveryKey],
      runningAt,
    ),
    /contains a duplicate/,
  );
  await assert.rejects(
    repository.markRejected(firstDeliveryKey, "bad-code", runningAt),
    /errorCode is invalid/,
  );
});

test("rejects malformed PostgreSQL result evidence", async () => {
  const malformedState = createPostgresCampaignDispatchRepository(
    queryFixture([{
      rows: [dispatchRow({ tenantId: "other" })],
      rowCount: 1,
    }]).queries,
  );
  await assert.rejects(
    malformedState.activateCampaign(7, campaignKey, 1, activatedAt),
    /invalid positive integer/,
  );

  const mismatchedRecipient = createPostgresCampaignDispatchRepository(
    queryFixture([{
      rows: [recipientRow({ deliveryKey: secondDeliveryKey })],
      rowCount: 1,
    }]).queries,
  );
  await assert.rejects(
    mismatchedRecipient.prepareDelivery(firstDeliveryKey, runningAt),
    /mismatched campaign recipient/,
  );

  const transitionLost = createPostgresCampaignDispatchRepository(
    queryFixture([{ rows: [], rowCount: 0 }]).queries,
  );
  await assert.rejects(
    transitionLost.markAmbiguous(
      firstDeliveryKey,
      "PROVIDER_UNCERTAIN",
      runningAt,
    ),
    /transition failed/,
  );
});

test("rejects an invalid dependency", () => {
  assert.throws(
    () => createPostgresCampaignDispatchRepository({}),
    /dependency is invalid/,
  );
});
