import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  createPostgresAiKnowledgeRuntimeDataMigrationPlan,
  createPostgresAiKnowledgeRuntimeDataSnapshot,
  executePostgresAiKnowledgeRuntimeDataMigration,
} from "../server/platform/postgresAiKnowledgeRuntimeDataMigration.ts";
import {
  D1DataMigrationSnapshotError,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  readD1AiKnowledgeRuntimeSnapshot,
} from "../scripts/read-d1-ai-knowledge-runtime-snapshot.mjs";
import {
  requireLocalAiKnowledgeRuntimeDataMigrationUrl,
} from "../scripts/verify-postgres-ai-knowledge-runtime-data-migration.mjs";

const evidenceHmacKey = Buffer.alloc(32, 73).toString("base64");
const createdAt = "2026-08-20T08:00:00.000Z";
const changedAt = "2026-08-20T08:05:00.000Z";
const conversationKey = `conversation_v1_${"1".repeat(64)}`;
const messageKey = `message_v1_${"2".repeat(64)}`;

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function namespaced(prefix, value) {
  return `${prefix}${digest(JSON.stringify(value))}`;
}

function identities() {
  const tenantId = 1;
  const sourceContentDigest = digest("מסמך מקור פרטי");
  const sourceKey = namespaced("knowledge_source_v1_", {
    namespace: "knowledge_source_v1", tenantId,
    contentSha256: sourceContentDigest,
  });
  const passageContent = "תוכן ידע פרטי ומאומת";
  const passageDigest = digest(passageContent);
  const passageKey = namespaced("knowledge_passage_v1_", {
    namespace: "knowledge_passage_v1", tenantId, sourceKey,
    passageOrdinal: 1, contentSha256: passageDigest,
  });
  const name = "סוכן שירות";
  const agentKey = namespaced("ai_agent_v1_", {
    namespace: "ai_agent_v1", tenantId, name,
  });
  const definition = {
    name,
    systemPrompt: "ענה רק לפי מקורות מאושרים",
    handoffMessage: "הפנייה מועברת לנציג",
    responseMode: "automatic",
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
  return {
    agentKey, auditKey, definition, outboxKey, passageContent,
    passageDigest, passageKey, requestKey, sourceContentDigest, sourceKey,
    versionKey,
  };
}

function rawTables() {
  const keys = identities();
  return {
    ai_agents: [{
      ai_agent_key: keys.agentKey, tenant_id: 1, name: keys.definition.name,
      status: "active", latest_version_key: keys.versionKey,
      latest_version_number: 1, active_version_key: keys.versionKey,
      version: 2, created_at: createdAt, updated_at: changedAt,
    }],
    ai_agent_versions: [{
      ai_agent_version_key: keys.versionKey, ai_agent_key: keys.agentKey,
      tenant_id: 1, version_number: 1, status: "published",
      definition_json: JSON.stringify(keys.definition),
      published_at: changedAt, created_at: createdAt,
    }],
    knowledge_sources: [{
      source_key: keys.sourceKey, tenant_id: 1,
      content_sha256: keys.sourceContentDigest, file_name: "knowledge.txt",
      media_type: "text/plain", size_bytes: 2048,
      storage_object_key: `knowledge/v1/${keys.sourceKey}`, status: "ready",
      last_error_code: null, ready_at: changedAt, version: 4,
      created_at: createdAt, updated_at: changedAt,
    }],
    knowledge_passages: [{
      passage_key: keys.passageKey, tenant_id: 1, source_key: keys.sourceKey,
      passage_ordinal: 1, content_sha256: keys.passageDigest,
      content: keys.passageContent, created_at: changedAt,
    }],
    ai_agent_version_sources: [{
      tenant_id: 1, ai_agent_version_key: keys.versionKey,
      source_key: keys.sourceKey, created_at: changedAt,
    }],
    ai_runtime_cost_authorizations: [{
      request_key: keys.requestKey, tenant_id: 1,
      ai_agent_key: keys.agentKey, period_start: "2026-08-01",
      monthly_limit_minor_units: 10000, currency: "USD",
      created_at: changedAt,
    }],
    ai_runtime_usage: [{
      request_key: keys.requestKey, tenant_id: 1,
      ai_agent_key: keys.agentKey, period_start: "2026-08-01",
      input_tokens: 120, output_tokens: 30, cost_minor_units: 17,
      currency: "USD", within_limit: 1, created_at: changedAt,
    }],
    ai_runtime_audit_events: [{
      audit_key: keys.auditKey, request_key: keys.requestKey, tenant_id: 1,
      conversation_key: conversationKey, inbound_message_key: messageKey,
      ai_agent_key: keys.agentKey, ai_agent_version_key: keys.versionKey,
      expected_conversation_version: 1, outcome: "reply-planned", reason: null,
      response_mode: "automatic", grounding_score_basis_points: 9000,
      input_tokens: 120, output_tokens: 30, cost_minor_units: 17,
      currency: "USD", created_at: changedAt,
    }],
    ai_reply_outbox: [{
      outbox_key: keys.outboxKey, request_key: keys.requestKey,
      audit_key: keys.auditKey, tenant_id: 1,
      conversation_key: conversationKey, inbound_message_key: messageKey,
      ai_agent_key: keys.agentKey, ai_agent_version_key: keys.versionKey,
      expected_conversation_version: 1,
      recipient_phone_e164: "+972501234567", response_mode: "automatic",
      reply_text: "תשובה פרטית שנוצרה", grounded_source_keys_json:
        JSON.stringify([keys.sourceKey]), grounding_score_basis_points: 9000,
      status: "ready-for-delivery", decided_by_external_user_id: null,
      decided_at: null, version: 1, created_at: changedAt,
      updated_at: changedAt,
    }],
  };
}

function createPlan(tables = rawTables()) {
  return createPostgresAiKnowledgeRuntimeDataMigrationPlan({
    snapshot: createPostgresAiKnowledgeRuntimeDataSnapshot(tables),
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-08-20T10:15:00.000Z",
    evidenceHmacKey,
  });
}

function tableNameFromTargetRead(sql) {
  return /^SELECT[\s\S]+?FROM\s+([a-z_]+)\s+ORDER BY/i.exec(sql)?.[1] ?? null;
}

function createTargetFixture({ invalidVerificationIndex = 0 } = {}) {
  const tables = createPlan().payload.tables;
  let verificationIndex = 0;
  let committed = false;
  let rolledBack = false;
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      try {
        const result = await execute({
          async query(sql) {
            if (/^SELECT count\(\*\)::bigint AS count/i.test(sql)) {
              return { rows: [{ count: "0" }], rowCount: 1 };
            }
            const insert = /^INSERT INTO ([a-z_]+)/i.exec(sql);
            if (insert) {
              return { rows: [], rowCount: tables[insert[1]].length };
            }
            if (/^\s*SELECT 1\s+FROM /i.test(sql)) {
              verificationIndex += 1;
              return verificationIndex === invalidVerificationIndex
                ? { rows: [{ invalid: 1 }], rowCount: 1 }
                : { rows: [], rowCount: 0 };
            }
            const tableName = tableNameFromTargetRead(sql);
            if (tableName) {
              const rows = tableName === "ai_runtime_usage"
                ? tables[tableName].map((row) => ({ ...row, within_limit: true }))
                : tables[tableName];
              return { rows, rowCount: rows.length };
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
    manager,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
  };
}

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    database.exec(readFileSync(`drizzle/${fileName}`, "utf8")
      .replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("builds privacy-safe evidence for all nine AI runtime tables", async () => {
  const plan = createPlan();
  const fixture = createTargetFixture();
  const evidence = await executePostgresAiKnowledgeRuntimeDataMigration({
    plan, transactions: fixture.manager, evidenceHmacKey,
    now: "2026-08-20T10:05:00.000Z",
  });
  const publicArtifacts = JSON.stringify({ manifest: plan.manifest, evidence });
  assert.equal(evidence.tableCount, 9);
  assert.equal(evidence.totalRowCount, 9);
  assert.equal(fixture.committed, true);
  assert.match(plan.planId,
    /^connect_postgres_ai_knowledge_runtime_data_v1_[0-9a-f]{64}$/);
  assert.doesNotMatch(publicArtifacts,
    /ענה רק|תוכן ידע|תשובה פרטית|knowledge\.txt|972501234567|10000|wamid/);
});

test("rejects noncanonical identities, content and lifecycle", () => {
  const cases = [
    ["ai_agents", "ai_agent_key", `ai_agent_v1_${"0".repeat(64)}`],
    ["knowledge_sources", "storage_object_key", "knowledge/v1/wrong"],
    ["knowledge_passages", "content_sha256", "0".repeat(64)],
    ["ai_runtime_usage", "within_limit", 2],
    ["ai_runtime_audit_events", "request_key",
      `ai_provider_request_v1_${"0".repeat(64)}`],
    ["ai_reply_outbox", "grounded_source_keys_json", JSON.stringify([])],
  ];
  for (const [tableName, fieldName, value] of cases) {
    const tables = rawTables();
    tables[tableName][0][fieldName] = value;
    assert.throws(() => createPostgresAiKnowledgeRuntimeDataSnapshot(tables),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "row-invalid" && error.table === tableName &&
        error.rowIndex === 0);
  }
});

test("rolls back for broken projection, cost and outbox lineage", async () => {
  for (const invalidVerificationIndex of [1, 4, 6]) {
    const fixture = createTargetFixture({ invalidVerificationIndex });
    await assert.rejects(executePostgresAiKnowledgeRuntimeDataMigration({
      plan: createPlan(), transactions: fixture.manager, evidenceHmacKey,
      now: "2026-08-20T10:05:00.000Z",
    }), (error) => error instanceof PostgresDataMigrationError &&
      error.code === "target-verification-failed");
    assert.equal(fixture.committed, false);
    assert.equal(fixture.rolledBack, true);
  }
});

test("reads all nine current D1 AI runtime tables atomically", () => {
  const database = createCurrentD1Database();
  try {
    database.prepare(
      `INSERT INTO tenants (
         id, display_name, status, created_at, updated_at, provisioning_key
       ) VALUES (1, 'Connect', 'active', ?, ?, 'ai-runtime-test')`,
    ).run(createdAt, createdAt);
    database.prepare(
      `INSERT INTO contacts (
         id, tenant_id, phone_e164, mailing_status, consent_status,
         version, created_at, updated_at
       ) VALUES (1, 1, '+972501234567', 'unsubscribed', 'unknown', 1, ?, ?)`,
    ).run(createdAt, createdAt);
    database.prepare(
      `INSERT INTO conversations (
         conversation_key, tenant_id, contact_id, status, unread_count,
         version, created_at, updated_at
       ) VALUES (?, 1, 1, 'bot_active', 1, 1, ?, ?)`,
    ).run(conversationKey, createdAt, changedAt);
    database.prepare(
      `INSERT INTO messages (
         message_key, conversation_key, tenant_id, provider_message_id,
         direction, content_kind, status, text_content, occurred_at,
         status_updated_at, created_at, updated_at
       ) VALUES (?, ?, 1, 'wamid.ai.test', 'inbound', 'text', 'received',
                 'שירות', ?, ?, ?, ?)`,
    ).run(messageKey, conversationKey, changedAt, changedAt, changedAt,
      changedAt);
    const tables = rawTables();
    for (const [tableName, rows] of Object.entries(tables)) {
      const columns = Object.keys(rows[0]);
      database.prepare(
        `INSERT INTO ${tableName} (${columns.join(", ")})
         VALUES (${columns.map(() => "?").join(", ")})`,
      ).run(...columns.map((column) => rows[0][column]));
    }
    const snapshot = readD1AiKnowledgeRuntimeSnapshot(database);
    assert.equal(Object.keys(snapshot.tables).length, 9);
    assert.equal(Object.values(snapshot.tables).every((rows) => rows.length === 1),
      true);
  } finally {
    database.close();
  }
});

test("rejects a D1 schema outside the exact AI runtime contract", () => {
  const database = new DatabaseSync(":memory:");
  try {
    assert.throws(() => readD1AiKnowledgeRuntimeSnapshot(database),
      (error) => error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" && error.table === "ai_agents");
  } finally {
    database.close();
  }
});

test("limits the AI rehearsal URL to its passwordless local database", () => {
  const valid = "postgresql://tal@127.0.0.1:55432/" +
    "connect_ai_knowledge_runtime_data_migration_rehearsal";
  assert.equal(requireLocalAiKnowledgeRuntimeDataMigrationUrl(valid), valid);
  for (const unsafe of [
    "postgresql://tal:secret@127.0.0.1:55432/" +
      "connect_ai_knowledge_runtime_data_migration_rehearsal",
    "postgresql://tal@database.example.com:55432/" +
      "connect_ai_knowledge_runtime_data_migration_rehearsal",
    "postgresql://tal@127.0.0.1:55432/connect",
    valid + "?ssl=true",
  ]) {
    assert.throws(() => requireLocalAiKnowledgeRuntimeDataMigrationUrl(unsafe),
      /POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_URL_INVALID/);
  }
});
