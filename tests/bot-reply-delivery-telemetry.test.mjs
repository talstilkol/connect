import assert from "node:assert/strict";
import test from "node:test";

import {
  observeBotReplyProcessor,
} from "../server/operations/botReplyDeliveryTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../server/operations/providerRequestTelemetry.ts";

const deliveryKey = `bot_reply_delivery_v1_${"a".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"f".repeat(64)}`;

function prepared() {
  return {
    phoneNumberId: "300003",
    serviceWindowOpenedAt: "2026-08-21T09:00:00.000Z",
    serviceWindowExpiresAt: "2026-08-22T09:00:00.000Z",
    attemptedAt: "2026-08-21T10:00:00.000Z",
    delivery: {
      deliveryKey,
      tenantId: 7,
      conversationKey: `conversation_v1_${"b".repeat(64)}`,
      inboundMessageKey: `message_v1_${"c".repeat(64)}`,
      botFlowKey: `bot_flow_v1_${"d".repeat(64)}`,
      botFlowVersionKey: `bot_flow_version_v1_${"e".repeat(64)}`,
      replyIndex: 1,
      senderPhoneNumberId: "300003",
      recipientPhoneNumber: "+972501234567",
      reply: { kind: "text", text: "קיבלנו את פנייתך." },
      status: "sending",
      attemptCount: 1,
      claimVersion: 1,
      nextAttemptAt: null,
      deferredAt: null,
      lastDeferralReasonCode: null,
      providerMessageId: null,
      lastErrorCode: null,
      acceptedAt: null,
      createdAt: "2026-08-21T10:00:00.000Z",
      updatedAt: "2026-08-21T10:00:00.000Z",
    },
  };
}

test("records one bounded bot reply parent with its Meta child request", async () => {
  const events = [];
  const timestamps = [
    "2026-08-21T10:00:00.000Z",
    "2026-08-21T10:00:00.010Z",
    "2026-08-21T10:00:00.030Z",
    "2026-08-21T10:00:00.040Z",
  ].map((value) => new Date(value));
  const clock = {
    now() {
      const value = timestamps.shift();
      if (value === undefined) throw new Error("test clock exhausted");
      return value;
    },
  };
  const scope = createProviderRequestTelemetryScope();
  const processor = observeBotReplyProcessor({
    isConfigured() {
      return true;
    },
    async process() {
      const started = clock.now();
      const completed = clock.now();
      scope.record({
        provider: "meta",
        operation: "bot-reply.send",
        outcome: "completed",
        startedAt: started.toISOString(),
        completedAt: completed.toISOString(),
        durationMilliseconds: completed.getTime() - started.getTime(),
      });
      return {
        outcome: "accepted",
        providerMessageId: "wamid.bot-reply-telemetry-1",
        reservationKey,
      };
    },
  }, {
    async record(event) {
      events.push(event);
      return { outcome: "recorded" };
    },
  }, clock, scope);

  assert.deepEqual(await processor.process(prepared()), {
    outcome: "accepted",
    providerMessageId: "wamid.bot-reply-telemetry-1",
    reservationKey,
  });
  assert.deepEqual(events, [{
    version: 1,
    kind: "delivery-attempt",
    queue: "bot-reply",
    outcome: "accepted",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.040Z",
    durationMilliseconds: 40,
    providerRequests: [{
      provider: "meta",
      operation: "bot-reply.send",
      outcome: "completed",
      startedAt: "2026-08-21T10:00:00.010Z",
      completedAt: "2026-08-21T10:00:00.030Z",
      durationMilliseconds: 20,
    }],
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|phone|deliveryKey|message|token|payload|url/i,
  );
});

test("records thrown processors as failed without provider details", async () => {
  const events = [];
  const timestamps = [
    new Date("2026-08-21T10:00:00.000Z"),
    new Date("2026-08-21T10:00:00.010Z"),
  ];
  const scope = createProviderRequestTelemetryScope();
  const processor = observeBotReplyProcessor({
    isConfigured() {
      return true;
    },
    async process() {
      throw new Error("private failure");
    },
  }, {
    async record(event) {
      events.push(event);
    },
  }, {
    now() {
      const value = timestamps.shift();
      if (value === undefined) throw new Error("test clock exhausted");
      return value;
    },
  }, scope);

  await assert.rejects(
    processor.process(prepared()),
    /private failure/,
  );
  assert.deepEqual(events, [{
    version: 1,
    kind: "delivery-attempt",
    queue: "bot-reply",
    outcome: "failed",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.010Z",
    durationMilliseconds: 10,
  }]);
});
