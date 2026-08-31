import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  BotReplyDeliveryIdentityConflictError,
} from "../db/botReplyDeliveryRepository.ts";
import {
  deriveBotReplyDeliveryKey,
} from "../server/bot/botReplyDeliveryKey.ts";
import {
  createPostgresBotReplyDeliveryRepository,
  postgresBotReplyDeliverySql,
  postgresBotReplyProviderDeferralVersion,
  postgresBotReplyProviderRequestVersion,
  postgresBotReplyServiceWindowRejectionVersion,
} from "../server/platform/postgresBotReplyDeliveryRepository.ts";

const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
const botFlowKey = `bot_flow_v1_${"3".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"4".repeat(64)}`;
const createdAt = new Date("2026-08-17T08:00:00.000Z");
const transitionAt = "2026-08-17T08:01:00.000Z";
const reservationKey =
  `whatsapp_rate_reservation_v1_${"5".repeat(64)}`;

async function stageInput(overrides = {}) {
  const replyIndex = overrides.replyIndex ?? 1;
  const reply = overrides.reply ?? { kind: "text", text: "קיבלנו את פנייתך." };
  const deliveryKey = overrides.deliveryKey ?? await deriveBotReplyDeliveryKey(7, {
    conversationKey,
    inboundMessageKey,
    botFlowVersionKey,
    replyIndex,
    reply,
  });
  return {
    deliveryKey,
    tenantId: 7,
    conversationKey,
    inboundMessageKey,
    botFlowKey,
    botFlowVersionKey,
    replyIndex,
    senderPhoneNumberId: "phone-number-id",
    recipientPhoneNumber: "+972501234567",
    reply,
    ...overrides,
  };
}

