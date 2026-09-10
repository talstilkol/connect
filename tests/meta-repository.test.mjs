import assert from "node:assert/strict";
import test from "node:test";

import { createMetaRepository } from "../db/metaRepository.ts";

const eventKey =
  "756297bc87fa6c515823723ec427101952f8bd1900cef253169687dab5be7f89";

function connection(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "pending",
    webhookSubscribedAt: null,
    connectedAt: null,
    version: 1,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    id: 31,
    tenantId: 7,
    wabaId: "waba-id",
    eventKey,
    objectType: "whatsapp_business_account",
    status: "processing",
    attemptCount: 1,
    lastErrorCode: null,
    receivedAt: "2026-07-25 10:00:00",
    processedAt: null,
    updatedAt: "2026-07-25 10:00:00",
    ...overrides,
  };
}

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({ sql: this.sql, values });
    return this;
  }

  async run() {
    return this.database.runResults.shift() ?? { success: true };
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
  }

  async all() {
    return { success: true, results: [] };
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.runResults = [];
    this.firstResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }

  async batch() {
    return [];
  }
}

test("stores a server-verified Meta asset snapshot in tenant scope", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(connection());
  const repository = createMetaRepository(database);

  const saved = await repository.saveAssetSnapshot({
    tenantId: 7,
    businessPortfolioId: " business-portfolio-id ",
    wabaId: " waba-id ",
    phoneNumberId: " phone-number-id ",
  });

  assert.deepEqual(saved, connection());
  assert.match(database.recordings[0].sql, /INSERT INTO meta_connections/);
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id\) DO UPDATE/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    "business-portfolio-id",
    "waba-id",
    "phone-number-id",
  ]);
  assert.equal(database.recordings.length, 1);
  assert.match(database.recordings[0].sql, /RETURNING/);
});

test("resolves a webhook tenant only through the unique WABA ID", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(connection());
  const repository = createMetaRepository(database);

  const found = await repository.findConnectionByWabaId(" waba-id ");

  assert.equal(found.tenantId, 7);
  assert.match(database.recordings[0].sql, /WHERE waba_id = \?1/);
  assert.deepEqual(database.recordings[0].values, ["waba-id"]);
});

test("claims a new or failed webhook receipt without storing its payload", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(receipt({ attemptCount: 2 }));
  const repository = createMetaRepository(database);

  const claimed = await repository.claimWebhookReceipt({
    tenantId: 7,
    wabaId: "waba-id",
    eventKey,
    objectType: "whatsapp_business_account",
  });

  assert.equal(claimed.claimed, true);
  assert.equal(claimed.receipt.attemptCount, 2);
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, event_key\) DO UPDATE/,
  );
  assert.match(
    database.recordings[0].sql,
    /status = 'failed'[\s\S]+datetime\(CURRENT_TIMESTAMP, '-5 minutes'\)/,
  );
  assert.doesNotMatch(
    database.recordings[0].sql,
    /raw_payload|payload_json|message_body/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    "waba-id",
    eventKey,
    "whatsapp_business_account",
  ]);
});

test("returns an existing processed receipt as an unclaimed duplicate", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(
    null,
    receipt({
      status: "processed",
      processedAt: "2026-07-25 10:00:01",
    }),
  );
  const repository = createMetaRepository(database);

  const claimed = await repository.claimWebhookReceipt({
    tenantId: 7,
    wabaId: "waba-id",
    eventKey,
    objectType: "whatsapp_business_account",
  });

  assert.equal(claimed.claimed, false);
  assert.equal(claimed.receipt.status, "processed");
  assert.match(
    database.recordings[1].sql,
    /WHERE tenant_id = \?1[\s\S]+event_key = \?2/,
  );
});

test("completes and fails receipts only inside their tenant and processing state", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({ id: 31 }, { id: 32 });
  const repository = createMetaRepository(database);

  await repository.completeWebhookReceipt(7, 31);
  await repository.failWebhookReceipt(7, 32, "PROCESSOR_FAILED");

  assert.match(
    database.recordings[0].sql,
    /id = \?1[\s\S]+tenant_id = \?2[\s\S]+status = 'processing'/,
  );
  assert.deepEqual(database.recordings[0].values, [31, 7]);
  assert.match(database.recordings[1].sql, /status = 'failed'/);
  assert.deepEqual(database.recordings[1].values, [
    32,
    7,
    "PROCESSOR_FAILED",
  ]);
});

test("rejects malformed external IDs and event keys before D1 access", async () => {
  const database = new RecordingDatabase();
  const repository = createMetaRepository(database);

  await assert.rejects(
    repository.findConnectionByWabaId(" "),
    /wabaId/,
  );
  await assert.rejects(
    repository.claimWebhookReceipt({
      tenantId: 7,
      wabaId: "waba-id",
      eventKey: "not-a-sha256",
      objectType: "whatsapp_business_account",
    }),
    /eventKey/,
  );
  assert.deepEqual(database.recordings, []);
});

test("atomic confirmation rejects revocation, replacement, duplicate and stale attempts", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(await readFile(new URL("../drizzle/0000_connect_foundation.sql", import.meta.url), "utf8"));
    database.exec(await readFile(new URL("../drizzle/0006_meta_connection_webhooks.sql", import.meta.url), "utf8"));
    database.prepare("INSERT INTO tenants (id, display_name) VALUES (?, ?)").run(7, "tenant-name");
    const repository = createMetaRepository({
      prepare(sql) {
        const statement = database.prepare(sql);
        let values = [];
        return {
          bind(...input) { values = input; return this; },
          async run() { return { success: true, meta: { changes: Number(statement.run(...values).changes) } }; },
          async first() { return statement.get(...values) ?? null; },
        };
      },
    });
    const assets = { tenantId: 7, businessPortfolioId: "business-portfolio-id", wabaId: "waba-id", phoneNumberId: "phone-number-id" };
    const initial = await repository.saveAssetSnapshot(assets);
    const revoked = await repository.markConnectionStatus(7, "revoked");
    await assert.rejects(repository.markConnectionConnected(7, revoked.version));
    await assert.rejects(repository.markConnectionConnected(7, initial.version));
    assert.equal((await repository.findConnectionByTenantId(7)).status, "revoked");
    const renewed = await repository.saveAssetSnapshot(assets);
    await assert.rejects(repository.markConnectionConnected(7, initial.version));
    const replaced = await repository.saveAssetSnapshot({ ...assets, phoneNumberId: "replacement-phone-id" });
    await assert.rejects(repository.markConnectionConnected(7, renewed.version));
    assert.equal((await repository.findConnectionByTenantId(7)).status, "pending");
    const connected = await repository.markConnectionConnected(7, replaced.version);
    assert.equal(connected.status, "connected");
    assert.equal(connected.version, replaced.version + 1);
    await assert.rejects(repository.markConnectionConnected(7, replaced.version));
    assert.equal((await repository.findConnectionByTenantId(7)).version, connected.version);
    await assert.rejects(repository.markConnectionConnected(7, undefined));
  } finally {
    database.close();
  }
});
