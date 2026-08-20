import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresWhatsappDeliveryPolicyDataMigrationPlan,
  createPostgresWhatsappDeliveryPolicyDataSnapshot,
  executePostgresWhatsappDeliveryPolicyDataMigration,
} from "../server/platform/postgresWhatsappDeliveryPolicyDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1WhatsappDeliveryPolicySnapshot,
} from "../scripts/read-d1-whatsapp-delivery-policy-snapshot.mjs";
import {
  requireLocalWhatsappDeliveryPolicyDataMigrationUrl,
} from "../scripts/verify-postgres-whatsapp-delivery-policy-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 97).toString("base64");
const evidenceCheckedAt = "2026-08-20T09:00:00.000Z";
const recordedAt = "2026-08-20T09:30:00.000Z";
const firstReservedAt = "2026-08-20T10:00:00.000Z";
const firstPairUntil = "2026-08-20T10:00:06.000Z";
const firstExpiresAt = "2026-08-20T10:05:00.000Z";
const firstSettledAt = "2026-08-20T10:01:00.000Z";
const firstBlockedUntil = "2026-08-20T10:01:30.000Z";
const secondReservedAt = "2026-08-20T10:02:00.000Z";
const secondPairUntil = "2026-08-20T10:02:06.000Z";
const secondExpiresAt = "2026-08-20T10:07:00.000Z";
const secondSettledAt = "2026-08-20T10:03:00.000Z";
const evidenceExpiresAt = "2026-08-21T09:00:00.000Z";
const actor = "user_whatsapp_policy_owner";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function opaque(prefix, character) {
  return `${prefix}${character.repeat(64)}`;
}

const portfolioKey = opaque("whatsapp_portfolio_v1_", "a");
const senderOne = opaque("whatsapp_sender_v1_", "b");
const recipientOne = opaque("whatsapp_recipient_v1_", "c");
const reservationOne = opaque("whatsapp_rate_reservation_v1_", "d");
const senderTwo = opaque("whatsapp_sender_v1_", "e");
const recipientTwo = opaque("whatsapp_recipient_v1_", "f");
const reservationTwo = opaque("whatsapp_rate_reservation_v1_", "1");
const deliveryKey = opaque("campaign_delivery_v1_", "2");
const evidenceDigest = "3".repeat(64);

function policyKey() {
  return `whatsapp_delivery_policy_event_v1_${digest(JSON.stringify({
    namespace: "whatsapp_delivery_policy_event_v1",
    tenantId: 1,
    connectionVersion: 1,
    expectedPolicyVersion: 0,
    deliveryState: "enabled",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v23.0",
    evidenceDigest,
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId: actor,
  }))}`;
}

function reservation({ key, sender, recipient, reservedAt, pairUntil,
  expiresAt }) {
  return {
    reservation_key: key,
    tenant_id: 1,
    portfolio_key: portfolioKey,
    sender_key: sender,
    recipient_key: recipient,
    portfolio_limit_kind: "bounded",
    portfolio_limit_value: 250,
    reserved_at: reservedAt,
    pair_reserved_until: pairUntil,
    reservation_expires_at: expiresAt,
    created_at: reservedAt,
    policy_event_key: policyKey(),
    phone_throughput_messages_per_second: 80,
    maximum_outbound_messages_per_second: 64,
  };
}

