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
  AiReplyOutboxIdentityConflictError,
  createAiReplyOutboxRepository,
} from "../db/aiReplyOutboxRepository.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../server/ai/aiRuntimeKey.ts";

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

async function applyMigrations(database) {
  const directory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const files = (await readdir(directory))
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  for (const fileName of files) {
    const migration = await readFile(
      new URL(fileName, directory),
      "utf8",
    );

    for (const statement of migration.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }
}

async function createFixture(
  responseMode = "agent-approval",
) {
  const tenantId = 1;
  const conversationKey =
    `conversation_v1_${"1".repeat(64)}`;
  const inboundMessageKey =
    `message_v1_${"2".repeat(64)}`;
  const laterMessageKey =
    `message_v1_${"3".repeat(64)}`;
  const contentSha256 = "4".repeat(64);
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      contentSha256,
    );
  const definition = {
    name: "סוכן אישורי שירות",
    systemPrompt:
      "יש לענות רק לפי מקור מאושר.",
    handoffMessage:
      "השיחה עוברת לנציג.",
    responseMode,
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 1_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
  };
  const aiAgentKey = await deriveAiAgentKey(
    tenantId,
    definition.name,
  );
  const aiAgentVersionKey =
    await deriveAiAgentVersionKey(
      tenantId,
      aiAgentKey,
      1,
      definition,
    );
  const identity = {
    conversationKey,
    inboundMessageKey,
    aiAgentVersionKey,
  };
  const requestKey =
    await deriveAiProviderRequestKey(
      tenantId,
      identity,
    );
  const auditKey =
    await deriveAiRuntimeAuditKey(
      tenantId,
      identity,
    );
  const outboxKey =
    await deriveAiReplyOutboxKey(
      tenantId,
      requestKey,
    );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  await applyMigrations(database);
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-two");
  database
    .prepare(
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (?, ?)",
    )
    .run(tenantId, "+972501234567");
  database
    .prepare(
      `INSERT INTO conversations (
        conversation_key,
        tenant_id,
        contact_id,
        status
      ) VALUES (?, ?, 1, 'bot_active')`,
    )
    .run(conversationKey, tenantId);

  for (const [
    index,
    messageKey,
  ] of [
    inboundMessageKey,
    laterMessageKey,
  ].entries()) {
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
        ) VALUES (
          ?, ?, ?, ?, 'inbound', 'text',
          'received', ?, ?, ?
        )`,
      )
      .run(
        messageKey,
        conversationKey,
        tenantId,
        `wamid.ai-approval-${index + 1}`,
        `הודעה נכנסת ${index + 1}`,
        `2026-07-26T10:0${index}:00.000Z`,
        `2026-07-26T10:0${index}:00.000Z`,
      );
  }

  database
    .prepare(
      `UPDATE conversations
       SET
         last_message_key = ?,
         last_message_at = ?
       WHERE conversation_key = ?`,
    )
    .run(
      inboundMessageKey,
      "2026-07-26T10:00:00.000Z",
      conversationKey,
    );
  database
    .prepare(
      `INSERT INTO knowledge_sources (
        source_key,
        tenant_id,
        content_sha256,
        file_name,
        media_type,
        size_bytes,
        storage_object_key,
        status,
        ready_at,
        version
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 'ready',
        CURRENT_TIMESTAMP, 4
      )`,
    )
    .run(
      sourceKey,
      tenantId,
      contentSha256,
      "מדיניות-שירות.pdf",
      "application/pdf",
      2_048,
      `knowledge/v1/${sourceKey}`,
    );
  database
    .prepare(
      `INSERT INTO ai_agents (
        ai_agent_key,
        tenant_id,
        name,
        status,
        latest_version_key,
        latest_version_number,
        active_version_key,
        version
      ) VALUES (
        ?, ?, ?, 'active', ?, 1, ?, 2
      )`,
    )
    .run(
      aiAgentKey,
      tenantId,
      definition.name,
      aiAgentVersionKey,
      aiAgentVersionKey,
    );
  database
    .prepare(
      `INSERT INTO ai_agent_versions (
        ai_agent_version_key,
        ai_agent_key,
        tenant_id,
        version_number,
        status,
        definition_json,
        published_at
      ) VALUES (
        ?, ?, ?, 1, 'published', ?,
        CURRENT_TIMESTAMP
      )`,
    )
    .run(
      aiAgentVersionKey,
      aiAgentKey,
      tenantId,
      JSON.stringify(definition),
    );
  database
    .prepare(
      `INSERT INTO ai_agent_version_sources (
        tenant_id,
        ai_agent_version_key,
        source_key
      ) VALUES (?, ?, ?)`,
    )
    .run(
      tenantId,
      aiAgentVersionKey,
      sourceKey,
    );
  database
    .prepare(
      `INSERT INTO ai_runtime_audit_events (
        audit_key,
        request_key,
        tenant_id,
        conversation_key,
        inbound_message_key,
        ai_agent_key,
        ai_agent_version_key,
        expected_conversation_version,
        outcome,
        reason,
        response_mode,
        grounding_score_basis_points,
        input_tokens,
        output_tokens,
        cost_minor_units,
        currency
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 1,
        'reply-planned', NULL, ?, 9000,
        120, 24, 3, 'ILS'
      )`,
    )
    .run(
      auditKey,
      requestKey,
      tenantId,
      conversationKey,
      inboundMessageKey,
      aiAgentKey,
      aiAgentVersionKey,
      responseMode,
    );

  const d1 = new SqliteD1Database(database);
  const repository =
    createAiReplyOutboxRepository(d1);
  const stageInput = {
    outboxKey,
    requestKey,
    auditKey,
    tenantId,
    conversationKey,
    inboundMessageKey,
    aiAgentKey,
    aiAgentVersionKey,
    expectedConversationVersion: 1,
    recipientPhoneNumber:
      "+972501234567",
    responseMode,
    replyText:
      "ניתן לבצע את הפעולה לפי המדיניות המאושרת.",
    groundedSourceKeys: [sourceKey],
    groundingScoreBasisPoints: 9_000,
  };

  return {
    database,
    repository,
    tenantId,
    conversationKey,
    inboundMessageKey,
    laterMessageKey,
    stageInput,
  };
}

test("stages an automatic AI reply as ready without claiming external delivery", async () => {
  const fixture = await createFixture(
    "automatic",
  );
  const first =
    await fixture.repository.stage(
      fixture.stageInput,
    );
  const retry =
    await fixture.repository.stage(
      fixture.stageInput,
    );

  assert.equal(first.outcome, "created");
  assert.equal(
    first.item.status,
    "ready-for-delivery",
  );
  assert.equal(
    first.item.decidedByExternalUserId,
    null,
  );
  assert.equal(retry.outcome, "unchanged");
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_reply_outbox",
      )
      .get().count,
    1,
  );
});

test("stages an approval reply and applies an idempotent human approval", async () => {
  const fixture = await createFixture();
  const staged =
    await fixture.repository.stage(
      fixture.stageInput,
    );
  const awaiting =
    await fixture.repository.listAwaitingApproval(
      fixture.tenantId,
      10,
    );
  const decision = {
    tenantId: fixture.tenantId,
    outboxKey:
      fixture.stageInput.outboxKey,
    expectedVersion: 1,
    decidedByExternalUserId:
      "clerk-user-one",
    decision: "approve",
    decidedAt:
      "2026-07-26T10:05:00.000Z",
  };
  const approved =
    await fixture.repository.decide(decision);
  const retry =
    await fixture.repository.decide({
      ...decision,
      decidedAt:
        "2026-07-26T10:06:00.000Z",
    });

  assert.equal(
    staged.item.status,
    "awaiting-approval",
  );
  assert.equal(awaiting.length, 1);
  assert.equal(approved.outcome, "updated");
  assert.equal(
    approved.item.status,
    "ready-for-delivery",
  );
  assert.equal(approved.item.version, 2);
  assert.equal(retry.outcome, "unchanged");
  assert.equal(
    retry.item.decidedAt,
    "2026-07-26T10:05:00.000Z",
  );
  assert.equal(
    (
      await fixture.repository
        .findByInboundMessage(
          fixture.tenantId,
          fixture.inboundMessageKey,
        )
    ).outboxKey,
    fixture.stageInput.outboxKey,
  );
  assert.equal(
    await fixture.repository
      .findByInboundMessage(
        2,
        fixture.inboundMessageKey,
      ),
    null,
  );
});

test("rejects a staged AI reply without making it deliverable", async () => {
  const fixture = await createFixture();

  await fixture.repository.stage(
    fixture.stageInput,
  );
  const rejected =
    await fixture.repository.decide({
      tenantId: fixture.tenantId,
      outboxKey:
        fixture.stageInput.outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId:
        "clerk-user-one",
      decision: "reject",
      decidedAt:
        "2026-07-26T10:05:00.000Z",
    });

  assert.equal(rejected.outcome, "updated");
  assert.equal(
    rejected.item.status,
    "rejected",
  );
});

test("fails closed when a newer inbound message makes the approval stale", async () => {
  const fixture = await createFixture();

  await fixture.repository.stage(
    fixture.stageInput,
  );
  fixture.database
    .prepare(
      `UPDATE conversations
       SET
         last_message_key = ?,
         last_message_at = ?,
         version = version + 1
       WHERE conversation_key = ?`,
    )
    .run(
      fixture.laterMessageKey,
      "2026-07-26T10:01:00.000Z",
      fixture.conversationKey,
    );

  assert.deepEqual(
    await fixture.repository.listAwaitingApproval(
      fixture.tenantId,
      10,
    ),
    [],
  );

  const result =
    await fixture.repository.decide({
      tenantId: fixture.tenantId,
      outboxKey:
        fixture.stageInput.outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId:
        "clerk-user-one",
      decision: "approve",
      decidedAt:
        "2026-07-26T10:05:00.000Z",
    });

  assert.deepEqual(result, {
    outcome: "invalid-state",
  });
});

test("rejects conflicting content and keeps approvals inside the tenant", async () => {
  const fixture = await createFixture();

  await fixture.repository.stage(
    fixture.stageInput,
  );

  await assert.rejects(
    fixture.repository.stage({
      ...fixture.stageInput,
      replyText:
        "תוכן אחר לאותה זהות Runtime.",
    }),
    AiReplyOutboxIdentityConflictError,
  );
  assert.equal(
    await fixture.repository.findByKey(
      2,
      fixture.stageInput.outboxKey,
    ),
    null,
  );
  assert.deepEqual(
    await fixture.repository.listAwaitingApproval(
      2,
      10,
    ),
    [],
  );
});
