import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryQueueConsumer,
} from "../server/campaigns/campaignDeliveryQueueConsumer.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const firstDeliveryKey =
  `campaign_delivery_v1_${"b".repeat(64)}`;
const secondDeliveryKey =
  `campaign_delivery_v1_${"c".repeat(64)}`;
const now = "2026-07-26T10:00:00.000Z";

function recipient(deliveryKey = firstDeliveryKey) {
  return {
    campaignKey,
    tenantId: 7,
    contactId:
      deliveryKey === firstDeliveryKey ? 17 : 18,
    contactVersion: 2,
    phoneNumber:
      deliveryKey === firstDeliveryKey
        ? "+972501234567"
        : "+972509876543",
    personalization: {
      "body:1": "שם",
    },
    personalizationKey: "d".repeat(64),
    deliveryKey,
    status: "sending",
    attemptCount: 1,
    lastErrorCode: null,
    queuedAt: "2026-07-26T09:59:00.000Z",
    acceptedAt: null,
    createdAt: "2026-07-26T09:00:00.000Z",
    updatedAt: now,
  };
}

function campaign(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    status: "running",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey:
        `template_v1_${"e".repeat(64)}`,
      metaTemplateId: "400004",
      version: 3,
      name: "service_update",
      category: "UTILITY",
      language: "he",
      header: "",
      body: "שלום {{1}}",
      footer: "",
      variableExamples: {
        1: "שם",
      },
      buttonMode: "none",
      quickReplies: [],
      urlButton: {
        enabled: false,
        mode: "static",
        text: "",
        value: "",
        example: "",
      },
      phoneButton: {
        enabled: false,
        text: "",
        value: "",
      },
    },
    audienceSnapshotKey: "f".repeat(64),
    recipientCount: 2,
    version: 3,
    activatedAt: "2026-07-26T09:58:00.000Z",
    startedAt: "2026-07-26T09:59:00.000Z",
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-07-26T09:00:00.000Z",
    updatedAt: now,
    ...overrides,
  };
}

function queueBody(deliveryKey = firstDeliveryKey) {
  return {
    version: 1,
    deliveryKey,
  };
}

function delivery(body = queueBody()) {
  const actions = [];

  return {
    actions,
    message: {
      id: "queue-message-id",
      timestamp: new Date(now),
      attempts: 1,
      body,
      ack() {
        actions.push({ action: "ack" });
      },
      retry(options) {
        actions.push({
          action: "retry",
          options,
        });
      },
    },
  };
}

function fixture(options = {}) {
  const calls = [];
  const preparations = [
    ...(options.preparations ?? [
      {
        outcome: "claimed",
        recipient: recipient(),
      },
    ]),
  ];
  const processorResults = [
    ...(options.processorResults ?? [
      { outcome: "accepted" },
    ]),
  ];
  const consumer =
    createCampaignDeliveryQueueConsumer(
      {
        async findQueuedDeliveryContext(
          deliveryKey,
        ) {
          calls.push({
            operation: "find-context",
            deliveryKey,
          });

          if (options.contextError) {
            throw options.contextError;
          }

          return options.currentContext === undefined
            ? {
                campaignKey,
                tenantId: 7,
              }
            : options.currentContext;
        },
        async prepareDelivery(
          deliveryKey,
          timestamp,
        ) {
          calls.push({
            operation: "prepare",
            deliveryKey,
            timestamp,
          });

          if (options.prepareError) {
            throw options.prepareError;
          }

          return preparations.shift() ?? {
            outcome: "duplicate",
          };
        },
        async markAccepted(
          deliveryKey,
          timestamp,
        ) {
          calls.push({
            operation: "accepted",
            deliveryKey,
            timestamp,
          });

          if (options.transitionError) {
            throw options.transitionError;
          }
        },
        async markRejected(
          deliveryKey,
          errorCode,
          timestamp,
        ) {
          calls.push({
            operation: "rejected",
            deliveryKey,
            errorCode,
            timestamp,
          });
        },
        async markAmbiguous(
          deliveryKey,
          errorCode,
          timestamp,
        ) {
          calls.push({
            operation: "ambiguous",
            deliveryKey,
            errorCode,
            timestamp,
          });
        },
      },
      {
        async findByKey(tenantId, requestedKey) {
          calls.push({
            operation: "find-campaign",
            tenantId,
            campaignKey: requestedKey,
          });

          if (options.campaignError) {
            throw options.campaignError;
          }

          return options.currentCampaign === undefined
            ? campaign()
            : options.currentCampaign;
        },
      },
      {
        isConfigured() {
          return options.configured !== false;
        },
        async process(prepared) {
          calls.push({
            operation: "process",
            deliveryKey:
              prepared.recipient.deliveryKey,
          });

          if (options.processorError) {
            throw options.processorError;
          }

          return processorResults.shift();
        },
      },
      {
        now() {
          return new Date(now);
        },
      },
    );

  return { calls, consumer };
}

