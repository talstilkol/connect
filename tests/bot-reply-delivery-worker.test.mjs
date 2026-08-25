import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyDeliveryWorker,
  createBotReplyDueDeliveryRunner,
} from "../server/bot/botReplyDeliveryWorker.ts";

const deliveryKey =
  `bot_reply_delivery_v1_${"a".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"f".repeat(64)}`;
const openedAt = "2026-08-20T12:00:00.000Z";
const expiresAt = "2026-08-21T12:00:00.000Z";
const attemptedAt = "2026-08-21T11:59:00.000Z";

function delivery(overrides = {}) {
  return {
    deliveryKey,
    tenantId: 7,
    conversationKey:
      `conversation_v1_${"b".repeat(64)}`,
    inboundMessageKey:
      `message_v1_${"c".repeat(64)}`,
    botFlowKey:
      `bot_flow_v1_${"d".repeat(64)}`,
    botFlowVersionKey:
      `bot_flow_version_v1_${"e".repeat(64)}`,
    replyIndex: 1,
    senderPhoneNumberId: "100000000000007",
    recipientPhoneNumber: "+972501234567",
    reply: {
      kind: "text",
      text: "הודעת שירות",
    },
    status: "sending",
    attemptCount: 1,
    claimVersion: 2,
    nextAttemptAt: null,
    deferredAt: null,
    lastDeferralReasonCode: null,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt: openedAt,
    updatedAt: attemptedAt,
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = {
    claims: [],
    deferred: [],
    providerDeferrals: [],
    providerWindowRejections: [],
    accepted: [],
    rejected: [],
    ambiguous: [],
    provider: [],
    dueReads: [],
  };
  const claimedDelivery = delivery();
  const repository = {
    async claim(tenantId, key, timestamp) {
      calls.claims.push({ tenantId, key, timestamp });
      return options.claimResult ?? {
        outcome: "claimed",
        delivery: claimedDelivery,
      };
    },
    async defer(
      tenantId,
      key,
      claimVersion,
      timestamp,
      retryAt,
      reasonCode,
    ) {
      calls.deferred.push({
        tenantId,
        key,
        claimVersion,
        timestamp,
        retryAt,
        reasonCode,
      });
      return delivery({
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: retryAt,
        deferredAt: timestamp,
        lastDeferralReasonCode: reasonCode,
      });
    },
    async deferProviderRejection(input) {
      calls.providerDeferrals.push(structuredClone(input));
      return delivery({
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: input.retryAt,
        deferredAt: input.deferredAt,
        lastDeferralReasonCode: input.reasonCode,
      });
    },
    async rejectProviderServiceWindow(input) {
      calls.providerWindowRejections.push(structuredClone(input));
      return delivery({
        status: "rejected",
        lastErrorCode: input.reasonCode,
        updatedAt: input.rejectedAt,
      });
    },
    async markAccepted(
      tenantId,
      key,
      claimVersion,
      providerMessageId,
      acceptedReservationKey,
      timestamp,
    ) {
      calls.accepted.push({
        tenantId,
        key,
        claimVersion,
        providerMessageId,
        reservationKey: acceptedReservationKey,
        timestamp,
      });
      return delivery({ status: "accepted" });
    },
    async markRejected(
      tenantId,
      key,
      claimVersion,
      errorCode,
      timestamp,
    ) {
      calls.rejected.push({
        tenantId,
        key,
        claimVersion,
        errorCode,
        timestamp,
      });
      return delivery({ status: "rejected" });
    },
    async markAmbiguous(
      tenantId,
      key,
      claimVersion,
      errorCode,
      timestamp,
    ) {
      calls.ambiguous.push({
        tenantId,
        key,
        claimVersion,
        errorCode,
        timestamp,
      });
      return delivery({ status: "ambiguous" });
    },
    async listDueDeferrals(timestamp, limit) {
      calls.dueReads.push({ timestamp, limit });
      return options.due ?? [];
    },
  };
  const processor = {
    isConfigured() {
      return options.configured !== false;
    },
    async process(prepared) {
      calls.provider.push(prepared);
      if (options.processorError) {
        throw options.processorError;
      }
      return options.processorResult ?? {
        outcome: "accepted",
        providerMessageId: "wamid.bot-worker-accepted",
        reservationKey,
      };
    },
  };
  const clock = {
    now() {
      return new Date(attemptedAt);
    },
  };
  const worker = createBotReplyDeliveryWorker(
    repository,
    processor,
    clock,
  );

  return {
    calls,
    repository,
    worker,
    runner: createBotReplyDueDeliveryRunner(
      repository,
      worker,
      clock,
    ),
  };
}

function dispatchInput() {
  return {
    tenantId: 7,
    deliveryKey,
    serviceWindowOpenedAt: openedAt,
    serviceWindowExpiresAt: expiresAt,
  };
}

test("persists an admission deferral without provider acceptance", async () => {
  const current = fixture({
    processorResult: {
      outcome: "deferred",
      errorCode: "WHATSAPP_PAIR_LIMITED",
      retryAt: "2026-08-21T11:59:06.000Z",
    },
  });

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    {
      outcome: "deferred",
      retryAt: "2026-08-21T11:59:06.000Z",
    },
  );
  assert.equal(current.calls.deferred.length, 1);
  assert.equal(
    current.calls.deferred[0].claimVersion,
    2,
  );
  assert.deepEqual(current.calls.accepted, []);
  assert.deepEqual(current.calls.ambiguous, []);
  assert.deepEqual(current.calls.providerDeferrals, []);
});

