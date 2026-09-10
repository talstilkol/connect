import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  POSTGRES_WHATSAPP_DELIVERY_POLICY_EXPECTED_TRIGGER_INVENTORY,
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
const thirdReservedAt = "2026-08-20T10:04:00.000Z";
const thirdPairUntil = "2026-08-20T10:04:06.000Z";
const thirdExpiresAt = "2026-08-20T10:09:00.000Z";
const thirdSettledAt = "2026-08-20T10:05:00.000Z";
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
const thirdSender = opaque("whatsapp_sender_v1_", "5");
const thirdRecipient = opaque("whatsapp_recipient_v1_", "6");
const thirdReservation = opaque("whatsapp_rate_reservation_v1_", "7");
const botReplyDeliveryKey = opaque("bot_reply_delivery_v1_", "8");
const inboundButtonMessageKey = opaque("message_v1_", "a");
const selectedBotOptionKey = opaque("bot_option_v1_", "b");
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
  expiresAt, reservationClass = "business-initiated" }) {
  return {
    reservation_key: key,
    reservation_class: reservationClass,
    template_category: null,
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
      reservation({
        key: thirdReservation,
        sender: thirdSender,
        recipient: thirdRecipient,
        reservedAt: thirdReservedAt,
        pairUntil: thirdPairUntil,
        expiresAt: thirdExpiresAt,
        reservationClass: "service-reply",
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
    }, {
      sender_key: thirdSender,
      recipient_key: thirdRecipient,
      reservation_key: thirdReservation,
      reserved_until: thirdPairUntil,
      updated_at: thirdSettledAt,
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
    }, {
      reservation_key: thirdReservation,
      outcome: "delivered",
      settled_at: thirdSettledAt,
      created_at: thirdSettledAt,
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
    bot_reply_delivery_provider_links: [{
      delivery_key: botReplyDeliveryKey,
      tenant_id: 1,
      provider_message_id: "wamid.bot-reply-proof",
      reservation_key: thirdReservation,
      provider_status: "delivered",
      last_status_event_key: "9".repeat(64),
      last_status_event_at: thirdSettledAt,
      terminal_outcome: "delivered",
      terminal_settled_at: thirdSettledAt,
      accepted_at: thirdReservedAt,
      created_at: thirdReservedAt,
      updated_at: thirdSettledAt,
    }],
    inbound_button_reply_events: [{
      message_key: inboundButtonMessageKey,
      tenant_id: 1,
      selected_bot_option_key: selectedBotOptionKey,
      subject_delivery_key: botReplyDeliveryKey,
      occurred_at: thirdSettledAt,
      created_at: thirdSettledAt,
    }],
    bot_reply_service_window_rejection_events: [],
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

function targetFixture({ tables = rawTables(), invalidVerificationIndex = 0,
  invalidBotProviderWindow = false, invalidProofPattern = null,
  invalidTriggerInventoryCheck = 0 } = {}) {
  const targetTables = createPlan(tables).payload.tables;
  const calls = [];
  let verificationIndex = 0;
  let triggerInventoryCheck = 0;
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
            if (/FROM pg_catalog\.pg_trigger AS trigger/i.test(sql)) {
              triggerInventoryCheck += 1;
              return triggerInventoryCheck === invalidTriggerInventoryCheck
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            const insert = /^INSERT INTO ([a-z_]+)/i.exec(sql);
            if (insert) {
              return {
                rows: [],
                rowCount: targetTables[insert[1]].length,
              };
            }
            if (
              invalidBotProviderWindow &&
              /FROM bot_reply_delivery_provider_links AS link/i.test(sql)
            ) {
              return { rows: [{ invalid: 1 }], rowCount: 1 };
            }
            if (invalidProofPattern?.test(sql)) {
              return { rows: [{ invalid: 1 }], rowCount: 1 };
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
                rows: targetTables[tableName],
                rowCount: targetTables[tableName].length,
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

test("builds private evidence and restores all eleven trigger boundaries", async () => {
  const fixture = targetFixture();
  const evidence = await executePostgresWhatsappDeliveryPolicyDataMigration({
    plan: createPlan(),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T11:05:00.000Z",
  });
  assert.equal(fixture.committed, true);
  assert.equal(evidence.tableCount, 11);
  assert.equal(evidence.totalRowCount, 17);
  assert.equal(
    fixture.calls.filter((sql) => /DISABLE TRIGGER USER/.test(sql)).length,
    11,
  );
  assert.equal(
    fixture.calls.filter((sql) => /ENABLE TRIGGER USER/.test(sql)).length,
    11,
  );
  const inventoryChecks = fixture.calls
    .map((sql, index) => (
      /FROM pg_catalog\.pg_trigger AS trigger/i.test(sql) ? index : -1
    ))
    .filter((index) => index >= 0);
  const firstDisable = fixture.calls.findIndex((sql) => (
    /DISABLE TRIGGER USER/.test(sql)
  ));
  const lastEnable = fixture.calls.findLastIndex((sql) => (
    /ENABLE TRIGGER USER/.test(sql)
  ));
  assert.equal(inventoryChecks.length, 2);
  assert.equal(
    POSTGRES_WHATSAPP_DELIVERY_POLICY_EXPECTED_TRIGGER_INVENTORY.length,
    47,
  );
  assert.ok(inventoryChecks[0] < firstDisable);
  assert.ok(inventoryChecks[1] > lastEnable);
  assert.match(
    fixture.calls[inventoryChecks[0]],
    /actual\.trigger_name IS NULL OR actual\.enabled <> 'O'/,
  );
  assert.match(
    fixture.calls[inventoryChecks[0]],
    /expected\.trigger_name IS NULL/,
  );
  assert.match(
    fixture.calls[inventoryChecks[0]],
    /messages_campaign_delivery_target_guard/,
  );
  assert.match(
    fixture.calls[inventoryChecks[0]],
    /messages_bot_reply_target_guard_update/,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /wamid|whatsapp_sender|whatsapp_recipient|user_whatsapp/,
  );
});

test("fails closed before disabling a missing or disabled trigger", async () => {
  const fixture = targetFixture({ invalidTriggerInventoryCheck: 1 });
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
  assert.equal(
    fixture.calls.filter((sql) => /DISABLE TRIGGER USER/.test(sql)).length,
    0,
  );
});

test("rolls back when the post-load trigger inventory is not restored",
  async () => {
    const fixture = targetFixture({ invalidTriggerInventoryCheck: 2 });
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
    assert.equal(
      fixture.calls.filter((sql) => /DISABLE TRIGGER USER/.test(sql)).length,
      11,
    );
    assert.equal(
      fixture.calls.filter((sql) => /ENABLE TRIGGER USER/.test(sql)).length,
      11,
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

test("enforces provider-link timing states reachable through runtime guards",
  () => {
    const requireInvalidProviderRow = (tables, table) => {
      assert.throws(
        () => createPostgresWhatsappDeliveryPolicyDataSnapshot(tables),
        (error) => error instanceof PostgresDataMigrationError &&
          error.code === "row-invalid" && error.table === table,
      );
    };

    const acceptedCampaign = rawTables();
    Object.assign(acceptedCampaign.campaign_delivery_provider_links[0], {
      provider_status: "accepted",
      last_status_event_key: null,
      last_status_event_at: null,
      terminal_outcome: null,
      terminal_settled_at: null,
      updated_at: secondSettledAt,
    });
    requireInvalidProviderRow(
      acceptedCampaign,
      "campaign_delivery_provider_links",
    );

    const staleCampaignProjection = rawTables();
    staleCampaignProjection.campaign_delivery_provider_links[0].updated_at =
      secondReservedAt;
    requireInvalidProviderRow(
      staleCampaignProjection,
      "campaign_delivery_provider_links",
    );

    const acceptedBot = rawTables();
    Object.assign(acceptedBot.bot_reply_delivery_provider_links[0], {
      provider_status: "accepted",
      last_status_event_key: null,
      last_status_event_at: null,
      terminal_outcome: null,
      terminal_settled_at: null,
      updated_at: thirdSettledAt,
    });
    requireInvalidProviderRow(
      acceptedBot,
      "bot_reply_delivery_provider_links",
    );

    const earlyBotEvent = rawTables();
    Object.assign(earlyBotEvent.bot_reply_delivery_provider_links[0], {
      provider_status: "sent",
      last_status_event_at: "2026-08-20T10:03:59.999Z",
      terminal_outcome: null,
      terminal_settled_at: null,
      updated_at: thirdReservedAt,
    });
    assert.doesNotThrow(
      () => createPostgresWhatsappDeliveryPolicyDataSnapshot(
        earlyBotEvent,
      ),
    );

    const staleBotProjection = rawTables();
    staleBotProjection.bot_reply_delivery_provider_links[0].updated_at =
      thirdReservedAt;
    requireInvalidProviderRow(
      staleBotProjection,
      "bot_reply_delivery_provider_links",
    );

    const earlyCampaignEvent = rawTables();
    Object.assign(earlyCampaignEvent.campaign_delivery_provider_links[0], {
      provider_status: "sent",
      last_status_event_at: "2026-08-20T10:01:59.999Z",
      terminal_outcome: null,
      terminal_settled_at: null,
      updated_at: secondReservedAt,
    });
    assert.doesNotThrow(
      () => createPostgresWhatsappDeliveryPolicyDataSnapshot(
        earlyCampaignEvent,
      ),
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

test("rolls back when bot acceptance is outside its reservation window",
  async () => {
    const tables = rawTables();
    const link = tables.bot_reply_delivery_provider_links[0];
    link.accepted_at = "2026-08-20T10:03:59.000Z";
    link.created_at = link.accepted_at;
    const fixture = targetFixture({
      tables,
      invalidBotProviderWindow: true,
    });
    await assert.rejects(
      executePostgresWhatsappDeliveryPolicyDataMigration({
        plan: createPlan(tables),
        transactions: fixture.manager,
        evidenceHmacKey,
        now: "2026-08-20T11:05:00.000Z",
      }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "target-verification-failed",
    );
    assert.equal(fixture.rolledBack, true);
    assert.equal(fixture.committed, false);
    const proof = fixture.calls.find((sql) => (
      /FROM bot_reply_delivery_provider_links AS link/i.test(sql)
    ));
    assert.match(proof, /link\.accepted_at < reservation\.reserved_at/);
    assert.match(
      proof,
      /link\.accepted_at > reservation\.reservation_expires_at/,
    );
    assert.doesNotMatch(
      proof,
      /link\.last_status_event_at < link\.accepted_at/,
    );
    assert.match(
      proof,
      /link\.terminal_settled_at < link\.accepted_at/,
    );
    assert.match(
      proof,
      /link\.terminal_settled_at > link\.updated_at/,
    );
  });

test("scopes provider-message collision proofs to the link tenant", async () => {
  const fixture = targetFixture();
  await executePostgresWhatsappDeliveryPolicyDataMigration({
    plan: createPlan(),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T11:05:00.000Z",
  });
  const proof = fixture.calls.find((sql) => (
    /FROM bot_reply_delivery_provider_links AS link/i.test(sql)
  ));
  assert.match(
    proof,
    /LEFT JOIN messages AS message\s+ON message\.tenant_id = link\.tenant_id/,
  );
  assert.match(
    proof,
    /LEFT JOIN campaign_delivery_provider_links AS campaign_link\s+ON campaign_link\.tenant_id = link\.tenant_id/,
  );
  const campaignProof = fixture.calls.find((sql) => (
    /FROM campaign_delivery_provider_links AS link/i.test(sql)
  ));
  assert.match(
    campaignProof,
    /LEFT JOIN messages AS message\s+ON message\.tenant_id = link\.tenant_id\s+AND message\.provider_message_id = link\.provider_message_id/,
  );
  assert.match(campaignProof, /message\.message_key IS NOT NULL/);
});

test("rolls back a campaign provider-message collision", async () => {
  const fixture = targetFixture({
    invalidProofPattern: /FROM campaign_delivery_provider_links AS link/i,
  });
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
  const proof = fixture.calls.find((sql) => (
    /FROM campaign_delivery_provider_links AS link/i.test(sql)
  ));
  assert.match(proof, /message\.message_key IS NOT NULL/);
  assert.match(
    proof,
    /link\.updated_at IS DISTINCT FROM greatest\(/,
  );
});

test("derives portfolio state only from business-initiated reservations",
  async () => {
    const fixture = targetFixture({
      invalidProofPattern:
        /FROM whatsapp_portfolio_recipient_rate_limit_state AS state/i,
    });
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
    const proof = fixture.calls.find((sql) => (
      /FROM whatsapp_portfolio_recipient_rate_limit_state AS state/i.test(sql)
    ));
    assert.match(proof, /WHERE NOT EXISTS \(/);
    assert.equal(
      proof.match(/reservation_class = 'business-initiated'/g)?.length,
      4,
    );
    assert.match(proof, /state\.updated_at IS DISTINCT FROM/);
  });

test("rejects portfolio cooldown evidence for service-reply reservations",
  async () => {
    for (const invalidProofPattern of [
      /FROM whatsapp_provider_cooldown_events AS event/i,
      /FROM whatsapp_provider_cooldown_state AS state/i,
    ]) {
      const fixture = targetFixture({ invalidProofPattern });
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
      const proof = fixture.calls.find((sql) => invalidProofPattern.test(sql));
      assert.match(proof, /scope = 'portfolio-recipient'/);
      assert.match(
        proof,
        /reservation\.reservation_class <> 'business-initiated'/,
      );
    }
});

test("rolls back when a required runtime projection is missing", async () => {
  const reverseProofs = [
    /FROM whatsapp_rate_limit_reservations AS reservation\s+LEFT JOIN whatsapp_pair_rate_limit_state AS state/i,
    /FROM whatsapp_rate_limit_reservations AS reservation\s+LEFT JOIN whatsapp_portfolio_recipient_rate_limit_state AS state/i,
    /FROM whatsapp_provider_cooldown_events AS event\s+INNER JOIN whatsapp_rate_limit_reservations AS reservation/i,
  ];
  for (const invalidProofPattern of reverseProofs) {
    const fixture = targetFixture({ invalidProofPattern });
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
    assert.ok(fixture.calls.some((sql) => invalidProofPattern.test(sql)));
  }
});

test("reads the eleven current D1 WhatsApp tables atomically", () => {
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
    "connect_postgres_whatsapp_delivery_policy_data_v2");
  assert.equal(Object.keys(snapshot.tables).length, 11);
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
