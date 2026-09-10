import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import {
  createBusinessProfileRepository,
} from "../db/businessProfileRepository.ts";
import {
  createContactConsentRepository,
} from "../db/contactConsentRepository.ts";
import {
  createContactRepository,
} from "../db/contactRepository.ts";
import {
  createTenantMembershipRepository,
} from "../db/tenantMembershipRepository.ts";
import {
  createTenantSelectionRepository,
} from "../db/tenantSelectionRepository.ts";
import {
  deriveContactConsentEventKey,
} from "../server/contacts/contactConsentEventKey.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createPostgresBusinessProfileRepository,
} from "../server/platform/postgresBusinessProfileRepository.ts";
import {
  createPostgresContactConsentRepository,
} from "../server/platform/postgresContactConsentRepository.ts";
import {
  createPostgresContactReadRepository,
} from "../server/platform/postgresContactReadRepository.ts";
import {
  createPostgresCoreDataMigrationPlan,
  executePostgresCoreDataMigration,
} from "../server/platform/postgresCoreDataMigration.ts";
import {
  createPostgresTenantMembershipRepository,
} from "../server/platform/postgresTenantMembershipRepository.ts";
import {
  createPostgresTenantSelectionRepository,
} from "../server/platform/postgresTenantSelectionRepository.ts";
import {
  readD1CoreDataSnapshot,
} from "./read-d1-core-data-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_core_semantic_parity";
const environmentKey = "CONNECT_POSTGRES_CORE_PARITY_URL";
const fixtureTimestamp = "2026-08-19T08:00:00.000Z";
const evidenceHmacKey = Buffer.alloc(32, 19).toString("base64");

function fail(code) {
  throw new Error(`POSTGRES_CORE_SEMANTIC_PARITY_${code}`);
}

export function requireLocalCoreParityUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail("URL_INVALID");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_INVALID");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    fail("URL_INVALID");
  }

  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }

  return url.toString();
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
      meta: { changes: Number(result.changes) },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database.prepare(sql));
  }

  async batch(statements) {
    const results = [];
    this.database.exec("BEGIN IMMEDIATE");

    try {
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

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  for (const fileName of await migrationFiles(directory)) {
    database.exec(
      (await readFile(join(directory, fileName), "utf8"))
        .replaceAll("--> statement-breakpoint", ""),
    );
  }
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) {
    fail("DATABASE_NOT_EMPTY");
  }

  const directory = join(projectRoot, "postgres", "migrations");
  for (const fileName of await migrationFiles(directory)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
}

function seedD1(database) {
  database.exec(`
    INSERT INTO tenants (
      id, display_name, status, created_at, updated_at, provisioning_key
    ) VALUES
      (1, 'Parity Alpha', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 'parity-alpha'),
      (2, 'Parity Beta', 'trial', '${fixtureTimestamp}', '${fixtureTimestamp}', 'parity-beta'),
      (3, 'Parity Suspended', 'suspended', '${fixtureTimestamp}', '${fixtureTimestamp}', 'parity-suspended');

    INSERT INTO tenant_memberships (
      id, tenant_id, external_user_id, role, status,
      created_at, updated_at, version
    ) VALUES
      (1, 1, 'parity-user', 'owner', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (2, 1, 'manager-user', 'manager', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (3, 1, 'agent-user', 'agent', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (4, 1, 'viewer-user', 'viewer', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (5, 2, 'parity-user', 'manager', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (6, 3, 'parity-user', 'viewer', 'active', '${fixtureTimestamp}', '${fixtureTimestamp}', 1),
      (7, 2, 'inactive-user', 'agent', 'suspended', '${fixtureTimestamp}', '${fixtureTimestamp}', 2);

    INSERT INTO contacts (
      id, tenant_id, phone_e164, first_name, last_name, email, company,
      mailing_status, consent_status, consent_source, consent_recorded_at,
      consent_withdrawn_at, consent_evidence_reference, version,
      created_at, updated_at
    ) VALUES
      (1, 1, '+972501111111', 'Core', NULL, NULL, 'Connect',
       'unsubscribed', 'unknown', NULL, NULL, NULL, NULL, 1,
       '${fixtureTimestamp}', '${fixtureTimestamp}'),
      (2, 1, '+972502222222', 'Granted', 'Contact', NULL, NULL,
       'subscribed', 'granted', 'documented-opt-in', '${fixtureTimestamp}',
       NULL, 'parity-evidence-existing', 1, '${fixtureTimestamp}', '${fixtureTimestamp}'),
      (3, 2, '+972503333333', 'Other', 'Tenant', NULL, NULL,
       'unsubscribed', 'unknown', NULL, NULL, NULL, NULL, 1,
       '${fixtureTimestamp}', '${fixtureTimestamp}');

    INSERT INTO audit_logs (
      id, tenant_id, actor_external_user_id, action, target_type,
      target_id, metadata_json, created_at, idempotency_key
    ) VALUES (
      1, 1, 'parity-user', 'parity.seeded', 'tenant', '1',
      '{"source":"core-semantic-parity"}', '${fixtureTimestamp}',
      'core-semantic-parity-seed'
    );
  `);
}

function omitRuntimeTimestamps(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(omitRuntimeTimestamps);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
      .map(([key, entry]) => [key, omitRuntimeTimestamps(entry)]),
  );
}

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

