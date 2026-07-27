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
  createAiAgentRepository,
} from "../db/aiAgentRepository.ts";
import {
  createAiReplyOutboxRepository,
} from "../db/aiReplyOutboxRepository.ts";
import {
  createAiRuntimePersistence,
} from "../db/aiRuntimeRepository.ts";
import {
  createBotFlowRepository,
} from "../db/botFlowRepository.ts";
import {
  createBotReplyDeliveryRepository,
} from "../db/botReplyDeliveryRepository.ts";
import {
  createBotRuntimeRepository,
} from "../db/botRuntimeRepository.ts";
import {
  createConversationRepository,
} from "../db/conversationRepository.ts";
import {
  createKnowledgePassageRepository,
} from "../db/knowledgePassageRepository.ts";
import {
  createActiveAiRuntimeAgentLoader,
} from "../server/ai/activeAiRuntimeAgent.ts";
import {
  createAiInboundRuntimeProcessor,
} from "../server/ai/aiInboundRuntimeProcessor.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  createAiRuntimeService,
} from "../server/ai/aiRuntimeService.ts";
import {
  createInboundAutomationProcessor,
} from "../server/automation/inboundAutomationProcessor.ts";
import {
  createBotInboundRuntimeProcessor,
} from "../server/bot/botInboundRuntimeProcessor.ts";
import {
  createBotRuntimeService,
} from "../server/bot/botRuntimeService.ts";
import {
  createUnavailableBotReplyProcessor,
} from "../server/bot/unavailableBotReplyProcessor.ts";
import {
  createMetaMessageWebhookEventProcessor,
} from "../server/conversations/metaMessageWebhookProcessor.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

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

function inboundEvent() {
  const value = {
    messaging_product: "whatsapp",
    metadata: {
      phone_number_id: "phone-number-id",
    },
    messages: [
      {
        from: "972501234567",
        id: "wamid.ai-e2e-inbound",
        timestamp: "1785054600",
        type: "text",
        text: {
          body: "מה מדיניות השירות?",
        },
      },
    ],
  };

  return {
    dispatchKey:
      `${"9".repeat(64)}:0:0:inbound_messages`,
    kind: "inbound_messages",
    entryIndex: 0,
    changeIndex: 0,
    occurredAt: 1_785_054_600,
    value,
    messages: value.messages,
  };
}

function batch(event) {
  return {
    tenantId: 1,
    receiptId: 31,
    eventKey: "9".repeat(64),
    connection: {
      tenantId: 1,
      businessPortfolioId:
        "business-portfolio-id",
      wabaId: "waba-id",
      phoneNumberId: "phone-number-id",
      status: "connected",
      webhookSubscribedAt:
        "2026-07-26 08:00:00",
      connectedAt:
        "2026-07-26 08:00:00",
      version: 2,
      createdAt:
        "2026-07-26 07:00:00",
      updatedAt:
        "2026-07-26 08:00:00",
    },
    events: [event],
  };
}

