import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyDeliveryProviderRepository,
  postgresBotReplyDeliveryProviderSql,
} from "../server/platform/postgresBotReplyDeliveryProviderRepository.ts";

const deliveryKey = `bot_reply_delivery_v1_${"3".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"4".repeat(64)}`;
const providerMessageId = "wamid.bot-reply-provider-17";
const acceptedAt = "2026-08-21T10:00:01.000Z";
const deliveredAt = "2026-08-21T10:00:03.000Z";
const readAt = "2026-08-21T10:00:04.000Z";
const reconciledAt = "2026-08-21T10:00:05.000Z";

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function linkRow(overrides = {}) {
  return {
    deliveryKey,
    tenantId: "7",
    providerMessageId,
    reservationKey,
    providerStatus: "accepted",
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    terminalOutcome: null,
    terminalSettledAt: null,
    acceptedAt: new Date(acceptedAt),
    createdAt: new Date(acceptedAt),
    updatedAt: new Date(acceptedAt),
    ...overrides,
  };
}

function terminalRow(overrides = {}) {
  return linkRow({
    providerStatus: "delivered",
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: new Date(deliveredAt),
    terminalOutcome: "delivered",
    terminalSettledAt: new Date(reconciledAt),
    updatedAt: new Date(reconciledAt),
    ...overrides,
  });
}

function providerStatus(overrides = {}) {
  return {
    tenantId: 7,
    providerMessageId,
    status: "delivered",
    statusEventKey: "c".repeat(64),
    statusEventAt: deliveredAt,
    reconciledAt,
    ...overrides,
  };
}

function fixture(transactionResults) {
  const pending = [...transactionResults];
  const calls = [];
  const repository =
    createPostgresBotReplyDeliveryProviderRepository({
      transactions: {
        async transaction(options, execute) {
          assert.deepEqual(options, {
            isolationLevel: "read-committed",
          });
          return execute({
            async query(sql, parameters) {
              calls.push({ sql, parameters });
              const next = pending.shift();
              if (next === undefined) {
                throw new Error("Unexpected PostgreSQL query");
              }
              return next;
            },
          });
        },
      },
    });
  return {
    calls,
    repository,
    assertConsumed() {
      assert.equal(pending.length, 0);
    },
  };
}

test("applies terminal bot status and returns its exact reservation settlement", async () => {
  const database = fixture([
    result([linkRow()]),
    result([{ deliveryKey }]),
    result([terminalRow()]),
  ]);

  const saved = await database.repository.applyProviderStatus(
    providerStatus(),
  );

  assert.equal(saved.outcome, "applied");
  assert.deepEqual(saved.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: reconciledAt,
  });
  assert.deepEqual(database.calls.map(({ sql }) => sql), [
    postgresBotReplyDeliveryProviderSql.findByProviderMessageForUpdate,
    postgresBotReplyDeliveryProviderSql.applyProviderStatus,
    postgresBotReplyDeliveryProviderSql.findByProviderMessageForUpdate,
  ]);
  assert.deepEqual(database.calls[1].parameters, [
    7,
    providerMessageId,
    "delivered",
    "c".repeat(64),
    deliveredAt,
    "delivered",
    reconciledAt,
  ]);
  database.assertConsumed();
});

test("advances delivered to read without moving the first terminal settlement", async () => {
  const readRow = terminalRow({
    providerStatus: "read",
    lastStatusEventKey: "d".repeat(64),
    lastStatusEventAt: new Date(readAt),
    updatedAt: new Date(reconciledAt),
  });
  const database = fixture([
    result([terminalRow()]),
    result([{ deliveryKey }]),
    result([readRow]),
  ]);

  const saved = await database.repository.applyProviderStatus(
    providerStatus({
      status: "read",
      statusEventKey: "d".repeat(64),
      statusEventAt: readAt,
    }),
  );

  assert.equal(saved.outcome, "applied");
  assert.equal(saved.link.providerStatus, "read");
  assert.deepEqual(saved.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: reconciledAt,
  });
});

test("classifies duplicate, event conflict, terminal conflict, stale, and missing", async () => {
  const duplicate = fixture([result([terminalRow()])]);
  assert.equal(
    (await duplicate.repository.applyProviderStatus(
      providerStatus(),
    )).outcome,
    "duplicate",
  );

  const eventConflict = fixture([result([terminalRow()])]);
  assert.equal(
    (await eventConflict.repository.applyProviderStatus(
      providerStatus({ status: "read" }),
    )).outcome,
    "event-conflict",
  );

  const terminalConflict = fixture([result([terminalRow()])]);
  assert.equal(
    (await terminalConflict.repository.applyProviderStatus(
      providerStatus({
        status: "failed",
        statusEventKey: "e".repeat(64),
        statusEventAt: readAt,
      }),
    )).outcome,
    "terminal-conflict",
  );

  const stale = fixture([result([terminalRow()])]);
  const staleResult = await stale.repository.applyProviderStatus(
    providerStatus({
      status: "sent",
      statusEventKey: "f".repeat(64),
      statusEventAt: "2026-08-21T10:00:02.000Z",
    }),
  );
  assert.equal(staleResult.outcome, "stale");
  assert.deepEqual(staleResult.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: reconciledAt,
  });

  const missing = fixture([result([])]);
  assert.deepEqual(
    await missing.repository.applyProviderStatus(
      providerStatus(),
    ),
    { outcome: "not-found" },
  );
});

test("rejects invalid input, malformed state, and dependencies before mutation", async () => {
  assert.throws(
    () => createPostgresBotReplyDeliveryProviderRepository({}),
    /dependencies are invalid/,
  );

  const invalid = fixture([]);
  await assert.rejects(
    invalid.repository.applyProviderStatus(
      providerStatus({ tenantId: 0 }),
    ),
    /tenantId is invalid/,
  );
  assert.equal(invalid.calls.length, 0);

  const malformed = fixture([
    result([terminalRow({ tenantId: "8" })]),
  ]);
  await assert.rejects(
    malformed.repository.applyProviderStatus(
      providerStatus(),
    ),
    /cross-scope bot reply provider state/,
  );
});
