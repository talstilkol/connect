import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminSubscriptionActionHandler,
} from "../server/billing/systemAdminSubscriptionActionHandler.ts";
import {
  SystemAdminSubscriptionError,
  SystemAdminSubscriptionInputError,
} from "../server/billing/systemAdminSubscriptionService.ts";
import {
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};

function resultSubscription() {
  return {
    tenantId: 7,
    status: "active",
    startsAt:
      "2026-08-01T00:00:00.000Z",
    endsAt:
      "2026-09-01T00:00:00.000Z",
    cancelledAt: null,
    version: 1,
    createdAt:
      "2026-07-26 12:00:00",
    updatedAt:
      "2026-07-26 12:00:00",
    internalField:
      "must-not-be-exposed",
  };
}

function fixture(options = {}) {
  const calls = [];
  const service = {};

  for (const operation of [
    "create",
    "extend",
    "changeStatus",
    "cancel",
  ]) {
    service[operation] =
      async (
        currentSession,
        input,
      ) => {
        calls.push({
          operation,
          currentSession,
          input,
        });

        if (options.serviceError) {
          throw options.serviceError;
        }

        return {
          outcome:
            options.outcome ?? "updated",
          subscription:
            resultSubscription(),
        };
      };
  }

  const handler =
    createSystemAdminSubscriptionActionHandler({
      applicationConfigured: () =>
        options.applicationConfigured ??
        true,
      async createContext() {
        calls.push({
          operation: "context",
        });

        if (options.contextError) {
          throw options.contextError;
        }

        return {
          session,
          service,
        };
      },
    });

  return {
    calls,
    handler,
  };
}

test("stops system admin mutations before identity access when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.create({}),
    {
      status: "configuration-required",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("returns a bounded subscription view without tenant or audit identity", async () => {
  const testFixture = fixture({
    outcome: "created",
  });
  const input = {
    tenantId: 7,
    status: "active",
    startsAt:
      "2026-08-01T00:00:00.000Z",
    endsAt:
      "2026-09-01T00:00:00.000Z",
  };
  const result =
    await testFixture.handler.create(
      input,
    );
  const serialized = JSON.stringify(
    result,
  );

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "created");
  assert.equal(
    result.subscription.version,
    1,
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|internalField/,
  );
  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    ["context", "create"],
  );
  assert.equal(
    testFixture.calls[1].currentSession,
    session,
  );
});

test("maps authentication and system authority failures separately", async () => {
  const unauthenticated =
    await fixture({
      contextError:
        new SystemAdminSessionError(
          "AUTHENTICATION_REQUIRED",
        ),
    }).handler.cancel({});
  const permissionDenied =
    await fixture({
      contextError:
        new SystemAdminSessionError(
          "SYSTEM_ADMIN_REQUIRED",
        ),
    }).handler.cancel({});

  assert.deepEqual(unauthenticated, {
    status: "unauthenticated",
  });
  assert.deepEqual(permissionDenied, {
    status: "permission-denied",
  });
});

test("maps validation and mutation outcomes to bounded statuses", async () => {
  const scenarios = [
    [
      new SystemAdminSubscriptionInputError(),
      "invalid-input",
    ],
    [
      new SystemAdminSubscriptionError(
        "NOT_FOUND",
      ),
      "not-found",
    ],
    [
      new SystemAdminSubscriptionError(
        "CONFLICT",
      ),
      "conflict",
    ],
    [
      new SystemAdminSubscriptionError(
        "INVALID_TRANSITION",
      ),
      "invalid-transition",
    ],
    [
      new SystemAdminSubscriptionError(
        "PERSISTENCE_FAILED",
      ),
      "server-error",
    ],
  ];

  for (const [
    serviceError,
    expectedStatus,
  ] of scenarios) {
    const result =
      await fixture({
        serviceError,
      }).handler.extend({});

    assert.deepEqual(result, {
      status: expectedStatus,
    });
  }
});

test("does not expose unexpected internal errors", async () => {
  const result =
    await fixture({
      serviceError: new Error(
        "PRIVATE_SYSTEM_ADMIN_FAILURE",
      ),
    }).handler.changeStatus({});

  assert.deepEqual(result, {
    status: "server-error",
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRIVATE_SYSTEM_ADMIN_FAILURE/,
  );
});
