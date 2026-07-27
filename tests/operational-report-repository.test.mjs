import assert from "node:assert/strict";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createOperationalReportRepository,
} from "../db/operationalReportRepository.ts";

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

  async batch() {
    throw new Error("not used");
  }
}

const window = {
  startAt: "2026-07-01T00:00:00.000Z",
  endAt: "2026-08-01T00:00:00.000Z",
};

function createFixture() {
  const database =
    new DatabaseSync(":memory:");

  database.exec(`
    CREATE TABLE campaigns (
      tenant_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE messages (
      tenant_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      occurred_at TEXT NOT NULL
    );
    CREATE TABLE conversations (
      tenant_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      unread_count INTEGER NOT NULL,
      last_message_at TEXT
    );
    CREATE TABLE bot_reply_deliveries (
      tenant_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE ai_runtime_audit_events (
      tenant_id INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE ai_runtime_usage (
      tenant_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_minor_units INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const insert = (
    sql,
    rows,
  ) => {
    const statement =
      database.prepare(sql);

    for (const row of rows) {
      statement.run(...row);
    }
  };

  insert(
    `INSERT INTO campaigns
      (tenant_id, status, recipient_count, created_at)
     VALUES (?, ?, ?, ?)`,
    [
      [
        1,
        "completed",
        10,
        "2026-07-05 10:00:00",
      ],
      [
        1,
        "failed",
        5,
        "2026-07-20 10:00:00",
      ],
      [
        1,
        "draft",
        7,
        "2026-06-30 23:59:59",
      ],
      [
        2,
        "scheduled",
        99,
        "2026-07-10 10:00:00",
      ],
    ],
  );
  insert(
    `INSERT INTO messages
      (tenant_id, direction, status, occurred_at)
     VALUES (?, ?, ?, ?)`,
    [
      [
        1,
        "inbound",
        "received",
        "2026-07-05T10:00:00.000Z",
      ],
      [
        1,
        "outbound",
        "delivered",
        "2026-07-06T10:00:00.000Z",
      ],
      [
        1,
        "outbound",
        "failed",
        window.endAt,
      ],
      [
        2,
        "outbound",
        "read",
        "2026-07-07T10:00:00.000Z",
      ],
    ],
  );
  insert(
    `INSERT INTO conversations
      (tenant_id, status, unread_count, last_message_at)
     VALUES (?, ?, ?, ?)`,
    [
      [
        1,
        "new",
        2,
        "2026-07-05T10:00:00.000Z",
      ],
      [
        1,
        "waiting_for_agent",
        3,
        "2026-07-06T10:00:00.000Z",
      ],
      [
        1,
        "closed",
        0,
        "2026-06-20T10:00:00.000Z",
      ],
      [
        2,
        "agent_active",
        8,
        "2026-07-08T10:00:00.000Z",
      ],
    ],
  );
  insert(
    `INSERT INTO bot_reply_deliveries
      (tenant_id, status, created_at)
     VALUES (?, ?, ?)`,
    [
      [
        1,
        "accepted",
        "2026-07-05 10:00:00",
      ],
      [
        1,
        "ambiguous",
        "2026-07-06 10:00:00",
      ],
      [
        1,
        "pending",
        "2026-08-01 00:00:00",
      ],
      [
        2,
        "rejected",
        "2026-07-07 10:00:00",
      ],
    ],
  );
  insert(
    `INSERT INTO ai_runtime_audit_events
      (tenant_id, outcome, created_at)
     VALUES (?, ?, ?)`,
    [
      [
        1,
        "reply-planned",
        "2026-07-05 10:00:00",
      ],
      [
        1,
        "handoff",
        "2026-07-06 10:00:00",
      ],
      [
        2,
        "reply-planned",
        "2026-07-07 10:00:00",
      ],
    ],
  );
  insert(
    `INSERT INTO ai_runtime_usage
      (
        tenant_id,
        currency,
        input_tokens,
        output_tokens,
        cost_minor_units,
        created_at
      )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      [
        1,
        "ILS",
        20,
        10,
        3,
        "2026-07-05 10:00:00",
      ],
      [
        1,
        "ILS",
        30,
        15,
        4,
        "2026-07-06 10:00:00",
      ],
      [
        1,
        "USD",
        8,
        4,
        2,
        "2026-07-07 10:00:00",
      ],
      [
        2,
        "ILS",
        100,
        50,
        20,
        "2026-07-08 10:00:00",
      ],
    ],
  );

  return {
    repository:
      createOperationalReportRepository(
        new SqliteD1Database(database),
        {
          now: () =>
            new Date(
              "2026-08-01T08:30:00.000Z",
            ),
        },
      ),
  };
}

