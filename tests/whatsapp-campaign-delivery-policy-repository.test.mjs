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
  createWhatsappCampaignDeliveryPolicyRepository,
} from "../db/whatsappCampaignDeliveryPolicyRepository.ts";
import {
  createD1CampaignDeliveryRateLimitPolicySource,
} from "../server/campaigns/d1CampaignDeliveryRateLimitPolicySource.ts";

const checkedAt = "2026-08-16T10:00:00.000Z";
const recordedAt = "2026-08-16T10:01:00.000Z";
const expiresAt = "2026-08-16T11:00:00.000Z";
const lookupAt = "2026-08-16T10:02:00.000Z";

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
      meta: { changes: Number(result.changes) },
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
  `).run(checkedAt);
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
    ) VALUES (7, '400001', '400002', '400003', 'connected', ?1, ?1, 3, ?1, ?1)
  `).run(checkedAt);

  const binding = new SqliteD1Database(database);

  return {
    database,
    repository:
      createWhatsappCampaignDeliveryPolicyRepository(
        binding,
      ),
  };
}

function policyEvent(overrides = {}) {
  return {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
    tenantId: 7,
    connectionVersion: 3,
    policyVersion: 1,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "b".repeat(64),
    evidenceCheckedAt: checkedAt,
    evidenceExpiresAt: expiresAt,
    actorExternalUserId: "tal-rate-limit-research",
    recordedAt,
    createdAt: recordedAt,
    ...overrides,
  };
}

function insertPolicy(database, overrides = {}) {
  const event = policyEvent(overrides);

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
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
      ?9, ?10, ?11, ?12, ?13, ?14, ?15,
      ?16, ?17
    )
  `).run(
    event.eventKey,
    event.tenantId,
    event.connectionVersion,
    event.policyVersion,
    event.deliveryState,
    event.portfolioLimitKind,
    event.portfolioLimitValue,
    event.phoneThroughputMessagesPerSecond,
    event.maximumOutboundMessagesPerSecond,
    event.reservationDurationSeconds,
    event.metaGraphApiVersion,
    event.evidenceDigest,
    event.evidenceCheckedAt,
    event.evidenceExpiresAt,
    event.actorExternalUserId,
    event.recordedAt,
    event.createdAt,
  );

  return event;
}

function lookup(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "400001",
    wabaId: "400002",
    phoneNumberId: "400003",
    checkedAt: lookupAt,
    ...overrides,
  };
}

function recordCommand(overrides = {}) {
  return {
    tenantId: 7,
    connectionVersion: 3,
    expectedPolicyVersion: 0,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "b".repeat(64),
    evidenceCheckedAt: checkedAt,
    evidenceExpiresAt: expiresAt,
    actorExternalUserId:
      "tal-rate-limit-research",
    recordedAt,
    ...overrides,
  };
}

test("loads only current enabled evidence tied to the exact Meta connection", async () => {
  const { database, repository } =
    await createFixture();
  const event = insertPolicy(database);
  const result =
    await repository.findCurrentEnabledPolicy(
      lookup(),
    );

  assert.deepEqual(result, {
    eventKey: event.eventKey,
    tenantId: 7,
    connectionVersion: 3,
    policyVersion: 1,
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: event.evidenceDigest,
    evidenceCheckedAt: checkedAt,
    evidenceExpiresAt: expiresAt,
    recordedAt,
  });
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM audit_logs
      WHERE action = 'whatsapp.delivery_policy.recorded'
        AND metadata_json IS NULL
    `).get().count,
    1,
  );
});

test("maps D1 evidence to the narrow runtime policy contract", async () => {
  const { database, repository } =
    await createFixture();
  insertPolicy(database, {
    portfolioLimitKind: "unlimited",
    portfolioLimitValue: null,
    reservationDurationSeconds: 600,
  });
  const source =
    createD1CampaignDeliveryRateLimitPolicySource(
      repository,
    );

  assert.equal(source.isConfigured(), true);
  assert.deepEqual(await source.load(lookup()), {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
    portfolioCapacity: { kind: "unlimited" },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 600,
  });
});

test("fails closed for an expired policy, provider mismatch, or changed connection", async () => {
  const { database, repository } =
    await createFixture();
  insertPolicy(database);

  assert.equal(
    await repository.findCurrentEnabledPolicy(
      lookup({ checkedAt: expiresAt }),
    ),
    null,
  );
  assert.equal(
    await repository.findCurrentEnabledPolicy(
      lookup({ phoneNumberId: "499999" }),
    ),
    null,
  );

  database.prepare(`
    UPDATE meta_connections
    SET version = 4,
        updated_at = ?1
    WHERE tenant_id = 7
  `).run(lookupAt);

  assert.equal(
    await repository.findCurrentEnabledPolicy(
      lookup(),
    ),
    null,
  );
});