async function compareScenario(observations, name, d1Operation, pgOperation) {
  const [d1Result, postgresResult] = await Promise.all([
    d1Operation(),
    pgOperation(),
  ]);
  const normalizedD1 = omitRuntimeTimestamps(d1Result);
  const normalizedPostgres = omitRuntimeTimestamps(postgresResult);
  assert.deepEqual(normalizedPostgres, normalizedD1, `${name} diverged`);
  observations.push(Object.freeze({ name, result: normalizedD1 }));
}

async function compareRejectedScenario(
  observations,
  name,
  d1Operation,
  pgOperation,
) {
  const capture = async (operation) => {
    try {
      await operation();
      return "accepted";
    } catch {
      return "rejected";
    }
  };
  const [d1Result, postgresResult] = await Promise.all([
    capture(d1Operation),
    capture(pgOperation),
  ]);
  assert.equal(postgresResult, d1Result, `${name} rejection diverged`);
  assert.equal(d1Result, "rejected", `${name} must be rejected`);
  observations.push(Object.freeze({ name, result: d1Result }));
}

function repositories(d1, pool) {
  const transactions = createNodePostgresTransactionManager(pool);
  return Object.freeze({
    d1: Object.freeze({
      memberships: createTenantMembershipRepository(d1),
      selections: createTenantSelectionRepository(d1),
      profiles: createBusinessProfileRepository(d1),
      contacts: createContactRepository(d1),
      consents: createContactConsentRepository(d1),
    }),
    postgres: Object.freeze({
      memberships: createPostgresTenantMembershipRepository(pool),
      selections: createPostgresTenantSelectionRepository({
        queries: pool,
        transactions,
      }),
      profiles: createPostgresBusinessProfileRepository({
        queries: pool,
        transactions,
      }),
      contacts: createPostgresContactReadRepository(pool),
      consents: createPostgresContactConsentRepository({ transactions }),
    }),
  });
}