test("aggregates one tenant inside an inclusive-exclusive UTC window", async () => {
  const report =
    await createFixture().repository.read(
      1,
      window,
    );

  assert.deepEqual(report, {
    window,
    generatedAt:
      "2026-08-01T08:30:00.000Z",
    campaigns: {
      total: 2,
      recipientCount: 15,
      draft: 0,
      scheduled: 0,
      running: 0,
      paused: 0,
      completed: 1,
      cancelled: 0,
      failed: 1,
    },
    messages: {
      total: 2,
      inbound: 1,
      outbound: 1,
      received: 1,
      sent: 0,
      delivered: 1,
      read: 0,
      failed: 0,
    },
    conversations: {
      active: 2,
      unreadCount: 5,
      new: 1,
      botActive: 0,
      waitingForAgent: 1,
      agentActive: 0,
      waitingForContact: 0,
      closed: 0,
    },
    bot: {
      total: 2,
      pending: 0,
      sending: 0,
      accepted: 1,
      rejected: 0,
      ambiguous: 1,
    },
    ai: {
      totalTurns: 2,
      replyPlanned: 1,
      handoff: 1,
    },
    aiUsage: [
      {
        currency: "ILS",
        requestCount: 2,
        inputTokens: 50,
        outputTokens: 25,
        costMinorUnits: 7,
      },
      {
        currency: "USD",
        requestCount: 1,
        inputTokens: 8,
        outputTokens: 4,
        costMinorUnits: 2,
      },
    ],
  });
});

test("returns an empty snapshot instead of inventing report data", async () => {
  const report =
    await createFixture().repository.read(
      3,
      window,
    );

  assert.equal(report.campaigns.total, 0);
  assert.equal(report.messages.total, 0);
  assert.equal(report.conversations.active, 0);
  assert.equal(report.bot.total, 0);
  assert.equal(report.ai.totalTurns, 0);
  assert.deepEqual(report.aiUsage, []);
});

test("rejects invalid tenant and report windows before D1 access", async () => {
  const calls = [];
  const repository =
    createOperationalReportRepository({
      prepare() {
        calls.push("prepare");
        throw new Error("must not run");
      },
      async batch() {
        throw new Error("must not run");
      },
    });
  const invalidWindows = [
    {
      startAt: window.endAt,
      endAt: window.startAt,
    },
    {
      startAt:
        "2025-01-01T00:00:00.000Z",
      endAt:
        "2026-08-01T00:00:00.000Z",
    },
    {
      startAt: "not-a-date",
      endAt: window.endAt,
    },
  ];

  await assert.rejects(
    repository.read(0, window),
    /tenantId/,
  );

  for (const invalidWindow of invalidWindows) {
    await assert.rejects(
      repository.read(
        1,
        invalidWindow,
      ),
      /report window/,
    );
  }

  assert.deepEqual(calls, []);
});

test("rejects malformed aggregate and currency rows returned by D1", async () => {
  let prepareIndex = 0;
  const aggregateRow = {
    total: 0,
    recipientCount: 0,
    draft: 0,
    scheduled: 0,
    running: 0,
    paused: 0,
    completed: 0,
    cancelled: 0,
    failed: 0,
    inbound: 0,
    outbound: 0,
    received: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    active: 0,
    unreadCount: 0,
    newCount: 0,
    botActive: 0,
    waitingForAgent: 0,
    agentActive: 0,
    waitingForContact: 0,
    closed: 0,
    pending: 0,
    sending: 0,
    accepted: 0,
    rejected: 0,
    ambiguous: 0,
    totalTurns: 0,
    replyPlanned: 0,
    handoff: 0,
  };
  const repository =
    createOperationalReportRepository({
      prepare() {
        prepareIndex += 1;

        return {
          bind() {
            return this;
          },
          async first() {
            return {
              ...aggregateRow,
              total:
                prepareIndex === 1
                  ? -1
                  : 0,
            };
          },
          async all() {
            return {
              success: true,
              results: [
                {
                  currency: "invalid",
                  requestCount: 1,
                  inputTokens: 1,
                  outputTokens: 1,
                  costMinorUnits: 1,
                },
              ],
            };
          },
          async run() {
            throw new Error("not used");
          },
        };
      },
      async batch() {
        throw new Error("not used");
      },
    });

  await assert.rejects(
    repository.read(1, window),
    /invalid report metrics|invalid AI usage metrics/,
  );
});