function deliveryRow(input, overrides = {}) {
  return {
    deliveryKey: input.deliveryKey,
    tenantId: "7",
    conversationKey: input.conversationKey,
    inboundMessageKey: input.inboundMessageKey,
    botFlowKey: input.botFlowKey,
    botFlowVersionKey: input.botFlowVersionKey,
    replyIndex: input.replyIndex,
    senderPhoneNumberId:
      input.senderPhoneNumberId,
    recipientPhoneNumber: input.recipientPhoneNumber,
    replyJson: input.reply,
    status: "pending",
    attemptCount: 0,
    claimVersion: 0,
    nextAttemptAt: null,
    deferredAt: null,
    lastDeferralReasonCode: null,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function providerDeferralInput(input, overrides = {}) {
  return {
    tenantId: 7,
    deliveryKey: input.deliveryKey,
    expectedClaimVersion: 1,
    attemptedAt: "2026-08-17T08:01:00.000Z",
    deferredAt: "2026-08-17T08:01:01.000Z",
    retryAt: "2026-08-17T08:01:17.000Z",
    reasonCode: "META_PHONE_THROUGHPUT_LIMITED",
    reservationKey,
    providerErrorCode: 130429,
    cooldownScope: "sender",
    retryAfterSeconds: 17,
    ...overrides,
  };
}

function providerDeferralRow(input) {
  const identity = {
    deliveryKey: input.deliveryKey,
    tenantId: input.tenantId,
    claimVersion: input.expectedClaimVersion,
    reservationKey: input.reservationKey,
    providerErrorCode: input.providerErrorCode,
    cooldownScope: input.cooldownScope,
    retryAfterSeconds: input.retryAfterSeconds,
    reasonCode: input.reasonCode,
    attemptedAt: input.attemptedAt,
    deferredAt: input.deferredAt,
    retryAt: input.retryAt,
  };
  const digest = createHash("sha256")
    .update(postgresBotReplyProviderDeferralVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");
  return {
    eventKey: `bot_reply_provider_deferral_v1_${digest}`,
    ...identity,
  };
}

function serviceWindowRejectionInput(input, overrides = {}) {
  return {
    tenantId: 7,
    deliveryKey: input.deliveryKey,
    expectedClaimVersion: 1,
    reservationKey,
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    serviceWindowOpenedAt: "2026-08-16T08:01:00.000Z",
    serviceWindowExpiresAt: "2026-08-17T08:01:00.000Z",
    attemptedAt: "2026-08-17T08:00:59.000Z",
    rejectedAt: "2026-08-17T08:01:00.000Z",
    ...overrides,
  };
}

function serviceWindowRejectionRow(input) {
  const identity = {
    deliveryKey: input.deliveryKey,
    tenantId: input.tenantId,
    claimVersion: input.expectedClaimVersion,
    reservationKey: input.reservationKey,
    providerErrorCode: input.providerErrorCode,
    reasonCode: input.reasonCode,
    serviceWindowOpenedAt: input.serviceWindowOpenedAt,
    serviceWindowExpiresAt: input.serviceWindowExpiresAt,
    attemptedAt: input.attemptedAt,
    rejectedAt: input.rejectedAt,
  };
  const digest = createHash("sha256")
    .update(postgresBotReplyServiceWindowRejectionVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");
  return {
    eventKey: `bot_reply_window_rejection_v1_${digest}`,
    ...identity,
  };
}

function providerRequestInput(input, overrides = {}) {
  return {
    tenantId: 7,
    deliveryKey: input.deliveryKey,
    expectedClaimVersion: 1,
    reservationKey,
    requestedAt: transitionAt,
    ...overrides,
  };
}

function providerRequestRow(input) {
  const identity = {
    deliveryKey: input.deliveryKey,
    tenantId: input.tenantId,
    claimVersion: input.expectedClaimVersion,
    reservationKey: input.reservationKey,
    requestedAt: input.requestedAt,
  };
  const digest = createHash("sha256")
    .update(postgresBotReplyProviderRequestVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");
  return {
    requestKey: `bot_reply_provider_request_v1_${digest}`,
    ...identity,
  };
}

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];
  return {
    calls,
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      const response = remaining.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error("Unexpected PostgreSQL query");
      return response;
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function repositoryFixture(transactionResponses = [], queryResponses = []) {
  const transactions = queryFixture(transactionResponses);
  const queries = queryFixture(queryResponses);
  const transactionCalls = [];
  return {
    transactions,
    queries,
    transactionCalls,
    repository: createPostgresBotReplyDeliveryRepository({
      queries,
      transactions: {
        async transaction(options, execute) {
          transactionCalls.push(options);
          return execute(transactions);
        },
      },
    }),
  };
}

test("stages one referentially scoped delivery in a transaction", async () => {
  const input = await stageInput();
  const database = repositoryFixture([
    { rows: [deliveryRow(input)], rowCount: 1 },
  ]);

  const result = await database.repository.stage(input);

  assert.equal(result.outcome, "created");
  assert.equal(result.delivery.status, "pending");
  assert.deepEqual(database.transactionCalls, [{ isolationLevel: "read-committed" }]);
  assert.match(postgresBotReplyDeliverySql.insertDelivery, /messages\.conversation_key = \$3/);
  assert.match(postgresBotReplyDeliverySql.insertDelivery, /messages\.direction = 'inbound'/);
  assert.match(postgresBotReplyDeliverySql.insertDelivery, /ON CONFLICT DO NOTHING/);
});

test("returns an exact stage replay and rejects either unique identity collision", async () => {
  const input = await stageInput();
  const replay = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [deliveryRow(input)], rowCount: 1 },
  ]);
  assert.equal((await replay.repository.stage(input)).outcome, "duplicate");
  assert.match(postgresBotReplyDeliverySql.findByKeyForUpdate, /FOR UPDATE/);

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [deliveryRow(input, { recipientPhoneNumber: "+972509876543" })],
      rowCount: 1,
    },
  ]);
  await assert.rejects(
    conflict.repository.stage(input),
    (error) => error instanceof BotReplyDeliveryIdentityConflictError,
  );

  const alternateKeyCollision = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    alternateKeyCollision.repository.stage(input),
    (error) => error instanceof BotReplyDeliveryIdentityConflictError,
  );
});

