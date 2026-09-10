import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialRepository,
} from "../db/metaCredentialRepository.ts";

const initializationVector = "AQIDBAUGBwgJCgsM";
const ciphertext = "AQIDBAUGBwgJCgsMDQ4PEA==";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({
      sql: this.sql,
      values,
    });
    return this;
  }

  async run() {
    return this.database.runResults.shift() ?? {
      success: true,
      meta: { changes: 1 },
    };
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

function envelope(overrides = {}) {
  return {
    tenantId: 7,
    authorizationVersion: 1,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
    ...overrides,
  };
}

test("upserts only an encrypted Meta credential envelope in tenant scope", async () => {
  const database = new RecordingDatabase();
  const repository = createMetaCredentialRepository(database);

  await repository.store({
    tenantId: 7,
    expectedConnectionVersion: 1,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
  });

  assert.equal(database.recordings.length, 1);
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO meta_credential_envelopes/,
  );
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id\) DO UPDATE/,
  );
  assert.doesNotMatch(
    database.recordings[0].sql,
    /access_token|plaintext|provider_payload/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    "v1",
    initializationVector,
    ciphertext,
    1,
  ]);
});

test("loads and validates an envelope only by tenant ID", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push(envelope());
  const repository = createMetaCredentialRepository(database);

  assert.deepEqual(
    await repository.findByTenantId(7),
    envelope(),
  );
  assert.match(
    database.recordings[0].sql,
    /WHERE envelope\.tenant_id = \?1/,
  );
  assert.deepEqual(database.recordings[0].values, [7]);
});

test("rejects malformed envelopes before storing or returning them", async () => {
  const database = new RecordingDatabase();
  const repository = createMetaCredentialRepository(database);

  await assert.rejects(
    repository.store({
      tenantId: 0,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /tenantId/,
  );
  await assert.rejects(
    repository.store({
      tenantId: 7,
      expectedConnectionVersion: 1,
      keyVersion: "v2",
      initializationVector,
      ciphertext,
    }),
    /key version/,
  );
  await assert.rejects(
    repository.store({
      tenantId: 7,
      expectedConnectionVersion: 1,
      keyVersion: "v1",
      initializationVector: "invalid",
      ciphertext,
    }),
    /initialization vector/,
  );
  assert.equal(database.recordings.length, 0);

  database.firstResults.push(
    envelope({
      ciphertext: "not-base64",
    }),
  );

  await assert.rejects(
    repository.findByTenantId(7),
    /ciphertext/,
  );
});

test("surfaces a failed encrypted write without storing a fallback", async () => {
  const database = new RecordingDatabase();
  database.runResults.push({
    success: false,
    error: "database failure",
  });
  const repository = createMetaCredentialRepository(database);

  await assert.rejects(
    repository.store({
      tenantId: 7,
      expectedConnectionVersion: 1,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /database failure/,
  );
  assert.equal(database.recordings.length, 1);
});

test("a delayed encrypted write cannot overwrite credentials after asset replacement or activation", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const { createMetaRepository } = await import("../db/metaRepository.ts");
  const database = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0000_connect_foundation.sql", "0006_meta_connection_webhooks.sql", "0007_meta_credential_vault.sql"]) {
      database.exec(await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    }
    database.prepare("INSERT INTO tenants (id, display_name) VALUES (?, ?)").run(7, "tenant-name");
    const binding = { prepare(sql) {
      const statement = database.prepare(sql);
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async run() { return { success: true, meta: { changes: Number(statement.run(...values).changes) } }; },
        async first() { return statement.get(...values) ?? null; },
      };
    } };
    const connections = createMetaRepository(binding);
    const credentials = createMetaCredentialRepository(binding);
    const assets = { tenantId: 7, businessPortfolioId: "business-portfolio-id", wabaId: "waba-id", phoneNumberId: "phone-number-id" };
    const initial = await connections.saveAssetSnapshot(assets);
    const input = { tenantId: 7, keyVersion: "v1", initializationVector, ciphertext, expectedConnectionVersion: initial.version };
    await credentials.store(input);
    const replacement = await connections.saveAssetSnapshot({ ...assets, phoneNumberId: "replacement-phone-id" });
    const replacementCiphertext = "BQIDBAUGBwgJCgsMDQ4PEA==";
    await credentials.store({ ...input, expectedConnectionVersion: replacement.version, ciphertext: replacementCiphertext });
    await assert.rejects(credentials.store(input));
    assert.equal((await credentials.findByTenantId(7)).ciphertext, replacementCiphertext);
    await connections.markConnectionConnected(7, replacement.version);
    await assert.rejects(credentials.store({ ...input, expectedConnectionVersion: replacement.version + 1 }));
    const revoked = await connections.markConnectionStatus(7, "revoked");
    await assert.rejects(credentials.store({ ...input, expectedConnectionVersion: revoked.version }));
    await assert.rejects(credentials.store({ ...input, expectedConnectionVersion: undefined }));
    assert.equal(await credentials.findByTenantId(7), null);
    assert.equal(database.prepare("SELECT ciphertext FROM meta_credential_envelopes WHERE tenant_id = ?").get(7).ciphertext, replacementCiphertext);
  } finally { database.close(); }
});

test("credential decryption follows the current authorization generation and rejects legacy envelopes", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const { createMetaRepository } = await import("../db/metaRepository.ts");
  const { createMetaCredentialVault } = await import("../server/meta/metaCredentialVault.ts");
  const database = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0000_connect_foundation.sql", "0006_meta_connection_webhooks.sql", "0007_meta_credential_vault.sql"]) {
      database.exec(await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    }
    database.prepare("INSERT INTO tenants (id, display_name) VALUES (?, ?)").run(7, "tenant-name");
    const binding = { prepare(sql) {
      const statement = database.prepare(sql);
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async run() { return { success: true, meta: { changes: Number(statement.run(...values).changes) } }; },
        async first() { return statement.get(...values) ?? null; },
      };
    } };
    const connections = createMetaRepository(binding);
    const credentials = createMetaCredentialRepository(binding);
    const keyBytes = new Uint8Array(32).fill(31);
    let nonce = 0;
    const vault = createMetaCredentialVault(credentials, {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.from(keyBytes).toString("base64"),
    }, { crypto: { subtle: crypto.subtle, getRandomValues(target) { target.fill(++nonce); return target; } } });
    const assets = { tenantId: 7, businessPortfolioId: "business-portfolio-id", wabaId: "waba-id", phoneNumberId: "phone-number-id" };
    const pending = await connections.saveAssetSnapshot(assets);
    await vault.storeAccessToken(7, "protected-token", pending.version);
    assert.equal(await vault.withAccessToken(7, async (token) => token), "protected-token");
    await connections.markConnectionConnected(7, pending.version);
    assert.equal(await vault.withAccessToken(7, async (token) => token), "protected-token");
    const replaced = await connections.saveAssetSnapshot({ ...assets, phoneNumberId: "replacement-phone-id" });
    let callbackCalled = false;
    await assert.rejects(vault.withAccessToken(7, async () => { callbackCalled = true; }), { code: "DECRYPTION_FAILED" });
    assert.equal(callbackCalled, false);
    await vault.storeAccessToken(7, "replacement-token", replaced.version);
    assert.equal(await vault.withAccessToken(7, async (token) => token), "replacement-token");
    await connections.markConnectionStatus(7, "revoked");
    await assert.rejects(vault.withAccessToken(7, async () => { callbackCalled = true; }), { code: "CREDENTIAL_NOT_FOUND" });
    const renewed = await connections.saveAssetSnapshot(assets);
    // Explicitly reproduce the legacy AAD; it must never be accepted by fallback.
    const iv = new Uint8Array(12).fill(++nonce);
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv,
      additionalData: new TextEncoder().encode("connect:meta-access-token:v1:tenant:7"), tagLength: 128,
    }, key, new TextEncoder().encode("legacy-token"));
    await credentials.store({ tenantId: 7, expectedConnectionVersion: renewed.version, keyVersion: "v1",
      initializationVector: Buffer.from(iv).toString("base64"), ciphertext: Buffer.from(encrypted).toString("base64"),
    });
    await assert.rejects(vault.withAccessToken(7, async () => { callbackCalled = true; }), { code: "DECRYPTION_FAILED" });
    assert.equal(callbackCalled, false);
  } finally { database.close(); }
});

