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
  BotReplyDeliveryIdentityConflictError,
  createBotReplyDeliveryRepository,
} from "../db/botReplyDeliveryRepository.ts";
import {
  createWhatsappRateLimitRepository,
} from "../db/whatsappRateLimitRepository.ts";
import {
  createBotReplyDeliveryProviderRepository,
} from "../db/botReplyDeliveryProviderRepository.ts";
import {
  compileKeywordBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  deriveBotReplyDeliveryKey,
} from "../server/bot/botReplyDeliveryKey.ts";
import {
  createBotReplyDeliveryStatusReconciler,
} from "../server/bot/botReplyDeliveryStatusReconciler.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const occurredAt =
  "2026-07-26T15:00:00.000Z";
const policyRecordedAt =
  "2026-07-26T14:59:00.000Z";
const policyExpiresAt =
  "2026-07-27T14:59:00.000Z";
const reservationExpiresAt =
  "2026-07-26T15:05:00.000Z";
const reconciledAt =
  "2026-07-26T15:00:10.000Z";
const reservationKey =
  `whatsapp_rate_reservation_v1_${"c".repeat(64)}`;
const policyEventKey =
  `whatsapp_delivery_policy_event_v1_${"d".repeat(64)}`;

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
    return (
      this.statement.get(...this.values) ??
      null
    );
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(
        ...this.values,
      ),
    };
  }

  async run() {
    const result = this.statement.run(
      ...this.values,
    );

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
    const results = [];

    for (const statement of statements) {
      results.push(await statement.run());
    }

    return results;
  }
}

async function createFixture() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrations = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  for (const migration of migrations) {
    const sql = await readFile(
      new URL(migration, migrationDirectory),
      "utf8",
    );

    for (const statement of sql.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  const compilation =
    await compileKeywordBotFlowComposerDraft(
      1,
      {
        name: "מענה לפניות שירות",
        keywords: ["שירות"],
        matchMode: "exact",
        replyText: "קיבלנו את פנייתך.",
        expectedFlowVersion: null,
      },
    );

  assert.equal(compilation.success, true);

  const botFlowKey = await deriveBotFlowKey(
    1,
    compilation.definition.name,
  );
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      1,
      botFlowKey,
      1,
      compilation.definition,
    );
  const definitionJson = JSON.stringify(
    compilation.definition,
  );

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
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
      1, 'portfolio-one', 'waba-one', 'phone-number-id',
      'connected', ?, ?, 1, ?, ?
    )
  `).run(
    policyRecordedAt,
    policyRecordedAt,
    policyRecordedAt,
    policyRecordedAt,
  );
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
      ?, 1, 1, 1, 'enabled', 'bounded', 250,
      80, 64, 300, 'v23.0', ?, ?, ?,
      'bot-reply-test-owner', ?, ?
    )
  `).run(
    policyEventKey,
    "e".repeat(64),
    policyRecordedAt,
    policyExpiresAt,
    policyRecordedAt,
    policyRecordedAt,
  );
  database
    .prepare(
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (1, ?)",
    )
    .run("+972501234567");
  database
    .prepare(
      "INSERT INTO conversations (conversation_key, tenant_id, contact_id) VALUES (?, 1, 1)",
    )
    .run(conversationKey);
  database
    .prepare(
      `INSERT INTO messages (
        message_key,
        conversation_key,
        tenant_id,
        provider_message_id,
        direction,
        content_kind,
        status,
        text_content,
        occurred_at,
        status_updated_at
      ) VALUES (?, ?, 1, ?, 'inbound', 'text', 'received', ?, ?, ?)`,
    )
    .run(
      inboundMessageKey,
      conversationKey,
      "wamid.inbound-1",
      "שירות",
      occurredAt,
      occurredAt,
    );
  database
    .prepare(
      `INSERT INTO bot_flows (
        bot_flow_key,
        tenant_id,
        name,
        status,
        latest_version_key,
        latest_version_number,
        active_version_key,
        version
      ) VALUES (?, 1, ?, 'active', ?, 1, ?, 2)`,
    )
    .run(
      botFlowKey,
      compilation.definition.name,
      botFlowVersionKey,
      botFlowVersionKey,
    );
  database
    .prepare(
      `INSERT INTO bot_flow_versions (
        bot_flow_version_key,
        bot_flow_key,
        tenant_id,
        version_number,
        status,
        definition_json,
        published_at
      ) VALUES (?, ?, 1, 1, 'published', ?, ?)`,
    )
    .run(
      botFlowVersionKey,
      botFlowKey,
      definitionJson,
      occurredAt,
    );

  const d1 = new SqliteD1Database(database);
  const rateLimits =
    createWhatsappRateLimitRepository(d1);
  const reservation =
    await rateLimits.reserveServiceReply({
      reservationKey,
      tenantId: 1,
      portfolioKey:
        `whatsapp_portfolio_v1_${"f".repeat(64)}`,
      senderKey:
        `whatsapp_sender_v1_${"1".repeat(64)}`,
      recipientKey:
        `whatsapp_recipient_v1_${"2".repeat(64)}`,
      policyEventKey,
      portfolioCapacity: {
        kind: "bounded",
        maximumUniqueRecipients: 250,
      },
      phoneThroughput: {
        maximumMessagesPerSecond: 80,
        maximumOutboundMessagesPerSecond: 64,
      },
      reservedAt: occurredAt,
      reservationExpiresAt,
    });
  assert.equal(reservation.outcome, "reserved");

  return {
    database,
    repository:
      createBotReplyDeliveryRepository(
        d1,
      ),
    providerLinks:
      createBotReplyDeliveryProviderRepository(
        d1,
      ),
    rateLimits,
    botFlowKey,
    botFlowVersionKey,
  };
}

