import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresAiKnowledgeRuntimeDataMigrationPlan,
  createPostgresAiKnowledgeRuntimeDataSnapshot,
  executePostgresAiKnowledgeRuntimeDataMigration,
} from "../server/platform/postgresAiKnowledgeRuntimeDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1AiKnowledgeRuntimeSnapshot,
} from "./read-d1-ai-knowledge-runtime-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_ai_knowledge_runtime_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 79).toString("base64");
const times = Object.freeze({
  created: "2026-08-20T08:00:00.000Z",
  inbound: "2026-08-20T08:05:00.000Z",
  published: "2026-08-20T08:10:00.000Z",
  changed: "2026-08-20T09:00:00.000Z",
  decided: "2026-08-20T09:05:00.000Z",
});
const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const secondConversationKey = `conversation_v1_${"2".repeat(64)}`;
const messageKey = `message_v1_${"3".repeat(64)}`;
const secondMessageKey = `message_v1_${"4".repeat(64)}`;

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function namespaced(prefix, value) {
  return `${prefix}${digest(JSON.stringify(value))}`;
}

function buildIdentity() {
  const tenantId = 1;
  const sourceContentDigest = digest("מסמך ידע לחזרת AI");
  const sourceKey = namespaced("knowledge_source_v1_", {
    namespace: "knowledge_source_v1", tenantId,
    contentSha256: sourceContentDigest,
  });
  const passageContent = "מידע תפעולי מאומת לשירות לקוחות";
  const passageDigest = digest(passageContent);
  const passageKey = namespaced("knowledge_passage_v1_", {
    namespace: "knowledge_passage_v1", tenantId, sourceKey,
    passageOrdinal: 1, contentSha256: passageDigest,
  });
  const name = "סוכן שירות מאומת";
  const agentKey = namespaced("ai_agent_v1_", {
    namespace: "ai_agent_v1", tenantId, name,
  });
  const definition = {
    name,
    systemPrompt: "ענה לפי ידע מאושר בלבד",
    handoffMessage: "הפנייה עוברת לנציג אנושי",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints: 8000,
    monthlyCostLimitMinorUnits: 10000,
    billingCurrency: "USD",
    knowledgeSourceKeys: [sourceKey],
  };
  const versionKey = namespaced("ai_agent_version_v1_", {
    namespace: "ai_agent_version_v1", tenantId, aiAgentKey: agentKey,
    version: 1, definition,
  });
  const turn = {
    tenantId, conversationKey, inboundMessageKey: messageKey,
    aiAgentVersionKey: versionKey,
  };
  const requestKey = namespaced("ai_provider_request_v1_", {
    namespace: "ai_provider_request_v1", ...turn,
  });
  const auditKey = namespaced("ai_runtime_audit_v1_", {
    namespace: "ai_runtime_audit_v1", ...turn,
  });
  const outboxKey = namespaced("ai_reply_outbox_v1_", {
    namespace: "ai_reply_outbox_v1", tenantId, requestKey,
  });
  return Object.freeze({
    agentKey, auditKey, definition, outboxKey, passageContent,
    passageDigest, passageKey, requestKey, sourceContentDigest, sourceKey,
    versionKey,
  });
}

const keys = buildIdentity();

