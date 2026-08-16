import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createWhatsappRateLimitRepository,
} from "../db/whatsappRateLimitRepository.ts";

const portfolioKey = key(
  "whatsapp_portfolio_v1_",
  1,
);
const senderKey = key(
  "whatsapp_sender_v1_",
  2,
);
const secondSenderKey = key(
  "whatsapp_sender_v1_",
  3,
);
const recipientKey = key(
  "whatsapp_recipient_v1_",
  4,
);
const reservedAt = "2026-08-16T10:00:00.000Z";
const expiresAt = "2026-08-16T10:01:00.000Z";

function key(prefix, value) {
  return `${prefix}${value.toString(16).padStart(64, "0")}`;
}

function atOffset(timestamp, milliseconds) {
  return new Date(
    Date.parse(timestamp) + milliseconds,
  ).toISOString();
}

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.statement.get(...this.values) ?? null;
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(...this.values),
    };
  }

  async run() {
    const result = this.statement.run(...this.values);

    return {
      success: true,
      meta: {
        changes: Number(result.changes),
      },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");

    try {
      const results = [];

      for (const statement of statements) {
        results.push(await statement.run());
      }

      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createSqliteD1() {
  const migrationsUrl = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(new URL(fileName, migrationsUrl), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  database.exec(
    migrationParts
      .join("\n")
      .replaceAll("--> statement-breakpoint", ""),
  );
  database.prepare(`
    INSERT INTO tenants (
      id,
      display_name,
      status,
      created_at,
      updated_at
    ) VALUES (7, 'Tenant 7', 'active', ?1, ?1)
  `).run(reservedAt);

  return {
    database,
    repository: createWhatsappRateLimitRepository(
      new SqliteD1Database(database),
    ),
  };
}

function reservationCommand(overrides = {}) {
  return {
    reservationKey: key(
      "whatsapp_rate_reservation_v1_",
      10,
    ),
    tenantId: 7,
    portfolioKey,
    senderKey,
    recipientKey,
    templateCategory: "UTILITY",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    reservedAt,
    reservationExpiresAt: expiresAt,
    ...overrides,
  };
}

test("atomically reserves pair and portfolio state and repeats idempotently", async () => {
  const { database, repository } =
    await createSqliteD1();
  const command = reservationCommand();
  const first = await repository
    .reserveBusinessInitiatedMessage(command);
  const repeated = await repository
    .reserveBusinessInitiatedMessage(command);

  assert.equal(first.outcome, "reserved");
  assert.equal(first.idempotent, false);
  assert.equal(
    first.reservation.pairReservedUntil,
    "2026-08-16T10:00:06.000Z",
  );
  assert.equal(repeated.outcome, "reserved");
  assert.equal(repeated.idempotent, true);
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM whatsapp_rate_limit_reservations
    `).get().count,
    1,
  );
  assert.deepEqual(
    { ...database.prepare(`
      SELECT
        reservation_key AS reservationKey,
        reserved_until AS reservedUntil
      FROM whatsapp_pair_rate_limit_state
    `).get() },
    {
      reservationKey: command.reservationKey,
      reservedUntil: "2026-08-16T10:00:06.000Z",
    },
  );
});

test("blocks the sender-recipient pair before checking the portfolio recipient lock", async () => {
  const { repository } = await createSqliteD1();

  await repository.reserveBusinessInitiatedMessage(
    reservationCommand(),
  );

  const pairBlocked = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          11,
        ),
        reservedAt: atOffset(reservedAt, 1_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          1_000,
        ),
      }),
    );
  const recipientBlocked = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          12,
        ),
        senderKey: secondSenderKey,
        reservedAt: atOffset(reservedAt, 1_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          1_000,
        ),
      }),
    );

  assert.deepEqual(pairBlocked, {
    outcome: "pair-limited",
    retryAt: "2026-08-16T10:00:06.000Z",
  });
  assert.deepEqual(recipientBlocked, {
    outcome: "recipient-in-flight",
    retryAt: expiresAt,
  });
});

test("shares provider pair and recipient locks across Connect tenants", async () => {
  const { database, repository } =
    await createSqliteD1();

  database.prepare(`
    INSERT INTO tenants (
      id,
      display_name,
      status,
      created_at,
      updated_at
    ) VALUES (8, 'Tenant 8', 'active', ?1, ?1)
  `).run(reservedAt);
  await repository.reserveBusinessInitiatedMessage(
    reservationCommand(),
  );

  const secondTenantPair = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          18,
        ),
        tenantId: 8,
        reservedAt: atOffset(reservedAt, 1_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          1_000,
        ),
      }),
    );
  const secondTenantRecipient = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          19,
        ),
        tenantId: 8,
        senderKey: secondSenderKey,
        reservedAt: atOffset(reservedAt, 1_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          1_000,
        ),
      }),
    );

  assert.equal(secondTenantPair.outcome, "pair-limited");
  assert.equal(
    secondTenantRecipient.outcome,
    "recipient-in-flight",
  );
});

test("releases both active locks only for a matching pre-submit cancellation", async () => {
  const { database, repository } =
    await createSqliteD1();
  const firstCommand = reservationCommand();

  await repository.reserveBusinessInitiatedMessage(
    firstCommand,
  );
  const settled = await repository.settle({
    reservationKey: firstCommand.reservationKey,
    outcome: "cancelled-before-submit",
    settledAt: atOffset(reservedAt, 1_000),
  });
  const next = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          13,
        ),
        reservedAt: atOffset(reservedAt, 1_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          1_000,
        ),
      }),
    );

  assert.equal(settled.outcome, "settled");
  assert.equal(next.outcome, "reserved");
  assert.deepEqual(
    { ...database.prepare(`
      SELECT
        active_reservation_key AS activeReservationKey,
        active_reservation_expires_at AS activeExpiresAt
      FROM whatsapp_portfolio_recipient_rate_limit_state
      WHERE portfolio_key = ?1
        AND recipient_key = ?2
    `).get(portfolioKey, recipientKey) },
    {
      activeReservationKey:
        next.reservation.reservationKey,
      activeExpiresAt:
        next.reservation.reservationExpiresAt,
    },
  );
});

test("keeps a newer active reservation when an older delivered webhook arrives late", async () => {
  const { database, repository } =
    await createSqliteD1();
  const oldCommand = reservationCommand();
  const newerReservedAt = atOffset(
    reservedAt,
    61_000,
  );
  const newerCommand = reservationCommand({
    reservationKey: key(
      "whatsapp_rate_reservation_v1_",
      14,
    ),
    reservedAt: newerReservedAt,
    reservationExpiresAt: atOffset(
      newerReservedAt,
      60_000,
    ),
  });

  await repository.reserveBusinessInitiatedMessage(
    oldCommand,
  );
  const newer = await repository
    .reserveBusinessInitiatedMessage(newerCommand);
  const deliveredAt = atOffset(
    newerReservedAt,
    1_000,
  );
  const lateSettlement = await repository.settle({
    reservationKey: oldCommand.reservationKey,
    outcome: "delivered",
    settledAt: deliveredAt,
  });
  const state = { ...database.prepare(`
    SELECT
      active_reservation_key AS activeReservationKey,
      last_delivered_at AS lastDeliveredAt
    FROM whatsapp_portfolio_recipient_rate_limit_state
    WHERE portfolio_key = ?1
      AND recipient_key = ?2
  `).get(portfolioKey, recipientKey) };

  assert.equal(newer.outcome, "reserved");
  assert.equal(lateSettlement.outcome, "settled");
  assert.deepEqual(state, {
    activeReservationKey: newerCommand.reservationKey,
    lastDeliveredAt: deliveredAt,
  });
});

test("enforces a bounded portfolio count while allowing an already-delivered recipient", async () => {
  const { repository } =
    await createSqliteD1();

  for (let value = 1; value <= 250; value += 1) {
    const reservation = await repository
      .reserveBusinessInitiatedMessage(
        reservationCommand({
          reservationKey: key(
            "whatsapp_rate_reservation_v1_",
            1_000 + value,
          ),
          recipientKey: key(
            "whatsapp_recipient_v1_",
            value,
          ),
        }),
      );

    assert.equal(reservation.outcome, "reserved");
    assert.equal(
      (
        await repository.settle({
          reservationKey:
            reservation.reservation.reservationKey,
          outcome: "delivered",
          settledAt: reservedAt,
        })
      ).outcome,
      "settled",
    );
  }

  const nextWindowAt = atOffset(reservedAt, 6_000);
  const nextExpiryAt = atOffset(expiresAt, 6_000);

  const limited = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          15,
        ),
        recipientKey: key(
          "whatsapp_recipient_v1_",
          999,
        ),
        reservedAt: nextWindowAt,
        reservationExpiresAt: nextExpiryAt,
      }),
    );
  const existingRecipient = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          16,
        ),
        recipientKey: key(
          "whatsapp_recipient_v1_",
          1,
        ),
        reservedAt: nextWindowAt,
        reservationExpiresAt: nextExpiryAt,
      }),
    );
  const unlimited = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          17,
        ),
        recipientKey: key(
          "whatsapp_recipient_v1_",
          1_000,
        ),
        portfolioCapacity: { kind: "unlimited" },
        reservedAt: nextWindowAt,
        reservationExpiresAt: nextExpiryAt,
      }),
    );

  assert.deepEqual(limited, {
    outcome: "portfolio-limited",
    occupiedUniqueRecipients: 250,
    maximumUniqueRecipients: 250,
  });
  assert.equal(existingRecipient.outcome, "reserved");
  assert.equal(unlimited.outcome, "reserved");
});

test("settles once, detects conflicts, and rejects unknown or early settlements", async () => {
  const { repository } = await createSqliteD1();
  const command = reservationCommand();

  await repository.reserveBusinessInitiatedMessage(command);

  const settledAt = atOffset(reservedAt, 8_000);
  const first = await repository.settle({
    reservationKey: command.reservationKey,
    outcome: "provider-failed",
    settledAt,
  });
  const repeated = await repository.settle({
    reservationKey: command.reservationKey,
    outcome: "provider-failed",
    settledAt,
  });
  const conflict = await repository.settle({
    reservationKey: command.reservationKey,
    outcome: "delivered",
    settledAt,
  });
  const unknown = await repository.settle({
    reservationKey: key(
      "whatsapp_rate_reservation_v1_",
      999,
    ),
    outcome: "delivered",
    settledAt,
  });
  const early = await repository.settle({
    reservationKey: command.reservationKey,
    outcome: "provider-failed",
    settledAt: atOffset(reservedAt, -1),
  });

  assert.equal(first.outcome, "settled");
  assert.equal(first.idempotent, false);
  assert.equal(repeated.outcome, "settled");
  assert.equal(repeated.idempotent, true);
  assert.equal(conflict.outcome, "settlement-conflict");
  assert.deepEqual(unknown, {
    outcome: "reservation-not-found",
  });
  assert.equal(
    early.outcome,
    "settlement-conflict",
  );
});

test("stores provider cooldown and failed settlement atomically and idempotently", async () => {
  const { database, repository } =
    await createSqliteD1();
  const command = reservationCommand();
  const observedAt = atOffset(reservedAt, 1_000);
  const cooldown = {
    reservationKey: command.reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt,
    blockedUntil: atOffset(observedAt, 12_000),
  };

  await repository.reserveBusinessInitiatedMessage(command);
  assert.throws(
    () => database.prepare(`
      INSERT INTO whatsapp_provider_cooldown_events (
        reservation_key,
        scope,
        provider_error_code,
        observed_at,
        blocked_until,
        created_at
      ) VALUES (?1, 'pair', 131056, ?2, ?3, ?2)
    `).run(
      command.reservationKey,
      observedAt,
      cooldown.blockedUntil,
    ),
    /lacks rejection proof/,
  );

  const first = await repository.applyProviderCooldown(
    cooldown,
  );
  const repeated = await repository.applyProviderCooldown(
    cooldown,
  );
  const retired = await repository
    .reserveBusinessInitiatedMessage(command);
  const blocked = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          30,
        ),
        reservedAt: atOffset(reservedAt, 7_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          7_000,
        ),
      }),
    );

  assert.deepEqual(first, {
    outcome: "applied",
    cooldown,
    idempotent: false,
  });
  assert.deepEqual(repeated, {
    outcome: "applied",
    cooldown,
    idempotent: true,
  });
  assert.deepEqual(retired, {
    outcome: "reservation-retired",
    settlement: {
      reservationKey: command.reservationKey,
      outcome: "provider-failed",
      settledAt: observedAt,
    },
  });
  assert.deepEqual(blocked, {
    outcome: "provider-cooldown",
    scope: "pair",
    providerErrorCode: 131056,
    retryAt: cooldown.blockedUntil,
  });
  assert.deepEqual(
    { ...database.prepare(`
      SELECT outcome, settled_at AS settledAt
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = ?1
    `).get(command.reservationKey) },
    {
      outcome: "provider-failed",
      settledAt: observedAt,
    },
  );
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM whatsapp_provider_cooldown_events
    `).get().count,
    1,
  );
});

test("isolates pair, sender, and portfolio-recipient provider cooldown scopes", async () => {
  const { repository } = await createSqliteD1();
  const first = reservationCommand();
  const pairObservedAt = atOffset(reservedAt, 1_000);

  await repository.reserveBusinessInitiatedMessage(first);
  await repository.applyProviderCooldown({
    reservationKey: first.reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt: pairObservedAt,
    blockedUntil: atOffset(pairObservedAt, 12_000),
  });

  const afterPairAt = atOffset(reservedAt, 7_000);
  const differentSender = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          31,
        ),
        senderKey: secondSenderKey,
        reservedAt: afterPairAt,
        reservationExpiresAt: atOffset(
          expiresAt,
          7_000,
        ),
      }),
    );

  assert.equal(differentSender.outcome, "reserved");

  const senderObservedAt = atOffset(
    afterPairAt,
    1_000,
  );

  await repository.applyProviderCooldown({
    reservationKey:
      differentSender.reservation.reservationKey,
    scope: "sender",
    providerErrorCode: 130429,
    observedAt: senderObservedAt,
    blockedUntil: atOffset(senderObservedAt, 30_000),
  });

  const senderBlocked = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          32,
        ),
        senderKey: secondSenderKey,
        recipientKey: key(
          "whatsapp_recipient_v1_",
          50,
        ),
        reservedAt: atOffset(afterPairAt, 7_000),
        reservationExpiresAt: atOffset(
          expiresAt,
          14_000,
        ),
      }),
    );

  assert.deepEqual(senderBlocked, {
    outcome: "provider-cooldown",
    scope: "sender",
    providerErrorCode: 130429,
    retryAt: atOffset(senderObservedAt, 30_000),
  });

  const recipientBaseAt = atOffset(reservedAt, 60_000);
  const recipientReservation = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          33,
        ),
        recipientKey: key(
          "whatsapp_recipient_v1_",
          51,
        ),
        templateCategory: "MARKETING",
        reservedAt: recipientBaseAt,
        reservationExpiresAt: atOffset(
          recipientBaseAt,
          60_000,
        ),
      }),
    );
  const recipientObservedAt = atOffset(
    recipientBaseAt,
    1_000,
  );

  await repository.applyProviderCooldown({
    reservationKey:
      recipientReservation.reservation.reservationKey,
    scope: "portfolio-recipient",
    providerErrorCode: 131049,
    observedAt: recipientObservedAt,
    blockedUntil: atOffset(
      recipientObservedAt,
      86_400_000,
    ),
  });

  const recipientBlocked = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          34,
        ),
        senderKey: secondSenderKey,
        recipientKey:
          recipientReservation.reservation.recipientKey,
        templateCategory: "MARKETING",
        reservedAt: atOffset(recipientBaseAt, 7_000),
        reservationExpiresAt: atOffset(
          recipientBaseAt,
          67_000,
        ),
      }),
    );

  assert.deepEqual(recipientBlocked, {
    outcome: "provider-cooldown",
    scope: "portfolio-recipient",
    providerErrorCode: 131049,
    retryAt: atOffset(
      recipientObservedAt,
      86_400_000,
    ),
  });
  const utilityAllowed = await repository
    .reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          35,
        ),
        senderKey: secondSenderKey,
        recipientKey:
          recipientReservation.reservation.recipientKey,
        templateCategory: "UTILITY",
        reservedAt: atOffset(recipientBaseAt, 7_000),
        reservationExpiresAt: atOffset(
          recipientBaseAt,
          67_000,
        ),
      }),
    );

  assert.equal(utilityAllowed.outcome, "reserved");
});