test("claims once and classifies concurrent, settled, and missing claims", async () => {
  const input = await stageInput();
  const sending = deliveryRow(input, {
    status: "sending",
    attemptCount: 1,
    claimVersion: 1,
    updatedAt: new Date(transitionAt),
  });
  const claimed = repositoryFixture([
    { rows: [sending], rowCount: 1 },
  ]);
  assert.equal(
    (await claimed.repository.claim(7, input.deliveryKey, transitionAt)).outcome,
    "claimed",
  );

  const uncertain = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [sending], rowCount: 1 },
  ]);
  assert.equal(
    (await uncertain.repository.claim(7, input.deliveryKey, transitionAt)).outcome,
    "uncertain",
  );

  const accepted = deliveryRow(input, {
    status: "accepted",
    attemptCount: 1,
    claimVersion: 1,
    providerMessageId: "wamid.outbound-1",
    acceptedAt: new Date(transitionAt),
    updatedAt: new Date(transitionAt),
  });
  const settled = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [accepted], rowCount: 1 },
  ]);
  assert.equal(
    (await settled.repository.claim(7, input.deliveryKey, transitionAt)).outcome,
    "duplicate",
  );

  const missing = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await missing.repository.claim(7, input.deliveryKey, transitionAt)).outcome,
    "not-found",
  );
});

test("fences one provider request per exact delivery claim", async () => {
  const input = await stageInput();
  const request = providerRequestInput(input);
  const expected = providerRequestRow(request);
  const created = repositoryFixture([
    { rows: [{ requestKey: expected.requestKey }], rowCount: 1 },
  ]);

  assert.deepEqual(
    await created.repository.claimProviderRequest(request),
    { outcome: "created", requestKey: expected.requestKey },
  );
  assert.equal(
    created.transactions.calls[0].sql,
    postgresBotReplyDeliverySql.insertProviderRequest,
  );
  assert.deepEqual(created.transactions.calls[0].parameters, [
    expected.requestKey,
    input.deliveryKey,
    7,
    1,
    reservationKey,
    transitionAt,
  ]);

  const duplicate = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [expected], rowCount: 1 },
  ]);
  assert.deepEqual(
    await duplicate.repository.claimProviderRequest(request),
    { outcome: "duplicate", requestKey: expected.requestKey },
  );

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [expected], rowCount: 1 },
  ]);
  await assert.rejects(
    conflict.repository.claimProviderRequest({
      ...request,
      reservationKey:
        `whatsapp_rate_reservation_v1_${"6".repeat(64)}`,
    }),
    (error) => error instanceof BotReplyDeliveryIdentityConflictError,
  );
  assert.match(
    postgresBotReplyDeliverySql.findProviderRequestForUpdate,
    /FOR UPDATE/,
  );
});

test("persists a due-time deferral and exposes only bounded retry work", async () => {
  const input = await stageInput();
  const deferredAt =
    "2026-08-17T08:01:00.000Z";
  const retryAt =
    "2026-08-17T08:01:06.000Z";
  const deferredRow = deliveryRow(input, {
    claimVersion: 1,
    nextAttemptAt: new Date(retryAt),
    deferredAt: new Date(deferredAt),
    lastDeferralReasonCode:
      "WHATSAPP_RATE_LIMITED",
    updatedAt: new Date(deferredAt),
  });
  const deferred = repositoryFixture([], [{
    rows: [deferredRow],
    rowCount: 1,
  }]);
  const result = await deferred.repository.defer(
    7,
    input.deliveryKey,
    1,
    deferredAt,
    retryAt,
    "WHATSAPP_RATE_LIMITED",
  );
  assert.equal(result.nextAttemptAt, retryAt);
  assert.deepEqual(
    deferred.queries.calls[0].parameters,
    [
      7,
      input.deliveryKey,
      1,
      deferredAt,
      retryAt,
      "WHATSAPP_RATE_LIMITED",
    ],
  );

  const early = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [deferredRow], rowCount: 1 },
  ]);
  assert.equal(
    (await early.repository.claim(
      7,
      input.deliveryKey,
      deferredAt,
    )).outcome,
    "deferred",
  );

  const due = repositoryFixture([], [{
    rows: [{
      deliveryKey: input.deliveryKey,
      tenantId: "7",
      senderPhoneNumberId:
        input.senderPhoneNumberId,
      claimVersion: "1",
      retryAt: new Date(retryAt),
      serviceWindowOpenedAt:
        new Date("2026-08-17T08:00:00.000Z"),
      serviceWindowExpiresAt:
        new Date("2026-08-18T08:00:00.000Z"),
    }],
    rowCount: 1,
  }]);
  assert.deepEqual(
    await due.repository.listDueDeferrals(
      retryAt,
      10,
    ),
    [{
      deliveryKey: input.deliveryKey,
      tenantId: 7,
      senderPhoneNumberId:
        input.senderPhoneNumberId,
      claimVersion: 1,
      retryAt,
      serviceWindowOpenedAt:
        "2026-08-17T08:00:00.000Z",
      serviceWindowExpiresAt:
        "2026-08-18T08:00:00.000Z",
    }],
  );
  assert.match(
    postgresBotReplyDeliverySql.claim,
    /claim_version = claim_version \+ 1/,
  );
  assert.match(
    postgresBotReplyDeliverySql.defer,
    /claim_version = \$3[\s\S]*INTERVAL '24 hours'/,
  );
});

