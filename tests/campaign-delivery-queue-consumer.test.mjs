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
const firstReservationKey =
  `whatsapp_rate_reservation_v1_${"1".repeat(64)}`;
const secondReservationKey =
  `whatsapp_rate_reservation_v1_${"2".repeat(64)}`;
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

function delivery(
  body = queueBody(),
  attempts = 1,
  id = "queue-message-id",
) {
  const actions = [];

  return {
    actions,
    message: {
      id,
      timestamp: new Date(now),
      attempts,
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
      {
        outcome: "accepted",
        providerMessageId: "wamid.campaign-17",
      },
    ]),
  ];
  const admissionResults = [
    ...(options.admissionResults ?? []),
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
                recipientPhoneNumber:
                  "+972501234567",
                nextDeliveryAttemptNumber:
                  options.nextDeliveryAttemptNumber ?? 1,
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
        async markDeferred(
          deliveryKey,
          errorCode,
          timestamp,
        ) {
          calls.push({
            operation: "mark-deferred",
            deliveryKey,
            errorCode,
            timestamp,
          });

          if (options.markDeferredError) {
            throw options.markDeferredError;
          }
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
        async recordAccepted(input) {
          calls.push({
            operation: "accepted",
            ...input,
          });

          if (options.transitionError) {
            throw options.transitionError;
          }

          return {
            outcome: "recorded",
            link: {},
          };
        },
      },
      {
        isConfigured() {
          return options.admissionConfigured !== false;
        },
        async reserve(request) {
          calls.push({
            operation: "reserve",
            deliveryKey: request.deliveryKey,
            recipientPhoneNumber:
              request.recipientPhoneNumber,
            deliveryAttemptNumber:
              request.deliveryAttemptNumber,
            queueAttemptNumber:
              request.queueAttemptNumber,
            queueMessageId: request.queueMessageId,
            reservedAt: request.reservedAt,
          });

          if (options.admissionError) {
            throw options.admissionError;
          }

          return admissionResults.shift() ?? {
            outcome: "reserved",
            reservationKey:
              request.deliveryKey === firstDeliveryKey
                ? firstReservationKey
                : secondReservationKey,
          };
        },
        async settle(
          reservationKey,
          outcome,
          timestamp,
        ) {
          calls.push({
            operation: "settle",
            reservationKey,
            outcome,
            timestamp,
          });

          if (options.settlementError) {
            throw options.settlementError;
          }
        },
        async deferProviderRejection(
          reservationKey,
          scope,
          providerErrorCode,
          retryAfterSeconds,
          observedAt,
        ) {
          calls.push({
            operation: "provider-cooldown",
            reservationKey,
            scope,
            providerErrorCode,
            retryAfterSeconds,
            observedAt,
          });

          if (options.providerCooldownError) {
            throw options.providerCooldownError;
          }
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
            reservationKey:
              prepared.rateLimitReservationKey,
            deliveryAttemptNumber:
              prepared.deliveryAttemptNumber,
            queueAttemptNumber:
              prepared.queueAttemptNumber,
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
    deferred: 0,
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

test("discards an invalid queue attempt before reservation identity derivation", async () => {
  const invalidAttempt = delivery(queueBody(), 0);
  const invalidId = delivery(queueBody(), 1, "\n");
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [invalidAttempt.message, invalidId.message],
    }),
    emptyResult({ discarded: 2 }),
  );
  assert.deepEqual(invalidAttempt.actions, [
    { action: "ack" },
  ]);
  assert.deepEqual(invalidId.actions, [
    { action: "ack" },
  ]);
  assert.deepEqual(testFixture.calls, []);
});

test("retries before D1 access when rate-limit admission is unavailable", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    admissionConfigured: false,
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

test("defers a rate-limited delivery before claiming or contacting Meta", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    admissionResults: [
      {
        outcome: "deferred",
        errorCode: "WHATSAPP_PAIR_LIMITED",
        retryAfterSeconds: 6,
      },
    ],
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ deferred: 1, retried: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    {
      action: "retry",
      options: { delaySeconds: 6 },
    },
  ]);
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "prepare" ||
        call.operation === "process",
    ),
    false,
  );
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "reserve" &&
        call.reservedAt === now &&
        call.deliveryAttemptNumber === 1 &&
        call.queueAttemptNumber === 1 &&
        call.queueMessageId === "queue-message-id",
    ),
    true,
  );
});

