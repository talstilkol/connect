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
  BotReplyDeliveryIdentityConflictError,
  createBotReplyDeliveryRepository,
} from "../db/botReplyDeliveryRepository.ts";
import {
  compileKeywordBotFlowComposerDraft,
} from "../server/bot/botFlowComposer.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  deriveBotReplyDeliveryKey,
} from "../server/bot/botReplyDeliveryKey.ts";

const conversationKey =
  `conversation_v1_${"a".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"b".repeat(64)}`;
const occurredAt =
  "2026-07-26T15:00:00.000Z";

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

    for (const statement of statements) {
      results.push(await statement.run());
    }

    return results;
  }
}

async function createFixture() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrations = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  for (const migration of migrations) {
    const sql = await readFile(
      new URL(migration, migrationDirectory),
      "utf8",
    );

    for (const statement of sql.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  const compilation =
    await compileKeywordBotFlowComposerDraft(
      1,
      {
        name: "מענה לפניות שירות",
        keywords: ["שירות"],
        matchMode: "exact",
        replyText: "קיבלנו את פנייתך.",
        expectedFlowVersion: null,
      },
    );

  assert.equal(compilation.success, true);

  const botFlowKey = await deriveBotFlowKey(
    1,
    compilation.definition.name,
  );
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      1,
      botFlowKey,
      1,
      compilation.definition,
    );
  const definitionJson = JSON.stringify(
    compilation.definition,
  );

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
  database
    .prepare(
      "INSERT INTO contacts (tenant_id, phone_e164) VALUES (1, ?)",
    )
    .run("+972501234567");
  database
    .prepare(
      "INSERT INTO conversations (conversation_key, tenant_id, contact_id) VALUES (?, 1, 1)",
    )
    .run(conversationKey);
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
      ) VALUES (?, ?, 1, ?, 'inbound', 'text', 'received', ?, ?, ?)`,
    )
    .run(
      inboundMessageKey,
      conversationKey,
      "wamid.inbound-1",
      "שירות",
      occurredAt,
      occurredAt,
    );
  database
    .prepare(
      `INSERT INTO bot_flows (
        bot_flow_key,
        tenant_id,
        name,
        status,
        latest_version_key,
        latest_version_number,
        active_version_key,
        version
      ) VALUES (?, 1, ?, 'active', ?, 1, ?, 2)`,
    )
    .run(
      botFlowKey,
      compilation.definition.name,
      botFlowVersionKey,
      botFlowVersionKey,
    );
  database
    .prepare(
      `INSERT INTO bot_flow_versions (
        bot_flow_version_key,
        bot_flow_key,
        tenant_id,
        version_number,
        status,
        definition_json,
        published_at
      ) VALUES (?, ?, 1, 1, 'published', ?, ?)`,
    )
    .run(
      botFlowVersionKey,
      botFlowKey,
      definitionJson,
      occurredAt,
    );

  return {
    database,
    repository:
      createBotReplyDeliveryRepository(
        new SqliteD1Database(database),
      ),
    botFlowKey,
    botFlowVersionKey,
  };
}

async function stageInput(
  fixture,
  replyIndex = 1,
) {
  const reply = {
    kind: "text",
    text:
      replyIndex === 1
        ? "קיבלנו את פנייתך."
        : "נעדכן בהמשך.",
  };
  const deliveryKey =
    await deriveBotReplyDeliveryKey(1, {
      conversationKey,
      inboundMessageKey,
      botFlowVersionKey:
        fixture.botFlowVersionKey,
      replyIndex,
      reply,
    });

  return {
    deliveryKey,
    tenantId: 1,
    conversationKey,
    inboundMessageKey,
    botFlowKey: fixture.botFlowKey,
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    replyIndex,
    recipientPhoneNumber:
      "+972501234567",
    reply,
  };
}

test("persists an idempotent reply and advances it through an atomic acceptance claim", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture);
  const created =
    await fixture.repository.stage(input);
  const duplicate =
    await fixture.repository.stage(input);
  const claimed =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );
  const uncertain =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );
  const accepted =
    await fixture.repository.markAccepted(
      1,
      input.deliveryKey,
      "wamid.outbound-1",
      occurredAt,
    );
  const settledClaim =
    await fixture.repository.claim(
      1,
      input.deliveryKey,
      occurredAt,
    );

  assert.equal(created.outcome, "created");
  assert.equal(
    created.delivery.status,
    "pending",
  );
  assert.equal(duplicate.outcome, "duplicate");
  assert.equal(claimed.outcome, "claimed");
  assert.equal(
    claimed.delivery.attemptCount,
    1,
  );
  assert.equal(uncertain.outcome, "uncertain");
  assert.equal(accepted.status, "accepted");
  assert.equal(
    accepted.providerMessageId,
    "wamid.outbound-1",
  );
  assert.equal(
    settledClaim.outcome,
    "duplicate",
  );

  fixture.database.close();
});

test("records an explicit rejection and rejects a conflicting deterministic identity", async () => {
  const fixture = await createFixture();
  const input = await stageInput(fixture, 2);

  await fixture.repository.stage(input);
  await fixture.repository.claim(
    1,
    input.deliveryKey,
    occurredAt,
  );
  const rejected =
    await fixture.repository.markRejected(
      1,
      input.deliveryKey,
      "POLICY_REJECTED",
      occurredAt,
    );

  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.lastErrorCode,
    "POLICY_REJECTED",
  );
  await assert.rejects(
    fixture.repository.stage({
      ...input,
      recipientPhoneNumber:
        "+972509876543",
    }),
    (error) =>
      error instanceof
      BotReplyDeliveryIdentityConflictError,
  );

  fixture.database.close();
});