test("atomically persists exact provider cooldown provenance with the deferral", async () => {
  const input = await stageInput();
  const command = providerDeferralInput(input);
  const provenance = providerDeferralRow(command);
  const deferredRow = deliveryRow(input, {
    claimVersion: 1,
    nextAttemptAt: new Date(command.retryAt),
    deferredAt: new Date(command.deferredAt),
    lastDeferralReasonCode: command.reasonCode,
    updatedAt: new Date(command.deferredAt),
  });
  const database = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [deferredRow], rowCount: 1 },
    { rows: [{ eventKey: provenance.eventKey }], rowCount: 1 },
    { rows: [provenance], rowCount: 1 },
  ]);

  const result = await database.repository.deferProviderRejection(command);

  assert.equal(result.status, "pending");
  assert.equal(result.nextAttemptAt, command.retryAt);
  assert.deepEqual(database.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(
    database.transactions.calls[2].parameters[0],
    provenance.eventKey,
  );
  assert.match(
    postgresBotReplyDeliverySql.insertProviderDeferral,
    /ON CONFLICT DO NOTHING/,
  );
  assert.match(
    postgresBotReplyDeliverySql.findProviderDeferralForUpdate,
    /FOR UPDATE/,
  );
});

test("returns an exact provider-deferral replay and rejects conflicting evidence", async () => {
  const input = await stageInput();
  const command = providerDeferralInput(input);
  const provenance = providerDeferralRow(command);
  const deferredRow = deliveryRow(input, {
    claimVersion: 1,
    nextAttemptAt: new Date(command.retryAt),
    deferredAt: new Date(command.deferredAt),
    lastDeferralReasonCode: command.reasonCode,
    updatedAt: new Date(command.deferredAt),
  });
  const replay = repositoryFixture([
    { rows: [provenance], rowCount: 1 },
    { rows: [deferredRow], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.deferProviderRejection(command)).status,
    "pending",
  );

  const conflict = repositoryFixture([
    {
      rows: [{
        ...provenance,
        reservationKey:
          `whatsapp_rate_reservation_v1_${"9".repeat(64)}`,
      }],
      rowCount: 1,
    },
  ]);
  await assert.rejects(
    () => conflict.repository.deferProviderRejection(command),
    /conflicting Bot reply provider provenance/,
  );
});

test("rejects provider provenance with an invalid code/scope or retry relation", async () => {
  const input = await stageInput();
  const database = repositoryFixture();
  await assert.rejects(
    () => database.repository.deferProviderRejection(
      providerDeferralInput(input, {
        cooldownScope: "pair",
      }),
    ),
    /provider deferral input is invalid/,
  );
  await assert.rejects(
    () => database.repository.deferProviderRejection(
      providerDeferralInput(input, {
        retryAt: "2026-08-17T08:01:18.000Z",
      }),
    ),
    /provider deferral input is invalid/,
  );
  assert.deepEqual(database.transactionCalls, []);
});

test("atomically persists exact Meta 131047 service-window provenance", async () => {
  const input = await stageInput();
  const command = serviceWindowRejectionInput(input);
  const provenance = serviceWindowRejectionRow(command);
  const rejectedRow = deliveryRow(input, {
    status: "rejected",
    attemptCount: 1,
    claimVersion: 1,
    lastErrorCode: command.reasonCode,
    updatedAt: new Date(command.rejectedAt),
  });
  const database = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [rejectedRow], rowCount: 1 },
    { rows: [{ eventKey: provenance.eventKey }], rowCount: 1 },
    { rows: [provenance], rowCount: 1 },
  ]);

  const result = await database.repository
    .rejectProviderServiceWindow(command);

  assert.equal(result.status, "rejected");
  assert.equal(result.lastErrorCode, "META_SERVICE_WINDOW_CLOSED");
  assert.equal(database.transactions.calls[2].parameters[0],
    provenance.eventKey);
  assert.match(
    postgresBotReplyDeliverySql.insertProviderServiceWindowRejection,
    /ON CONFLICT DO NOTHING/,
  );
  assert.match(
    postgresBotReplyDeliverySql
      .findProviderServiceWindowRejectionForUpdate,
    /FOR UPDATE/,
  );
});