function rawTables() {
  return {
    whatsapp_campaign_delivery_policy_events: [{
      event_key: policyKey(),
      tenant_id: 1,
      connection_version: 1,
      policy_version: 1,
      delivery_state: "enabled",
      portfolio_limit_kind: "bounded",
      portfolio_limit_value: 250,
      reservation_duration_seconds: 300,
      meta_graph_api_version: "v23.0",
      evidence_digest: evidenceDigest,
      evidence_checked_at: evidenceCheckedAt,
      evidence_expires_at: evidenceExpiresAt,
      actor_external_user_id: actor,
      recorded_at: recordedAt,
      created_at: recordedAt,
      phone_throughput_messages_per_second: 80,
      maximum_outbound_messages_per_second: 64,
    }],
    whatsapp_rate_limit_reservations: [
      reservation({
        key: reservationOne,
        sender: senderOne,
        recipient: recipientOne,
        reservedAt: firstReservedAt,
        pairUntil: firstPairUntil,
        expiresAt: firstExpiresAt,
      }),
      reservation({
        key: reservationTwo,
        sender: senderTwo,
        recipient: recipientTwo,
        reservedAt: secondReservedAt,
        pairUntil: secondPairUntil,
        expiresAt: secondExpiresAt,
      }),
    ],
    whatsapp_pair_rate_limit_state: [{
      sender_key: senderOne,
      recipient_key: recipientOne,
      reservation_key: reservationOne,
      reserved_until: firstPairUntil,
      updated_at: firstSettledAt,
    }, {
      sender_key: senderTwo,
      recipient_key: recipientTwo,
      reservation_key: reservationTwo,
      reserved_until: secondPairUntil,
      updated_at: secondSettledAt,
    }],
    whatsapp_portfolio_recipient_rate_limit_state: [{
      portfolio_key: portfolioKey,
      recipient_key: recipientOne,
      active_reservation_key: null,
      active_reservation_expires_at: null,
      last_delivered_at: null,
      updated_at: firstSettledAt,
    }, {
      portfolio_key: portfolioKey,
      recipient_key: recipientTwo,
      active_reservation_key: null,
      active_reservation_expires_at: null,
      last_delivered_at: secondSettledAt,
      updated_at: secondSettledAt,
    }],
    whatsapp_rate_limit_settlements: [{
      reservation_key: reservationOne,
      outcome: "provider-failed",
      settled_at: firstSettledAt,
      created_at: firstSettledAt,
    }, {
      reservation_key: reservationTwo,
      outcome: "delivered",
      settled_at: secondSettledAt,
      created_at: secondSettledAt,
    }],
    whatsapp_provider_cooldown_events: [{
      reservation_key: reservationOne,
      scope: "pair",
      provider_error_code: 131056,
      observed_at: firstSettledAt,
      blocked_until: firstBlockedUntil,
      created_at: firstSettledAt,
    }],
    whatsapp_provider_cooldown_state: [{
      scope: "pair",
      sender_key: senderOne,
      recipient_key: recipientOne,
      reservation_key: reservationOne,
      provider_error_code: 131056,
      blocked_until: firstBlockedUntil,
      updated_at: firstSettledAt,
    }],
    campaign_delivery_provider_links: [{
      delivery_key: deliveryKey,
      tenant_id: 1,
      provider_message_id: "wamid.delivery-proof",
      reservation_key: reservationTwo,
      provider_status: "read",
      last_status_event_key: "4".repeat(64),
      last_status_event_at: secondSettledAt,
      terminal_outcome: "delivered",
      terminal_settled_at: secondSettledAt,
      accepted_at: secondReservedAt,
      created_at: secondReservedAt,
      updated_at: secondSettledAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresWhatsappDeliveryPolicyDataMigrationPlan({
    snapshot: createPostgresWhatsappDeliveryPolicyDataSnapshot(tables),
    createdAt: "2026-08-20T11:00:00.000Z",
    expiresAt: "2026-08-20T11:15:00.000Z",
    evidenceHmacKey,
  });
}

function targetTable(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function targetFixture({ invalidVerificationIndex = 0 } = {}) {
  const tables = createPlan().payload.tables;
  const calls = [];
  let verificationIndex = 0;
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql) {
            calls.push(sql);
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            const insert = /^INSERT INTO ([a-z_]+)/i.exec(sql);
            if (insert) {
              return { rows: [], rowCount: tables[insert[1]].length };
            }
            if (/^\s*SELECT 1(?:\s|$)/i.test(sql)) {
              verificationIndex += 1;
              return verificationIndex === invalidVerificationIndex
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            const tableName = targetTable(sql);
            if (tableName) {
              return {
                rows: tables[tableName],
                rowCount: tables[tableName].length,
              };
            }
            return { rows: [{ locked: true }], rowCount: 1 };
          },
        });
        committed = true;
        return result;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  return {
    manager,
    calls,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
  };
}

test("builds private evidence and restores all eight trigger boundaries", async () => {
  const fixture = targetFixture();
  const evidence = await executePostgresWhatsappDeliveryPolicyDataMigration({
    plan: createPlan(),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T11:05:00.000Z",
  });
  assert.equal(fixture.committed, true);
  assert.equal(evidence.tableCount, 8);
  assert.equal(evidence.totalRowCount, 12);
  assert.equal(
    fixture.calls.filter((sql) => /DISABLE TRIGGER USER/.test(sql)).length,
    8,
  );
  assert.equal(
    fixture.calls.filter((sql) => /ENABLE TRIGGER USER/.test(sql)).length,
    8,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /wamid|whatsapp_sender|whatsapp_recipient|user_whatsapp/,
  );
});

test("rejects forged policy identity and inconsistent lifecycle rows", () => {
  const forged = rawTables();
  forged.whatsapp_campaign_delivery_policy_events[0].event_key =
    `whatsapp_delivery_policy_event_v1_${"0".repeat(64)}`;
  assert.throws(
    () => createPostgresWhatsappDeliveryPolicyDataSnapshot(forged),
    (error) => error instanceof PostgresDataMigrationError &&
      error.code === "row-invalid" &&
      error.table === "whatsapp_campaign_delivery_policy_events",
  );

  const inconsistent = rawTables();
  inconsistent.campaign_delivery_provider_links[0].terminal_outcome =
    "provider-failed";
  assert.throws(
    () => createPostgresWhatsappDeliveryPolicyDataSnapshot(inconsistent),
    (error) => error instanceof PostgresDataMigrationError &&
      error.code === "row-invalid" &&
      error.table === "campaign_delivery_provider_links",
  );
});

test("rolls back when a cross-table proof is missing", async () => {
  const fixture = targetFixture({ invalidVerificationIndex: 3 });
  await assert.rejects(
    executePostgresWhatsappDeliveryPolicyDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T11:05:00.000Z",
    }),
    (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed",
  );
  assert.equal(fixture.rolledBack, true);
  assert.equal(fixture.committed, false);
});

test("reads the eight current D1 WhatsApp tables atomically", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migrationsUrl = new URL("../drizzle/", import.meta.url);
  for (const fileName of readdirSync(migrationsUrl)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    database.exec(readFileSync(new URL(fileName, migrationsUrl), "utf8")
      .replaceAll("--> statement-breakpoint", ""));
  }
  const snapshot = readD1WhatsappDeliveryPolicySnapshot(database);
  assert.equal(snapshot.version,
    "connect_postgres_whatsapp_delivery_policy_data_v1");
  assert.equal(Object.keys(snapshot.tables).length, 8);
  assert.equal(Object.values(snapshot.tables).flat().length, 0);
  database.close();
});