async function stageInput(
  fixture,
  replyIndex = 1,
) {
  const reply = {
    kind: "text",
    text:
      replyIndex === 1
        ? "קיבלנו את פנייתך."
        : "נעדכן בהמשך.",
  };
  const deliveryKey =
    await deriveBotReplyDeliveryKey(1, {
      conversationKey,
      inboundMessageKey,
      botFlowVersionKey:
        fixture.botFlowVersionKey,
      replyIndex,
      reply,
    });

  return {
    deliveryKey,
    tenantId: 1,
    conversationKey,
    inboundMessageKey,
    botFlowKey: fixture.botFlowKey,
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    replyIndex,
    senderPhoneNumberId:
      "phone-number-id",
    recipientPhoneNumber:
      "+972501234567",
    reply,
  };
}

test("persists an idempotent reply and advances it through an atomic acceptance claim", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture);
  const created =
    await fixture.repository.stage(input);
  const duplicate =
    await fixture.repository.stage(input);
  const claimed =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );
  const uncertain =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );
  const accepted =
    await fixture.repository.markAccepted(
      1,
      input.deliveryKey,
      claimed.delivery.claimVersion,
      "wamid.outbound-1",
      reservationKey,
      occurredAt,
    );
  const settledClaim =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );

  assert.equal(created.outcome, "created");
  assert.equal(
    created.delivery.status,
    "pending",
  );
  assert.equal(duplicate.outcome, "duplicate");
  assert.equal(claimed.outcome, "claimed");
  assert.equal(
    claimed.delivery.attemptCount,
    1,
  );
  assert.equal(uncertain.outcome, "uncertain");
  assert.equal(accepted.status, "accepted");
  assert.equal(
    accepted.providerMessageId,
    "wamid.outbound-1",
  );
  assert.equal(
    settledClaim.outcome,
    "duplicate",
  );

  fixture.database.close();
});

