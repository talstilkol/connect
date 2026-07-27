import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageIdentityConflictError,
} from "../db/conversationRepository.ts";
import {
  createMetaMessageWebhookEventProcessor,
  parseMetaDeliveryStatusesEvent,
  parseMetaInboundMessagesEvent,
} from "../server/conversations/metaMessageWebhookProcessor.ts";
import {
  MetaWebhookProcessorError,
} from "../server/meta/metaWebhookIngress.ts";

const receiptEventKey = "a".repeat(64);

function connection() {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "connected",
    webhookSubscribedAt: "2026-07-26 08:00:00",
    connectedAt: "2026-07-26 08:00:00",
    version: 2,
    createdAt: "2026-07-26 07:00:00",
    updatedAt: "2026-07-26 08:00:00",
  };
}

function inboundEvent(overrides = {}) {
  const value = {
    messaging_product: "whatsapp",
    metadata: {
      phone_number_id: "phone-number-id",
    },
    messages: [
      {
        from: "972501234567",
        id: "wamid.inbound-17",
        timestamp: "1785054600",
        type: "text",
        text: {
          body: "שלום, אשמח לקבל פרטים",
        },
      },
    ],
  };

  return {
    dispatchKey:
      `${receiptEventKey}:0:0:inbound_messages`,
    kind: "inbound_messages",
    entryIndex: 0,
    changeIndex: 0,
    occurredAt: 1785054600,
    value,
    messages: value.messages,
    ...overrides,
  };
}

function deliveryEvent(overrides = {}) {
  const value = {
    messaging_product: "whatsapp",
    metadata: {
      phone_number_id: "phone-number-id",
    },
    statuses: [
      {
        id: "wamid.outbound-17",
        status: "delivered",
        timestamp: "1785054660",
        recipient_id: "972501234567",
      },
    ],
  };

  return {
    dispatchKey:
      `${receiptEventKey}:0:0:delivery_statuses`,
    kind: "delivery_statuses",
    entryIndex: 0,
    changeIndex: 0,
    occurredAt: 1785054660,
    value,
    statuses: value.statuses,
    ...overrides,
  };
}

function batch(events) {
  return {
    tenantId: 7,
    receiptId: 31,
    eventKey: receiptEventKey,
    connection: connection(),
    events,
  };
}