test("rejects a D1 schema outside the exact WhatsApp contract", () => {
  const database = {
    exec() {},
    prepare(sql) {
      if (sql.startsWith("PRAGMA table_info")) return { all: () => [] };
      return { get: () => ({ integrity_check: "ok" }) };
    },
  };
  assert.throws(
    () => readD1WhatsappDeliveryPolicySnapshot(database),
    (error) => error instanceof D1DataMigrationSnapshotError &&
      error.code === "schema-mismatch",
  );
});

test("limits the WhatsApp rehearsal URL to its dedicated local database", () => {
  assert.equal(
    requireLocalWhatsappDeliveryPolicyDataMigrationUrl(
      "postgresql://tal@127.0.0.1:55442/connect_whatsapp_delivery_policy_data_migration_rehearsal",
    ),
    "postgresql://tal@127.0.0.1:55442/connect_whatsapp_delivery_policy_data_migration_rehearsal",
  );
  for (const value of [
    "postgresql://tal@example.com:55442/connect_whatsapp_delivery_policy_data_migration_rehearsal",
    "postgresql://tal:secret@127.0.0.1:55442/connect_whatsapp_delivery_policy_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55442/other",
    "postgresql://tal@127.0.0.1/connect_whatsapp_delivery_policy_data_migration_rehearsal",
  ]) {
    assert.throws(
      () => requireLocalWhatsappDeliveryPolicyDataMigrationUrl(value),
      /URL_INVALID/,
    );
  }
});
