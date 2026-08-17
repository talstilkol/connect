import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresWhatsappRateLimitRepository,
  postgresWhatsappRateLimitSql,
} from "../server/platform/postgresWhatsappRateLimitRepository.ts";

const reservationKey = `whatsapp_rate_reservation_v1_${"a".repeat(64)}`;
const portfolioKey = `whatsapp_portfolio_v1_${"b".repeat(64)}`;
const senderKey = `whatsapp_sender_v1_${"c".repeat(64)}`;
const recipientKey = `whatsapp_recipient_v1_${"d".repeat(64)}`;
const policyEventKey =
  `whatsapp_delivery_policy_event_v1_${"e".repeat(64)}`;
const reservedAt = "2026-08-17T09:00:00.000Z";
const pairReservedUntil = "2026-08-17T09:00:06.000Z";
const reservationExpiresAt = "2026-08-17T09:05:00.000Z";

function reservationCommand(overrides = {}) {
  return {
    reservationKey,
    tenantId: 7,
    portfolioKey,
    senderKey,
    recipientKey,
    policyEventKey,
    templateCategory: "MARKETING",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservedAt,
    reservationExpiresAt,
    ...overrides,
  };
}

function reservationRow(overrides = {}) {
  return {
    reservationKey,
    tenantId: "7",
    portfolioKey,
    senderKey,
    recipientKey,
    policyEventKey,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    templateCategory: "MARKETING",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    reservedAt: new Date(reservedAt),
    pairReservedUntil: new Date(pairReservedUntil),
    reservationExpiresAt: new Date(reservationExpiresAt),
    ...overrides,
  };
}

function blockerRow(overrides = {}) {
  return {
    tenantFound: true,
    providerBlockedUntil: null,
    providerCooldownScope: null,
    providerErrorCode: null,
    pairReservedUntil: null,
    activeReservationExpiresAt: null,
    throughputReservationCount: "0",
    throughputOldestReservedAt: null,
    recipientDeliveredInWindow: false,
    occupiedUniqueRecipients: "0",
    ...overrides,
  };
}

function settlementRow(overrides = {}) {
  return {
    reservationKey,
    outcome: "delivered",
    settledAt: new Date("2026-08-17T09:01:00.000Z"),
    ...overrides,
  };
}

function cooldownRow(overrides = {}) {
  return {
    reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt: new Date("2026-08-17T09:01:00.000Z"),
    blockedUntil: new Date("2026-08-17T09:01:30.000Z"),
    ...overrides,
  };
}

function fixture(transactionResults = [], queryResults = []) {
  const transactionCalls = [];
  const queryCalls = [];
  let transactionIndex = 0;
  let queryIndex = 0;
  return {
    transactionCalls,
    queryCalls,
    dependencies: {
      queries: {
        async query(sql, parameters) {
          queryCalls.push({ sql, parameters });
          const rows = queryResults[queryIndex] ?? [];
          queryIndex += 1;
          return { rows, rowCount: rows.length };
        },
      },
      transactions: {
        async transaction(options, execute) {
          assert.deepEqual(options, { isolationLevel: "read-committed" });
          return execute({
            async query(sql, parameters) {
              transactionCalls.push({ sql, parameters });
              if (
                sql ===
                postgresWhatsappRateLimitSql.lockThroughputScope
              ) {
                return {
                  rows: [{ locked: "" }],
                  rowCount: 1,
                };
              }
              const rows = transactionResults[transactionIndex] ?? [];
              transactionIndex += 1;
              return { rows, rowCount: rows.length };
            },
          });
        },
      },
    },
  };
}

test("reserves one bounded recipient behind pair and portfolio locks", async () => {
  const testFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [],
    [blockerRow()],
    [reservationRow()],
  ]);
  const result = await createPostgresWhatsappRateLimitRepository(
    testFixture.dependencies,
  ).reserveBusinessInitiatedMessage(reservationCommand());

  assert.equal(result.outcome, "reserved");
  assert.equal(result.idempotent, false);
  assert.deepEqual(testFixture.transactionCalls.map(({ sql }) => sql), [
    postgresWhatsappRateLimitSql.lockThroughputScope,
    postgresWhatsappRateLimitSql.lockPairScope,
    postgresWhatsappRateLimitSql.lockPortfolioScope,
    postgresWhatsappRateLimitSql.findReservation,
    postgresWhatsappRateLimitSql.findBlocker,
    postgresWhatsappRateLimitSql.insertReservation,
  ]);
  assert.match(
    postgresWhatsappRateLimitSql.insertReservation,
    /ON CONFLICT \(reservation_key\) DO NOTHING/,
  );
});

test("returns an exact reservation replay or its terminal settlement", async () => {
  const replayFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [reservationRow()],
    [],
  ]);
  const replay = await createPostgresWhatsappRateLimitRepository(
    replayFixture.dependencies,
  ).reserveBusinessInitiatedMessage(reservationCommand());
  assert.equal(replay.outcome, "reserved");
  assert.equal(replay.idempotent, true);

  const retiredFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [reservationRow()],
    [settlementRow()],
  ]);
  const retired = await createPostgresWhatsappRateLimitRepository(
    retiredFixture.dependencies,
  ).reserveBusinessInitiatedMessage(reservationCommand());
  assert.equal(retired.outcome, "reservation-retired");
});

test("rejects a reservation-key collision including template category", async () => {
  const testFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [reservationRow({ templateCategory: "UTILITY" })],
  ]);
  await assert.rejects(
    createPostgresWhatsappRateLimitRepository(
      testFixture.dependencies,
    ).reserveBusinessInitiatedMessage(reservationCommand()),
    /reservation key collision/,
  );
});