async function createFixture() {
  const tenantId = 1;
  const database =
    new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  await applyMigrations(database);
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-e2e");

  const sourceContent =
    "החזרת מוצר אפשרית בהתאם למדיניות השירות המאושרת.";
  const sourceDigest = await sha256Hex(
    new TextEncoder().encode(
      sourceContent,
    ),
  );
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      sourceDigest,
    );
  const passageKey =
    await deriveKnowledgePassageKey(
      tenantId,
      sourceKey,
      1,
      sourceDigest,
    );
  const definition = {
    name: "סוכן שירות מאושר",
    systemPrompt:
      "יש לענות רק לפי הידע המאושר.",
    handoffMessage:
      "השיחה מועברת לנציג.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 1_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
  };
  const aiAgentKey =
    await deriveAiAgentKey(
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
        CURRENT_TIMESTAMP, 2
      )`,
    )
    .run(
      sourceKey,
      tenantId,
      sourceDigest,
      "מדיניות-שירות.txt",
      "text/plain",
      new TextEncoder().encode(
        sourceContent,
      ).byteLength,
      `knowledge/v1/${sourceKey}`,
    );
  database
    .prepare(
      `INSERT INTO knowledge_passages (
        passage_key,
        tenant_id,
        source_key,
        passage_ordinal,
        content_sha256,
        content
      ) VALUES (?, ?, ?, 1, ?, ?)`,
    )
    .run(
      passageKey,
      tenantId,
      sourceKey,
      sourceDigest,
      sourceContent,
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

  const d1 = new SqliteD1Database(
    database,
  );
  const botRuntimeRepository =
    createBotRuntimeRepository(d1);
  const aiRuntimePersistence =
    createAiRuntimePersistence(d1, {
      now: () =>
        new Date(
          "2026-07-26T10:10:00.000Z",
        ),
    });
  const knowledge =
    createKnowledgePassageRepository(d1);
  const providerCalls = [];
  const retrievalCalls = [];
  const aiRuntime =
    createAiRuntimeService({
      retriever: {
        async retrieve(request) {
          retrievalCalls.push(request);
          const passages =
            await knowledge
              .listApprovedBySourceKeys(
                request.tenantId,
                request.sourceKeys,
                100,
              );

          return {
            outcome: "grounded",
            scoreBasisPoints: 9_000,
            passages: passages.map(
              (passage) => ({
                passageKey:
                  passage.passageKey,
                sourceKey:
                  passage.sourceKey,
                content: passage.content,
              }),
            ),
          };
        },
      },
      costGate:
        aiRuntimePersistence.costGate,
      provider: {
        async generate(request) {
          providerCalls.push(request);

          return {
            outcome: "generated",
            text:
              "אפשר לפעול בהתאם למדיניות השירות המאושרת.",
            groundedPassageKeys: [
              passageKey,
            ],
            usage: {
              inputTokens: 25,
              outputTokens: 12,
              costMinorUnits: 3,
              currency: "ILS",
            },
          };
        },
      },
      audit:
        aiRuntimePersistence.auditSink,
    });
  const outbox =
    createAiReplyOutboxRepository(d1);
  const inboundRuntime =
    createInboundAutomationProcessor(
      createBotInboundRuntimeProcessor(
        createBotRuntimeService(
          createBotFlowRepository(d1),
          botRuntimeRepository,
        ),
        createBotReplyDeliveryRepository(
          d1,
        ),
        createUnavailableBotReplyProcessor(),
        {
          now: () =>
            new Date(
              "2026-07-26T10:10:00.000Z",
            ),
        },
      ),
      createAiInboundRuntimeProcessor(
        botRuntimeRepository,
        createActiveAiRuntimeAgentLoader(
          createAiAgentRepository(d1),
        ),
        aiRuntime,
        outbox,
      ),
    );
  const processEvent =
    createMetaMessageWebhookEventProcessor(
      createConversationRepository(d1),
      inboundRuntime,
    );

  return {
    database,
    outbox,
    processEvent,
    providerCalls,
    retrievalCalls,
  };
}

test("persists one approval reply across the full inbound Bot-to-AI path and keeps webhook retry idempotent", async () => {
  const fixture = await createFixture();
  const event = inboundEvent();

  await fixture.processEvent(
    event,
    batch(event),
  );
  await fixture.processEvent(
    event,
    batch(event),
  );

  const rows = fixture.database
    .prepare(
      `SELECT
        status,
        response_mode AS responseMode,
        reply_text AS replyText,
        version
       FROM ai_reply_outbox`,
    )
    .all();

  assert.deepEqual(
    rows.map((row) => ({ ...row })),
    [
    {
      status: "awaiting-approval",
      responseMode: "agent-approval",
      replyText:
        "אפשר לפעול בהתאם למדיניות השירות המאושרת.",
      version: 1,
    },
    ],
  );
  assert.equal(
    fixture.providerCalls.length,
    1,
  );
  assert.equal(
    fixture.retrievalCalls.length,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_audit_events",
      )
      .get().count,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_usage",
      )
      .get().count,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM bot_reply_deliveries",
      )
      .get().count,
    0,
  );
  assert.equal(
    (
      await fixture.outbox
        .listAwaitingApproval(1, 10)
    ).length,
    1,
  );
});