async function runScenarios(d1, postgres) {
  const observations = [];
  await compareScenario(
    observations,
    "memberships-by-user",
    () => d1.memberships.findActiveByExternalUserId("parity-user"),
    () => postgres.memberships.findActiveByExternalUserId("parity-user"),
  );
  await compareScenario(
    observations,
    "memberships-by-tenant-role-order",
    () => d1.memberships.findActiveByTenantId(1),
    () => postgres.memberships.findActiveByTenantId(1),
  );

  const createSelection = {
    externalUserId: "parity-user",
    tenantId: 1,
    expectedVersion: 0,
  };
  await compareScenario(
    observations,
    "selection-create",
    () => d1.selections.save(createSelection),
    () => postgres.selections.save(createSelection),
  );
  await compareScenario(
    observations,
    "selection-idempotent-replay",
    () => d1.selections.save(createSelection),
    () => postgres.selections.save(createSelection),
  );
  const updateSelection = {
    externalUserId: "parity-user",
    tenantId: 2,
    expectedVersion: 1,
  };
  await compareScenario(
    observations,
    "selection-update",
    () => d1.selections.save(updateSelection),
    () => postgres.selections.save(updateSelection),
  );
  const staleSelection = {
    externalUserId: "parity-user",
    tenantId: 1,
    expectedVersion: 1,
  };
  await compareScenario(
    observations,
    "selection-stale-conflict",
    () => d1.selections.save(staleSelection),
    () => postgres.selections.save(staleSelection),
  );
  const ineligibleSelection = {
    externalUserId: "parity-user",
    tenantId: 3,
    expectedVersion: 2,
  };
  await compareScenario(
    observations,
    "selection-ineligible-tenant",
    () => d1.selections.save(ineligibleSelection),
    () => postgres.selections.save(ineligibleSelection),
  );

  const initialProfile = {
    tenantId: 1,
    businessName: "  Connect Core  ",
    timezone: "  Asia/Jerusalem  ",
    interfaceLanguage: "he",
  };
  await Promise.all([
    d1.profiles.save(initialProfile),
    postgres.profiles.save(initialProfile),
  ]);
  await compareScenario(
    observations,
    "profile-create",
    () => d1.profiles.findByTenantId(1),
    () => postgres.profiles.findByTenantId(1),
  );
  await Promise.all([
    d1.profiles.save(initialProfile),
    postgres.profiles.save(initialProfile),
  ]);
  await compareScenario(
    observations,
    "profile-idempotent-version",
    () => d1.profiles.findByTenantId(1),
    () => postgres.profiles.findByTenantId(1),
  );
  const updatedProfile = {
    tenantId: 1,
    businessName: "Connect Core Updated",
    timezone: "UTC",
    interfaceLanguage: "en",
  };
  await Promise.all([
    d1.profiles.save(updatedProfile),
    postgres.profiles.save(updatedProfile),
  ]);
  await compareScenario(
    observations,
    "profile-update",
    () => d1.profiles.findByTenantId(1),
    () => postgres.profiles.findByTenantId(1),
  );

  await compareScenario(
    observations,
    "contact-by-id",
    () => d1.contacts.findByTenantAndId(1, 2),
    () => postgres.contacts.findByTenantAndId(1, 2),
  );
  await compareScenario(
    observations,
    "contact-cross-tenant-isolation",
    () => d1.contacts.findByTenantAndId(1, 3),
    () => postgres.contacts.findByTenantAndId(1, 3),
  );
  await compareScenario(
    observations,
    "contact-page-order",
    () => d1.contacts.listPageByTenant(1, null, 2),
    () => postgres.contacts.listPageByTenant(1, null, 2),
  );
  await compareScenario(
    observations,
    "contact-page-cursor",
    () => d1.contacts.listPageByTenant(1, 2, 2),
    () => postgres.contacts.listPageByTenant(1, 2, 2),
  );

  const consentIdentity = {
    tenantId: 1,
    contactId: 1,
    eventType: "granted",
    source: "documented-opt-in",
    occurredAt: "2026-08-20T09:00:00.000Z",
    evidenceReference: "parity-consent-grant",
    actorExternalUserId: "parity-user",
  };
  const consentGrant = {
    ...consentIdentity,
    idempotencyKey: await deriveContactConsentEventKey(consentIdentity),
  };
  await compareScenario(
    observations,
    "consent-grant",
    () => d1.consents.recordEvent(consentGrant),
    () => postgres.consents.recordEvent(consentGrant),
  );
  await compareScenario(
    observations,
    "consent-idempotent-replay",
    () => d1.consents.recordEvent(consentGrant),
    () => postgres.consents.recordEvent(consentGrant),
  );

  const olderIdentity = {
    ...consentIdentity,
    eventType: "unsubscribed",
    occurredAt: "2026-08-19T09:00:00.000Z",
    evidenceReference: "parity-consent-older",
  };
  const olderConsent = {
    ...olderIdentity,
    idempotencyKey: await deriveContactConsentEventKey(olderIdentity),
  };
  await compareScenario(
    observations,
    "consent-older-event-does-not-win",
    () => d1.consents.recordEvent(olderConsent),
    () => postgres.consents.recordEvent(olderConsent),
  );

  const newerIdentity = {
    ...olderIdentity,
    occurredAt: "2026-08-21T09:00:00.000Z",
    evidenceReference: "parity-consent-newer",
  };
  const newerConsent = {
    ...newerIdentity,
    idempotencyKey: await deriveContactConsentEventKey(newerIdentity),
  };
  await compareScenario(
    observations,
    "consent-newer-event-wins",
    () => d1.consents.recordEvent(newerConsent),
    () => postgres.consents.recordEvent(newerConsent),
  );
  await compareRejectedScenario(
    observations,
    "consent-idempotency-conflict",
    () => d1.consents.recordEvent({
      ...consentGrant,
      evidenceReference: "different-evidence",
    }),
    () => postgres.consents.recordEvent({
      ...consentGrant,
      evidenceReference: "different-evidence",
    }),
  );

  return Object.freeze(observations);
}