test("classifies provider, pair, in-flight, and portfolio blockers", async () => {
  const cases = [
    [
      blockerRow({
        providerBlockedUntil: new Date("2026-08-17T10:00:00.000Z"),
        providerCooldownScope: "portfolio-recipient",
        providerErrorCode: 131049,
      }),
      "provider-cooldown",
    ],
    [
      blockerRow({
        pairReservedUntil: new Date("2026-08-17T09:00:06.000Z"),
      }),
      "pair-limited",
    ],
    [
      blockerRow({
        activeReservationExpiresAt: new Date(reservationExpiresAt),
      }),
      "recipient-in-flight",
    ],
    [blockerRow({ occupiedUniqueRecipients: "250" }), "portfolio-limited"],
  ];

  for (const [blocker, expectedOutcome] of cases) {
    const testFixture = fixture([
      [{ locked: "" }],
      [{ locked: "" }],
      [],
      [blocker],
    ]);
    const result = await createPostgresWhatsappRateLimitRepository(
      testFixture.dependencies,
    ).reserveBusinessInitiatedMessage(reservationCommand());
    assert.equal(result.outcome, expectedOutcome);
    assert.equal(testFixture.transactionCalls.length, 5);
  }
});

test("does not consume portfolio capacity twice for a delivered recipient", async () => {
  const testFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [],
    [
      blockerRow({
        recipientDeliveredInWindow: true,
        occupiedUniqueRecipients: "250",
      }),
    ],
    [reservationRow()],
  ]);
  const result = await createPostgresWhatsappRateLimitRepository(
    testFixture.dependencies,
  ).reserveBusinessInitiatedMessage(reservationCommand());
  assert.equal(result.outcome, "reserved");
});

test("returns the exact rolling phone-throughput retry boundary", async () => {
  const testFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [],
    [
      blockerRow({
        throughputReservationCount: "64",
        throughputOldestReservedAt: new Date(
          "2026-08-17T08:59:59.500Z",
        ),
      }),
    ],
  ]);
  const result = await createPostgresWhatsappRateLimitRepository(
    testFixture.dependencies,
  ).reserveBusinessInitiatedMessage(reservationCommand());

  assert.deepEqual(result, {
    outcome: "phone-throughput-limited",
    retryAt: "2026-08-17T09:00:00.500Z",
  });
});

test("settles once behind the locked reservation and detects conflict", async () => {
  const createdFixture = fixture([
    [reservationRow()],
    [],
    [settlementRow()],
  ]);
  const created = await createPostgresWhatsappRateLimitRepository(
    createdFixture.dependencies,
  ).settle({
    reservationKey,
    outcome: "delivered",
    settledAt: "2026-08-17T09:01:00.000Z",
  });
  assert.equal(created.outcome, "settled");
  assert.equal(created.idempotent, false);
  assert.equal(
    createdFixture.transactionCalls[0].sql,
    postgresWhatsappRateLimitSql.findReservationForUpdate,
  );

  const conflictFixture = fixture([
    [reservationRow()],
    [settlementRow({ outcome: "provider-failed" })],
  ]);
  const conflict = await createPostgresWhatsappRateLimitRepository(
    conflictFixture.dependencies,
  ).settle({
    reservationKey,
    outcome: "delivered",
    settledAt: "2026-08-17T09:01:00.000Z",
  });
  assert.equal(conflict.outcome, "settlement-conflict");
});

test("stores provider-failed settlement and cooldown in one transaction", async () => {
  const testFixture = fixture([
    [reservationRow()],
    [],
    [],
    [settlementRow({ outcome: "provider-failed" })],
    [cooldownRow()],
  ]);
  const result = await createPostgresWhatsappRateLimitRepository(
    testFixture.dependencies,
  ).applyProviderCooldown({
    reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt: "2026-08-17T09:01:00.000Z",
    blockedUntil: "2026-08-17T09:01:30.000Z",
  });

  assert.equal(result.outcome, "applied");
  assert.equal(result.idempotent, false);
  assert.deepEqual(testFixture.transactionCalls.slice(-2).map(({ sql }) => sql), [
    postgresWhatsappRateLimitSql.insertSettlement,
    postgresWhatsappRateLimitSql.insertProviderCooldown,
  ]);
});

test("fails closed for malformed commands and PostgreSQL rows", async () => {
  const repository = createPostgresWhatsappRateLimitRepository(
    fixture([]).dependencies,
  );
  await assert.rejects(
    repository.reserveBusinessInitiatedMessage(
      reservationCommand({ reservationExpiresAt: reservedAt }),
    ),
    /safe reservation window/,
  );
  await assert.rejects(
    repository.applyProviderCooldown({
      reservationKey,
      scope: "sender",
      providerErrorCode: 131056,
      observedAt: "2026-08-17T09:01:00.000Z",
      blockedUntil: "2026-08-17T09:01:30.000Z",
    }),
    /scope does not match/,
  );

  const malformedFixture = fixture([
    [{ locked: "" }],
    [{ locked: "" }],
    [reservationRow({ pairReservedUntil: new Date(reservedAt) })],
  ]);
  await assert.rejects(
    createPostgresWhatsappRateLimitRepository(
      malformedFixture.dependencies,
    ).reserveBusinessInitiatedMessage(reservationCommand()),
    /invalid reservation times/,
  );
});
