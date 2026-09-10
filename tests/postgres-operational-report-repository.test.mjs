import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresOperationalReportRepository,
  postgresOperationalReportSql,
} from "../server/platform/postgresOperationalReportRepository.ts";

const window = Object.freeze({
  startAt: "2026-08-01T00:00:00.000Z",
  endAt: "2026-08-17T00:00:00.000Z",
});

function reportRow(overrides = {}) {
  return {
    campaignTotal: "3",
    campaignRecipientCount: "4",
    campaignDraft: "1",
    campaignScheduled: "1",
    campaignRunning: "0",
    campaignPaused: "0",
    campaignCompleted: "1",
    campaignCancelled: "0",
    campaignFailed: "0",
    messageTotal: "4",
    messageInbound: "1",
    messageOutbound: "3",
    messageReceived: "1",
    messageSent: "1",
    messageDelivered: "1",
    messageRead: "1",
    messageFailed: "0",
    conversationActive: "2",
    conversationUnreadCount: "5",
    conversationNew: "1",
    conversationBotActive: "1",
    conversationWaitingForAgent: "0",
    conversationAgentActive: "0",
    conversationWaitingForContact: "0",
    conversationClosed: "0",
    botTotal: "2",
    botPending: "1",
    botSending: "0",
    botAccepted: "1",
    botRejected: "0",
    botAmbiguous: "0",
    aiTotalTurns: "2",
    aiReplyPlanned: "1",
    aiHandoff: "1",
    aiUsage: [
      {
        currency: "EUR",
        requestCount: "1",
        inputTokens: "12",
        outputTokens: "6",
        costMinorUnits: "3",
      },
      {
        currency: "USD",
        requestCount: "2",
        inputTokens: "30",
        outputTokens: "15",
        costMinorUnits: "7",
      },
    ],
    ...overrides,
  };
}

function queryFixture(rows) {
  const calls = [];
  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows, rowCount: rows.length };
      },
    },
  };
}

test("reads one tenant report from one PostgreSQL statement snapshot", async () => {
  const fixture = queryFixture([reportRow()]);
  const repository = createPostgresOperationalReportRepository(
    fixture.queries,
    { now: () => new Date("2026-08-17T12:00:00.000Z") },
  );

  const snapshot = await repository.read(7, window);

  assert.deepEqual(snapshot, {
    window,
    generatedAt: "2026-08-17T12:00:00.000Z",
    campaigns: {
      total: 3,
      recipientCount: 4,
      draft: 1,
      scheduled: 1,
      running: 0,
      paused: 0,
      completed: 1,
      cancelled: 0,
      failed: 0,
    },
    messages: {
      total: 4,
      inbound: 1,
      outbound: 3,
      received: 1,
      sent: 1,
      delivered: 1,
      read: 1,
      failed: 0,
    },
    conversations: {
      active: 2,
      unreadCount: 5,
      new: 1,
      botActive: 1,
      waitingForAgent: 0,
      agentActive: 0,
      waitingForContact: 0,
      closed: 0,
    },
    bot: {
      total: 2,
      pending: 1,
      sending: 0,
      accepted: 1,
      rejected: 0,
      ambiguous: 0,
    },
    ai: {
      totalTurns: 2,
      replyPlanned: 1,
      handoff: 1,
    },
    aiUsage: [
      {
        currency: "EUR",
        requestCount: 1,
        inputTokens: 12,
        outputTokens: 6,
        costMinorUnits: 3,
      },
      {
        currency: "USD",
        requestCount: 2,
        inputTokens: 30,
        outputTokens: 15,
        costMinorUnits: 7,
      },
    ],
  });
  assert.deepEqual(fixture.calls, [
    {
      sql: postgresOperationalReportSql,
      parameters: [7, window.startAt, window.endAt],
    },
  ]);
  assert.equal(
    postgresOperationalReportSql.match(/tenant_id = \$1/g)?.length,
    6,
  );
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.aiUsage), true);
});

test("rejects inconsistent aggregate categories", async () => {
  for (const row of [
    reportRow({ campaignTotal: "4" }),
    reportRow({ messageOutbound: "2" }),
    reportRow({ conversationClosed: "1" }),
    reportRow({ botAmbiguous: "1" }),
    reportRow({ aiHandoff: "2" }),
  ]) {
    await assert.rejects(
      createPostgresOperationalReportRepository(
        queryFixture([row]).queries,
      ).read(7, window),
      /inconsistent/,
    );
  }
});

test("rejects malformed counts, rows, and usage ordering", async () => {
  const invalidRows = [
    reportRow({ campaignTotal: "-1" }),
    reportRow({ campaignTotal: "9007199254740992" }),
    reportRow({ extra: "field" }),
    reportRow({ aiUsage: null }),
    reportRow({
      aiUsage: [
        {
          currency: "usd",
          requestCount: "1",
          inputTokens: "1",
          outputTokens: "1",
          costMinorUnits: "1",
        },
      ],
    }),
    reportRow({
      aiUsage: [
        reportRow().aiUsage[1],
        reportRow().aiUsage[0],
      ],
    }),
  ];

  for (const row of invalidRows) {
    await assert.rejects(
      createPostgresOperationalReportRepository(
        queryFixture([row]).queries,
      ).read(7, window),
      /PostgreSQL returned/,
    );
  }
});

test("rejects invalid scope, windows, clocks, dependencies, and result counts", async () => {
  const repository = createPostgresOperationalReportRepository(
    queryFixture([reportRow()]).queries,
  );

  await assert.rejects(
    repository.read(0, window),
    /tenantId must be a positive safe integer/,
  );
  for (const invalidWindow of [
    null,
    { ...window, startAt: window.endAt },
    {
      startAt: "2025-01-01T00:00:00.000Z",
      endAt: "2026-08-17T00:00:00.000Z",
    },
  ]) {
    await assert.rejects(
      repository.read(7, invalidWindow),
      /report window is invalid/,
    );
  }

  await assert.rejects(
    createPostgresOperationalReportRepository(
      queryFixture([reportRow()]).queries,
      { now: () => new Date(Number.NaN) },
    ).read(7, window),
    /report clock is invalid/,
  );
  await assert.rejects(
    createPostgresOperationalReportRepository(
      queryFixture([]).queries,
    ).read(7, window),
    /did not return report metrics/,
  );
  await assert.rejects(
    createPostgresOperationalReportRepository({
      async query() {
        return { rows: [reportRow(), reportRow()], rowCount: 2 };
      },
    }).read(7, window),
    /invalid result/,
  );
  assert.throws(
    () => createPostgresOperationalReportRepository({}),
    /dependencies are invalid/,
  );
  assert.throws(
    () => createPostgresOperationalReportRepository(
      queryFixture([reportRow()]).queries,
      { now: () => new Date(), extra: true },
    ),
    /dependencies are invalid/,
  );
});