test("parallel signups for identical assets return distinct generations and fence the older attempt", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const { createMetaRepository } = await import("../db/metaRepository.ts");
  const { createMetaCredentialVault } = await import("../server/meta/metaCredentialVault.ts");
  const database = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0000_connect_foundation.sql", "0006_meta_connection_webhooks.sql", "0007_meta_credential_vault.sql"]) {
      database.exec(await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    }
    database.prepare("INSERT INTO tenants (id, display_name) VALUES (?, ?)").run(7, "tenant-name");
    const binding = { prepare(sql) {
      const statement = database.prepare(sql);
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async run() { return { success: true, meta: { changes: Number(statement.run(...values).changes) } }; },
        async first() { return statement.get(...values) ?? null; },
      };
    } };
    const connections = createMetaRepository(binding);
    const credentials = createMetaCredentialRepository(binding);
    let nonce = 0;
    const vault = createMetaCredentialVault(credentials, {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.alloc(32, 41).toString("base64"),
    }, { crypto: { subtle: crypto.subtle, getRandomValues(target) { target.fill(++nonce); return target; } } });
    const assets = { tenantId: 7, businessPortfolioId: "business-portfolio-id", wabaId: "waba-id", phoneNumberId: "phone-number-id" };
    // Both writes start before either repository promise resolves. A separate
    // post-write SELECT could incorrectly hand both callers the latest version.
    const [first, second] = await Promise.all([
      connections.saveAssetSnapshot(assets),
      connections.saveAssetSnapshot(assets),
    ]);
    assert.deepEqual([first.version, second.version], [1, 2]);
    await assert.rejects(vault.storeAccessToken(7, "older-attempt-token", first.version), { code: "STORAGE_FAILED" });
    await assert.rejects(connections.markConnectionConnected(7, first.version));
    await vault.storeAccessToken(7, "current-attempt-token", second.version);
    const confirmed = await connections.markConnectionConnected(7, second.version);
    assert.equal(confirmed.version, 3);
    assert.equal(await vault.withAccessToken(7, async (token) => token), "current-attempt-token");
    const next = await connections.saveAssetSnapshot(assets);
    assert.equal(next.version, 4);
    await assert.rejects(vault.withAccessToken(7, async () => assert.fail("superseded credential must not be used")), { code: "DECRYPTION_FAILED" });
    await assert.rejects(connections.markConnectionConnected(7, second.version));
    assert.equal((await connections.findConnectionByTenantId(7)).status, "pending");
  } finally { database.close(); }
});