test("binds an exact provider cooldown to the delivery claim and reservation", async () => {
  const retryAt = "2026-08-21T11:59:17.000Z";
  const current = fixture({
    processorResult: {
      outcome: "deferred",
      errorCode: "META_PHONE_THROUGHPUT_LIMITED",
      retryAt,
      reservationKey,
      providerErrorCode: 130429,
      cooldownScope: "sender",
      retryAfterSeconds: 17,
    },
  });

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "deferred", retryAt },
  );
  assert.deepEqual(current.calls.deferred, []);
  assert.deepEqual(current.calls.providerDeferrals, [{
    tenantId: 7,
    deliveryKey,
    expectedClaimVersion: 2,
    attemptedAt,
    deferredAt: attemptedAt,
    retryAt,
    reasonCode: "META_PHONE_THROUGHPUT_LIMITED",
    reservationKey,
    providerErrorCode: 130429,
    cooldownScope: "sender",
    retryAfterSeconds: 17,
  }]);
  assert.deepEqual(current.calls.ambiguous, []);
});

test("fails closed when provider cooldown provenance cannot be persisted", async () => {
  const current = fixture({
    processorResult: {
      outcome: "deferred",
      errorCode: "META_PAIR_RATE_LIMITED",
      retryAt: "2026-08-21T11:59:04.000Z",
      reservationKey,
      providerErrorCode: 131056,
      cooldownScope: "pair",
      retryAfterSeconds: 4,
    },
  });
  delete current.repository.deferProviderRejection;

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "ambiguous" },
  );
  assert.deepEqual(current.calls.deferred, []);
  assert.equal(current.calls.ambiguous.length, 1);
});

test("binds Meta 131047 to the exact claim, reservation and local window", async () => {
  const current = fixture({
    processorResult: {
      outcome: "rejected",
      errorCode: "META_SERVICE_WINDOW_CLOSED",
      reservationKey,
      providerErrorCode: 131047,
    },
  });

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "rejected" },
  );
  assert.deepEqual(current.calls.rejected, []);
  assert.deepEqual(current.calls.providerWindowRejections, [{
    tenantId: 7,
    deliveryKey,
    expectedClaimVersion: 2,
    reservationKey,
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    serviceWindowOpenedAt: openedAt,
    serviceWindowExpiresAt: expiresAt,
    attemptedAt,
    rejectedAt: attemptedAt,
  }]);
  assert.deepEqual(current.calls.ambiguous, []);
});

test("fails closed when 131047 provenance persistence is unavailable", async () => {
  const current = fixture({
    processorResult: {
      outcome: "rejected",
      errorCode: "META_SERVICE_WINDOW_CLOSED",
      reservationKey,
      providerErrorCode: 131047,
    },
  });
  delete current.repository.rejectProviderServiceWindow;

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "ambiguous" },
  );
  assert.deepEqual(current.calls.rejected, []);
  assert.equal(current.calls.ambiguous.length, 1);
});

test("does not overwrite or resubmit another worker's active claim", async () => {
  const current = fixture({
    claimResult: {
      outcome: "uncertain",
      delivery: delivery(),
    },
  });

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "in-progress" },
  );
  assert.deepEqual(current.calls.provider, []);
  assert.deepEqual(current.calls.ambiguous, []);
});

test("rejects instead of deferring at or beyond the service-window boundary", async () => {
  const current = fixture({
    processorResult: {
      outcome: "deferred",
      errorCode: "WHATSAPP_PAIR_LIMITED",
      retryAt: expiresAt,
    },
  });

  assert.deepEqual(
    await current.worker.dispatch(dispatchInput()),
    { outcome: "rejected" },
  );
  assert.equal(
    current.calls.rejected[0].errorCode,
    "META_SERVICE_WINDOW_CLOSED_LOCAL",
  );
  assert.deepEqual(current.calls.deferred, []);
});

test("runs due deliveries directly from the outbox without a webhook or flow input", async () => {
  const current = fixture({
    due: [{
      deliveryKey,
      tenantId: 7,
      senderPhoneNumberId: "100000000000007",
      claimVersion: 1,
      retryAt: "2026-08-21T11:58:00.000Z",
      serviceWindowOpenedAt: openedAt,
      serviceWindowExpiresAt: expiresAt,
    }],
  });

  assert.deepEqual(await current.runner.run(25), {
    scanned: 1,
    accepted: 1,
    rejected: 0,
    deferred: 0,
    ambiguous: 0,
    duplicates: 0,
    inProgress: 0,
  });
  assert.deepEqual(current.calls.dueReads, [{
    timestamp: attemptedAt,
    limit: 25,
  }]);
  assert.equal(current.calls.provider.length, 1);
  assert.equal(current.calls.accepted.length, 1);
});
