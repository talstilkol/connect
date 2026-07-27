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
  createAiRuntimePersistence,
} from "../db/aiRuntimeRepository.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
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
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  for (const fileName of migrationFiles) {
    const migration = await readFile(
      new URL(fileName, migrationDirectory),
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

async function createFixture() {
  const tenantId = 1;
  const conversationKey =
    `conversation_v1_${"a".repeat(64)}`;
  const messageKeys = [
    `message_v1_${"b".repeat(64)}`,
    `message_v1_${"c".repeat(64)}`,
    `message_v1_${"d".repeat(64)}`,
  ];
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      "e".repeat(64),
    );
  const definition = {
    name: "סוכן שירות פעיל",
    systemPrompt:
      "יש לענות לפי מקורות מאושרים בלבד.",
    handoffMessage:
      "השיחה עוברת לנציג.",
    responseMode: "automatic",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 10,
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
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (?, ?)",
    )
    .run(tenantId, "+972501234567");
  database
    .prepare(
      `INSERT INTO conversations
        (conversation_key, tenant_id, contact_id, status)
       VALUES (?, ?, ?, 'bot_active')`,
    )
    .run(conversationKey, tenantId, 1);

  for (
    let index = 0;
    index < messageKeys.length;
    index += 1
  ) {
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
        ) VALUES (?, ?, ?, ?, 'inbound', 'text', 'received', ?, ?, ?)`,
      )
      .run(
        messageKeys[index],
        conversationKey,
        tenantId,
        `wamid.${index + 1}`,
        `הודעה נכנסת ${index + 1}`,
        `2026-07-26T09:0${index}:00.000Z`,
        `2026-07-26T09:0${index}:00.000Z`,
      );
  }

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
      ) VALUES (?, ?, ?, 'active', ?, 1, ?, 2)`,
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
      ) VALUES (?, ?, ?, 1, 'published', ?, CURRENT_TIMESTAMP)`,
    )
    .run(
      aiAgentVersionKey,
      aiAgentKey,
      tenantId,
      JSON.stringify(definition),
    );

  const identities = await Promise.all(
    messageKeys.map(async (inboundMessageKey) => {
      const identity = {
        conversationKey,
        inboundMessageKey,
        aiAgentVersionKey,
      };

      return {
        inboundMessageKey,
        requestKey:
          await deriveAiProviderRequestKey(
            tenantId,
            identity,
          ),
        auditKey:
          await deriveAiRuntimeAuditKey(
            tenantId,
            identity,
          ),
      };
    }),
  );
  const d1 = new SqliteD1Database(database);
  const persistence =
    createAiRuntimePersistence(d1, {
      now: () =>
        new Date(
          "2026-07-26T09:00:00.000Z",
        ),
    });

  return {
    database,
    d1,
    persistence,
    tenantId,
    conversationKey,
    aiAgentKey,
    aiAgentVersionKey,
    identities,
  };
}

function authorizationRequest(
  fixture,
  index,
) {
  return {
    requestKey:
      fixture.identities[index].requestKey,
    tenantId: fixture.tenantId,
    aiAgentKey: fixture.aiAgentKey,
    monthlyLimitMinorUnits: 10,
    currency: "ILS",
  };
}

function usageRequest(
  fixture,
  index,
  costMinorUnits,
) {
  return {
    requestKey:
      fixture.identities[index].requestKey,
    tenantId: fixture.tenantId,
    aiAgentKey: fixture.aiAgentKey,
    usage: {
      inputTokens: 100 + index,
      outputTokens: 20 + index,
      costMinorUnits,
      currency: "ILS",
    },
  };
}

function auditEvent(
  fixture,
  overrides = {},
) {
  return {
    auditKey:
      fixture.identities[0].auditKey,
    requestKey:
      fixture.identities[0].requestKey,
    tenantId: fixture.tenantId,
    conversationKey:
      fixture.conversationKey,
    inboundMessageKey:
      fixture.identities[0]
        .inboundMessageKey,
    expectedConversationVersion: 1,
    aiAgentKey: fixture.aiAgentKey,
    aiAgentVersionKey:
      fixture.aiAgentVersionKey,
    outcome: "handoff",
    reason: "customer-request",
    responseMode: "automatic",
    groundingScoreBasisPoints: null,
    inputTokens: null,
    outputTokens: null,
    costMinorUnits: null,
    currency: "ILS",
    ...overrides,
  };
}

test("records monthly usage idempotently and closes the gate after the limit is crossed", async () => {
  const fixture = await createFixture();
  const firstAuthorization =
    authorizationRequest(fixture, 0);
  const firstUsage = usageRequest(
    fixture,
    0,
    7,
  );
  const secondAuthorization =
    authorizationRequest(fixture, 1);
  const secondUsage = usageRequest(
    fixture,
    1,
    4,
  );

  assert.deepEqual(
    await fixture.persistence.costGate.authorize(
      firstAuthorization,
    ),
    { outcome: "authorized" },
  );
  assert.deepEqual(
    await fixture.persistence.costGate.recordUsage(
      firstUsage,
    ),
    {
      outcome: "recorded",
      withinLimit: true,
    },
  );
  assert.deepEqual(
    await fixture.persistence.costGate.recordUsage(
      firstUsage,
    ),
    {
      outcome: "recorded",
      withinLimit: true,
    },
  );
  assert.deepEqual(
    await fixture.persistence.costGate.authorize(
      secondAuthorization,
    ),
    { outcome: "authorized" },
  );
  assert.deepEqual(
    await fixture.persistence.costGate.recordUsage(
      secondUsage,
    ),
    {
      outcome: "recorded",
      withinLimit: false,
    },
  );
  assert.deepEqual(
    await fixture.persistence.costGate.authorize(
      authorizationRequest(fixture, 2),
    ),
    { outcome: "exhausted" },
  );

  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_usage",
      )
      .get().count,
    2,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT sum(cost_minor_units) AS cost FROM ai_runtime_usage",
      )
      .get().cost,
    11,
  );
});

test("rejects a conflicting retry instead of replacing recorded usage", async () => {
  const fixture = await createFixture();

  await fixture.persistence.costGate.authorize(
    authorizationRequest(fixture, 0),
  );
  await fixture.persistence.costGate.recordUsage(
    usageRequest(fixture, 0, 3),
  );

  await assert.rejects(
    fixture.persistence.costGate.recordUsage(
      usageRequest(fixture, 0, 4),
    ),
    /conflicting AI usage/,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT cost_minor_units AS cost FROM ai_runtime_usage",
      )
      .get().cost,
    3,
  );
});

test("keeps an existing authorization idempotent across a UTC month boundary", async () => {
  const fixture = await createFixture();
  const request = authorizationRequest(
    fixture,
    0,
  );

  assert.deepEqual(
    await fixture.persistence.costGate.authorize(
      request,
    ),
    { outcome: "authorized" },
  );

  const nextMonthPersistence =
    createAiRuntimePersistence(fixture.d1, {
      now: () =>
        new Date(
          "2026-08-01T00:00:00.000Z",
        ),
    });

  assert.deepEqual(
    await nextMonthPersistence.costGate.authorize(
      request,
    ),
    { outcome: "authorized" },
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_cost_authorizations",
      )
      .get().count,
    1,
  );
});

test("writes the audit event and handoff in one idempotent D1 batch", async () => {
  const fixture = await createFixture();
  const event = auditEvent(fixture);

  assert.deepEqual(
    await fixture.persistence.auditSink.record(
      event,
    ),
    { outcome: "recorded" },
  );
  assert.deepEqual(
    await fixture.persistence.auditSink.record(
      event,
    ),
    { outcome: "recorded" },
  );

  const conversation = fixture.database
    .prepare(
      `SELECT status, version, assigned_external_user_id AS assignee
       FROM conversations
       WHERE conversation_key = ?`,
    )
    .get(fixture.conversationKey);

  assert.deepEqual({ ...conversation }, {
    status: "waiting_for_agent",
    version: 2,
    assignee: null,
  });
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_audit_events",
      )
      .get().count,
    1,
  );
});

test("does not write an audit event when the conversation version is stale", async () => {
  const fixture = await createFixture();
  const result =
    await fixture.persistence.auditSink.record(
      auditEvent(fixture, {
        expectedConversationVersion: 2,
      }),
    );

  assert.deepEqual(result, {
    outcome: "unavailable",
  });
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_runtime_audit_events",
      )
      .get().count,
    0,
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(
          "SELECT status, version FROM conversations WHERE conversation_key = ?",
        )
        .get(fixture.conversationKey),
    },
    {
      status: "bot_active",
      version: 1,
    },
  );
});

test("records a reply plan without changing the conversation or storing content", async () => {
  const fixture = await createFixture();
  const event = auditEvent(fixture, {
    outcome: "reply-planned",
    reason: null,
    groundingScoreBasisPoints: 9_000,
    inputTokens: 120,
    outputTokens: 24,
    costMinorUnits: 3,
  });

  assert.deepEqual(
    await fixture.persistence.auditSink.record(
      event,
    ),
    { outcome: "recorded" },
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(
          "SELECT status, version FROM conversations WHERE conversation_key = ?",
        )
        .get(fixture.conversationKey),
    },
    {
      status: "bot_active",
      version: 1,
    },
  );
  assert.equal(
    fixture.database
      .prepare(
        `SELECT count(*) AS count
         FROM pragma_table_info('ai_runtime_audit_events')
         WHERE name IN (
           'customer_message',
           'system_prompt',
           'passage_content',
           'response_text'
         )`,
      )
      .get().count,
    0,
  );
});
