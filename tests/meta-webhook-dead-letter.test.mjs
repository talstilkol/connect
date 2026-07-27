import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectMetaWebhookDeadLetter,
  MetaWebhookDeadLetterError,
  requeueConfirmedMetaWebhookDeadLetter,
} from "../server/meta/metaWebhookDeadLetter.ts";
import {
  createMetaWebhookQueueMessage,
} from "../server/meta/metaWebhookQueueMessage.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

const rawPayload = new TextEncoder().encode(
  '{"object":"whatsapp_business_account","entry":[{"id":"waba-id"}]}',
);
const signatureHeader = `sha256=${"a".repeat(64)}`;

function deadLetterDelivery(overrides = {}) {
  const actions = [];

  return {
    actions,
    delivery: {
      id: "queue-message-id",
      timestamp: new Date("2026-07-25T10:00:00.000Z"),
      attempts: 11,
      body: createMetaWebhookQueueMessage(
        rawPayload,
        signatureHeader,
      ),
      ack() {
        actions.push("ack");
      },
      retry() {
        actions.push("retry");
      },
      ...overrides,
    },
  };
}

test("inspects a dead letter using safe metadata only", async () => {
  const fixture = deadLetterDelivery();
  const inspection = await inspectMetaWebhookDeadLetter(
    fixture.delivery,
  );

  assert.equal(inspection.status, "replayable");
  assert.equal(inspection.messageId, "queue-message-id");
  assert.equal(
    inspection.enqueuedAt,
    "2026-07-25T10:00:00.000Z",
  );
  assert.equal(inspection.attempts, 11);
  assert.equal(inspection.payloadBytes, rawPayload.byteLength);
  assert.match(inspection.eventKey, /^[0-9a-f]{64}$/);
  assert.equal("rawPayload" in inspection, false);
  assert.equal("signatureHeader" in inspection, false);
});

test("marks malformed queue or delivery metadata as invalid", async () => {
  const fixture = deadLetterDelivery({
    id: "",
    timestamp: new Date("invalid"),
    attempts: 0,
    body: null,
  });

  const inspection = await inspectMetaWebhookDeadLetter(
    fixture.delivery,
  );

  assert.deepEqual(inspection, {
    status: "invalid",
    messageId: null,
    enqueuedAt: null,
    attempts: null,
    reason: "INVALID_QUEUE_MESSAGE",
  });
});

test("requeues an explicitly confirmed dead letter before acknowledging it", async () => {
  const fixture = deadLetterDelivery();
  const sent = [];
  const expectedEventKey = await sha256Hex(rawPayload);

  const result =
    await requeueConfirmedMetaWebhookDeadLetter(
      fixture.delivery,
      {
        async send(body, options) {
          sent.push({ body, options });
        },
      },
      expectedEventKey,
    );

  assert.deepEqual(result, {
    outcome: "requeued",
    eventKey: expectedEventKey,
  });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].options, {
    contentType: "v8",
  });
  assert.notEqual(
    sent[0].body.rawPayload,
    fixture.delivery.body.rawPayload,
  );
  assert.deepEqual(fixture.actions, ["ack"]);
});

test("does not requeue or acknowledge when event confirmation mismatches", async () => {
  const fixture = deadLetterDelivery();
  let sendCalls = 0;

  await assert.rejects(
    requeueConfirmedMetaWebhookDeadLetter(
      fixture.delivery,
      {
        async send() {
          sendCalls += 1;
        },
      },
      "0".repeat(64),
    ),
    (error) =>
      error instanceof MetaWebhookDeadLetterError &&
      error.code === "CONFIRMATION_MISMATCH",
  );
  assert.equal(sendCalls, 0);
  assert.deepEqual(fixture.actions, []);
});

test("keeps the dead letter unacknowledged when requeueing fails", async () => {
  const fixture = deadLetterDelivery();
  const expectedEventKey = await sha256Hex(rawPayload);

  await assert.rejects(
    requeueConfirmedMetaWebhookDeadLetter(
      fixture.delivery,
      {
        async send() {
          throw new Error("private queue failure");
        },
      },
      expectedEventKey,
    ),
    (error) =>
      error instanceof MetaWebhookDeadLetterError &&
      error.code === "REQUEUE_UNAVAILABLE",
  );
  assert.deepEqual(fixture.actions, []);
});