test("rejects mismatched, unsafe, conflicting, and manually shortened provider cooldowns", async () => {
  const { database, repository } =
    await createSqliteD1();
  const command = reservationCommand();
  const observedAt = atOffset(reservedAt, 1_000);

  await repository.reserveBusinessInitiatedMessage(command);
  await assert.rejects(
    repository.applyProviderCooldown({
      reservationKey: command.reservationKey,
      scope: "sender",
      providerErrorCode: 131056,
      observedAt,
      blockedUntil: atOffset(observedAt, 6_000),
    }),
    /scope does not match/,
  );
  await assert.rejects(
    repository.applyProviderCooldown({
      reservationKey: command.reservationKey,
      scope: "portfolio-recipient",
      providerErrorCode: 131049,
      observedAt,
      blockedUntil: atOffset(observedAt, 60_000),
    }),
    /outside the safe window/,
  );

  const cooldown = {
    reservationKey: command.reservationKey,
    scope: "pair",
    providerErrorCode: 131056,
    observedAt,
    blockedUntil: atOffset(observedAt, 12_000),
  };

  await repository.applyProviderCooldown(cooldown);
  assert.equal(
    (
      await repository.applyProviderCooldown({
        ...cooldown,
        blockedUntil: atOffset(observedAt, 13_000),
      })
    ).outcome,
    "cooldown-conflict",
  );
  assert.throws(
    () => database.prepare(`
      UPDATE whatsapp_provider_cooldown_state
      SET blocked_until = ?1,
        updated_at = ?2
      WHERE scope = 'pair'
        AND sender_key = ?3
        AND recipient_key = ?4
    `).run(
      atOffset(observedAt, 6_000),
      observedAt,
      senderKey,
      recipientKey,
    ),
    /cannot be shortened|lacks event proof/,
  );
  assert.throws(
    () => database.prepare(`
      UPDATE whatsapp_provider_cooldown_events
      SET blocked_until = ?1
      WHERE reservation_key = ?2
    `).run(
      atOffset(observedAt, 13_000),
      command.reservationKey,
    ),
    /events are immutable/,
  );
});