test("parses bounded inbound text without retaining the provider payload", () => {
  const parsed = parseMetaInboundMessagesEvent(
    inboundEvent(),
    "phone-number-id",
  );

  assert.deepEqual(parsed, [
    {
      phoneNumber: "+972501234567",
      providerMessageId: "wamid.inbound-17",
      contentKind: "text",
      textContent: "שלום, אשמח לקבל פרטים",
      occurredAt: new Date(
        1785054600 * 1_000,
      ).toISOString(),
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(parsed),
    /metadata|messaging_product|contacts/,
  );
});

test("keeps supported media metadata-free and marks unknown content safely", () => {
  const currentEvent = inboundEvent();
  currentEvent.messages = [
    {
      from: "972501234567",
      id: "wamid.image-17",
      timestamp: "1785054600",
      type: "image",
      image: {
        id: "provider-media-id",
        caption: "private caption",
      },
    },
    {
      from: "972501234567",
      id: "wamid.unknown-17",
      timestamp: "1785054601",
      type: "future-provider-kind",
      provider_private_data: "private",
    },
  ];

  const parsed = parseMetaInboundMessagesEvent(
    currentEvent,
    "phone-number-id",
  );

  assert.deepEqual(
    parsed.map((message) => ({
      contentKind: message.contentKind,
      textContent: message.textContent,
    })),
    [
      { contentKind: "image", textContent: null },
      { contentKind: "unsupported", textContent: null },
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(parsed),
    /provider-media-id|private caption|provider_private_data/,
  );
});

test("parses only the four supported outbound delivery states", () => {
  const parsed = parseMetaDeliveryStatusesEvent(
    deliveryEvent(),
    "phone-number-id",
  );

  assert.deepEqual(parsed, [
    {
      providerMessageId: "wamid.outbound-17",
      status: "delivered",
      statusEventAt: new Date(
        1785054660 * 1_000,
      ).toISOString(),
      statusIndex: 0,
    },
  ]);

  const unsupported = deliveryEvent();
  unsupported.statuses = [
    {
      ...unsupported.statuses[0],
      status: "deleted",
    },
  ];

  assert.throws(
    () =>
      parseMetaDeliveryStatusesEvent(
        unsupported,
        "phone-number-id",
      ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode === "UNSUPPORTED_MESSAGE_STATUS",
  );
});

test("rejects wrong phone metadata and malformed provider time before storage", () => {
  const wrongPhone = inboundEvent();
  wrongPhone.value = {
    ...wrongPhone.value,
    metadata: {
      phone_number_id: "another-phone-number-id",
    },
  };
  const invalidTime = inboundEvent();
  invalidTime.messages = [
    {
      ...invalidTime.messages[0],
      timestamp: "not-a-timestamp",
    },
  ];

  assert.throws(
    () =>
      parseMetaInboundMessagesEvent(
        wrongPhone,
        "phone-number-id",
      ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode ===
        "INVALID_MESSAGE_EVENT_METADATA",
  );
  assert.throws(
    () =>
      parseMetaInboundMessagesEvent(
        invalidTime,
        "phone-number-id",
      ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode ===
        "INVALID_MESSAGE_EVENT_TIMESTAMP",
  );
});

test("resolves the contact and records deterministic inbound identities", async () => {
  const writes = [];
  const processEvent =
    createMetaMessageWebhookEventProcessor({
      async resolveInboundContact(tenantId, phoneNumber) {
        assert.equal(tenantId, 7);
        assert.equal(phoneNumber, "+972501234567");

        return {
          tenantId,
          contactId: 17,
          phoneNumber,
        };
      },
      async recordInboundMessage(input) {
        writes.push(input);
        return {
          outcome: "created",
          message: {},
        };
      },
      async applyDeliveryStatus() {
        return { outcome: "not-found" };
      },
    });

  await processEvent(
    inboundEvent(),
    batch([inboundEvent()]),
  );
  await processEvent(
    inboundEvent(),
    batch([inboundEvent()]),
  );

  assert.equal(writes.length, 2);
  assert.match(
    writes[0].conversationKey,
    /^conversation_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    writes[0].messageKey,
    /^message_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    writes[0].conversationKey,
    writes[1].conversationKey,
  );
  assert.equal(
    writes[0].messageKey,
    writes[1].messageKey,
  );
  assert.deepEqual(Object.keys(writes[0]).sort(), [
    "contactId",
    "contentKind",
    "conversationKey",
    "messageKey",
    "occurredAt",
    "providerMessageId",
    "tenantId",
    "textContent",
  ]);
});

test("runs the bot runtime after durable inbound storage, including an idempotent webhook retry", async () => {
  const calls = [];
  const processEvent =
    createMetaMessageWebhookEventProcessor(
      {
        async resolveInboundContact(
          tenantId,
          phoneNumber,
        ) {
          calls.push("contact");
          return {
            tenantId,
            contactId: 17,
            phoneNumber,
          };
        },
        async recordInboundMessage() {
          calls.push("message");
          return {
            outcome: "duplicate",
            message: {},
          };
        },
        async applyDeliveryStatus() {
          return { outcome: "not-found" };
        },
      },
      {
        async process(runtimeInput) {
          calls.push({
            operation: "bot",
            input: runtimeInput,
          });
          return {
            runtimeOutcome: "planned",
            staged: 1,
            accepted: 0,
            rejected: 0,
            duplicates: 1,
            ambiguous: 0,
          };
        },
      },
    );

  await processEvent(
    inboundEvent(),
    batch([inboundEvent()]),
  );

  assert.deepEqual(calls.slice(0, 2), [
    "contact",
    "message",
  ]);
  assert.match(
    calls[2].input.inboundMessageKey,
    /^message_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    calls[2].input.phoneNumberId,
    "phone-number-id",
  );
  assert.equal(
    calls[2].input.recipientPhoneNumber,
    "+972501234567",
  );
});

test("maps automation runtime failures to one safe webhook retry code", async () => {
  const processEvent =
    createMetaMessageWebhookEventProcessor(
      {
        async resolveInboundContact(
          tenantId,
          phoneNumber,
        ) {
          return {
            tenantId,
            contactId: 17,
            phoneNumber,
          };
        },
        async recordInboundMessage() {
          return {
            outcome: "created",
            message: {},
          };
        },
        async applyDeliveryStatus() {
          return { outcome: "not-found" };
        },
      },
      {
        async process() {
          throw new Error(
            "private provider configuration",
          );
        },
      },
    );

  await assert.rejects(
    processEvent(
      inboundEvent(),
      batch([inboundEvent()]),
    ),
    (error) =>
      error instanceof
        MetaWebhookProcessorError &&
      error.safeCode ===
        "AUTOMATION_RUNTIME_FAILED" &&
      !error.message.includes("private"),
  );
});

test("derives one status event key and accepts applied, duplicate, or stale outcomes", async () => {
  const writes = [];
  const outcomes = ["applied", "duplicate", "stale"];
  const processEvent =
    createMetaMessageWebhookEventProcessor({
      async resolveInboundContact() {
        throw new Error("not used");
      },
      async recordInboundMessage() {
        throw new Error("not used");
      },
      async applyDeliveryStatus(input) {
        writes.push(input);
        return {
          outcome: outcomes.shift(),
          message: {},
        };
      },
    });

  for (let index = 0; index < 3; index += 1) {
    await processEvent(
      deliveryEvent(),
      batch([deliveryEvent()]),
    );
  }

  assert.equal(writes.length, 3);
  assert.match(
    writes[0].statusEventKey,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    writes[0].statusEventKey,
    writes[1].statusEventKey,
  );
  assert.equal(writes[0].status, "delivered");
  assert.deepEqual(Object.keys(writes[0]).sort(), [
    "providerMessageId",
    "status",
    "statusEventAt",
    "statusEventKey",
    "tenantId",
  ]);
});

test("maps missing targets, identity conflicts, and storage failures to safe codes", async () => {
  const cases = [
    {
      event: deliveryEvent(),
      repository: {
        async applyDeliveryStatus() {
          return { outcome: "not-found" };
        },
      },
      expectedCode: "MESSAGE_STATUS_TARGET_NOT_FOUND",
    },
    {
      event: inboundEvent(),
      repository: {
        async resolveInboundContact() {
          return {
            tenantId: 7,
            contactId: 17,
            phoneNumber: "+972501234567",
          };
        },
        async recordInboundMessage() {
          throw new MessageIdentityConflictError();
        },
      },
      expectedCode: "MESSAGE_IDENTITY_CONFLICT",
    },
    {
      event: inboundEvent(),
      repository: {
        async resolveInboundContact() {
          throw new Error("private D1 error");
        },
      },
      expectedCode: "MESSAGE_STORAGE_FAILED",
    },
  ];

  for (const item of cases) {
    const processEvent =
      createMetaMessageWebhookEventProcessor({
        async resolveInboundContact(
          tenantId,
          phoneNumber,
        ) {
          if (item.repository.resolveInboundContact) {
            return item.repository.resolveInboundContact(
              tenantId,
              phoneNumber,
            );
          }

          throw new Error("not used");
        },
        async recordInboundMessage(input) {
          if (item.repository.recordInboundMessage) {
            return item.repository.recordInboundMessage(input);
          }

          throw new Error("not used");
        },
        async applyDeliveryStatus(input) {
          if (item.repository.applyDeliveryStatus) {
            return item.repository.applyDeliveryStatus(input);
          }

          throw new Error("not used");
        },
      });

    await assert.rejects(
      processEvent(
        item.event,
        batch([item.event]),
      ),
      (error) =>
        error instanceof MetaWebhookProcessorError &&
        error.safeCode === item.expectedCode,
    );
  }
});
