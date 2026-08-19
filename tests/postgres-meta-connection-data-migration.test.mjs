import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresMetaConnectionDataMigrationPlan,
  createPostgresMetaConnectionDataSnapshot,
  executePostgresMetaConnectionDataMigration,
} from "../server/platform/postgresMetaConnectionDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1MetaConnectionSnapshot,
} from "../scripts/read-d1-meta-connection-snapshot.mjs";
import {
  requireLocalMetaConnectionDataMigrationUrl,
} from "../scripts/verify-postgres-meta-connection-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 41).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const processedAt = "2026-08-20T08:05:00.000Z";
const eventKey = "a".repeat(64);
const initializationVector = "AQIDBAUGBwgJCgsM";
const ciphertext = "AQIDBAUGBwgJCgsMDQ4PEA==";

function rawTables() {
  return {
    meta_connections: [{
      tenant_id: 1,
      business_portfolio_id: "private-business-portfolio",
      waba_id: "private-waba-identifier",
      phone_number_id: "private-phone-identifier",
      status: "connected",
      webhook_subscribed_at: processedAt,
      connected_at: processedAt,
      version: 2,
      created_at: createdAt,
      updated_at: processedAt,
    }],
    meta_webhook_receipts: [{
      id: 1,
      tenant_id: 1,
      waba_id: "private-waba-identifier",
      event_key: eventKey,
      object_type: "whatsapp_business_account",
      status: "processed",
      attempt_count: 1,
      last_error_code: null,
      received_at: createdAt,
      processed_at: processedAt,
      updated_at: processedAt,
    }],
    meta_credential_envelopes: [{
      tenant_id: 1,
      key_version: "v1",
      initialization_vector: initializationVector,
      ciphertext,
      created_at: createdAt,
      updated_at: processedAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresMetaConnectionDataMigrationPlan({
    snapshot: createPostgresMetaConnectionDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function tableNameFromTargetRead(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ invalidLoadedState = false } = {}) {
  const tables = rawTables();
  const calls = [];
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            if (/^INSERT INTO ([a-z_]+)/i.test(sql)) {
              const tableName = /^INSERT INTO ([a-z_]+)/i.exec(sql)[1];
              return { rows: [], rowCount: tables[tableName].length };
            }
            if (/^SELECT 1\s+FROM meta_connections/i.test(sql)) {
              return invalidLoadedState
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            if (/^SELECT setval/i.test(sql)) {
              return { rows: [{}], rowCount: 1 };
            }
            const tableName = tableNameFromTargetRead(sql);
            if (tableName) {
              return {
                rows: tables[tableName],
                rowCount: tables[tableName].length,
              };
            }
            return { rows: [{}], rowCount: 1 };
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
    calls,
    manager,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
  };
}

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort()) {
    database.exec(
      readFileSync(`drizzle/${fileName}`, "utf8")
        .replaceAll("--> statement-breakpoint", ""),
    );
  }
  return database;
}

test("builds privacy-safe Meta migration evidence from encrypted envelopes", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresMetaConnectionDataMigration({
    plan,
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });

  assert.equal(evidence.tableCount, 3);
  assert.equal(evidence.totalRowCount, 3);
  assert.equal(fixture.committed, true);
  assert.match(
    plan.planId,
    /^connect_postgres_meta_connection_data_v1_[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(
    publicArtifacts,
    /private-business|private-waba|private-phone|AQIDBAUG|whatsapp_business/,
  );
  assert.equal(
    evidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest,
    ),
    true,
  );
  assert.equal(
    fixture.calls.filter(({ sql }) => /^SELECT setval/i.test(sql)).length,
    1,
  );
});

test("rejects weaker D1 legacy values before creating a migration plan", () => {
  const invalidCases = [
    ["meta_connections", "business_portfolio_id", " private-business "],
    ["meta_webhook_receipts", "object_type", "x".repeat(256)],
    ["meta_webhook_receipts", "last_error_code", " BAD_CODE "],
    ["meta_credential_envelopes", "initialization_vector", "AQIDBAUGBwgJ==sM"],
    ["meta_credential_envelopes", "ciphertext", "AQID==BAUGBwgJCgsMDQ4PEA"],
  ];

  for (const [tableName, fieldName, value] of invalidCases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    if (tableName === "meta_webhook_receipts" && fieldName === "last_error_code") {
      tables.meta_webhook_receipts[0].status = "failed";
      tables.meta_webhook_receipts[0].processed_at = null;
    }
    assert.throws(
      () => createPostgresMetaConnectionDataSnapshot(tables),
      (error) => (
        error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" &&
        error.table === tableName &&
        error.rowIndex === 0
      ),
    );
  }
});

test("rolls back when a connected tenant lacks an encrypted envelope", async () => {
  const fixture = createTargetFixture({ invalidLoadedState: true });

  await assert.rejects(
    executePostgresMetaConnectionDataMigration({
      plan: createPlan(),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }),
    (error) => (
      error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed"
    ),
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
});

test("reads the three current D1 Meta tables in one checked snapshot", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "Connect", "active", createdAt, createdAt, "meta-key");
    const source = rawTables();
    const connection = source.meta_connections[0];
    database.prepare(
      `INSERT INTO meta_connections (
         tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
         webhook_subscribed_at, connected_at, version, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(connection));
    const receipt = source.meta_webhook_receipts[0];
    database.prepare(
      `INSERT INTO meta_webhook_receipts (
         id, tenant_id, waba_id, event_key, object_type, status, attempt_count,
         last_error_code, received_at, processed_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(receipt));
    const envelope = source.meta_credential_envelopes[0];
    database.prepare(
      `INSERT INTO meta_credential_envelopes (
         tenant_id, key_version, initialization_vector, ciphertext,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(...Object.values(envelope));

    const snapshot = readD1MetaConnectionSnapshot(database);
    assert.equal(snapshot.tables.meta_connections.length, 1);
    assert.equal(snapshot.tables.meta_webhook_receipts.length, 1);
    assert.equal(snapshot.tables.meta_credential_envelopes.length, 1);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact three-table source contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => readD1MetaConnectionSnapshot(database),
      (error) => (
        error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "meta_connections"
      ),
    );
  } finally {
    database.close();
  }
});

test("limits the Meta rehearsal URL to its passwordless local database", () => {
  const valid =
    "postgresql://tal@127.0.0.1:55432/" +
    "connect_meta_connection_data_migration_rehearsal";
  assert.equal(requireLocalMetaConnectionDataMigrationUrl(valid), valid);

  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_meta_connection_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_meta_connection_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(
      () => requireLocalMetaConnectionDataMigrationUrl(unsafe),
      /POSTGRES_META_CONNECTION_DATA_URL_INVALID/,
    );
  }
});
