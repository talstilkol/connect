import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMetaWebhookEvents,
  createMetaWebhookEventDispatcher,
} from "../server/meta/metaWebhookEventDispatcher.ts";
import {
  parseMetaWebhookEnvelope,
} from "../server/meta/metaWebhookEnvelope.ts";
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
    webhookSubscribedAt: "2026-07-25 10:00:00",
    connectedAt: "2026-07-25 10:00:00",
    version: 2,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

function processingEvent(changes) {
  return {
    tenantId: 7,
    receiptId: 31,
    eventKey,
    connection: connection(),
    envelope: parseMetaWebhookEnvelope(
      JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-id",
            time: 1784973600,
            changes,
          },
        ],
      }),
    ),
  };
}

test("classifies inbound messages and delivery statuses from one Meta change", () => {
  const events = classifyMetaWebhookEvents(
    processingEvent([
      {
        field: "messages",
        value: {
          messages: [{ id: "existing-message-id" }],
          statuses: [
            {
              id: "existing-message-id",
              status: "delivered",
            },
          ],
        },
      },
    ]),
  );

  assert.deepEqual(
    events.map((event) => event.kind),
    ["inbound_messages", "delivery_statuses"],
  );
  assert.equal(
    events[0].dispatchKey,
    `${eventKey}:0:0:inbound_messages`,
  );
  assert.equal(
    events[1].dispatchKey,
    `${eventKey}:0:0:delivery_statuses`,
  );
  assert.equal(events[0].messages.length, 1);
  assert.equal(events[1].statuses.length, 1);
  assert.equal(events[0].occurredAt, 1784973600);
});

test("classifies template and account lifecycle fields without interpreting their business schema", () => {
  const events = classifyMetaWebhookEvents(
    processingEvent([
      {
        field: "message_template_status_update",
        value: {
          event: "APPROVED",
        },
      },
      {
        field: "account_update",
        value: {
          event: "PARTNER_ADDED",
        },
      },
    ]),
  );

  assert.deepEqual(
    events.map((event) => event.kind),
    ["template_status", "account_update"],
  );
  assert.equal(
    events[0].dispatchKey,
    `${eventKey}:0:0:template_status`,
  );
  assert.equal(
    events[1].dispatchKey,
    `${eventKey}:0:1:account_update`,
  );
});

test("passes one typed batch to the business processor", async () => {
  const batches = [];
  const dispatcher = createMetaWebhookEventDispatcher(
    async (batch) => {
      batches.push(batch);
    },
  );
  const event = processingEvent([
    {
      field: "messages",
      value: {
        messages: [{ id: "existing-message-id" }],
      },
    },
  ]);

  await dispatcher(event);

  assert.equal(batches.length, 1);
  assert.equal(batches[0].tenantId, 7);
  assert.equal(batches[0].receiptId, 31);
  assert.equal(batches[0].eventKey, eventKey);
  assert.equal(batches[0].connection.wabaId, "waba-id");
  assert.equal(batches[0].events[0].kind, "inbound_messages");
});

test("rejects an unsupported field before invoking the business processor", async () => {
  let processorCalls = 0;
  const dispatcher = createMetaWebhookEventDispatcher(
    async () => {
      processorCalls += 1;
    },
  );

  await assert.rejects(
    dispatcher(
      processingEvent([
        {
          field: "unsupported_field",
          value: {},
        },
      ]),
    ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode === "UNSUPPORTED_WEBHOOK_FIELD",
  );
  assert.equal(processorCalls, 0);
});

test("rejects message changes that contain neither messages nor statuses", () => {
  assert.throws(
    () =>
      classifyMetaWebhookEvents(
        processingEvent([
          {
            field: "messages",
            value: {},
          },
        ]),
      ),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode === "UNSUPPORTED_MESSAGES_CHANGE",
  );
});

test("rejects a missing or invalid provider timestamp before dispatch", () => {
  const event = processingEvent([
    {
      field: "message_template_status_update",
      value: {
        event: "APPROVED",
      },
    },
  ]);
  event.envelope.payload.entry[0].time = 0;

  assert.throws(
    () => classifyMetaWebhookEvents(event),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode === "INVALID_WEBHOOK_TIMESTAMP",
  );
});