function emptyResult(overrides = {}) {
  return {
    accepted: 0,
    rejected: 0,
    skipped: 0,
    duplicates: 0,
    ambiguous: 0,
    discarded: 0,
    retried: 0,
    ...overrides,
  };
}

test("retries before D1 claim when the delivery processor is unavailable", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    configured: false,
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ retried: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    {
      action: "retry",
      options: { delaySeconds: 60 },
    },
  ]);
  assert.deepEqual(testFixture.calls, []);
});

test("acknowledges malformed, skipped, and duplicate jobs without Meta", async () => {
  const malformed = delivery({
    version: 1,
    deliveryKey: "../delivery",
  });
  const skipped = delivery();
  const duplicate = delivery(
    queueBody(secondDeliveryKey),
  );
  const testFixture = fixture({
    preparations: [
      { outcome: "skipped" },
      { outcome: "duplicate" },
    ],
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [
        malformed.message,
        skipped.message,
        duplicate.message,
      ],
    }),
    emptyResult({
      skipped: 1,
      duplicates: 1,
      discarded: 1,
    }),
  );
  assert.deepEqual(malformed.actions, [
    { action: "ack" },
  ]);
  assert.deepEqual(skipped.actions, [
    { action: "ack" },
  ]);
  assert.deepEqual(duplicate.actions, [
    { action: "ack" },
  ]);
  assert.equal(
    testFixture.calls.some(
      (call) => call.operation === "process",
    ),
    false,
  );
});

test("records explicit accepted and rejected provider outcomes", async () => {
  const accepted = delivery();
  const rejected = delivery(
    queueBody(secondDeliveryKey),
  );
  const testFixture = fixture({
    preparations: [
      {
        outcome: "claimed",
        recipient: recipient(firstDeliveryKey),
      },
      {
        outcome: "claimed",
        recipient: recipient(secondDeliveryKey),
      },
    ],
    processorResults: [
      { outcome: "accepted" },
      {
        outcome: "rejected",
        errorCode: "PROVIDER_REJECTED",
      },
    ],
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [accepted.message, rejected.message],
    }),
    emptyResult({
      accepted: 1,
      rejected: 1,
    }),
  );
  assert.deepEqual(accepted.actions, [
    { action: "ack" },
  ]);
  assert.deepEqual(rejected.actions, [
    { action: "ack" },
  ]);
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "rejected" &&
        call.errorCode === "PROVIDER_REJECTED",
    ),
    true,
  );
});

test("keeps an unknown external outcome in sending without automatic retry", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    processorError: new Error(
      "private network timeout",
    ),
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ ambiguous: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    { action: "ack" },
  ]);
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "ambiguous" &&
        call.errorCode ===
          "DELIVERY_OUTCOME_UNKNOWN",
    ),
    true,
  );
});

test("retries a D1 failure before the delivery is claimed", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    prepareError: new Error("private D1 failure"),
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ retried: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    {
      action: "retry",
      options: { delaySeconds: 30 },
    },
  ]);
});

test("retries a missing campaign before claiming the delivery", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    currentCampaign: null,
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ retried: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    {
      action: "retry",
      options: { delaySeconds: 30 },
    },
  ]);
  assert.equal(
    testFixture.calls.some(
      (call) => call.operation === "prepare",
    ),
    false,
  );
});