test("reports a pre-reservation settlement before any terminal event exists", async () => {
  const { repository } = await createSqliteD1();
  const command = reservationCommand();

  await repository.reserveBusinessInitiatedMessage(command);

  assert.deepEqual(
    await repository.settle({
      reservationKey: command.reservationKey,
      outcome: "delivered",
      settledAt: atOffset(reservedAt, -1),
    }),
    { outcome: "settlement-precedes-reservation" },
  );
});

test("rejects unapproved limits, unsafe expiries, key collisions, and history mutation", async () => {
  const { database, repository } =
    await createSqliteD1();

  await assert.rejects(
    repository.reserveBusinessInitiatedMessage(
      reservationCommand({
        portfolioCapacity: {
          kind: "bounded",
          maximumUniqueRecipients: 500,
        },
      }),
    ),
    /portfolioCapacity is invalid/,
  );
  await assert.rejects(
    repository.reserveBusinessInitiatedMessage(
      reservationCommand({
        templateCategory: "AUTHENTICATION",
      }),
    ),
    /templateCategory is invalid/,
  );
  await assert.rejects(
    repository.reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationExpiresAt: atOffset(
          reservedAt,
          5_000,
        ),
      }),
    ),
    /safe reservation window/,
  );
  assert.deepEqual(
    await repository.reserveBusinessInitiatedMessage(
      reservationCommand({
        reservationKey: key(
          "whatsapp_rate_reservation_v1_",
          20,
        ),
        tenantId: 999,
      }),
    ),
    { outcome: "tenant-not-found" },
  );

  const command = reservationCommand();

  await repository.reserveBusinessInitiatedMessage(command);
  assert.throws(
    () => database.prepare(`
      UPDATE whatsapp_pair_rate_limit_state
      SET reserved_until = ?1,
        updated_at = ?1
      WHERE sender_key = ?2
        AND recipient_key = ?3
    `).run(
      atOffset(reservedAt, 1_000),
      senderKey,
      recipientKey,
    ),
    /pair release lacks cancellation proof/,
  );
  assert.throws(
    () => database.prepare(`
      UPDATE whatsapp_portfolio_recipient_rate_limit_state
      SET active_reservation_key = NULL,
        active_reservation_expires_at = NULL,
        updated_at = ?1
      WHERE portfolio_key = ?2
        AND recipient_key = ?3
    `).run(
      atOffset(reservedAt, 1_000),
      portfolioKey,
      recipientKey,
    ),
    /portfolio release lacks settlement proof/,
  );
  await assert.rejects(
    repository.reserveBusinessInitiatedMessage(
      reservationCommand({
        recipientKey: key(
          "whatsapp_recipient_v1_",
          500,
        ),
      }),
    ),
    /reservation key collision/,
  );
  assert.throws(
    () => database.prepare(`
      UPDATE whatsapp_rate_limit_reservations
      SET reservation_expires_at = ?1
      WHERE reservation_key = ?2
    `).run(
      atOffset(expiresAt, 1_000),
      command.reservationKey,
    ),
    /reservations are immutable/,
  );
});
