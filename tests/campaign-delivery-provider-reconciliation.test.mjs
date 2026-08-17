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
  createCampaignDeliveryProviderRepository,
} from "../db/campaignDeliveryProviderRepository.ts";
import {
  createCampaignDispatchRepository,
} from "../db/campaignDispatchRepository.ts";
import {
  createWhatsappRateLimitRepository,
} from "../db/whatsappRateLimitRepository.ts";
import {
  createCampaignDeliveryStatusReconciler,
} from "../server/campaigns/campaignDeliveryStatusReconciler.ts";

const campaignKey =
  `campaign_v1_${"1".repeat(64)}`;
const templateKey =
  `template_v1_${"2".repeat(64)}`;
const deliveryKey =
  `campaign_delivery_v1_${"3".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"4".repeat(64)}`;
const portfolioKey =
  `whatsapp_portfolio_v1_${"5".repeat(64)}`;
const senderKey =
  `whatsapp_sender_v1_${"6".repeat(64)}`;
const recipientKey =
  `whatsapp_recipient_v1_${"7".repeat(64)}`;
const policyEventKey =
  `whatsapp_delivery_policy_event_v1_${"b".repeat(64)}`;
const providerMessageId = "wamid.campaign-live-17";
const reservedAt = "2026-08-16T10:00:00.000Z";
const acceptedAt = "2026-08-16T10:00:01.000Z";
const sentAt = "2026-08-16T10:00:02.000Z";
const deliveredAt = "2026-08-16T10:00:03.000Z";
const readAt = "2026-08-16T10:00:04.000Z";

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

