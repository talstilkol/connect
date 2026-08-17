import assert from "node:assert/strict";
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
} from "../server/platform/postgresBotReplyDeliveryRepository.ts";

const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const inboundMessageKey = `message_v1_${"2".repeat(64)}`;
const botFlowKey = `bot_flow_v1_${"3".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"4".repeat(64)}`;
const createdAt = new Date("2026-08-17T08:00:00.000Z");
const transitionAt = "2026-08-17T08:01:00.000Z";

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
    recipientPhoneNumber: input.recipientPhoneNumber,
    replyJson: input.reply,
    status: "pending",
    attemptCount: 0,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
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

test("records accepted, rejected, and ambiguous terminal transitions", async () => {
  const input = await stageInput();
  const accepted = repositoryFixture([], [{
    rows: [deliveryRow(input, {
      status: "accepted",
      attemptCount: 1,
      providerMessageId: "wamid.outbound-1",
      acceptedAt: new Date(transitionAt),
      updatedAt: new Date(transitionAt),
    })],
    rowCount: 1,
  }]);
  assert.equal(
    (await accepted.repository.markAccepted(
      7,
      input.deliveryKey,
      "wamid.outbound-1",
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
        lastErrorCode: errorCode,
        updatedAt: new Date(transitionAt),
      })],
      rowCount: 1,
    }]);
    const result = await database.repository[method](
      7,
      input.deliveryKey,
      errorCode,
      transitionAt,
    );
    assert.equal(result.status, status);
  }
  assert.match(postgresBotReplyDeliverySql.markAccepted, /status = 'sending'/);
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

  const lost = repositoryFixture([], [{ rows: [], rowCount: 0 }]);
  await assert.rejects(
    lost.repository.markAccepted(
      7,
      input.deliveryKey,
      "wamid.outbound-1",
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