function sourceTables() {
  return {
    ai_agents: [{
      ai_agent_key: keys.agentKey, tenant_id: 1, name: keys.definition.name,
      status: "active", latest_version_key: keys.versionKey,
      latest_version_number: 1, active_version_key: keys.versionKey,
      version: 2, created_at: times.created, updated_at: times.published,
    }],
    ai_agent_versions: [{
      ai_agent_version_key: keys.versionKey, ai_agent_key: keys.agentKey,
      tenant_id: 1, version_number: 1, status: "published",
      definition_json: JSON.stringify(keys.definition),
      published_at: times.published, created_at: times.created,
    }],
    knowledge_sources: [{
      source_key: keys.sourceKey, tenant_id: 1,
      content_sha256: keys.sourceContentDigest, file_name: "verified.txt",
      media_type: "text/plain", size_bytes: 4096,
      storage_object_key: `knowledge/v1/${keys.sourceKey}`, status: "ready",
      last_error_code: null, ready_at: times.published, version: 4,
      created_at: times.created, updated_at: times.published,
    }],
    knowledge_passages: [{
      passage_key: keys.passageKey, tenant_id: 1, source_key: keys.sourceKey,
      passage_ordinal: 1, content_sha256: keys.passageDigest,
      content: keys.passageContent, created_at: times.published,
    }],
    ai_agent_version_sources: [{
      tenant_id: 1, ai_agent_version_key: keys.versionKey,
      source_key: keys.sourceKey, created_at: times.published,
    }],
    ai_runtime_cost_authorizations: [{
      request_key: keys.requestKey, tenant_id: 1,
      ai_agent_key: keys.agentKey, period_start: "2026-08-01",
      monthly_limit_minor_units: 10000, currency: "USD",
      created_at: times.published,
    }],
    ai_runtime_usage: [{
      request_key: keys.requestKey, tenant_id: 1,
      ai_agent_key: keys.agentKey, period_start: "2026-08-01",
      input_tokens: 120, output_tokens: 30, cost_minor_units: 17,
      currency: "USD", within_limit: 1, created_at: times.published,
    }],
    ai_runtime_audit_events: [{
      audit_key: keys.auditKey, request_key: keys.requestKey, tenant_id: 1,
      conversation_key: conversationKey, inbound_message_key: messageKey,
      ai_agent_key: keys.agentKey, ai_agent_version_key: keys.versionKey,
      expected_conversation_version: 1, outcome: "reply-planned", reason: null,
      response_mode: "agent-approval", grounding_score_basis_points: 9000,
      input_tokens: 120, output_tokens: 30, cost_minor_units: 17,
      currency: "USD", created_at: times.published,
    }],
    ai_reply_outbox: [{
      outbox_key: keys.outboxKey, request_key: keys.requestKey,
      audit_key: keys.auditKey, tenant_id: 1,
      conversation_key: conversationKey, inbound_message_key: messageKey,
      ai_agent_key: keys.agentKey, ai_agent_version_key: keys.versionKey,
      expected_conversation_version: 1,
      recipient_phone_e164: "+972501111111",
      response_mode: "agent-approval", reply_text: "תשובת AI פרטית",
      grounded_source_keys_json: JSON.stringify([keys.sourceKey]),
      grounding_score_basis_points: 9000, status: "awaiting-approval",
      decided_by_external_user_id: null, decided_at: null, version: 1,
      created_at: times.published, updated_at: times.published,
    }],
  };
}

function fail(code) {
  throw new Error(`POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_${code}`);
}