async function createFixture() {
  const migrationsUrl = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrations = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(new URL(fileName, migrationsUrl), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  database.exec(
    migrations
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
  database.prepare(`
    INSERT INTO meta_connections (
      tenant_id,
      business_portfolio_id,
      waba_id,
      phone_number_id,
      status,
      webhook_subscribed_at,
      connected_at,
      version,
      created_at,
      updated_at
    ) VALUES (
      7, '400001', '400002', '400003', 'connected',
      ?1, ?1, 1, ?1, ?1
    )
  `).run(reservedAt);
  database.prepare(`
    INSERT INTO whatsapp_campaign_delivery_policy_events (
      event_key,
      tenant_id,
      connection_version,
      policy_version,
      delivery_state,
      portfolio_limit_kind,
      portfolio_limit_value,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second,
      reservation_duration_seconds,
      meta_graph_api_version,
      evidence_digest,
      evidence_checked_at,
      evidence_expires_at,
      actor_external_user_id,
      recorded_at,
      created_at
    ) VALUES (
      ?1, 7, 1, 1, 'enabled', 'bounded', 250,
      80, 64, 300, 'v21.0', ?2, ?3, ?4,
      'tal-rate-limit-research', ?3, ?3
    )
  `).run(
    policyEventKey,
    "c".repeat(64),
    reservedAt,
    "2026-08-17T10:00:00.000Z",
  );
  database.prepare(`
    INSERT INTO message_templates (
      template_key,
      tenant_id,
      meta_template_id,
      name,
      language,
      category,
      status,
      definition_json,
      submission_key,
      submission_started_at,
      version,
      submitted_at,
      reviewed_at
    ) VALUES (
      ?1, 7, '400004', 'service_update', 'he',
      'UTILITY', 'approved', '{}', ?2, ?3, 1, ?3, ?3
    )
  `).run(
    templateKey,
    `template_submission_v1_${"8".repeat(64)}`,
    reservedAt,
  );
  database.prepare(`
    INSERT INTO contacts (
      id,
      tenant_id,
      phone_e164,
      mailing_status,
      consent_status,
      consent_source,
      consent_recorded_at,
      created_at,
      updated_at
    ) VALUES (
      17, 7, '+972501234567', 'subscribed', 'granted',
      'documented-consent', ?1, ?1, ?1
    )
  `).run(reservedAt);
  database.prepare(`
    INSERT INTO campaigns (
      campaign_key,
      tenant_id,
      name,
      status,
      delivery_mode,
      scheduled_at,
      timezone,
      template_key,
      template_snapshot_json,
      audience_snapshot_key,
      recipient_count,
      version,
      activated_at,
      started_at,
      created_at,
      updated_at
    ) VALUES (
      ?1, 7, 'Service update', 'running', 'immediate',
      NULL, 'Asia/Jerusalem', ?2, '{}', ?3, 1, 1,
      ?4, ?4, ?4, ?4
    )
  `).run(
    campaignKey,
    templateKey,
    "9".repeat(64),
    reservedAt,
  );
  database.prepare(`
    INSERT INTO campaign_recipients (
      campaign_key,
      tenant_id,
      contact_id,
      contact_version,
      phone_e164,
      personalization_json,
      personalization_key,
      delivery_key,
      status,
      attempt_count,
      queued_at,
      created_at,
      updated_at
    ) VALUES (
      ?1, 7, 17, 1, '+972501234567', '{}', ?2, ?3,
      'sending', 1, ?4, ?4, ?4
    )
  `).run(
    campaignKey,
    "a".repeat(64),
    deliveryKey,
    reservedAt,
  );

  const d1 = new SqliteD1Database(database);
  const rateLimits =
    createWhatsappRateLimitRepository(d1);
  const reservation =
    await rateLimits.reserveBusinessInitiatedMessage({
      reservationKey,
      tenantId: 7,
      portfolioKey,
      senderKey,
      recipientKey,
      policyEventKey,
      templateCategory: "UTILITY",
      portfolioCapacity: {
        kind: "bounded",
        maximumUniqueRecipients: 250,
      },
      phoneThroughput: {
        maximumMessagesPerSecond: 80,
        maximumOutboundMessagesPerSecond: 64,
      },
      reservedAt,
      reservationExpiresAt:
        "2026-08-16T10:05:00.000Z",
    });

  assert.equal(reservation.outcome, "reserved");

  const deliveries =
    createCampaignDeliveryProviderRepository(d1);

  return {
    database,
    deliveries,
    rateLimits,
    dispatch: createCampaignDispatchRepository(d1),
    reconciler:
      createCampaignDeliveryStatusReconciler(
        deliveries,
        rateLimits,
      ),
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

function providerStatus(
  status,
  statusEventAt,
  statusEventKey,
) {
  return {
    tenantId: 7,
    providerMessageId,
    status,
    statusEventAt,
    statusEventKey,
  };
}

test("links provider acceptance atomically and preserves exact retries", async () => {
  const fixture = await createFixture();
  const first = await fixture.deliveries.recordAccepted(
    acceptance(),
  );
  const repeated = await fixture.deliveries.recordAccepted(
    acceptance(),
  );

  assert.equal(first.outcome, "recorded");
  assert.equal(first.link.recipientStatus, "accepted");
  assert.equal(repeated.outcome, "idempotent");
  assert.equal(
    fixture.database.prepare(`
      SELECT count(*) AS count
      FROM campaign_delivery_provider_links
    `).get().count,
    1,
  );
  const conversationKey =
    `conversation_v1_${"b".repeat(64)}`;
  fixture.database.prepare(`
    INSERT INTO conversations (
      conversation_key,
      tenant_id,
      contact_id,
      status,
      unread_count,
      version,
      created_at,
      updated_at
    ) VALUES (
      ?1, 7, 17, 'new', 0, 1, ?2, ?2
    )
  `).run(conversationKey, acceptedAt);
  assert.throws(
    () =>
      fixture.database.prepare(`
        INSERT INTO messages (
          message_key,
          conversation_key,
          tenant_id,
          provider_message_id,
          direction,
          content_kind,
          status,
          text_content,
          occurred_at,
          status_updated_at,
          created_at,
          updated_at
        ) VALUES (
          ?1, ?2, 7, ?3, 'outbound', 'text', 'sent',
          'Service update', ?4, ?4, ?4, ?4
        )
      `).run(
        `message_v1_${"c".repeat(64)}`,
        conversationKey,
        providerMessageId,
        acceptedAt,
      ),
    /already belongs to a campaign delivery/,
  );
  assert.deepEqual(
    {
      ...fixture.database.prepare(`
        SELECT
          status,
          accepted_at AS acceptedAt
        FROM campaign_recipients
        WHERE delivery_key = ?1
      `).get(deliveryKey),
    },
    {
      status: "accepted",
      acceptedAt,
    },
  );
  await assert.rejects(
    fixture.deliveries.recordAccepted(
      acceptance({
        providerMessageId:
          "wamid.conflicting-campaign-id",
      }),
    ),
  );
  assert.throws(
    () =>
      fixture.database.prepare(`
        UPDATE campaign_delivery_provider_links
        SET provider_message_id = 'wamid.rewritten'
        WHERE delivery_key = ?1
      `).run(deliveryKey),
    /immutable/,
  );
  assert.throws(
    () =>
      fixture.database.prepare(`
        DELETE FROM campaign_delivery_provider_links
        WHERE delivery_key = ?1
      `).run(deliveryKey),
    /immutable evidence/,
  );

  fixture.database.close();
});

test("reconciles delivered and read once while rejecting a conflicting terminal result", async () => {
  const fixture = await createFixture();

  await fixture.deliveries.recordAccepted(acceptance());
  assert.deepEqual(
    await fixture.reconciler.reconcile(
      providerStatus("sent", sentAt, "b".repeat(64)),
    ),
    { outcome: "reconciled" },
  );
  assert.equal(
    fixture.database.prepare(`
      SELECT count(*) AS count
      FROM whatsapp_rate_limit_settlements
    `).get().count,
    0,
  );
  assert.equal(
    await fixture.dispatch.completeSettledCampaigns(
      sentAt,
      50,
    ),
    0,
  );

  const delivered = providerStatus(
    "delivered",
    deliveredAt,
    "c".repeat(64),
  );

  const applied =
    await fixture.deliveries.applyProviderStatus(
      delivered,
    );

  assert.equal(applied.outcome, "applied");
  assert.deepEqual(applied.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: deliveredAt,
  });
  assert.equal(
    fixture.database.prepare(`
      SELECT count(*) AS count
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = ?1
        AND outcome = 'delivered'
        AND settled_at = ?2
    `).get(reservationKey, deliveredAt).count,
    1,
  );
  await fixture.reconciler.reconcile(delivered);
  await fixture.reconciler.reconcile(
    providerStatus("read", readAt, "d".repeat(64)),
  );
  assert.equal(
    await fixture.dispatch.completeSettledCampaigns(
      "2026-08-16T10:00:05.000Z",
      50,
    ),
    1,
  );

  assert.deepEqual(
    {
      ...fixture.database.prepare(`
        SELECT
          outcome,
          settled_at AS settledAt
        FROM whatsapp_rate_limit_settlements
        WHERE reservation_key = ?1
      `).get(reservationKey),
    },
    {
      outcome: "delivered",
      settledAt: deliveredAt,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database.prepare(`
        SELECT
          status,
          last_error_code AS lastErrorCode
        FROM campaign_recipients
        WHERE delivery_key = ?1
      `).get(deliveryKey),
    },
    {
      status: "read",
      lastErrorCode: null,
    },
  );
  await assert.rejects(
    fixture.reconciler.reconcile(
      providerStatus(
        "failed",
        "2026-08-16T10:00:05.000Z",
        "e".repeat(64),
      ),
    ),
    /conflicts with durable evidence/,
  );
  assert.equal(
    fixture.database.prepare(`
      SELECT outcome
      FROM whatsapp_rate_limit_settlements
      WHERE reservation_key = ?1
    `).get(reservationKey).outcome,
    "delivered",
  );

  fixture.database.close();
});

test("fails closed for event-key reuse, unknown targets, and invalid input", async () => {
  const fixture = await createFixture();

  await fixture.deliveries.recordAccepted(acceptance());
  await fixture.reconciler.reconcile(
    providerStatus("sent", sentAt, "f".repeat(64)),
  );

  await assert.rejects(
    fixture.reconciler.reconcile(
      providerStatus(
        "delivered",
        sentAt,
        "f".repeat(64),
      ),
    ),
    /conflicts with durable evidence/,
  );
  assert.deepEqual(
    await fixture.reconciler.reconcile({
      ...providerStatus(
        "delivered",
        deliveredAt,
        "1".repeat(64),
      ),
      providerMessageId: "wamid.unknown",
    }),
    { outcome: "not-found" },
  );
  await assert.rejects(
    fixture.deliveries.applyProviderStatus({
      ...providerStatus(
        "delivered",
        deliveredAt,
        "1".repeat(64),
      ),
      tenantId: 0,
    }),
    /tenantId is invalid/,
  );

  fixture.database.close();
});