test("reconciles bot provider status and settles its exact service reservation once", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture);
  const sentAt = "2026-07-26T15:00:02.000Z";
  const deliveredAt = "2026-07-26T15:00:03.000Z";
  const readAt = "2026-07-26T15:00:04.000Z";
  const providerMessageId = "wamid.bot-provider-status-1";

  await fixture.repository.stage(input);
  const claimed = await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  assert.equal(claimed.outcome, "claimed");
  await fixture.repository.markAccepted(
    1,
    input.deliveryKey,
    claimed.delivery.claimVersion,
    providerMessageId,
    reservationKey,
    occurredAt,
  );

  const reconciler =
    createBotReplyDeliveryStatusReconciler(
      fixture.providerLinks,
      fixture.rateLimits,
      Object.freeze({
        now: () => new Date(reconciledAt),
      }),
    );
  const status = (
    providerStatus,
    statusEventAt,
    statusEventKey,
  ) => ({
    tenantId: 1,
    providerMessageId,
    status: providerStatus,
    statusEventKey,
    statusEventAt,
    reconciledAt,
  });

  assert.deepEqual(
    await reconciler.reconcile(
      status("sent", sentAt, "1".repeat(64)),
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

  const delivered = status(
    "delivered",
    deliveredAt,
    "2".repeat(64),
  );
  await reconciler.reconcile(delivered);
  await reconciler.reconcile(delivered);
  await reconciler.reconcile(
    status("read", readAt, "3".repeat(64)),
  );

  assert.deepEqual(
    {
      ...fixture.database.prepare(`
        SELECT
          provider_status AS providerStatus,
          terminal_outcome AS terminalOutcome,
          terminal_settled_at AS terminalSettledAt
        FROM bot_reply_delivery_provider_links
        WHERE delivery_key = ?
      `).get(input.deliveryKey),
    },
    {
      providerStatus: "read",
      terminalOutcome: "delivered",
      terminalSettledAt: reconciledAt,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database.prepare(`
        SELECT outcome, settled_at AS settledAt
        FROM whatsapp_rate_limit_settlements
        WHERE reservation_key = ?
      `).get(reservationKey),
    },
    { outcome: "delivered", settledAt: reconciledAt },
  );
  assert.equal(
    fixture.database.prepare(`
      SELECT status
      FROM bot_reply_deliveries
      WHERE delivery_key = ?
    `).get(input.deliveryKey).status,
    "accepted",
  );

  await assert.rejects(
    reconciler.reconcile(
      status(
        "failed",
        "2026-07-26T15:00:05.000Z",
        "4".repeat(64),
      ),
    ),
    /conflicts with durable evidence/,
  );
  const stale = await fixture.providerLinks.applyProviderStatus(
    status(
      "sent",
      "2026-07-26T15:00:01.000Z",
      "5".repeat(64),
    ),
  );
  assert.equal(stale.outcome, "stale");
  assert.equal(stale.link.providerStatus, "read");
  assert.deepEqual(stale.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: reconciledAt,
  });

  assert.throws(
    () => fixture.database.prepare(`
      UPDATE bot_reply_delivery_provider_links
      SET provider_message_id = 'wamid.rewritten'
      WHERE delivery_key = ?
    `).run(input.deliveryKey),
    /Bot reply provider/,
  );
  assert.throws(
    () => fixture.database.prepare(`
      DELETE FROM bot_reply_delivery_provider_links
      WHERE delivery_key = ?
    `).run(input.deliveryKey),
    /immutable evidence/,
  );
  assert.throws(
    () => fixture.database.prepare(`
      UPDATE messages
      SET provider_message_id = ?
      WHERE message_key = ?
    `).run(providerMessageId, inboundMessageKey),
    /already belongs to a bot reply/,
  );

  fixture.database.close();
});

test("accepts a Meta status from before the local acceptance millisecond", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture, 7);
  const localAcceptedAt = "2026-07-26T15:00:00.900Z";
  const providerOccurredAt = "2026-07-26T15:00:00.000Z";
  const localReconciledAt = "2026-07-26T15:00:01.100Z";
  const providerMessageId = "wamid.bot-provider-clock-domain-1";

  await fixture.repository.stage(input);
  const claimed = await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  assert.equal(claimed.outcome, "claimed");
  await fixture.repository.markAccepted(
    1,
    input.deliveryKey,
    claimed.delivery.claimVersion,
    providerMessageId,
    reservationKey,
    localAcceptedAt,
  );

  const result = await fixture.providerLinks.applyProviderStatus({
    tenantId: 1,
    providerMessageId,
    status: "delivered",
    statusEventKey: "6".repeat(64),
    statusEventAt: providerOccurredAt,
    reconciledAt: localReconciledAt,
  });

  assert.equal(result.outcome, "applied");
  assert.equal(result.link.lastStatusEventAt, providerOccurredAt);
  assert.deepEqual(result.settlement, {
    reservationKey,
    outcome: "delivered",
    settledAt: localReconciledAt,
  });
  fixture.database.close();
});

test("records an explicit rejection and rejects a conflicting deterministic identity", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture, 2);

  await fixture.repository.stage(input);
  const claimed = await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  const rejected =
    await fixture.repository.markRejected(
      1,
      input.deliveryKey,
      claimed.delivery.claimVersion,
      "POLICY_REJECTED",
      occurredAt,
    );

  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.lastErrorCode,
    "POLICY_REJECTED",
  );
  await assert.rejects(
    fixture.repository.stage({
      ...input,
      recipientPhoneNumber:
        "+972509876543",
    }),
    (error) =>
      error instanceof
      BotReplyDeliveryIdentityConflictError,
  );

  fixture.database.close();
});

