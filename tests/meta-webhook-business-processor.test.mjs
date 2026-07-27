import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaWebhookBusinessBatchProcessor,
} from "../server/meta/metaWebhookBusinessProcessor.ts";
import {
  MetaWebhookProcessorError,
} from "../server/meta/metaWebhookIngress.ts";

const eventKey = "a".repeat(64);

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

function templateEvent() {
  return {
    dispatchKey: `${eventKey}:0:0:template_status`,
    kind: "template_status",
    entryIndex: 0,
    changeIndex: 0,
    occurredAt: 1785054600,
    value: {
      event: "APPROVED",
      message_template_id: "123456789",
      message_template_name: "service_update",
      message_template_language: "he",
    },
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
          body: "שלום",
        },
      },
    ],
  };

  return {
    dispatchKey: `${eventKey}:0:1:inbound_messages`,
    kind: "inbound_messages",
    entryIndex: 0,
    changeIndex: 1,
    occurredAt: 1785054600,
    value,
    messages: value.messages,
    ...overrides,
  };
}

function batch(events, overrides = {}) {
  return {
    tenantId: 7,
    receiptId: 31,
    eventKey,
    connection: connection(),
    events,
    ...overrides,
  };
}

function repositories(calls) {
  return {
    conversations: {
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
          outcome: "created",
          message: {},
        };
      },
      async applyDeliveryStatus() {
        calls.push("status");
        return {
          outcome: "applied",
          message: {},
        };
      },
    },
    templates: {
      async applyStatusEvent() {
        calls.push("template");
        return { outcome: "not-found" };
      },
    },
  };
}

test("preflights a mixed business batch before the first write", async () => {
  const calls = [];
  const processBatch =
    createMetaWebhookBusinessBatchProcessor(
      repositories(calls),
    );
  const invalidInbound = inboundEvent();
  invalidInbound.messages = [
    {
      ...invalidInbound.messages[0],
      timestamp: "invalid",
    },
  ];

  await assert.rejects(
    processBatch(
      batch([templateEvent(), invalidInbound]),
    ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode ===
        "INVALID_MESSAGE_EVENT_TIMESTAMP",
  );
  assert.deepEqual(calls, []);
});

test("routes valid template and inbound events after complete preflight", async () => {
  const calls = [];
  const processBatch =
    createMetaWebhookBusinessBatchProcessor(
      repositories(calls),
    );

  await processBatch(
    batch([templateEvent(), inboundEvent()]),
  );

  assert.deepEqual(calls, [
    "template",
    "contact",
    "message",
  ]);
});

test("rejects account updates and invalid tenant scope before any write", async () => {
  const cases = [
    {
      expectedCode: "PROCESSOR_NOT_CONFIGURED",
      currentBatch: batch([
        {
          ...templateEvent(),
          kind: "account_update",
        },
      ]),
    },
    {
      expectedCode: "INVALID_BUSINESS_EVENT_BATCH",
      currentBatch: batch([templateEvent()], {
        tenantId: 8,
      }),
    },
  ];

  for (const item of cases) {
    const calls = [];
    const processBatch =
      createMetaWebhookBusinessBatchProcessor(
        repositories(calls),
      );

    await assert.rejects(
      processBatch(item.currentBatch),
      (error) =>
        error instanceof MetaWebhookProcessorError &&
        error.safeCode === item.expectedCode,
    );
    assert.deepEqual(calls, []);
  }
});
