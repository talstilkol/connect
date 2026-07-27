import assert from "node:assert/strict";
import test from "node:test";

import {
  createOperationalReportActionHandler,
} from "../server/reports/operationalReportActionHandler.ts";
import {
  OperationalReportInputError,
} from "../server/reports/operationalReportService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "manager",
};

function reportResult() {
  return {
    period: {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    },
    snapshot: {
      tenantId: 7,
      window: {
        startAt:
          "2026-07-01T00:00:00.000Z",
        endAt:
          "2026-08-01T00:00:00.000Z",
      },
      generatedAt:
        "2026-07-31T10:00:00.000Z",
      campaigns: {
        total: 1,
        recipientCount: 4,
        draft: 0,
        scheduled: 0,
        running: 0,
        paused: 0,
        completed: 1,
        cancelled: 0,
        failed: 0,
      },
      messages: {
        total: 2,
        inbound: 1,
        outbound: 1,
        received: 1,
        sent: 0,
        delivered: 0,
        read: 1,
        failed: 0,
      },
      conversations: {
        active: 1,
        unreadCount: 0,
        new: 0,
        botActive: 0,
        waitingForAgent: 0,
        agentActive: 0,
        waitingForContact: 0,
        closed: 1,
      },
      bot: {
        total: 1,
        pending: 0,
        sending: 0,
        accepted: 1,
        rejected: 0,
        ambiguous: 0,
      },
      ai: {
        totalTurns: 1,
        replyPlanned: 1,
        handoff: 0,
      },
      aiUsage: [
        {
          currency: "ILS",
          requestCount: 1,
          inputTokens: 120,
          outputTokens: 30,
          costMinorUnits: 8,
          internalCostReference:
            "must-not-be-exposed",
        },
      ],
      internalQuery:
        "must-not-be-exposed",
    },
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler =
    createOperationalReportActionHandler({
      applicationConfigured: () =>
        options.applicationConfigured ??
        true,
      async createContext() {
        calls.push("context");

        if (options.contextError) {
          throw options.contextError;
        }

        return {
          session,
          service: {
            defaultPeriod() {
              throw new Error(
                "must-not-run",
              );
            },
            async read(
              currentSession,
              input,
            ) {
              calls.push({
                currentSession,
                input,
              });

              if (options.readError) {
                throw options.readError;
              }

              return reportResult();
            },
          },
        };
      },
    });

  return { calls, handler };
}

test("stops report actions before context when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.load({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns a bounded report view without tenant, window, or internal fields", async () => {
  const testFixture = fixture();
  const input = {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  };
  const result =
    await testFixture.handler.load(input);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "loaded");
  assert.deepEqual(result.report.period, input);
  assert.equal(
    result.report.campaigns.total,
    1,
  );
  assert.deepEqual(
    result.report.aiUsage,
    [
      {
        currency: "ILS",
        requestCount: 1,
        inputTokens: 120,
        outputTokens: 30,
        costMinorUnits: 8,
      },
    ],
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|displayName|internalQuery|internalCostReference|startAt|endAt/,
  );
});

test("maps report validation and tenant-session failures to bounded statuses", async () => {
  const invalid =
    await fixture({
      readError:
        new OperationalReportInputError(),
    }).handler.load({});
  const permissionDenied =
    await fixture({
      contextError:
        new TenantSessionError(
          "PERMISSION_DENIED",
          "private detail",
        ),
    }).handler.load({});
  const selectionRequired =
    await fixture({
      contextError:
        new TenantSessionError(
          "TENANT_SELECTION_REQUIRED",
          "private detail",
        ),
    }).handler.load({});

  assert.deepEqual(invalid, {
    status: "invalid-input",
  });
  assert.deepEqual(permissionDenied, {
    status: "permission-denied",
  });
  assert.deepEqual(selectionRequired, {
    status:
      "tenant-selection-required",
  });
});

test("maps unknown report failures without exposing error details", async () => {
  const result =
    await fixture({
      readError: new Error(
        "PRIVATE_D1_REPORT_FAILURE",
      ),
    }).handler.load({});

  assert.deepEqual(result, {
    status: "server-error",
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRIVATE_D1_REPORT_FAILURE/,
  );
});