const stateQueries = Object.freeze([
  Object.freeze({
    table: "tenants",
    sql: `SELECT id, display_name, status, provisioning_key FROM tenants ORDER BY id`,
  }),
  Object.freeze({
    table: "tenant_memberships",
    sql: `SELECT id, tenant_id, external_user_id, role, status, version FROM tenant_memberships ORDER BY id`,
  }),
  Object.freeze({
    table: "tenant_selections",
    sql: `SELECT external_user_id, tenant_id, version FROM tenant_selections ORDER BY external_user_id`,
  }),
  Object.freeze({
    table: "business_profiles",
    sql: `SELECT tenant_id, business_name, timezone, interface_language, version FROM business_profiles ORDER BY tenant_id`,
  }),
  Object.freeze({
    table: "contacts",
    sql: `SELECT id, tenant_id, phone_e164, first_name, last_name, email, company,
                 mailing_status, consent_status, consent_source, consent_recorded_at,
                 consent_withdrawn_at, consent_evidence_reference, version
          FROM contacts ORDER BY id`,
  }),
  Object.freeze({
    table: "contact_consent_events",
    sql: `SELECT id, tenant_id, contact_id, event_type, source, occurred_at,
                 evidence_reference, actor_external_user_id, idempotency_key
          FROM contact_consent_events ORDER BY id`,
  }),
  Object.freeze({
    table: "audit_logs",
    sql: `SELECT id, tenant_id, actor_external_user_id, action, target_type,
                 target_id, metadata_json, idempotency_key
          FROM audit_logs ORDER BY id`,
  }),
]);

function normalizeSqliteStateRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      key === "metadata_json" && typeof value === "string"
        ? canonicalize(JSON.parse(value))
        : canonicalize(value),
    ]),
  ));
}

const numericStateColumns = new Set([
  "contact_id",
  "id",
  "tenant_id",
  "version",
]);

function normalizePostgresStateRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date
        ? value.toISOString()
        : key === "metadata_json"
          ? canonicalize(value)
        : numericStateColumns.has(key) && typeof value === "string"
          ? Number(value)
          : value,
    ]),
  ));
}

async function compareFinalState(sqlite, pool) {
  const tables = [];
  for (const contract of stateQueries) {
    const d1Rows = normalizeSqliteStateRows(
      sqlite.prepare(contract.sql).all(),
    );
    const postgresRows = normalizePostgresStateRows(
      (await pool.query(contract.sql)).rows,
    );
    assert.deepEqual(
      postgresRows,
      d1Rows,
      `${contract.table} final state diverged`,
    );
    tables.push(Object.freeze({
      table: contract.table,
      rowCount: d1Rows.length,
      digest: digest(d1Rows),
    }));
  }
  return Object.freeze(tables);
}

export async function verifyPostgresCoreSemanticParity(connectionString) {
  const checkedUrl = requireLocalCoreParityUrl(connectionString);
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 3,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  try {
    const identity = await pool.query(
      `SELECT current_database() AS database,
              current_setting('server_version') AS version`,
    );
    assert.equal(identity.rows[0]?.database, databaseName);
    assert.match(identity.rows[0]?.version, /^16\./);

    await applyD1Migrations(sqlite);
    seedD1(sqlite);
    await applyPostgresMigrations(pool);

    const snapshot = readD1CoreDataSnapshot(sqlite);
    const plan = createPostgresCoreDataMigrationPlan({
      snapshot,
      createdAt: fixtureTimestamp,
      expiresAt: "2026-08-19T08:15:00.000Z",
      evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    await executePostgresCoreDataMigration({
      plan,
      transactions,
      evidenceHmacKey,
      now: "2026-08-19T08:05:00.000Z",
    });

    const parityRepositories = repositories(
      new SqliteD1Database(sqlite),
      pool,
    );
    const observations = await runScenarios(
      parityRepositories.d1,
      parityRepositories.postgres,
    );
    const tables = await compareFinalState(sqlite, pool);

    return Object.freeze({
      status: "passed",
      contractVersion: "connect_core_semantic_parity_v1",
      scenarioCount: observations.length,
      scenarioDigest: digest(observations),
      tableCount: tables.length,
      totalRowCount: tables.reduce((sum, table) => sum + table.rowCount, 0),
      stateDigest: digest(tables),
      tables,
    });
  } finally {
    sqlite.close();
    await pool.end();
  }
}

async function main() {
  const result = await verifyPostgresCoreSemanticParity(
    process.env[environmentKey],
  );
  process.stdout.write(
    `PostgreSQL core semantic parity: PASS (${result.scenarioCount} scenarios, ${result.tableCount} tables, ${result.totalRowCount} rows, scenario ${result.scenarioDigest}, state ${result.stateDigest})\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