test("rejects an admission delay beyond the Cloudflare Queue limit", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    admissionResults: [
      {
        outcome: "deferred",
        errorCode: "WHATSAPP_MARKETING_COOLDOWN",
        retryAfterSeconds: 86_401,
      },
    ],
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
  assert.equal(
    testFixture.calls.filter(
      (call) =>
        call.operation === "settle" &&
        call.outcome === "cancelled-before-submit",
    ).length,
    2,
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
      {
        outcome: "accepted",
        providerMessageId: "wamid.campaign-17",
      },
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
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "accepted" &&
        call.providerMessageId ===
          "wamid.campaign-17" &&
        call.reservationKey === firstReservationKey,
    ),
    true,
  );
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "process" &&
        call.deliveryKey === firstDeliveryKey &&
        call.reservationKey === firstReservationKey &&
        call.deliveryAttemptNumber === 1 &&
        call.queueAttemptNumber === 1,
    ),
    true,
  );
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "settle" &&
        call.reservationKey ===
          secondReservationKey &&
        call.outcome === "provider-failed",
    ),
    true,
  );
});

test("persists a scoped provider cooldown before returning an explicitly rejected delivery to the queue", async () => {
  const testDelivery = delivery();
  const testFixture = fixture({
    processorResults: [
      {
        outcome: "deferred",
        errorCode: "META_PAIR_RATE_LIMITED",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        retryAfterSeconds: 6,
      },
    ],
  });

  assert.deepEqual(
    await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    }),
    emptyResult({ deferred: 1, retried: 1 }),
  );
  assert.deepEqual(testDelivery.actions, [
    {
      action: "retry",
      options: { delaySeconds: 6 },
    },
  ]);
  assert.deepEqual(
    testFixture.calls
      .filter((call) =>
        [
          "process",
          "provider-cooldown",
          "mark-deferred",
        ].includes(call.operation),
      )
      .map((call) => call.operation),
    ["process", "provider-cooldown", "mark-deferred"],
  );
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "provider-cooldown" &&
        call.reservationKey === firstReservationKey &&
        call.scope === "pair" &&
        call.providerErrorCode === 131056 &&
        call.retryAfterSeconds === 6 &&
        call.observedAt === now,
    ),
    true,
  );
});

test("keeps a provider rejection fail-closed when cooldown evidence or queue state cannot be persisted", async () => {
  const cases = [
    fixture({
      providerCooldownError: new Error(
        "private cooldown failure",
      ),
      processorResults: [
        {
          outcome: "deferred",
          errorCode: "META_PHONE_THROUGHPUT_LIMITED",
          providerErrorCode: 130429,
          cooldownScope: "sender",
          retryAfterSeconds: 12,
        },
      ],
    }),
    fixture({
      markDeferredError: new Error(
        "private queue state failure",
      ),
      processorResults: [
        {
          outcome: "deferred",
          errorCode: "META_PAIR_RATE_LIMITED",
          providerErrorCode: 131056,
          cooldownScope: "pair",
          retryAfterSeconds: 6,
        },
      ],
    }),
  ];

  for (const testFixture of cases) {
    const testDelivery = delivery();

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
            "PROVIDER_RETRY_STATE_UNKNOWN",
      ),
      true,
    );
  }
});

test("rejects a processor cooldown with a mismatched scope or message category", async () => {
  const marketingTemplate = {
    ...campaign().template,
    category: "MARKETING",
  };
  const cases = [
    fixture({
      currentCampaign: campaign({
        template: marketingTemplate,
      }),
      processorResults: [
        {
          outcome: "deferred",
          errorCode: "META_PAIR_RATE_LIMITED",
          providerErrorCode: 131056,
          cooldownScope: "sender",
          retryAfterSeconds: 6,
        },
      ],
    }),
    fixture({
      processorResults: [
        {
          outcome: "deferred",
          errorCode: "META_MARKETING_RECIPIENT_LIMITED",
          providerErrorCode: 131049,
          cooldownScope: "portfolio-recipient",
          retryAfterSeconds: 86_400,
        },
      ],
    }),
  ];

  for (const testFixture of cases) {
    const testDelivery = delivery();

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
          call.operation === "provider-cooldown",
      ),
      false,
    );
  }
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
  assert.equal(
    testFixture.calls.some(
      (call) => call.operation === "settle",
    ),
    false,
  );
});

test("keeps provider acceptance ambiguous when its durable identity cannot be linked", async () => {
  const cases = [
    fixture({
      transitionError: new Error(
        "private acceptance storage failure",
      ),
    }),
    fixture({
      processorResults: [
        { outcome: "accepted" },
      ],
    }),
  ];

  for (const testFixture of cases) {
    const testDelivery = delivery();
    const result = await testFixture.consumer.handle({
      queue: "connect-campaign-deliveries",
      messages: [testDelivery.message],
    });

    assert.deepEqual(
      result,
      emptyResult({ ambiguous: 1 }),
    );
    assert.deepEqual(testDelivery.actions, [
      { action: "ack" },
    ]);
    assert.equal(
      testFixture.calls.some(
        (call) => call.operation === "settle",
      ),
      false,
    );
  }
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
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "settle" &&
        call.outcome === "cancelled-before-submit",
    ),
    true,
  );
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