test("rejects forged or conflicting Meta 131047 provenance", async () => {
  const input = await stageInput();
  const command = serviceWindowRejectionInput(input);
  const invalid = repositoryFixture();
  await assert.rejects(
    () => invalid.repository.rejectProviderServiceWindow({
      ...command,
      providerErrorCode: 131056,
    }),
    /service-window rejection input is invalid/,
  );
  await assert.rejects(
    () => invalid.repository.rejectProviderServiceWindow({
      ...command,
      attemptedAt: command.serviceWindowExpiresAt,
    }),
    /service-window rejection input is invalid/,
  );

  const provenance = serviceWindowRejectionRow(command);
  const conflict = repositoryFixture([{
    rows: [{
      ...provenance,
      reservationKey:
        `whatsapp_rate_reservation_v1_${"9".repeat(64)}`,
    }],
    rowCount: 1,
  }]);
  await assert.rejects(
    () => conflict.repository.rejectProviderServiceWindow(command),
    /conflicting Bot reply service-window provenance/,
  );
});

test("records accepted, rejected, and ambiguous terminal transitions", async () => {
  const input = await stageInput();
  const accepted = repositoryFixture([
    { rows: [{ deliveryKey: input.deliveryKey }], rowCount: 1 },
    {
      rows: [deliveryRow(input, {
        status: "accepted",
        attemptCount: 1,
        claimVersion: 1,
        providerMessageId: "wamid.outbound-1",
        acceptedAt: new Date(transitionAt),
        updatedAt: new Date(transitionAt),
      })],
      rowCount: 1,
    },
    {
      rows: [{
        providerMessageId: "wamid.outbound-1",
        reservationKey,
        acceptedAt: new Date(transitionAt),
      }],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await accepted.repository.markAccepted(
      7,
      input.deliveryKey,
      1,
      "wamid.outbound-1",
      reservationKey,
      transitionAt,
    )).status,
    "accepted",
  );

  for (const [method, status, errorCode] of [
    ["markRejected", "rejected", "POLICY_REJECTED"],
    ["markAmbiguous", "ambiguous", "PROVIDER_TIMEOUT"],
  ]) {
    const database = repositoryFixture([], [{
      rows: [deliveryRow(input, {
        status,
        attemptCount: 1,
        claimVersion: 1,
        lastErrorCode: errorCode,
        updatedAt: new Date(transitionAt),
      })],
      rowCount: 1,
    }]);
    const result = await database.repository[method](
      7,
      input.deliveryKey,
      1,
      errorCode,
      transitionAt,
    );
    assert.equal(result.status, status);
  }
  assert.match(postgresBotReplyDeliverySql.recordAcceptance, /status = 'sending'/);
  assert.match(postgresBotReplyDeliverySql.markFailure, /status = 'sending'/);
});

test("fails closed on invalid input, transition loss, malformed rows, and dependencies", async () => {
  const input = await stageInput();
  const empty = repositoryFixture();
  await assert.rejects(
    empty.repository.stage({ ...input, conversationKey: "bad" }),
    /conversationKey is invalid/,
  );
  await assert.rejects(
    empty.repository.claim(7, input.deliveryKey, "not-a-time"),
    /timestamp is invalid/,
  );

  const lost = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    lost.repository.markAccepted(
      7,
      input.deliveryKey,
      1,
      "wamid.outbound-1",
      reservationKey,
      transitionAt,
    ),
    /transition failed/,
  );

  const malformed = repositoryFixture([
    { rows: [deliveryRow(input, { tenantId: "8" })], rowCount: 1 },
  ]);
  await assert.rejects(
    malformed.repository.stage(input),
    /outside the scope/,
  );
  assert.throws(
    () => createPostgresBotReplyDeliveryRepository({}),
    /dependencies are invalid/,
  );
});
