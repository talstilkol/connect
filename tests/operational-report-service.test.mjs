import assert from "node:assert/strict";
import test from "node:test";

import {
  createOperationalReportService,
  OperationalReportInputError,
} from "../server/reports/operationalReportService.ts";

function session(
  role = "manager",
  tenantId = 7,
) {
  return {
    externalUserId: "external-user-id",
    tenantId,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function emptySnapshot(window) {
  return {
    window,
    generatedAt:
      "2026-07-26T12:00:00.000Z",
    campaigns: {
      total: 0,
      recipientCount: 0,
      draft: 0,
      scheduled: 0,
      running: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
    },
    messages: {
      total: 0,
      inbound: 0,
      outbound: 0,
      received: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    },
    conversations: {
      active: 0,
      unreadCount: 0,
      new: 0,
      botActive: 0,
      waitingForAgent: 0,
      agentActive: 0,
      waitingForContact: 0,
      closed: 0,
    },
    bot: {
      total: 0,
      pending: 0,
      sending: 0,
      accepted: 0,
      rejected: 0,
      ambiguous: 0,
    },
    ai: {
      totalTurns: 0,
      replyPlanned: 0,
      handoff: 0,
    },
    aiUsage: [],
  };
}

function recordingRepository() {
  const calls = [];

  return {
    calls,
    async read(tenantId, window) {
      calls.push({ tenantId, window });
      return emptySnapshot(window);
    },
  };
}

test("derives the report tenant and UTC window from the server session and calendar period", async () => {
  const repository = recordingRepository();
  const service =
    createOperationalReportService(
      repository,
    );

  const result = await service.read(
    session("manager", 19),
    {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      tenantId: 999,
    },
  );

  assert.deepEqual(repository.calls, [
    {
      tenantId: 19,
      window: {
        startAt:
          "2026-07-01T00:00:00.000Z",
        endAt:
          "2026-08-01T00:00:00.000Z",
      },
    },
  ]);
  assert.deepEqual(result.period, {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
});

test("allows every role that grants reports.read", async () => {
  const repository = recordingRepository();
  const service =
    createOperationalReportService(
      repository,
    );
  const period = {
    startDate: "2026-07-01",
    endDate: "2026-07-01",
  };

  for (const role of [
    "owner",
    "manager",
    "viewer",
  ]) {
    await service.read(
      session(role),
      period,
    );
  }

  assert.equal(repository.calls.length, 3);
});

test("denies an agent before the report repository is called", async () => {
  const repository = recordingRepository();
  const service =
    createOperationalReportService(
      repository,
    );

  await assert.rejects(
    service.read(session("agent"), {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    }),
    (error) =>
      error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(repository.calls, []);
});

test("rejects malformed, reversed, oversized, and non-canonical periods before D1", async () => {
  const repository = recordingRepository();
  const service =
    createOperationalReportService(
      repository,
    );
  const invalidPeriods = [
    null,
    {
      startDate: "2026-07-31",
      endDate: "2026-07-01",
    },
    {
      startDate: "2025-01-01",
      endDate: "2026-07-01",
    },
    {
      startDate: "2026-02-30",
      endDate: "2026-03-01",
    },
    {
      startDate: "2026-7-01",
      endDate: "2026-07-31",
    },
    {
      startDate: "9999-12-31",
      endDate: "9999-12-31",
    },
  ];

  for (const period of invalidPeriods) {
    await assert.rejects(
      service.read(
        session("viewer"),
        period,
      ),
      OperationalReportInputError,
    );
  }

  assert.deepEqual(repository.calls, []);
});

test("creates a deterministic default period of thirty UTC calendar days", () => {
  const service =
    createOperationalReportService(
      recordingRepository(),
      {
        now: () =>
          new Date(
            "2026-07-26T23:59:59.000Z",
          ),
      },
    );

  assert.deepEqual(
    service.defaultPeriod(),
    {
      startDate: "2026-06-27",
      endDate: "2026-07-26",
    },
  );
});