test("records immutable Meta 131047 provenance with the rejected claim", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture, 2);
  await fixture.repository.stage(input);
  const claimed = await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  assert.equal(claimed.outcome, "claimed");
  await fixture.rateLimits.settle({
    reservationKey,
    outcome: "provider-failed",
    settledAt: occurredAt,
  });

  const rejected = await fixture.repository
    .rejectProviderServiceWindow({
      tenantId: 1,
      deliveryKey: input.deliveryKey,
      expectedClaimVersion: claimed.delivery.claimVersion,
      reservationKey,
      providerErrorCode: 131047,
      reasonCode: "META_SERVICE_WINDOW_CLOSED",
      serviceWindowOpenedAt: occurredAt,
      serviceWindowExpiresAt: "2026-07-27T15:00:00.000Z",
      attemptedAt: occurredAt,
      rejectedAt: occurredAt,
    });

  assert.equal(rejected.status, "rejected");
  assert.deepEqual({
    ...fixture.database.prepare(`
      SELECT
        provider_error_code AS providerErrorCode,
        reason_code AS reasonCode,
        reservation_key AS storedReservationKey
      FROM bot_reply_service_window_rejection_events
      WHERE delivery_key = ?
    `).get(input.deliveryKey),
  }, {
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    storedReservationKey: reservationKey,
  });
  assert.throws(
    () => fixture.database.prepare(`
      UPDATE bot_reply_service_window_rejection_events
      SET reason_code = 'OTHER'
      WHERE delivery_key = ?
    `).run(input.deliveryKey),
    /evidence is immutable/,
  );

  fixture.database.close();
});

test("defers a claimed reply durably and fences the reclaimed attempt", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture);
  const deferredAt =
    "2026-07-26T15:01:00.000Z";
  const retryAt =
    "2026-07-26T15:01:06.000Z";
  const acceptedAt =
    "2026-07-26T15:01:07.000Z";

  await fixture.repository.stage(input);
  const firstClaim = await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  assert.equal(firstClaim.outcome, "claimed");
  assert.equal(firstClaim.delivery.claimVersion, 1);

  const deferred = await fixture.repository.defer(
    1,
    input.deliveryKey,
    firstClaim.delivery.claimVersion,
    deferredAt,
    retryAt,
    "WHATSAPP_RATE_LIMITED",
  );
  assert.equal(deferred.status, "pending");
  assert.equal(deferred.nextAttemptAt, retryAt);
  assert.equal(deferred.attemptCount, 0);

  const early = await fixture.repository.claim(
    1,
    input.deliveryKey,
    deferredAt,
  );
  assert.equal(early.outcome, "deferred");
  assert.equal(early.retryAt, retryAt);
  assert.deepEqual(
    await fixture.repository.listDueDeferrals(
      deferredAt,
      10,
    ),
    [],
  );
  assert.deepEqual(
    await fixture.repository.listDueDeferrals(
      retryAt,
      10,
    ),
    [{
      deliveryKey: input.deliveryKey,
      tenantId: 1,
      senderPhoneNumberId:
        input.senderPhoneNumberId,
      claimVersion: 1,
      retryAt,
      serviceWindowOpenedAt: occurredAt,
      serviceWindowExpiresAt:
        "2026-07-27T15:00:00.000Z",
    }],
  );

  const secondClaim = await fixture.repository.claim(
    1,
    input.deliveryKey,
    retryAt,
  );
  assert.equal(secondClaim.outcome, "claimed");
  assert.equal(secondClaim.delivery.claimVersion, 2);

  await assert.rejects(
    fixture.repository.markAccepted(
      1,
      input.deliveryKey,
      firstClaim.delivery.claimVersion,
      "wamid.stale-worker",
      reservationKey,
      acceptedAt,
    ),
    /transition failed/,
  );
  const accepted = await fixture.repository.markAccepted(
    1,
    input.deliveryKey,
    secondClaim.delivery.claimVersion,
    "wamid.current-worker",
    reservationKey,
    acceptedAt,
  );
  assert.equal(accepted.status, "accepted");

  fixture.database.close();
});
