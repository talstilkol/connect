import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresCampaignDeliveryProviderRepository,
  postgresCampaignDeliveryProviderSql,
} from "../server/platform/postgresCampaignDeliveryProviderRepository.ts";

const deliveryKey = `campaign_delivery_v1_${"3".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"4".repeat(64)}`;
const providerMessageId = "wamid.campaign-provider-17";
const acceptedAt = "2026-08-19T10:00:01.000Z";
const deliveredAt = "2026-08-19T10:00:03.000Z";
const reconciledAt = "2026-08-19T10:00:05.000Z";

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
    recipientStatus: "accepted",
    ...overrides,
  };
}

function fixture(transactionResults) {
  const pending = [...transactionResults];
  const calls = [];
  const repository = createPostgresCampaignDeliveryProviderRepository({
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            const next = pending.shift();
            if (next === undefined) throw new Error("Unexpected query");
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

function acceptance(overrides = {}) {
  return {
    tenantId: 7,
    deliveryKey,
    providerMessageId,
    reservationKey,
    acceptedAt,
    ...overrides,
  };
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

function deliveredRow(overrides = {}) {
  return linkRow({
    providerStatus: "delivered",
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: new Date(deliveredAt),
    terminalOutcome: "delivered",
    terminalSettledAt: new Date(reconciledAt),
    updatedAt: new Date(reconciledAt),
    recipientStatus: "delivered",
    ...overrides,
  });
}

test("records provider acceptance and confirms its projected recipient", async () => {
  const database = fixture([
    result([{ deliveryKey }]),
    result([linkRow()]),
  ]);
  const saved = await database.repository.recordAccepted(acceptance());

  assert.equal(saved.outcome, "recorded");
  assert.equal(saved.link.recipientStatus, "accepted");
  assert.deepEqual(database.calls.map(({ sql }) => sql), [
    postgresCampaignDeliveryProviderSql.insertAcceptance,
    postgresCampaignDeliveryProviderSql.findByDeliveryForUpdate,
  ]);
  assert.deepEqual(database.calls[0].parameters, [
    7,
    deliveryKey,
    providerMessageId,
    reservationKey,
    acceptedAt,
  ]);
  database.assertConsumed();
});

test("keeps an exact provider acceptance retry idempotent", async () => {
  const database = fixture([result([]), result([linkRow()])]);
  const saved = await database.repository.recordAccepted(acceptance());

  assert.equal(saved.outcome, "idempotent");
  database.assertConsumed();
});

test("locks the provider link and projected recipient as one consistent view", () => {
  assert.match(
    postgresCampaignDeliveryProviderSql.findByDeliveryForUpdate,
    /FOR UPDATE OF link, recipient/,
  );
  assert.match(
    postgresCampaignDeliveryProviderSql.findByProviderMessageForUpdate,
    /FOR UPDATE OF link, recipient/,
  );
});

test("applies a terminal event and returns its exact settlement", async () => {
  const database = fixture([
    result([linkRow()]),
    result([{ deliveryKey }]),
    result([deliveredRow()]),
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
    postgresCampaignDeliveryProviderSql.findByProviderMessageForUpdate,
    postgresCampaignDeliveryProviderSql.applyProviderStatus,
    postgresCampaignDeliveryProviderSql.findByProviderMessageForUpdate,
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

test("classifies duplicate, event conflict, terminal conflict, stale, and missing", async () => {
  const duplicate = fixture([result([deliveredRow()])]);
  assert.equal(
    (await duplicate.repository.applyProviderStatus(providerStatus())).outcome,
    "duplicate",
  );

  const eventConflict = fixture([result([deliveredRow()])]);
  assert.equal(
    (await eventConflict.repository.applyProviderStatus(
      providerStatus({ status: "read" }),
    )).outcome,
    "event-conflict",
  );

  const terminalConflict = fixture([result([deliveredRow()])]);
  assert.equal(
    (await terminalConflict.repository.applyProviderStatus(
      providerStatus({
        status: "failed",
        statusEventKey: "d".repeat(64),
        statusEventAt: "2026-08-19T10:00:04.000Z",
      }),
    )).outcome,
    "terminal-conflict",
  );

  const stale = fixture([result([deliveredRow()])]);
  const staleResult = await stale.repository.applyProviderStatus(
    providerStatus({
      status: "sent",
      statusEventKey: "e".repeat(64),
      statusEventAt: "2026-08-19T10:00:02.000Z",
    }),
  );
  assert.equal(staleResult.outcome, "stale");

  const missing = fixture([result([])]);
  assert.deepEqual(
    await missing.repository.applyProviderStatus(providerStatus()),
    { outcome: "not-found" },
  );
});

test("fails closed for acceptance conflicts and malformed database state", async () => {
  const conflict = fixture([
    result([]),
    result([linkRow({ providerMessageId: "wamid.other" })]),
  ]);
  await assert.rejects(
    conflict.repository.recordAccepted(acceptance()),
    /acceptance identity conflicts/,
  );

  const crossTenant = fixture([result([linkRow({ tenantId: "8" })])]);
  await assert.rejects(
    crossTenant.repository.applyProviderStatus(providerStatus()),
    /cross-tenant provider state/,
  );

  const inconsistent = fixture([
    result([deliveredRow({ recipientStatus: "accepted" })]),
  ]);
  await assert.rejects(
    inconsistent.repository.applyProviderStatus(providerStatus()),
    /inconsistent campaign provider state/,
  );
});

test("rejects invalid input and dependencies before mutation", async () => {
  assert.throws(
    () => createPostgresCampaignDeliveryProviderRepository({}),
    /dependencies are invalid/,
  );
  const database = fixture([]);
  await assert.rejects(
    database.repository.recordAccepted(acceptance({ tenantId: 0 })),
    /tenantId is invalid/,
  );
  await assert.rejects(
    database.repository.recordAccepted(
      acceptance({ providerMessageId: " provider " }),
    ),
    /providerMessageId is invalid/,
  );
  await assert.rejects(
    database.repository.applyProviderStatus(
      providerStatus({ statusEventKey: "invalid" }),
    ),
    /statusEventKey is invalid/,
  );
  assert.equal(database.calls.length, 0);
});