test("the latest disabled event is an immediate kill switch", async () => {
  const { database, repository } =
    await createFixture();
  insertPolicy(database);
  insertPolicy(database, {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"c".repeat(64)}`,
    policyVersion: 2,
    deliveryState: "disabled",
    recordedAt: lookupAt,
    createdAt: lookupAt,
  });

  assert.equal(
    await repository.findCurrentEnabledPolicy(
      lookup(),
    ),
    null,
  );
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM audit_logs
      WHERE action = 'whatsapp.delivery_policy.recorded'
    `).get().count,
    2,
  );
});

test("database rejects version gaps, malformed evidence, and mutation", async () => {
  const { database } = await createFixture();

  assert.throws(
    () => insertPolicy(database, { policyVersion: 2 }),
    /version is not sequential/,
  );
  assert.throws(
    () =>
      insertPolicy(database, {
        metaGraphApiVersion: "latest",
      }),
    /graph_version_valid/,
  );

  insertPolicy(database);

  assert.throws(
    () =>
      database.prepare(`
        UPDATE whatsapp_campaign_delivery_policy_events
        SET reservation_duration_seconds = 301
      `).run(),
    /events are immutable/,
  );
  assert.throws(
    () =>
      database.prepare(`
        DELETE FROM whatsapp_campaign_delivery_policy_events
      `).run(),
    /events are immutable/,
  );
});

test("rejects malformed lookup input before D1 access", async () => {
  const { repository } = await createFixture();

  await assert.rejects(
    repository.findCurrentEnabledPolicy(
      lookup({ tenantId: 0 }),
    ),
    /tenant is invalid/,
  );
  await assert.rejects(
    repository.findCurrentEnabledPolicy(
      lookup({ checkedAt: "2026-08-16 10:02:00" }),
    ),
    /lookup timestamp is invalid/,
  );
});

test("records deterministic policy evidence atomically with its audit event", async () => {
  const { database, repository } =
    await createFixture();
  const created =
    await repository.recordPolicyEvent(
      recordCommand(),
    );

  assert.equal(created.outcome, "created");
  assert.match(
    created.record.eventKey,
    /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    created.record.deliveryState,
    "enabled",
  );
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM audit_logs
      WHERE idempotency_key = ?1
        AND action = 'whatsapp.delivery_policy.recorded'
    `).get(created.record.eventKey).count,
    1,
  );

  const retried =
    await repository.recordPolicyEvent(
      recordCommand({
        recordedAt:
          "2026-08-16T10:01:30.000Z",
      }),
    );

  assert.equal(retried.outcome, "unchanged");
  assert.equal(
    retried.record.eventKey,
    created.record.eventKey,
  );
  assert.equal(
    database.prepare(`
      SELECT count(*) AS count
      FROM whatsapp_campaign_delivery_policy_events
    `).get().count,
    1,
  );
});

test("rejects stale policy versions and a kill switch that changes the approved snapshot", async () => {
  const { repository } =
    await createFixture();
  await repository.recordPolicyEvent(
    recordCommand(),
  );

  const stale =
    await repository.recordPolicyEvent(
      recordCommand({
        evidenceDigest: "c".repeat(64),
      }),
    );
  const changedKillSwitch =
    await repository.recordPolicyEvent(
      recordCommand({
        expectedPolicyVersion: 1,
        deliveryState: "disabled",
        reservationDurationSeconds: 301,
        recordedAt: lookupAt,
      }),
    );

  assert.equal(stale.outcome, "conflict");
  assert.equal(
    changedKillSwitch.outcome,
    "conflict",
  );
  assert.equal(
    changedKillSwitch.record?.deliveryState,
    "enabled",
  );
});

test("records an inherited kill switch even after evidence expiry", async () => {
  const { repository } =
    await createFixture();
  const enabled =
    await repository.recordPolicyEvent(
      recordCommand(),
    );
  assert.notEqual(enabled.outcome, "conflict");

  const disabled =
    await repository.recordPolicyEvent(
      recordCommand({
        expectedPolicyVersion: 1,
        deliveryState: "disabled",
        recordedAt:
          "2026-08-16T11:00:00.000Z",
      }),
    );

  assert.equal(disabled.outcome, "updated");
  assert.equal(
    disabled.record.deliveryState,
    "disabled",
  );
  assert.deepEqual(
    disabled.record.portfolioCapacity,
    enabled.record.portfolioCapacity,
  );
  assert.equal(
    await repository.findCurrentEnabledPolicy(
      lookup({
        checkedAt:
          "2026-08-16T10:59:59.000Z",
      }),
    ),
    null,
  );
});