export function requireLocalAiKnowledgeRuntimeDataMigrationUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail("URL_INVALID");
  }
  let url;
  try { url = new URL(value); } catch { fail("URL_INVALID"); }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` || url.password !== "" ||
    url.search !== "" || url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  for (const fileName of await migrationFiles(directory)) {
    database.exec((await readFile(join(directory, fileName), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) fail("DATABASE_NOT_EMPTY");
  const directory = join(projectRoot, "postgres", "migrations");
  for (const fileName of await migrationFiles(directory)) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
}

function seedD1Dependencies(database) {
  const tenant = database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (?, ?, 'active', ?, ?, ?)`,
  );
  tenant.run(1, "Primary AI rehearsal", times.created, times.created,
    "ai-runtime-primary");
  tenant.run(2, "Secondary AI rehearsal", times.created, times.created,
    "ai-runtime-secondary");
  const contact = database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'unsubscribed', 'unknown', 1, ?, ?)`,
  );
  contact.run(11, 1, "+972501111111", times.created, times.created);
  contact.run(21, 2, "+972502222222", times.created, times.created);
  const conversation = database.prepare(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES (?, ?, ?, 'bot_active', 1, 1, ?, ?)`,
  );
  conversation.run(conversationKey, 1, 11, times.created, times.inbound);
  conversation.run(secondConversationKey, 2, 21, times.created, times.inbound);
  const message = database.prepare(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'inbound', 'text', 'received', ?, ?, ?, ?, ?)`,
  );
  message.run(messageKey, conversationKey, 1, "wamid.ai.primary", "שירות",
    times.inbound, times.inbound, times.inbound, times.inbound);
  message.run(secondMessageKey, secondConversationKey, 2, "wamid.ai.secondary",
    "תמיכה", times.inbound, times.inbound, times.inbound, times.inbound);
}

function seedD1Slice(database) {
  for (const [tableName, rows] of Object.entries(sourceTables())) {
    const columns = Object.keys(rows[0]);
    database.prepare(
      `INSERT INTO ${tableName} (${columns.join(", ")})
       VALUES (${columns.map(() => "?").join(", ")})`,
    ).run(...columns.map((column) => rows[0][column]));
  }
}

async function seedPostgresDependencies(pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Primary AI rehearsal', 'active', $1, $1, 'ai-runtime-primary'),
       (2, 'Secondary AI rehearsal', 'active', $1, $1, 'ai-runtime-secondary')`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, mailing_status, consent_status,
       version, created_at, updated_at
     ) VALUES
       (11, 1, '+972501111111', 'unsubscribed', 'unknown', 1, $1, $1),
       (21, 2, '+972502222222', 'unsubscribed', 'unknown', 1, $1, $1)`,
    [times.created],
  );
  await pool.query(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES
       ($1, 1, 11, 'bot_active', 1, 1, $3, $4),
       ($2, 2, 21, 'bot_active', 1, 1, $3, $4)`,
    [conversationKey, secondConversationKey, times.created, times.inbound],
  );
  await pool.query(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES
       ($1, $3, 1, 'wamid.ai.primary', 'inbound', 'text', 'received',
        'שירות', $5, $5, $5, $5),
       ($2, $4, 2, 'wamid.ai.secondary', 'inbound', 'text', 'received',
        'תמיכה', $5, $5, $5, $5)`,
    [messageKey, secondMessageKey, conversationKey, secondConversationKey,
      times.inbound],
  );
}

async function captureOutcome(operation) {
  try { await operation(); return "accepted"; } catch { return "rejected"; }
}

async function compareOutcome(observations, name, d1Operation,
  postgresOperation, expected) {
  const d1Outcome = await captureOutcome(d1Operation);
  const postgresOutcome = await captureOutcome(postgresOperation);
  assert.equal(postgresOutcome, d1Outcome, `${name} diverged`);
  assert.equal(d1Outcome, expected, `${name} outcome was not ${expected}`);
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(observations, "approve-ai-reply", () =>
    database.prepare(
      `UPDATE ai_reply_outbox
       SET status = 'ready-for-delivery',
           decided_by_external_user_id = 'agent-1', decided_at = ?,
           version = 2, updated_at = ?
       WHERE tenant_id = 1 AND outbox_key = ?
         AND status = 'awaiting-approval' AND version = 1`,
    ).run(times.decided, times.decided, keys.outboxKey), () =>
    pool.query(
      `UPDATE ai_reply_outbox
       SET status = 'ready-for-delivery',
           decided_by_external_user_id = 'agent-1', decided_at = $1,
           version = 2, updated_at = $1
       WHERE tenant_id = 1 AND outbox_key = $2
         AND status = 'awaiting-approval' AND version = 1`,
      [times.decided, keys.outboxKey],
    ), "accepted");
  await compareOutcome(observations, "archive-ready-source", () =>
    database.prepare(
      `UPDATE knowledge_sources
       SET status = 'archived', version = 5, updated_at = ?
       WHERE tenant_id = 1 AND source_key = ? AND status = 'ready'`,
    ).run(times.changed, keys.sourceKey), () =>
    pool.query(
      `UPDATE knowledge_sources
       SET status = 'archived', version = 5, updated_at = $1
       WHERE tenant_id = 1 AND source_key = $2 AND status = 'ready'`,
      [times.changed, keys.sourceKey],
    ), "accepted");
  await compareOutcome(observations, "deactivate-agent", () =>
    database.prepare(
      `UPDATE ai_agents SET status = 'inactive', version = 3, updated_at = ?
       WHERE tenant_id = 1 AND ai_agent_key = ? AND version = 2`,
    ).run(times.changed, keys.agentKey), () =>
    pool.query(
      `UPDATE ai_agents SET status = 'inactive', version = 3, updated_at = $1
       WHERE tenant_id = 1 AND ai_agent_key = $2 AND version = 2`,
      [times.changed, keys.agentKey],
    ), "accepted");
  await compareOutcome(observations, "reactivate-agent", () =>
    database.prepare(
      `UPDATE ai_agents SET status = 'active', version = 4, updated_at = ?
       WHERE tenant_id = 1 AND ai_agent_key = ? AND version = 3`,
    ).run(times.decided, keys.agentKey), () =>
    pool.query(
      `UPDATE ai_agents SET status = 'active', version = 4, updated_at = $1
       WHERE tenant_id = 1 AND ai_agent_key = $2 AND version = 3`,
      [times.decided, keys.agentKey],
    ), "accepted");
  await compareOutcome(observations, "reject-duplicate-source-digest", () =>
    database.prepare(
      `INSERT INTO knowledge_sources (
         source_key, tenant_id, content_sha256, file_name, media_type,
         size_bytes, storage_object_key, status
       ) VALUES (?, 1, ?, 'duplicate.txt', 'text/plain', 1, ?,
                 'pending-validation')`,
    ).run(`knowledge_source_v1_${"d".repeat(64)}`,
      keys.sourceContentDigest, "knowledge/v1/duplicate"), () =>
    pool.query(
      `INSERT INTO knowledge_sources (
         source_key, tenant_id, content_sha256, file_name, media_type,
         size_bytes, storage_object_key, status
       ) VALUES ($1, 1, $2, 'duplicate.txt', 'text/plain', 1, $3,
                 'pending-validation')`,
      [`knowledge_source_v1_${"d".repeat(64)}`,
        keys.sourceContentDigest, "knowledge/v1/duplicate"],
    ), "rejected");
  await compareOutcome(observations, "reject-duplicate-passage-ordinal", () =>
    database.prepare(
      `INSERT INTO knowledge_passages (
         passage_key, tenant_id, source_key, passage_ordinal,
         content_sha256, content
       ) VALUES (?, 1, ?, 1, ?, 'duplicate')`,
    ).run(`knowledge_passage_v1_${"e".repeat(64)}`, keys.sourceKey,
      digest("duplicate")), () =>
    pool.query(
      `INSERT INTO knowledge_passages (
         passage_key, tenant_id, source_key, passage_ordinal,
         content_sha256, content
       ) VALUES ($1, 1, $2, 1, $3, 'duplicate')`,
      [`knowledge_passage_v1_${"e".repeat(64)}`, keys.sourceKey,
        digest("duplicate")],
    ), "rejected");
  await compareOutcome(observations, "reject-cross-tenant-agent-version", () =>
    database.prepare(
      `INSERT INTO ai_agent_versions (
         ai_agent_version_key, ai_agent_key, tenant_id, version_number,
         definition_json
       ) VALUES (?, ?, 2, 2, ?)`,
    ).run(`ai_agent_version_v1_${"f".repeat(64)}`, keys.agentKey,
      JSON.stringify(keys.definition)), () =>
    pool.query(
      `INSERT INTO ai_agent_versions (
         ai_agent_version_key, ai_agent_key, tenant_id, version_number,
         definition_json
       ) VALUES ($1, $2, 2, 2, $3::jsonb)`,
      [`ai_agent_version_v1_${"f".repeat(64)}`, keys.agentKey,
        JSON.stringify(keys.definition)],
    ), "rejected");
  const secondRequest = `ai_provider_request_v1_${"a".repeat(64)}`;
  await compareOutcome(observations, "create-cost-authorization", () =>
    database.prepare(
      `INSERT INTO ai_runtime_cost_authorizations (
         request_key, tenant_id, ai_agent_key, period_start,
         monthly_limit_minor_units, currency, created_at
       ) VALUES (?, 1, ?, '2026-08-01', 10000, 'USD', ?)`,
    ).run(secondRequest, keys.agentKey, times.decided), () =>
    pool.query(
      `INSERT INTO ai_runtime_cost_authorizations (
         request_key, tenant_id, ai_agent_key, period_start,
         monthly_limit_minor_units, currency, created_at
       ) VALUES ($1, 1, $2, '2026-08-01', 10000, 'USD', $3)`,
      [secondRequest, keys.agentKey, times.decided],
    ), "accepted");
  await compareOutcome(observations, "reject-usage-without-authorization", () =>
    database.prepare(
      `INSERT INTO ai_runtime_usage (
         request_key, tenant_id, ai_agent_key, period_start, input_tokens,
         output_tokens, cost_minor_units, currency, within_limit
       ) VALUES (?, 1, ?, '2026-08-01', 1, 1, 1, 'USD', 1)`,
    ).run(`ai_provider_request_v1_${"b".repeat(64)}`, keys.agentKey), () =>
    pool.query(
      `INSERT INTO ai_runtime_usage (
         request_key, tenant_id, ai_agent_key, period_start, input_tokens,
         output_tokens, cost_minor_units, currency, within_limit
       ) VALUES ($1, 1, $2, '2026-08-01', 1, 1, 1, 'USD', true)`,
      [`ai_provider_request_v1_${"b".repeat(64)}`, keys.agentKey],
    ), "rejected");
  return Object.freeze(observations);
}

async function requirePostgresIsolationAndShape(pool) {
  await assert.rejects(pool.query(
    `INSERT INTO ai_agent_version_sources (
       tenant_id, ai_agent_version_key, source_key
     ) VALUES (2, $1, $2)`,
    [keys.versionKey, keys.sourceKey],
  ), (error) => error?.code === "23503");
  await assert.rejects(pool.query(
    `UPDATE ai_runtime_usage SET within_limit = NULL
     WHERE tenant_id = 1 AND request_key = $1`,
    [keys.requestKey],
  ), (error) => error?.code === "23502");
}

function normalizePostgresValue(column, value) {
  if (value instanceof Date) return value.toISOString();
  if (column.kind === "boolean-integer" && typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value !== null && ["positive-integer", "nonnegative-integer"]
    .includes(column.kind)) return Number(value);
  return value;
}

async function compareFinalState(database, pool) {
  const d1Snapshot = readD1AiKnowledgeRuntimeSnapshot(database);
  const targetTables = {};
  for (const table of POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS) {
    const postgres = await pool.query(
      `SELECT ${table.columns.map(({ name, kind }) => (
        kind === "date" ? `${name}::text AS ${name}` : name
      )).join(", ")}
       FROM ${table.name} ORDER BY ${table.orderBy.join(", ")}`,
    );
    targetTables[table.name] = postgres.rows.map((row) =>
      Object.fromEntries(table.columns.map((column) => [
        column.name, normalizePostgresValue(column, row[column.name]),
      ])),
    );
  }
  const targetSnapshot = createPostgresAiKnowledgeRuntimeDataSnapshot(
    targetTables,
  );
  const evidence = [];
  for (const table of POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS) {
    const targetRows = targetSnapshot.tables[table.name];
    assert.deepEqual(targetRows, d1Snapshot.tables[table.name],
      `${table.name} final state diverged`);
    evidence.push(Object.freeze({
      table: table.name, rowCount: targetRows.length,
      digest: digest(JSON.stringify(targetRows)),
    }));
  }
  return Object.freeze(evidence);
}

export async function verifyPostgresAiKnowledgeRuntimeDataMigration(
  connectionString,
) {
  const checkedUrl = requireLocalAiKnowledgeRuntimeDataMigrationUrl(
    connectionString,
  );
  const { Pool } = pg;
  const pool = new Pool({ connectionString: checkedUrl, max: 2 });
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  try {
    await applyD1Migrations(database);
    await applyPostgresMigrations(pool);
    database.exec("BEGIN IMMEDIATE");
    try {
      seedD1Dependencies(database);
      seedD1Slice(database);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    await seedPostgresDependencies(pool);
    const snapshot = readD1AiKnowledgeRuntimeSnapshot(database);
    const plan = createPostgresAiKnowledgeRuntimeDataMigrationPlan({
      snapshot, createdAt: "2026-08-20T10:00:00.000Z",
      expiresAt: "2026-08-20T10:15:00.000Z", evidenceHmacKey,
    });
    const transactions = createNodePostgresTransactionManager(pool);
    const migrationEvidence = await executePostgresAiKnowledgeRuntimeDataMigration({
      plan, transactions, evidenceHmacKey, now: "2026-08-20T10:05:00.000Z",
    });
    assert.equal(migrationEvidence.tableCount, 9);
    assert.equal(migrationEvidence.totalRowCount, 9);
    assert.equal(migrationEvidence.tables.every(
      ({ sourceDigest, targetDigest }) => sourceDigest === targetDigest), true);
    assert.doesNotMatch(JSON.stringify(migrationEvidence),
      /ענה לפי|מידע תפעולי|תשובת AI|verified\.txt|972501|10000|wamid/);
    await requirePostgresIsolationAndShape(pool);
    const semanticObservations = await runSemanticParityScenarios(database, pool);
    const finalState = await compareFinalState(database, pool);
    await assert.rejects(executePostgresAiKnowledgeRuntimeDataMigration({
      plan, transactions, evidenceHmacKey, now: "2026-08-20T10:06:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-not-empty");
    return Object.freeze({
      d1MigrationCount: (await migrationFiles(join(projectRoot, "drizzle"))).length,
      postgresMigrationCount: (await migrationFiles(
        join(projectRoot, "postgres", "migrations"))).length,
      tableCount: migrationEvidence.tableCount,
      rowCount: migrationEvidence.totalRowCount,
      replayRejected: true,
      tenantIsolationVerified: true,
      aiPayloadPrivate: true,
      semanticScenarioCount: semanticObservations.length,
      semanticScenarioDigest: digest(JSON.stringify(semanticObservations)),
      semanticStateDigest: digest(JSON.stringify(finalState)),
    });
  } finally {
    database.close();
    await pool.end();
  }
}

async function main() {
  const connectionString = process.env[environmentKey];
  if (!connectionString) fail("URL_MISSING");
  const result = await verifyPostgresAiKnowledgeRuntimeDataMigration(
    connectionString,
  );
  process.stdout.write(
    `PostgreSQL AI/knowledge runtime data rehearsal: PASS (` +
    `${result.d1MigrationCount} D1 migrations, ` +
    `${result.postgresMigrationCount} PostgreSQL migrations, ` +
    `${result.tableCount} tables, ${result.rowCount} rows, replay rejected, ` +
    `tenant isolation verified, AI payload private, ` +
    `${result.semanticScenarioCount} parity scenarios)\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
